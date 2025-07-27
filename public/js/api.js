const GEMINI_API_KEY = 'your_api_key';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

async function fetchFullArticleContent(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Get all paragraph elements
        const paragraphs = Array.from(doc.getElementsByTagName('p'));
        
        // Filter out navigation, ads, and other non-content paragraphs
        const contentParagraphs = paragraphs.filter(p => {
            const text = p.textContent.trim();
            return text.length > 50 && 
                   !p.closest('nav') && 
                   !p.closest('header') && 
                   !p.closest('footer') && 
                   !p.closest('aside') &&
                   !p.closest('.advertisement') &&
                   !p.closest('.social-share') &&
                   !p.closest('.related-articles');
        });
        
        // Join the paragraphs to create the full content
        return contentParagraphs.map(p => p.textContent.trim()).join('\n\n');
    } catch (error) {
        console.error('Error fetching full article:', error);
        return null;
    }
}

async function generateSummaryWithGemini(title, content) {
    try {
        const prompt = `Please provide a comprehensive summary of this article. Focus on the main points, key findings, and important details. The summary should give readers a complete understanding of the article's content without reading the full text. Make it informative and well-structured.

Title: ${title}

Content: ${content}

Please ensure the summary:
1. Captures the main message and key points
2. Includes important facts and figures
3. Maintains proper context
4. Is well-structured and easy to understand
5. Provides a complete overview of the article`;

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
                    maxOutputTokens: 1024,
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            return data.candidates[0].content.parts[0].text;
        } else {
            throw new Error('No summary generated');
        }
    } catch (error) {
        console.error('Error generating summary:', error);
        return null;
    }
} 
