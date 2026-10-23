package handler

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/rwcarlsen/goexif/exif"
)

type poemRequest struct {
	Color     string `json:"color"`
	Emotion   string `json:"emotion"`
	Style     string `json:"style"`
	Format    string `json:"format"`
	UserInput string `json:"userInput"`
	Image     string `json:"image"`
}

type poem struct {
	Title string `json:"title"`
	Poem  string `json:"poem"`
}

var geminiClient = &http.Client{Timeout: 50 * time.Second}

// Limits for the public endpoint. Every call costs a paid Gemini request, so
// the handler checks the caller's origin, rate-limits per client address and
// caps the size of every field before any work is done.
const (
	maxBodyBytes   = 10 << 20 // request body (the photo is sent as a base64 data URL)
	maxImageChars  = 9 << 20
	maxShortField  = 60   // color, style, format
	maxEmotionChar = 800  // the client-side scene description
	maxUserInput   = 1000 // the writer's own words

	rateWindow = time.Minute
	rateBurst  = 5 // requests per rateWindow per client
	rateHourly = 30
	maxTracked = 5000 // client entries kept in memory
)

// allowedHost reports whether a browser Origin/Referer host may call the API.
func allowedHost(host string) bool {
	host = strings.ToLower(host)
	if h, _, err := net.SplitHostPort(host); err == nil {
		host = h
	}
	switch host {
	case "isaacfun.xyz", "www.isaacfun.xyz", "localhost", "127.0.0.1", "[::1]", "::1":
		return true
	}
	return strings.HasSuffix(host, ".isaacfun.xyz") || strings.HasSuffix(host, ".vercel.app")
}

// originAllowed requires a same-site Origin (or, failing that, Referer).
// Browsers always send Origin on a cross-origin JSON POST, so a missing or
// foreign value means the request did not come from one of our pages.
func originAllowed(r *http.Request) bool {
	for _, header := range []string{"Origin", "Referer"} {
		if v := r.Header.Get(header); v != "" {
			u, err := url.Parse(v)
			return err == nil && allowedHost(u.Host)
		}
	}
	return false
}

// clientKey identifies the caller for rate limiting.
func clientKey(r *http.Request) string {
	for _, header := range []string{"X-Vercel-Forwarded-For", "X-Real-Ip", "X-Forwarded-For"} {
		if v := strings.TrimSpace(strings.Split(r.Header.Get(header), ",")[0]); v != "" {
			return v
		}
	}
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		return host
	}
	return r.RemoteAddr
}

// limiter is a small in-memory sliding-window limiter. Serverless instances
// do not share memory, so this is a per-instance safety net; add a Vercel
// WAF rate-limit rule on /api/* for a hard global limit.
type limiter struct {
	mu   sync.Mutex
	hits map[string][]time.Time
}

var poemLimiter = &limiter{hits: map[string][]time.Time{}}

// allow records a request and returns (ok, secondsUntilRetry).
func (l *limiter) allow(key string, now time.Time) (bool, int) {
	l.mu.Lock()
	defer l.mu.Unlock()

	if len(l.hits) > maxTracked { // drop stale entries before growing further
		for k, ts := range l.hits {
			if len(ts) == 0 || now.Sub(ts[len(ts)-1]) > time.Hour {
				delete(l.hits, k)
			}
		}
		if len(l.hits) > maxTracked {
			l.hits = map[string][]time.Time{}
		}
	}

	recent := l.hits[key][:0]
	for _, t := range l.hits[key] {
		if now.Sub(t) < time.Hour {
			recent = append(recent, t)
		}
	}
	inWindow := 0
	var oldestInWindow time.Time
	for _, t := range recent {
		if now.Sub(t) < rateWindow {
			if inWindow == 0 {
				oldestInWindow = t
			}
			inWindow++
		}
	}
	if inWindow >= rateBurst {
		l.hits[key] = recent
		return false, int(rateWindow.Seconds()-now.Sub(oldestInWindow).Seconds()) + 1
	}
	if len(recent) >= rateHourly {
		l.hits[key] = recent
		return false, int(time.Hour.Seconds()-now.Sub(recent[0]).Seconds()) + 1
	}
	l.hits[key] = append(recent, now)
	return true, 0
}

