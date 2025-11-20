'use client';

import { useDrag } from 'react-dnd';
import { motion } from 'framer-motion';
import { FaGripVertical } from 'react-icons/fa';

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
    end: (item, monitor) => {
      // Cleanup: Ensure drag state is properly reset
      // This helps prevent stuck states on mobile
      const didDrop = monitor.didDrop();
      if (!didDrop) {
        // Drag was cancelled - state will auto-reset
        console.log('Drag cancelled for memory:', item.id);
      }
    },
  }));

  return (
    <motion.div
      ref={drag}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{
        opacity: isDragging ? 0.5 : 1,
        scale: isDragging ? 1.05 : 1
      }}
      className="cursor-grab active:cursor-grabbing relative"
    >
      {/* Touch/Drag Indicator - visible on hover/mobile */}
      <div className="absolute top-2 left-2 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg opacity-0 group-hover:opacity-100 md:opacity-0 transition-opacity pointer-events-none">
        <FaGripVertical className="text-purple-500" />
      </div>

      {/* Dragging indicator overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-purple-200/50 backdrop-blur-sm rounded-3xl flex items-center justify-center z-20 pointer-events-none">
          <div className="bg-white rounded-full p-4 shadow-xl">
            <FaGripVertical className="text-purple-600 text-2xl" />
          </div>
        </div>
      )}

      <div className="group">
        {children}
      </div>
    </motion.div>
  );
}
