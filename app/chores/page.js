'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ChoreCard from '@/components/ChoreCard';
import { useChores } from '@/hooks/useFirestore';
import { useFamily } from '@/contexts/FamilyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaTrophy, FaTrash, FaTimes, FaFilter } from 'react-icons/fa';
import { ICON_CATEGORIES, getIcon } from '@/lib/icons';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';

function ChoresContent() {
  const { chores, loading, addChore } = useChores();
  const { members, isParent } = useFamily();
  const { userData } = useAuth();
  const { theme } = useTheme();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterMember, setFilterMember] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
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

  const handleClearCompletedChores = async () => {
    if (!userData?.familyId) return;
    if (!confirm('Clear all completed chores? This cannot be undone.')) return;

    try {
      const completedChores = chores.filter(c => c.status === 'approved');
      await Promise.all(
        completedChores.map(chore =>
          deleteDoc(doc(db, 'families', userData.familyId, 'chores', chore.id))
        )
      );
      toast.success('Completed chores cleared! 🧹');
    } catch (error) {
      console.error('Error clearing chores:', error);
      toast.error('Failed to clear completed chores');
    }
  };

  const filteredChores = chores.filter(c => {
    if (filterMember !== 'all' && c.assignedTo !== filterMember) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    return true;
  });

  const pendingChores = filteredChores.filter(c => c.status === 'pending');
  const submittedChores = filteredChores.filter(c => c.status === 'submitted');
  const approvedChores = filteredChores.filter(c => c.status === 'approved');
  const myChores = filteredChores.filter(c => c.assignedTo === userData?.uid || c.assignedTo === userData?.id);

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
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-display font-bold mb-2">
              <span className="gradient-text">Chore Tracker</span>
            </h1>
          <p className="text-base md:text-lg text-gray-800 font-semibold">
            {pendingChores.length} pending • {submittedChores.length} submitted • {approvedChores.length} completed
          </p>
        </div>

          {isParent() && (
            <div className="flex flex-1 sm:flex-none justify-end items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 md:px-5 py-3 rounded-2xl text-sm font-bold transition-all shadow-sm border ${
                  showFilters
                    ? 'bg-purple-500 border-purple-500 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <FaFilter /> Filters
                {(filterMember !== 'all' || filterStatus !== 'all') && (
                  <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-[10px]">
                    Active
                  </span>
                )}
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-3 md:px-6 py-3 rounded-2xl font-bold hover:from-green-600 hover:to-blue-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                aria-label="Create Chore"
              >
                <FaPlus /> <span className="hidden sm:inline">Create Chore</span>
              </button>
            </div>
          )}
        </div>

        {/* Clear completed chores button for parents */}
        {isParent() && approvedChores.length > 0 && (
          <button
            onClick={handleClearCompletedChores}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 text-sm"
          >
            <FaTrash /> Clear {approvedChores.length} Completed Chore{approvedChores.length !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Filters - styled like calendar */}
      <div className="mb-6">
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-2"
            >
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <div className="flex-1">
                  <label className={`text-xs font-bold mb-1 block ml-1 ${theme.colors.textMuted}`}>Member</label>
                  <select
                    value={filterMember}
                    onChange={(e) => setFilterMember(e.target.value)}
                    className={`w-full px-3 py-2 text-base rounded-xl border-2 focus:border-purple-500 outline-none font-semibold ${theme.colors.bgCard} ${theme.colors.text} ${theme.colors.border}`}
                  >
                    <option value="all">All Members</option>
                    {members.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label className={`text-xs font-bold mb-1 block ml-1 ${theme.colors.textMuted}`}>Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className={`w-full px-3 py-2 text-base rounded-xl border-2 focus:border-purple-500 outline-none font-semibold ${theme.colors.bgCard} ${theme.colors.text} ${theme.colors.border}`}
                  >
                    <option value="all">All</option>
                    <option value="pending">Pending</option>
                    <option value="submitted">Submitted</option>
                    <option value="approved">Approved</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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

      {/* Leaderboard for parents */}
      {isParent() && members.filter(m => m.role !== 'parent').length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 rounded-3xl p-6 mb-8 shadow-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FaTrophy className="text-4xl text-white" />
              <h2 className="text-2xl font-display font-bold text-white">
                Family Leaderboard
              </h2>
            </div>
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
            <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-bold">
              {submittedChores.length}
            </span>
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
          {(isParent() ? pendingChores : myChores.filter(c => c.status !== 'approved')).length > 0 && (
            <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-bold">
              {(isParent() ? pendingChores : myChores.filter(c => c.status !== 'approved')).length}
            </span>
          )}
        </h2>

        {(isParent() ? pendingChores : myChores.filter(c => c.status !== 'approved')).length === 0 ? (
          <div className={`${theme.colors.bgCard} rounded-2xl p-12 text-center shadow-lg`}>
            <div className="text-6xl mb-4">🎉</div>
            <p className={`text-xl font-bold ${theme.colors.textMuted}`}>
              {isParent() ? 'No active chores!' : 'All caught up!'}
            </p>
            <p className={theme.colors.textMuted}>
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
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
              {approvedChores.length}
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-70">
            {approvedChores.slice(0, 6).map(chore => (
              <ChoreCard key={chore.id} chore={chore} />
            ))}
          </div>
          {approvedChores.length > 6 && (
            <p className="text-center text-gray-500 mt-4 text-sm">
              + {approvedChores.length - 6} more completed chores
            </p>
          )}
        </div>
      )}

      {/* Add Chore Modal */}
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
              className={`${theme.colors.bgCard} rounded-3xl p-6 max-w-md w-full shadow-2xl my-8 max-h-[95vh] overflow-y-auto`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-display font-bold gradient-text">
                  🧹 Create New Chore
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <FaTimes size={24} />
                </button>
              </div>

              <form onSubmit={handleAddChore} className="space-y-4">
                <div>
                  <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
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
                  <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
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
                  <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
                    Assign to
                  </label>
                  <select
                    value={newChore.assignedTo}
                    onChange={(e) => setNewChore({...newChore, assignedTo: e.target.value})}
                    className={`w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold ${theme.colors.bgCard}`}
                    required
                  >
                    <option value="">Select a family member...</option>
                    {members.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
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
                  <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
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
