const API_KEY = "11a19584bbdacae1012f4b21d600bade";
const GEMINI_API_KEY = 'AIzaSyBJKRTkkNkRq4R4v34q83qjbTA3UBS-3BQ';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
let newsData = [];
let favoriteNews = JSON.parse(localStorage.getItem("favoriteNews")) || [];
let loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || {};
let ratings = JSON.parse(localStorage.getItem("ratings")) || {};
let reviews = JSON.parse(localStorage.getItem("reviews")) || {};
let userRatings = JSON.parse(localStorage.getItem("userRatings")) || {};
let articleRatings = JSON.parse(localStorage.getItem("articleRatings")) || {};

// Maps of positive and negative words for simple sentiment analysis
const positiveWords = new Set([
    'good', 'great', 'excellent', 'positive', 'wonderful', 'fantastic', 'amazing',
    'awesome', 'outstanding', 'superb', 'brilliant', 'terrific', 'remarkable',
    'exceptional', 'marvelous', 'splendid', 'fabulous', 'impressive', 'admirable',
    'success', 'successful', 'achieve', 'accomplished', 'achievement', 'progress',
    'breakthrough', 'innovative', 'innovation', 'solution', 'solved', 'resolved',
    'improve', 'improved', 'improvement', 'increasing', 'increase', 'growth',
    'growing', 'develop', 'developing', 'development', 'advance', 'advancing',
    'advantage', 'beneficial', 'benefit', 'helpful', 'effective', 'efficient',
    'gain', 'profit', 'prosperity', 'prosperous', 'promising', 'hopeful',
    'optimistic', 'hope', 'celebration', 'celebrate', 'congratulations', 'win',
    'winner', 'winning', 'victory', 'triumph', 'succeed', 'agreement', 'agree',
    'happy', 'happiness', 'joy', 'joyful', 'pleased', 'satisfying', 'satisfaction',
    'support', 'supporting', 'supported', 'approval', 'approve', 'approved'
]);

const negativeWords = new Set([
    'bad', 'terrible', 'awful', 'poor', 'negative', 'horrible', 'dreadful',
    'disappointing', 'disastrous', 'catastrophic', 'tragic', 'unfortunate',
    'miserable', 'appalling', 'atrocious', 'inadequate', 'inferior', 'deficient',
    'fail', 'failure', 'failing', 'failed', 'problem', 'issue', 'trouble',
    'crisis', 'emergency', 'disaster', 'catastrophe', 'danger', 'dangerous',
    'threat', 'threatening', 'warning', 'alarm', 'concerning', 'concern',
    'worried', 'worry', 'anxious', 'anxiety', 'fear', 'fearful', 'scared',
    'afraid', 'panic', 'terror', 'horrific', 'horrifying', 'shocking', 'shocked',
    'upset', 'angry', 'anger', 'furious', 'outraged', 'hostile', 'aggression',
    'aggressive', 'violent', 'violence', 'attack', 'conflict', 'dispute',
    'argument', 'controversy', 'contentious', 'debatable', 'protest', 'protesting',
    'opposition', 'oppose', 'opposing', 'rejection', 'reject', 'rejected',
    'decline', 'declining', 'decrease', 'decreasing', 'loss', 'losing', 'lose',
    'lost', 'damage', 'damaged', 'harmful', 'hurt', 'suffering', 'suffer',
    'painful', 'pain', 'illness', 'sick', 'disease', 'infection', 'infected',
    'contaminated', 'contamination', 'pollution', 'polluted', 'corruption',
    'corrupt', 'scandal', 'controversial', 'criticism', 'criticize', 'blamed',
    'blame', 'fault', 'guilty', 'accusation', 'accuse', 'accused'
]);

// Signs of potential fake news
const clickbaitPhrases = [
  'you won\'t believe', 'shocking', 'mind blowing', 'incredible', 'unbelievable',
  'shocking truth', 'what happened next', 'jaw dropping', 'scientists baffled',
  'doctors hate', 'one weird trick', 'this simple', 'secret they don\'t want you to know',
  'they don\'t want you to know', 'miracle', 'revolutionary', 'game-changing',
  'this will change your life', 'you\'ll never look at the same way again'
];

const emotionalLanguage = [
  'outrageous', 'terrible', 'horrific', 'disgusting', 'appalling', 'atrocious',
  'scandalous', 'sickening', 'devastating', 'horrendous', 'frightening', 'terrifying',
  'mind-numbing', 'insane', 'crazy', 'unbelievable', 'astonishing', 'astounding',
  'sensational', 'spectacular', 'remarkable', 'extraordinary', 'stupendous', 'tremendous'
];

const conspiracyTerms = [
  'conspiracy', 'coverup', 'cover up', 'cover-up', 'government is hiding',
  'they don\'t want you to know', 'what they don\'t tell you', 'secret agenda',
  'hidden agenda', 'shadow government', 'deep state', 'illuminati', 'new world order',
  'controlled by', 'puppet', 'puppets', 'orchestrated', 'propaganda', 'false flag'
];

