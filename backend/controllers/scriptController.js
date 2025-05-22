import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Check if API key is available
if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not defined in environment variables');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const generateScript = async (req, res) => {
  try {
    const { topic } = req.body;    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }
    
    console.log(`Generating script for topic: ${topic}`);
    
    // Try with gemini-pro first (most widely available model)
    const modelName = 'gemini-2.0-flash';
    console.log(`Using ${modelName} model`);
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `Generate a short, casual dialogue between two characters named Nina and Jay about "${topic}". 
    Format the response as a JSON array of objects, where each object has a 'speaker' property (either "Nina" or "Jay") 
    and a 'text' property containing their line of dialogue. Keep the entire dialogue under 200 words total, 
    with each individual line under 20 words for natural conversation flow. Make the dialogue funny and engaging.
    
    Example format:
    [
      { "speaker": "Nina", "text": "Did you know Pikachu's cheeks store electricity?" },
      { "speaker": "Jay", "text": "Whoa! That explains the sparks!" }
    ]`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const textResponse = response.text();

    // Extract the JSON content from the response
    const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      console.error('Failed to parse JSON from Gemini response:', textResponse);
      return res.status(500).json({ error: 'Failed to generate proper dialogue format' });
    }
    
    const jsonString = jsonMatch[0];
    const dialogue = JSON.parse(jsonString);

    return res.status(200).json({ 
      success: true, 
      dialogue,
      message: 'Script generated successfully' 
    });
  } catch (error) {
    console.error('Error generating script:', error);
    
    // Check if this is a rate limit error
    const isRateLimit = error.message && (
      error.message.includes('429') || 
      error.message.includes('quota') || 
      error.message.includes('rate limit')
    );
    
    return res.status(500).json({ 
      error: 'Failed to generate script', 
      details: error.message,
      isRateLimit: isRateLimit,
      suggestion: isRateLimit ? 
        "You've hit the Gemini API rate limit. Please try again later or check your Google AI Studio API quota." : 
        "Please check your API key or try again later."
    });
  }
};
