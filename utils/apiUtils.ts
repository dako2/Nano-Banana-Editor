/**
 * Converts a base64 data URL into an object suitable for the Gemini API's `inlineData` part.
 * @param data The base64 data URL string (e.g., "data:image/jpeg;base64,...").
 * @returns An object with `inlineData` containing the mimeType and base64 data.
 */
export const base64ToPart = (data: string) => {
    const mimeType = data.substring(5, data.indexOf(';'));
    const base64Data = data.substring(data.indexOf(',') + 1);
    return {
        inlineData: {
            mimeType,
            data: base64Data,
        }
    };
};
