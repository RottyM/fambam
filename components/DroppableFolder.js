'use client';

import { useDrop } from 'react-dnd';
import { ItemTypes } from './DraggableMemory';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheckCircle } from 'react-icons/fa';

export default function DroppableFolder({ folder, onDrop, children }) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.MEMORY,
    drop: (item) => onDrop(item.id, folder?.id || null),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }));

  const isActive = isOver && canDrop;

  return (
    <motion.div
      ref={drop}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{
        opacity: 1,
        scale: isActive ? 1.1 : 1,
      }}
      whileHover={{ scale: 1.05 }}
      className={`relative transition-all
        ${isActive ? 'ring-4 ring-purple-500 ring-offset-2 z-10' : ''}
        ${canDrop && !isActive ? 'ring-2 ring-purple-300 ring-offset-1' : ''}
      `}
    >
      {/* Drop indicator - shows when hovering over folder */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap shadow-lg z-20 flex items-center gap-1"
          >
            <FaCheckCircle /> Drop here
          </motion.div>
        )}
      </AnimatePresence>

      {children}
    </motion.div>
  );
}