// Initialize authenticity votes in localStorage if not exists
let authenticityVotes = JSON.parse(localStorage.getItem("authenticityVotes")) || {};

// Initialize reviews object to store user authenticity reviews
let authenticityReviews = JSON.parse(localStorage.getItem("authenticityReviews")) || {};

async function fetchFullArticleContent(url) {
    try {
        // Use a CORS proxy service
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const html = data.contents;
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const paragraphs = Array.from(doc.getElementsByTagName('p'));
        const contentParagraphs = paragraphs.filter(p => {
            const text = p.textContent.trim();
            return text.length > 50;
        });
        
        return contentParagraphs.map(p => p.textContent.trim()).join('\n\n') || null;
    } catch (error) {
        console.error('Error fetching full article:', error);
        return null;
    }
}

async function fetchAllCategoriesNews() {
    const categories = ["general", "technology", "business", "entertainment", "world", "sports", "politics"];
    const articles = [];
    const container = document.getElementById("newsContainer");
    
    container.innerHTML = "<p>Loading news articles...</p>";

    try {
        for (const category of categories) {
            try {
                await new Promise(resolve => setTimeout(resolve, 1200));

            const response = await fetch(
                `https://gnews.io/api/v4/top-headlines?token=${API_KEY}&lang=en&category=${category}&max=10`
            );

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();

                if (data.articles && Array.isArray(data.articles)) {
                    for (const article of data.articles) {
                        if (article.url && article.title) {
                            articles.push({
                                id: article.url,  // Use URL as ID
                                url: article.url,
                    title: article.title,
                                description: article.description || "No description available",
                                content: article.content || article.description,
                    category: category,
                    image: article.image || "https://via.placeholder.com/300x200?text=News+Image",
                    publishedAt: formatDate(article.publishedAt),
                            });
                        }
                    }
                }
            } catch (categoryError) {
                console.error(`Error fetching ${category} news:`, categoryError);
                continue;
            }
        }
        
        if (articles.length === 0) {
            container.innerHTML = "<p>No news found. Try refreshing.</p>";
        } else {
            newsData = articles;
        displayNews(newsData);
            displayFavorites();
        }
    } catch (error) {
        console.error("Error fetching news:", error);
        container.innerHTML = "<p>Error loading news. Please try refreshing.</p>";
    }
}

function retryFetchNews() {
    const container = document.getElementById("newsContainer");
    container.innerHTML = "<p>Retrying to load news articles...</p>";
    setTimeout(() => {
        fetchAllCategoriesNews();
    }, 1000);
}

// Add CSS for error message and retry button
const style = document.createElement('style');
style.textContent = `
    .error-message {
        text-align: center;
        padding: 20px;
        margin: 20px;
        background-color: #fff3cd;
        border: 1px solid #ffeeba;
        border-radius: 4px;
        color: #856404;
    }
    .retry-button {
        margin-top: 10px;
        padding: 8px 16px;
        background-color: #333;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.3s;
    }
    .retry-button:hover {
        background-color: #555;
    }
`;
document.head.appendChild(style);

