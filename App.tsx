import React, { useState, useCallback, useEffect } from 'react';
import { FileUpload } from './components/VideoImport/FileUpload';
import { FrameGallery } from './components/FrameGallery';
import { AIControlPanel } from './components/AIControlPanel';
import { Header } from './components/Header';
import { LoadingOverlay } from './components/LoadingOverlay';
import { analyzeVideoFrames, editFrame } from './services/geminiService';
import type { Frame, AISuggestion } from './types';
import { VideoTrimmer } from './components/VideoTrimming/VideoTrimmer';
import { VideoPreview } from './components/VideoPreview';
import { VideoProvider, useVideo } from './contexts/VideoContext';

const AppContent: React.FC = () => {
  const [selectedFileForTrimming, setSelectedFileForTrimming] = useState<File | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    videoUrl,
    frames,
    isProcessing,
    loadAndProcessVideo,
    updateEditedFrame,
    clearVideoData,
    editedFrames
  } = useVideo();

  useEffect(() => {
    if (isProcessing) {
      setLoadingMessage('Extracting frames from video...');
    } else if (loadingMessage === 'Extracting frames from video...') {
      setLoadingMessage(null);
    }
  }, [isProcessing, loadingMessage]);

  const handleFileSelect = useCallback((file: File) => {
    clearVideoData();
    setAiSuggestions([]);
    setSelectedFrameIndex(null);
    setErrorMessage(null);
    setSelectedFileForTrimming(file);
  }, [clearVideoData]);

  const handleTrimConfirm = useCallback(async (file: File, startTime: number, endTime: number) => {
    setSelectedFileForTrimming(null);
    setAiSuggestions([]);
    setSelectedFrameIndex(null);
    await loadAndProcessVideo(file, 1, { startTime, endTime });
  }, [loadAndProcessVideo]);

  const handleTrimCancel = useCallback(() => {
    setSelectedFileForTrimming(null);
  }, []);

  const handleAnalyzeVideo = useCallback(async () => {
    if (frames.length === 0) {
      setErrorMessage("No frames to analyze. Please upload a video first.");
      return;
    }
    setLoadingMessage('Analyzing video with Gemini...');
    setErrorMessage(null);
    try {
      // Send a subset of frames to avoid being too large
      const framesToAnalyze = frames.filter((_, i) => i % 5 === 0);
      const suggestions = await analyzeVideoFrames(framesToAnalyze.map(f => f.data));
      setAiSuggestions(suggestions);
    } catch (error) {
      console.error("Error analyzing video:", error);
      setErrorMessage("Failed to analyze video. Please check the console for details.");
    } finally {
      setLoadingMessage(null);
    }
  }, [frames]);

  const handleEditFrame = useCallback(async (prompt: string) => {
    if (selectedFrameIndex === null) {
        setErrorMessage("Please select a frame to edit.");
        return;
    }
    const currentFrame = frames[selectedFrameIndex];
    if (!currentFrame) {
        setErrorMessage("Selected frame not found.");
        return;
    }

    // Get adjacent frames for context
    const previousFrame = selectedFrameIndex > 0 ? frames[selectedFrameIndex - 1] : null;
    const nextFrame = selectedFrameIndex < frames.length - 1 ? frames[selectedFrameIndex + 1] : null;

    setLoadingMessage('Editing frame with Nano Banana...');
    setErrorMessage(null);
    try {
        const editedFrameData = await editFrame(currentFrame, prompt, previousFrame, nextFrame);
        
        updateEditedFrame(selectedFrameIndex, { ...currentFrame, data: editedFrameData });

    } catch (error) {
        console.error("Error editing frame:", error);
        setErrorMessage("Failed to edit frame. Please check the console for details.");
    } finally {
        setLoadingMessage(null);
    }
  }, [selectedFrameIndex, frames, updateEditedFrame]);
  
  const isLoading = !!loadingMessage || isProcessing;
  const hasVideo = !!videoUrl;

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col">
      <Header />
      {isLoading && <LoadingOverlay message={loadingMessage || "Processing..."} />}
      <main className="flex-grow p-4 md:p-8 flex flex-col items-center justify-center">
        {selectedFileForTrimming ? (
          <VideoTrimmer 
            file={selectedFileForTrimming} 
            onConfirm={handleTrimConfirm}
            onCancel={handleTrimCancel}
          />
        ) : !hasVideo ? (
          <FileUpload onFileSelect={handleFileSelect} setErrorMessage={setErrorMessage} />
        ) : (
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
            {/* Left/Top Section: Video Player & Frame Gallery */}
            <div className="lg:col-span-8 flex flex-col gap-6 h-full">
              <div className="bg-dark-surface rounded-lg shadow-lg p-4 border border-dark-border">
                <h2 className="text-xl font-display text-brand-teal mb-4">Video Preview</h2>
                <VideoPreview />
              </div>
              <FrameGallery
                selectedFrameIndex={selectedFrameIndex}
                onFrameSelect={setSelectedFrameIndex}
              />
            </div>

            {/* Right/Bottom Section: AI Controls */}
            <div className="lg:col-span-4 h-full">
              <AIControlPanel
                onAnalyze={handleAnalyzeVideo}
                onEdit={handleEditFrame}
                suggestions={aiSuggestions}
                selectedFrame={selectedFrameIndex !== null ? frames[selectedFrameIndex] : null}
              />
            </div>
          </div>
        )}
        {errorMessage && (
          <div className="fixed bottom-4 right-4 bg-red-800 text-white p-4 rounded-lg shadow-lg animate-fadeIn">
            <p className="font-bold">Error</p>
            <p>{errorMessage}</p>
          </div>
        )}
      </main>
    </div>
  );
};

const App: React.FC = () => (
  <VideoProvider>
    <AppContent />
  </VideoProvider>
);

export default App;