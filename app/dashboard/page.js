'use client';

import DashboardLayout from '@/components/DashboardLayout';
import DailyMeme from '@/components/DailyMeme';
import UserAvatar from '@/components/UserAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useTodos, useChores, useMemories, useCalendarEvents } from '@/hooks/useFirebase';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';
import { format, isFuture, isToday, isTomorrow, parseISO } from 'date-fns';
import { FaCheckCircle, FaBroom, FaCalendarAlt, FaImages, FaPills, FaClock, FaMapMarkerAlt, FaTimes, FaUtensils, FaShoppingCart, FaFileAlt, FaKey } from 'react-icons/fa';

function StatsCard({ icon, title, value, color, href }) {
  return (
    <Link href={href} className="h-full">
      <motion.div
        whileHover={{ scale: 1.05, y: -5 }}
        className={`${color} rounded-2xl p-3 md:p-6 shadow-lg hover:shadow-2xl transition-all cursor-pointer card-hover flex flex-col h-full`}
      >
        <div className="flex items-center justify-between mb-2 md:mb-4">
          <div className="text-2xl md:text-4xl">{icon}</div>
          <div className="text-2xl md:text-3xl font-display font-bold text-white">
            {value}
          </div>
        </div>
        <h3 className="text-white font-bold text-sm md:text-lg">{title}</h3>
      </motion.div>
    </Link>
  );
}

