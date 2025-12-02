'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';
import { format } from 'date-fns';

export default function MemorySpotlight({ spotlightMemory }) {
  const { currentTheme } = useTheme();

  if (!spotlightMemory) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className={`bg-white dark:bg-gray-800 rounded-2xl md:rounded-3xl overflow-hidden shadow-xl border ${currentTheme === 'dark' ? 'border-purple-900/50' : 'border-purple-100'}`}
    >
      <Link href="/memories" className="block group">
        <div className="relative h-64 md:h-80">
          {spotlightMemory.mimeType?.startsWith('video/') ? (
            <video
              src={spotlightMemory.downloadURL}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              muted
              loop
              playsInline
            />
          ) : (
            <Image
              src={spotlightMemory.downloadURL}
              alt="Memory spotlight"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              priority
            />
          )}

          {/* Time Capsule Badge */}
          {spotlightMemory.isTimeCapsule && (
            <div className={`absolute top-3 right-3 ${currentTheme === 'dark' ? 'bg-purple-600' : 'bg-purple-500'} text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg animate-pulse`}>
              {currentTheme === 'dark' ? '⏳' : '⏳'} {currentTheme === 'dark' ? 'Coffin Unsealed!' : 'Time Capsule Revealed!'}
            </div>
          )}

          {/* Caption Overlay (if exists) */}
          {spotlightMemory.caption && (
            <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent p-4">
              <p className="text-white text-sm line-clamp-2">
                {spotlightMemory.caption}
              </p>
            </div>
          )}

          {/* Bottom Info - Icon and Date */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="flex items-center justify-between">
              <span className="text-3xl">
                {spotlightMemory.isTimeCapsule
                  ? (currentTheme === 'dark' ? '⚰️' : '⏱️')
                  : (currentTheme === 'dark' ? '🕯️' : '📸')}
              </span>
              <p className="text-white font-semibold text-sm">
                {spotlightMemory.uploadedAt?.toDate
                  ? format(spotlightMemory.uploadedAt.toDate(), 'MMM d, yyyy')
                  : 'Recently'}
              </p>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
