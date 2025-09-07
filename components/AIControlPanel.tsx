import React, { useState, useEffect } from 'react';
import type { AISuggestion, Frame, ClipSuggestion } from '../types';
import { useVideo } from '../contexts/VideoContext';
import { promptService } from '../services/promptService';

interface AIControlPanelProps {
  onAnalyze: () => void;
  onEdit: (prompt: string) => void;
  onBatchEdit: (prompt: string, frameIndices: number[]) => void;
  onAnalyzeClips: () => void;
  onUseClip?: (startTime: number, endTime: number) => void;
  suggestions: AISuggestion[];
  clipSuggestion: ClipSuggestion | null;
  selectedFrame: Frame | null;
  selectedFrameIndices: number[];
  bootstrapMode: boolean;
  onBootstrapToggle: (enabled: boolean) => void;
  isAutoBootstrapping?: boolean;
  bootstrapProgress?: { current: number; total: number; reason?: string } | null;
  onStopBootstrap?: () => void;
}

const SystemPromptEditor: React.FC = () => {
  const [prompts, setPrompts] = useState<Record<string, string>>({});
  const [isOpen, setIsOpen] = useState(false);
  const [activePrompt, setActivePrompt] = useState<string>('editFrame');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const data = await promptService.getAllPrompts();
      setPrompts(data);
    } catch (error) {
      console.error('Failed to load prompts:', error);
    }
  };

  const savePrompts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/save-prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompts }),
      });

      if (response.ok) {
        // Update the promptService cache
        promptService.updatePrompts(prompts);
        alert('Prompts saved successfully!');
      } else {
        throw new Error('Failed to save prompts');
      }
    } catch (error) {
      console.error('Failed to save prompts:', error);
      // Fallback: save to localStorage and update cache
      localStorage.setItem('customPrompts', JSON.stringify(prompts));
      promptService.updatePrompts(prompts);
      alert('Prompts saved to local storage! (Backend endpoint not available)');
    } finally {
      setIsLoading(false);
    }
  };

  const updatePrompt = (key: string, value: string) => {
    setPrompts(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const promptOptions = [
    { key: 'editFrame', label: 'Frame Edit Prompt' },
    { key: 'editFrameBootstrap', label: 'Bootstrap Edit Prompt' },
    { key: 'analyzeVideo', label: 'Video Analysis Prompt' }
  ];

  return (
    <div className="mt-6 p-4 border border-dark-border rounded-lg bg-gray-900/50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-display text-brand-teal">System Prompts</h3>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-sm text-brand-pink hover:text-pink-400 transition-colors"
        >
          {isOpen ? 'Hide' : 'Edit Prompts'}
        </button>
      </div>
      
      {isOpen && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Prompt to Edit:
            </label>
            <select
              value={activePrompt}
              onChange={(e) => setActivePrompt(e.target.value)}
              className="w-full p-2 bg-dark-surface border border-dark-border rounded-md text-white focus:ring-2 focus:ring-brand-teal focus:outline-none"
            >
              {promptOptions.map(option => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Prompt Content:
            </label>
            <textarea
              value={prompts[activePrompt] || ''}
              onChange={(e) => updatePrompt(activePrompt, e.target.value)}
              className="w-full h-32 p-2 bg-dark-surface border border-dark-border rounded-md text-white focus:ring-2 focus:ring-brand-teal focus:outline-none resize-none"
              placeholder="Enter your system prompt here..."
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={savePrompts}
              disabled={isLoading}
              className="flex-1 bg-brand-teal text-white font-semibold py-2 px-4 rounded-md hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-bg focus:ring-brand-teal transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save Prompt'}
            </button>
            <button
              onClick={loadPrompts}
              className="flex-1 bg-gray-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-bg focus:ring-gray-500 transition-colors"
            >
              Reset
            </button>
          </div>
          
          <div className="text-xs text-gray-400 bg-gray-800/50 p-2 rounded">
            <strong>Note:</strong> This editor allows you to customize the AI's behavior. 
            Changes will affect how the AI interprets and processes your edit requests.
          </div>
        </div>
      )}
    </div>
  );
};

const BootstrapProgress: React.FC<{
    progress: { current: number; total: number; reason?: string } | null;
    onStop: () => void;
}> = ({ progress, onStop }) => {
    if (!progress) return null;

    const percentage = (progress.current / progress.total) * 100;

    return (
        <div className="mt-4 p-3 bg-blue-900/30 border border-blue-600 rounded-lg">
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-blue-300">Auto-Bootstrap Progress</h4>
                <button
                    onClick={onStop}
                    className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded transition-colors"
                >
                    Stop
                </button>
            </div>
            
            <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            
            <div className="text-xs text-gray-300">
                Frame {progress.current} of {progress.total} ({percentage.toFixed(1)}%)
            </div>
            
            {progress.reason && (
                <div className="text-xs text-gray-400 mt-1">
                    <strong>Reason:</strong> {progress.reason}
                </div>
            )}
        </div>
    );
};

const EditSection: React.FC<{ 
    selectedFrame: Frame | null; 
    selectedFrameIndices: number[];
    onEdit: (prompt: string) => void;
    onBatchEdit: (prompt: string, frameIndices: number[]) => void;
    bootstrapMode: boolean;
    onBootstrapToggle: (enabled: boolean) => void;
    isAutoBootstrapping?: boolean;
    bootstrapProgress?: { current: number; total: number; reason?: string } | null;
    onStopBootstrap?: () => void;
}> = ({ selectedFrame, selectedFrameIndices, onEdit, onBatchEdit, bootstrapMode, onBootstrapToggle, isAutoBootstrapping, bootstrapProgress, onStopBootstrap }) => {
    const [prompt, setPrompt] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (prompt.trim()) {
            if (selectedFrameIndices.length > 1) {
                onBatchEdit(prompt, selectedFrameIndices);
            } else {
                onEdit(prompt);
            }
            setPrompt('');
        }
    };

    return (
        <div className="mt-6 p-4 border border-dark-border rounded-lg bg-gray-900/50">
            <h3 className="text-lg font-display text-brand-teal mb-3">
                {selectedFrameIndices.length > 1 
                    ? `Edit ${selectedFrameIndices.length} Selected Frames` 
                    : selectedFrame 
                        ? `Edit Frame ${selectedFrame.id}` 
                        : 'Select a Frame to Edit'
                }
            </h3>
            
            {/* Bootstrap Mode Toggle */}
            <div className="mb-3 p-2 bg-gray-800/50 border border-gray-600 rounded text-sm">
                <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={bootstrapMode}
                        onChange={(e) => onBootstrapToggle(e.target.checked)}
                        disabled={isAutoBootstrapping}
                        className="w-4 h-4 text-brand-pink bg-gray-700 border-gray-600 rounded focus:ring-brand-pink focus:ring-2 disabled:opacity-50"
                    />
                    <span className="text-gray-300">
                        <span className="font-semibold text-brand-teal">Auto-Bootstrap Mode:</span> Automatically continue edits until AI decides to stop
                    </span>
                </label>
                {bootstrapMode && (
                    <p className="text-xs text-gray-400 mt-1">
                        The AI will automatically continue editing subsequent frames using the previous edited frame as reference, stopping when the scene changes significantly.
                    </p>
                )}
            </div>

            {/* Bootstrap Progress */}
            {isAutoBootstrapping && bootstrapProgress && onStopBootstrap && (
                <BootstrapProgress progress={bootstrapProgress} onStop={onStopBootstrap} />
            )}
            
            <form onSubmit={handleSubmit} className="space-y-3">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={isAutoBootstrapping ? "Auto-bootstrapping in progress..." : "Describe the edit you want to make..."}
                    disabled={isAutoBootstrapping}
                    className="w-full p-3 bg-dark-surface border border-dark-border rounded-md text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-teal focus:outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                    rows={3}
                />
                <button
                    type="submit"
                    disabled={!prompt.trim() || (!selectedFrame && selectedFrameIndices.length === 0) || isAutoBootstrapping}
                    className="w-full bg-brand-purple text-white font-bold py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-bg focus:ring-brand-purple transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                    {isAutoBootstrapping 
                        ? 'Auto-Bootstrapping...' 
                        : selectedFrameIndices.length > 1 
                            ? 'Apply to Selected Frames' 
                            : bootstrapMode 
                                ? 'Start Auto-Bootstrap' 
                                : 'Apply Edit'
                    }
                </button>
            </form>
        </div>
    );
};