function DashboardContent() {
  const { userData } = useAuth();
  const { family, members } = useFamily();
  const { theme, currentTheme } = useTheme();
  const { todos } = useTodos();
  const { chores } = useChores();
  const { memories } = useMemories();
  const { events } = useCalendarEvents();
  const [selectedMember, setSelectedMember] = useState(null);

  const pendingTodos = todos.filter(t => !t.completed).length;
  const pendingChores = chores.filter(c => c.status !== 'approved').length;
  const recentMemories = memories.length;

  // Get upcoming events (today and future)
  const upcomingEvents = events
    .filter(event => {
      const eventDate = event.start?.toDate ? event.start.toDate() : new Date(event.start);
      return isFuture(eventDate) || isToday(eventDate);
    })
    .slice(0, 5);

  // Mock medications (you can replace this with actual data from Firebase later)
  const medications = {
    // memberId: [medications array]
  };

  const getEventDateLabel = (event) => {
    const eventDate = event.start?.toDate ? event.start.toDate() : new Date(event.start);
    if (isToday(eventDate)) return 'Today';
    if (isTomorrow(eventDate)) return 'Tomorrow';
    return format(eventDate, 'MMM d');
  };

  const EVENT_CATEGORIES = {
    appointment: { icon: '🏥', color: 'bg-blue-100', textColor: 'text-blue-800' },
    birthday: { icon: '🎂', color: 'bg-pink-100', textColor: 'text-pink-800' },
    activity: { icon: '⚽', color: 'bg-green-100', textColor: 'text-green-800' },
    school: { icon: '📚', color: 'bg-yellow-100', textColor: 'text-yellow-800' },
    reminder: { icon: '⏰', color: 'bg-purple-100', textColor: 'text-purple-800' },
    social: { icon: '🎉', color: 'bg-orange-100', textColor: 'text-orange-800' },
    other: { icon: '📌', color: 'bg-gray-100', textColor: 'text-gray-800' },
  };

  return (
    <div className="space-y-3 md:space-y-6">
      {/* Welcome header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${theme.colors.bgCard} rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-xl border-2 md:border-4 ${theme.colors.border}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-4xl font-display font-bold mb-1 md:mb-2">
              <span className={currentTheme === 'dark' ? 'text-purple-400' : 'gradient-text'}>
                {theme.messages.welcome}, {userData?.displayName}!
              </span>
            </h1>
            <p className={`text-xs md:text-xl ${theme.colors.textMuted} font-semibold`}>
              {family?.name || (currentTheme === 'dark' ? 'Your Coven' : 'Your Family')} • {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <div className="text-3xl md:text-6xl animate-wiggle flex-shrink-0">
            {currentTheme === 'dark' ? '🦇' : '👋'}
          </div>
        </div>

        {/* Points display for kids */}
        {userData?.role !== 'parent' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="mt-3 md:mt-6 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl md:rounded-2xl p-4 md:p-6 text-center"
          >
            <p className="text-white font-semibold mb-1 md:mb-2 text-sm md:text-base">Your Points</p>
            <p className="text-3xl md:text-5xl font-display font-bold text-white">
              ⭐ {userData?.points || 0}
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        <StatsCard
          icon={currentTheme === 'dark' ? '☑️' : '✅'}
          title={currentTheme === 'dark' ? 'Pending Tasks' : 'To-Dos'}
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
          icon="📅"
          title="Events"
          value={upcomingEvents.length}
          color="bg-gradient-to-br from-blue-400 to-purple-500"
          href="/calendar"
        />
        <StatsCard
          icon={currentTheme === 'dark' ? '💀' : '📸'}
          title={currentTheme === 'dark' ? 'Archives' : 'Memories'}
          value={recentMemories}
          color={`bg-gradient-to-br ${theme.colors.statGreen}`}
          href="/memories"
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6">
        {/* Left column - Calendar Events */}
        <div className="lg:col-span-2 space-y-3 md:space-y-6">
          {/* Upcoming Events */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className="text-lg md:text-2xl font-display font-bold flex items-center gap-2">
                <span className="text-xl md:text-2xl">📅</span>
                <span className="hidden sm:inline">Upcoming Events</span>
                <span className="sm:hidden">Events</span>
              </h2>
              <Link
                href="/calendar"
                className="text-sm font-bold text-purple-600 hover:text-purple-800 transition-colors"
              >
                View All →
              </Link>
            </div>

            {upcomingEvents.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-5xl mb-3">📆</p>
                <p className="font-semibold text-gray-600">No upcoming events</p>
                <p className="text-sm">Your calendar is clear!</p>
              </div>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {upcomingEvents.map(event => {
                  const category = EVENT_CATEGORIES[event.category] || EVENT_CATEGORIES.other;
                  const assignedMembers = members.filter(m => event.assignedTo?.includes(m.id));

                  return (
                    <motion.div
                      key={event.id}
                      whileHover={{ scale: 1.02 }}
                      className={`${category.color} p-3 md:p-4 rounded-xl md:rounded-2xl transition-all cursor-pointer`}
                    >
                      <div className="flex items-start gap-2 md:gap-4">
                        <div className="flex-shrink-0">
                          <div className={`${category.textColor} text-2xl md:text-3xl`}>
                            {category.icon}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1 md:mb-2">
                            <h3 className={`font-bold ${category.textColor} text-sm md:text-lg`}>
                              {event.title}
                            </h3>
                            <span className={`${category.textColor} text-xs md:text-sm font-bold whitespace-nowrap`}>
                              {getEventDateLabel(event)}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm">
                            <div className={`flex items-center gap-1 ${category.textColor}`}>
                              <FaClock className="text-xs md:text-sm" />
                              <span className="font-semibold">
                                {format(
                                  event.start?.toDate ? event.start.toDate() : new Date(event.start),
                                  'h:mm a'
                                )}
                              </span>
                            </div>

                            {event.location && (
                              <div className={`flex items-center gap-1 ${category.textColor}`}>
                                <FaMapMarkerAlt className="text-xs md:text-sm" />
                                <span className="font-semibold truncate">{event.location}</span>
                              </div>
                            )}

                            {assignedMembers.length > 0 && (
                              <div className="flex items-center gap-1">
                                {assignedMembers.slice(0, 3).map(member => (
                                  <UserAvatar key={member.id} user={member} size={20} />
                                ))}
                                {assignedMembers.length > 3 && (
                                  <span className={`${category.textColor} text-xs font-bold`}>
                                    +{assignedMembers.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl"
          >
            <h2 className="text-lg md:text-2xl font-display font-bold mb-3 md:mb-4 flex items-center gap-2">
              <span className="text-xl md:text-2xl">⚡</span>
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
              <Link href="/recipes">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-gradient-to-br from-orange-400 to-pink-400 p-3 md:p-4 rounded-xl md:rounded-2xl text-white text-center cursor-pointer shadow-lg hover:shadow-xl transition-all"
                >
                  <FaUtensils className="text-2xl md:text-3xl mx-auto mb-1 md:mb-2" />
                  <p className="font-bold text-xs md:text-base">Recipes</p>
                </motion.div>
              </Link>
              <Link href="/groceries">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-gradient-to-br from-green-400 to-blue-400 p-3 md:p-4 rounded-xl md:rounded-2xl text-white text-center cursor-pointer shadow-lg hover:shadow-xl transition-all"
                >
                  <FaShoppingCart className="text-2xl md:text-3xl mx-auto mb-1 md:mb-2" />
                  <p className="font-bold text-xs md:text-base">Groceries</p>
                </motion.div>
              </Link>
              <Link href="/calendar">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-gradient-to-br from-blue-400 to-purple-400 p-3 md:p-4 rounded-xl md:rounded-2xl text-white text-center cursor-pointer shadow-lg hover:shadow-xl transition-all"
                >
                  <FaCalendarAlt className="text-2xl md:text-3xl mx-auto mb-1 md:mb-2" />
                  <p className="font-bold text-xs md:text-base">Calendar</p>
                </motion.div>
              </Link>
              <Link href="/documents">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-gradient-to-br from-indigo-400 to-cyan-400 p-3 md:p-4 rounded-xl md:rounded-2xl text-white text-center cursor-pointer shadow-lg hover:shadow-xl transition-all"
                >
                  <FaFileAlt className="text-2xl md:text-3xl mx-auto mb-1 md:mb-2" />
                  <p className="font-bold text-xs md:text-base">Documents</p>
                </motion.div>
              </Link>
              <Link href="/medication">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-gradient-to-br from-purple-400 to-pink-400 p-3 md:p-4 rounded-xl md:rounded-2xl text-white text-center cursor-pointer shadow-lg hover:shadow-xl transition-all"
                >
                  <FaPills className="text-2xl md:text-3xl mx-auto mb-1 md:mb-2" />
                  <p className="font-bold text-xs md:text-base">Medication</p>
                </motion.div>
              </Link>
              <Link href="/memories">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-gradient-to-br from-rose-400 to-orange-400 p-3 md:p-4 rounded-xl md:rounded-2xl text-white text-center cursor-pointer shadow-lg hover:shadow-xl transition-all"
                >
                  <FaImages className="text-2xl md:text-3xl mx-auto mb-1 md:mb-2" />
                  <p className="font-bold text-xs md:text-base">Memories</p>
                </motion.div>
              </Link>
              <Link href="/credentials">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-gradient-to-br from-blue-500 to-indigo-500 p-3 md:p-4 rounded-xl md:rounded-2xl text-white text-center cursor-pointer shadow-lg hover:shadow-xl transition-all"
                >
                  <FaKey className="text-2xl md:text-3xl mx-auto mb-1 md:mb-2" />
                  <p className="font-bold text-xs md:text-base">Credentials</p>
                </motion.div>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Right column - Recent Activity & Meme */}
        <div className="space-y-3 md:space-y-6">
          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl"
          >
            <h2 className="text-lg md:text-2xl font-display font-bold mb-3 md:mb-4 flex items-center gap-2">
              <span className="text-xl md:text-2xl">🔥</span>
              <span className="hidden sm:inline">Recent Activity</span>
              <span className="sm:hidden">Activity</span>
            </h2>

            <div className="space-y-2 md:space-y-3">
              {/* Show recent completed todos */}
              {todos.filter(t => t.completed).slice(0, 2).map((todo) => {
                const member = members.find(m => m.id === todo.assignedTo);
                return (
                  <div key={todo.id} className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-green-50 rounded-lg md:rounded-xl">
                    <div className="text-xl md:text-2xl">✅</div>
                    {member && <UserAvatar user={member} size={28} />}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-xs md:text-sm truncate">
                        {member?.displayName} completed
                      </p>
                      <p className="text-xs text-gray-600 truncate">{todo.title}</p>
                    </div>
                  </div>
                );
              })}

              {/* Show recent approved chores */}
              {chores.filter(c => c.status === 'approved').slice(0, 2).map((chore) => {
                const member = members.find(m => m.id === chore.assignedTo);
                return (
                  <div key={chore.id} className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-yellow-50 rounded-lg md:rounded-xl">
                    <div className="text-xl md:text-2xl">🏆</div>
                    {member && <UserAvatar user={member} size={28} />}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-xs md:text-sm truncate">
                        {member?.displayName} +{chore.pointValue}pts
                      </p>
                      <p className="text-xs text-gray-600 truncate">{chore.title}</p>
                    </div>
                  </div>
                );
              })}

              {todos.filter(t => t.completed).length === 0 &&
               chores.filter(c => c.status === 'approved').length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-4xl mb-2">🌟</p>
                  <p className="font-semibold">No recent activity</p>
                  <p className="text-sm">Complete tasks to see them here</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Daily Meme */}
          <DailyMeme />
        </div>
      </div>

      {/* Family members with medication access */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl"
      >
        <h2 className="text-lg md:text-2xl font-display font-bold mb-4 md:mb-6 flex items-center gap-2">
          <span className="text-xl md:text-2xl">👨‍👩‍👧‍👦</span>
          Family Members
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 md:gap-4">
          {members.map((member) => (
            <motion.div
              key={member.id}
              whileHover={{ scale: 1.05 }}
              onClick={() => setSelectedMember(member)}
              className="text-center p-3 md:p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl md:rounded-2xl cursor-pointer hover:shadow-lg transition-all"
            >
              <div className="flex justify-center mb-1 md:mb-2 relative">
                <UserAvatar user={member} size={48} />
                {medications[member.id]?.length > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {medications[member.id].length}
                  </div>
                )}
              </div>
              <p className="font-bold text-gray-800 text-xs md:text-sm truncate">
                {member.displayName}
              </p>
              <p className="text-[10px] md:text-xs text-gray-600">
                {member.role === 'parent' ? '👑 Parent' : '🎮 Kid'}
              </p>
              {member.role !== 'parent' && (
                <p className="text-[10px] md:text-xs font-bold text-yellow-600 mt-0.5 md:mt-1">
                  ⭐ {member.points || 0}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Member Detail Modal (with medications) */}
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
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl my-8 max-h-[95vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <UserAvatar user={selectedMember} size={64} />
                  <div>
                    <h2 className="text-2xl font-display font-bold gradient-text">
                      {selectedMember.displayName}
                    </h2>
                    <p className="text-gray-600">
                      {selectedMember.role === 'parent' ? '👑 Parent' : '🎮 Kid'}
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

              {/* Member Stats */}
              {selectedMember.role !== 'parent' && (
                <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl p-4 mb-6 text-center">
                  <p className="text-white font-semibold mb-1">Total Points</p>
                  <p className="text-4xl font-display font-bold text-white">
                    ⭐ {selectedMember.points || 0}
                  </p>
                </div>
              )}

              {/* Medications Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <FaPills className="text-purple-500" />
                    Medications
                  </h3>
                  <Link
                    href="/medication"
                    className="text-sm font-bold text-purple-600 hover:text-purple-800"
                  >
                    Manage →
                  </Link>
                </div>

                {medications[selectedMember.id]?.length > 0 ? (
                  <div className="space-y-2">
                    {medications[selectedMember.id].map((med, idx) => (
                      <div key={idx} className="bg-purple-50 p-3 rounded-xl">
                        <p className="font-bold text-purple-900">{med.name}</p>
                        <p className="text-sm text-purple-700">{med.dosage}</p>
                        <p className="text-xs text-purple-600">
                          {med.times?.join(', ')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-xl">
                    <p className="text-3xl mb-2">💊</p>
                    <p className="text-sm text-gray-600">No medications assigned</p>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
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
