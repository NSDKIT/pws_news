export interface NewsItem {
  title: string;
  url: string;
  summary: string;
  fullContent: string;
  source: string;
  publishedAt?: string;
}

export interface QuizQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

export interface QuizSet {
  beginner: QuizQuestion[];
  intermediate: QuizQuestion[];
  advanced: QuizQuestion[];
}

export interface DailyNews {
  date: string; // YYYY-MM-DD
  internationalItems: NewsItem[];
  japanItems: NewsItem[];
  createdAt: string;
  /** 調査内容に基づく理解度チェック（任意） */
  quiz?: QuizSet;
}