const ClipAnalysisSection: React.FC<{ 
    clipSuggestion: ClipSuggestion | null; 
    onAnalyzeClips: () => void; 
    onUseClip?: (startTime: number, endTime: number) => void 
}> = ({ clipSuggestion, onAnalyzeClips, onUseClip }) => {
    const [hasAnalyzedClips, setHasAnalyzedClips] = useState(false);
    const { frames } = useVideo();
    const hasFrames = frames.length > 0;

    const handleAnalyzeClipsClick = () => {
        onAnalyzeClips();
        setHasAnalyzedClips(true);
    };

    const getViralPotentialColor = (potential: string) => {
        switch (potential) {
            case 'high': return 'text-green-400';
            case 'medium': return 'text-yellow-400';
            case 'low': return 'text-red-400';
            default: return 'text-gray-400';
        }
    };

    return (
        <div className="mt-6 p-4 border border-dark-border rounded-lg bg-gray-900/50">
            <h3 className="text-lg font-display text-brand-pink mb-3">Optimized Clips</h3>
            
            <button
                onClick={handleAnalyzeClipsClick}
                disabled={!hasFrames || hasAnalyzedClips}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-2 px-4 rounded-md hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-bg focus:ring-brand-pink transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
                {hasAnalyzedClips ? 'Clip Analysis Complete' : 'Find Optimized Viral Clip'}
            </button>

            {clipSuggestion && (
                <div className="mt-4 space-y-3">
                    <div className="p-3 bg-gray-800/50 rounded-md">
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-gray-300">Viral Potential:</span>
                            <span className={`font-bold ${getViralPotentialColor(clipSuggestion.viralPotential)}`}>
                                {clipSuggestion.viralPotential.toUpperCase()}
                            </span>
                        </div>
                        <div className="text-sm text-gray-400 mb-2">
                            <span className="font-semibold">Duration:</span> {clipSuggestion.duration.toFixed(1)}s
                        </div>
                        <div className="text-sm text-gray-400 mb-2">
                            <span className="font-semibold">Time Range:</span> {clipSuggestion.startTime.toFixed(1)}s - {clipSuggestion.endTime.toFixed(1)}s
                        </div>
                        <p className="text-sm text-gray-300 mb-3">{clipSuggestion.reason}</p>
                        
                        <div className="space-y-2">
                            <h4 className="font-semibold text-gray-300 text-sm">Editing Suggestions:</h4>
                            <ul className="space-y-1">
                                {clipSuggestion.editingSuggestions.map((suggestion, index) => (
                                    <li key={index} className="text-xs text-gray-400 bg-gray-700/30 p-2 rounded">
                                        • {suggestion}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        
                        {onUseClip && (
                            <button
                                onClick={() => onUseClip(clipSuggestion.startTime, clipSuggestion.endTime)}
                                className="w-full mt-3 bg-gradient-to-r from-green-600 to-teal-600 text-white font-bold py-2 px-4 rounded-md hover:from-green-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-bg focus:ring-green-500 transition-colors"
                            >
                                Use This Optimized Clip
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const AIControlPanel: React.FC<AIControlPanelProps> = ({ 
    onAnalyze, 
    onEdit, 
    onBatchEdit,
    onAnalyzeClips, 
    onUseClip, 
    suggestions, 
    clipSuggestion, 
    selectedFrame,
    selectedFrameIndices,
    bootstrapMode,
    onBootstrapToggle,
    isAutoBootstrapping,
    bootstrapProgress,
    onStopBootstrap
}) => {
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
                    <div className="space-y-3">
                        {suggestions.map((suggestion, index) => (
                            <div key={index} className="p-3 bg-gray-800/50 border border-gray-600 rounded-md">
                                <div className="text-sm text-gray-400 mb-1">Frame {suggestion.frameIndex}</div>
                                <p className="text-gray-300 text-sm">{suggestion.suggestion}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-400 text-sm">
                        {hasAnalyzed ? 'No specific suggestions were generated.' : 'Click "Analyze Video" to get AI-powered editing ideas.'}
                    </p>
                )}
            </div>

            <ClipAnalysisSection 
                clipSuggestion={clipSuggestion} 
                onAnalyzeClips={onAnalyzeClips} 
                onUseClip={onUseClip} 
            />
            <EditSection 
                selectedFrame={selectedFrame} 
                selectedFrameIndices={selectedFrameIndices}
                onEdit={onEdit} 
                onBatchEdit={onBatchEdit}
                bootstrapMode={bootstrapMode}
                onBootstrapToggle={onBootstrapToggle}
                isAutoBootstrapping={isAutoBootstrapping}
                bootstrapProgress={bootstrapProgress}
                onStopBootstrap={onStopBootstrap}
            />
            
            <SystemPromptEditor />
        </div>
    );
};