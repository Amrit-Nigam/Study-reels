import axios from 'axios';

/**
 * Interface for the dialogue line format
 */
export interface DialogueLine {
  speaker: string;
  text: string;
}

/**
 * Generates a script directly using the Gemini API
 * @param topic The topic to generate a script about
 * @param apiKey The Gemini API key
 * @returns The generated dialogue as an array of dialogue lines
 */
export const generateScriptWithGemini = async (
  topic: string,
  apiKey: string
): Promise<DialogueLine[]> => {
  try {
    const response = await axios({
      url: `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`,
      method: "post",
      data: {
        contents: [
          {
            parts: [
              {
                text: `Generate a short, casual dialogue between two characters named Nina and Jay about "${topic}". 
                Format the response as a JSON array of objects, where each object has a 'speaker' property (either "Nina" or "Jay") 
                and a 'text' property containing their line of dialogue. Keep the entire dialogue under 200 words total, 
                with each individual line under 20 words for natural conversation flow. Make the dialogue funny and engaging.
                
                Example format:
                [
                  { "speaker": "Nina", "text": "Did you know Pikachu's cheeks store electricity?" },
                  { "speaker": "Jay", "text": "Whoa! That explains the sparks!" }
                ]`
              },
            ],
          },
        ],
      },
    });

    // Extract the text from the response
    const textResponse = response.data.candidates[0].content.parts[0].text;
    
    // Extract the JSON content from the response
    const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from Gemini response');
    }
    
    const jsonString = jsonMatch[0];
    return JSON.parse(jsonString);
  } catch (error: any) {
    console.error('Error generating script with Gemini:', error);
    throw new Error(error.response?.data?.error?.message || error.message || 'Failed to generate script');
  }
};
