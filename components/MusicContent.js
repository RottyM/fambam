'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  FaMusic, 
  FaTimes, 
  FaFolderPlus, 
  FaPlay, 
  FaStepBackward, 
  FaStepForward, 
  FaShareSquare 
} from 'react-icons/fa';
import { useMusicJams } from '@/hooks/useMusicJams';
import JamCard from '@/components/JamCard';
import AddJamModal from '@/components/AddJamModal';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import YouTube from 'react-youtube'; 
import { useSearchParams } from 'next/navigation';

// --- DRAG AND DROP IMPORTS ---
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { MultiBackend, TouchTransition } from 'react-dnd-multi-backend';
import PlaylistFolder from '@/components/PlaylistFolder';

// --- DND Backend Pipeline ---
const HTML5toTouch = {
  backends: [
    { id: 'html5', backend: HTML5Backend, transition: TouchTransition },
    { id: 'touch', backend: TouchBackend, options: {enableMouseEvents: true}, preview: true },
  ],
};

// Helpers
const getYouTubeId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const getSpotifyId = (url) => {
  if (!url) return null;
  const match = url.match(/track\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
};

export default function MusicContent() {
  const { theme, currentTheme } = useTheme();
  const [activeFilterId, setActiveFilterId] = useState('all'); 
  const [showAddModal, setShowAddModal] = useState(false);
  const searchParams = useSearchParams();
  
  // --- PLAYER STATE ---
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const { 
      jams, allJams, folders, loading, addJam, deleteJam, 
      toggleLike, createFolder, deleteFolder, assignJamToFolder
  } = useMusicJams(activeFilterId);
  const countForFolder = (folderId) =>
    folderId === 'all'
      ? allJams.length
      : allJams.filter(j => j.folderIds?.includes(folderId) || j.folderId === folderId).length;
  const filteredCount = jams.length;

  // --- PLAYBACK HANDLERS ---
  
  const handlePlaySingle = (clickedLink) => {
      // When clicking a card, set the current view (jams) as the queue
      const index = jams.findIndex(j => j.link === clickedLink);
      if (index !== -1) {
          setQueue(jams);
          setCurrentIndex(index);
          setIsPlaying(true);
      } else {
          toast.error("Could not load song.");
      }
  };

  const handlePlayFolder = () => {
      if (jams.length > 0) {
          setQueue(jams);
          setCurrentIndex(0);
          setIsPlaying(true);
          toast.success(`Playing ${jams.length} songs`);
      } else {
          toast.error("This playlist is empty!");
      }
  };

  const playNext = () => {
      if (currentIndex < queue.length - 1) {
          setCurrentIndex(prev => prev + 1);
      } else {
          toast("End of playlist", { icon: '🏁' });
      }
  };

  const playPrev = () => {
      if (currentIndex > 0) {
          setCurrentIndex(prev => prev - 1);
      }
  };

  // Surface Spotify auth status/errors from callback redirect
  useEffect(() => {
    const status = searchParams.get('status');
    const err = searchParams.get('error');
    if (status === 'connected') {
      toast.success('Connected to Spotify!');
    } else if (err) {
      const msg =
        err === 'no_code' ? 'Spotify sign-in failed: no code returned.' :
        err === 'token_failed' ? 'Spotify sign-in failed: token exchange error.' :
        err === 'missing_spotify_env' ? 'Missing Spotify client id/secret.' :
        'Spotify sign-in failed.';
      toast.error(msg);
    }
  }, [searchParams]);

  const currentTrack = queue[currentIndex];
  const youtubeId = currentTrack ? getYouTubeId(currentTrack.link) : null;
  const spotifyId = currentTrack ? getSpotifyId(currentTrack.link) : null;

  // --- FOLDER HANDLERS ---
  const handleCreateFolder = async () => {
      const name = prompt("Enter playlist name:");
      if (name) await createFolder(name);
  };

  const handleDeleteFolder = async (folderId) => {
      await deleteFolder(folderId);
      // If we deleted the active folder, switch back to 'all'
      if (activeFilterId === folderId) setActiveFilterId('all');
  };

  // --- EXPORT TO SPOTIFY ---
  const handleExport = async () => {
      if (jams.length === 0) {
          toast.error("No songs to export!");
          return;
      }
      
      const toastId = toast.loading("Connecting to Spotify...");
      
      try {
        const res = await fetch('/api/spotify/create-playlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                // Export current queue or the current filtered list
                jams: jams, 
                playlistName: activeFilterId !== 'all' 
                    ? folders.find(f => f.id === activeFilterId)?.name 
                    : `Family Jams ${new Date().toLocaleDateString()}`
            }),
        });
        
        // 1. Not Logged In? Redirect to Auth
        if (res.status === 401) {
            toast.dismiss(toastId);
            toast("Redirecting to Spotify Login...", { icon: '🔐' });
            // Redirects to our Auth API Route
            window.location.href = '/api/spotify/auth';
            return;
        }

        const data = await res.json();
        
        // 2. Success!
        if (data.success) {
            toast.dismiss(toastId);
            const openSpotify = (uri, webLink) => {
              if (!uri && !webLink) return;
              const fallback = webLink || '';
              if (uri) {
                const start = Date.now();
                window.location.href = uri;
                setTimeout(() => {
                  // If nothing handled it, open web link
                  if (Date.now() - start < 1200 && fallback) {
                    window.open(fallback, '_blank', 'noopener,noreferrer');
                  }
                }, 1000);
              } else if (fallback) {
                window.open(fallback, '_blank', 'noopener,noreferrer');
              }
            };

            toast.success(
              <div className="flex flex-col gap-2">
                <span><b>Created Playlist!</b> ({data.count} songs)</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => openSpotify(data.uri, data.link)}
                    className="bg-black/20 hover:bg-black/30 text-white text-sm px-3 py-1 rounded-md font-semibold transition-colors"
                  >
                    Open in Spotify
                  </button>
                  {data.link && (
                    <a
                      href={data.link}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-white/15 hover:bg-white/25 text-white text-sm px-3 py-1 rounded-md font-semibold transition-colors"
                    >
                      Open in Browser
                    </a>
                  )}
                </div>
              </div>,
              { duration: 6000, style: { background: '#1DB954', color: '#fff' } }
            );
        } else {
            toast.dismiss(toastId);
            toast.error(data.error || "Something went wrong");
        }

      } catch (error) {
        toast.dismiss(toastId);
        console.error(error);
        toast.error("Export failed.");
      }
  };

  const handleMoveJam = async (jamId, targetFolderId) => {
    const destination = targetFolderId === 'all' ? null : targetFolderId;
    await assignJamToFolder(jamId, destination);
  };

  // const handleRemoveFromFolder = async (jamId, folderId) => {
  //   if (!folderId || folderId === 'all') return;
  //   await removeJamFromFolder(jamId, folderId);
  // };

  if (loading && folders.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-7xl mb-4"
          >
            🎵
          </motion.div>
          <p className={`text-xl font-bold ${currentTheme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>
            Loading music...
          </p>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={MultiBackend} options={HTML5toTouch}>
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-2">
            <span className={currentTheme === 'dark' ? 'text-purple-400' : 'gradient-text'}>
              {currentTheme === 'dark' ? 'Dark Harmonies' : 'Family Jams'}
            </span>
          </h1>
          <p className={`text-sm md:text-base font-semibold ${theme.colors.textMuted}`}>
            Create playlists and share your favorite music 🎵
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex gap-3 justify-end">
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handlePlayFolder}
                disabled={filteredCount === 0}
                className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-4 md:px-6 py-3 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <FaPlay size={14} /> <span className="hidden md:inline">Play All</span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full ml-1">{filteredCount}</span>
            </motion.button>
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAddModal(true)}
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 md:px-6 py-3 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 shrink-0"
            >
                <FaMusic size={16} />
                <span className="hidden md:inline">Add Jam</span>
                <span className="md:hidden">➕</span>
            </motion.button>
        </div>
      </div>

      {/* --- PLAYLIST BAR (Droppable) --- */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto custom-scrollbar pb-4 pt-2 px-1">
        <div className="flex gap-3 shrink-0 items-center">
          <PlaylistFolder
            folder={{ id: 'all', name: 'All Jams' }}
            isActive={activeFilterId === 'all'}
            onClick={() => setActiveFilterId('all')}
            onDropJam={handleMoveJam}
            onDelete={() => {}}
            onPlay={() => handlePlayFolder()}
            count={countForFolder('all')}
          />

          {folders.map(folder => (
            <PlaylistFolder
              key={folder.id}
              folder={folder}
              isActive={activeFilterId === folder.id}
              onClick={() => setActiveFilterId(folder.id)}
              onDropJam={handleMoveJam}
              onDelete={handleDeleteFolder}
              onPlay={() => {
                setActiveFilterId(folder.id);
                handlePlayFolder();
              }}
              count={countForFolder(folder.id)}
            />
          ))}

          <button
            onClick={handleCreateFolder}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 border-dashed text-gray-700 hover:text-purple-500 hover:border-purple-400 transition-colors font-bold whitespace-nowrap shrink-0 ${
              currentTheme === 'dark' ? 'border-gray-700' : 'border-gray-300'
            }`}
          >
            <FaFolderPlus /> Add Playlist
          </button>

          <button
            onClick={handleExport}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 border-dashed text-gray-700 hover:text-green-500 hover:border-green-400 transition-colors font-bold whitespace-nowrap shrink-0 ${
              currentTheme === 'dark' ? 'border-gray-700' : 'border-gray-300'
            }`}
            title="Create Spotify Playlist"
          >
            <FaShareSquare /> Export
          </button>
        </div>
      </div>

      {/* --- GRID --- */}
      {jams.length === 0 ? (
        <div className={`${theme.colors.bgCard} rounded-2xl p-12 text-center shadow-lg border-2 border-dashed border-gray-200 dark:border-gray-800`}>
          <div className="text-6xl mb-4 text-gray-300">🎧</div>
          <p className={`text-xl font-bold ${theme.colors.textMuted}`}>
              {activeFilterId === 'all' ? 'No jams posted yet' : 'This playlist is empty'}
          </p>
          <p className={theme.colors.textMuted}>
              {activeFilterId === 'all' ? 'Be the first to share a song!' : 'Drag songs here to fill it up!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
          <AnimatePresence mode="popLayout">
            {jams.map((jam) => (
              <motion.div
                key={jam.id}
                className="h-full"
                layout 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", damping: 20, stiffness: 100 }}
              >
                <JamCard 
                  jam={jam} 
                  onDelete={deleteJam} 
                  onPlayVideo={handlePlaySingle} 
                  onToggleLike={toggleLike} 
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AddJamModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddJam={addJam}
      />

      {/* --- PLAYER MODAL --- */}
      <AnimatePresence>
        {isPlaying && currentTrack && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-[70] flex flex-col items-center justify-center p-4"
          >
            {/* Close Button */}
            <button
                onClick={() => setIsPlaying(false)}
                className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors bg-white/10 p-3 rounded-full z-50"
            >
                <FaTimes size={24} />
            </button>

            {/* Video Container */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className={`w-full max-w-4xl relative shadow-2xl rounded-2xl overflow-hidden bg-black ${youtubeId ? 'aspect-video' : 'max-w-xl'}`}
            >
              
              {/* YOUTUBE: Smart Component (Auto-Advances) */}
              {youtubeId && (
                  <YouTube
                    videoId={youtubeId}
                    opts={{
                      height: '100%',
                      width: '100%',
                      playerVars: {
                        autoplay: 1, 
                        rel: 0, 
                      },
                    }}
                    onEnd={playNext} // Auto-play next song
                    className="absolute inset-0 w-full h-full"
                  />
              )}

              {/* SPOTIFY: Iframe Fallback */}
              {spotifyId && (
                  <iframe 
                    style={{borderRadius: "12px"}} 
                    src={`https://open.spotify.com/embed/track/${spotifyId}?utm_source=generator&theme=0`} 
                    width="100%" 
                    height="352" 
                    frameBorder="0" 
                    allowFullScreen="" 
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                    loading="lazy"
                  ></iframe>
              )}
            </motion.div>

            {/* Controls */}
            <div className="mt-8 flex items-center gap-8">
                <button 
                    onClick={playPrev} 
                    disabled={currentIndex === 0}
                    className="text-white hover:text-purple-400 disabled:opacity-30 disabled:hover:text-white transition-colors p-4"
                >
                    <FaStepBackward size={32} />
                </button>

                <div className="text-center text-white">
                    <p className="font-bold text-lg line-clamp-1 max-w-[200px]">{currentTrack.title}</p>
                    <p className="text-sm text-gray-400 line-clamp-1">{currentTrack.artist}</p>
                </div>

                <button 
                    onClick={playNext} 
                    disabled={currentIndex === queue.length - 1}
                    className="text-white hover:text-purple-400 disabled:opacity-30 disabled:hover:text-white transition-colors p-4"
                >
                    <FaStepForward size={32} />
                </button>
            </div>

            {/* Counter */}
            <div className="mt-4 text-gray-500 text-sm font-medium bg-white/10 px-4 py-1 rounded-full">
                {currentIndex + 1} / {queue.length}
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </DndProvider>
  );
}
