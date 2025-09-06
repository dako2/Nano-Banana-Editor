
export interface Frame {
  id: number;
  data: string; // base64 encoded image data
  mimeType: string;
}

export interface AISuggestion {
  frameIndex: number;
  suggestion: string;
}

export interface ClipSuggestion {
  startTime: number; // Time in seconds (using time-based approach)
  endTime: number; // Time in seconds
  duration: number; // Duration in seconds
  reason: string;
  viralPotential: 'low' | 'medium' | 'high';
  editingSuggestions: string[];
}
