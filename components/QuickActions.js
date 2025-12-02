'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import {
  FaFilm, FaUtensils, FaShoppingCart, FaCalendarAlt, FaFileAlt, FaPills, FaImages, FaKey
} from 'react-icons/fa';

export default function QuickActions() {
  const { theme, currentTheme } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 }}
      className={`${theme.colors.bgCard} rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl`}
    >
      <h2 className="text-lg md:text-2xl font-display font-bold mb-3 md:mb-4 flex items-center gap-2">
        <span className="text-xl md:text-2xl">{currentTheme === 'dark' ? '🧪' : '⚡'}</span>
        {currentTheme === 'dark' ? 'Sketchy Paths' : 'Quick Actions'}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
        <Link href="/movies">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className={`bg-gradient-to-br ${currentTheme === 'dark' ? 'from-red-900 to-pink-900' : 'from-red-500 to-pink-600'} p-3 md:p-4 rounded-xl md:rounded-2xl text-gray-100 text-center cursor-pointer shadow-lg hover:shadow-xl transition-all`}
          >
            <FaFilm className="text-2xl md:text-3xl mx-auto mb-1 md:mb-2" />
            <p className="font-bold text-xs md:text-base">Movie Night</p>
          </motion.div>
        </Link>
        <Link href="/recipes">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className={`bg-gradient-to-br ${currentTheme === 'dark' ? 'from-orange-900 to-pink-900' : 'from-orange-400 to-pink-400'} p-3 md:p-4 rounded-xl md:rounded-2xl text-gray-100 text-center cursor-pointer shadow-lg hover:shadow-xl transition-all`}
          >
            <FaUtensils className="text-2xl md:text-3xl mx-auto mb-1 md:mb-2" />
            <p className="font-bold text-xs md:text-base">Recipes</p>
          </motion.div>
        </Link>
        <Link href="/groceries">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className={`bg-gradient-to-br ${currentTheme === 'dark' ? 'from-green-900 to-blue-900' : 'from-green-400 to-blue-400'} p-3 md:p-4 rounded-xl md:rounded-2xl text-gray-100 text-center cursor-pointer shadow-lg hover:shadow-xl transition-all`}
          >
            <FaShoppingCart className="text-2xl md:text-3xl mx-auto mb-1 md:mb-2" />
            <p className="font-bold text-xs md:text-base">Groceries</p>
          </motion.div>
        </Link>
        <Link href="/calendar">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className={`bg-gradient-to-br ${currentTheme === 'dark' ? 'from-blue-900 to-purple-900' : 'from-blue-400 to-purple-400'} p-3 md:p-4 rounded-xl md:rounded-2xl text-gray-100 text-center cursor-pointer shadow-lg hover:shadow-xl transition-all`}
          >
            <FaCalendarAlt className="text-2xl md:text-3xl mx-auto mb-1 md:mb-2" />
            <p className="font-bold text-xs md:text-base">Calendar</p>
          </motion.div>
        </Link>
        <Link href="/documents">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className={`bg-gradient-to-br ${currentTheme === 'dark' ? 'from-indigo-900 to-cyan-900' : 'from-indigo-400 to-cyan-400'} p-3 md:p-4 rounded-xl md:rounded-2xl text-gray-100 text-center cursor-pointer shadow-lg hover:shadow-xl transition-all`}
          >
            <FaFileAlt className="text-2xl md:text-3xl mx-auto mb-1 md:mb-2" />
            <p className="font-bold text-xs md:text-base">Documents</p>
          </motion.div>
        </Link>
        <Link href="/medication">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className={`bg-gradient-to-br ${currentTheme === 'dark' ? 'from-purple-900 to-pink-900' : 'from-purple-400 to-pink-400'} p-3 md:p-4 rounded-xl md:rounded-2xl text-gray-100 text-center cursor-pointer shadow-lg hover:shadow-xl transition-all`}
          >
            <FaPills className="text-2xl md:text-3xl mx-auto mb-1 md:mb-2" />
            <p className="font-bold text-xs md:text-base">Medication</p>
          </motion.div>
        </Link>
        <Link href="/memories">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className={`bg-gradient-to-br ${currentTheme === 'dark' ? 'from-rose-900 to-orange-900' : 'from-rose-400 to-orange-400'} p-3 md:p-4 rounded-xl md:rounded-2xl text-gray-100 text-center cursor-pointer shadow-lg hover:shadow-xl transition-all`}
          >
            <FaImages className="text-2xl md:text-3xl mx-auto mb-1 md:mb-2" />
            <p className="font-bold text-xs md:text-base">Memories</p>
          </motion.div>
        </Link>
        <Link href="/credentials">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className={`bg-gradient-to-br ${currentTheme === 'dark' ? 'from-blue-900 to-indigo-900' : 'from-blue-500 to-indigo-500'} p-3 md:p-4 rounded-xl md:rounded-2xl text-gray-100 text-center cursor-pointer shadow-lg hover:shadow-xl transition-all`}
          >
            <FaKey className="text-2xl md:text-3xl mx-auto mb-1 md:mb-2" />
            <p className="font-bold text-xs md:text-base">Credentials</p>
          </motion.div>
        </Link>
      </div>
    </motion.div>
  );
}
