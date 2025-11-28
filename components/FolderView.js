'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { FaTimes, FaChevronLeft, FaChevronRight, FaHeart, FaComment, FaChevronDown, FaLock, FaTrash, FaFolder } from 'react-icons/fa';
import Image from 'next/image';
import UserAvatar from './UserAvatar';
import { format } from 'date-fns';

export default function FolderView({
  isOpen,
  onClose,
  memories,
  initialIndex,
  detailsOpen = false,
  getMemberById,
  onMemoryChange,
  onToggleLike,
  currentUserId,
  comments = [],
  newComment,
  onChangeNewComment,
  onSubmitComment,
  onDeleteComment,
  isParent,
  folders = [],
  onMoveMemory,
  onDeleteMemory, // <-- ADDED THIS PROP
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isDetailsOpen, setIsDetailsOpen] = useState(detailsOpen);
  const [showChrome, setShowChrome] = useState(detailsOpen);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);



  useEffect(() => {
    setIsDetailsOpen(detailsOpen);
    setShowChrome(detailsOpen);
  }, [detailsOpen, isOpen]);

  const handleNext = () => {
    setCurrentIndex((prevIndex) => {
      const nextIndex = (prevIndex + 1) % memories.length;
      onMemoryChange?.(memories[nextIndex]);
      setIsDetailsOpen(false);
      setShowChrome(false);
      return nextIndex;
    });
  };

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => {
      const nextIndex = (prevIndex - 1 + memories.length) % memories.length;
      onMemoryChange?.(memories[nextIndex]);
      setIsDetailsOpen(false);
      setShowChrome(false);
      return nextIndex;
    });
  };

  const handlers = useSwipeable({
    onSwipedLeft: handleNext,
    onSwipedRight: handlePrev,
    preventScrollOnSwipe: true,
    trackMouse: true,
  });

  if (!isOpen || memories.length === 0) {
    return null;
  }

  const currentMemory = memories[currentIndex];
  const uploader = getMemberById(currentMemory.uploadedBy);
  const isVideo = currentMemory.mimeType?.startsWith('video/');
  const isLiked = currentMemory.likes?.includes(currentUserId);
  const revealDate = currentMemory.revealDate?.seconds
    ? new Date(currentMemory.revealDate.seconds * 1000)
    : null;
  const isParentUser = isParent?.();
  const canDelete = isParentUser || currentMemory.uploadedBy === currentUserId;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          style={{ touchAction: 'pan-y' }} // allow horizontal swipes on mobile
          {...handlers}
        >
          <div
            className="absolute inset-0"
            onClick={() => {
              setShowChrome((prev) => !prev);
            }}
          />

          <div className="relative w-full h-full flex flex-col max-w-6xl mx-auto">
            {/* Top chrome */}
            {showChrome && (
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
                <div className="bg-white/10 text-white px-3 py-2 rounded-full text-sm font-semibold backdrop-blur">
                  {currentIndex + 1} / {memories.length}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowChrome(false);
                      setIsDetailsOpen(false);
                    }}
                    className="bg-white/10 text-white p-3 rounded-full hover:bg-white/20 transition-all backdrop-blur"
                    title="Hide chrome"
                  >
                    <FaChevronDown />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                    }}
                    className="bg-white/10 text-white p-3 rounded-full hover:bg-white/20 transition-all backdrop-blur"
                    title="Close"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
            )}

            {/* Media */}
            <div
              className="flex-1 relative flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                setShowChrome((prev) => !prev);
              }}
            >
              <div className="absolute inset-0">
                {isVideo ? (
                  <video
                    src={currentMemory.downloadURL}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Image
                    src={currentMemory.downloadURL}
                    alt={currentMemory.caption || 'Memory'}
                    fill
                    className="object-contain"
                    unoptimized
                    priority
                  />
                )}
              </div>
            </div>

            {/* Overlay controls near the media */}
            {showChrome && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-black/50 text-white px-4 py-2 rounded-full shadow-lg backdrop-blur">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLike?.(currentMemory.id, currentMemory.likes || []);
                  }}
                  className={`flex items-center gap-2 text-sm font-semibold ${
                    isLiked ? 'text-red-400' : 'text-white/80 hover:text-white'
                  }`}
                  aria-label="Like"
                >
                  <FaHeart className={isLiked ? 'animate-pulse' : ''} />
                  <span>{currentMemory.likes?.length || 0}</span>
                </button>
                <div className="h-5 w-px bg-white/30" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDetailsOpen(true);
                    setShowChrome(true);
                  }}
                  className="flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white"
                  aria-label="View comments"
                >
                  <FaComment />
                  <span>{comments.length}</span>
                </button>
                {canDelete && (
                  <>
                    <div className="h-5 w-px bg-white/30" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteMemory?.(currentMemory.id, currentMemory.storagePath);
                      }}
                      className="flex items-center text-sm font-semibold text-red-400 hover:text-red-500"
                      aria-label="Delete memory"
                    >
                      <FaTrash />
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Arrows */}
            <div className="pointer-events-none">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className="pointer-events-auto absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 text-white p-4 rounded-full hover:bg-white/20 transition-all z-20"
              >
                <FaChevronLeft />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="pointer-events-auto absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 text-white p-4 rounded-full hover:bg-white/20 transition-all z-20"
              >
                <FaChevronRight />
              </button>
            </div>

            {/* Details drawer */}
            <AnimatePresence>
              <motion.div
                initial={{ y: 400, opacity: 0 }}
                animate={{
                  y: isDetailsOpen ? 0 : 400,
                  opacity: isDetailsOpen ? 1 : 0,
                  pointerEvents: isDetailsOpen ? 'auto' : 'none',
                }}
                exit={{ y: 400, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 180, damping: 20 }}
                className="absolute bottom-0 left-0 right-0 bg-white text-gray-900 rounded-t-3xl shadow-2xl overflow-hidden z-30 max-w-3xl mx-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-full h-2 bg-gray-100" />
                <div className="p-5 md:p-6 max-h-[50vh] overflow-y-auto w-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {uploader && <UserAvatar user={uploader} size={40} />}
                      <div>
                        <p className="font-bold text-gray-900">{uploader?.displayName}</p>
                        <p className="text-xs text-gray-500">
                          {currentMemory.uploadedAt?.toDate?.()
                            ? format(currentMemory.uploadedAt.toDate(), 'MMM d, yyyy h:mm a')
                            : 'Recently'}
                        </p>
                      </div>
                    </div>
                    {/* Repositioned collapse button */}
                    <button
                      onClick={() => setIsDetailsOpen(false)}
                      className="absolute top-3 right-3 bg-gray-100/70 text-gray-700 p-2 rounded-full hover:bg-gray-200 transition-all backdrop-blur-sm"
                      title="Collapse"
                    >
                      <FaChevronDown />
                    </button>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {currentMemory.isTimeCapsule && revealDate && (
                      <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2">
                        <FaLock />
                        Reveals {format(revealDate, 'MMM d, yyyy')}
                      </span>
                    )}
                    <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-semibold">
                      {currentIndex + 1} of {memories.length}
                    </span>
                  </div>

                  {/* Caption */}
                  {currentMemory.caption && (
                    <p className="text-gray-800 mb-4 text-base leading-relaxed">
                      {currentMemory.caption}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-4 mb-6">
                    <button
                      onClick={() => onToggleLike?.(currentMemory.id, currentMemory.likes || [])}
                      className={`flex items-center gap-2 text-lg font-bold transition-all ${
                        isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                      }`}
                    >
                      <FaHeart className={isLiked ? 'animate-pulse' : ''} />
                      <span>{currentMemory.likes?.length || 0}</span>
                    </button>
                    <div className="text-sm text-gray-500">
                      Comments {comments.length}
                    </div>
                  </div>

                  {/* Comments */}
                  <div className="space-y-4 mb-6 max-h-56 overflow-y-auto pr-1">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <UserAvatar user={getMemberById(comment.userId)} size={32} />
                        <div className="flex-1 bg-gray-50 rounded-2xl p-3 flex justify-between items-start group">
                          <div>
                            <p className="font-bold text-sm text-gray-800">{comment.userName}</p>
                            <p className="text-gray-700 break-words">{comment.text}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {comment.createdAt?.toDate?.()
                                ? format(comment.createdAt.toDate(), 'MMM d h:mm a')
                                : 'Just now'}
                            </p>
                          </div>
                          {comment.userId === currentUserId && (
                            <button
                              onClick={() => onDeleteComment?.(comment.id)}
                              className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete comment"
                            >
                                <FaTrash size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {comments.length === 0 && (
                        <p className="text-center text-gray-400 py-8">
                          No comments yet. Be the first to comment!
                        </p>
                      )}
                    </div>

                    {/* Add Comment */}
                    <form onSubmit={onSubmitComment} className="flex gap-3">
                      <UserAvatar user={getMemberById(currentUserId)} size={40} />
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => onChangeNewComment?.(e.target.value)}
                        placeholder="Add a comment..."
                        className="flex-1 px-4 py-3 rounded-full border-2 border-gray-200 focus:border-purple-500 focus:outline-none font-semibold"
                      />
                      <button
                        type="submit"
                        disabled={!newComment?.trim()}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-full font-bold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg disabled:opacity-50"
                      >
                        Post
                      </button>
                    </form>

                    {canDelete && (
                      <div className="border-t border-gray-200 pt-5 mt-6">
                        <h4 className="text-lg font-bold mb-3 flex items-center gap-2">
                          <FaFolder />
                          Admin actions
                        </h4>
                        <div className="space-y-3">
                          <label className="block text-sm font-semibold text-gray-700">
                            Move to folder
                          </label>
                          <select
                            value={currentMemory.folderId || ''}
                            onChange={(e) => onMoveMemory?.(currentMemory.id, e.target.value || null)}
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold bg-white text-gray-900"
                          >
                            <option value="">All Memories (Root)</option>
                            {folders.map((folder) => (
                              <option key={folder.id} value={folder.id}>
                                {folder.name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => onDeleteMemory?.(currentMemory.id, currentMemory.storagePath)}
                            className="w-full bg-red-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-600 transition-all shadow-lg flex items-center justify-center gap-2"
                          >
                            <FaTrash /> Delete Memory
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
    </AnimatePresence>
  );
}
