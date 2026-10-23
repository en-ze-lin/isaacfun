import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export const dynamic = "force-static";

// Every crawler is welcome — search engines and AI/LLM crawlers alike. Each is
// listed explicitly so there's no ambiguity. Only the API endpoint is off-limits
// (it's a POST-only function that calls a paid AI service, not content).
const CRAWLERS = [
  "Googlebot", "Google-Extended", "Bingbot", "DuckDuckBot", "Applebot", "Applebot-Extended",
  "GPTBot", "OAI-SearchBot", "ChatGPT-User",
  "ClaudeBot", "Claude-User", "Claude-SearchBot", "anthropic-ai",
  "PerplexityBot", "Perplexity-User", "CCBot", "Amazonbot",
  "Meta-ExternalAgent", "Meta-ExternalFetcher", "cohere-ai", "MistralAI-User", "YouBot", "Diffbot", "Bytespider",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: "/api/" },
      ...CRAWLERS.map((userAgent) => ({ userAgent, allow: "/", disallow: "/api/" })),
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
