const fetch = require("node-fetch");

const GNEWS_API_KEY = "your_api_key";

async function fetchNews(category = "general") {
  try {
    const response = await fetch(
      `https://gnews.io/api/v4/top-headlines?category=${category}&lang=en&country=in&max=10&apikey=${GNEWS_API_KEY}`
    );
    const data = await response.json();
    return data.articles.map((article) => ({
      ...article,
      category: `${category}News`,
    }));
  } catch (error) {
    console.error("Error fetching news:", error);
    return [];
  }
}

async function fetchNewsByKeyword(keyword) {
  try {
    const response = await fetch(
      `https://gnews.io/api/v4/search?q=${keyword}&lang=en&country=in&max=10&apikey=${GNEWS_API_KEY}`
    );
    const data = await response.json();
    return data.articles;
  } catch (error) {
    console.error("Error searching news:", error);
    return [];
  }
}

async function analyzeSentiment(text) {
  try {
    // This is a placeholder - you'll need to sign up for text2data API
    // and replace this with actual implementation
    return {
      polarity: "neutral",
      score: 0,
    };
  } catch (error) {
    console.error("Error analyzing sentiment:", error);
    return null;
  }
}

module.exports = { fetchNews, fetchNewsByKeyword, analyzeSentiment };
