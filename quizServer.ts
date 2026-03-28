import { Type } from "@google/genai";
import type { NewsItem, QuizQuestion, QuizSet } from "./src/types";
import { getGeminiClient } from "./geminiNewsServer";

const QUESTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    question: { type: Type.STRING },
    options: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    correctIndex: { type: Type.INTEGER },
    explanation: { type: Type.STRING },
  },
  required: ["question", "options", "correctIndex", "explanation"],
};

const QUIZ_SET_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    beginner: { type: Type.ARRAY, items: QUESTION_SCHEMA },
    intermediate: { type: Type.ARRAY, items: QUESTION_SCHEMA },
    advanced: { type: Type.ARRAY, items: QUESTION_SCHEMA },
  },
  required: ["beginner", "intermediate", "advanced"],
};

function clip(text: string, max: number): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function buildCorpus(internationalItems: NewsItem[], japanItems: NewsItem[]): string {
  const lines: string[] = [];
  for (const it of japanItems) {
    lines.push(
      `[日本] ${it.title}\n概要: ${it.summary}\n詳細: ${clip(it.fullContent, 1200)}`
    );
  }
  for (const it of internationalItems) {
    lines.push(
      `[国際] ${it.title}\n概要: ${it.summary}\n詳細: ${clip(it.fullContent, 1200)}`
    );
  }
  return lines.join("\n\n---\n\n");
}

function normalizeQuiz(raw: unknown): QuizSet {
  const fix = (q: unknown): QuizQuestion | null => {
    if (!q || typeof q !== "object") return null;
    const o = q as Record<string, unknown>;
    const question = typeof o.question === "string" ? o.question : "";
    const explanation = typeof o.explanation === "string" ? o.explanation : "";
    let options = Array.isArray(o.options) ? o.options.map(String) : [];
    if (options.length !== 4) {
      while (options.length < 4) options.push(`（選択肢${options.length + 1}）`);
      options = options.slice(0, 4);
    }
    let correctIndex =
      typeof o.correctIndex === "number" ? Math.round(o.correctIndex) : 0;
    correctIndex = Math.max(0, Math.min(3, correctIndex));
    if (!question) return null;
    return { question, options: options as [string, string, string, string], correctIndex, explanation };
  };

  const r = raw as Record<string, unknown>;
  const arr = (k: string) => (Array.isArray(r[k]) ? r[k] : []);

  const beginner = (arr("beginner").map(fix).filter(Boolean) as QuizQuestion[]) || [];
  const intermediate =
    (arr("intermediate").map(fix).filter(Boolean) as QuizQuestion[]) || [];
  const advanced = (arr("advanced").map(fix).filter(Boolean) as QuizQuestion[]) || [];

  return { beginner, intermediate, advanced };
}

export async function generateQuizFromNews(
  internationalItems: NewsItem[],
  japanItems: NewsItem[]
): Promise<QuizSet> {
  const corpus = buildCorpus(internationalItems, japanItems);
  if (!corpus.trim()) {
    return { beginner: [], intermediate: [], advanced: [] };
  }

  const prompt = `あなたはエネルギー分野の教育担当です。以下のニュース調査結果「のみ」に基づき、理解度チェック用の4択問題を日本語で作成してください。

【厳守】
- 記載された情報に根拠のある問題にすること。推測や一般常識だけの問題は避ける。
- 各難易度ともにちょうど10問ずつ（合計30問）。
- 各問は選択肢が4つ、correctIndex は 0〜3 のいずれか（正解の選択肢のインデックス）。
- 初心者: 用語・基本的な事実・概要レベル。
- 中級者: 制度の関係、因果、数値や条件の理解。
- 上級者: 複合的な論点、市場・制度設計の深い理解が必要な内容。

【ニュース調査結果】
${corpus}
`;

  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: QUIZ_SET_SCHEMA,
    },
  });

  const text = response.text ?? "{}";
  try {
    const parsed = JSON.parse(text) as unknown;
    return normalizeQuiz(parsed);
  } catch (e) {
    console.error("Quiz JSON parse failed", e);
    return { beginner: [], intermediate: [], advanced: [] };
  }
}