function formatDate(dateString) {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function getAnalysisDetails(title, content, sourceName) {
    // Calculate individual scores
    const clickbaitScore = detectClickbait(title);
    const emotionalScore = detectEmotionalLanguage(content);
    const conspiracyScore = detectConspiracyLanguage(content);
    const sourceScore = checkSourceCredibility(sourceName);
    const lengthScore = checkArticleLength(content);
    
    // Calculate weighted probability
    const fakeProbability = 
        (clickbaitScore * 0.25) + 
        (emotionalScore * 0.2) + 
        (conspiracyScore * 0.3) + 
        (sourceScore * 0.15) + 
        (lengthScore * 0.1);
    
    return {
        total: Math.min(Math.max(fakeProbability, 0), 1),
        factors: {
            clickbait: {
                score: clickbaitScore,
                weight: 0.25,
                weighted: clickbaitScore * 0.25
            },
            emotional: {
                score: emotionalScore,
                weight: 0.20,
                weighted: emotionalScore * 0.2
            },
            conspiracy: {
                score: conspiracyScore,
                weight: 0.30,
                weighted: conspiracyScore * 0.3
            },
            source: {
                score: sourceScore,
                weight: 0.15,
                weighted: sourceScore * 0.15
            },
            length: {
                score: lengthScore,
                weight: 0.10,
                weighted: lengthScore * 0.1
            }
        }
    };
}

function updateArticleAuthenticityDisplay(newsId) {
    const article = newsData.find(news => news.id === newsId);
    if (!article) return;
    
    const analysis = getAnalysisDetails(article.title, article.content, article.source || '');
    const isHighRisk = analysis.total > 0.6;
    
    // Update the authenticity section in the modal
    const authenticitySection = document.querySelector('.authenticity-section');
    if (authenticitySection) {
        authenticitySection.innerHTML = `
            <div class="simple-risk-indicator ${isHighRisk ? 'high-risk' : 'low-risk'}">
                ${isHighRisk ? '⚠️' : '✓'} ${isHighRisk ? 'High Risk - Likely Fake' : 'Low Risk - Likely Real'}
            </div>
            <div class="risk-score">Risk Score: ${(analysis.total * 100).toFixed(1)}%</div>
        `;
    }
}

// Update displayNews function to show risk indicators in news cards
function displayNews(filteredNews = newsData) {
    const container = document.getElementById("newsContainer");
    container.innerHTML = filteredNews.length ?
        filteredNews.map(news => {
            // Properly escape content for HTML attributes
            const escapedTitle = news.title.replace(/["']/g, "&quot;");
            const escapedContent = (news.content || news.description || '').replace(/["']/g, "&quot;");
            const escapedId = news.id.replace(/["']/g, "&quot;");
            
            return `
                <div class="news-card" data-id="${escapedId}" data-title="${escapedTitle}" data-image="${news.image}" data-content="${escapedContent}">
        <span class="favorite-icon ${favoriteNews.includes(news.id) ? "active" : ""}" 
                          onclick="event.stopPropagation(); toggleFavorite('${escapedId}', event)">
          ${favoriteNews.includes(news.id) ? "❤️" : "🤍"}
        </span>
                    <img class="news-image" src="${news.image}" alt="${escapedTitle}">
        <div class="news-content">
          <h3>${news.title}</h3>
                        <p>${news.description || ''}</p>
          <div class="news-meta">
            <span class="category">${news.category}</span>
            <span class="date">${news.publishedAt}</span>
          </div>
        </div>
        </div>
            `;
        }).join("")
    : "<p>No news found. Try refreshing.</p>";

    // Add click event listeners to all news cards
    const newsCards = container.getElementsByClassName('news-card');
    Array.from(newsCards).forEach(card => {
        card.addEventListener('click', function() {
            const id = this.dataset.id;
            const title = this.dataset.title;
            const image = this.dataset.image;
            const content = this.dataset.content;
            openModal(id, title, image, content);
        });
    });

    // After setting innerHTML, update all rating displays
    filteredNews.forEach(news => {
        updateRatingDisplay(news.id);
    });
}

function analyzeSentiment(text) {
    // Convert to lowercase and tokenize
    const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
    
    let positiveCount = 0;
    let negativeCount = 0;
    const foundKeywords = new Map(); // To track found sentiment words and their count
    
    // Count positive and negative words
    for (const word of words) {
        if (positiveWords.has(word)) {
            positiveCount++;
            foundKeywords.set(word, (foundKeywords.get(word) || 0) + 1);
        } else if (negativeWords.has(word)) {
            negativeCount++;
            foundKeywords.set(word, (foundKeywords.get(word) || 0) + 1);
        }
    }
    
    // Calculate overall sentiment
    const totalWords = words.length;
    const positiveRatio = positiveCount / Math.max(totalWords, 1);
    const negativeRatio = negativeCount / Math.max(totalWords, 1);
    
    // Get top keywords that contributed to sentiment
    const sortedKeywords = Array.from(foundKeywords.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word, count]) => ({
            text: word,
            sentiment: positiveWords.has(word) ? 1 : -1
        }));

    // Calculate score between -1 and 1
    let score = (positiveRatio - negativeRatio) * 3; // Adjust multiplier for better range
    score = Math.max(-1, Math.min(1, score)); // Clamp between -1 and 1

    // Calculate magnitude based on total sentiment words found
    const magnitude = Math.min(5, (positiveCount + negativeCount) / Math.max(totalWords / 10, 1));

    return {
        score: score,
        magnitude: magnitude,
        subjectivity: (positiveCount + negativeCount) > totalWords * 0.05 ? "subjective" : "objective",
        keywords: sortedKeywords
    };
}

function updateSentimentDisplay(result) {
    const sentimentType = document.getElementById("sentimentType");
    const magnitudeValue = document.getElementById("magnitudeValue");
    const subjectivityValue = document.getElementById("subjectivityValue");
    const keywordsList = document.getElementById("keywordsList");
    
    // Update sentiment type and score
    let sentimentText = "";
    if (result.score >= 0.25) {
        sentimentText = "positive";
        sentimentType.style.color = "#4caf50";
    } else if (result.score <= -0.25) {
        sentimentText = "negative";
        sentimentType.style.color = "#f44336";
    } else {
        sentimentText = "neutral";
        sentimentType.style.color = "#757575";
    }
    
    sentimentType.textContent = `${sentimentText} (${result.score.toFixed(2)})`;
    magnitudeValue.textContent = result.magnitude.toFixed(2);
    subjectivityValue.textContent = result.subjectivity;

    // Update keywords
    keywordsList.innerHTML = '';
    if (result.keywords && result.keywords.length > 0) {
        result.keywords.forEach(keyword => {
            const chip = document.createElement('span');
            chip.className = 'keyword-chip';
            chip.textContent = keyword.text;
            chip.style.backgroundColor = keyword.sentiment > 0 ? '#c8e6c9' : '#ffcdd2';
            keywordsList.appendChild(chip);
        });
    } else {
        keywordsList.innerHTML = '<span class="keyword-chip">No keywords found</span>';
    }
}

async function generateSummaryWithGemini(title, content) {
    if (!content || content.trim().length === 0) {
        return "Summary not available for this article.";
    }

    try {
        const prompt = `Please provide a comprehensive and well-structured summary of this article. Focus on:

1. Main topic and key points
2. Important facts and figures
3. Context and background information
4. Implications or consequences
5. Different perspectives if present

Make the summary:
- Clear and concise
- Well-organized
- Easy to understand
- Factual and objective
- Complete enough to understand the full story

Article Title: ${title}

Article Content: ${content}`;

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    topK: 40,
                    topP: 0.8,
                    maxOutputTokens: 1024
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.error) {
            console.error('Gemini API Error:', data.error);
            return content;
        }

        return data.candidates?.[0]?.content?.parts?.[0]?.text || content;
    } catch (error) {
        console.error('Error generating summary:', error);
        return content;
    }
}

async function openModal(id, title, image, content) {
    const modal = document.getElementById("articleModal");
  const modalContent = document.querySelector('.modal-content');
    
    const article = newsData.find(news => news.id === id);
    if (!article) {
        console.error('Article not found:', id);
        return;
    }
    
    // Show modal immediately with loading state
    modal.style.display = "block";
    modalContent.innerHTML = `
        <span class="close" onclick="closeModal()">&times;</span>
        <img id="modalImage" src="${image}" alt="${title}" />
        <h2 id="modalTitle">${title}</h2>
        <p id="modalSummary">Loading summary...</p>
    `;
    
    try {
        const fullContent = await fetchFullArticleContent(article.url);
        const contentToSummarize = fullContent || content || article.description;
        const summary = await generateSummaryWithGemini(title, contentToSummarize);
        
        modalContent.innerHTML = `
            <span class="close" onclick="closeModal()">&times;</span>
            <span class="favorite-icon ${favoriteNews.includes(id) ? "active" : ""}" 
                  onclick="toggleFavorite('${id}', event)">
                ${favoriteNews.includes(id) ? "❤️" : "🤍"}
            </span>
            <img id="modalImage" src="${image}" alt="${title}" />
            <h2 id="modalTitle">${title}</h2>
            <p id="modalSummary">${summary}</p>
            <div class="bottom-section">
                <div class="left-indicators">
                    <div class="authenticity-section"></div>
                    <div class="sentiment-analysis">
                        <div class="sentiment-info">
                            <span>This document is: </span>
                            <span id="sentimentType" class="sentiment-type">Loading...</span>
                            <span class="magnitude-info">ℹ Magnitude: <span id="magnitudeValue">...</span></span>
                        </div>
                        <div class="sentiment-score-range">
                            <div class="score-label">Score Range</div>
                            <div class="score-bars">
                                <div class="score-section negative">-1</div>
                                <div class="score-section negative-light">-0.25</div>
                                <div class="score-section neutral">0</div>
                                <div class="score-section positive-light">+0.25</div>
                                <div class="score-section positive">+1</div>
                            </div>
                        </div>
                        <div class="subjectivity">
                            Subjectivity: <span id="subjectivityValue">...</span>
                        </div>
                        <div class="tone-keywords">
                            <span>Key tone indicators: </span>
                            <div id="keywordsList"></div>
                        </div>
                    </div>
                </div>
                <span class="review-icon" onclick="openReviewForm('${id}', event)">
                    <i class="fas fa-pen"></i>
                </span>
            </div>
            <button id="readMoreButton">Read More</button>
            <div class="rating" data-id="${id}"></div>
        `;
        
        const fullText = `${title} ${contentToSummarize}`;
        const sentimentResult = analyzeSentiment(fullText);
        updateSentimentDisplay(sentimentResult);
        
        document.getElementById('readMoreButton').onclick = () => {
            window.open(article.url, "_blank");
        };
        
        updateRatingDisplay(id);
        
        updateArticleAuthenticityDisplay(id);
        
    } catch (error) {
        console.error('Error in modal:', error);
        modalContent.innerHTML = `
            <span class="close" onclick="closeModal()">&times;</span>
            <span class="favorite-icon ${favoriteNews.includes(id) ? "active" : ""}" 
                  onclick="toggleFavorite('${id}', event)">
                ${favoriteNews.includes(id) ? "❤️" : "🤍"}
            </span>
            <img id="modalImage" src="${image}" alt="${title}" />
            <h2 id="modalTitle">${title}</h2>
            <p id="modalSummary">${content || article.description || "No content available."}</p>
            <div class="bottom-section">
                <div class="left-indicators">
                    <div class="authenticity-section"></div>
                    <div class="sentiment-analysis">
                        <div class="sentiment-info">
                            <span>This document is: </span>
                            <span id="sentimentType" class="sentiment-type">Loading...</span>
                            <span class="magnitude-info">ℹ Magnitude: <span id="magnitudeValue">...</span></span>
                        </div>
                        <div class="sentiment-score-range">
                            <div class="score-label">Score Range</div>
                            <div class="score-bars">
                                <div class="score-section negative">-1</div>
                                <div class="score-section negative-light">-0.25</div>
                                <div class="score-section neutral">0</div>
                                <div class="score-section positive-light">+0.25</div>
                                <div class="score-section positive">+1</div>
                            </div>
                        </div>
                        <div class="subjectivity">
                            Subjectivity: <span id="subjectivityValue">...</span>
                        </div>
                        <div class="tone-keywords">
                            <span>Key tone indicators: </span>
                            <div id="keywordsList"></div>
                        </div>
                    </div>
                </div>
                <span class="review-icon" onclick="openReviewForm('${id}', event)">
                    <i class="fas fa-pen"></i>
                </span>
            </div>
            <button id="readMoreButton">Read More</button>
            <div class="rating" data-id="${id}"></div>
        `;
        document.getElementById('readMoreButton').onclick = () => {
            window.open(article.url, "_blank");
        };
    }
}

function closeModal() {
  const modal = document.getElementById("articleModal");
  modal.style.display = "none"; // Hide modal
}

function toggleFavorite(newsId, event) {
  if (event) {
    event.stopPropagation(); // Prevent opening the article link or bubbling
  }
  
  // Check if user is logged in
  if (!localStorage.getItem("loggedInUser") || !JSON.parse(localStorage.getItem("loggedInUser")).username) {
    alert("Please log in to save favorites.");
    return; 
  }

  const index = favoriteNews.indexOf(newsId);
  if (index > -1) {
    favoriteNews.splice(index, 1);
  } else {
    favoriteNews.push(newsId);
  }

  localStorage.setItem("favoriteNews", JSON.stringify(favoriteNews));
  
  // Update both the card and modal if open
  displayNews();
  displayFavorites();
  
  // If called from modal, update the favorite icon there too
  const modalFavoriteIcon = document.querySelector('.modal-content .favorite-icon');
  if (modalFavoriteIcon) {
    modalFavoriteIcon.classList.toggle('active', favoriteNews.includes(newsId));
    modalFavoriteIcon.innerHTML = favoriteNews.includes(newsId) ? "❤️" : "🤍";
  }
}

function calculateAverageRating(newsId) {
    if (!articleRatings[newsId]) {
        return { average: 0, count: 0 };
    }
    
    const ratings = Object.values(articleRatings[newsId]);
    const sum = ratings.reduce((a, b) => a + b, 0);
    return {
        average: ratings.length > 0 ? (sum / ratings.length).toFixed(1) : 0,
        count: ratings.length
    };
}

function rateArticle(newsId, rating, event) {
  if (event) {
        event.stopPropagation();
  }
  
    // Check if user is logged in
    const currentUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!currentUser || !currentUser.username) {
    alert("Please log in to rate articles.");
    return;
  }

    // Check if user has already rated this article
    const userRatingKey = `${currentUser.username}_${newsId}`;
    if (userRatings[userRatingKey]) {
        alert("You have already rated this article.");
        return;
    }

    // Save user's rating
    userRatings[userRatingKey] = rating;
    localStorage.setItem("userRatings", JSON.stringify(userRatings));

    // Update article ratings
    if (!articleRatings[newsId]) {
        articleRatings[newsId] = {};
    }
    articleRatings[newsId][currentUser.username] = rating;
    localStorage.setItem("articleRatings", JSON.stringify(articleRatings));

    // Update the display
    updateRatingDisplay(newsId);
}

function updateRatingDisplay(newsId) {
    const ratingContainer = document.querySelector(`.rating[data-id="${newsId}"]`);
    if (!ratingContainer) return;

    const { average, count } = calculateAverageRating(newsId);
    
    // Get current user's rating if they're logged in
    const currentUser = JSON.parse(localStorage.getItem("loggedInUser"));
    const userRatingKey = currentUser ? `${currentUser.username}_${newsId}` : null;
    const userRating = userRatings[userRatingKey];
    
    // Define rating options with emojis and labels
    const ratingOptions = [
        { emoji: '😡', label: 'Very Unsatisfied', value: 1 },
        { emoji: '☹️', label: 'Unsatisfied', value: 2 },
        { emoji: '😐', label: 'Neutral', value: 3 },
        { emoji: '🙂', label: 'Satisfied', value: 4 },
        { emoji: '😊', label: 'Very Satisfied', value: 5 }
    ];

    // Create the rating HTML
    ratingContainer.innerHTML = `
        <div class="rating-container ${userRating ? 'rating-disabled' : ''}">
            <div class="rating-title">Rate this article:</div>
            <div class="stars-container">
                ${ratingOptions.map(option => `
                    <div class="rating-option ${userRating === option.value ? 'active' : ''}" 
                         data-rating="${option.value}"
                         onclick="rateArticle('${newsId}', ${option.value}, event)">
                        <span class="rating-emoji">${option.emoji}</span>
                        <span class="rating-label">${option.label}</span>
                    </div>
                `).join('')}
            </div>
            <div class="average-rating">
                <span class="average-rating-emoji">${getAverageRatingEmoji(average)}</span>
                <span class="average-rating-score">${average}</span>
                <span class="rating-count">${count} ${count === 1 ? 'rating' : 'ratings'}</span>
            </div>
        </div>
    `;
}

function getAverageRatingEmoji(rating) {
    const numRating = parseFloat(rating);
    if (numRating >= 4.5) return '😊';
    if (numRating >= 3.5) return '🙂';
    if (numRating >= 2.5) return '😐';
    if (numRating >= 1.5) return '☹️';
    return '😡';
}

function openReviewForm(newsId, event) {
  if (event) {
        event.stopPropagation();
  }
  
  const currentUser = localStorage.getItem("loggedInUser") ? JSON.parse(localStorage.getItem("loggedInUser")) : {};
  
  if (!currentUser.username) {
        alert("Please log in to review this article.");
        return;
    }
    
    // Check if user has already reviewed this article
    const userReviewKey = `${newsId}_${currentUser.username}`;
    if (authenticityReviews[userReviewKey]) {
        alert("You have already reviewed this article's authenticity.");
    return;
  }
  
  // Remove any existing review form
  const existingReviewForm = document.querySelector('.review-form');
  if (existingReviewForm) {
    existingReviewForm.remove();
        return;
  }
  
    // Create the review form for authenticity
  const reviewForm = document.createElement('div');
  reviewForm.className = 'review-form';
  
  reviewForm.innerHTML = `
        <h3>Dispute Article Classification</h3>
        <p>Do you disagree with our classification? Please provide your assessment:</p>
        <div class="authenticity-buttons">
            <button class="real-btn" onclick="submitAuthenticityReview('${newsId}', 'real')">Mark as Real</button>
            <button class="fake-btn" onclick="submitAuthenticityReview('${newsId}', 'fake')">Mark as Fake</button>
        </div>
      <button class="cancel-btn" onclick="cancelReview()">Cancel</button>
  `;
  
  // Insert the form after the modal summary
  const modalSummary = document.getElementById('modalSummary');
  modalSummary.after(reviewForm);
}

function submitAuthenticityReview(newsId, verdict) {
    const currentUser = JSON.parse(localStorage.getItem("loggedInUser"));
    const userReviewKey = `${newsId}_${currentUser.username}`;
  
  // Save the review
    authenticityReviews[userReviewKey] = {
        verdict: verdict,
        timestamp: Date.now()
    };
    localStorage.setItem("authenticityReviews", JSON.stringify(authenticityReviews));
  
  // Show confirmation
  const reviewForm = document.querySelector('.review-form');
  reviewForm.innerHTML = '<p class="review-success">Thank you for your review!</p>';
  
  // Remove the form after a delay
  setTimeout(() => {
    reviewForm.remove();
  }, 2000);
    
    // Update the article's display
    updateArticleAuthenticityDisplay(newsId);
}

function cancelReview() {
  // Simply remove the review form
  const reviewForm = document.querySelector('.review-form');
  if (reviewForm) {
    reviewForm.remove();
  }
}

function filterNews() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  const category = document.getElementById("filterCategory").value;

  const filtered = newsData.filter(news => {
    const matchesSearch =
      news.title.toLowerCase().includes(searchTerm) ||
      news.description.toLowerCase().includes(searchTerm);
    const matchesCategory = category === "all" || news.category === category;
    return matchesSearch && matchesCategory;
  });

  displayNews(filtered);
}

// Display user's favorite news
function displayFavorites() {
  const currentUser = localStorage.getItem("loggedInUser") ? JSON.parse(localStorage.getItem("loggedInUser")) : {};
  
  if (!currentUser.username) {
    document.getElementById("favoritesList").innerHTML = "<p>Please log in to see your favorites.</p>";
    return;
  }
  
  const seenIds = new Set();
  const uniqueFavoriteArticles = newsData.filter(news => {
    if (favoriteNews.includes(news.id) && !seenIds.has(news.id)) {
      seenIds.add(news.id);
      return true;
    }
    return false;
  });
  
  const favoritesList = document.getElementById("favoritesList");
  favoritesList.innerHTML = uniqueFavoriteArticles.length ?
    uniqueFavoriteArticles.map(news => {
      const newsCard = document.querySelector(`.news-card[data-id="${news.id}"]`);
      return `
        <div class="favorite-item" style="cursor: pointer;" onclick="handleFavoriteClick('${news.id}')">
          <span class="favorite-icon active" onclick="event.stopPropagation(); toggleFavorite('${news.id}', event)">❤️</span>
          <span class="favorite-title">${news.title}</span>
        </div>
      `;
    }).join("")
    : "<p>No favorites added yet.</p>";
}

function handleFavoriteClick(newsId) {
  const article = newsData.find(news => news.id === newsId);
  if (article) {
    const newsCard = document.querySelector(`.news-card[data-id="${newsId}"]`);
    if (newsCard) {
      newsCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      newsCard.style.transition = 'background-color 0.5s';
      newsCard.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
      setTimeout(() => {
        newsCard.style.backgroundColor = '';
      }, 2000);
    }
    openModal(article.id, article.title, article.image, article.content || article.description);
  }
}

// Check login status on page load
function checkLoginStatus() {
  const profileSection = document.getElementById("profileSection");
  const loginLink = document.getElementById("loginLink");
    const welcomeMessage = document.getElementById("welcomeMessage");
    const userFirstName = document.getElementById("userFirstName");
    const logoutBtn = document.getElementById('logoutBtn');
  
  // Always read fresh from localStorage
  const currentUser = localStorage.getItem("loggedInUser") ? JSON.parse(localStorage.getItem("loggedInUser")) : {};
  
  // Update the global loggedInUser variable to ensure it's current
  loggedInUser = currentUser;
  
    if (currentUser.firstName) {
        // Hide login link and show welcome message and logout button
        loginLink.style.display = "none";
        welcomeMessage.style.display = "flex";
        logoutBtn.style.display = "flex";
        userFirstName.textContent = currentUser.firstName;
        
        // Add logout functionality
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('loggedInUser');
            localStorage.removeItem('favorites');
            window.location.href = 'index.html';
        });
        
    displayFavorites();
  } else {
        // Reset to initial state
    profileSection.innerHTML = "";
        loginLink.style.display = "block";
        welcomeMessage.style.display = "none";
        logoutBtn.style.display = "none";
    loginLink.innerHTML = "LOGIN / SIGN UP";
    loginLink.setAttribute("href", "login.html");
    loginLink.removeAttribute("onclick");
        loginLink.style.cursor = "pointer";
  }
}

