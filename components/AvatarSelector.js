'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';
import { motion } from 'framer-motion';
import { FaDice, FaSyncAlt } from 'react-icons/fa';

// Expanded avatar styles for more variety
// Light mode styles - fun, colorful, friendly avatars
const lightAvatarStyles = [
  'fun-emoji',           // Emoji-style faces
  'adventurer',          // Pixelated adventurers
  'adventurer-neutral',  // Neutral colored adventurers
  'avataaars',           // Cartoon-style avatars
  'avataaars-neutral',   // Neutral colored cartoons
  'big-smile',           // Simple smiley faces
  'lorelei',             // Minimalist line art
  'lorelei-neutral',     // Neutral colored line art
  'pixel-art',           // 8-bit style avatars
  'pixel-art-neutral',   // Neutral pixel art
  'micah',               // Colorful illustrated portraits
  'miniavs',             // Tiny minimal avatars
  'open-peeps',          // Hand-drawn people
  'personas',            // Illustrated personas
  'dylan',               // Abstract colorful shapes as faces
];

// Dark mode styles - geometric, abstract, mysterious avatars
const darkAvatarStyles = [
  'bottts',              // Robots/bots
  'bottts-neutral',      // Neutral colored robots
  'shapes',              // Abstract geometric shapes
  'identicon',           // GitHub-style identicons
  'notionists',          // Notion-style avatars
  'notionists-neutral',  // Neutral Notion avatars
  'thumbs',              // Thumbprint patterns
  'rings',               // Concentric ring patterns
  'bauhaus',             // Bauhaus art style
  'croodles',            // Doodle-style creatures
  'croodles-neutral',    // Neutral doodles
];

export default function AvatarSelector({ userId, currentAvatar, onSelect, _size = 80 }) {
  const { currentTheme } = useTheme();
  const [selectedStyle, setSelectedStyle] = useState(currentAvatar?.style || null);
  const [seedVariant, setSeedVariant] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [recentStyles, setRecentStyles] = useState([]);
  
  const isDark = currentTheme === 'dark';
  const avatarStyles = isDark ? darkAvatarStyles : lightAvatarStyles;
  const displayStyles = showAll ? avatarStyles : avatarStyles.slice(0, 6);

  const generateAvatarUrl = (style, customSeed = null) => {
    // Use custom seed or generate one with variant
    const seed = customSeed || `${userId}_v${seedVariant}`;
    
    if (isDark && darkAvatarStyles.includes(style)) {
      // Dark mode avatars with darker background colors
      return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&backgroundColor=1a1a2e,16213e,0f0e17&primaryColor=6C63FF,a855f7,8b5cf6`;
    }
    // Light mode avatars
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
  };

  const rotateSeed = () => {
    setSeedVariant(prev => prev + 1);
  };

  const handleSelectAvatar = (style) => {
    setSelectedStyle(style);
    // Track recent styles (keep last 3)
    setRecentStyles(prev => {
      const newRecent = [style, ...prev.filter(s => s !== style)].slice(0, 3);
      return newRecent;
    });
    
    const seed = `${userId}_v${seedVariant}`;
    const avatar = {
      type: 'dicebear',
      style: style,
      seed: seed,
      url: generateAvatarUrl(style, seed),
    };
    onSelect(avatar);
  };

  const handleRandomAvatar = () => {
    const randomStyle = avatarStyles[Math.floor(Math.random() * avatarStyles.length)];
    const randomSeed = `${userId}_random_${Date.now()}`;
    setSelectedStyle(randomStyle);
    const avatar = {
      type: 'dicebear',
      style: randomStyle,
      seed: randomSeed,
      url: generateAvatarUrl(randomStyle, randomSeed),
    };
    onSelect(avatar);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-sm text-gray-600 dark:text-gray-400">
          {isDark ? 'Dark Mode' : 'Light Mode'} Avatars ({avatarStyles.length} styles)
        </h4>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={rotateSeed}
            className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            title="Get different variations of each avatar style"
          >
            <FaSyncAlt size={12} className="transition-transform hover:rotate-180" /> Variations
          </button>
          <button
            type="button"
            onClick={handleRandomAvatar}
            className="bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            title="Get a completely random avatar"
          >
            <FaDice size={12} /> Random
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {displayStyles.map((style) => {
          const isSelected = selectedStyle === style;
          return (
            <motion.button
              key={style}
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelectAvatar(style)}
              className={`relative rounded-2xl p-2 transition-all ${
                isSelected
                  ? isDark
                    ? 'bg-purple-900 border-3 border-purple-500 shadow-lg shadow-purple-500/30'
                    : 'bg-purple-100 border-3 border-purple-500 shadow-lg shadow-purple-500/30'
                  : isDark
                  ? 'bg-gray-800 border-2 border-gray-700 hover:border-purple-700'
                  : 'bg-gray-50 border-2 border-gray-200 hover:border-purple-300'
              }`}
            >
              <div className="relative w-full" style={{ aspectRatio: '1/1' }}>
                <Image
                  src={generateAvatarUrl(style)}
                  alt={`${style} avatar`}
                  fill
                  className="object-contain rounded-xl"
                  unoptimized
                />
              </div>
              {isSelected && (
                <div className="absolute -top-1 -right-1 bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                  ✓
                </div>
              )}
              <p className="text-[10px] mt-1 font-semibold text-gray-600 dark:text-gray-400 capitalize">
                {style.replace(/-/g, ' ')}
              </p>
            </motion.button>
          );
        })}
      </div>

      {!showAll && avatarStyles.length > 6 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-2.5 rounded-xl text-sm font-bold transition-all shadow-md"
        >
          Show More Styles ({avatarStyles.length - 6} more)
        </button>
      )}

      {showAll && avatarStyles.length > 6 && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md"
        >
          Show Less
        </button>
      )}

      <div className="space-y-2">
        {recentStyles.length > 0 && (
          <div className="bg-emerald-200/70 dark:bg-green-900/20 border-2 border-emerald-400 dark:border-green-700 rounded-xl p-3 shadow-sm">
            <p className="text-xs text-gray-900 dark:text-green-300 font-extrabold">
              🔄 Recently tried: {recentStyles.join(', ')}
            </p>
          </div>
        )}
        <div className="bg-amber-200/70 dark:bg-yellow-900/20 border-2 border-amber-400 dark:border-yellow-700 rounded-xl p-3 shadow-sm">
          <p className="text-xs text-gray-900 dark:text-yellow-300 font-extrabold">
            💡 Tip: Your avatar style changes automatically with theme mode!
          </p>
        </div>
        <div className="bg-sky-200/70 dark:bg-blue-900/20 border-2 border-sky-400 dark:border-blue-700 rounded-xl p-3 shadow-sm">
          <p className="text-xs text-gray-900 dark:text-blue-300 font-extrabold">
            🎲 Use &quot;Variations&quot; to see different looks for each style, or &quot;Random&quot; for a surprise!
          </p>
        </div>
      </div>
    </div>
  );
}
