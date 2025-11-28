'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FaFolder, FaTimes } from 'react-icons/fa';
import { useTheme } from '@/contexts/ThemeContext';

export default function MoveMemoriesModal({ isOpen, onClose, folders, onSelectFolder }) {
  const { theme } = useTheme();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className={`${theme.colors.bgCard} rounded-2xl p-6 max-w-sm w-full shadow-2xl`}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Move to...</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <FaTimes size={20} />
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {/* Unsorted Option */}
              <button
                onClick={() => onSelectFolder(null)}
                className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FaFolder size={20} className="text-gray-500" />
                <span className="font-semibold text-gray-900 dark:text-gray-200">Unsorted</span>
              </button>

              {/* Folder List */}
              {folders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => onSelectFolder(folder.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <FaFolder size={20} className="text-purple-500" />
                  <span className="font-semibold text-gray-900 dark:text-gray-200">{folder.name}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
