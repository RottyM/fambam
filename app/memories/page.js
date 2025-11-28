'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useMemories, useMemoriesFolders } from '@/hooks/useFirestore';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useConfirmation } from '@/contexts/ConfirmationContext';
import UserAvatar from '@/components/UserAvatar';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUpload, FaHeart, FaTimes, FaComment, FaLock, FaUnlock, FaTrash, FaFolder, FaFolderOpen, FaFolderPlus, FaFilter, FaChevronUp, FaChevronDown } from 'react-icons/fa';
import { storage, db, functions } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc, collection, serverTimestamp, updateDoc, doc, arrayUnion, arrayRemove, onSnapshot, query, orderBy, deleteDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import FolderView from '@/components/FolderView'; // Make sure this path is correct
import MemoriesGrid from '@/components/MemoriesGrid';
import { format } from 'date-fns';
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
function MemoryFilterPill({
  label,
  count,
  icon: Icon,
  isActive,
  onClick,
  showDelete = false,
  onDelete,
  isOver = false, // New prop for visual feedback
}) {
  const { theme, currentTheme } = useTheme();

  let bgColor = isActive ? 'bg-purple-500 text-white' : theme.colors.bgCard;
  let borderColor = isActive ? 'border-purple-500' : theme.colors.border;
  
  if (isOver) {
    bgColor = 'bg-green-400 dark:bg-green-600';
    borderColor = 'border-green-500';
  }

  const hoverClasses = !isActive && !isOver ? 'hover:border-gray-300 dark:hover:border-gray-600' : '';
  const iconColor = isActive || isOver ? 'text-white' : theme.colors.textLight;
  const countColor = isActive || isOver ? 'text-purple-200' : theme.colors.textMuted;

  return (
    <div className="relative group shrink-0">
      <button
        onClick={onClick}
        className={`relative flex items-center gap-2 px-4 py-2 pr-8 rounded-full border-2 transition-all whitespace-nowrap shadow-sm ${bgColor} ${borderColor} ${hoverClasses}`}
      >
        {Icon && <Icon className={iconColor} />}
        <span className={`font-bold ${isActive || isOver ? 'text-white' : theme.colors.text}`}>{label}</span>
        {count !== undefined && (
          <span className={`text-xs ${countColor}`}>({count})</span>
        )}
      </button>

      {showDelete && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md hover:bg-red-600 z-10"
        >
          <FaTimes size={10} />
        </motion.button>
      )}
    </div>
  );
}

function DroppableFolderPill(props) {
  const { setNodeRef, isOver } = useDroppable({
    id: props.folderId,
    data: {
      type: 'FOLDER',
      accepts: ['MEMORY'],
    },
  });

  return (
    <div ref={setNodeRef}>
      <MemoryFilterPill {...props} isOver={isOver} />
    </div>
  );
}


