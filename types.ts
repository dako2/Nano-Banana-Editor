
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
  startFrameIndex: number;
  endFrameIndex: number;
  duration: number; // in seconds
  reason: string;
  viralPotential: 'low' | 'medium' | 'high';
  editingSuggestions: string[];
}
