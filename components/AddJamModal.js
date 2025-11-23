'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaMusic, FaSpotify, FaYoutube, FaLink } from 'react-icons/fa';
import { useTheme } from '@/contexts/ThemeContext';

export default function AddJamModal({ isOpen, onClose, onAddJam }) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    link: '',
    note: ''
  });

  // Helper to determine link type
  const getLinkType = (link) => {
    if (link.includes('spotify.com')) return 'spotify';
    if (link.includes('youtube.com') || link.includes('youtu.be')) return 'youtube';
    return 'other';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.artist.trim() || !formData.link.trim()) return;

    setLoading(true);
    try {
      const type = getLinkType(formData.link);
      await onAddJam({ ...formData, type });
      setFormData({ title: '', artist: '', link: '', note: '' }); // Reset form
      onClose(); // Close modal
    } catch (error) {
      // Error handled by hook
    } finally {
      setLoading(false);
    }
  };

  // Dynamic icon for the link input
  const LinkIcon = getLinkType(formData.link) === 'spotify' ? FaSpotify :
                   getLinkType(formData.link) === 'youtube' ? FaYoutube : FaLink;
  
  const linkColor = getLinkType(formData.link) === 'spotify' ? 'text-green-500' :
                    getLinkType(formData.link) === 'youtube' ? 'text-red-500' : 'text-gray-400';


  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className={`${theme.colors.bgCard} rounded-3xl p-6 max-w-md w-full shadow-2xl`}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold gradient-text flex items-center gap-2">
                <FaMusic /> Post a Jam
              </h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <FaTimes size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Song Title */}
              <div>
                <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>Song Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                  placeholder="e.g., Bohemian Rhapsody"
                />
              </div>

              {/* Artist */}
              <div>
                <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>Artist</label>
                <input
                  type="text"
                  required
                  value={formData.artist}
                  onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                  placeholder="e.g., Queen"
                />
              </div>

              {/* Link */}
              <div>
                <label className={`block text-sm font-bold ${theme.colors.text} mb-2 flex items-center gap-2`}>
                  <LinkIcon className={linkColor} /> Link (Spotify or YouTube)
                </label>
                <input
                  type="url"
                  required
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:${linkColor.replace('text', 'border')} focus:outline-none`}
                  placeholder="Paste link here..."
                />
              </div>

              {/* Note (Optional) */}
              <div>
                <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>Note (Optional)</label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none"
                  rows={3}
                  placeholder="Why do you love this song?"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Posting...' : <><FaMusic /> Post Jam</>}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}