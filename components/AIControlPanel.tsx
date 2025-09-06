import React, { useState } from 'react';
import type { AISuggestion, Frame } from '../types';
import { useVideo } from '../contexts/VideoContext';

interface AIControlPanelProps {
  onAnalyze: () => void;
  onEdit: (prompt: string) => void;
  onBatchEdit: (prompt: string, frameIndices: number[]) => void;
  suggestions: AISuggestion[];
  selectedFrame: Frame | null;
  selectedFrameIndices: number[];
}

const EditSection: React.FC<{ 
    selectedFrame: Frame | null; 
    selectedFrameIndices: number[];
    onEdit: (prompt: string) => void;
    onBatchEdit: (prompt: string, frameIndices: number[]) => void;
}> = ({ selectedFrame, selectedFrameIndices, onEdit, onBatchEdit }) => {
    const [prompt, setPrompt] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(prompt.trim()) {
            if (selectedFrameIndices.length > 1) {
                onBatchEdit(prompt, selectedFrameIndices);
            } else {
                onEdit(prompt);
            }
        }
    };

    const hasMultipleSelection = selectedFrameIndices.length > 1;
    const hasSelection = selectedFrame || hasMultipleSelection;
    
    return (
        <div className="mt-6 p-4 border border-dark-border rounded-lg bg-gray-900/50">
            <h3 className="text-lg font-display text-brand-pink mb-3">
                {hasMultipleSelection 
                    ? `Edit ${selectedFrameIndices.length} Frames` 
                    : `Edit Frame ${selectedFrame ? `#${selectedFrame.id + 1}` : ''}`
                }
            </h3>
            {hasMultipleSelection && (
                <div className="mb-3 p-2 bg-brand-teal/20 border border-brand-teal/30 rounded text-sm">
                    <span className="text-brand-teal font-semibold">Multi-selection:</span>
                    <span className="text-gray-300 ml-1">
                        Frames {selectedFrameIndices.map(i => i + 1).join(', ')}
                    </span>
                </div>
            )}
            {hasSelection ? (
                <form onSubmit={handleSubmit}>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., 'Add sunglasses to the person' or 'make the sky purple'"
                        className="w-full h-24 p-2 bg-dark-surface border border-dark-border rounded-md focus:ring-2 focus:ring-brand-pink focus:outline-none transition-shadow"
                    />
                    <button 
                        type="submit"
                        disabled={!prompt.trim()}
                        className="mt-3 w-full bg-brand-pink text-white font-bold py-2 px-4 rounded-md hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-bg focus:ring-brand-pink transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">
                        {hasMultipleSelection ? `Generate Edit for ${selectedFrameIndices.length} Frames` : 'Generate Edit'}
                    </button>
                </form>
            ) : (
                <p className="text-gray-400 italic">Select frame(s) from the gallery to start editing. Hold Shift to select multiple frames.</p>
            )}
        </div>
    );
};


export const AIControlPanel: React.FC<AIControlPanelProps> = ({ onAnalyze, onEdit, onBatchEdit, suggestions, selectedFrame, selectedFrameIndices }) => {
    const [hasAnalyzed, setHasAnalyzed] = useState(false);
    const { frames } = useVideo();
    const hasFrames = frames.length > 0;

    const handleAnalyzeClick = () => {
        onAnalyze();
        setHasAnalyzed(true);
    };

    return (
        <div className="bg-dark-surface rounded-lg shadow-lg p-6 border border-dark-border h-full flex flex-col animate-fadeIn">
            <h2 className="text-2xl font-display text-brand-teal mb-4">AI Assistant</h2>
            
            <button
                onClick={handleAnalyzeClick}
                disabled={!hasFrames || hasAnalyzed}
                className="w-full bg-brand-purple text-white font-bold py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-bg focus:ring-brand-purple transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
                {hasAnalyzed ? 'Analysis Complete' : 'Analyze Video with Gemini'}
            </button>
            
            <div className="mt-6 flex-grow overflow-y-auto">
                <h3 className="text-lg font-display text-brand-teal mb-2">Suggestions</h3>
                {suggestions.length > 0 ? (
                    <ul className="space-y-3">
                        {suggestions.map((s, i) => (
                            <li key={i} className="p-3 bg-gray-900/50 border-l-4 border-brand-teal rounded-r-md text-sm">
                                <span className="font-bold text-gray-300">Time {s.frameIndex.toFixed(1)}s:</span>
                                <p className="text-gray-400">{s.suggestion}</p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500 italic text-sm">
                        {hasAnalyzed ? 'No specific suggestions were generated.' : 'Click "Analyze Video" to get AI-powered editing ideas.'}
                    </p>
                )}
            </div>

            <EditSection 
                selectedFrame={selectedFrame} 
                selectedFrameIndices={selectedFrameIndices}
                onEdit={onEdit} 
                onBatchEdit={onBatchEdit}
            />
        </div>
    );
};