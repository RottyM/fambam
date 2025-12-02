'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import UserAvatar from './UserAvatar';
import { format, isToday, startOfDay } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FaTimes, FaPills } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { useTheme } from '@/contexts/ThemeContext';

// --- HELPER: Convert 24h time (14:25) to 12h (2:25 PM) ---
const formatTime = (time24) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const h = parseInt(hours, 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${suffix}`;
};

export default function MemberDetailModal({
  selectedMember,
  setSelectedMember,
  allMedications,
}) {
  const { user, userData } = useAuth();
  const { family, members } = useFamily();
  const { theme, currentTheme } = useTheme();

  const [memberMedications, setMemberMedications] = useState([]);
  const [loadingMedications, setLoadingMedications] = useState(false);

  const getScheduleStatus = useCallback((time, takenLogs, assignedTo) => {
    const now = new Date();
    const [hours, minutes] = time.split(':');
    const scheduledDateTime = new Date();
    scheduledDateTime.setHours(hours, minutes, 0, 0);

    const isTaken = takenLogs?.some(
      (log) => {
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
  }, []); // Dependencies for useCallback

  const handleMarkAsTaken = async (medicationId, scheduledTime) => {
    if (!family?.id || !userData?.uid || !selectedMember?.id) {
      toast.error('Missing family, user, or member ID.');
      return;
    }
    try {
      setMemberMedications(prevMeds =>
        prevMeds.map(med => {
          if (med.id === medicationId) {
            const newLog = {
              takenAt: new Date(),
              takenBy: userData.uid,
              scheduledTime: scheduledTime,
              assignedTo: selectedMember.id,
            };
            return {
              ...med,
              takenLogs: [...(med.takenLogs || []), newLog]
            };
          }
          return med;
        })
      );

      const medicationRef = doc(db, 'families', family.id, 'medications', medicationId);
      await addDoc(collection(medicationRef, 'taken_log'), {
        takenAt: serverTimestamp(),
        takenBy: userData.uid,
        scheduledTime: scheduledTime,
        assignedTo: selectedMember.id,
      });
      toast.success('Medication marked as taken! ✅');
    } catch (error) {
      toast.error('Failed to mark medication as taken.');
      console.error('Error marking medication as taken: ', error);
      if (selectedMember?.id) {
        fetchMedicationsForMember(selectedMember.id);
      }
    }
  };

  const fetchMedicationsForMember = useCallback(async (memberId) => {
    if (!family?.id || !memberId) {
      setMemberMedications([]);
      return;
    }
    setLoadingMedications(true);
    const q = query(
      collection(db, 'families', family.id, 'medications'),
      where('assignedTo', '==', memberId)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const medsList = [];
      for (const medDoc of snapshot.docs) {
        const medData = { id: medDoc.id, ...medDoc.data() };
        const startOfToday = startOfDay(new Date());
        const takenLogQ = query(
          collection(db, 'families', family.id, 'medications', medDoc.id, 'taken_log'),
          where('takenAt', '>=', startOfToday),
          where('assignedTo', '==', memberId)
        );
        const takenLogSnapshot = await getDocs(takenLogQ);
        medData.takenLogs = takenLogSnapshot.docs.map(logDoc => logDoc.data());
        medsList.push(medData);
      }

      const sortedMeds = medsList.sort((a, b) => {
        const getEarliestPendingTime = (med) => {
          let earliestMinutes = Infinity;
          let earliestStatus = 'taken'; // default if all taken

          for (const time of med.times) {
            const status = getScheduleStatus(time, med.takenLogs, med.assignedTo);
            if (status.status !== 'taken') {
              const [hours, minutes] = time.split(':');
              const totalMinutes = parseInt(hours) * 60 + parseInt(minutes);
              if (totalMinutes < earliestMinutes) {
                earliestMinutes = totalMinutes;
                earliestStatus = status.status;
              }
            }
          }

          const statusPriority = earliestStatus === 'missed' ? 0 : earliestStatus === 'pending' ? 1 : 2;
          return { priority: statusPriority, time: earliestMinutes };
        };

        const aTime = getEarliestPendingTime(a);
        const bTime = getEarliestPendingTime(b);

        if (aTime.priority !== bTime.priority) {
          return aTime.priority - bTime.priority;
        }
        return aTime.time - bTime.time;
      });

      setMemberMedications(sortedMeds);
      setLoadingMedications(false);
    });

    return unsubscribe;
  }, [family?.id, getScheduleStatus]);


  useEffect(() => {
    let unsubscribe = () => {};
    if (selectedMember && members.length > 0) {
      fetchMedicationsForMember(selectedMember.id).then(unsub => {
        if (unsub) {
          unsubscribe = unsub;
        }
      });
    } else {
      setMemberMedications([]);
    }
    return () => {
      unsubscribe();
    };
  }, [selectedMember, fetchMedicationsForMember, members]);

  if (!selectedMember) {
    return null;
  }

  return (
    <AnimatePresence>
      {selectedMember && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4"
          onClick={() => setSelectedMember(null)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className={`${theme.colors.bgCard} rounded-3xl p-6 max-w-md w-full shadow-2xl my-8 max-h-[95vh] overflow-y-auto`}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <UserAvatar user={selectedMember} size={64} />
                <div>
                  <h2 className="text-2xl font-display font-bold gradient-text">
                    {selectedMember.displayName}
                  </h2>
                  <p className="text-gray-600">
                    {selectedMember.role === 'parent'
                      ? (currentTheme === 'dark' ? '🧛 Parent' : '👑 Parent')
                      : (currentTheme === 'dark' ? '🧟 Kid' : '🎮 Kid')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <FaTimes size={24} />
              </button>
            </div>

            {selectedMember.role !== 'parent' && (
              <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl p-4 mb-6 text-center">
                <p className="text-gray-100 font-semibold mb-1">Total Points</p>
                <p className="text-4xl font-display font-bold text-gray-100">
                  {currentTheme === 'dark' ? '🩸' : '⭐'} {selectedMember.points || 0}
                </p>
              </div>
            )}

            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <FaPills className="text-purple-500" />
                  Medications
                  {loadingMedications && <span className="ml-2 text-sm text-gray-500">Loading...</span>}
                </h3>
              </div>

              {memberMedications.length > 0 ? (
                <div className="space-y-3">
                  {memberMedications.map((med) => (
                    <div key={med.id} className={`${currentTheme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-purple-50 border-purple-100'} p-3 rounded-xl border relative`}>
                      <p className={`font-bold ${theme.colors.text}`}>{med.name} - {med.dosage}</p>
                      {med.frequency === 'weekly' && med.dayOfWeek && (
                        <p className={`text-xs ${theme.colors.textMuted}`}>
                          Every {med.dayOfWeek}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {med.times.map((time) => {
                          const { status, color, icon } = getScheduleStatus(time, med.takenLogs, med.assignedTo);
                          return (
                            <button
                              key={time}
                              onClick={() => handleMarkAsTaken(med.id, time)}
                              disabled={status === 'taken'}
                              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all ${color}`}
                            >
                              {formatTime(time)} {icon}
                            </button>
                          );
                        })}
                      </div>
                      {med.notes && (
                        <p className={`text-xs italic mt-2 ${theme.colors.textMuted}`}>{med.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <p className="text-3xl mb-2">💊</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">No medications assigned or loading.</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/medication"
                className="bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold py-3 rounded-xl text-center transition-all"
              >
                Add Medication
              </Link>
              <Link
                href="/calendar"
                className="bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold py-3 rounded-xl text-center transition-all"
              >
                View Calendar
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
