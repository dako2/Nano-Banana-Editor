import React, { useState, useCallback, useEffect } from 'react';
import { FileUpload } from './components/VideoImport/FileUpload';
import { FrameGallery } from './components/FrameGallery';
import { AIControlPanel } from './components/AIControlPanel';
import { Header } from './components/Header';
import { LoadingOverlay } from './components/LoadingOverlay';
import { analyzeVideoFile, analyzeVideoForClips, editFrame, editFrameBootstrap, shouldContinueBootstrap } from './services/geminiService';
import type { Frame, AISuggestion, ClipSuggestion } from './types';
import { VideoTrimmer } from './components/VideoTrimming/VideoTrimmer';
import { VideoPreview } from './components/VideoPreview';
import { VideoProvider, useVideo } from './contexts/VideoContext';
import { calculatePixelSimilarity } from './utils/imageSimilarity';

const AppContent: React.FC = () => {
  const [selectedFileForTrimming, setSelectedFileForTrimming] = useState<File | null>(null);
  const [trimmedVideoFile, setTrimmedVideoFile] = useState<File | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [clipSuggestion, setClipSuggestion] = useState<ClipSuggestion | null>(null);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null);
  const [selectedFrameIndices, setSelectedFrameIndices] = useState<number[]>([]);
  const [bootstrapMode, setBootstrapMode] = useState<boolean>(false);
  const [isAutoBootstrapping, setIsAutoBootstrapping] = useState<boolean>(false);
  const [bootstrapProgress, setBootstrapProgress] = useState<{ current: number; total: number; reason?: string } | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    videoUrl,
    frames,
    isProcessing,
    loadAndProcessVideo,
    updateEditedFrame,
    clearVideoData,
    editedFrames,
    trimRange,
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
    setClipSuggestion(null);
    setSelectedFrameIndex(null);
    setSelectedFrameIndices([]);
    setErrorMessage(null);
    setOriginalFile(file);
    setSelectedFileForTrimming(file);
    setTrimmedVideoFile(null);
  }, [clearVideoData]);

  const handleTrimConfirm = useCallback(async (file: File, startTime: number, endTime: number) => {
    setSelectedFileForTrimming(null);
    setAiSuggestions([]);
    setClipSuggestion(null);
    setSelectedFrameIndex(null);
    setSelectedFrameIndices([]);
    setTrimmedVideoFile(file); // Keep the (potentially trimmed) file for upload
    await loadAndProcessVideo(file, 10, { startTime, endTime }); // High frame rate for smooth preview
  }, [loadAndProcessVideo]);

  const handleTrimCancel = useCallback(() => {
    setSelectedFileForTrimming(null);
  }, []);

  const handleAnalyzeVideo = useCallback(async () => {
    if (!trimmedVideoFile) {
      setErrorMessage("No video file available to analyze.");
      return;
    }
    if (!trimRange) { // Defensive check
      setErrorMessage("Video trim range is not set. Please re-process the video.");
      return;
    }
    setLoadingMessage('Uploading and analyzing video with Gemini...');
    setErrorMessage(null);
    try {
      // Send the actual video file for analysis, but specify the time range.
      const suggestions = await analyzeVideoFile(trimmedVideoFile, trimRange.start, trimRange.end);
      setAiSuggestions(suggestions);
    } catch (error) {
      console.error("Error analyzing video:", error);
      setErrorMessage("Failed to analyze video. Please check the console for details.");
    } finally {
      setLoadingMessage(null);
    }
  }, [trimmedVideoFile, trimRange]);

  const handleAnalyzeClips = useCallback(async () => {
    if (!trimmedVideoFile) {
      setErrorMessage("No video file available to analyze for clips.");
      return;
    }
    if (!trimRange) {
      setErrorMessage("Video trim range is not set. Please re-process the video.");
      return;
    }
    setLoadingMessage('Finding optimized viral clip...');
    setErrorMessage(null);
    try {
      const clipSuggestion = await analyzeVideoForClips(trimmedVideoFile, trimRange.start, trimRange.end);
      setClipSuggestion(clipSuggestion);
    } catch (error) {
      console.error("Error analyzing clips:", error);
      setErrorMessage("Failed to analyze clips. Please check the console for details.");
    } finally {
      setLoadingMessage(null);
    }
  }, [trimmedVideoFile, trimRange]);

  const handleUseClip = useCallback(async (startTime: number, endTime: number) => {
    if (!originalFile) {
      setErrorMessage("No original video file available to trim.");
      return;
    }
    
    // Calculate absolute time range based on current trim range
    const absoluteStartTime = (trimRange?.start || 0) + startTime;
    const absoluteEndTime = (trimRange?.start || 0) + endTime;
    
    setLoadingMessage('Trimming video to optimized clip...');
    setErrorMessage(null);
    
    try {
      // Clear current data and re-process with the new trim range
      setAiSuggestions([]);
      setClipSuggestion(null);
      setSelectedFrameIndex(null);
      setTrimmedVideoFile(originalFile);
      await loadAndProcessVideo(originalFile, 10, { startTime: absoluteStartTime, endTime: absoluteEndTime });
    } catch (error) {
      console.error("Error trimming video:", error);
      setErrorMessage("Failed to trim video. Please try again.");
    } finally {
      setLoadingMessage(null);
    }
  }, [originalFile, loadAndProcessVideo, trimRange]);

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

    if (bootstrapMode) {
        // Start automatic bootstrapping process
        await startAutoBootstrap(selectedFrameIndex, prompt);
        return;
    }

    setLoadingMessage('Editing frame with Nano Banana...');
    setErrorMessage(null);
    
    try {
        // Regular mode: use original frames as context
        const previousFrame = selectedFrameIndex > 0 ? frames[selectedFrameIndex - 1] : null;
        const nextFrame = selectedFrameIndex < frames.length - 1 ? frames[selectedFrameIndex + 1] : null;
        const editedFrameData = await editFrame(currentFrame, prompt, previousFrame, nextFrame);
        
        // Update the primary edited frame
        updateEditedFrame(selectedFrameIndex, { ...currentFrame, data: editedFrameData });
        
        // Propagate the edit to subsequent similar frames
        setLoadingMessage('Applying edit to similar frames...');
        const SIMILARITY_THRESHOLD = 0.95; // 95% similarity

        for (let i = selectedFrameIndex + 1; i < frames.length; i++) {
            const nextOriginalFrame = frames[i];
            // eslint-disable-next-line no-await-in-loop
            const similarity = await calculatePixelSimilarity(currentFrame.data, nextOriginalFrame.data);

            if (similarity >= SIMILARITY_THRESHOLD) {
                // This frame is similar enough, apply the same edit to it.
                updateEditedFrame(i, { ...nextOriginalFrame, data: editedFrameData });
            } else {
                // The scene has changed, stop propagating.
                break;
            }
        }

    } catch (error) {
        console.error("Error editing frame:", error);
        setErrorMessage("Failed to edit frame. Please check the console for details.");
    } finally {
        setLoadingMessage(null);
    }
  }, [selectedFrameIndex, frames, updateEditedFrame, bootstrapMode]);

  const startAutoBootstrap = useCallback(async (startFrameIndex: number, prompt: string) => {
    console.log('🚀 Starting auto-bootstrap process...', { startFrameIndex, prompt, totalFrames: frames.length });
    console.log('🔧 Setting isAutoBootstrapping to true...');
    setIsAutoBootstrapping(true);
    setBootstrapProgress({ current: 0, total: frames.length - startFrameIndex });
    
    try {
      let currentIndex = startFrameIndex;
      let editedPreviousFrame: Frame | null = null;
      let shouldContinue = true; // Use local variable instead of state
      
      console.log(`🔄 Starting loop: currentIndex=${currentIndex}, frames.length=${frames.length}`);
      
      while (currentIndex < frames.length && shouldContinue) {
        console.log(`📸 Processing frame ${currentIndex} of ${frames.length - 1}...`);
        console.log(`🔍 Loop condition check: currentIndex(${currentIndex}) < frames.length(${frames.length}) = ${currentIndex < frames.length}, isAutoBootstrapping=${isAutoBootstrapping}`);
        
        const currentFrame = frames[currentIndex];
        console.log(`📋 Current frame:`, currentFrame);
        setBootstrapProgress(prev => prev ? { ...prev, current: currentIndex - startFrameIndex + 1 } : null);
        
        let editedFrameData: string;
        
        if (currentIndex === startFrameIndex) {
          // First frame - use regular edit
          console.log('🎯 First frame - using regular edit mode');
          const previousFrame = currentIndex > 0 ? frames[currentIndex - 1] : null;
          const nextFrame = currentIndex < frames.length - 1 ? frames[currentIndex + 1] : null;
          editedFrameData = await editFrame(currentFrame, prompt, previousFrame, nextFrame);
          console.log('✅ First frame edited successfully');
        } else {
          // Subsequent frames - use bootstrap edit
          console.log('🔄 Bootstrap frame - using edited previous frame as reference');
          if (!editedPreviousFrame) {
            throw new Error("No edited previous frame available for bootstrap");
          }
          
          // Check if we should continue bootstrapping
          console.log('🤔 Checking if we should continue bootstrapping...');
          const nextFrame = currentIndex < frames.length - 1 ? frames[currentIndex + 1] : null;
          console.log(`🔍 Next frame available: ${!!nextFrame}, currentIndex: ${currentIndex}, frames.length: ${frames.length}`);
          
          const decision = await shouldContinueBootstrap(currentFrame, editedPreviousFrame, nextFrame, prompt);
          console.log('📋 Bootstrap decision:', decision);
          
          if (decision.decision === 'STOP') {
            console.log('🛑 Bootstrap stopped by AI decision:', decision.reason);
            setBootstrapProgress(prev => prev ? { ...prev, reason: decision.reason } : null);
            setLoadingMessage(`Bootstrap stopped: ${decision.reason}`);
            shouldContinue = false;
            break;
          }
          
          console.log('✅ Continuing bootstrap - editing frame with previous frame reference');
          editedFrameData = await editFrameBootstrap(currentFrame, prompt, editedPreviousFrame, nextFrame);
          console.log('✅ Bootstrap frame edited successfully');
        }
        
        // Create the edited frame
        const newEditedFrame: Frame = {
          id: currentFrame.id,
          data: editedFrameData,
          mimeType: currentFrame.mimeType
        };
        
        // Update edited frames
        console.log(`💾 Updating edited frame ${currentIndex}...`);
        updateEditedFrame(currentIndex, newEditedFrame);
        
        // Set as the edited previous frame for next iteration
        editedPreviousFrame = newEditedFrame;
        currentIndex++;
        
        console.log(`⏳ Waiting 500ms before next frame...`);
        // Small delay to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check if we have more frames to process
        if (currentIndex >= frames.length) {
          console.log('🏁 Reached end of frames, stopping auto-bootstrap');
          shouldContinue = false;
        }
      }
      
      const totalEdited = currentIndex - startFrameIndex;
      console.log(`🎉 Auto-bootstrap completed! Edited ${totalEdited} frames.`);
      setLoadingMessage(`Auto-bootstrap completed! Edited ${totalEdited} frames.`);
    } catch (error) {
      console.error("❌ Error in auto-bootstrap:", error);
      setErrorMessage("Auto-bootstrap failed. Please check the console for details.");
    } finally {
      console.log('🏁 Auto-bootstrap process finished');
      setIsAutoBootstrapping(false);
      setBootstrapProgress(null);
      setLoadingMessage(null);
    }
  }, [frames, updateEditedFrame, isAutoBootstrapping]);

  const stopAutoBootstrap = useCallback(() => {
    console.log('🛑 Stopping auto-bootstrap...');
    setIsAutoBootstrapping(false);
    setBootstrapProgress(null);
    setLoadingMessage(null);
  }, []);

  const handleFrameSelect = useCallback((index: number, isShiftClick: boolean = false) => {
    if (isShiftClick) {
      // Multi-select with Shift+click
      setSelectedFrameIndices(prev => {
        if (prev.includes(index)) {
          // Remove if already selected
          return prev.filter(i => i !== index);
        } else {
          // Add to selection
          return [...prev, index];
        }
      });
    } else {
      // Single select - clear multi-selection
      setSelectedFrameIndex(index);
      setSelectedFrameIndices([index]);
    }
  }, []);

  const handleBatchEdit = useCallback(async (prompt: string, frameIndices: number[]) => {
    if (frameIndices.length === 0) {
      setErrorMessage("No frames selected for batch editing.");
      return;
    }

    setLoadingMessage(`Editing ${frameIndices.length} frames with Nano Banana...`);
    setErrorMessage(null);
    
    try {
      // Process frames in parallel for better performance
      const editPromises = frameIndices.map(async (frameIndex) => {
        const currentFrame = frames[frameIndex];
        if (!currentFrame) return null;

        // Get adjacent frames for context
        const previousFrame = frameIndex > 0 ? frames[frameIndex - 1] : null;
        const nextFrame = frameIndex < frames.length - 1 ? frames[frameIndex + 1] : null;

        const editedFrameData = await editFrame(currentFrame, prompt, previousFrame, nextFrame);
        return { index: frameIndex, data: editedFrameData };
      });

      const results = await Promise.all(editPromises);
      
      // Update all edited frames
      results.forEach(result => {
        if (result) {
          const originalFrame = frames[result.index];
          updateEditedFrame(result.index, { ...originalFrame, data: result.data });
        }
      });

    } catch (error) {
      console.error("Error batch editing frames:", error);
      setErrorMessage("Failed to batch edit frames. Please check the console for details.");
    } finally {
      setLoadingMessage(null);
    }
  }, [frames, updateEditedFrame]);
  
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
                selectedFrameIndices={selectedFrameIndices}
                onFrameSelect={handleFrameSelect}
              />
            </div>

            {/* Right/Bottom Section: AI Controls */}
            <div className="lg:col-span-4 h-full">
              <AIControlPanel
                onAnalyze={handleAnalyzeVideo}
                onEdit={handleEditFrame}
                onBatchEdit={handleBatchEdit}
                onAnalyzeClips={handleAnalyzeClips}
                onUseClip={handleUseClip}
                suggestions={aiSuggestions}
                clipSuggestion={clipSuggestion}
                selectedFrame={selectedFrameIndex !== null ? frames[selectedFrameIndex] : null}
                selectedFrameIndices={selectedFrameIndices}
                bootstrapMode={bootstrapMode}
                onBootstrapToggle={setBootstrapMode}
                isAutoBootstrapping={isAutoBootstrapping}
                bootstrapProgress={bootstrapProgress}
                onStopBootstrap={stopAutoBootstrap}
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