// Handler is the Vercel serverless endpoint for POST /api/sky-sonnet-write-poem.
// Backs the poem generator on the Sky Sonnet project card (enjoy/sky-sonnet).
func Handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")

	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	if !originAllowed(r) {
		writeError(w, http.StatusForbidden, "Forbidden")
		return
	}

	if ok, retry := poemLimiter.allow(clientKey(r), time.Now()); !ok {
		w.Header().Set("Retry-After", fmt.Sprint(retry))
		writeError(w, http.StatusTooManyRequests, "Too many requests — please wait a moment and try again")
		return
	}

	var input poemRequest
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	if err := decoder.Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request")
		return
	}

	if input.Color == "" || input.Emotion == "" || input.Style == "" || input.Format == "" {
		writeError(w, http.StatusBadRequest, "Missing color, emotion, style, or format")
		return
	}

	// Cap lengths (in runes for text) so the prompt can't be stuffed or abused.
	// Style/format are NOT whitelisted: unknown values fall back to defaults below.
	if len([]rune(input.Color)) > maxShortField || len([]rune(input.Style)) > maxShortField ||
		len([]rune(input.Format)) > maxShortField || len([]rune(input.Emotion)) > maxEmotionChar ||
		len([]rune(input.UserInput)) > maxUserInput || len(input.Image) > maxImageChars {
		writeError(w, http.StatusRequestEntityTooLarge, "Input too long")
		return
	}

	result, err := generatePoem(input)
	if err != nil {
		fmt.Println("writePoem:", err)
		writeError(w, http.StatusInternalServerError, "Failed to generate poem")
		return
	}

	json.NewEncoder(w).Encode(result)
}

// formatInstructions maps each selectable poem format to the phrase that
// tells Gemini what shape/structure to write in. Falls back to the sonnet
// phrasing for anything unrecognized so a stale/unknown value never breaks
// generation.
var formatInstructions = map[string]string{
	"Sonnet":     "a 14-line sonnet written in strict iambic pentameter (ten syllables a line, in an unstressed-stressed rhythm) with a traditional rhyme scheme (Shakespearean ABAB CDCD EFEF GG, or Petrarchan ABBAABBA CDECDE) — the meter should read naturally aloud, never forced or padded to fit",
	"Haiku":      "a traditional haiku (5-7-5 syllables), short and evocative, built on one clear image with a quiet turn between its parts",
	"Song Verse": "a song verse with a steady, singable rhythm and a clear rhyme scheme — built the way a verse or chorus is, with a natural stressed beat",
	"Ode":        "an ode that speaks directly to the sky, warm and reverent in tone, with flowing, musical lines",
	"Ballad":     "a ballad in traditional ballad meter — lines alternating four stresses and three (roughly 8 then 6 syllables), rhymed ABAB or ABCB, telling a small, flowing story",
}

// styleGuidance gives each selectable poem style its own instruction for
// which poetic devices and register to lean on, so the same photo reads
// differently depending on what the writer picked. Falls back to a general
// nudge toward personification/metaphor for any unrecognized value.
var styleGuidance = map[string]string{
	"Dreamy":       "Lean soft and hazy: blur the edges between things, favor gentle uncertainty over sharp statement, and let one image drift into the next the way a half-remembered dream does.",
	"Lifelike":     "Stay grounded and precise: plain, exact language and one or two true, specific sensory details do more work than any flourish — let the real scene carry the poem, not abstraction.",
	"Scenographic": "Think in terms of staged scale and framing: wide establishing images, a shift of light like a scene change, a clear sense of foreground against background, as though the sky itself were set-dressed.",
	"Imaginative":  "Let invention lead: give the sky and land some will or feeling of their own (personification), reach for one unexpected but earned comparison, and don't shy from a playful or surprising turn.",
}

const defaultStyleGuidance = "Give the sky and land a touch of personality — a hint of personification or one unexpected but earned comparison — without losing plain, human clarity."

