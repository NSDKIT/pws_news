import { NewsItem, QuizSet } from "../types";

async function postGenerateNews(
  date: string,
  scope: "international" | "japan"
): Promise<NewsItem[]> {
  const response = await fetch("/api/generate-news", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, scope }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const message =
      typeof err.error === "string" ? err.error : "Failed to generate news";
    throw new Error(message);
  }
  const data = (await response.json()) as { items: NewsItem[] };
  return data.items ?? [];
}

export async function fetchInternationalNews(date: string): Promise<NewsItem[]> {
  return postGenerateNews(date, "international");
}

export async function fetchJapanNews(date: string): Promise<NewsItem[]> {
  return postGenerateNews(date, "japan");
}

export async function fetchGenerateQuiz(
  internationalItems: NewsItem[],
  japanItems: NewsItem[]
): Promise<QuizSet> {
  const response = await fetch("/api/generate-quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ internationalItems, japanItems }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const message =
      typeof err.error === "string" ? err.error : "Failed to generate quiz";
    throw new Error(message);
  }
  const data = (await response.json()) as { quiz: QuizSet };
  return data.quiz ?? { beginner: [], intermediate: [], advanced: [] };
}
