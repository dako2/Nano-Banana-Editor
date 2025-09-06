import React, { useState, useEffect, useRef } from 'react';

// Helper to format seconds to MM:SS
const formatTime = (time: number) => {
  if (isNaN(time)) return '00:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

interface VideoTrimmerProps {
  file: File;
  onConfirm: (file: File, startTime: number, endTime: number) => void;
  onCancel: () => void;
}

export const VideoTrimmer: React.FC<VideoTrimmerProps> = ({ file, onConfirm, onCancel }) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleMetadataLoaded = () => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration;
      setDuration(videoDuration);
      setEndTime(videoDuration);
    }
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = parseFloat(e.target.value);
    if (newStart < endTime) {
      setStartTime(newStart);
      if (videoRef.current) videoRef.current.currentTime = newStart;
    }
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = parseFloat(e.target.value);
    if (newEnd > startTime) {
      setEndTime(newEnd);
      if (videoRef.current) videoRef.current.currentTime = newEnd;
    }
  };
  
  const progressPercent = (duration > 0) ? (endTime - startTime) / duration * 100 : 0;
  const startPercent = (duration > 0) ? (startTime / duration) * 100 : 0;

  return (
    <div className="w-full max-w-4xl bg-dark-surface rounded-lg shadow-lg p-6 border border-dark-border animate-fadeIn flex flex-col items-center">
      <h2 className="text-2xl font-display text-brand-teal mb-4">Trim Your Video</h2>
      <p className="text-gray-400 mb-6">Select a clip or use the full video to continue.</p>
      
      <div className="w-full aspect-video bg-black rounded-md overflow-hidden mb-6">
        {videoUrl && (
          <video
            ref={videoRef}
            src={videoUrl}
            onLoadedMetadata={handleMetadataLoaded}
            controls
            className="w-full h-full"
          />
        )}
      </div>

      <div className="w-full px-2">
        <div className="relative h-12 flex items-center">
            <div className="absolute w-full h-2 bg-gray-600 rounded-full"></div>
            <div 
                className="absolute h-2 bg-brand-pink rounded-full"
                style={{
                    left: `${startPercent}%`,
                    width: `${progressPercent}%`,
                }}
            ></div>
            <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={startTime}
                onChange={handleStartTimeChange}
                className="absolute w-full h-2 appearance-none bg-transparent pointer-events-auto range-thumb"
                aria-label="Start Time"
            />
            <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={endTime}
                onChange={handleEndTimeChange}
                className="absolute w-full h-2 appearance-none bg-transparent pointer-events-auto range-thumb"
                aria-label="End Time"
            />
        </div>

        <div className="flex justify-between text-sm font-mono mt-2 text-gray-300">
            <span>Start: <span className="text-brand-teal">{formatTime(startTime)}</span></span>
            <span>End: <span className="text-brand-teal">{formatTime(endTime)}</span></span>
        </div>
      </div>
        
      <style>{`
        .range-thumb::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          background-color: #db2777;
          border: 2px solid white;
          border-radius: 50%;
          cursor: pointer;
          margin-top: -10px;
          pointer-events: all;
          position: relative;
          z-index: 10;
        }
        .range-thumb::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background-color: #db2777;
          border: 2px solid white;
          border-radius: 50%;
          cursor: pointer;
          pointer-events: all;
          position: relative;
          z-index: 10;
        }
      `}</style>

      <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full sm:w-auto">
        <button
          onClick={onCancel}
          className="w-full sm:w-auto px-6 py-2 border border-dark-border rounded-md text-gray-300 hover:bg-dark-border transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onConfirm(file, 0, duration)}
          className="w-full sm:w-auto px-6 py-2 bg-brand-purple rounded-md text-white font-semibold hover:bg-purple-700 transition-colors"
        >
          Use Full Video
        </button>
        <button
          onClick={() => onConfirm(file, startTime, endTime)}
          disabled={endTime - startTime <= 0}
          className="w-full sm:w-auto px-6 py-2 bg-brand-pink rounded-md text-white font-bold hover:bg-pink-600 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          Use Clip ({formatTime(endTime - startTime)})
        </button>
      </div>

    </div>
  );
};