"use client";

import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useFamily } from '../../contexts/FamilyContext';
import { useTheme } from '@/contexts/ThemeContext';
import { FaPlus, FaTrash, FaCalendar, FaUser, FaTimes, FaPrescriptionBottleAlt, FaExclamationTriangle } from 'react-icons/fa';
import DashboardLayout from '../../components/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import UserAvatar from '@/components/UserAvatar';
import toast from 'react-hot-toast';
import { fetchDrugInfo } from '../../lib/drugApi';

const FREQUENCIES = [
  { value: 'daily', label: 'Daily', icon: '📅' },
  { value: 'weekly', label: 'Weekly', icon: '📆' },
  { value: 'as-needed', label: 'As Needed', icon: '💡' },
  { value: 'custom', label: 'Custom', icon: '⚙️' },
];

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// --- HELPER: Convert 24h time (14:25) to 12h (2:25 PM) ---
const formatTime = (time24) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const h = parseInt(hours, 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${suffix}`;
};

const MedicationPage = () => {
  const { userData: user } = useAuth();
  const { members } = useFamily();
  const { theme, currentTheme } = useTheme();
  const [medications, setMedications] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [drugInfos, setDrugInfos] = useState({});
  const [expandedInfos, setExpandedInfos] = useState({});
  const [loadingInfos, setLoadingInfos] = useState({});
  const [activeFilterId, setActiveFilterId] = useState('all'); // For filtering by member

  const isDarkMode = currentTheme === 'dark';

  useEffect(() => {
    if (!user?.familyId) {
      setLoading(false);
      return;
    }
    
    const q = query(
      collection(db, 'families', user.familyId, 'medications'),
      orderBy('name', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const medsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMedications(medsList);
      setLoading(false);
    });

    return unsubscribe;
  }, [user?.familyId]);
  
  const filteredMedications = activeFilterId === 'all'
    ? medications
    : medications.filter(med => med.assignedTo === activeFilterId);
  const pillBase = 'px-4 py-2 rounded-full border-2 font-bold transition-all flex items-center gap-2 whitespace-nowrap';
  const pillActive = 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-300 shadow-lg';
  const pillInactive = currentTheme === 'dark'
    ? 'bg-gray-800 text-gray-200 border-gray-700 hover:border-purple-400'
    : 'bg-gray-100 text-gray-700 border-gray-200 hover:border-purple-300';


  const [newMedication, setNewMedication] = useState({
    name: '',
    dosage: '',
    frequency: 'daily',
    times: ['09:00'],
    assignedTo: '',
    startDate: '',
    endDate: '',
    notes: '',
    dayOfWeek: '',
    customDays: [], // For custom frequency
    takenLogs: [],
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewMedication({ ...newMedication, [name]: value });
  };

  const handleTimeChange = (index, value) => {
    const times = [...newMedication.times];
    times[index] = value;
    setNewMedication({ ...newMedication, times });
  };

  const addTimeInput = () => {
    setNewMedication({ ...newMedication, times: [...newMedication.times, ''] });
  };

  const removeTimeInput = (index) => {
    if (newMedication.times.length > 1) {
      const times = newMedication.times.filter((_, i) => i !== index);
      setNewMedication({ ...newMedication, times });
    }
  };
  
  const handleCustomDayToggle = (day) => {
    const updatedDays = newMedication.customDays.includes(day)
      ? newMedication.customDays.filter(d => d !== day)
      : [...newMedication.customDays, day];
    setNewMedication({ ...newMedication, customDays: updatedDays });
  };

  const handleAddMedication = async (e) => {
    e.preventDefault();

    if (!user?.familyId) {
      toast.error('You must be in a family to add medications.');
      return;
    }

    try {
      await addDoc(collection(db, 'families', user.familyId, 'medications'), {
        ...newMedication,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });

      setNewMedication({
        name: '',
        dosage: '',
        frequency: 'daily',
        times: ['09:00'],
        assignedTo: '',
        startDate: '',
        endDate: '',
        notes: '',
        dayOfWeek: '',
        customDays: [],
        takenLogs: [],
      });
      setShowAddModal(false);
      toast.success('Medication added successfully! 💊');
    } catch (error) {
      toast.error('Failed to add medication.');
      console.error("Error adding medication: ", error);
    }
  };

  const handleDeleteMedication = async (id, medName) => {
    if (confirm(`Delete ${medName}?`)) {
      if (!user?.familyId) {
        toast.error('You must be in a family to delete medications.');
        return;
      }
      try {
        await deleteDoc(doc(db, 'families', user.familyId, 'medications', id));
        toast.success('Medication deleted');
      } catch (error) {
        toast.error('Failed to delete medication.');
      console.error('Failed to delete medication:', error);
      }
    }
  };

  const handleExpandDrugInfo = async (medId, medName) => {
    if (drugInfos[medId]) {
      setExpandedInfos(prev => ({ ...prev, [medId]: !prev[medId] }));
      return;
    }

    setLoadingInfos(prev => ({ ...prev, [medId]: true }));

    try {
      const info = await fetchDrugInfo(medName);
      setDrugInfos(prev => ({ ...prev, [medId]: info }));
      setExpandedInfos(prev => ({ ...prev, [medId]: true }));
    } catch (error) {
      toast.error('Failed to fetch drug information');
      console.error('Error fetching drug information:', error);
    } finally {
      setLoadingInfos(prev => ({ ...prev, [medId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">💊</div>
          <p className="text-xl font-bold text-purple-600">Loading medications...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-2">
              <span className={currentTheme === 'dark' ? 'text-purple-400' : 'gradient-text'}>
                {currentTheme === 'dark' ? 'Elixirs' : 'Medication Tracker'}
              </span>
            </h1>
            <p className={`text-sm md:text-base font-semibold ${theme.colors.textMuted}`}>
              {medications.length} active prescription{medications.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white w-10 h-10 md:w-auto md:h-auto md:px-6 md:py-3 rounded-2xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            aria-label="Add Medication"
          >
            <FaPlus /> <span className="hidden md:inline">Add Medication</span>
          </button>
        </div>
      </div>

      {/* --- Filter Bar --- */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto custom-scrollbar pb-4 pt-2 px-1">
        <div className="flex gap-4 shrink-0">
          <button
            onClick={() => setActiveFilterId('all')}
            className={`${pillBase} ${activeFilterId === 'all' ? pillActive : pillInactive}`}
          >
            <FaUser size={14} />
            <span>All</span>
          </button>
          {members.map(member => (
            <button
              key={member.id}
              onClick={() => setActiveFilterId(member.id)}
              className={`${pillBase} ${activeFilterId === member.id ? pillActive : pillInactive}`}
            >
              <UserAvatar user={member} size={24} />
              <span>{member.displayName}</span>
            </button>
          ))}
        </div>
      </div>

      {filteredMedications.length === 0 ? (
        <div className={`${theme.colors.bgCard} rounded-2xl p-12 text-center shadow-lg border ${theme.colors.border}`}>
          <div className="text-6xl mb-4">💊</div>
          <p className={`text-xl font-bold ${theme.colors.textMuted}`}>
            {activeFilterId === 'all' ? 'No medications yet' : 'No medications for this member'}
          </p>
          <p className={theme.colors.textMuted}>Add your family&apos;s medications to track schedules</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMedications.map((med) => {
            const member = members.find(m => m.id === med.assignedTo);
            const info = drugInfos[med.id];

            return (
              <motion.div
                key={med.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`${theme.colors.bgCard} rounded-3xl overflow-hidden shadow-lg border ${theme.colors.border} hover:shadow-xl transition-all flex flex-col`}
              >
                {/* Top "Label" Strip */}
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-2">
                    {/* Assigned User Tag */}
                    <div className={`flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wide ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                      {member ? (
                        <>
                          <UserAvatar user={member} size={16} />
                          <span>{member.displayName}</span>
                        </>
                      ) : (
                        <span>Unassigned</span>
                      )}
                    </div>
                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteMedication(med.id, med.name)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>

                  {/* HERO: Drug Name & Dosage */}
                  <div className="mb-4">
                    <h3 className={`text-2xl font-bold leading-tight mb-1 ${theme.colors.text}`}>
                      {med.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md text-sm font-bold border border-purple-200">
                        {med.dosage}
                      </span>
                    </div>
                  </div>

                  {/* Directions Card */}
                  <div className={`p-3 rounded-xl mb-4 border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-yellow-50/50 border-yellow-100'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 ${isDarkMode ? 'text-purple-400' : 'text-yellow-600'}`}>
                        <FaPrescriptionBottleAlt /> 
                      </div>
                      <div>
                        <p className={`text-xs font-bold uppercase mb-1 ${isDarkMode ? 'text-gray-400' : 'text-yellow-700/70'}`}>Directions</p>
                        <p className={`text-sm font-medium ${theme.colors.text}`}>
                          Take <strong>{med.frequency}</strong> at:
                        </p>
                        {med.frequency === 'weekly' && med.dayOfWeek && (
                          <p className={`text-sm font-medium ${theme.colors.text}`}>
                            On <strong>{med.dayOfWeek}</strong>
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {med.times.map((time, idx) => (
                            <span key={idx} className="bg-blue-500 text-white px-2 py-0.5 rounded text-xs font-bold">
                              {/* FORMATTED TIME HERE */}
                              {formatTime(time)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Info */}
                  <div className="space-y-2 text-xs">
                    {med.startDate && (
                      <div className={`flex items-center gap-2 ${theme.colors.textMuted}`}>
                        <FaCalendar />
                        <span>{new Date(med.startDate).toLocaleDateString()} {med.endDate && ` - ${new Date(med.endDate).toLocaleDateString()}`}</span>
                      </div>
                    )}
                    {med.notes && (
                      <div className={`italic ${theme.colors.textMuted} border-l-2 pl-2 border-gray-300 dark:border-gray-700`}>
                        &quot;{med.notes}&quot;
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Bar - FIXED LIGHT MODE STYLING */}
                <button
                  onClick={() => handleExpandDrugInfo(med.id, med.name)}
                  className={`w-full py-4 text-xs font-bold uppercase tracking-wider transition-all border-t ${
                    expandedInfos[med.id] 
                      // Active State
                      ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400' 
                      // Inactive State (Fixed for visibility)
                      : isDarkMode
                        ? 'bg-gray-800/50 text-gray-400 border-gray-700 hover:bg-gray-700'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {loadingInfos[med.id] ? 'Loading Info...' : expandedInfos[med.id] ? 'Hide Drug Details' : 'View Drug Details'}
                </button>

                {/* EXPANDED DRUG INFO */}
                <AnimatePresence>
                  {expandedInfos[med.id] && info && (
                    <motion.div 
                      initial={{ height: 0 }} 
                      animate={{ height: 'auto' }} 
                      exit={{ height: 0 }} 
                      className={`overflow-hidden border-t ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-200'}`}
                    >
                      <div className="p-4 space-y-3">
                        {/* Info Sections... */}
                        {info.boxedWarning && (
                          <details className={`rounded-lg border overflow-hidden group ${isDarkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
                            <summary className={`cursor-pointer px-4 py-3 font-bold flex items-center gap-2 text-sm ${isDarkMode ? 'text-red-300 hover:bg-red-900/30' : 'text-red-800 hover:bg-red-100'}`}>
                              <FaExclamationTriangle /> Boxed Warning
                            </summary>
                            <div className={`px-4 pb-3 text-xs leading-relaxed ${isDarkMode ? 'text-red-200' : 'text-red-900'}`}>
                              {info.boxedWarning}
                            </div>
                          </details>
                        )}
                        {/* ... (Other sections omitted for brevity but are included in the full copy/paste) ... */}
                        {info.warnings && (
                          <details className={`rounded-lg border overflow-hidden group ${isDarkMode ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200'}`}>
                            <summary className={`cursor-pointer px-4 py-3 font-bold flex items-center gap-2 text-sm ${isDarkMode ? 'text-yellow-300 hover:bg-yellow-900/30' : 'text-yellow-800 hover:bg-yellow-100'}`}>
                              ⚠️ Warnings
                            </summary>
                            <div className={`px-4 pb-3 text-xs leading-relaxed ${isDarkMode ? 'text-yellow-200' : 'text-yellow-900'}`}>
                              {info.warnings}
                            </div>
                          </details>
                        )}
                        {info.sideEffects && (
                          <details className={`rounded-lg border overflow-hidden group ${isDarkMode ? 'bg-orange-900/20 border-orange-800' : 'bg-orange-50 border-orange-200'}`}>
                            <summary className={`cursor-pointer px-4 py-3 font-bold flex items-center gap-2 text-sm ${isDarkMode ? 'text-orange-300 hover:bg-orange-900/30' : 'text-orange-800 hover:bg-orange-100'}`}>
                              🤢 Side Effects
                            </summary>
                            <div className={`px-4 pb-3 text-xs leading-relaxed ${isDarkMode ? 'text-orange-200' : 'text-orange-900'}`}>
                              {info.sideEffects}
                            </div>
                          </details>
                        )}
                        {/* ... Adding back remaining sections ... */}
                        {info.interactions && (
                          <details className={`rounded-lg border overflow-hidden group ${isDarkMode ? 'bg-purple-900/20 border-purple-800' : 'bg-purple-50 border-purple-200'}`}>
                            <summary className={`cursor-pointer px-4 py-3 font-bold flex items-center gap-2 text-sm ${isDarkMode ? 'text-purple-300 hover:bg-purple-900/30' : 'text-purple-800 hover:bg-purple-100'}`}>
                              🔄 Interactions
                            </summary>
                            <div className={`px-4 pb-3 text-xs leading-relaxed ${isDarkMode ? 'text-purple-200' : 'text-purple-900'}`}>
                              {info.interactions}
                            </div>
                          </details>
                        )}
                        {info.indications && (
                          <details className={`rounded-lg border overflow-hidden group ${isDarkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'}`}>
                            <summary className={`cursor-pointer px-4 py-3 font-bold flex items-center gap-2 text-sm ${isDarkMode ? 'text-green-300 hover:bg-green-900/30' : 'text-green-800 hover:bg-green-100'}`}>
                              ✅ Uses
                            </summary>
                            <div className={`px-4 pb-3 text-xs leading-relaxed ${isDarkMode ? 'text-green-200' : 'text-green-900'}`}>
                              {info.indications}
                            </div>
                          </details>
                        )}
                        {info.dosage && (
                          <details className={`rounded-lg border overflow-hidden group ${isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
                            <summary className={`cursor-pointer px-4 py-3 font-bold flex items-center gap-2 text-sm ${isDarkMode ? 'text-blue-300 hover:bg-blue-900/30' : 'text-blue-800 hover:bg-blue-100'}`}>
                              📋 Dosage Details
                            </summary>
                            <div className={`px-4 pb-3 text-xs leading-relaxed ${isDarkMode ? 'text-blue-200' : 'text-blue-900'}`}>
                              {info.dosage}
                            </div>
                          </details>
                        )}

                        <div className="text-xs text-gray-400 italic text-center pt-2">
                          Data from FDA API. Consult a doctor for medical advice.
                        </div>
                      </div>
                    </motion.div>
                  )}
                  {expandedInfos[med.id] && !info && !loadingInfos[med.id] && (
                    <div className={`p-4 text-center text-sm ${theme.colors.textMuted}`}>
                      No detailed information found for &quot;{med.name}&quot;
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className={`${theme.colors.bgCard} rounded-3xl p-6 max-w-xl w-full shadow-2xl my-8 border ${theme.colors.border}`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold gradient-text">Add Medication</h2>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 p-2">
                  <FaTimes size={20} />
                </button>
              </div>

              <form onSubmit={handleAddMedication} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-bold ${theme.colors.textMuted} mb-1`}>Medication Name</label>
                    <input
                      type="text"
                      name="name"
                      placeholder="e.g., Ibuprofen"
                      value={newMedication.name}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 rounded-xl border-2 focus:border-purple-500 focus:outline-none font-semibold bg-transparent ${theme.colors.text} ${theme.colors.border}`}
                      required
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold ${theme.colors.textMuted} mb-1`}>Dosage</label>
                    <input
                      type="text"
                      name="dosage"
                      placeholder="e.g., 200mg"
                      value={newMedication.dosage}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 rounded-xl border-2 focus:border-purple-500 focus:outline-none font-semibold bg-transparent ${theme.colors.text} ${theme.colors.border}`}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-bold ${theme.colors.textMuted} mb-1`}>Patient</label>
                  <select
                    name="assignedTo"
                    value={newMedication.assignedTo}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 rounded-xl border-2 focus:border-purple-500 focus:outline-none font-semibold bg-transparent ${theme.colors.text} ${theme.colors.border}`}
                    required
                  >
                    <option value="">Select family member...</option>
                    {members.map(member => (
                      <option key={member.id} value={member.id}>{member.displayName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-bold ${theme.colors.textMuted} mb-1`}>Frequency</label>
                  <div className="grid grid-cols-4 gap-2">
                    {FREQUENCIES.map(freq => (
                      <button
                        key={freq.value}
                        type="button"
                        onClick={() => setNewMedication({ ...newMedication, frequency: freq.value })}
                        className={`p-2 rounded-xl border-2 transition-all text-center flex flex-col items-center justify-center ${
                          newMedication.frequency === freq.value
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                            : `${theme.colors.border} hover:border-purple-300`
                        }`}
                      >
                        <div className="text-lg mb-1">{freq.icon}</div>
                        <div className={`text-[10px] font-bold ${theme.colors.text}`}>{freq.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {newMedication.frequency === 'custom' && (
                  <div>
                    <label className={`block text-xs font-bold ${theme.colors.textMuted} mb-2`}>Select Custom Days</label>
                    <div className="grid grid-cols-7 gap-1">
                      {DAYS_OF_WEEK.map(day => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleCustomDayToggle(day)}
                          className={`p-2 rounded-lg border-2 text-xs font-bold transition-all ${
                            newMedication.customDays.includes(day)
                              ? 'bg-purple-500 text-white border-purple-500'
                              : `${theme.colors.border} hover:border-purple-300`
                          }`}
                        >
                          {day.substring(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {newMedication.frequency === 'weekly' && (
                  <div>
                    <label className={`block text-xs font-bold ${theme.colors.textMuted} mb-1`}>Day of Week</label>
                    <select
                      name="dayOfWeek"
                      value={newMedication.dayOfWeek}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 rounded-xl border-2 focus:border-purple-500 focus:outline-none font-semibold bg-transparent ${theme.colors.text} ${theme.colors.border}`}
                      required={newMedication.frequency === 'weekly'}
                    >
                      <option value="">Select a day...</option>
                      {DAYS_OF_WEEK.map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className={`block text-xs font-bold ${theme.colors.textMuted} mb-1`}>Schedule Times</label>
                  <div className="space-y-2">
                    {newMedication.times.map((time, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="time"
                          value={time}
                          onChange={(e) => handleTimeChange(index, e.target.value)}
                          className={`flex-1 px-4 py-2 rounded-xl border-2 focus:border-purple-500 focus:outline-none font-semibold bg-transparent ${theme.colors.text} ${theme.colors.border}`}
                          required
                        />
                        {newMedication.times.length > 1 && (
                          <button type="button" onClick={() => removeTimeInput(index)} className="text-red-400 hover:text-red-600 p-2">
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addTimeInput} className="mt-2 text-xs text-purple-500 font-bold hover:underline flex items-center gap-1">
                    <FaPlus size={10} /> Add Time
                  </button>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                  >
                    Save Prescription
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default function MedicationPageWrapper() {
  return (
    <DashboardLayout>
      <MedicationPage/>
    </DashboardLayout>
  );
}



