const API_KEY = "11a19584bbdacae1012f4b21d600bade";
let newsData = [];
let favoriteNews = JSON.parse(localStorage.getItem("favoriteNews")) || [];
let loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || {};
let ratings = JSON.parse(localStorage.getItem("ratings")) || {};

async function fetchAllCategoriesNews() {
    const categories = ["general", "technology", "business", "entertainment", "world", "sports", "politics"];
    const articles = [];

    try {
        for (const category of categories) {
            const response = await fetch(
                `https://gnews.io/api/v4/top-headlines?token=${API_KEY}&lang=en&category=${category}&max=10`
            );

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();

            if (data.articles) {
                articles.push(...data.articles.map(article => ({
                    id: article.url, // Use URL as unique ID
                    title: article.title,
                    content: article.description || "No content available",
                    category: category,
                    image: article.image || "https://via.placeholder.com/300x200?text=News+Image",
                    url: article.url,
                    publishedAt: formatDate(article.publishedAt),
                })));
            }
        }
        newsData = articles; // Save all articles to newsData
        displayNews(newsData);
    } catch (error) {
        console.error("Error fetching news:", error);
    }
}

function formatDate(dateString) {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function displayNews(filteredNews = newsData) {
    const container = document.getElementById("newsContainer");
    container.innerHTML = filteredNews.length ?
        filteredNews.map(news => `
      <div class="news-card" onclick="openModal('${news.id}', '${news.title}', '${news.image}', '${news.content}')">
        <span class="favorite-icon ${favoriteNews.includes(news.id) ? "active" : ""}" 
              onclick="toggleFavorite('${news.id}', event)">
          ${favoriteNews.includes(news.id) ? "❤️" : "🤍"}
        </span>
        <img class="news-image" src="${news.image}" alt="${news.title}">
        <div class="news-content">
          <h3>${news.title}</h3>
          <p>${news.content}</p>
          <div class="news-meta">
            <span class="category">${news.category}</span>
            <span class="date">${news.publishedAt}</span>
          </div>
        </div>
        <div class="rating" data-id="${news.id}">
          ${[1, 2, 3, 4, 5].map(i => `
            <span class="star ${ratings[news.id] >= i ? "active" : ""}" 
                  onclick="rateArticle('${news.id}', ${i}, event)">
              ★
            </span>
          `).join("")}
        </div>
      </div>
    `).join("")
    : "<p>No news found. Try refreshing.</p>";
}

function openModal(id, title, image, content) {
  // Function to open the modal with article details
  const modal = document.getElementById("articleModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalImage = document.getElementById("modalImage");
  const modalSummary = document.getElementById("modalSummary");
  const readMoreButton = document.getElementById("readMoreButton");

  modalTitle.innerText = title;
  modalImage.src = image;

  // Generate Summary (Mockup Function)
  modalSummary.innerText = content.split('.').slice(0, 3).join('. ') || "No summary available.";
  
  readMoreButton.onclick = () => {
    window.open(newsData.find(news => news.id === id).url, "_blank"); // Open the article in a new tab
  };

  modal.style.display = "block"; // Show modal
  document.querySelector('.rating').setAttribute('data-id', id); // Set data-id for the rating
  document.querySelector('.favorite-icon').setAttribute('onclick', `toggleFavorite('${id}', event)`); // Update favorite icon action
}

function closeModal() {
  const modal = document.getElementById("articleModal");
  modal.style.display = "none"; // Hide modal
}

function toggleFavorite(newsId, event) {
  if (!loggedInUser) {
    alert("Please log in to save favorites.");
    event.stopPropagation(); // Prevent opening the article link
    return; 
  }

  const index = favoriteNews.indexOf(newsId);
  if (index > -1) {
    favoriteNews.splice(index, 1);
  } else {
    favoriteNews.push(newsId);
  }

  localStorage.setItem("favoriteNews", JSON.stringify(favoriteNews));
  displayNews(); // Refresh displayed news to update favorites
}

function rateArticle(newsId, rating, event) {
  if (!loggedInUser) {
    alert("Please log in to rate articles.");
    event.stopPropagation(); // Prevent opening the article link
    return;
  }

  ratings[newsId] = rating;
  localStorage.setItem("ratings", JSON.stringify(ratings));
  displayNews(); // Refresh view to display updated ratings
}

function filterNews() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  const category = document.getElementById("filterCategory").value;

  const filtered = newsData.filter(news => {
    const matchesSearch =
      news.title.toLowerCase().includes(searchTerm) ||
      news.content.toLowerCase().includes(searchTerm);
    const matchesCategory = category === "all" || news.category === category;
    return matchesSearch && matchesCategory;
  });

  displayNews(filtered);
}

// Perform on page load
window.onload = () => {
  fetchAllCategoriesNews();
  // Add close modal functionality on outside click
  window.onclick = function(event) {
    const modal = document.getElementById("articleModal");
    if (event.target == modal) {
      closeModal();
    }
  };
};