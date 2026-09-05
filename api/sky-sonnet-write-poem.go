package handler

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

type poemRequest struct {
	Color     string `json:"color"`
	Emotion   string `json:"emotion"`
	Style     string `json:"style"`
	UserInput string `json:"userInput"`
}

type poem struct {
	Title string `json:"title"`
	Poem  string `json:"poem"`
}

var geminiClient = &http.Client{Timeout: 50 * time.Second}

// Handler is the Vercel serverless endpoint for POST /api/sky-sonnet-write-poem.
// Backs the poem generator on the Sky Sonnet project card (imagine/sky-sonnet).
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

	if input.Color == "" || input.Emotion == "" || input.Style == "" {
		writeError(w, http.StatusBadRequest, "Missing color, emotion, or style")
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

func generatePoem(input poemRequest) (poem, error) {
	prompt := fmt.Sprintf(
		`Write a 14-line %s style sonnet inspired by the sky and the color %s, with a %s feeling.
Include this request naturally: %s
Use a color name rather than a hex code. Return only valid JSON with fields "title" and "poem".`,
		input.Style,
		input.Color,
		input.Emotion,
		input.UserInput,
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
		"generationConfig": map[string]string{
			"responseMimeType": "application/json",
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
