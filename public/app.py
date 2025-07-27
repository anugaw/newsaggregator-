from flask import Flask, request, jsonify
import google.generativeai as genai
import traceback

app = Flask(__name__)

# Configure with your API key
genai.configure(api_key="AIzaSyBVwLnLPButtUWUJlypGlaGRve1xyfWhkI")

@app.route('/check-news', methods=['POST'])
def check_news():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'status': 'error', 'message': 'No data provided'}), 400
            
        headline = data.get('headline', '')
        article = data.get('article', '')
        
        if not headline or not article:
            return jsonify({'status': 'error', 'message': 'Missing headline or article'}), 400

        prompt = f"""
        You are a fact-checking assistant. Your task is to determine the credibility of news articles.
        
        Please analyze the following news article and judge if it is:
        - "Likely True"
        - "Possibly Fake"
        - "Unclear"
        
        Use reasoning and well-known facts if needed. Your final answer should be one of the three options only.
        
        ---
        
        Headline: {headline}
        
        Article: {article}
        """
        
        # Get available models first to find the right one
        models = genai.list_models()
        # Filter for models that support content generation
        generation_models = [model for model in models if 'generateContent' in model.supported_generation_methods]
        
        if not generation_models:
            return jsonify({'status': 'error', 'message': 'No supported models available for content generation'}), 500
        
        # Use the first available model that supports content generation
        # This is more robust than hardcoding a specific model name
        model = genai.GenerativeModel(generation_models[0].name)
        
        # Generate content with proper error handling
        response = model.generate_content(prompt)
        
        # Extract text from response object
        if hasattr(response, 'text'):
            result = response.text.strip()
        else:
            # Handle the case where response doesn't have text attribute
            parts = response.parts
            result = ''.join(part.text for part in parts if hasattr(part, 'text'))
            result = result.strip()
        
        return jsonify({'status': 'success', 'result': result})
        
    except Exception as e:
        # Log the full error for debugging
        print(f"Error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/test', methods=['GET'])
def test():
    return jsonify({'status': 'success', 'message': 'API is working!'}), 200

@app.route('/list-models', methods=['GET'])
def list_models():
    try:
        models = genai.list_models()
        model_info = []
        
        for model in models:
            model_info.append({
                'name': model.name,
                'generation_methods': model.supported_generation_methods,
                'display_name': model.display_name
            })
            
        return jsonify({
            'status': 'success', 
            'models': model_info,
            'recommended': [m['name'] for m in model_info if 'generateContent' in m['generation_methods']]
        }), 200
        
    except Exception as e:
        print(f"Error listing models: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    # Print some debugging info on startup
    print("Starting Flask app with Google Generative AI...")
    print(f"Google Generative AI version: {genai.__version__}")
    try:
        models = genai.list_models()
        print(f"Found {len(models)} available models")
        for model in models:
            if 'generateContent' in model.supported_generation_methods:
                print(f" - {model.name} (supports content generation)")
    except Exception as e:
        print(f"Error checking models: {str(e)}")
    
    app.run(debug=True)