// Function to handle successful login (to be called from login.html)
function handleLoginSuccess(user) {
  localStorage.setItem("loggedInUser", JSON.stringify(user));
  loggedInUser = user; // Update the global variable
  checkLoginStatus();
  displayFavorites();
    window.location.href = "index.html"; // Redirect to home page after login
}

// Logout function
function logout() {
  const confirmLogout = confirm("Are you sure you want to logout? 👋");
  if (confirmLogout) {
  localStorage.removeItem("loggedInUser");
  loggedInUser = {}; // Clear the global variable
    alert("You have been logged out successfully! Come back soon! 👋");
  checkLoginStatus(); // Update UI
  displayFavorites(); // Clear favorites view
  }
}

// Perform on page load
window.onload = () => {
  // Check login status first to ensure user data is fresh
  checkLoginStatus();
  
  // Then fetch news
  fetchAllCategoriesNews();
  
  // Add close modal functionality on outside click
  window.onclick = function(event) {
    const modal = document.getElementById("articleModal");
    if (event.target == modal) {
      closeModal();
    }
  };
  
  // Remove the review icon from the main page if it exists
  const pageReviewIcon = document.querySelector('main > .review-icon');
  if (pageReviewIcon) {
    pageReviewIcon.remove();
  }
  
  // Set up event listeners for login detection
  window.addEventListener('storage', function(e) {
    if (e.key === 'loggedInUser') {
      // Refresh user data when localStorage changes
      checkLoginStatus();
    }
  });
};

