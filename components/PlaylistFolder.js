'use client';

import { useDrop } from 'react-dnd';
import { FaFolder, FaFolderOpen, FaTimes, FaPlay } from 'react-icons/fa';
import { useTheme } from '@/contexts/ThemeContext';
import { useConfirmation } from '@/contexts/ConfirmationContext';

export const ItemTypes = {
    JAM: 'jam',
};

export default function PlaylistFolder({ folder, isActive, onClick, onDropJam, onDelete, onPlay, count }) {
  const { theme } = useTheme();
  const { showConfirmation } = useConfirmation();

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.JAM,
    drop: (item) => onDropJam(item.id, folder.id),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  // Dynamic Styles
  let bgColor = isActive ? 'bg-purple-500 text-white' : theme.colors.bgCard;
  let borderColor = isActive ? 'border-purple-500' : theme.colors.border;
  
  if (isOver && canDrop) {
      bgColor = 'bg-purple-100 dark:bg-purple-900/30 text-purple-600';
      borderColor = 'border-purple-300';
  }

  const Icon = isActive || isOver ? FaFolderOpen : FaFolder;

  return (
    <div className="relative group"> 
      {/* Folder Button */}
      <button
        ref={drop}
        onClick={onClick}
        className={`relative flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all font-bold whitespace-nowrap shadow-sm pr-8 ${bgColor} ${borderColor} ${!isActive && !isOver ? 'hover:border-gray-300 dark:hover:border-gray-600' : ''}`}
      >
        <Icon className={isActive ? 'text-white' : (isOver ? 'text-purple-500' : 'text-gray-700')} />
        <span>{folder.name}</span>
        {count !== '' && <span className={`text-xs ${isActive ? 'text-purple-200' : 'text-gray-700'}`}>({count})</span>}
      </button>

      {/* DELETE BUTTON (Red X) - Only shows for custom folders, not 'All' */}
      {folder.id !== 'all' && (
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent clicking the folder itself
            showConfirmation({
              title: 'Delete Playlist',
              message: `Are you sure you want to delete the playlist "${folder.name}"? The songs inside will not be deleted.`,
              onConfirm: () => onDelete(folder.id),
            });
          }}
          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
          title="Delete Playlist"
        >
          <FaTimes size={10} />
        </button>
      )}

      {/* QUICK PLAY BUTTON - top left, matched sizing to delete */}
      <button
        onClick={(e) => { e.stopPropagation(); onPlay(folder.id); }}
        className={`absolute -top-1 -left-1 bg-green-500 text-white rounded-full p-1 shadow-md opacity-0 ${isActive ? 'opacity-100' : 'group-hover:opacity-100'} transition-all hover:scale-110 z-10`}
        title="Play This Folder"
      >
        <FaPlay size={10} className="ml-[1px]" />
      </button>
    </div>
  );
}
