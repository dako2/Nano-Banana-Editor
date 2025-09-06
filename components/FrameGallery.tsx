import React from 'react';
import type { Frame } from '../types';
import { useVideo } from '../contexts/VideoContext';

interface FrameGalleryProps {
  selectedFrameIndex: number | null;
  onFrameSelect: (index: number) => void;
}

export const FrameGallery: React.FC<FrameGalleryProps> = ({ selectedFrameIndex, onFrameSelect }) => {
  const { frames, editedFrames } = useVideo();

  if (frames.length === 0) {
    return null;
  }

  return (
    <div className="bg-dark-surface rounded-lg shadow-lg p-4 border border-dark-border animate-fadeIn">
      <h2 className="text-xl font-display text-brand-teal mb-4">Extracted Frames</h2>
      <div className="flex overflow-x-auto space-x-3 pb-4">
        {frames.map((frame, index) => {
          const displayFrame = editedFrames.get(index) || frame;
          const isSelected = selectedFrameIndex === index;
          return (
            <div
              key={frame.id}
              onClick={() => onFrameSelect(index)}
              className={`relative flex-shrink-0 w-32 h-20 rounded-md cursor-pointer transition-all duration-200 group overflow-hidden
                         ${isSelected ? 'ring-4 ring-brand-pink' : 'ring-2 ring-transparent hover:ring-brand-teal'}`}
            >
              <img src={displayFrame.data} alt={`Frame ${index + 1}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black bg-opacity-30 group-hover:bg-opacity-10 transition-opacity"></div>
              <span className="absolute bottom-1 right-1 text-xs bg-black bg-opacity-60 text-white px-1.5 py-0.5 rounded">
                {index + 1}
              </span>
              {editedFrames.has(index) && (
                <span className="absolute top-1 left-1 text-xs bg-brand-purple bg-opacity-80 text-white px-1.5 py-0.5 rounded font-bold">
                  EDITED
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
