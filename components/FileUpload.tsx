
import React, { useCallback, useState } from 'react';

interface FileUploadProps {
  onVideoUpload: (file: File) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onVideoUpload }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onVideoUpload(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      onVideoUpload(file);
    }
  }, [onVideoUpload]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  return (
    <div className="w-full max-w-2xl text-center animate-fadeIn">
      <label
        htmlFor="video-upload"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        className={`flex flex-col items-center justify-center w-full h-80 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300
                    ${isDragging ? 'border-brand-pink bg-dark-surface' : 'border-dark-border bg-gray-900/50 hover:bg-dark-surface'}`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
           <svg className="w-12 h-12 mb-4 text-brand-teal" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
            </svg>
          <p className="mb-2 text-lg text-gray-400"><span className="font-semibold text-brand-pink">Click to upload</span> or drag and drop</p>
          <p className="text-sm text-gray-500">MP4, MOV, WEBM, or other video formats</p>
        </div>
        <input id="video-upload" type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
      </label>
    </div>
  );
};
