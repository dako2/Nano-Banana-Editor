
import { GoogleGenAI, GenerateContentResponse, Type, Modality } from "@google/genai";
import type { AISuggestion } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const suggestionSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        frameIndex: {
          type: Type.INTEGER,
          description: 'The index of the frame in the provided array that this suggestion applies to.',
        },
        suggestion: {
          type: Type.STRING,
          description: 'A creative and actionable editing suggestion for this frame. e.g., "Add celebratory confetti" or "Overlay text: \'Unbelievable!\'"',
        },
      },
      required: ['frameIndex', 'suggestion'],
    },
};

const base64ToPart = (data: string) => {
    const mimeType = data.substring(5, data.indexOf(';'));
    const base64Data = data.substring(data.indexOf(',') + 1);
    return {
        inlineData: {
            mimeType,
            data: base64Data,
        }
    };
};

export const analyzeVideoFrames = async (frames: string[]): Promise<AISuggestion[]> => {
    const prompt = `You are a creative video editor's assistant. Analyze these video frames and provide suggestions for edits that would make a short video clip more engaging for marketing. Identify key moments or objects. Provide a list of suggestions in JSON format according to the schema. The frameIndex should correspond to the input array of frames.`;
    
    const imageParts = frames.map(base64ToPart);

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: prompt }, ...imageParts] },
            config: {
                responseMimeType: "application/json",
                responseSchema: suggestionSchema
            },
        });

        const jsonText = response.text.trim();
        const suggestions = JSON.parse(jsonText);
        return suggestions as AISuggestion[];
    } catch (error) {
        console.error("Error analyzing video frames:", error);
        throw new Error("Gemini API call for analysis failed.");
    }
};

export const editFrame = async (base64ImageData: string, mimeType: string, prompt: string): Promise<string> => {
    const base64Data = base64ImageData.substring(base64ImageData.indexOf(',') + 1);

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64Data,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: prompt,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const newBase64Data = part.inlineData.data;
                return `data:${part.inlineData.mimeType};base64,${newBase64Data}`;
            }
        }
        throw new Error("No image was returned from the edit request.");
    } catch (error) {
        console.error("Error editing frame:", error);
        throw new Error("Gemini API call for frame editing failed.");
    }
};
