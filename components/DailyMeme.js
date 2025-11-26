'use client';

import { useDailyMeme } from '@/hooks/useFirestore';
import { useTheme } from '@/contexts/ThemeContext';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import toast from 'react-hot-toast';
import { useState } from 'react';

export default function DailyMeme() {
  const { meme, loading } = useDailyMeme();
  const { theme, currentTheme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const fetchMeme = httpsCallable(functions, 'fetchDailyMemeManual');
      const result = await fetchMeme();
      console.log('Meme fetch result:', result);
      toast.success('New meme loaded! 🎉');
    } catch (error) {
      console.error('Meme fetch error:', error);
      toast.error(`Failed to fetch meme: ${error.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-gradient-to-br ${currentTheme === 'dark' ? 'from-purple-900 via-pink-900 to-indigo-900' : 'from-pink-400 via-purple-400 to-blue-500'} p-6 rounded-3xl shadow-2xl animate-pulse`}>
        <div className={`h-48 ${currentTheme === 'dark' ? 'bg-gray-800/30' : 'bg-white/30'} rounded-2xl`}></div>
      </div>
    );
  }

  if (!meme) {
    return (
      <div className={`bg-gradient-to-br ${currentTheme === 'dark' ? 'from-purple-900 via-pink-900 to-indigo-900' : 'from-pink-400 via-purple-400 to-blue-500'} p-6 rounded-3xl shadow-2xl`}>
        <div className="text-center text-gray-100">
          <p className="text-4xl mb-4">🎭</p>
          <p className="text-lg font-bold mb-4">No meme yet!</p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-white/20 hover:bg-white/30 text-gray-100 px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50"
          >
            {refreshing ? '⏳ Loading...' : '🔄 Fetch Meme'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`bg-gradient-to-br ${currentTheme === 'dark' ? 'from-purple-900 via-pink-900 to-indigo-900' : 'from-pink-400 via-purple-400 to-blue-500'} p-3 rounded-3xl shadow-2xl hover:shadow-3xl transition-shadow`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-gray-100 flex items-center gap-1.5">
          <span className="text-lg">{currentTheme === 'dark' ? '🌚' : '😂'}</span>
          Today&apos;s Meme
        </h3>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="bg-white/20 hover:bg-white/30 text-gray-100 px-2 py-1 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
        >
          {refreshing ? '⏳' : '🔄'}
        </button>
      </div>

      <div className={`${theme.colors.bgCard} rounded-2xl p-2 shadow-lg overflow-hidden`}>
        <div className="relative w-full aspect-video">
          <Image
            src={meme.url}
            alt={meme.title || "Today&apos;s meme"}
            fill
            className="object-contain rounded-lg"
            unoptimized
          />
        </div>

        {meme.title && (
          <p className={`text-center mt-2 text-xs font-semibold ${theme.colors.text} line-clamp-2`}>
            {meme.title}
          </p>
        )}
      </div>
    </motion.div>
  );
}
