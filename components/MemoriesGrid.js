import { useState, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import MoveMemoriesModal from './MoveMemoriesModal';
import { useDraggable, DragOverlay } from '@dnd-kit/core';

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-6 h-6 text-white">
    <path d="M5 13l4 4L19 7" />
  </svg>
);

function DraggableMemoryItem({ memory, children, selectMode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: memory.id,
    data: {
      type: 'MEMORY',
      memory: memory,
    },
    disabled: selectMode, // Disable dragging when in select mode
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 9999,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="touch-none">
      {children}
    </div>
  );
}


export default function MemoriesGrid({ memories, onMove, onOpen, folders, isParent }) {
  const [selectMode, setSelectMode] = useState(false);
  const [selectedMemories, setSelectedMemories] = useState(new Set());
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [activeId, setActiveId] = useState(null); // For DragOverlay

  // Refs for robust touch handling
  const pressTimer = useRef();
  const touchStartPos = useRef({ x: 0, y: 0 });

  const handleLongPress = (memoryId) => {
    if (activeId) return; // Don't enter select mode if a drag is active
    setSelectMode(true);
    setSelectedMemories(prev => new Set(prev).add(memoryId));
  };

  const handleClick = (memory) => {
    if (selectMode) {
      const newSelection = new Set(selectedMemories);
      if (newSelection.has(memory.id)) {
        newSelection.delete(memory.id);
      } else {
        newSelection.add(memory.id);
      }
      setSelectedMemories(newSelection);

      if (newSelection.size === 0) {
        setSelectMode(false);
      }
    } else {
      onOpen(memory);
    }
  };
  
  // --- Touch Event Handlers for Long Press ---
  const handleTouchStart = (e, memoryId) => {
    // dnd-kit's listeners will handle drag starts. This is a fallback for long-press-to-select.
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    pressTimer.current = setTimeout(() => {
      handleLongPress(memoryId);
    }, 500); // 500ms for a long press
  };

  const handleTouchMove = (e) => {
    const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
    if (dx > 10 || dy > 10) {
      clearTimeout(pressTimer.current);
    }
  };

  const handleTouchEnd = () => {
    clearTimeout(pressTimer.current);
  };
  
  const handleMoveClick = () => {
    if (selectedMemories.size > 0) {
      setIsMoveModalOpen(true);
    }
  };
  
  const cancelSelectMode = () => {
    setSelectMode(false);
    setSelectedMemories(new Set());
  };

  const handleSelectFolder = (folderId) => {
    onMove(Array.from(selectedMemories), folderId);
    setIsMoveModalOpen(false);
    cancelSelectMode();
  };
  
  const activeMemory = memories.find(m => m.id === activeId);

  return (
    <div className="relative">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1">
        {memories.map((memory, index) => {
          const isSelected = selectedMemories.has(memory.id);
          const isVideo = memory.mimeType?.startsWith('video/');

          return (
            <DraggableMemoryItem key={memory.id} memory={memory} selectMode={selectMode}>
              <motion.div
                initial={{ opacity: 1, scale: 1 }}
                animate={{
                  opacity: activeId === memory.id ? 0 : 1, // Hide original when dragging
                  scale: isSelected ? 0.9 : 1,
                }}
                transition={{ delay: index * 0.02 }}
                className="relative aspect-square cursor-pointer group"
                onClick={() => handleClick(memory)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleLongPress(memory.id);
                }}
                onTouchStart={(e) => handleTouchStart(e, memory.id)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {isVideo ? (
                  <video
                    src={memory.downloadURL}
                    className="w-full h-full object-cover bg-gray-200 dark:bg-gray-800 rounded-md"
                    playsInline
                    muted
                    draggable="false"
                  />
                ) : (
                  <Image
                    src={memory.downloadURL}
                    alt="Memory"
                    fill
                    sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 16vw"
                    className="object-cover bg-gray-200 dark:bg-gray-800 rounded-md"
                    unoptimized
                    draggable="false"
                  />
                )}

                {selectMode && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none rounded-md">
                    <div className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center ${isSelected ? 'bg-blue-500' : 'bg-black/30'}`}>
                      {isSelected && <CheckIcon />}
                    </div>
                  </div>
                )}
                
                <div className={`absolute inset-0 transition-colors pointer-events-none rounded-md ${selectMode && !isSelected ? 'bg-black/60' : 'bg-transparent'}`} />
              
              </motion.div>
            </DraggableMemoryItem>
          );
        })}
      </div>

      <DragOverlay>
        {activeId && activeMemory ? (
           <div className="relative aspect-square w-32 h-32 shadow-2xl rounded-lg overflow-hidden">
            {activeMemory.mimeType?.startsWith('video/') ? (
              <video
                src={activeMemory.downloadURL}
                className="w-full h-full object-cover bg-gray-200 dark:bg-gray-800"
                playsInline muted autoPlay loop
              />
            ) : (
              <Image
                src={activeMemory.downloadURL}
                alt="Memory"
                fill
                sizes="128px"
                className="object-cover"
                unoptimized
              />
            )}
           </div>
        ) : null}
      </DragOverlay>

      <AnimatePresence>
        {selectMode && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween", ease: "easeInOut" }}
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900/80 backdrop-blur-sm shadow-lg p-4 flex justify-between items-center z-40 border-t border-gray-200 dark:border-gray-700"
          >
            <button onClick={cancelSelectMode} className="font-semibold text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
            <span className="font-bold text-lg text-gray-800 dark:text-gray-100">{selectedMemories.size} selected</span>
            <button 
              onClick={handleMoveClick} 
              className="font-bold text-white bg-blue-600 px-6 py-2 rounded-lg shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={selectedMemories.size === 0}
            >
              Move
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <MoveMemoriesModal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        folders={folders}
        onSelectFolder={handleSelectFolder}
      />
    </div>
  );
}
