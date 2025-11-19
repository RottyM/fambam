'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useMemories } from '@/hooks/useFirebase';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import UserAvatar from '@/components/UserAvatar';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUpload, FaHeart, FaTimes, FaComment, FaLock, FaUnlock, FaTrash } from 'react-icons/fa';
import { storage, db, functions } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc, collection, serverTimestamp, updateDoc, doc, arrayUnion, arrayRemove, onSnapshot, query, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { format } from 'date-fns';

function MemoriesContent() {
  const { memories, loading } = useMemories();
  const { user, userData } = useAuth();
  const { getMemberById } = useFamily();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [caption, setCaption] = useState('');
  const [revealDate, setRevealDate] = useState('');
  const [isTimeCapsule, setIsTimeCapsule] = useState(false);
  const [showTimeCapsules, setShowTimeCapsules] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  // Filter memories based on reveal date
  const today = new Date();
  const visibleMemories = memories.filter(m =>
    !m.revealDate || new Date(m.revealDate.seconds * 1000) <= today
  );
  const lockedMemories = memories.filter(m =>
    m.revealDate && new Date(m.revealDate.seconds * 1000) > today
  );

  // Load comments for selected memory
  useEffect(() => {
    if (!selectedMemory || !userData?.familyId) return;

    const commentsRef = collection(
      db,
      'families',
      userData.familyId,
      'memories',
      selectedMemory.id,
      'comments'
    );

    const q = query(commentsRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setComments(commentsData);
    });

    return unsubscribe;
  }, [selectedMemory, userData?.familyId]);

  const onDrop = async (acceptedFiles) => {
    if (!userData?.familyId) return;

    setUploading(true);

    for (const file of acceptedFiles) {
      try {
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        const storageRef = ref(storage, `families/${userData.familyId}/memories/${fileName}`);

        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);

        const memoryData = {
          uploadedBy: user.uid,
          caption: caption || '',
          storagePath: storageRef.fullPath,
          downloadURL: downloadURL,
          mimeType: file.type,
          uploadedAt: serverTimestamp(),
          likes: [],
        };

        // Add time capsule data if enabled
        if (isTimeCapsule && revealDate) {
          memoryData.revealDate = new Date(revealDate);
          memoryData.isTimeCapsule = true;
        }

        await addDoc(collection(db, 'families', userData.familyId, 'memories'), memoryData);

        toast.success(isTimeCapsule ? 'Time Capsule created! 🔒' : 'Memory added! 📸');
      } catch (error) {
        console.error('Upload error:', error);
        toast.error('Failed to upload');
      }
    }

    setUploading(false);
    setCaption('');
    setRevealDate('');
    setIsTimeCapsule(false);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.avi'],
    },
  });

  const toggleLike = async (memoryId, currentLikes) => {
    const userId = user.uid;
    const isLiked = currentLikes?.includes(userId);

    try {
      await updateDoc(
        doc(db, 'families', userData.familyId, 'memories', memoryId),
        {
          likes: isLiked ? arrayRemove(userId) : arrayUnion(userId),
        }
      );
    } catch (error) {
      toast.error('Failed to update like');
    }
  };

  const addComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedMemory) return;

    try {
      await addDoc(
        collection(db, 'families', userData.familyId, 'memories', selectedMemory.id, 'comments'),
        {
          userId: user.uid,
          userName: userData.displayName,
          text: newComment,
          createdAt: serverTimestamp(),
        }
      );

      setNewComment('');
      toast.success('Comment added! 💬');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const handleDelete = async (memoryId, storagePath) => {
    if (!window.confirm('Are you sure you want to delete this memory forever?')) return;
    
    setDeleting(memoryId);

    try {
      const deleteMemory = httpsCallable(functions, 'deleteMemory');
      await deleteMemory({ familyId: userData.familyId, memoryId, storagePath });
      toast.success('Memory deleted');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(`Failed to delete memory: ${error.message}`);
    } finally {
      setDeleting(null);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📸</div>
          <p className="text-xl font-bold text-purple-600">Loading memories...</p>
        </div>
      </div>
    );
  }

  const displayMemories = showTimeCapsules ? lockedMemories : visibleMemories;

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display font-bold mb-2">
            <span className="gradient-text">Memory Vault</span>
          </h1>
          <p className="text-gray-600 font-semibold">
            {visibleMemories.length} memories
            {lockedMemories.length > 0 && ` • ${lockedMemories.length} time capsules 🔒`}
          </p>
        </div>

        {lockedMemories.length > 0 && (
          <button
            onClick={() => setShowTimeCapsules(!showTimeCapsules)}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-2xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg flex items-center gap-2"
          >
            {showTimeCapsules ? <FaUnlock /> : <FaLock />}
            {showTimeCapsules ? 'Show Memories' : 'View Time Capsules'}
          </button>
        )}
      </div>

      {/* Upload Area */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        {...getRootProps()}
        className={`mb-8 p-12 border-4 border-dashed rounded-3xl text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-purple-500 bg-purple-50'
            : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'
        }`}
      >
        <input {...getInputProps()} />
        <FaUpload className="text-6xl text-purple-400 mx-auto mb-4" />
        <p className="text-xl font-bold text-gray-700 mb-2">
          {uploading ? 'Uploading...' : isDragActive ? 'Drop it here!' : 'Drop photos/videos or click to upload'}
        </p>
        <p className="text-gray-500">Share your family moments 📸</p>

        {/* Time Capsule Option */}
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-center gap-3">
            <input
              type="checkbox"
              id="timecapsule"
              checked={isTimeCapsule}
              onChange={(e) => {
                e.stopPropagation();
                setIsTimeCapsule(e.target.checked);
              }}
              className="w-5 h-5 rounded"
            />
            <label htmlFor="timecapsule" className="font-bold text-purple-600 cursor-pointer">
              🔒 Create Time Capsule (reveal on future date)
            </label>
          </div>

          {isTimeCapsule && (
            <div onClick={(e) => e.stopPropagation()}>
              <input
                type="date"
                value={revealDate}
                onChange={(e) => setRevealDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
                className="px-4 py-2 rounded-xl border-2 border-purple-300 focus:border-purple-500 focus:outline-none font-semibold"
              />
            </div>
          )}
        </div>
      </motion.div>

      {/* Time Capsule View Banner */}
      {showTimeCapsules && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl p-6 text-center"
        >
          <p className="text-2xl font-bold mb-2">🔒 Time Capsules</p>
          <p className="opacity-90">These memories will be revealed on their scheduled dates</p>
        </motion.div>
      )}

      {/* Memories Grid */}
      {displayMemories.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-lg">
          <div className="text-6xl mb-4">{showTimeCapsules ? '🔒' : '📸'}</div>
          <p className="text-xl font-bold text-gray-600">
            {showTimeCapsules ? 'No time capsules yet' : 'No memories yet'}
          </p>
          <p className="text-gray-500">
            {showTimeCapsules
              ? 'Create a time capsule to reveal memories on future dates'
              : 'Upload your first photo or video above!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayMemories.map(memory => {
            const uploader = getMemberById(memory.uploadedBy);
            const isLiked = memory.likes?.includes(user.uid);
            const isVideo = memory.mimeType?.startsWith('video/');

            return (
              <motion.div
                key={memory.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all cursor-pointer"
                onClick={() => setSelectedMemory(memory)}
              >
                <div className="relative h-64">
                  {isVideo ? (
                    <video
                      src={memory.downloadURL}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Image
                      src={memory.downloadURL}
                      alt={memory.caption || 'Memory'}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  )}

                  {/* Time Capsule Badge */}
                  {memory.isTimeCapsule && (
                    <div className="absolute top-3 right-3 bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 shadow-lg">
                      <FaLock />
                      {format(new Date(memory.revealDate.seconds * 1000), 'MMM d, yyyy')}
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    {uploader && <UserAvatar user={uploader} size={32} />}
                    <div className="flex-1">
                      <p className="font-bold text-sm text-gray-800">
                        {uploader?.displayName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {memory.uploadedAt?.toDate?.()
                          ? format(memory.uploadedAt.toDate(), 'MMM d, yyyy')
                          : 'Recently'}
                      </p>
                    </div>
                  </div>

                  {memory.caption && (
                    <p className="text-gray-700 mb-3">{memory.caption}</p>
                  )}

                  <div className="flex items-center gap-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(memory.id, memory.likes || []);
                      }}
                      className={`flex items-center gap-2 transition-all ${
                        isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                      }`}
                    >
                      <FaHeart className={isLiked ? 'animate-pulse' : ''} />
                      <span className="text-sm font-bold">
                        {memory.likes?.length || 0}
                      </span>
                    </button>

                    <div className="flex items-center gap-2 text-gray-400">
                      <FaComment />
                      <span className="text-sm font-bold">Comments</span>
                    </div>

                    {/* Add Delete Button */}
                    {memory.uploadedBy === user.uid && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(memory.id, memory.storagePath);
                        }}
                        disabled={deleting === memory.id}
                        className="ml-auto text-gray-400 hover:text-red-500 transition-all disabled:opacity-50"
                      >
                        {deleting === memory.id ? (
                          <span className="animate-spin text-sm">Deleting...</span>
                        ) : (
                          <FaTrash />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Memory Detail Modal with Comments */}
      <AnimatePresence>
        {selectedMemory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={() => setSelectedMemory(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl my-8"
            >
              <div className="relative">
                {/* Close button */}
                <button
                  onClick={() => setSelectedMemory(null)}
                  className="absolute top-4 right-4 bg-white/90 backdrop-blur text-gray-800 p-3 rounded-full hover:bg-white transition-all shadow-lg z-10"
                >
                  <FaTimes />
                </button>

                {/* Image/Video */}
                <div className="relative h-96">
                  {selectedMemory.mimeType?.startsWith('video/') ? (
                    <video
                      src={selectedMemory.downloadURL}
                      controls
                      className="w-full h-full object-contain bg-black rounded-t-3xl"
                    />
                  ) : (
                    <Image
                      src={selectedMemory.downloadURL}
                      alt={selectedMemory.caption || 'Memory'}
                      fill
                      className="object-contain bg-black rounded-t-3xl"
                      unoptimized
                    />
                  )}
                </div>

                {/* Details */}
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <UserAvatar user={getMemberById(selectedMemory.uploadedBy)} size={48} />
                    <div>
                      <p className="font-bold text-gray-800">
                        {getMemberById(selectedMemory.uploadedBy)?.displayName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {selectedMemory.uploadedAt?.toDate?.()
                          ? format(selectedMemory.uploadedAt.toDate(), 'MMMM d, yyyy • h:mm a')
                          : 'Recently'}
                      </p>
                    </div>

                    {selectedMemory.isTimeCapsule && (
                      <div className="ml-auto bg-purple-100 text-purple-700 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2">
                        <FaLock />
                        Revealed on {format(new Date(selectedMemory.revealDate.seconds * 1000), 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>

                  {selectedMemory.caption && (
                    <p className="text-gray-700 mb-4 text-lg">{selectedMemory.caption}</p>
                  )}

                  {/* Likes */}
                  <button
                    onClick={() => toggleLike(selectedMemory.id, selectedMemory.likes || [])}
                    className={`flex items-center gap-2 text-lg font-bold transition-all mb-6 ${
                      selectedMemory.likes?.includes(user.uid)
                        ? 'text-red-500'
                        : 'text-gray-400 hover:text-red-500'
                    }`}
                  >
                    <FaHeart className="text-2xl" />
                    {selectedMemory.likes?.length || 0} {(selectedMemory.likes?.length || 0) === 1 ? 'like' : 'likes'}
                  </button>

                  {/* Comments Section */}
                  <div className="border-t-2 border-gray-100 pt-6">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <FaComment />
                      Comments ({comments.length})
                    </h3>

                    {/* Comments List */}
                    <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                      {comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <UserAvatar user={getMemberById(comment.userId)} size={32} />
                          <div className="flex-1 bg-gray-50 rounded-2xl p-3">
                            <p className="font-bold text-sm text-gray-800">{comment.userName}</p>
                            <p className="text-gray-700">{comment.text}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {comment.createdAt?.toDate?.()
                                ? format(comment.createdAt.toDate(), 'MMM d • h:mm a')
                                : 'Just now'}
                            </p>
                          </div>
                        </div>
                      ))}

                      {comments.length === 0 && (
                        <p className="text-center text-gray-400 py-8">
                          No comments yet. Be the first to comment!
                        </p>
                      )}
                    </div>

                    {/* Add Comment Form */}
                    <form onSubmit={addComment} className="flex gap-3">
                      <UserAvatar user={userData} size={40} />
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="flex-1 px-4 py-3 rounded-full border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                      />
                      <button
                        type="submit"
                        disabled={!newComment.trim()}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-full font-bold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg disabled:opacity-50"
                      >
                        Post
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function MemoriesPage() {
  return (
    <DashboardLayout>
      <MemoriesContent />
    </DashboardLayout>
  );
}
