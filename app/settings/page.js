'use client';

import DashboardLayout from '@/components/DashboardLayout';
import UserAvatar from '@/components/UserAvatar';
import AvatarSelector from '@/components/AvatarSelector';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { motion } from 'framer-motion';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc as firestoreDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  FaMoon,
  FaSun,
  FaBell,
  FaBellSlash,
  FaSpinner,
  FaEdit,
  FaSignOutAlt,
  FaCopy,
  FaTrash,
  FaKey,
  FaUserPlus,
  FaUndo,
} from 'react-icons/fa';

function SettingsContent() {
  const { user, userData, signOut } = useAuth();
  const { family, members, isParent } = useFamily();
  const { theme, toggleTheme, currentTheme } = useTheme();
  const {
    notificationsSupported,
    notificationsEnabled,
    requestPermission,
    disableNotifications,
  } = useNotifications();

  const [isToggling, setIsToggling] = useState(false);
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [resetTarget, setResetTarget] = useState('all');
  const [resettingPoints, setResettingPoints] = useState(false);

  // ── Handlers ─────────────────────────────────────
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
    toast((t) => (
      <div className="flex flex-col gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
        <p className="font-bold">Sign out?</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => toast.dismiss(t.id)} className="text-gray-600">
            Cancel
          </button>
          <button
            onClick={() => {
              signOut();
              toast.dismiss(t.id);
            }}
            className="bg-red-600 text-white px-4 py-2 rounded-lg"
          >
            Sign Out
          </button>
        </div>
      </div>
    ), { duration: 10000 });
  };

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied!`);
    } catch {
      toast.error('Copy failed');
    }
  };

  const handleResetChorePoints = async () => {
    if (!isParent() || !userData?.familyId) return;
    const targets = resetTarget === 'all'
      ? members
      : members.filter(m => m.id === resetTarget);
    if (targets.length === 0) {
      toast.error('No members to reset');
      return;
    }

    const names = resetTarget === 'all' ? 'all members' : targets[0]?.displayName || 'member';
    if (!confirm(`Reset points for ${names}? This cannot be undone.`)) return;

    setResettingPoints(true);
    try {
      await Promise.all(
        targets.map(member =>
          updateDoc(firestoreDoc(db, 'users', member.id), { points: 0 })
        )
      );
      toast.success(`Points reset for ${names}`);
    } catch (e) {
      console.error('Reset points error:', e);
      toast.error('Failed to reset points');
    } finally {
      setResettingPoints(false);
    }
  };

  const getInviteUrl = () =>
    typeof window !== 'undefined' && family?.id
      ? `${window.location.origin}/join?code=${family.id}`
      : '';

  const handleDeleteAccount = (userId, name) => {
    toast((t) => (
      <div className="flex flex-col gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
        <p className="font-bold">Delete {name}&apos;s account?</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => toast.dismiss(t.id)} className="text-gray-600">
            Cancel
          </button>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              toast.loading('Deleting...');
              try {
                const deleteFn = httpsCallable(functions, 'deleteUserAccount');
                await deleteFn({ userId });
                toast.success(`${name} deleted`);
              } catch (e) {
                console.error('Delete account failed:', e);
                toast.error('Delete failed');
              }
            }}
            className="bg-red-600 text-white px-4 py-2 rounded-lg"
          >
            Delete
          </button>
        </div>
      </div>
    ), { duration: 15000 });
  };

  const findAndFixFamily = async () => {
    toast.loading('Searching for family...');
    const q = query(collection(db, 'families'), where('members', 'array-contains', user.uid));
    const snap = await getDocs(q);

    if (snap.empty) {
      toast.error('No family found');
      return;
    }

    const correctId = snap.docs[0].id;
    if (userData?.familyId === correctId) {
      toast.success('Already correct!');
      return;
    }

    await updateDoc(firestoreDoc(db, 'users', user.uid), { familyId: correctId });
    toast.success('Fixed! Refreshing...');
    setTimeout(() => location.reload(), 2000);
  };

  // ── Reusable Card ─────────────────────────────────
  const Card = ({ title, description, children, className = '' }) => (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${theme.colors.bgCard} rounded-2xl md:rounded-3xl p-6 shadow-xl border-2 ${theme.colors.border} ${className}`}
    >
      <h3 className="text-2xl md:text-3xl font-display font-bold mb-2 gradient-text">
        {title}
      </h3>
      {description && (
        <p className={`text-sm md:text-base ${theme.colors.textMuted} mb-6`}>
          {description}
        </p>
      )}
      {children}
    </motion.div>
  );

  return (
    <div className="space-y-6 md:space-y-8 pb-12">
      <h1 className="text-4xl md:text-5xl font-display font-bold">
        <span className={currentTheme === 'dark' ? 'text-purple-400' : 'gradient-text'}>
          {currentTheme === 'dark' ? 'The Inner Sanctum' : 'Settings & Profile'}
        </span>
      </h1>

      {/* Profile */}
      <Card title="Your Profile">
        <div className="flex items-center gap-5 mb-6">
          <div className="relative group">
            <UserAvatar user={userData || user} size={80} />
            <button
              onClick={() => setIsEditingAvatar(!isEditingAvatar)}
              className="absolute -bottom-2 -right-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg"
            >
              <FaEdit />
            </button>
          </div>
          <div>
            <p className={`text-2xl font-bold ${theme.colors.text}`}>
              {userData?.displayName || user?.email}
            </p>
            <p className={theme.colors.textMuted}>
              {userData?.role} • ⭐ {userData?.points || 0} points
            </p>
          </div>
        </div>

        {isEditingAvatar && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <AvatarSelector
              userId={user?.uid}
              currentAvatar={userData?.avatar}
              onSelect={async (avatar) => {
                setSavingAvatar(true);
                try {
                  await updateDoc(firestoreDoc(db, 'users', user.uid), { avatar });
                  toast.success('Avatar updated!');
                  setTimeout(() => location.reload(), 1000);
                } catch {
                  toast.error('Failed');
                } finally {
                  setSavingAvatar(false);
                  setIsEditingAvatar(false);
                }
              }}
            />
            {savingAvatar && (
              <p className="text-center mt-4">
                <FaSpinner className="inline animate-spin mr-2" />
                Saving...
              </p>
            )}
          </motion.div>
        )}

        <button
          onClick={handleSignOut}
          className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3"
        >
          <FaSignOutAlt /> Sign Out
        </button>
      </Card>

      {/* Family Fix */}
      {userData?.familyId && !family && (
        <Card title="Family Not Loading" className="border-orange-500">
          <button
            onClick={findAndFixFamily}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-xl"
          >
            Auto-Fix Family
          </button>
        </Card>
      )}

      {/* Invite */}
      {family && (
        <Card title="Invite Family Members" description={`Share with ${family.name || 'the fam'}`}>
          <div className="space-y-4">
            <div className="flex gap-3">
              <input
                readOnly
                value={family.id}
                className={`flex-1 px-4 py-3 rounded-xl ${theme.colors.bgCard} border ${theme.colors.border} text-center font-mono font-bold`}
              />
              <button
                onClick={() => copyToClipboard(family.id, 'Family code')}
                className="px-6 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl flex items-center gap-2"
              >
                <FaCopy /> Copy
              </button>
            </div>

            <div className="flex gap-3">
              <input
                readOnly
                value={getInviteUrl()}
                className={`flex-1 px-4 py-3 rounded-xl ${theme.colors.bgCard} border ${theme.colors.border} text-sm`}
              />
              <button
                onClick={() => copyToClipboard(getInviteUrl(), 'Invite link')}
                className="px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2"
              >
                <FaCopy /> Copy
              </button>
            </div>

            <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-xl p-4 text-sm">
              <p className="flex items-start gap-2">
                <FaUserPlus className="mt-0.5 flex-shrink-0" />
                Send the code or link → they go to <Link href="/join" className="underline font-bold">/join</Link>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Chore Points Reset */}
      {isParent() && (
        <Card title="Chore Points" description="Reset chore points for any family member.">
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>Choose member</label>
              <select
                value={resetTarget}
                onChange={(e) => setResetTarget(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
              >
                <option value="all">All members</option>
                {members.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.displayName}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleResetChorePoints}
              disabled={resettingPoints}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-3 rounded-xl font-bold hover:from-orange-600 hover:to-red-600 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <FaUndo />
              {resettingPoints ? 'Resetting...' : 'Reset Points'}
            </button>
            <p className={theme.colors.textMuted}>
              This sets selected member points to 0 for chores. Action cannot be undone.
            </p>
          </div>
        </Card>
      )}

      {/* Manage Members (parents only) */}
      {isParent() && members.length > 0 && (
        <Card title="Manage Family Members">
          <div className="space-y-3">
            {members.map((m) => (
              <div
                key={m.id}
                className={`flex items-center justify-between p-4 rounded-xl ${theme.colors.bgCard} border ${theme.colors.border}`}
              >
                <div className="flex items-center gap-4">
                  <UserAvatar user={m} size={48} />
                  <div>
                    <p className={`font-bold ${theme.colors.text}`}>{m.displayName}</p>
                    <p className={`text-sm ${theme.colors.textMuted}`}>
                      {m.role} • ⭐ {m.points || 0}
                    </p>
                  </div>
                </div>
                {m.id !== user?.uid && (
                  <button
                    onClick={() => handleDeleteAccount(m.id, m.displayName)}
                    className="text-red-600 hover:text-red-700 font-bold flex items-center gap-2"
                  >
                    <FaTrash /> Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Theme */}
      <Card title="Theme">
        <button
          onClick={toggleTheme}
          className={`w-full py-5 rounded-xl font-bold flex items-center justify-center gap-4 transition-all ${
            currentTheme === 'dark'
              ? 'bg-purple-900/60 hover:bg-purple-900/80 text-purple-300'
              : 'bg-gradient-to-r from-purple-200 to-pink-200 hover:from-purple-300 hover:to-pink-300 text-purple-800'
          }`}
        >
          {currentTheme === 'dark' ? <FaSun size={28} /> : <FaMoon size={28} />}
          Switch to {currentTheme === 'dark' ? 'Light' : 'Dark'} Mode
        </button>
      </Card>

      {/* Notifications */}
      <Card title="Notifications" description="Reminders for chores & events">
        {notificationsSupported ? (
          <div className="text-center space-y-4">
            <button
              onClick={handleNotificationToggle}
              disabled={isToggling}
              className={`w-full py-5 rounded-xl font-bold flex items-center justify-center gap-4 ${
                notificationsEnabled
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-yellow-500 hover:bg-yellow-600 text-yellow-900'
              }`}
            >
              {isToggling ? (
                <FaSpinner className="animate-spin" />
              ) : notificationsEnabled ? (
                <FaBellSlash size={28} />
              ) : (
                <FaBell size={28} />
              )}
              {isToggling ? 'Updating...' : notificationsEnabled ? 'Disable' : 'Enable'} Notifications
            </button>
            <p className={`font-bold text-lg ${notificationsEnabled ? 'text-green-600' : 'text-red-600'}`}>
              Status: {notificationsEnabled ? 'ON' : 'OFF'}
            </p>
          </div>
        ) : (
          <p className={`${theme.colors.textMuted} text-center`}>
            Not supported on this device
          </p>
        )}
      </Card>

      <div className="text-center pt-6">
        <Link
          href="/credentials"
          className="inline-flex items-center gap-3 text-purple-600 hover:text-purple-700 font-bold text-lg"
        >
          <FaKey /> Manage Family Credentials
        </Link>
      </div>
    </div>
  );
}

// ── Page export (required!) ───────────────────────
export default function SettingsPage() {
  return (
    <DashboardLayout>
      <SettingsContent />
    </DashboardLayout>
  );
}
