import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import MoveMemoriesModal from './MoveMemoriesModal';
import { useDraggable, DragOverlay } from '@dnd-kit/core';
import { FixedSizeGrid } from 'react-window';

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
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="touch-manipulation select-none"
      style={{ ...style, touchAction: isDragging ? 'none' : 'pan-y' }}
    >
      {children}
    </div>
  );
}


export default function MemoriesGrid({ memories, onMove, onOpen, folders, isParent, hasMore, loadMore, loadingMore, activeId }) {
  const [selectMode, setSelectMode] = useState(false);
  const [selectedMemories, setSelectedMemories] = useState(new Set());
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  // Refs for robust touch handling
  const pressTimer = useRef();
  const touchStartPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

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

  const GUTTER = 8;

  const renderCell = (memory, index, style) => {
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
          transition={{ delay: 0 }}
          className="relative w-full h-full cursor-pointer group"
          onClick={() => handleClick(memory)}
          onContextMenu={(e) => {
            e.preventDefault();
            handleLongPress(memory.id);
          }}
          onTouchStart={(e) => handleTouchStart(e, memory.id)}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={style}
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
  };

  const VirtualGrid = () => {
    const width = containerSize.width || 800;
    const height = containerSize.height || 500;
    const columns = width >= 1280 ? 6 : width >= 1024 ? 5 : width >= 768 ? 4 : 3;
    const itemSize = Math.floor((width - GUTTER * (columns - 1)) / columns);
    const rowCount = Math.ceil(memories.length / columns);

    return (
      <FixedSizeGrid
        height={height}
        width={width}
        columnCount={columns}
        columnWidth={itemSize + GUTTER}
        rowCount={rowCount}
        rowHeight={itemSize + GUTTER}
        itemKey={({ columnIndex, rowIndex }) => {
          const index = rowIndex * columns + columnIndex;
          return memories[index]?.id ?? `empty-${rowIndex}-${columnIndex}`;
        }}
        onItemsRendered={({ visibleRowStopIndex }) => {
          if (rowCount === 0) return;
          const nearEnd = visibleRowStopIndex >= rowCount - 2;
          if (nearEnd && hasMore && !loadingMore) {
            loadMore?.();
          }
        }}
        className="will-change-transform scrollbar-hide"
        style={{ overflowX: 'hidden', overflowY: 'auto' }}
      >
        {({ columnIndex, rowIndex, style }) => {
          const index = rowIndex * columns + columnIndex;
          if (index >= memories.length) return null;
          const memory = memories[index];

          const adjustedStyle = {
            ...style,
            left: style.left,
            top: style.top,
            width: itemSize,
            height: itemSize,
            paddingRight: GUTTER / 2,
            paddingBottom: GUTTER / 2,
          };

          return renderCell(memory, index, adjustedStyle);
        }}
      </FixedSizeGrid>
    );
  };
  return (
    <div className="relative h-[70vh] min-h-[420px]" ref={containerRef}>
      <VirtualGrid />

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

      {hasMore && (
        <div className="flex justify-center mt-4">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}

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