function MemoriesContent() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const { memories, loading: loadingMemories, updateMemory } = useMemories();
  const { folders, loading: loadingFolders, addFolder, deleteFolder } = useMemoriesFolders();
  const { getMemberById, isParent } = useFamily();
  const { theme, currentTheme } = useTheme();
  const { showConfirmation } = useConfirmation();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [caption, setCaption] = useState('');
  const [revealDate, setRevealDate] = useState('');
  const [isTimeCapsule, setIsTimeCapsule] = useState(false);
  const [showTimeCapsules, setShowTimeCapsules] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [activeFilterId, setActiveFilterId] = useState('all'); // 'all' | 'root' | folderId
  const [folderView, setFolderView] = useState({ isOpen: false, memories: [], initialIndex: 0, detailsOpen: false });
  const [uploadAreaExpanded, setUploadAreaExpanded] = useState(false);
  const [activeId, setActiveId] = useState(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Combine loading states
  const loading = authLoading || loadingMemories || loadingFolders;

  const currentFolder = activeFilterId === 'all' || activeFilterId === 'root'
    ? null
    : folders.find(f => f.id === activeFilterId) || null;

  // Filter memories based on reveal date and current folder
  const today = new Date();
  const filteredMemories = memories.filter(m => {
    const isVisible = !m.revealDate || new Date(m.revealDate.seconds * 1000) <= today;
    const matchesFolder =
      activeFilterId === 'all'
        ? true
        : activeFilterId === 'root'
          ? !m.folderId
          : m.folderId === activeFilterId;
    return isVisible && matchesFolder;
  });

  const visibleMemories = filteredMemories.filter(m => !m.isTimeCapsule);
  const lockedMemories = filteredMemories.filter(m => m.isTimeCapsule);
  const unsortedCount = memories.filter(m => !m.folderId).length;
  const totalMemoriesCount = memories.length;
  
  const folderCounts = folders.reduce((acc, folder) => {
    acc[folder.id] = memories.filter(m => m.folderId === folder.id).length;
    return acc;
  }, {});

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
          folderId: currentFolder?.id || null, // Assign to current folder or null for root
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
      console.error('Error updating like:', error);
      toast.error('Failed to update like');
    }  };

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

  const handleDeleteComment = (commentId) => {
    showConfirmation({
      title: 'Delete Comment',
      message: 'Are you sure you want to permanently delete this comment?',
      onConfirm: async () => {
        try {
          const commentRef = doc(
            db,
            'families',
            userData.familyId,
            'memories',
            selectedMemory.id,
            'comments',
            commentId
          );
          await deleteDoc(commentRef);
          toast.success('Comment deleted');
        } catch (error) {
          console.error('Error deleting comment:', error);
          toast.error('Failed to delete comment');
        }
      },
    });
  };

  const handleDelete = (memoryId, storagePath) => {
    showConfirmation({
      title: 'Delete Memory',
      message: 'Are you sure you want to delete this memory forever? This action cannot be undone.',
      onConfirm: async () => {
        setDeleting(memoryId);
        try {
          const deleteMemory = httpsCallable(functions, 'deleteMemory');
          await deleteMemory({ familyId: userData.familyId, memoryId, storagePath });
          toast.success('Memory deleted');
          // Close FolderView and reset selected memory after successful deletion
          setFolderView({ isOpen: false, memories: [], initialIndex: 0, detailsOpen: false });
          setSelectedMemory(null);
        } catch (error) {
          console.error('Delete error:', error);
          toast.error(`Failed to delete memory: ${error.message}`);
        } finally {
          setDeleting(null);
        }
      },
    });
  };

  const handleMoveMemory = async (memoryId, newFolderId) => {
    try {
      await updateMemory(memoryId, { folderId: newFolderId });
      toast.success('Memory moved!');
    } catch (error) {
      console.error('Error moving memory:', error);
      toast.error('Failed to move memory');
    }
  };

  const handleMoveMemories = async (memoryIds, newFolderId) => {
    if (!memoryIds || memoryIds.length === 0) return;

    const movePromises = memoryIds.map(id => updateMemory(id, { folderId: newFolderId }));

    try {
      await Promise.all(movePromises);
      toast.success(`Moved ${memoryIds.length} memories!`);
    } catch (error) {
      console.error('Error moving memories:', error);
      toast.error('Failed to move memories');
    }
  };

  const handleAddFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      await addFolder({
        name: newFolderName,
      });
      setNewFolderName('');
      setShowAddFolderModal(false);
      toast.success('Folder created!');
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
    }
  };

  const handleDeleteFolder = (folderId, folderName) => {
    const message = isParent()
      ? `As a parent, you can delete this folder "${folderName}". Memories inside it will return to the main vault. Are you sure?`
      : `Deleting folder "${folderName}" will NOT delete the memories inside it. They will return to the main vault. Are you sure?`;

    showConfirmation({
      title: `Delete Folder "${folderName}"?`,
      message: message,
      onConfirm: async () => {
        try {
          await deleteFolder(folderId);
          // If the deleted folder was the current one, reset to root
          if (currentFolder?.id === folderId) {
            setActiveFilterId('all');
          }
          toast.success('Folder deleted!');
        } catch (error) {
          console.error('Error deleting folder:', error);
          toast.error('Failed to delete folder');
        }
      },
    });
  };

  const openFolderView = (clickedMemory, { openDetails = false } = {}) => {
    const memoriesToShow = filteredMemories;
    const initialIndex = memoriesToShow.findIndex(m => m.id === clickedMemory.id);
    setSelectedMemory(clickedMemory);
    setFolderView({
      isOpen: true,
      memories: memoriesToShow,
      initialIndex: initialIndex >= 0 ? initialIndex : 0,
      detailsOpen: openDetails,
    });
  };

  // --- DND-Kit Setup ---
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 150, // slightly shorter hold
        tolerance: 20, // less sideways drift needed before committing to drag
      },
    }),
    useSensor(KeyboardSensor, {})
  );

  function handleDragStart(event) {
    setActiveId(event.active.id);
  }

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    
    console.log('Drag ended. Active ID:', active.id, 'Over ID:', over?.id);

    const isMemory = active.data.current?.type === 'MEMORY';
    const isFolder = over?.data.current?.type === 'FOLDER';

    if (isMemory && isFolder) {
      const memoryId = active.id;
      const folderId = over.id === 'root' ? null : over.id; // Convert 'root' to null for un-foldering
      
      console.log(`Attempting to move memory ${memoryId} to folder ${folderId}`);

      const memory = memories.find(m => m.id === memoryId);
      
      // Prevent moving to the same folder or to an invalid folder
      const currentFolderId = memory.folderId || 'root'; // Treat null folderId as 'root' for comparison
      if (memory && currentFolderId !== over.id) { // Compare against over.id directly
        handleMoveMemory(memoryId, folderId);
      } else {
        console.log(`Memory ${memoryId} is already in folder ${folderId} or invalid drop.`);
      }
    }
  };
  
  function handleDragCancel() {
    setActiveId(null);
    console.log('Drag cancelled.');
  }

  if (loading || !user) {
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
    <DndContext 
      sensors={sensors} 
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-2">
            <span className={currentTheme === 'dark' ? 'text-purple-400' : 'gradient-text'}>
              {currentTheme === 'dark' ? 'Archives' : 'Memory Vault'}
            </span>
          </h1>
          <p className={`font-semibold ${currentTheme === 'dark' ? 'text-gray-300' : 'text-black'}`}>
            {filteredMemories.length} memories
            {lockedMemories.length > 0 && ` • ${lockedMemories.length} time capsules 🔒`}
          </p>
        </div>

        <div className="flex gap-3 items-start">
        <button
          onClick={() => setUploadAreaExpanded(!uploadAreaExpanded)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all shadow-sm ${
            currentTheme === 'dark'
              ? 'bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          <FaUpload />
          <span className="hidden md:inline">Show upload</span>
          {uploadAreaExpanded ? <FaChevronUp /> : <FaChevronDown />}
        </button>
          {lockedMemories.length > 0 && (
            <button
              onClick={() => setShowTimeCapsules(!showTimeCapsules)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 md:px-6 py-3 rounded-2xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg flex items-center gap-2"
              aria-label={showTimeCapsules ? 'Show Memories' : 'View Time Capsules'}
            >
              {showTimeCapsules ? <FaUnlock /> : <FaLock />}
              <span className="hidden md:inline">
                {showTimeCapsules ? 'Show Memories' : 'View Time Capsules'}
              </span>
            </button>
          )}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        {uploadAreaExpanded && (
          <div className="overflow-hidden transition-all duration-300">
            <div
              {...getRootProps()}
              className="p-4 md:p-8 lg:p-12 border-4 border-dashed rounded-3xl text-center cursor-pointer transition-all hover:border-purple-400 hover:bg-purple-50"
            >
              <input {...getInputProps()} />
              <FaUpload className="text-4xl md:text-6xl text-purple-400 mx-auto mb-2 md:mb-4" />
              <p className="text-lg md:text-xl font-bold text-gray-700 mb-1 md:mb-2">
                {uploading ? 'Uploading...' : isDragActive ? 'Drop it here!' : 'Drop photos/videos or tap to upload'}
              </p>
              <p className="text-sm md:text-base text-gray-500">Share your family moments ✨</p>

              <div className="mt-4 md:mt-6 space-y-3 md:space-y-4">
                <div className="flex items-center justify-center gap-2 md:gap-3">
                  <input
                    type="checkbox"
                    id="timecapsule"
                    checked={isTimeCapsule}
                    onChange={(e) => {
                      e.stopPropagation();
                      setIsTimeCapsule(e.target.checked);
                    }}
                    className="w-4 h-4 md:w-5 md:h-5 rounded"
                  />
                  <label htmlFor="timecapsule" className="font-bold text-purple-600 cursor-pointer text-sm md:text-base">
                    🕰️ Create Time Capsule (reveal on future date)
                  </label>
                </div>

                {isTimeCapsule && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <input
                      type="date"
                      value={revealDate}
                      onChange={(e) => setRevealDate(e.target.value)}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      className="px-3 py-2 md:px-4 md:py-2 rounded-xl border-2 border-purple-300 focus:border-purple-500 focus:outline-none font-semibold text-sm md:text-base"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Folders List - Horizontal Scrollable */}
      <div className="mb-6">
        <h3 className={`text-lg font-bold flex items-center gap-2 mb-3 ${
          currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-800'
        }`}>
          <FaFolder className={currentTheme === 'dark' ? 'text-gray-400' : 'text-black'} /> 
          Folders ({folders.length})
        </h3>
        <div className="mb-2 flex items-center gap-3 overflow-x-auto custom-scrollbar pb-4 pt-2 px-1 scroll-smooth">
          <div className="flex gap-3 shrink-0">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
            >
              <MemoryFilterPill
                label="All Memories"
                count={totalMemoriesCount}
                icon={FaFilter}
                isActive={activeFilterId === 'all'}
                onClick={() => setActiveFilterId('all')}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
            >
              <DroppableFolderPill
                folderId="root"
                label="Unsorted"
                count={unsortedCount}
                icon={FaFolderOpen}
                isActive={activeFilterId === 'root'}
                onClick={() => setActiveFilterId('root')}
              />
            </motion.div>

            {folders.map(folder => (
              <motion.div
                key={folder.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
              >
                <DroppableFolderPill
                  folderId={folder.id}
                  label={folder.name}
                  count={folderCounts[folder.id] || 0}
                  icon={FaFolder}
                  isActive={activeFilterId === folder.id}
                  onClick={() => setActiveFilterId(folder.id)}
                  showDelete={isParent()}
                  onDelete={() => handleDeleteFolder(folder.id, folder.name)}
                />
              </motion.div>
            ))}

            {isParent() && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
              >
                <button
                  onClick={() => setShowAddFolderModal(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 border-dashed text-black hover:text-purple-600 hover:border-purple-500 transition-colors font-bold whitespace-nowrap shrink-0 ${currentTheme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`}
                >
                  <FaFolderPlus /> Add Folder
                </button>
              </motion.div>
            )}
          </div>
        </div>
        {folders.length === 0 && ( // Display message only if no folders AND not adding one
          <p className="text-gray-500 italic text-sm mt-2 ml-1">No folders yet. Create one above!</p>
        )}
      </div>
      
      {/* Memories Grid */}
      {displayMemories.length === 0 ? (
        <div className={`${theme.colors.bgCard} rounded-2xl p-12 text-center shadow-lg`}>
          <div className="text-6xl mb-4">{showTimeCapsules ? '🔒' : '📸'}</div>
          <p className={`text-xl font-bold ${theme.colors.textMuted}`}>
            {showTimeCapsules ? 'No time capsules yet' : 'No memories yet'}
          </p>
          <p className={theme.colors.textMuted}>
            {showTimeCapsules
              ? 'Create a time capsule to reveal memories on future dates'
              : 'Upload your first photo or video above!'}
          </p>
        </div>
      ) : (
        <MemoriesGrid 
          memories={displayMemories}
          onOpen={openFolderView}
          onMove={handleMoveMemories}
          folders={folders}
          isParent={isParent()}
          activeId={activeId}
        />
      )}
      {/* Add Folder Modal */}
      <AnimatePresence>
        {showAddFolderModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4"
            onClick={() => setShowAddFolderModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className={`${theme.colors.bgCard} rounded-3xl p-6 max-w-md w-full shadow-2xl my-8 max-h-[95vh] overflow-y-auto`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-display font-bold gradient-text">
                  <FaFolder className="inline-block mr-2" /> New Folder
                </h2>
                <button
                  onClick={() => setShowAddFolderModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <FaTimes size={24} />
                </button>
              </div>

              <form onSubmit={handleAddFolder} className="space-y-4">
                <div>
                  <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
                    Folder Name
                  </label>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="e.g., Summer Vacation 2023"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                    required
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddFolderModal(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-500 to-teal-500 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-600 hover:to-teal-600 transition-all shadow-lg"
                  >
                    Create Folder
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      <FolderView
        isOpen={folderView.isOpen}
        onClose={() => {
          setFolderView({ isOpen: false, memories: [], initialIndex: 0, detailsOpen: false });
          setSelectedMemory(null);
        }}
        memories={folderView.memories}
        initialIndex={folderView.initialIndex}
        detailsOpen={folderView.detailsOpen}
        getMemberById={getMemberById}
        onMemoryChange={(memory) => setSelectedMemory(memory)}
        onToggleLike={toggleLike}
        currentUserId={user?.uid}
        comments={comments}
        newComment={newComment}
        onChangeNewComment={setNewComment}
        onSubmitComment={addComment}
        onDeleteComment={handleDeleteComment}
        isParent={isParent}
        folders={folders}
        onMoveMemory={handleMoveMemory}
        onDeleteMemory={handleDelete}
      />
    </DndContext>
  );
}

export default function MemoriesPage() {
  return (
    <DashboardLayout>
      <MemoriesContent />
    </DashboardLayout>
  );
}