func generatePoem(input poemRequest) (poem, error) {
	metadata := extractImageMetadata(input.Image)

	formatInstruction, ok := formatInstructions[input.Format]
	if !ok {
		formatInstruction = formatInstructions["Sonnet"]
	}

	styleNote, ok := styleGuidance[input.Style]
	if !ok {
		styleNote = defaultStyleGuidance
	}

	// context collects everything we actually know about the photo — the
	// color/light analysis (computed client-side from real pixels), EXIF
	// hints, and the writer's own words — so the prompt can point at it as
	// one grounded scene instead of scattering it across adjectives.
	var context strings.Builder
	context.WriteString(fmt.Sprintf("Scene (from a color and light analysis of the actual photo, dominant color %s): %s", input.Color, input.Emotion))

	if metadata != "" {
		context.WriteString(fmt.Sprintf(`

Photo context: %s. Let this shape tone, season, or time of day naturally — never mention camera names or brands. If a location is given, reference it by name.`, metadata))
	}

	if trimmedInput := strings.TrimSpace(input.UserInput); trimmedInput != "" {
		context.WriteString(fmt.Sprintf(`

The writer's own words about this moment — make this the poem's central image: %s`, trimmedInput))
	}

	prompt := fmt.Sprintf(
		`Write %s, in a %s style.

%s

%s

Ground the poem in the details above: use at least two concrete, specific images drawn directly from them (the colors, light quality, atmosphere, place, or time of day) rather than generic sky-poem phrases like "endless blue" or "gentle breeze". Do not invent specific objects, cloud shapes, birds, or landmarks that aren't named above — if none are given, focus on color, light, and mood instead.

Write like a human poet, not a copywriter or an image-caption generator. Never use clinical or technical vocabulary — words like "hue," "saturation," "vivid," "contrast," or any other color-analysis language — as if labeling a palette. Avoid the handful of colors that read as stock AI-poem vocabulary (especially "azure" and "crimson") unless no truer word fits; reach for plainer or more specific color language instead (rust, dusk-blue, ash, ember, and the like). Beyond rhyme and meter, use at least one other poetic device — personification, metaphor, or a striking, earned comparison — wherever it fits naturally.

Use a color name rather than a hex code. Return only valid JSON with fields "title" and "poem".`,
		formatInstruction,
		input.Style,
		context.String(),
		styleNote,
	)

	text, err := askGemini(prompt)
	if err != nil {
		return poem{}, err
	}

	text = strings.TrimSpace(text)
	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimPrefix(text, "```")
	text = strings.TrimSuffix(text, "```")

	var result poem
	if err := json.Unmarshal([]byte(strings.TrimSpace(text)), &result); err != nil {
		return poem{}, fmt.Errorf("invalid poem response: %w", err)
	}
	if result.Title == "" || result.Poem == "" {
		return poem{}, errors.New("Gemini returned an incomplete poem")
	}
	return result, nil
}

// extractImageMetadata reads EXIF data straight out of the uploaded photo's
// data URL (camera make/model, capture date, GPS coordinates) and turns it
// into a short hint string for the prompt. Any failure just means no hints
// get added — it never blocks poem generation.
func extractImageMetadata(dataURL string) string {
	parts := strings.SplitN(dataURL, ",", 2)
	if len(parts) != 2 {
		return ""
	}

	imgBytes, err := base64.StdEncoding.DecodeString(parts[1])
	if err != nil {
		return ""
	}

	x, err := exif.Decode(bytes.NewReader(imgBytes))
	if err != nil {
		return ""
	}

	var hints []string

	makeStr := ""
	modelStr := ""
	if m, err := x.Get(exif.Make); err == nil {
		makeStr = strings.Trim(m.String(), `"`)
	}
	if m, err := x.Get(exif.Model); err == nil {
		modelStr = strings.Trim(m.String(), `"`)
	}
	if makeStr != "" || modelStr != "" {
		mood := cameraMood(makeStr, modelStr)
		hints = append(hints, fmt.Sprintf("Mood from camera: %s", mood))
	}

	if dt, err := x.Get(exif.DateTimeOriginal); err == nil {
		hints = append(hints, fmt.Sprintf("Date taken: %s", strings.Trim(dt.String(), `"`)))
	} else if dt, err := x.Get(exif.DateTime); err == nil {
		hints = append(hints, fmt.Sprintf("Date taken: %s", strings.Trim(dt.String(), `"`)))
	}

	lat, lon, err := x.LatLong()
	if err == nil {
		if place := reverseGeocode(lat, lon); place != "" {
			hints = append(hints, fmt.Sprintf("Location: %s", place))
		}
	}

	if len(hints) == 0 {
		return ""
	}

	return strings.Join(hints, "; ")
}

