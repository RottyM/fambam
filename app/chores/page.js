'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ChoreCard from '@/components/ChoreCard';
import { useChores } from '@/hooks/useFirebase';
import { useFamily } from '@/contexts/FamilyContext';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaTrophy } from 'react-icons/fa';
import { ICON_CATEGORIES, getIcon } from '@/lib/icons';

function ChoresContent() {
  const { chores, loading, addChore } = useChores();
  const { members, isParent } = useFamily();
  const { userData } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newChore, setNewChore] = useState({
    title: '',
    description: '',
    assignedTo: '',
    pointValue: 50,
    iconId: 'cleaning_robot',
  });

  const handleAddChore = async (e) => {
    e.preventDefault();
    await addChore(newChore);
    setShowAddModal(false);
    setNewChore({
      title: '',
      description: '',
      assignedTo: '',
      pointValue: 50,
      iconId: 'cleaning_robot',
    });
  };

  const pendingChores = chores.filter(c => c.status === 'pending');
  const submittedChores = chores.filter(c => c.status === 'submitted');
  const approvedChores = chores.filter(c => c.status === 'approved');
  const myChores = chores.filter(c => c.assignedTo === userData?.uid || c.assignedTo === userData?.id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🧹</div>
          <p className="text-xl font-bold text-purple-600">Loading chores...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display font-bold mb-2">
            <span className="gradient-text">Chore Tracker</span>
          </h1>
          <p className="text-gray-600 font-semibold">
            {pendingChores.length} pending • {submittedChores.length} submitted • {approvedChores.length} completed
          </p>
        </div>
        
        {isParent() && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-6 py-3 rounded-2xl font-bold hover:from-green-600 hover:to-blue-600 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            <FaPlus /> Create Chore
          </button>
        )}
      </div>

      {/* Leaderboard for kids */}
      {!isParent() && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 rounded-3xl p-6 mb-8 shadow-xl"
        >
          <div className="flex items-center gap-3 mb-4">
            <FaTrophy className="text-4xl text-white" />
            <h2 className="text-2xl font-display font-bold text-white">
              Family Leaderboard
            </h2>
          </div>
          
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
            <div className="space-y-2">
              {members
                .filter(m => m.role !== 'parent')
                .sort((a, b) => (b.points || 0) - (a.points || 0))
                .map((member, index) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 bg-white/80 rounded-xl p-3"
                  >
                    <span className="text-2xl font-bold w-8">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                    </span>
                    <span className="flex-1 font-bold text-gray-800">
                      {member.displayName}
                    </span>
                    <span className="text-xl font-bold text-yellow-600">
                      ⭐ {member.points || 0}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Submitted chores (for parents to approve) */}
      {isParent() && submittedChores.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
            <span>⏳</span> Pending Approval
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {submittedChores.map(chore => (
              <ChoreCard key={chore.id} chore={chore} />
            ))}
          </div>
        </div>
      )}

      {/* Active chores */}
      <div className="mb-8">
        <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
          <span>🔥</span> {isParent() ? 'Active Chores' : 'Your Chores'}
        </h2>
        
        {(isParent() ? pendingChores : myChores.filter(c => c.status !== 'approved')).length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-lg">
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-xl font-bold text-gray-600">
              {isParent() ? 'No active chores!' : 'All caught up!'}
            </p>
            <p className="text-gray-500">
              {isParent() ? 'Create some chores to get started' : 'No chores assigned to you right now'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(isParent() ? pendingChores : myChores.filter(c => c.status !== 'approved')).map(chore => (
              <ChoreCard key={chore.id} chore={chore} />
            ))}
          </div>
        )}
      </div>

      {/* Completed chores */}
      {approvedChores.length > 0 && (
        <div>
          <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
            <span>✅</span> Completed This Week
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-70">
            {approvedChores.slice(0, 6).map(chore => (
              <ChoreCard key={chore.id} chore={chore} />
            ))}
          </div>
        </div>
      )}

      {/* Add Chore Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-3xl font-display font-bold mb-6 gradient-text">
                🧹 Create New Chore
              </h2>

              <form onSubmit={handleAddChore} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Chore Title
                  </label>
                  <input
                    type="text"
                    value={newChore.title}
                    onChange={(e) => setNewChore({...newChore, title: e.target.value})}
                    placeholder="e.g., Clean your room"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={newChore.description}
                    onChange={(e) => setNewChore({...newChore, description: e.target.value})}
                    placeholder="What needs to be done?"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Assign to
                  </label>
                  <select
                    value={newChore.assignedTo}
                    onChange={(e) => setNewChore({...newChore, assignedTo: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                    required
                  >
                    <option value="">Select a family member</option>
                    {members.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Point Value ⭐
                  </label>
                  <input
                    type="number"
                    value={newChore.pointValue}
                    onChange={(e) => setNewChore({...newChore, pointValue: parseInt(e.target.value)})}
                    min="10"
                    step="10"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Choose an icon
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {ICON_CATEGORIES.chores.map(icon => (
                      <button
                        key={icon.id}
                        type="button"
                        onClick={() => setNewChore({...newChore, iconId: icon.id})}
                        className={`p-3 text-2xl rounded-xl border-2 transition-all ${
                          newChore.iconId === icon.id
                            ? 'border-purple-500 bg-purple-50 scale-110'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                        title={icon.label}
                      >
                        {getIcon(icon.id)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-green-500 to-blue-500 text-white py-3 rounded-xl font-bold hover:from-green-600 hover:to-blue-600 transition-all shadow-lg"
                  >
                    Create Chore
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function ChoresPage() {
  return (
    <DashboardLayout>
      <ChoresContent />
    </DashboardLayout>
  );
}
