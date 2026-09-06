package handler

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
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

// Handler is the Vercel serverless endpoint for POST /api/sky-sonnet-write-poem.
// Backs the poem generator on the Sky Sonnet project card (enjoy/sky-sonnet).
func Handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var input poemRequest
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 10<<20))
	if err := decoder.Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request")
		return
	}

	if input.Color == "" || input.Emotion == "" || input.Style == "" || input.Format == "" {
		writeError(w, http.StatusBadRequest, "Missing color, emotion, style, or format")
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
	"Sonnet":     "a 14-line rhymed sonnet",
	"Haiku":      "a traditional haiku (5-7-5 syllables), short and evocative",
	"Song Verse": "a song verse with a rhyme scheme like part of a song lyric — rhythmic and singable, rhyming lines the way a verse or chorus would",
	"Ode":        "an ode that speaks directly to the sky, warm and reverent in tone",
	"Ballad":     "a ballad — a flowing, rhymed narrative poem, like a traditional story-song",
}

func generatePoem(input poemRequest) (poem, error) {
	metadata := extractImageMetadata(input.Image)

	formatInstruction, ok := formatInstructions[input.Format]
	if !ok {
		formatInstruction = formatInstructions["Sonnet"]
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

Ground the poem in the details above: use at least two concrete, specific images drawn directly from them (the colors, light quality, atmosphere, place, or time of day) rather than generic sky-poem phrases like "endless blue" or "gentle breeze". Do not invent specific objects, cloud shapes, birds, or landmarks that aren't named above — if none are given, focus on color, light, and mood instead.

Use a color name rather than a hex code. Return only valid JSON with fields "title" and "poem".`,
		formatInstruction,
		input.Style,
		context.String(),
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
