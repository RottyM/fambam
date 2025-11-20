'use client';

import { useDrop } from 'react-dnd';
import { ItemTypes } from './DraggableMemory';
import { motion } from 'framer-motion';

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
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      className={`relative group transition-all
        ${isActive ? 'ring-4 ring-purple-500 ring-offset-2' : ''}
        ${canDrop ? 'bg-purple-100' : ''}
      `}
    >
      {children}
    </motion.div>
  );
}
