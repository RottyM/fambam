'use client';

import DashboardLayout from '@/components/DashboardLayout';
import DailyMeme from '@/components/DailyMeme';
import UserAvatar from '@/components/UserAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { useTodos, useChores, useMemories } from '@/hooks/useFirebase';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { FaCheckCircle, FaBroom, FaCalendarAlt, FaImages } from 'react-icons/fa';

function StatsCard({ icon, title, value, color, href }) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ scale: 1.05, y: -5 }}
        className={`${color} rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all cursor-pointer card-hover`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="text-4xl">{icon}</div>
          <div className="text-3xl font-display font-bold text-white">
            {value}
          </div>
        </div>
        <h3 className="text-white font-bold text-lg">{title}</h3>
      </motion.div>
    </Link>
  );
}

function DashboardContent() {
  const { userData } = useAuth();
  const { family, members } = useFamily();
  const { todos } = useTodos();
  const { chores } = useChores();
  const { memories } = useMemories();

  const pendingTodos = todos.filter(t => !t.completed).length;
  const pendingChores = chores.filter(c => c.status !== 'approved').length;
  const recentMemories = memories.length;

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-8 shadow-xl border-4 border-purple-200"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-display font-bold mb-2">
              <span className="gradient-text">
                Welcome back, {userData?.displayName}!
              </span>
            </h1>
            <p className="text-xl text-gray-600 font-semibold">
              {family?.name || 'Your Family'} • {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <div className="text-6xl animate-wiggle">
            👋
          </div>
        </div>

        {/* Points display for kids */}
        {userData?.role !== 'parent' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="mt-6 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl p-6 text-center"
          >
            <p className="text-white font-semibold mb-2">Your Points</p>
            <p className="text-5xl font-display font-bold text-white">
              ⭐ {userData?.points || 0}
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          icon="✅"
          title="Pending To-Dos"
          value={pendingTodos}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
          href="/todos"
        />
        <StatsCard
          icon="🧹"
          title="Active Chores"
          value={pendingChores}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
          href="/chores"
        />
        <StatsCard
          icon="👥"
          title="Family Members"
          value={members.length}
          color="bg-gradient-to-br from-pink-500 to-pink-600"
          href="/settings"
        />
        <StatsCard
          icon="📸"
          title="Memories"
          value={recentMemories}
          color="bg-gradient-to-br from-green-500 to-green-600"
          href="/memories"
        />
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily meme */}
        <DailyMeme />

        {/* Recent activity */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl p-6 shadow-xl"
        >
          <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
            <span>🔥</span>
            Recent Activity
          </h2>
          
          <div className="space-y-4">
            {/* Show recent completed todos */}
            {todos.filter(t => t.completed).slice(0, 3).map((todo) => {
              const member = members.find(m => m.id === todo.assignedTo);
              return (
                <div key={todo.id} className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                  <div className="text-2xl">✅</div>
                  {member && <UserAvatar user={member} size={32} />}
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 text-sm">
                      {member?.displayName} completed a todo
                    </p>
                    <p className="text-xs text-gray-600">{todo.title}</p>
                  </div>
                </div>
              );
            })}

            {/* Show recent approved chores */}
            {chores.filter(c => c.status === 'approved').slice(0, 2).map((chore) => {
              const member = members.find(m => m.id === chore.assignedTo);
              return (
                <div key={chore.id} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-xl">
                  <div className="text-2xl">🏆</div>
                  {member && <UserAvatar user={member} size={32} />}
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 text-sm">
                      {member?.displayName} earned {chore.pointValue} points!
                    </p>
                    <p className="text-xs text-gray-600">{chore.title}</p>
                  </div>
                </div>
              );
            })}

            {todos.filter(t => t.completed).length === 0 && 
             chores.filter(c => c.status === 'approved').length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p className="text-4xl mb-2">🌟</p>
                <p className="font-semibold">No recent activity yet!</p>
                <p className="text-sm">Complete some tasks to see them here</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Family members */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-3xl p-6 shadow-xl"
      >
        <h2 className="text-2xl font-display font-bold mb-6 flex items-center gap-2">
          <span>👨‍👩‍👧‍👦</span>
          Family Members
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {members.map((member) => (
            <motion.div
              key={member.id}
              whileHover={{ scale: 1.05 }}
              className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl"
            >
              <div className="flex justify-center mb-2">
                <UserAvatar user={member} size={56} />
              </div>
              <p className="font-bold text-gray-800 text-sm truncate">
                {member.displayName}
              </p>
              <p className="text-xs text-gray-600">
                {member.role === 'parent' ? '👑 Parent' : '🎮 Kid'}
              </p>
              {member.role !== 'parent' && (
                <p className="text-xs font-bold text-yellow-600 mt-1">
                  ⭐ {member.points || 0}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>
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
