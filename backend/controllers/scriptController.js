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

    const prompt = `Create an educational dialogue between two characters named Nina and Jay discussing "${topic}". 
    They should have a natural, conversational explanation that helps listeners understand the topic thoroughly. 
    Nina is knowledgeable but explains things in simple terms, while Jay asks clarifying questions and offers insights.
    
    The dialogue should:
    - Be informative and educational about "${topic}"
    - Include analogies or examples to explain complex concepts
    - Have a natural conversational flow with back-and-forth exchanges 
    - Be approximately 300-500 words in total
    - End with a clear summary or takeaway about the topic
    
    Format the response as a JSON array of objects, where each object has a 'speaker' property (either "Nina" or "Jay")
    and a 'text' property containing their line of dialogue.
    
    Example format:
    [
      { "speaker": "Nina", "text": "So, let me explain how garbage collection works in Java." },
      { "speaker": "Jay", "text": "I've heard the term, but I'm not really sure what it does exactly." },
      { "speaker": "Nina", "text": "It's basically an automatic memory management system that identifies and removes objects that aren't being used anymore." }
    ]
    
    Only respond with the properly formatted JSON array.
    ONLY 3 DIALOGS SHORT SHORT. NO MORE THAN 3 DIALOGS NOT EXCEEDING 10WORDS PER DIALOG.`;

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