// Detect potential clickbait in title
const detectClickbait = (title) => {
  const lowerTitle = title.toLowerCase();
  let count = 0;
  
  clickbaitPhrases.forEach(phrase => {
    if (lowerTitle.includes(phrase.toLowerCase())) {
      count++;
    }
  });
  
  return count / clickbaitPhrases.length;
};

// Detect excessive emotional language
const detectEmotionalLanguage = (text) => {
  const lowerText = text.toLowerCase();
  let count = 0;
  
  emotionalLanguage.forEach(term => {
    if (lowerText.includes(term.toLowerCase())) {
      count++;
    }
  });
  
  // Normalize based on text length
  const words = text.split(/\s+/).length;
  return count / Math.min(words / 10, emotionalLanguage.length);
};

// Detect conspiracy theory language
const detectConspiracyLanguage = (text) => {
  const lowerText = text.toLowerCase();
  let count = 0;
  
  conspiracyTerms.forEach(term => {
    if (lowerText.includes(term.toLowerCase())) {
      count++;
    }
  });
  
  // Normalize based on text length
  const words = text.split(/\s+/).length;
  return count / Math.min(words / 20, conspiracyTerms.length);
};

// Check for source credibility indicators
const checkSourceCredibility = (source) => {
  const credibleSources = ['times', 'post', 'news', 'bbc', 'reuters', 'associated press', 'ap', 'journal'];
  
  const lowerSource = source.toLowerCase();
  for (const credible of credibleSources) {
    if (lowerSource.includes(credible)) {
      return 0.3;
    }
  }
  
  return 0.6;
};

