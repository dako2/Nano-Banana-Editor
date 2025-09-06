import { Type } from "@google/genai";

export const suggestionSchema = {
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

export const clipSuggestionSchema = {
    type: Type.OBJECT,
    properties: {
      startFrameIndex: {
        type: Type.INTEGER,
        description: 'The starting frame index for the 7-second clip (0-based).',
      },
      endFrameIndex: {
        type: Type.INTEGER,
        description: 'The ending frame index for the 7-second clip (0-based).',
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
    required: ['startFrameIndex', 'endFrameIndex', 'duration', 'reason', 'viralPotential', 'editingSuggestions'],
};
