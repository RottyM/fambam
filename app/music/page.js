'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { FaMusic, FaTimes } from 'react-icons/fa';
import { useMusicJams } from '@/hooks/useMusicJams';
import JamCard from '@/components/JamCard';
import AddJamModal from '@/components/AddJamModal';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

// Helper function to extract YouTube ID (same as in recipes)
const getYouTubeId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

function MusicContent() {
  const { theme, currentTheme } = useTheme();
  const { jams, loading, addJam, deleteJam } = useMusicJams();
  const [showAddModal, setShowAddModal] = useState(false);
  
  // State for the YouTube video modal
  const [videoToPlay, setVideoToPlay] = useState(null);

  const handlePlayVideo = (url) => {
    const videoId = getYouTubeId(url);
    if (videoId) {
      setVideoToPlay(videoId);
    } else {
      toast.error("Invalid YouTube URL");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🎸</div>
          <p className="text-xl font-bold text-purple-600">Loading jams...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display font-bold mb-2">
            <span className={currentTheme === 'dark' ? 'text-purple-400' : 'gradient-text'}>
              Family Jams
            </span> 🎸
          </h1>
          <p className={`${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'} font-semibold`}>
            Share your favorite tunes of the week!
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-2xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg flex items-center gap-2"
        >
          <FaMusic /> <span className="hidden md:inline">Post a Jam</span>
        </button>
      </div>

      {jams.length === 0 ? (
        <div className={`${theme.colors.bgCard} rounded-2xl p-12 text-center shadow-lg`}>
          <div className="text-6xl mb-4">🎧</div>
          <p className={`text-xl font-bold ${theme.colors.textMuted}`}>No jams posted yet</p>
          <p className={theme.colors.textMuted}>Be the first to share a song!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {jams.map((jam) => (
              <motion.div
                key={jam.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                layout
              >
                {/* Pass the handlePlayVideo function to the card */}
                <JamCard jam={jam} onDelete={deleteJam} onPlayVideo={handlePlayVideo} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AddJamModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddJam={addJam}
      />

      {/* YouTube Video Modal */}
      <AnimatePresence>
        {videoToPlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setVideoToPlay(null)}
            className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-black rounded-2xl overflow-hidden shadow-2xl w-full max-w-4xl relative aspect-video"
            >
              <button
                onClick={() => setVideoToPlay(null)}
                className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/50 rounded-full p-2 z-10 transition-colors"
              >
                <FaTimes size={24} />
              </button>
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${videoToPlay}?autoplay=1&rel=0`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0"
              ></iframe>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function MusicPage() {
  return (
    <DashboardLayout>
      <MusicContent />
    </DashboardLayout>
  );
}