// Check article length
const checkArticleLength = (content) => {
  const words = content.split(/\s+/).length;
  if (words < 100) {
    return 0.7;
  } else if (words < 300) {
    return 0.5;
  } else {
    return 0.3;
  }
};

// Main function to detect fake news probability
const detectFakeNews = (title, content, sourceName) => {
  const clickbaitScore = detectClickbait(title) * 0.25;
  const emotionalScore = detectEmotionalLanguage(content) * 0.2;
  const conspiracyScore = detectConspiracyLanguage(content) * 0.3;
  const sourceScore = checkSourceCredibility(sourceName) * 0.15;
  const lengthScore = checkArticleLength(content) * 0.1;
  
  const fakeProbability = 
    clickbaitScore + 
    emotionalScore + 
    conspiracyScore + 
    sourceScore + 
    lengthScore;
  
  return Math.min(Math.max(fakeProbability, 0), 1);
};

// Function to handle authenticity votes
function voteAuthenticity(newsId, vote, event) {
    if (event) {
        event.stopPropagation();
    }
    
    // Check if user is logged in
    if (!localStorage.getItem("loggedInUser")) {
        alert("Please log in to vote on article authenticity.");
        return;
    }
    
    // Initialize or update votes for this article
    if (!authenticityVotes[newsId]) {
        authenticityVotes[newsId] = { real: 0, fake: 0 };
    }
    
    // Update vote count
    authenticityVotes[newsId][vote]++;
    
    // Save to localStorage
    localStorage.setItem("authenticityVotes", JSON.stringify(authenticityVotes));
    
    // Update display
    const article = newsData.find(news => news.id === newsId);
    if (article) {
        const votes = authenticityVotes[newsId];
        const totalVotes = votes.real + votes.fake;
        
        // If more than half of users voted one way, update the display
        if (totalVotes >= 5) { // Minimum threshold of 5 votes
            const fakeRatio = votes.fake / totalVotes;
            if (fakeRatio > 0.5) {
                article.isFlagged = true;
                displayNews(); // Refresh the news display
            }
        }
        
        // Update the vote count display in the modal
        const voteDisplay = document.querySelector('.authenticity-section p');
        if (voteDisplay) {
            voteDisplay.textContent = `User Votes: ${votes.real} Real / ${votes.fake} Fake`;
        }
    }
}

