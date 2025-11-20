"use client";

import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useFamily } from '../../contexts/FamilyContext';
import { FaPlus, FaTrash, FaClock, FaPills, FaCalendar, FaUser, FaTimes } from 'react-icons/fa';
import DashboardLayout from '../../components/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import UserAvatar from '@/components/UserAvatar';
import toast from 'react-hot-toast';

const FREQUENCIES = [
  { value: 'daily', label: 'Daily', icon: '📅' },
  { value: 'weekly', label: 'Weekly', icon: '📆' },
  { value: 'as-needed', label: 'As Needed', icon: '💡' },
  { value: 'custom', label: 'Custom', icon: '⚙️' },
];

const MedicationPage = () => {
  const { userData: user } = useAuth();
  const { members } = useFamily();
  const [medications, setMedications] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const [newMedication, setNewMedication] = useState({
    name: '',
    dosage: '',
    frequency: 'daily',
    times: ['09:00'],
    assignedTo: '',
    startDate: '',
    endDate: '',
    notes: '',
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
        console.error("Error deleting medication: ", error);
      }
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-4xl font-display font-bold mb-2">
              <span className="gradient-text">Medication Tracker</span>
            </h1>
            <p className="text-sm md:text-base text-gray-600 font-semibold">
              {medications.length} active medication{medications.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 md:px-6 py-3 rounded-2xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            aria-label="Add Medication"
          >
            <FaPlus /> <span className="hidden sm:inline">Add Medication</span>
          </button>
        </div>
      </div>

      {medications.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-lg">
          <div className="text-6xl mb-4">💊</div>
          <p className="text-xl font-bold text-gray-600">No medications yet</p>
          <p className="text-gray-500">Add your family's medications to track schedules</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {medications.map((med) => {
            const member = members.find(m => m.id === med.assignedTo);
            const frequency = FREQUENCIES.find(f => f.value === med.frequency);

            return (
              <motion.div
                key={med.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all"
              >
                <div className="bg-gradient-to-r from-purple-400 to-pink-400 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {member && <UserAvatar user={member} size={48} />}
                      <div>
                        <p className="font-bold text-white text-lg">{member?.displayName || 'Unassigned'}</p>
                        <p className="text-purple-100 text-sm">{med.name}</p>
                      </div>
                    </div>
                    <div className="text-4xl">💊</div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="mb-4">
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <FaPills className="text-purple-500" />
                      <span className="font-semibold">Dosage:</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-800">{med.dosage}</p>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <span className="text-xl">{frequency?.icon}</span>
                      <span className="font-semibold">Frequency:</span>
                    </div>
                    <p className="text-gray-800">{frequency?.label}</p>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <FaClock className="text-blue-500" />
                      <span className="font-semibold">Times:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {med.times.map((time, idx) => (
                        <span
                          key={idx}
                          className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold"
                        >
                          {time}
                        </span>
                      ))}
                    </div>
                  </div>

                  {med.startDate && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 text-gray-600 mb-2">
                        <FaCalendar className="text-green-500" />
                        <span className="font-semibold">Duration:</span>
                      </div>
                      <p className="text-gray-800 text-sm">
                        {new Date(med.startDate).toLocaleDateString()}
                        {med.endDate && ` - ${new Date(med.endDate).toLocaleDateString()}`}
                      </p>
                    </div>
                  )}

                  {med.notes && (
                    <div className="mb-4 bg-gray-50 p-3 rounded-xl">
                      <p className="text-gray-600 text-sm">{med.notes}</p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-200 flex justify-end gap-2">
                    <button
                      onClick={() => handleDeleteMedication(med.id, med.name)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Medication Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl my-8 max-h-[95vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-display font-bold gradient-text">
                  💊 Add Medication
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <FaTimes size={24} />
                </button>
              </div>

              <form onSubmit={handleAddMedication} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Medication Name */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Medication Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      placeholder="e.g., Vitamin D, Aspirin"
                      value={newMedication.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                      required
                    />
                  </div>

                  {/* Dosage */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Dosage
                    </label>
                    <input
                      type="text"
                      name="dosage"
                      placeholder="e.g., 1 tablet, 500mg"
                      value={newMedication.dosage}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                      required
                    />
                  </div>

                  {/* Assign To */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Assign To
                    </label>
                    <select
                      name="assignedTo"
                      value={newMedication.assignedTo}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold appearance-none bg-white"
                      required
                    >
                      <option value="">Select family member...</option>
                      {members.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.displayName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Frequency */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Frequency
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {FREQUENCIES.map(freq => (
                        <button
                          key={freq.value}
                          type="button"
                          onClick={() => setNewMedication({ ...newMedication, frequency: freq.value })}
                          className={`p-3 rounded-xl border-2 transition-all text-center ${
                            newMedication.frequency === freq.value
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-purple-300'
                          }`}
                        >
                          <div className="text-xl mb-1">{freq.icon}</div>
                          <div className="text-xs font-bold text-gray-700">{freq.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Reminder Times */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Reminder Times
                  </label>
                  <div className="space-y-3">
                    {newMedication.times.map((time, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <FaClock className="text-gray-400" />
                        <input
                          type="time"
                          value={time}
                          onChange={(e) => handleTimeChange(index, e.target.value)}
                          className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                          required
                        />
                        {newMedication.times.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTimeInput(index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addTimeInput}
                    className="mt-3 text-sm text-purple-600 font-bold hover:underline flex items-center gap-2"
                  >
                    <FaPlus /> Add another time
                  </button>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Start Date (optional)
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      value={newMedication.startDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      End Date (optional)
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      value={newMedication.endDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    name="notes"
                    placeholder="Any special instructions or notes..."
                    value={newMedication.notes}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                    rows={3}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <FaPlus /> Add Medication
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
      <MedicationPage />
    </DashboardLayout>
  );
}
