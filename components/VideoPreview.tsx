import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { Frame } from '../types';

interface VideoPreviewProps {
  videoUrl: string;
  editedFrames: Map<number, Frame>;
  trimRange: { start: number; end: number } | null;
}

// --- SVG Icons for Controls ---

const PlayIcon: React.FC = () => (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
);
const PauseIcon: React.FC = () => (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>
);
const VolumeHighIcon: React.FC = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></svg>
);
const VolumeMutedIcon: React.FC = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"></path></svg>
);
const FullscreenEnterIcon: React.FC = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 0h-4m4 0l-5-5"></path>
  </svg>
);
const FullscreenExitIcon: React.FC = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19v-4m0 0h4M15 15l5 5M5 5v4m0 0H9m-4 0l5-5m10 0v4m0 0h-4m4 0l-5-5M5 19v-4m0 0h4m-4 0l5 5"></path>
  </svg>
);

const formatTime = (timeInSeconds: number) => {
    const time = Math.max(0, timeInSeconds);
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const VideoPreview: React.FC<VideoPreviewProps> = ({ videoUrl, editedFrames, trimRange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const preloadedImages = useRef<Map<number, HTMLImageElement>>(new Map());

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(trimRange?.start ?? 0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const trimStart = trimRange?.start ?? 0;
  const trimEnd = trimRange?.end ?? videoDuration;
  const clipDuration = trimEnd - trimStart;
  
  // Pre-load edited frame images for faster rendering.
  useEffect(() => {
    editedFrames.forEach((frame, index) => {
      if (preloadedImages.current.get(index)?.src !== frame.data) {
        const img = new Image();
        img.src = frame.data;
        preloadedImages.current.set(index, img);
      }
    });
  }, [editedFrames]);

  // Main rendering loop for the canvas overlay
  const renderLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const currentFrameIndex = Math.floor((video.currentTime - trimStart) * 1);
    const editedFrameImage = preloadedImages.current.get(currentFrameIndex);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (editedFrameImage?.complete && editedFrameImage.naturalHeight !== 0) {
      ctx.drawImage(editedFrameImage, 0, 0, canvas.width, canvas.height);
    }
    animationFrameId.current = requestAnimationFrame(renderLoop);
  }, [trimStart]);
  
  // Setup video event listeners to sync state with custom controls
  useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handleTimeUpdate = () => {
          if (video.currentTime >= trimEnd) {
              video.pause();
              setCurrentTime(trimEnd);
          } else {
              setCurrentTime(video.currentTime);
          }
      };
      const handleLoadedData = () => {
          setVideoDuration(video.duration);
          if (video.currentTime < trimStart) {
              video.currentTime = trimStart;
          }
          setCurrentTime(video.currentTime);
          canvasRef.current!.width = video.videoWidth;
          canvasRef.current!.height = video.videoHeight;
      };
      const handlePlay = () => {
        setIsPlaying(true);
        animationFrameId.current = requestAnimationFrame(renderLoop);
      };
      const handlePause = () => {
        setIsPlaying(false);
        if(animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      };
      const handleVolumeChange = () => {
          setVolume(video.volume);
          setIsMuted(video.muted);
      };
      
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('loadeddata', handleLoadedData);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      video.addEventListener('volumechange', handleVolumeChange);
      
      handleVolumeChange();
      if (video.readyState >= 2) handleLoadedData();

      return () => {
          video.removeEventListener('timeupdate', handleTimeUpdate);
          video.removeEventListener('loadeddata', handleLoadedData);
          video.removeEventListener('play', handlePlay);
          video.removeEventListener('pause', handlePause);
          video.removeEventListener('volumechange', handleVolumeChange);
          if(animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      };
  }, [trimStart, trimEnd, renderLoop]);
  
  // Fullscreen management
  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // --- Control Handlers ---
  const handlePlayPauseToggle = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
        if(video.currentTime >= trimEnd) {
            video.currentTime = trimStart;
        }
        video.play();
    } else {
        video.pause();
    }
  }, [trimStart, trimEnd]);
  
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };
  
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    video.muted = newVolume === 0;
  };
  
  const handleMuteToggle = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  };
  
  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
        containerRef.current?.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full aspect-video bg-black rounded-md group overflow-hidden">
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full rounded-md"
        crossOrigin="anonymous"
        playsInline
        onClick={handlePlayPauseToggle}
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full rounded-md pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

      {/* Custom Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col gap-1">
        <input
            type="range"
            min={trimStart}
            max={trimEnd}
            step="any"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer range-slider"
        />
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
                <button onClick={handlePlayPauseToggle} className="p-1">{isPlaying ? <PauseIcon /> : <PlayIcon />}</button>
                <div className="flex items-center gap-2 group/volume">
                  <button onClick={handleMuteToggle}>{isMuted || volume === 0 ? <VolumeMutedIcon /> : <VolumeHighIcon />}</button>
                  <input type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="w-0 group-hover/volume:w-20 transition-all duration-300 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer range-slider"/>
                </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-xs sm:text-sm font-mono">{formatTime(currentTime - trimStart)} / {formatTime(clipDuration)}</span>
                <button onClick={handleFullscreenToggle} className="p-1">{isFullscreen ? <FullscreenExitIcon /> : <FullscreenEnterIcon />}</button>
            </div>
        </div>
      </div>
      <style>{`
        .range-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 14px; height: 14px;
          background-color: #db2777;
          border-radius: 50%; cursor: pointer;
        }
        .range-slider::-moz-range-thumb {
          width: 14px; height: 14px;
          background-color: #db2777;
          border-radius: 50%; cursor: pointer;
        }
      `}</style>
    </div>
  );
};