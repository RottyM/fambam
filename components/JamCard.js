'use client';

import { useFamily } from '@/contexts/FamilyContext';
import UserAvatar from '@/components/UserAvatar';
import { useTheme } from '@/contexts/ThemeContext';
import { FaSpotify, FaTrash, FaPlay, FaYoutube, FaExternalLinkAlt } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';

// Added onPlayVideo prop
export default function JamCard({ jam, onDelete, onPlayVideo }) {
  const { getMemberById } = useFamily();
  const { theme, currentTheme } = useTheme();
  const { userData } = useAuth();

  const uploader = getMemberById(jam.userId);
  const isOwner = userData?.uid === jam.userId;

  // Format the date
  const date = jam.createdAt?.toDate().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className={`${theme.colors.bgCard} rounded-3xl p-6 shadow-md hover:shadow-lg transition-shadow border-2 ${currentTheme === 'dark' ? 'border-gray-800' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <UserAvatar user={uploader} size={40} />
          <div>
            <p className={`font-bold ${theme.colors.text}`}>{uploader?.displayName}</p>
            <p className={`text-xs ${theme.colors.textMuted}`}>{date}</p>
          </div>
        </div>
        {isOwner && (
          <button
            onClick={() => {
              if (confirm('Delete this jam?')) {
                onDelete(jam.id);
              }
            }}
            className="text-red-400 hover:text-red-500 p-2"
          >
            <FaTrash />
          </button>
        )}
      </div>

      <div className="mb-4">
        <h3 className={`text-2xl font-bold ${theme.colors.text} mb-1`}>{jam.title}</h3>
        <p className={`text-lg font-semibold ${theme.colors.textMuted}`}>{jam.artist}</p>
      </div>

      {jam.note && (
        <div className={`bg-${currentTheme === 'dark' ? 'gray-800' : 'gray-50'} p-4 rounded-2xl mb-6 italic ${theme.colors.text} relative`}>
          <span className="absolute -top-2 left-4 text-2xl">❝</span>
          <p className="px-4">{jam.note}</p>
        </div>
      )}

      {/* Conditional Button Rendering */}
      {jam.type === 'youtube' ? (
        <button
          // Call the parent's handler with the video URL
          onClick={() => onPlayVideo(jam.link)}
          className="block w-full bg-gradient-to-r from-red-600 to-pink-600 text-white py-3 rounded-2xl font-bold hover:shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
        >
          <FaYoutube size={20} /> <span>Watch Video</span>
        </button>
      ) : jam.type === 'spotify' ? (
        <a
          href={jam.link}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-2xl font-bold hover:shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
        >
          <FaSpotify size={20} /> <span>Play on Spotify</span>
        </a>
      ) : (
        <a
          href={jam.link}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-gray-500 text-white py-3 rounded-2xl font-bold hover:shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
        >
          <FaExternalLinkAlt size={16} /> <span>Open Link</span>
        </a>
      )}
    </div>
  );
}