'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { motion } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDoc, query, where, onSnapshot, serverTimestamp, orderBy } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const DAILY_PROMPTS = [
  "What made you smile today? 😊",
  "What was the funniest thing you heard today? 😂",
  "What are you grateful for right now? 🙏",
  "What's something new you learned today? 🎓",
  "Who made your day better and how? 💝",
  "What's the best thing that happened today? ⭐",
  "What's something you're proud of today? 🏆",
  "What made you laugh today? 🤣",
  "What's your favorite memory from today? 🌟",
  "What's something kind you did or saw today? ❤️",
];

function DailyCheckInContent() {
  const { userData } = useAuth();
  const { getMemberById, members } = useFamily();
  const [todayPrompt, setTodayPrompt] = useState('');
  const [myAnswer, setMyAnswer] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [allAnswers, setAllAnswers] = useState([]);
  const [pastEntries, setPastEntries] = useState([]);
  const [viewMode, setViewMode] = useState('today'); // 'today' or 'journal'

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (!userData?.familyId) return;

    // Get today's prompt
    const promptRef = doc(db, 'families', userData.familyId, 'daily-prompts', today);
    getDoc(promptRef).then((docSnap) => {
      if (docSnap.exists()) {
        setTodayPrompt(docSnap.data().prompt);
      } else {
        // Generate new prompt for today
        const randomPrompt = DAILY_PROMPTS[Math.floor(Math.random() * DAILY_PROMPTS.length)];
        setDoc(promptRef, {
          prompt: randomPrompt,
          date: today,
          createdAt: serverTimestamp(),
        });
        setTodayPrompt(randomPrompt);
      }
    });

    // Listen to today's answers
    const answersQuery = query(
      collection(db, 'families', userData.familyId, 'daily-checkins'),
      where('date', '==', today)
    );

    const unsubscribe = onSnapshot(answersQuery, (snapshot) => {
      const answers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAllAnswers(answers);
      setHasAnswered(answers.some(a => a.userId === userData.uid));
    });

    // Get past entries for journal view
    const journalQuery = query(
      collection(db, 'families', userData.familyId, 'daily-checkins'),
      orderBy('createdAt', 'desc')
    );

    const journalUnsubscribe = onSnapshot(journalQuery, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({
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

  // Group journal entries by date
  const entriesByDate = pastEntries.reduce((acc, entry) => {
    if (!acc[entry.date]) acc[entry.date] = [];
    acc[entry.date].push(entry);
    return acc;
  }, {});

  return (
    <>
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold mb-2">
          <span className="gradient-text">Daily Check-In</span>
        </h1>
        <p className="text-gray-600 font-semibold">
          Share your day with the family ❤️
        </p>
      </div>

      {/* View Toggle */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setViewMode('today')}
          className={`px-6 py-3 rounded-2xl font-bold transition-all ${
            viewMode === 'today'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📅 Today
        </button>
        <button
          onClick={() => setViewMode('journal')}
          className={`px-6 py-3 rounded-2xl font-bold transition-all ${
            viewMode === 'journal'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📖 Journal
        </button>
      </div>

      {viewMode === 'today' ? (
        <>
          {/* Today's Prompt */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 rounded-3xl p-8 shadow-xl mb-6 text-white"
          >
            <p className="text-sm font-bold mb-3 opacity-90">Today's Question:</p>
            <h2 className="text-3xl font-display font-bold mb-6">{todayPrompt}</h2>

            {!hasAnswered ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <textarea
                  value={myAnswer}
                  onChange={(e) => setMyAnswer(e.target.value)}
                  placeholder="Share your thoughts..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-white/30 bg-white/20 backdrop-blur text-white placeholder-white/70 focus:border-white focus:outline-none font-semibold"
                  rows={4}
                  required
                />
                <button
                  type="submit"
                  className="bg-white text-purple-600 px-8 py-3 rounded-xl font-bold hover:bg-gray-100 transition-all shadow-lg"
                >
                  Submit Check-In ✨
                </button>
              </form>
            ) : (
              <div className="bg-white/20 backdrop-blur rounded-2xl p-6">
                <p className="font-bold text-lg">✓ You've checked in today!</p>
                <p className="opacity-90 mt-2">See everyone's responses below</p>
              </div>
            )}
          </motion.div>

          {/* Today's Responses */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-gray-800">Family Responses ({allAnswers.length})</h3>
            {allAnswers.map((answer) => {
              const member = getMemberById(answer.userId);
              return (
                <motion.div
                  key={answer.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white rounded-3xl p-6 shadow-lg"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-3xl">
                      {member?.role === 'parent' ? '👑' : '🎮'}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{answer.userName}</p>
                      <p className="text-xs text-gray-500">
                        {answer.createdAt?.toDate?.()
                          ? format(answer.createdAt.toDate(), 'h:mm a')
                          : 'Just now'}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-700 text-lg">{answer.answer}</p>
                </motion.div>
              );
            })}

            {allAnswers.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-2">💭</p>
                <p>No responses yet. Be the first to check in!</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Journal View */}
          <div className="space-y-6">
            {Object.entries(entriesByDate).map(([date, entries]) => (
              <motion.div
                key={date}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-6 shadow-lg"
              >
                <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-gray-100">
                  <span className="text-3xl">📅</span>
                  <h3 className="text-xl font-bold text-gray-800">
                    {format(new Date(date), 'MMMM d, yyyy')}
                  </h3>
                  <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-bold">
                    {entries.length} responses
                  </span>
                </div>

                <p className="text-lg font-bold text-purple-600 mb-4 italic">
                  "{entries[0]?.prompt}"
                </p>

                <div className="space-y-3">
                  {entries.map((entry) => (
                    <div key={entry.id} className="bg-gray-50 rounded-xl p-4">
                      <p className="font-bold text-sm text-gray-600 mb-1">
                        {entry.userName}:
                      </p>
                      <p className="text-gray-800">{entry.answer}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}

            {Object.keys(entriesByDate).length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-6xl mb-4">📖</p>
                <p className="text-xl font-bold">No journal entries yet</p>
                <p>Start checking in daily to build your family journal!</p>
              </div>
            )}
          </div>
        </>
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
