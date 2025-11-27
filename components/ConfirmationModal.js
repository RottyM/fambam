'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';

export default function ConfirmationModal({
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  onConfirm,
  onCancel,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  icon: Icon = FaExclamationTriangle,
  confirmButtonClass = 'bg-red-600 hover:bg-red-700',
}) {
  const { theme } = useTheme();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className={`${theme.colors.bgCard} rounded-3xl p-6 max-w-md w-full shadow-2xl border ${theme.colors.border}`}
        >
          <div className="flex items-start">
            <div className="mr-4 flex-shrink-0">
              <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full">
                <Icon className="text-red-500" size={24} />
              </div>
            </div>
            <div className="flex-1">
              <h2 className={`text-2xl font-bold ${theme.colors.text}`}>
                {title}
              </h2>
              <p className={`mt-2 text-base ${theme.colors.textMuted}`}>
                {message}
              </p>
            </div>
            <button
              onClick={onCancel}
              className={`-mt-2 -mr-2 p-2 rounded-xl transition-colors ${
                theme.colors.bg === 'bg-white' ? 'hover:bg-gray-100' : 'hover:bg-gray-700'
              }`}
            >
              <FaTimes />
            </button>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onCancel}
              className={`px-6 py-3 rounded-xl font-bold transition-colors ${
                theme.colors.bg === 'bg-white' ? 'bg-gray-200 hover:bg-gray-300' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {cancelText}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onConfirm}
              className={`px-6 py-3 rounded-xl font-bold text-white transition-all shadow-lg ${confirmButtonClass}`}
            >
              {confirmText}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
