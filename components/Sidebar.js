'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import UserAvatar from './UserAvatar';
import { motion } from 'framer-motion';
import {
  FaHome,
  FaCheckSquare,
  FaBroom,
  FaCalendarAlt,
  FaFileAlt,
  FaImages,
  FaSignOutAlt,
  FaCog,
  FaShoppingCart,
  FaUtensils,
} from 'react-icons/fa';

const navItems = [
  { href: '/dashboard', icon: FaHome, label: 'Dashboard', emoji: '🏠' },
  { href: '/daily-checkin', icon: FaCheckSquare, label: 'Daily Check-In', emoji: '💝' },
  { href: '/todos', icon: FaCheckSquare, label: 'To-Dos', emoji: '✅' },
  { href: '/chores', icon: FaBroom, label: 'Chores', emoji: '🧹' },
  { href: '/calendar', icon: FaCalendarAlt, label: 'Calendar', emoji: '📅' },
  { href: '/groceries', icon: FaShoppingCart, label: 'Groceries', emoji: '🛒' },
  { href: '/recipes', icon: FaUtensils, label: 'Recipes', emoji: '🍳' },
  { href: '/documents', icon: FaFileAlt, label: 'Documents', emoji: '📄' },
  { href: '/memories', icon: FaImages, label: 'Memories', emoji: '📸' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, userData, signOut } = useAuth();
  const { family, members } = useFamily();

  return (
    <motion.div
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      className="w-72 bg-white shadow-2xl h-screen fixed left-0 top-0 flex flex-col border-r-4 border-purple-200"
    >
      {/* Header */}
      <div className="p-6 bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500">
        <Link href="/dashboard">
          <h1 className="text-3xl font-display font-bold text-white mb-2 cursor-pointer hover:scale-105 transition-transform">
            Family OS
          </h1>
        </Link>
        <p className="text-white/90 text-sm font-semibold">
          {family?.name || 'Your Family'}
        </p>
      </div>

      {/* User profile */}
      <div className="p-6 border-b-2 border-gray-100">
        <div className="flex items-center gap-3">
          <UserAvatar user={userData || user} size={48} />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-800 truncate">
              {userData?.displayName || user?.displayName || 'User'}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-purple-600">
                {userData?.role === 'parent' ? '👑 Parent' : '🎮 Kid'}
              </span>
              {userData?.points !== undefined && (
                <span className="text-xs font-bold text-yellow-600">
                  ⭐ {userData.points}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-6 py-3 transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-purple-100 to-pink-100 border-r-4 border-purple-500 text-purple-700 font-bold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-purple-600'
              }`}
            >
              <span className="text-2xl">{item.emoji}</span>
              <span className="font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Family members preview */}
      {members.length > 0 && (
        <div className="p-4 border-t-2 border-gray-100">
          <p className="text-xs font-bold text-gray-500 mb-2 uppercase">
            Family Members
          </p>
          <div className="flex flex-wrap gap-2">
            {members.slice(0, 6).map((member) => (
              <div key={member.id} title={member.displayName}>
                <UserAvatar user={member} size={32} />
              </div>
            ))}
            {members.length > 6 && (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                +{members.length - 6}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom actions */}
      <div className="p-4 border-t-2 border-gray-100 space-y-2">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-xl transition-all font-semibold"
        >
          <FaCog />
          <span>Settings</span>
        </Link>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-all font-semibold"
        >
          <FaSignOutAlt />
          <span>Sign Out</span>
        </button>
      </div>
    </motion.div>
  );
}