func cameraMood(makeStr, modelStr string) string {
	combined := strings.ToLower(makeStr + " " + modelStr)

	oldKeywords := []string{"nikon d70", "nikon d80", "nikon d40", "canon eos 300d", "canon eos 10d",
		"canon eos 20d", "olympus e-", "fujifilm finepix", "kodak", "minolta", "pentax k10",
		"sony dsc-", "casio", "polaroid"}
	for _, kw := range oldKeywords {
		if strings.Contains(combined, kw) {
			return "retro, vintage — evoke a timeless, film-era quality"
		}
	}

	nostalgicPhones := []string{"iphone 3", "iphone 4", "iphone 5", "iphone 6",
		"galaxy s3", "galaxy s4", "galaxy s5", "nexus 4", "nexus 5",
		"htc one", "lumia", "blackberry", "pixel 1", "pixel 2"}
	for _, kw := range nostalgicPhones {
		if strings.Contains(combined, kw) {
			return "nostalgic, warmly sentimental — the early smartphone era"
		}
	}

	modernCameras := []string{"sony a7", "sony a9", "canon eos r", "nikon z", "fujifilm x-t",
		"fujifilm gfx", "leica", "hasselblad", "phase one"}
	for _, kw := range modernCameras {
		if strings.Contains(combined, kw) {
			return "crisp and present-focused — captured with professional precision"
		}
	}

	modernPhones := []string{"iphone 1", "iphone 2", "pixel 7", "pixel 8", "pixel 9",
		"galaxy s2", "galaxy s23", "galaxy s24"}
	for _, kw := range modernPhones {
		if strings.Contains(combined, kw) {
			return "contemporary, forward-looking — a modern eye on the world"
		}
	}

	if strings.Contains(combined, "iphone") || strings.Contains(combined, "pixel") || strings.Contains(combined, "galaxy") {
		return "contemporary, forward-looking — a modern eye on the world"
	}

	return "candid and personal"
}

// reverseGeocode turns GPS coordinates pulled from EXIF into a short
// "City, Country" style place name via Nominatim (OpenStreetMap).
func reverseGeocode(lat, lon float64) string {
	endpoint := fmt.Sprintf("https://nominatim.openstreetmap.org/reverse?lat=%f&lon=%f&format=json&zoom=10", lat, lon)
	req, err := http.NewRequest("GET", endpoint, nil)
	if err != nil {
		return ""
	}
	req.Header.Set("User-Agent", "SkySonnet/1.0")

	client := http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return ""
	}
	defer resp.Body.Close()

	var result struct {
		DisplayName string `json:"display_name"`
		Address     struct {
			City    string `json:"city"`
			Town    string `json:"town"`
			Village string `json:"village"`
			State   string `json:"state"`
			Country string `json:"country"`
		} `json:"address"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return ""
	}

	place := result.Address.City
	if place == "" {
		place = result.Address.Town
	}
	if place == "" {
		place = result.Address.Village
	}

	if place != "" && result.Address.Country != "" {
		return fmt.Sprintf("%s, %s", place, result.Address.Country)
	}
	if result.Address.State != "" && result.Address.Country != "" {
		return fmt.Sprintf("%s, %s", result.Address.State, result.Address.Country)
	}
	return ""
}

func askGemini(prompt string) (string, error) {
	apiKey := strings.TrimSpace(os.Getenv("GEMINI_API_KEY"))
	if apiKey == "" {
		return "", errors.New("GEMINI_API_KEY is not set")
	}

	model := strings.TrimSpace(os.Getenv("GEMINI_MODEL"))
	if model == "" {
		model = "gemini-3.1-flash-lite"
	}

	payload := map[string]any{
		"contents": []any{map[string]any{
			"role":  "user",
			"parts": []any{map[string]string{"text": prompt}},
		}},
		"generationConfig": map[string]any{
			"responseMimeType": "application/json",
			// A bit above the model's default to favor more vivid, less
			// clichéd word choice; maxOutputTokens gives longer forms
			// (Ballad, Song Verse) enough room so they never get cut off.
			"temperature":     0.95,
			"maxOutputTokens": 800,
		},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	endpoint := "https://generativelanguage.googleapis.com/v1beta/models/" +
		url.PathEscape(model) + ":generateContent"
	req, err := http.NewRequest(http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-goog-api-key", apiKey)

	resp, err := geminiClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("Gemini returned status %d", resp.StatusCode)
	}

	var response struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}
	if err := json.Unmarshal(responseBody, &response); err != nil {
		return "", err
	}
	if len(response.Candidates) == 0 || len(response.Candidates[0].Content.Parts) == 0 {
		return "", errors.New("Gemini returned no content")
	}
	return response.Candidates[0].Content.Parts[0].Text, nil
}

func writeError(w http.ResponseWriter, status int, message string) {
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}
