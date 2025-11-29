import { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import MoveMemoriesModal from './MoveMemoriesModal';
import { useDraggable, DragOverlay } from '@dnd-kit/core';
import { FixedSizeGrid } from 'react-window';
import { useLongPress } from 'use-long-press';
import { createPortal } from 'react-dom';
import { useTheme } from '@/contexts/ThemeContext';

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-6 h-6 text-white">
    <path d="M5 13l4 4L19 7" />
  </svg>
);

function DraggableMemoryItem({ memory, children, selectMode, style, isTouchDevice, selectedIds }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef } = useDraggable({
    id: memory.id,
    data: {
      type: 'MEMORY',
      memory: memory,
      selectedIds,
    },
    disabled: false,
  });
  // On touch, make the whole tile the activator; on desktop keep the small drag handle.
  const touchActivatorProps = isTouchDevice && !selectMode ? { ...listeners, ...attributes } : {};

  return (
    <div
      ref={setNodeRef}
      className="touch-manipulation select-none relative group"
      style={{ ...style, touchAction: isTouchDevice ? 'pan-y' : 'none' }} // Allow touch scrolling while keeping desktop drag handles sticky
      {...touchActivatorProps}
    >
      {!isTouchDevice && !selectMode && (
        <button
          ref={setActivatorNodeRef}
          {...listeners}
          {...attributes}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 right-2 z-10 rounded-md bg-black/50 text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          title="Drag to move (desktop)"
        >
          <span className="sr-only">Drag to move</span>
          <span className="flex flex-col gap-[3px]">
            <span className="block w-3 h-[2px] bg-white/80 rounded-sm" />
            <span className="block w-3 h-[2px] bg-white/80 rounded-sm" />
            <span className="block w-3 h-[2px] bg-white/80 rounded-sm" />
          </span>
        </button>
      )}
      {children}
    </div>
  );
}


export default function MemoriesGrid({ memories, onMove, onOpen, folders, isParent, hasMore, loadMore, loadingMore, activeId }) {
  const [selectMode, setSelectMode] = useState(false);
  const [selectedMemories, setSelectedMemories] = useState(new Set());
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  // Refs for robust touch handling
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const { currentTheme } = useTheme();

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

  useEffect(() => {
    const touch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    setIsTouchDevice(Boolean(touch));
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
  
  const handleMoveClick = () => {
    if (selectedMemories.size > 0) {
      setIsMoveModalOpen(true);
    }
  };

  const toggleSelectMode = () => {
    if (selectMode) {
      cancelSelectMode();
    } else {
      setSelectMode(true);
      setSelectedMemories(new Set());
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

  const renderCell = (memory, index, style, itemSize, gutter) => {
    const isSelected = selectedMemories.has(memory.id);
    const isVideo = memory.mimeType?.startsWith('video/');
    // Only enable long-press-to-select on non-touch devices; touch uses drag directly.
    const bindLongPress = !isTouchDevice
      ? useLongPress(() => handleLongPress(memory.id), {
          threshold: 500, // 500ms for long press
          detect: 'mouseAndTouch',
          cancelOnMovement: true, // Cancel long press if there's significant movement
        })
      : () => ({});

    return (
      <div style={{ ...style, width: itemSize + gutter, height: itemSize + gutter }} className="box-border">
        <DraggableMemoryItem
          key={memory.id}
          memory={memory}
          selectMode={selectMode}
          style={{ width: '100%', height: '100%' }}
          isTouchDevice={isTouchDevice}
          selectedIds={selectMode && selectedMemories.size > 0 ? Array.from(selectedMemories) : [memory.id]}
        >
          <div className="w-full h-full p-1">
            <motion.div
              initial={{ opacity: 1, scale: 1 }}
              animate={{
                opacity: activeId === memory.id ? 0 : 1, // Hide original when dragging
                scale: isSelected ? 0.9 : 1,
              }}
              transition={{ delay: 0 }}
              className="relative w-full h-full cursor-pointer group rounded-md overflow-hidden"
              onClick={() => handleClick(memory)}
              {...bindLongPress()}
            >
              {isVideo ? (
                <video
                  src={memory.downloadURL}
                  className="w-full h-full object-cover bg-gray-200 dark:bg-gray-800"
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
                  className="object-cover bg-gray-200 dark:bg-gray-800"
                  unoptimized
                  draggable="false"
                />
              )}

              {selectMode && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
                  <div className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center ${isSelected ? 'bg-blue-500' : 'bg-black/30'}`}>
                    {isSelected && <CheckIcon />}
                  </div>
                </div>
              )}
              
              <div className={`absolute inset-0 transition-colors pointer-events-none ${selectMode && !isSelected ? 'bg-black/60' : 'bg-transparent'}`} />
            
            </motion.div>
          </div>
        </DraggableMemoryItem>
      </div>
    );
  };

  const layout = useMemo(() => {
    const width = containerSize.width || 800;
    const height = containerSize.height || 500;
    const columns = width >= 1280 ? 6 : width >= 1024 ? 5 : width >= 768 ? 4 : 3;
    const itemSize = Math.floor((width - GUTTER * (columns - 1)) / columns);
    const rowCount = Math.ceil(memories.length / columns);
    return { width, height, columns, itemSize, rowCount };
  }, [containerSize.width, containerSize.height, memories.length]);

  return (
    <>
      <div className="flex justify-end mt-4 mb-2 px-1">
        <button
          onClick={toggleSelectMode}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all shadow-sm ${
            currentTheme === 'dark'
              ? 'bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {selectMode ? 'Done selecting' : 'Select'}
        </button>
      </div>
    <div className="relative h-[70vh] min-h-[420px] pt-4" ref={containerRef}>
      <FixedSizeGrid
        height={layout.height}
        width={layout.width}
        columnCount={layout.columns}
        columnWidth={layout.itemSize + GUTTER}
        rowCount={layout.rowCount}
        rowHeight={layout.itemSize + GUTTER}
        itemKey={({ columnIndex, rowIndex }) => {
          const index = rowIndex * layout.columns + columnIndex;
          return memories[index]?.id ?? `empty-${rowIndex}-${columnIndex}`;
        }}
        onItemsRendered={({ visibleRowStopIndex }) => {
          if (layout.rowCount === 0) return;
          const nearEnd = visibleRowStopIndex >= layout.rowCount - 2;
          if (nearEnd && hasMore && !loadingMore) {
            loadMore?.();
          }
        }}
        className="will-change-transform scrollbar-hide"
        style={{ overflowX: 'hidden', overflowY: 'auto' }}
      >
        {({ columnIndex, rowIndex, style }) => {
          const index = rowIndex * layout.columns + columnIndex;
          if (index >= memories.length) return null;
          const memory = memories[index];

          return renderCell(memory, index, style, layout.itemSize, GUTTER);
        }}
      </FixedSizeGrid>

      {createPortal(
        <DragOverlay>
          {activeId && activeMemory ? (
             <div
               className="relative aspect-square shadow-2xl rounded-lg overflow-hidden"
               style={{ width: layout.itemSize, height: layout.itemSize }}
             >
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
        </DragOverlay>,
        document.body
      )}

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
    </>
  );
}
