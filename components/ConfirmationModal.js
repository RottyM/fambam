'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { FaTrash, FaTimes } from 'react-icons/fa';

export default function ConfirmationModal({
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  onConfirm,
  onCancel,
  confirmText = 'Delete',
  cancelText = 'Cancel',
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
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          onClick={(e) => e.stopPropagation()}
          className={`${theme.colors.bgCard} rounded-3xl p-6 max-w-md w-full shadow-2xl border ${theme.colors.border}`}
        >
          <div className="flex items-start">
            <div className="mr-4 flex-shrink-0">
              <div className={`p-3 rounded-full ${theme.colors.bg}`}>
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 15 }}
                >
                  <FaTrash className="text-red-500" size={24} /> {/* Hardcoded FaTrash */}
                </motion.div>
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
              className={`-mt-2 -mr-2 p-2 rounded-full transition-colors ${theme.colors.textMuted} hover:${theme.colors.text}`}
            >
              <FaTimes />
            </button>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onCancel}
              className={`px-6 py-3 rounded-xl font-bold transition-colors border-2 ${theme.colors.border} ${theme.colors.textMuted} hover:${theme.colors.text}`}
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
