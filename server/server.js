const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const db = require("./db").default;
const { fetchNews, fetchNewsByKeyword, analyzeSentiment } = require("./api");
const cron = require("node-cron");

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../public")));

// API Endpoints
app.get("/api/news", async (req, res) => {
  const { category, search } = req.query;
  let articles = [];

  try {
    if (search) {
      articles = await fetchNewsByKeyword(search);
    } else {
      articles = await fetchNews(category || "general");
    }

    // Store articles in database
    for (const article of articles) {
      const sentiment = await analyzeSentiment(
        article.description || article.content
      );

      await db.query(
        `
        INSERT INTO articles (title, content, image_url, source_url, published_at, category, sentiment, sentiment_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE title=VALUES(title), content=VALUES(content)
      `,
        [
          article.title,
          article.description || article.content,
          article.image,
          article.url,
          new Date(article.publishedAt),
          category || "general",
          sentiment?.polarity,
          sentiment?.score,
        ]
      );
    }

    res.json(articles);
  } catch (error) {
    console.error("Error in /api/news:", error);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

// Other endpoints (user auth, favorites, etc.) would go here

// Serve frontend
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "index.html"));
});

// Schedule hourly news updates
cron.schedule("0 * * * *", async () => {
  console.log("Running hourly news update...");
  try {
    await fetchNews("general");
    await fetchNews("technology");
    await fetchNews("business");
    // Add other categories as needed
  } catch (error) {
    console.error("Error in scheduled news update:", error);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
