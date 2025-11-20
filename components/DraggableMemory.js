'use client';

import { useDrag } from 'react-dnd';
import { motion } from 'framer-motion';

export const ItemTypes = {
  MEMORY: 'memory',
};

export default function DraggableMemory({ memory, children }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.MEMORY,
    item: { id: memory.id },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <motion.div
      ref={drag}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: 1 }}
      className="cursor-grab"
    >
      {children}
    </motion.div>
  );
}
