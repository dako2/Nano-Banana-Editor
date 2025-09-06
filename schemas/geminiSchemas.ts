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

export const clipSuggestionSchema = {
    type: Type.OBJECT,
    properties: {
      startTime: {
        type: Type.NUMBER,
        description: 'The starting time in seconds for the 7-second clip (relative to the analyzed video segment).',
      },
      endTime: {
        type: Type.NUMBER,
        description: 'The ending time in seconds for the 7-second clip (relative to the analyzed video segment).',
      },
      duration: {
        type: Type.NUMBER,
        description: 'The duration of the clip in seconds (should be approximately 7 seconds).',
      },
      reason: {
        type: Type.STRING,
        description: 'Explanation of why this specific 7-second sequence was chosen for viral potential.',
      },
      viralPotential: {
        type: Type.STRING,
        enum: ['low', 'medium', 'high'],
        description: 'Assessment of the viral potential of this clip.',
      },
      editingSuggestions: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
        },
        description: 'Specific editing suggestions to enhance the viral potential of this clip.',
      },
    },
    required: ['startTime', 'endTime', 'duration', 'reason', 'viralPotential', 'editingSuggestions'],
};