// Add Gemini API integration for summarization
async function summarizeWithGemini(text) {
    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyCvYkB0N1LLSvVCI3eRyycCRpYhsLUjHEw', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Summarize this article in 2-3 sentences: ${text}`
                    }]
                }]
            })
        });

        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            return data.candidates[0].content.parts[0].text;
        }
        return "Unable to generate summary at this time.";
    } catch (error) {
        console.error('Error with Gemini API:', error);
        return "Unable to generate summary at this time.";
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    const loginLink = document.getElementById('loginLink');
    const welcomeMessage = document.getElementById('welcomeMessage');
    const userFirstName = document.getElementById('userFirstName');
    const logoutBtn = document.getElementById('logoutBtn');

    if (loggedInUser) {
        loginLink.style.display = 'none';
        welcomeMessage.style.display = 'flex';
        userFirstName.textContent = loggedInUser.firstName;
        
        // Add logout functionality
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('loggedInUser');
            localStorage.removeItem('favorites');
            window.location.href = 'login.html';
        });
    }
});

// Scroll to top functionality
const scrollToTopBtn = document.getElementById('scrollToTopBtn');

window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
        scrollToTopBtn.classList.add('show');
    } else {
        scrollToTopBtn.classList.remove('show');
    }
});

scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Add smooth scrolling for favorites link
document.addEventListener('DOMContentLoaded', function() {
    const favoritesLink = document.querySelector('a[href="#favoritesSection"]');
    favoritesLink.addEventListener('click', function(e) {
        e.preventDefault();
        const favoritesSection = document.getElementById('favoritesSection');
        const headerHeight = document.querySelector('.header').offsetHeight;
        const targetPosition = favoritesSection.offsetTop - headerHeight;
        
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    });
});