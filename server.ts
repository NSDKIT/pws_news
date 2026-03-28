import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import {
  fetchInternationalNewsServer,
  fetchJapanNewsServer,
} from "./geminiNewsServer";
import { generateQuizFromNews } from "./quizServer";
import type { NewsItem } from "./src/types";
import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const newsDir = process.env.NEWS_DATA_DIR ?? __dirname;
const NEWS_FILE = path.join(newsDir, "news.json");

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  app.post("/api/generate-news", async (req, res) => {
    const { date, scope } = req.body as { date?: string; scope?: string };
    if (!date || typeof date !== "string") {
      return res.status(400).json({ error: "Date is required" });
    }
    if (scope !== "international" && scope !== "japan") {
      return res.status(400).json({ error: "scope must be international or japan" });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error:
          "GEMINI_API_KEY is not set. Add it to a .env file in the project root and restart the server.",
      });
    }
    try {
      const items =
        scope === "international"
          ? await fetchInternationalNewsServer(date)
          : await fetchJapanNewsServer(date);
      res.json({ items });
    } catch (error) {
      console.error("generate-news error:", error);
      res.status(500).json({ error: "Failed to generate news" });
    }
  });

  app.post("/api/generate-quiz", async (req, res) => {
    const { internationalItems, japanItems } = req.body as {
      internationalItems?: unknown;
      japanItems?: unknown;
    };
    if (!Array.isArray(internationalItems) || !Array.isArray(japanItems)) {
      return res.status(400).json({ error: "internationalItems and japanItems arrays are required" });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error:
          "GEMINI_API_KEY is not set. Add it to a .env file in the project root and restart the server.",
      });
    }
    try {
      const quiz = await generateQuizFromNews(
        internationalItems as NewsItem[],
        japanItems as NewsItem[]
      );
      res.json({ quiz });
    } catch (error) {
      console.error("generate-quiz error:", error);
      res.status(500).json({ error: "Failed to generate quiz" });
    }
  });

  await fs.ensureDir(newsDir);
  if (!await fs.pathExists(NEWS_FILE)) {
    await fs.writeJson(NEWS_FILE, {});
  }

  // API: Get news for a specific date
  app.get("/api/news", async (req, res) => {
    const { date } = req.query;
    if (!date || typeof date !== "string") {
      return res.status(400).json({ error: "Date is required" });
    }

    try {
      const allNews = await fs.readJson(NEWS_FILE);
      const dailyNews = allNews[date] || null;
      res.json(dailyNews);
    } catch (error) {
      console.error("Error reading news file:", error);
      res.status(500).json({ error: "Failed to read news data" });
    }
  });

  // API: Save news for a specific date
  app.post("/api/news", async (req, res) => {
    const { date, internationalItems, japanItems, createdAt, quiz } = req.body;
    if (!date || (!internationalItems && !japanItems)) {
      return res.status(400).json({ error: "Date and news items are required" });
    }

    try {
      const allNews = await fs.readJson(NEWS_FILE);
      allNews[date] = {
        date,
        internationalItems,
        japanItems,
        createdAt,
        ...(quiz !== undefined && quiz !== null ? { quiz } : {}),
      };
      await fs.writeJson(NEWS_FILE, allNews, { spaces: 2 });
      res.json({ success: true });
    } catch (error) {
      console.error("Error writing news file:", error);
      res.status(500).json({ error: "Failed to save news data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) {
        return res.status(404).json({ error: "Not found" });
      }
      res.sendFile(path.join(distPath, "index.html"), (err) => {
        if (err) next(err);
      });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT} (NODE_ENV=${process.env.NODE_ENV ?? "development"})`);
  });
}

startServer();
