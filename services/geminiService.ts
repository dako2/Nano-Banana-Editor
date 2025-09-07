import type { AISuggestion, Frame, ClipSuggestion } from '../types';
import { geminiClient } from './geminiClient';
import { promptService } from './promptService';
import { suggestionSchema, clipSuggestionSchema } from '../schemas/geminiSchemas';
import { base64ToPart, fileToPart } from '../utils/apiUtils';

/**
 * Contains application-specific logic for interacting with the Gemini API
 * through the reusable geminiClient.
 */

/**
 * Analyzes a video file to generate editing suggestions.
 * @param videoFile The video file to analyze.
 * @param startTime The start time of the clip to analyze.
 * @param endTime The end time of the clip to analyze.
 * @returns A promise that resolves to an array of AISuggestions.
 */
export const analyzeVideoFile = async (videoFile: File, startTime: number, endTime: number): Promise<AISuggestion[]> => {
    const prompt = await promptService.get('analyzeVideo', {
      startTime: startTime.toFixed(2),
      endTime: endTime.toFixed(2),
    });
    const videoPart = await fileToPart(videoFile);

    const response = await geminiClient.generateJson(
        "gemini-2.5-flash",
        prompt,
        [videoPart],
        suggestionSchema // Enforce the schema for reliable JSON output
    );

    // Defensively clean the response in case the model still includes markdown
    let jsonText = response.text.trim();
    const match = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
        jsonText = match[1];
    }

    const suggestions = JSON.parse(jsonText);
    return suggestions as AISuggestion[];
}

/**
 * Analyzes a video file to identify the best 7-second clip for viral content.
 * @param videoFile The video file to analyze.
 * @param startTime The start time of the clip to analyze.
 * @param endTime The end time of the clip to analyze.
 * @returns A promise that resolves to a ClipSuggestion.
 */
export const analyzeVideoForClips = async (videoFile: File, startTime: number, endTime: number): Promise<ClipSuggestion> => {
    const prompt = await promptService.get('sevenSecondShorts', {
      startTime: startTime.toFixed(2),
      endTime: endTime.toFixed(2),
    });
    const videoPart = await fileToPart(videoFile);

    const response = await geminiClient.generateJson(
        "gemini-2.5-flash",
        prompt,
        [videoPart],
        clipSuggestionSchema
    );

    let jsonText = response.text.trim();
    const match = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
        jsonText = match[1];
    }

    const clipSuggestion = JSON.parse(jsonText);
    return clipSuggestion as ClipSuggestion;
}


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
    console.log('🎨 Editing frame with regular mode...', { 
        currentFrameId: currentFrame.id, 
        hasPreviousFrame: !!previousFrame,
        hasNextFrame: !!nextFrame,
        prompt 
    });

    const parts: any[] = [];
    
    const fullPrompt = await promptService.get('editFrame', { prompt });
    console.log('📝 Edit frame prompt:', fullPrompt);
    
    // Order of parts is important for context: [previous], current, [next], prompt
    if (previousFrame) {
        parts.push(base64ToPart(previousFrame.data));
    }
    
    parts.push(base64ToPart(currentFrame.data));
    
    if (nextFrame) {
        parts.push(base64ToPart(nextFrame.data));
    }

    parts.push({ text: fullPrompt });

    console.log('📤 Sending edit request to Gemini...');
    const response = await geminiClient.generateImage(
        'gemini-2.5-flash-image-preview',
        parts
    );
    
    console.log('📥 Received edit response from Gemini');
    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const newBase64Data = part.inlineData.data;
            console.log('✅ Frame edited successfully');
            return `data:${part.inlineData.mimeType};base64,${newBase64Data}`;
        }
    }
    console.error('❌ No image was returned from the edit request');
    throw new Error("No image was returned from the edit request.");
};

/**
 * Edits a frame using bootstrapping mode - uses the edited previous frame as reference.
 * @param currentFrame The frame to be edited.
 * @param prompt The user's editing instruction.
 * @param editedPreviousFrame The already edited previous frame to use as reference.
 * @param nextFrame Optional context frame from after the current one.
 * @returns A promise that resolves to the base64 data URL of the edited image.
 */
export const editFrameBootstrap = async (
    currentFrame: Frame, 
    prompt: string, 
    editedPreviousFrame: Frame,
    nextFrame?: Frame | null
): Promise<string> => {

    const parts: any[] = [];
    
    const fullPrompt = await promptService.get('editFrameBootstrap', { prompt });
    
    // Order of parts: edited previous frame (as reference), current frame, [next], prompt
    parts.push(base64ToPart(editedPreviousFrame.data));
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
    throw new Error("No image was returned from the bootstrap edit request.");
};

/**
 * Makes a decision about whether to continue bootstrapping edits.
 * @param currentFrame The current frame to analyze.
 * @param editedPreviousFrame The edited previous frame for context.
 * @param nextFrame Optional next frame for additional context.
 * @param prompt The edit prompt being applied.
 * @returns A promise that resolves to 'CONTINUE' or 'STOP' with a reason.
 */
export const shouldContinueBootstrap = async (
    currentFrame: Frame,
    editedPreviousFrame: Frame,
    nextFrame: Frame | null,
    prompt: string
): Promise<{ decision: 'CONTINUE' | 'STOP'; reason: string }> => {
    console.log('🤖 Making bootstrap decision...', { 
        currentFrameId: currentFrame.id, 
        editedPreviousFrameId: editedPreviousFrame.id,
        hasNextFrame: !!nextFrame,
        prompt 
    });
    
    const parts: any[] = [];
    
    const fullPrompt = await promptService.get('bootstrapDecision', { prompt });
    console.log('📝 Bootstrap decision prompt:', fullPrompt);
    
    // Add context frames
    parts.push(base64ToPart(editedPreviousFrame.data));
    parts.push(base64ToPart(currentFrame.data));
    if (nextFrame) {
        parts.push(base64ToPart(nextFrame.data));
    }
    parts.push({ text: fullPrompt });

    console.log('📤 Sending bootstrap decision request to Gemini...');
    const response = await geminiClient.generateJson(
        'gemini-2.5-flash',
        parts[parts.length - 1].text, // The prompt is the last part
        parts.slice(0, -1) // All parts except the text prompt
    );

    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('📥 Bootstrap decision response:', responseText);
    
    const lines = responseText.trim().split('\n');
    const firstLine = lines[0].trim().toUpperCase();
    
    if (firstLine.startsWith('CONTINUE')) {
        const reason = lines.slice(1).join(' ').trim() || 'Scene content is consistent enough to continue';
        console.log('✅ Bootstrap decision: CONTINUE -', reason);
        return { 
            decision: 'CONTINUE', 
            reason 
        };
    } else if (firstLine.startsWith('STOP')) {
        const reason = lines.slice(1).join(' ').trim() || 'Scene has changed significantly';
        console.log('🛑 Bootstrap decision: STOP -', reason);
        return { 
            decision: 'STOP', 
            reason 
        };
    } else {
        // Default to STOP if unclear
        console.log('❓ Bootstrap decision: UNCLEAR, defaulting to STOP');
        return { 
            decision: 'STOP', 
            reason: 'Unclear decision, defaulting to stop' 
        };
    }
};