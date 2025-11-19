'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCopy, FaCheck, FaSignOutAlt, FaTrash } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { doc, updateDoc, deleteDoc, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useNotifications } from '@/contexts/NotificationContext';

function SettingsContent() {
  const { user, signOut, userData } = useAuth();
  const { family, members, isParent } = useFamily();
  const { resetNotificationState } = useNotifications();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const familyInviteCode = userData?.familyId || '';
  const inviteLink = `${window.location.origin}/join?code=${familyInviteCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(familyInviteCode);
    setCopied(true);
    toast.success('Invite code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success('Invite link copied!');
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const handleRemoveMember = async (memberId) => {
    if (!isParent() || memberId === userData?.uid) {
      toast.error('Cannot remove this member');
      return;
    }

    try {
      // Remove from family's members array
      const familyRef = doc(db, 'families', userData.familyId);
      await updateDoc(familyRef, {
        members: arrayRemove(memberId),
      });

      // Remove familyId from user document
      const userRef = doc(db, 'users', memberId);
      await updateDoc(userRef, {
        familyId: null,
      });

      toast.success('Member removed from family');
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold mb-2">
          <span className="gradient-text">Settings</span>
        </h1>
        <p className="text-gray-600 font-semibold">
          Manage your family and profile
        </p>
      </div>

      {/* Family Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-8 shadow-xl mb-6"
      >
        <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
          <span>👨‍👩‍👧‍👦</span>
          Family: {family?.name}
        </h2>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-bold text-gray-600 mb-2">Family Members ({members.length})</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 flex items-center gap-3 relative"
                >
                  <div className="text-3xl">
                    {member.role === 'parent' ? '👑' : '🎮'}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{member.displayName}</p>
                    <p className="text-xs text-gray-600">
                      {member.role === 'parent' ? 'Parent' : 'Kid'} • {member.points || 0} points
                    </p>
                  </div>
                  {isParent() && member.id !== userData?.uid && (
                    <button
                      onClick={() => setShowDeleteConfirm(member.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-100 p-2 rounded-lg transition-all"
                      title="Remove member"
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Invite Family Members */}
      {isParent() && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-500 to-purple-500 rounded-3xl p-8 shadow-xl mb-6 text-white"
        >
          <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
            <span>📨</span>
            Invite Family Members
          </h2>

          <p className="mb-6 opacity-90">
            Share this code or link with family members so they can join!
          </p>

          <div className="bg-white/20 backdrop-blur rounded-2xl p-6 mb-4">
            <p className="text-sm font-bold mb-2 opacity-90">Family Invite Code:</p>
            <div className="flex items-center gap-3">
              <code className="flex-1 bg-white/30 px-4 py-3 rounded-xl font-mono text-lg font-bold">
                {familyInviteCode}
              </code>
              <button
                onClick={handleCopyCode}
                className="bg-white text-purple-600 px-6 py-3 rounded-xl font-bold hover:bg-gray-100 transition-all shadow-lg flex items-center gap-2"
              >
                {copied ? <FaCheck /> : <FaCopy />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="bg-white/20 backdrop-blur rounded-2xl p-6">
            <p className="text-sm font-bold mb-2 opacity-90">Invite Link:</p>
            <div className="flex items-center gap-3">
              <code className="flex-1 bg-white/30 px-4 py-3 rounded-xl font-mono text-sm truncate">
                {inviteLink}
              </code>
              <button
                onClick={handleCopyLink}
                className="bg-white text-purple-600 px-6 py-3 rounded-xl font-bold hover:bg-gray-100 transition-all shadow-lg flex items-center gap-2"
              >
                <FaCopy /> Copy Link
              </button>
            </div>
          </div>

          <div className="mt-6 bg-white/10 rounded-xl p-4">
            <p className="text-sm font-semibold opacity-90">
              💡 <strong>How to invite:</strong> Send the code or link to family members. They'll use it when signing up!
            </p>
          </div>
        </motion.div>
      )}

      {/* Profile Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-3xl p-8 shadow-xl mb-6"
      >
        <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
          <span>👤</span>
          Your Profile
        </h2>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b">
            <span className="text-gray-600 font-semibold">Name:</span>
            <span className="font-bold">{userData?.displayName}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b">
            <span className="text-gray-600 font-semibold">Email:</span>
            <span className="font-bold">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b">
            <span className="text-gray-600 font-semibold">Role:</span>
            <span className="font-bold">
              {userData?.role === 'parent' ? '👑 Parent' : '🎮 Kid'}
            </span>
          </div>
          {userData?.role !== 'parent' && (
            <div className="flex items-center justify-between py-3">
              <span className="text-gray-600 font-semibold">Points:</span>
              <span className="font-bold text-2xl gradient-text">
                ⭐ {userData?.points || 0}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Debug: Reset Notifications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <button
          onClick={resetNotificationState}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-2xl font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
        >
          🔄 Reset Notification State
        </button>
        <p className="text-xs text-gray-500 text-center mt-2">
          Use this if notifications are stuck
        </p>
      </motion.div>

      {/* Sign Out */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <button
          onClick={handleSignOut}
          className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-2xl font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
        >
          <FaSignOutAlt /> Sign Out
        </button>
      </motion.div>

      {/* Delete Member Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">⚠️</div>
                <h2 className="text-2xl font-display font-bold mb-2">
                  Remove Family Member?
                </h2>
                <p className="text-gray-600">
                  This will remove{' '}
                  <strong>
                    {members.find((m) => m.id === showDeleteConfirm)?.displayName}
                  </strong>{' '}
                  from your family. They will no longer have access to family data.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRemoveMember(showDeleteConfirm)}
                  className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <FaTrash /> Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <SettingsContent />
    </DashboardLayout>
  );
}
