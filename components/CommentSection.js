'use client';

import { useState, useEffect } from 'react';
import { FaTrash } from 'react-icons/fa';
import UserAvatar from './UserAvatar';
import { format } from 'date-fns';
import { db } from '@/lib/firebase';
import { getDocs, collection, query, orderBy, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useConfirmation } from '@/contexts/ConfirmationContext';
import toast from 'react-hot-toast';

export default function CommentSection({
  currentMemory,
  user,
  userData,
  getMemberById,
  currentUserId,
}) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const { showConfirmation } = useConfirmation();

  useEffect(() => {
    if (currentMemory?.id && userData?.familyId) {
      fetchComments();
    } else {
      setComments([]);
    }
  }, [currentMemory?.id, userData?.familyId]);

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const commentsRef = collection(
        db,
        'families',
        userData.familyId,
        'memories',
        currentMemory.id,
        'comments'
      );
      const q = query(commentsRef, orderBy('createdAt', 'asc'));
      const querySnapshot = await getDocs(q);
      const commentsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setComments(commentsData);
    } catch (error) {
      console.error("Error fetching comments: ", error);
      toast.error('Could not load comments.');
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !currentMemory) return;

    const optimisticComment = {
      id: `optimistic-${Date.now()}`,
      userId: user.uid,
      userName: userData.displayName,
      text: newComment,
      createdAt: new Date(),
    };

    try {
      setComments(prev => [...prev, optimisticComment]);
      setNewComment('');

      await addDoc(
        collection(db, 'families', userData.familyId, 'memories', currentMemory.id, 'comments'),
        {
          userId: user.uid,
          userName: userData.displayName,
          text: newComment,
          createdAt: serverTimestamp(),
        }
      );
      toast.success('Comment added! 💬');
      fetchComments();
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
      setComments(prev => prev.filter(c => c.id !== optimisticComment.id));
    }
  };

  const handleDeleteComment = (commentId) => {
    showConfirmation({
      title: 'Delete Comment',
      message: 'Are you sure you want to permanently delete this comment?',
      onConfirm: async () => {
        const originalComments = comments;
        setComments(prev => prev.filter(c => c.id !== commentId));
        try {
          const commentRef = doc(
            db,
            'families',
            userData.familyId,
            'memories',
            currentMemory.id,
            'comments',
            commentId
          );
          await deleteDoc(commentRef);
          toast.success('Comment deleted');
        } catch (error) {
          console.error('Error deleting comment:', error);
          toast.error('Failed to delete comment');
          setComments(originalComments);
        }
      },
    });
  };

  return (
    <>
      <div className="text-sm text-gray-500">
        Comments {comments.length}
      </div>

      <div className="space-y-4 mb-6 max-h-56 overflow-y-auto pr-1">
        {loadingComments ? (
            <p className="text-center text-gray-400 py-8">Loading comments...</p>
        ) : comments.length > 0 ? (
          comments.map((comment) => (
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
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete comment"
                  >
                      <FaTrash size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-400 py-8">
              No comments yet. Be the first to comment!
            </p>
          )}
        </div>

        <form onSubmit={handleAddComment} className="flex gap-3">
          <UserAvatar user={getMemberById(currentUserId)} size={40} />
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 px-4 py-3 rounded-full border-2 border-gray-200 dark:border-gray-700 focus:border-purple-500 focus:outline-none font-semibold bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={!newComment?.trim()}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-full font-bold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg disabled:opacity-50"
          >
            Post
          </button>
        </form>
    </>
  );
}
