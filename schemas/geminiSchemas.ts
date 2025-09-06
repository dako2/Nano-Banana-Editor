import { Type } from "@google/genai";

export const suggestionSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        frameIndex: {
          type: Type.NUMBER,
          description: 'The time in seconds, relative to the start of the clip, where the suggestion applies. Can be a float.',
        },
        suggestion: {
          type: Type.STRING,
          description: 'A creative and actionable editing suggestion for this frame. e.g., "Add celebratory confetti" or "Overlay text: \'Unbelievable!\'"',
        },
      },
      required: ['frameIndex', 'suggestion'],
    },
};