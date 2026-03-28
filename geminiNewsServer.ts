import { GoogleGenAI, Type } from "@google/genai";
import type { NewsItem } from "./src/types";

const NEWS_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      url: { type: Type.STRING },
      summary: { type: Type.STRING },
      fullContent: { type: Type.STRING },
      source: { type: Type.STRING },
      publishedAt: { type: Type.STRING },
    },
    required: ["title", "url", "summary", "fullContent", "source"],
  },
};

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  return new GoogleGenAI({ apiKey });
}

async function fetchNews(prompt: string, retries = 2): Promise<NewsItem[]> {
  const ai = getGeminiClient();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: NEWS_SCHEMA,
      },
    });

    try {
      const news = JSON.parse(response.text ?? "[]") as NewsItem[];
      return news.map((item) => ({
        ...item,
        url: item.url.startsWith("http") ? item.url : `https://${item.url}`,
      }));
    } catch (e) {
      console.error("Failed to parse news JSON", e);
      return [];
    }
  } catch (error) {
    if (retries > 0) {
      console.warn(`Fetch news failed, retrying... (${retries} retries left)`, error);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return fetchNews(prompt, retries - 1);
    }
    console.error("Fetch news failed after all retries", error);
    throw error;
  }
}

export async function fetchInternationalNewsServer(date: string): Promise<NewsItem[]> {
  const prompt = `Find 10 news articles about international energy issues (oil, gas, renewables, nuclear, energy policy, etc.) from global sources (English, etc.) that were published on ${date}. 
  Provide the results in Japanese. 
  CRITICAL: You MUST use the actual, real URLs of the articles found via Google Search. Do NOT hallucinate or make up URLs. The URL must be a full absolute URL starting with http:// or https://.
  For each article, provide the title, original URL, source name, a brief summary (2-3 sentences), and a full content translation/detailed summary (10-15 sentences) in Japanese. 
  Only include articles published on ${date}.`;
  return fetchNews(prompt);
}

export async function fetchJapanNewsServer(date: string): Promise<NewsItem[]> {
  const prompt = `Find 10 news articles about Japan's energy and electricity system design (日本に関するエネルギー・電力の制度設計、電力市場、再エネ賦課金、容量市場、需給調整市場、託送料金など) that were published on ${date}. 
  Provide the results in Japanese. 
  CRITICAL: You MUST use the actual, real URLs of the articles found via Google Search. Do NOT hallucinate or make up URLs. The URL must be a full absolute URL starting with http:// or https://.
  For each article, provide the title, original URL, source name, a brief summary (2-3 sentences), and a full content translation/detailed summary (10-15 sentences) in Japanese. 
  Only include articles published on ${date}.`;
  return fetchNews(prompt);
}
