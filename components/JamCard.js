'use client';

import { useFamily } from '@/contexts/FamilyContext';
import UserAvatar from '@/components/UserAvatar';
import { useTheme } from '@/contexts/ThemeContext';
import { useConfirmation } from '@/contexts/ConfirmationContext';
import { FaSpotify, FaTrash, FaYoutube, FaPlay, FaHeart, FaRegHeart, FaCompactDisc } from 'react-icons/fa'; 
import { useAuth } from '@/contexts/AuthContext';
import { useDrag } from 'react-dnd';
import { ItemTypes } from './PlaylistFolder';
import Image from 'next/image';

export default function JamCard({ jam, onDelete, onPlayVideo, onToggleLike }) {
  const { getMemberById } = useFamily();
  const { theme, currentTheme } = useTheme();
  const { userData } = useAuth();
  const { showConfirmation } = useConfirmation();

  const uploader = getMemberById(jam.userId);
  const isOwner = userData?.uid === jam.userId;
  const likes = jam.likes || [];
  const isLiked = likes.includes(userData?.uid);
  const likeCount = likes.length;

  const date = jam.createdAt?.toDate().toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric'
  });

  // Extract Year safely
  const releaseYear = jam.releaseDate ? jam.releaseDate.substring(0, 4) : null;

  // Drag Source Setup
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.JAM,
    item: { id: jam.id }, 
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div 
      ref={drag}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className={`group relative ${theme.colors.bgCard} rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-purple-100 flex flex-col cursor-grab active:cursor-grabbing h-full`}
    >
      
      {/* --- MEDIA SECTION --- */}
      <div className="relative aspect-video w-full overflow-hidden bg-gray-200 dark:bg-gray-800">
        {jam.thumbnail ? (
          <Image 
            src={jam.thumbnail} 
            alt={jam.title} 
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 bg-gray-100 dark:bg-gray-800">
             <FaCompactDisc size={48} className="opacity-50" />
          </div>
        )}

        {/* Play Overlay */}
        <div 
            className="absolute inset-0 z-20 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" 
            onClick={() => {
              if (!isDragging) {
                onPlayVideo(jam);
              }
            }}
        >
           <div className="bg-white/90 text-black p-3 rounded-full transform scale-90 group-hover:scale-100 transition-all shadow-lg backdrop-blur-sm">
             <FaPlay size={20} className="ml-1" />
           </div>
        </div>

        {/* Like Button */}
        <button
            onClick={(e) => { e.stopPropagation(); onToggleLike(jam.id, isLiked); }}
            className="absolute top-2 right-2 z-30 p-2 rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-colors flex items-center gap-1"
        >
            {isLiked ? <FaHeart className="text-pink-500" /> : <FaRegHeart />}
            {likeCount > 0 && <span className="text-xs font-bold">{likeCount}</span>}
        </button>

        {/* Source Icon */}
        <div className="absolute bottom-2 left-2 z-30">
            {jam.type === 'spotify' && <div className="bg-black/60 backdrop-blur-md p-1.5 rounded-full"><FaSpotify className="text-[#1DB954]" size={14}/></div>}
            {jam.type === 'youtube' && <div className="bg-black/60 backdrop-blur-md p-1.5 rounded-full"><FaYoutube className="text-red-500" size={14}/></div>}
        </div>
      </div>

      {/* --- INFO SECTION --- */}
      <div className="p-4 flex flex-col grow">
        <div className="mb-3">
              <h3 className={`text-lg font-bold leading-tight line-clamp-1 ${theme.colors.text}`}>
                {jam.title} 
                {/* Year Display */}
                {releaseYear && <span className={`font-normal text-sm ml-1 ${theme.colors.textMuted}`}>({releaseYear})</span>}
              </h3>
              <p className={`text-sm font-medium ${theme.colors.textMuted} line-clamp-1`}>{jam.artist}</p>
        </div>

        {jam.note && (
          <div className={`p-2.5 rounded-xl text-sm italic mb-3 grow leading-snug ${currentTheme === 'dark' ? 'bg-gray-800/50 text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
            &quot;{jam.note}&quot;
          </div>
        )}

        {/* FIXED: Separator line is now much lighter (gray-100) */}
        <div className={`mt-auto flex items-center justify-between border-t pt-3 ${currentTheme === 'dark' ? 'border-gray-800' : 'border-gray-100'}`}>
          <div className="flex items-center gap-2">
            <UserAvatar user={uploader} size={24} />
            <span className="text-xs text-gray-500 font-medium truncate">{uploader?.displayName || 'Unknown'}</span>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">{date}</span>
            {isOwner && (
                <button
                    onClick={(e) => {
                      e.stopPropagation();
                      showConfirmation({
                        title: 'Delete Jam',
                        message: `Are you sure you want to delete "${jam.title}"?`,
                        onConfirm: () => onDelete(jam.id),
                      });
                    }}
                    className="text-gray-300 hover:text-red-400 transition-colors ml-1"
                >
                    <FaTrash size={12} />
                </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
