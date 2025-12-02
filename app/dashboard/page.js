'use client';

import DashboardLayout from '@/components/DashboardLayout';
import dynamic from 'next/dynamic';
const DynamicDailyMeme = dynamic(() => import('@/components/DailyMeme'), { ssr: false });
const DynamicMemberDetailModal = dynamic(() => import('@/components/MemberDetailModal'), { ssr: false });
const DynamicUpcomingEvents = dynamic(() => import('@/components/UpcomingEvents'), { ssr: false });
const DynamicQuickActions = dynamic(() => import('@/components/QuickActions'), { ssr: false });
const DynamicRecentActivity = dynamic(() => import('@/components/RecentActivity'), { ssr: false });
const DynamicMemorySpotlight = dynamic(() => import('@/components/MemorySpotlight'), { ssr: false });
const DynamicFamilyMembers = dynamic(() => import('@/components/FamilyMembers'), { ssr: false });
import UserAvatar from '@/components/UserAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useTodos, useChores, useMemories, useCalendarEvents, useMemoriesCount } from '@/hooks/useFirestore';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { format, isFuture, isToday, isTomorrow, startOfDay } from 'date-fns';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';
import {
  FaEdit
} from 'react-icons/fa';

// --- HELPER: Convert 24h time (14:25) to 12h (2:25 PM) ---

function StatsCard({ icon, title, value, color, href }) {
  return (
    <Link href={href} className="h-full">
      <motion.div
        whileHover={{ scale: 1.05, y: -5 }}
        className={`${color} rounded-2xl p-3 md:p-6 shadow-lg hover:shadow-2xl transition-all cursor-pointer card-hover flex flex-col h-full`}
      >
        <div className="flex items-center justify-between mb-2 md:mb-4">
          <div className="text-2xl md:text-4xl">{icon}</div>
          <div className="text-2xl md:text-3xl font-display font-bold text-gray-100">
            {value}
          </div>
        </div>
        <h3 className="text-gray-100 font-bold text-sm md:text-lg">{title}</h3>
      </motion.div>
    </Link>
  );
}

import { useRouter } from 'next/navigation'; // Import useRouter

