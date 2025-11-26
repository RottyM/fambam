'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { useTheme } from '@/contexts/ThemeContext';
import { motion } from 'framer-motion';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const DAILY_PROMPTS = [
  "What made you smile today?",
  "What was the funniest thing you heard today?",
  "What are you grateful for right now?",
  "What's something new you learned today?",
  "Who made your day better and how?",
  "What's the best thing that happened today?",
  "What's something you're proud of today?",
  "What made you laugh today?",
  "What's your favorite memory from today?",
  "What's something kind you did or saw today?",
];

function DailyCheckInContent() {
  const { userData } = useAuth();
  const { getMemberById } = useFamily();
  const { theme, currentTheme } = useTheme();

  const [todayPrompt, setTodayPrompt] = useState('');
  const [myAnswer, setMyAnswer] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [allAnswers, setAllAnswers] = useState([]);
  const [pastEntries, setPastEntries] = useState([]);
  const [viewMode, setViewMode] = useState('today');

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (!userData?.familyId) return;

    const promptRef = doc(db, 'families', userData.familyId, 'daily-prompts', today);
    getDoc(promptRef).then((docSnap) => {
      if (docSnap.exists()) {
        setTodayPrompt(docSnap.data().prompt);
      } else {
        const randomPrompt = DAILY_PROMPTS[Math.floor(Math.random() * DAILY_PROMPTS.length)];
        setDoc(promptRef, {
          prompt: randomPrompt,
          date: today,
          createdAt: serverTimestamp(),
        });
        setTodayPrompt(randomPrompt);
      }
    });

    const answersQuery = query(
      collection(db, 'families', userData.familyId, 'daily-checkins'),
      where('date', '==', today)
    );

    const unsubscribe = onSnapshot(answersQuery, (snapshot) => {
      const answers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAllAnswers(answers);
      setHasAnswered(answers.some((a) => a.userId === userData.uid));
    });

    const journalQuery = query(
      collection(db, 'families', userData.familyId, 'daily-checkins'),
      orderBy('createdAt', 'desc')
    );

    const journalUnsubscribe = onSnapshot(journalQuery, (snapshot) => {
      const entries = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPastEntries(entries);
    });

    return () => {
      unsubscribe();
      journalUnsubscribe();
    };
  }, [userData?.familyId, userData?.uid, today]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!myAnswer.trim()) return;

    try {
      await setDoc(
        doc(db, 'families', userData.familyId, 'daily-checkins', `${today}_${userData.uid}`),
        {
          userId: userData.uid,
          userName: userData.displayName,
          answer: myAnswer,
          prompt: todayPrompt,
          date: today,
          createdAt: serverTimestamp(),
        }
      );

      toast.success('Check-in saved! 💝');
      setMyAnswer('');
    } catch (error) {
      console.error('Error saving check-in:', error);
      toast.error('Failed to save check-in');
    }
  };

  const entriesByDate = pastEntries.reduce((acc, entry) => {
    if (!acc[entry.date]) acc[entry.date] = [];
    acc[entry.date].push(entry);
    return acc;
  }, {});

  return (
    <>
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-display font-bold mb-2">
          <span className={currentTheme === 'dark' ? 'text-purple-400' : 'gradient-text'}>
            {currentTheme === 'dark' ? 'Midnight Musings' : 'Daily Check-In'}
          </span>
        </h1>
        <p className={`${theme.colors.textMuted} font-semibold`}>
          Share your day with the family ❤️
        </p>
      </div>

      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setViewMode('today')}
          className={`px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 ${
            viewMode === 'today'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
              : `${theme.colors.bgCard} border-2 ${theme.colors.border} ${theme.colors.textMuted} hover:shadow-md`
          }`}
        >
          📅 Today
        </button>
        <button
          onClick={() => setViewMode('journal')}
          className={`px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 ${
            viewMode === 'journal'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
              : `${theme.colors.bgCard} border-2 ${theme.colors.border} ${theme.colors.textMuted} hover:shadow-md`
          }`}
        >
          📖 Journal
        </button>
      </div>

      {viewMode === 'today' ? (
        <>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-purple-500 via-pink-500 to-indigo-500 rounded-3xl p-8 shadow-2xl mb-8 text-white"
          >
            <p className="text-sm font-bold mb-3 opacity-90">Today&apos;s Question:</p>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">{todayPrompt}</h2>

            {!hasAnswered ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <textarea
                  value={myAnswer}
                  onChange={(e) => setMyAnswer(e.target.value)}
                  placeholder="Share your thoughts..."
                  className={`w-full px-5 py-4 rounded-2xl ${theme.colors.bgCard} border-2 ${theme.colors.border} placeholder:opacity-70 focus:border-purple-500 focus:outline-none resize-none font-medium ${theme.colors.text}`}
                  rows={5}
                  required
                />
                <button
                  type="submit"
                  className="bg-white text-purple-600 px-8 py-4 rounded-2xl font-bold hover:bg-gray-100 transition-all shadow-lg"
                >
                  Submit Check-In ✨
                </button>
              </form>
            ) : (
              <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-6">
                <p className="font-bold text-xl">✓ You&apos;ve checked in today!</p>
                <p className="opacity-90 mt-2">See everyone’s responses below</p>
              </div>
            )}
          </motion.div>

          <div className="space-y-6">
            <h3 className={`text-2xl md:text-3xl font-display font-bold ${theme.colors.text}`}>
              Family Responses ({allAnswers.length})
            </h3>

            {allAnswers.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-6xl mb-4">💭</p>
                <p className={`${theme.colors.textMuted} text-lg`}>No responses yet — be the first!</p>
              </div>
            ) : (
              allAnswers.map((answer) => {
                const member = getMemberById(answer.userId);
                return (
                  <motion.div
                    key={answer.id}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`${theme.colors.bgCard} rounded-3xl p-6 shadow-xl border-2 ${theme.colors.border}`}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="text-4xl">
                        {member?.role === 'parent' ? '👑' : '🎮'}
                      </div>
                      <div>
                        <p className={`font-bold text-lg ${theme.colors.text}`}>{answer.userName}</p>
                        <p className={`text-sm ${theme.colors.textMuted}`}>
                          {answer.createdAt?.toDate?.()
                            ? format(answer.createdAt.toDate(), 'h:mm a')
                            : 'Just now'}
                        </p>
                      </div>
                    </div>
                    <p className={`${theme.colors.text} text-lg leading-relaxed`}>{answer.answer}</p>
                  </motion.div>
                );
              })
            )}
          </div>
        </>
      ) : (
        <div className="space-y-8">
          {Object.keys(entriesByDate).length === 0 ? (
            <div className="text-center py-20">
              <p className="text-7xl mb-6">📖</p>
              <p className={`text-2xl font-bold ${theme.colors.text}`}>No journal entries yet</p>
              <p className={`${theme.colors.textMuted} mt-3`}>Start checking in daily to build your family journal!</p>
            </div>
          ) : (
            Object.entries(entriesByDate).map(([date, entries]) => (
              <motion.div
                key={date}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${theme.colors.bgCard} rounded-3xl p-8 shadow-xl border-2 ${theme.colors.border}`}
              >
                <div className="flex items-center justify-between mb-6 pb-4 border-b-2 ${currentTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">📅</span>
                    <h3 className={`text-2xl font-display font-bold ${theme.colors.text}`}>
                      {format(new Date(date), 'MMMM d, yyyy')}
                    </h3>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                    currentTheme === 'dark'
                      ? 'bg-purple-900/50 text-purple-300'
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {entries.length} response{entries.length > 1 ? 's' : ''}
                  </span>
                </div>

                <p className="text-xl italic font-medium text-purple-600 dark:text-purple-400 mb-6">
                  &quot;{entries[0]?.prompt}&quot;
                </p>

                <div className="space-y-4">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className={`${
                        currentTheme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100'
                      } rounded-2xl p-5`}
                    >
                      <p className={`font-bold ${theme.colors.text} mb-1`}>{entry.userName}:</p>
                      <p className={theme.colors.text}>{entry.answer}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </>
  );
}

export default function DailyCheckInPage() {
  return (
    <DashboardLayout>
      <DailyCheckInContent />
    </DashboardLayout>
  );
}
