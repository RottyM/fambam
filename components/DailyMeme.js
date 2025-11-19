'use client';

import { useDailyMeme } from '@/hooks/useFirebase';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import toast from 'react-hot-toast';
import { useState } from 'react';

export default function DailyMeme() {
  const { meme, loading } = useDailyMeme();
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
      <div className="bg-gradient-to-br from-pink-400 via-purple-400 to-blue-500 p-6 rounded-3xl shadow-2xl animate-pulse">
        <div className="h-48 bg-white/30 rounded-2xl"></div>
      </div>
    );
  }

  if (!meme) {
    return (
      <div className="bg-gradient-to-br from-pink-400 via-purple-400 to-blue-500 p-6 rounded-3xl shadow-2xl">
        <div className="text-center text-white">
          <p className="text-4xl mb-4">🎭</p>
          <p className="text-lg font-bold mb-4">No meme yet!</p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50"
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
      className="bg-gradient-to-br from-pink-400 via-purple-400 to-blue-500 p-6 rounded-3xl shadow-2xl hover:shadow-3xl transition-shadow"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl animate-bounce-slow">😂</span>
          <h3 className="text-2xl font-display font-bold text-white">
            Today's Family Meme
          </h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl font-bold transition-all disabled:opacity-50"
        >
          {refreshing ? '⏳' : '🔄'} Refresh
        </button>
      </div>
      
      <div className="bg-white rounded-2xl p-4 shadow-lg overflow-hidden">
        <div className="relative w-full aspect-video">
          <Image
            src={meme.url}
            alt={meme.title || "Today's meme"}
            fill
            className="object-contain rounded-lg"
            unoptimized
          />
        </div>
        
        {meme.title && (
          <p className="text-center mt-3 text-sm font-semibold text-gray-700">
            {meme.title}
          </p>
        )}
      </div>
    </motion.div>
  );
}
