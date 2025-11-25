'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { motion } from 'framer-motion';
import { FaMoon, FaSun, FaBell, FaBellSlash, FaSpinner, FaUser, FaPalette, FaKey, FaTrash, FaSignOutAlt, FaCopy, FaUserPlus, FaEdit } from 'react-icons/fa';
import UserAvatar from '@/components/UserAvatar';
import AvatarSelector from '@/components/AvatarSelector';
import Link from 'next/link'; // Added Link import
import toast from 'react-hot-toast';
import { useState } from 'react'; // Added useState import
import { useFamily } from '@/contexts/FamilyContext';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc as firestoreDoc, updateDoc } from 'firebase/firestore';

function SettingsContent() {
  const { user, userData, signOut } = useAuth();
  const { family, members, isParent } = useFamily();
  const { theme, toggleTheme, currentTheme } = useTheme();
  const { 
    notificationsSupported, 
    notificationsEnabled, 
    requestPermission, 
    disableNotifications, 
    resetNotificationState 
  } = useNotifications();
  const [isToggling, setIsToggling] = useState(false);
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  const handleNotificationToggle = async () => {
    setIsToggling(true);
    try {
      if (notificationsEnabled) {
        await disableNotifications();
      } else {
        await requestPermission();
      }
    } finally {
      setIsToggling(false);
    }
  };

  const handleSignOut = () => {
    // Using a safer method than window.confirm for cross-platform/PWA compatibility
    toast((t) => (
      <div className="flex flex-col gap-3 p-4 bg-white rounded-lg shadow-lg">
        <p className="font-bold text-gray-800">Are you sure you want to sign out?</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="text-gray-500 hover:text-gray-800 font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              signOut();
              toast.dismiss(t.id);
            }}
            className="bg-red-500 text-white py-1 px-3 rounded-md hover:bg-red-600"
          >
            Sign Out
          </button>
        </div>
      </div>
    ), { duration: 9000, position: 'top-center' });
  };

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const getInviteUrl = () => {
    if (typeof window !== 'undefined' && family?.id) {
      return `${window.location.origin}/join?code=${family.id}`;
    }
    return '';
  };

  const handleDeleteAccount = async (userId, userName) => {
    toast((t) => (
      <div className="flex flex-col gap-3 p-4 bg-white rounded-lg shadow-lg">
        <p className="font-bold text-gray-800">Delete {userName}'s account?</p>
        <p className="text-sm text-gray-600">This action cannot be undone. All data will be permanently deleted.</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="text-gray-500 hover:text-gray-800 font-semibold px-3 py-1"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                toast.loading('Deleting account...');
                const deleteUserAccount = httpsCallable(functions, 'deleteUserAccount');
                await deleteUserAccount({ userId });
                toast.dismiss();
                toast.success(`${userName}'s account has been deleted`);
              } catch (error) {
                toast.dismiss();
                toast.error(`Failed to delete account: ${error.message}`);
                console.error('Delete error:', error);
              }
            }}
            className="bg-red-500 text-white py-1 px-3 rounded-md hover:bg-red-600 font-semibold"
          >
            Delete Account
          </button>
        </div>
      </div>
    ), { duration: 10000, position: 'top-center' });
  };

  const findAndFixFamily = async () => {
    try {
      toast.loading('Searching for your family...');

      // Search for families where current user is a member
      const familiesRef = collection(db, 'families');
      const q = query(familiesRef, where('members', 'array-contains', user.uid));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        toast.dismiss();
        toast.error('No family found with you as a member. You may need to create a new family.');
        return;
      }

      const familyDoc = snapshot.docs[0];
      const correctFamilyId = familyDoc.id;

      console.log('Found family:', correctFamilyId);
      console.log('Your current familyId:', userData?.familyId);

      if (userData?.familyId === correctFamilyId) {
        toast.dismiss();
        toast.success('Your familyId is already correct!');
        return;
      }

      // Fix the familyId
      const userRef = firestoreDoc(db, 'users', user.uid);
      await updateDoc(userRef, {
        familyId: correctFamilyId
      });

      toast.dismiss();
      toast.success(`Fixed! Your familyId updated to: ${correctFamilyId}. Please refresh the page.`);

      // Reload after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      toast.dismiss();
      toast.error(`Error: ${error.message}`);
      console.error('Find family error:', error);
    }
  };

  const Card = ({ title, description, children }) => (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${theme.colors.bgCard} rounded-3xl p-6 shadow-xl border ${theme.colors.borderLight}`}
    >
      <h3 className="text-2xl font-bold mb-2 gradient-text">{title}</h3>
      <p className="text-gray-500 mb-4 text-sm">{description}</p>
      {children}
    </motion.div>
  );

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-display font-bold mb-4">
        <span className="gradient-text">Settings & Profile</span>
      </h1>

      {/* Profile Card */}
      <Card title="User Profile" description="View and manage your account details.">
        <div className="space-y-6">
          {/* Avatar and Info */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              <UserAvatar user={userData || user} size={64} />
              <button
                onClick={() => setIsEditingAvatar(!isEditingAvatar)}
                className="absolute -bottom-1 -right-1 bg-purple-500 hover:bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg transition-all group-hover:scale-110"
                title="Change Avatar"
              >
                <FaEdit size={14} />
              </button>
            </div>
            <div>
              <p className="text-xl font-bold">{userData?.displayName || user?.email}</p>
              <p className={`text-sm ${theme.colors.textMuted}`}>{userData?.role} | Points: {userData?.points || 0}</p>
              <button
                onClick={() => setIsEditingAvatar(!isEditingAvatar)}
                className="text-purple-600 hover:text-purple-800 text-sm font-bold mt-1"
              >
                {isEditingAvatar ? 'Cancel Avatar Change' : 'Change Avatar'}
              </button>
            </div>
          </div>

          {/* Avatar Selector */}
          {isEditingAvatar && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t pt-6"
            >
              <AvatarSelector
                userId={user?.uid}
                currentAvatar={userData?.avatar}
                onSelect={async (newAvatar) => {
                  setSavingAvatar(true);
                  try {
                    const userRef = firestoreDoc(db, 'users', user.uid);
                    await updateDoc(userRef, {
                      avatar: newAvatar
                    });
                    toast.success('Avatar updated successfully!');
                    setIsEditingAvatar(false);
                    // Reload to see changes immediately
                    setTimeout(() => window.location.reload(), 1000);
                  } catch (error) {
                    toast.error('Failed to update avatar');
                    console.error('Avatar update error:', error);
                  } finally {
                    setSavingAvatar(false);
                  }
                }}
              />
              {savingAvatar && (
                <div className="flex items-center justify-center mt-4">
                  <FaSpinner className="animate-spin mr-2" />
                  <span>Saving avatar...</span>
                </div>
              )}
            </motion.div>
          )}
        </div>
        
        <button 
          onClick={handleSignOut}
          className="mt-6 bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-2"
        >
          <FaSignOutAlt /> Sign Out
        </button>
      </Card>

      {/* Family ID Fix Card - Shows when user has familyId but family isn't loading */}
      {userData?.familyId && !family && (
        <Card
          title="⚠️ Family Not Found"
          description="You have a familyId but we can't find your family. Click to auto-fix."
        >
          <button
            onClick={findAndFixFamily}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl"
          >
            🔧 Find and Fix My Family
          </button>
          <p className="text-xs text-gray-600 mt-2">
            Current familyId: <code className="font-mono bg-gray-100 px-2 py-1 rounded">{userData.familyId}</code>
          </p>
        </Card>
      )}

      {/* Invite Family Members Card */}
      {userData?.familyId && family && (
        <Card
          title="Invite Family Members"
          description={`Share this code or link to invite others to join ${family.name || 'your family'}!`}
        >
          <div className="space-y-4">
            {/* Debug Info */}
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-3">
              <p className="text-xs font-mono text-gray-700 mb-2">
                <strong>Debug Info:</strong><br/>
                User familyId: {userData.familyId}<br/>
                Family doc ID: {family.id}<br/>
                Match: {userData.familyId === family.id ? '✅ Yes' : '❌ No - MISMATCH!'}
              </p>
              {userData.familyId !== family.id && (
                <button
                  onClick={findAndFixFamily}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg text-sm"
                >
                  🔧 Auto-Fix Family ID Mismatch
                </button>
              )}
            </div>

            {/* Family Code */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Family Code (Use Family Doc ID)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={family.id}
                  readOnly
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-300 bg-gray-50 font-mono text-center text-lg font-bold"
                />
                <button
                  onClick={() => copyToClipboard(family.id, 'Family code')}
                  className="bg-purple-500 hover:bg-purple-600 text-white font-bold px-6 rounded-xl transition-all flex items-center gap-2"
                >
                  <FaCopy /> Copy
                </button>
              </div>
            </div>

            {/* Invite Link */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Invite Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={getInviteUrl()}
                  readOnly
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-300 bg-gray-50 text-sm truncate"
                />
                <button
                  onClick={() => copyToClipboard(getInviteUrl(), 'Invite link')}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-6 rounded-xl transition-all flex items-center gap-2"
                >
                  <FaCopy /> Copy
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-800 font-semibold flex items-start gap-2">
                <FaUserPlus className="mt-1 flex-shrink-0" />
                <span>
                  Share the code or link with family members. They can visit the invite link or enter the code at{' '}
                  <Link href="/join" className="underline font-bold">
                    /join
                  </Link>
                  {' '}to join your family!
                </span>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Manage Family Members Card (Parents Only) */}
      {isParent() && members.length > 0 && (
        <Card
          title="Manage Family Members"
          description="View and manage all family member accounts."
        >
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border-2 border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <UserAvatar user={member} size={48} />
                  <div>
                    <p className="font-bold text-gray-800">{member.displayName}</p>
                    <p className="text-sm text-gray-500">
                      {member.email} • {member.role} • {member.points || 0} pts
                    </p>
                  </div>
                </div>
                {member.id !== user?.uid && (
                  <button
                    onClick={() => handleDeleteAccount(member.id, member.displayName)}
                    className="bg-red-100 hover:bg-red-200 text-red-700 font-bold px-4 py-2 rounded-lg transition-all flex items-center gap-2"
                  >
                    <FaTrash /> Delete
                  </button>
                )}
                {member.id === user?.uid && (
                  <span className="text-sm text-gray-500 font-semibold">(You)</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Theme Card */}
      <Card title="App Theme" description="Switch between Family-Friendly Light mode and Dark Mode.">
        <button 
          onClick={toggleTheme}
          className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-3 ${
            currentTheme === 'dark' 
              ? 'bg-purple-800 text-white hover:bg-purple-700' 
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          {currentTheme === 'dark' ? <FaSun size={20} /> : <FaMoon size={20} />}
          Switch to {currentTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
      </Card>

      {/* Notifications Card */}
      <Card 
        title="Notifications" 
        description="Receive reminders for chores and events."
      >
        {notificationsSupported ? (
          <div className="space-y-3">
            <button
              onClick={handleNotificationToggle}
              disabled={isToggling}
              className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-3 ${
                notificationsEnabled
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-yellow-500 text-yellow-900 hover:bg-yellow-600'
              }`}
            >
              {isToggling ? <FaSpinner className="animate-spin" /> : notificationsEnabled ? <FaBellSlash size={20} /> : <FaBell size={20} />}
              {isToggling ? 'Updating...' : notificationsEnabled ? 'Disable Notifications' : 'Enable Notifications'}
            </button>
            <p className={`text-center text-xs font-semibold ${notificationsEnabled ? 'text-green-600' : 'text-red-500'}`}>
              Status: {notificationsEnabled ? 'Enabled' : 'Disabled'}
            </p>

            {/* Debug Button (optional, but helpful for testing) */}
            <button
                onClick={resetNotificationState}
                className="w-full text-sm mt-3 text-red-400 hover:text-red-600 font-semibold"
            >
                Reset Notification State (Troubleshoot)
            </button>
          </div>
        ) : (
          <div className="text-center p-4 bg-gray-100 rounded-xl">
            <p className="text-gray-600">Notifications not supported by this browser/device.</p>
          </div>
        )}
      </Card>
      
      {/* Footer link to other settings */}
      <div className="text-center pt-4">
        <Link href="/credentials" className="text-purple-600 hover:text-purple-800 font-bold flex items-center justify-center gap-2">
            <FaKey /> Manage Family Credentials
        </Link>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <SettingsContent />
    </DashboardLayout>
  );
}