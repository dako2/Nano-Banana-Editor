import type { AISuggestion, Frame } from '../types';
import { geminiClient } from './geminiClient';
import { promptService } from './promptService';
import { suggestionSchema } from '../schemas/geminiSchemas';
import { base64ToPart } from '../utils/apiUtils';

/**
 * Contains application-specific logic for interacting with the Gemini API
 * through the reusable geminiClient.
 */

/**
 * Analyzes video frames to generate editing suggestions.
 * @param frames An array of base64 encoded frame data.
 * @returns A promise that resolves to an array of AISuggestions.
 */
export const analyzeVideoFrames = async (frames: string[]): Promise<AISuggestion[]> => {
    const prompt = promptService.get('analyzeVideo');
    
    const imageParts = frames.map(base64ToPart);

    const response = await geminiClient.generateJson(
        "gemini-2.5-flash",
        prompt,
        imageParts,
        suggestionSchema
    );

    const jsonText = response.text.trim();
    const suggestions = JSON.parse(jsonText);
    return suggestions as AISuggestion[];
};

/**
 * Edits a single frame based on a text prompt and surrounding frame context.
 * @param currentFrame The frame to be edited.
 * @param prompt The user's editing instruction.
 * @param previousFrame Optional context frame from before the current one.
 * @param nextFrame Optional context frame from after the current one.
 * @returns A promise that resolves to the base64 data URL of the edited image.
 */
export const editFrame = async (
    currentFrame: Frame, 
    prompt: string, 
    previousFrame?: Frame | null, 
    nextFrame?: Frame | null
): Promise<string> => {

    const parts: any[] = [];
    
    const fullPrompt = promptService.get('editFrame', { prompt });
    
    // Order of parts is important for context: [previous], current, [next], prompt
    if (previousFrame) {
        parts.push(base64ToPart(previousFrame.data));
    }
    
    parts.push(base64ToPart(currentFrame.data));
    
    if (nextFrame) {
        parts.push(base64ToPart(nextFrame.data));
    }

    parts.push({ text: fullPrompt });

    const response = await geminiClient.generateImage(
        'gemini-2.5-flash-image-preview',
        parts
    );
    
    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const newBase64Data = part.inlineData.data;
            return `data:${part.inlineData.mimeType};base64,${newBase64Data}`;
        }
    }
    throw new Error("No image was returned from the edit request.");
};