function DashboardContent() {
  // Hooks are now at the top
  const { user, userData, loading } = useAuth();
  const { family, members } = useFamily();
  const { theme, currentTheme } = useTheme();
  const router = useRouter();
  const { todos } = useTodos({ realtime: false, statusFilter: 'pending' });
  const { chores } = useChores({ realtime: false, statusFilter: 'pending' });
  const { count: memoriesCount } = useMemoriesCount();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { memories } = useMemories({ realtime: false, latestOnly: true });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { events } = useCalendarEvents({ realtime: false });
  const [selectedMember, setSelectedMember] = useState(null);
  const [allMedications, setAllMedications] = useState([]);

  // Redirect if not authenticated and not loading
  useEffect(() => {
    if (!loading && !user) {
      router.push('/'); // Redirect to login page
    }
  }, [user, loading, router]);

  const getScheduleStatus = useCallback((time, takenLogs, assignedTo) => {
    const now = new Date();
    const [hours, minutes] = time.split(':');
    const scheduledDateTime = new Date();
    scheduledDateTime.setHours(hours, minutes, 0, 0);

    const isTaken = takenLogs?.some(
      (log) => {
        // Handle both Firestore Timestamp and regular Date objects
        const logDate = log.takenAt?.toDate ? log.takenAt.toDate() : log.takenAt;
        return log.scheduledTime === time && log.assignedTo === assignedTo && isToday(logDate);
      }
    );

    if (isTaken) {
      return { status: 'taken', color: 'bg-green-500 text-white cursor-not-allowed opacity-70', icon: '✅' };
    }

    if (now > scheduledDateTime) {
      return { status: 'missed', color: 'bg-red-500 text-white hover:bg-red-600', icon: '⏰' };
    }

    return { status: 'pending', color: 'bg-blue-500 text-white hover:bg-blue-600', icon: '⏰' };
  }, []);

  useEffect(() => {
    if (!family?.id) return;

    const fetchAllMeds = async () => {
      const q = query(collection(db, 'families', family.id, 'medications'));
      try {
        const snapshot = await getDocs(q);
        const medsList = [];
        for (const medDoc of snapshot.docs) {
          const medData = { id: medDoc.id, ...medDoc.data() };
          const startOfToday = startOfDay(new Date());
          const takenLogQ = query(
            collection(db, 'families', family.id, 'medications', medDoc.id, 'taken_log'),
            where('takenAt', '>=', startOfToday)
          );
          const takenLogSnapshot = await getDocs(takenLogQ);
          medData.takenLogs = takenLogSnapshot.docs.map(logDoc => logDoc.data());
          medsList.push(medData);
        }
        setAllMedications(medsList);
      } catch (error) {
        console.error("Error fetching all medications: ", error);
        toast.error("Failed to load medication data.");
      }
    };
    fetchAllMeds();
  }, [family?.id]);



// This function has been moved to components/MemberDetailModal.js
// so it is no longer needed here.

// This function has been moved to components/MemberDetailModal.js
// so it is no longer needed here.



  // Show loading indicator or redirect early
  if (loading || !user) {
    return (
      <div className="flex justify-center items-center h-screen text-2xl font-semibold">
        {/* You can replace this with a more elaborate spinner/loader */}
        Loading Dashboard...
      </div>
    );
  }

  const pendingTodos = todos.length;
  const pendingChores = chores.length;
  const spotlightMemory = memories[0]; // Already fetched as latest only

  const upcomingEvents = events
    .filter(event => {
      const eventDate = event.start?.toDate ? event.start.toDate() : new Date(event.start);
      return isFuture(eventDate) || isToday(eventDate);
    })
    .slice(0, 4);

  const getEventDateLabel = (event) => {
    const eventDate = event.start?.toDate ? event.start.toDate() : new Date(event.start);
    if (isToday(eventDate)) return 'Today';
    if (isTomorrow(eventDate)) return 'Tomorrow';
    return format(eventDate, 'MMM d');
  };

  const EVENT_CATEGORIES = {
    appointment: {
      icon: '🕯️',
      bgLight: 'bg-blue-50 border-blue-200',
      bgDark: 'bg-blue-900/30 border-blue-700/70',
      textLight: 'text-blue-900',
      textDark: 'text-blue-100',
    },
    birthday: {
      icon: '🎂',
      bgLight: 'bg-pink-50 border-pink-200',
      bgDark: 'bg-pink-900/30 border-pink-700/70',
      textLight: 'text-pink-900',
      textDark: 'text-pink-100',
    },
    activity: {
      icon: '⚔️',
      bgLight: 'bg-green-50 border-green-200',
      bgDark: 'bg-green-900/30 border-green-700/70',
      textLight: 'text-green-900',
      textDark: 'text-green-100',
    },
    school: {
      icon: '📚',
      bgLight: 'bg-amber-50 border-amber-200',
      bgDark: 'bg-amber-900/30 border-amber-700/70',
      textLight: 'text-amber-900',
      textDark: 'text-amber-100',
    },
    reminder: {
      icon: '☠️',
      bgLight: 'bg-purple-50 border-purple-200',
      bgDark: 'bg-purple-900/30 border-purple-700/70',
      textLight: 'text-purple-900',
      textDark: 'text-purple-100',
    },
    social: {
      icon: currentTheme === 'dark' ? '🦇' : '🎉',
      bgLight: 'bg-orange-50 border-orange-200',
      bgDark: 'bg-orange-900/30 border-orange-700/70',
      textLight: 'text-orange-900',
      textDark: 'text-orange-100',
    },
    other: {
      icon: '🔮',
      bgLight: 'bg-slate-50 border-slate-200',
      bgDark: 'bg-slate-800/60 border-slate-700',
      textLight: 'text-slate-900',
      textDark: 'text-slate-100',
    },
  };

  return (
    <div className="space-y-3 md:space-y-6">
      {/* Welcome header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${theme.colors.bgCard} rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-xl border-2 md:border-4 ${theme.colors.border}`}
      >
        <div className="flex items-center justify-between gap-3 md:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-1 md:mb-2">
              <span className={currentTheme === 'dark' ? 'text-purple-400' : 'gradient-text'}>
                {theme.messages.welcome}, {userData?.displayName}!
              </span>
            </h1>
            <div className={`text-sm md:text-xl ${theme.colors.textMuted} font-semibold`}>
              <span className="block sm:inline">{family?.name || (currentTheme === 'dark' ? 'Your Coven' : 'Your Family')}</span>
              <span className="hidden sm:inline"> • </span>
              <span className="block sm:inline text-xs md:text-lg">
                {new Date().toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>
            <Link href="/settings" className="inline-flex items-center gap-2 mt-2 text-purple-600 hover:text-purple-800 text-sm font-bold transition-all">
              <FaEdit size={12} />
              <span>Change Avatar</span>
            </Link>
          </div>
          <div className="text-4xl md:text-6xl animate-wiggle flex-shrink-0">
            {currentTheme === 'dark' ? '🦇' : '👋'}
          </div>
        </div>

        {/* Points display for kids */}
        {userData?.role !== 'parent' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="mt-3 md:mt-6 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl md:rounded-2xl p-3 md:p-6 text-center"
          >
            <p className="text-gray-100 font-semibold mb-1 md:mb-2 text-sm md:text-base">Your Points</p>
            <p className="text-3xl md:text-5xl font-display font-bold text-gray-100">
              {currentTheme === 'dark' ? '🩸' : '⭐'} {userData?.points || 0}
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        <StatsCard
          icon={currentTheme === 'dark' ? '🕸️' : '✅'}
          title={currentTheme === 'dark' ? 'Dark Deeds' : 'To-Dos'}
          value={pendingTodos}
          color={`bg-gradient-to-br ${theme.colors.statBlue}`}
          href="/todos"
        />
        <StatsCard
          icon={currentTheme === 'dark' ? '🧟' : '🧹'}
          title={currentTheme === 'dark' ? 'Duties' : 'Chores'}
          value={pendingChores}
          color={`bg-gradient-to-br ${theme.colors.statPurple}`}
          href="/chores"
        />
        <StatsCard
          icon={currentTheme === 'dark' ? '🕯️' : '📆'}
          title={currentTheme === 'dark' ? 'Omens' : 'Events'}
          value={upcomingEvents.length}
          color="bg-gradient-to-br from-blue-400 to-purple-500"
          href="/calendar"
        />
        <StatsCard
          icon={currentTheme === 'dark' ? '💀' : '📸'}
          title={currentTheme === 'dark' ? 'Archives' : 'Memories'}
          value={memoriesCount}
          color={`bg-gradient-to-br ${theme.colors.statGreen}`}
          href="/memories"
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6">
        {/* Left column - Calendar Events */}
        <div className="lg:col-span-2 space-y-3 md:space-y-6">
          <DynamicUpcomingEvents
            events={upcomingEvents}
            members={members}
            getEventDateLabel={getEventDateLabel}
            EVENT_CATEGORIES={EVENT_CATEGORIES}
          />

          <DynamicQuickActions />
        </div>

        {/* Right column - Recent Activity & Meme */}
        <div className="space-y-3 md:space-y-6">
          <DynamicRecentActivity
            todos={todos}
            chores={chores}
            members={members}
          />

          {spotlightMemory && (
            <DynamicMemorySpotlight
              spotlightMemory={spotlightMemory}
            />
          )}

          {/* Daily Meme */}
          <DynamicDailyMeme />
        </div>
      </div>

      <DynamicFamilyMembers
        members={members}
        allMedications={allMedications}
        getScheduleStatus={getScheduleStatus}
        setSelectedMember={setSelectedMember}
      />

      <DynamicMemberDetailModal
        selectedMember={selectedMember}
        setSelectedMember={setSelectedMember}
        allMedications={allMedications}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <DashboardContent />
    </DashboardLayout>
  );
}
