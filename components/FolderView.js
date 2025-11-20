'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { FaTimes, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import Image from 'next/image';
import UserAvatar from './UserAvatar';
import { format } from 'date-fns';

export default function FolderView({ isOpen, onClose, memories, initialIndex, getMemberById }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % memories.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + memories.length) % memories.length);
  };

  const handlers = useSwipeable({
    onSwipedLeft: handleNext,
    onSwipedRight: handlePrev,
    preventScrollOnSwipe: true,
    trackMouse: true,
  });

  if (!isOpen || memories.length === 0) {
    return null;
  }

  const currentMemory = memories[currentIndex];
  const uploader = getMemberById(currentMemory.uploadedBy);
  const isVideo = currentMemory.mimeType?.startsWith('video/');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          {...handlers}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/10 text-white p-3 rounded-full hover:bg-white/20 transition-all z-20"
          >
            <FaTimes />
          </button>

          {/* Main Content */}
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            {/* Image/Video */}
            <div className="relative w-full h-4/5">
              {isVideo ? (
                <video
                  src={currentMemory.downloadURL}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              ) : (
                <Image
                  src={currentMemory.downloadURL}
                  alt={currentMemory.caption || 'Memory'}
                  fill
                  className="object-contain"
                  unoptimized
                />
              )}
            </div>

            {/* Details */}
            <div className="w-full max-w-3xl p-4 text-white text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                {uploader && <UserAvatar user={uploader} size={32} />}
                <p className="font-bold text-lg">{uploader?.displayName}</p>
              </div>
              <p className="text-gray-300">
                {currentMemory.caption || 'No caption'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {currentMemory.uploadedAt?.toDate?.()
                  ? format(currentMemory.uploadedAt.toDate(), 'MMMM d, yyyy')
                  : 'Recently'}
              </p>
            </div>
          </div>

          {/* Prev/Next Buttons */}
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 text-white p-4 rounded-full hover:bg-white/20 transition-all z-20"
          >
            <FaChevronLeft />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 text-white p-4 rounded-full hover:bg-white/20 transition-all z-20"
          >
            <FaChevronRight />
          </button>

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
            {currentIndex + 1} / {memories.length}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
