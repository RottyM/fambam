'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/contexts/NotificationContext';
import UserAvatar from './UserAvatar';
import { motion, AnimatePresence } from 'framer-motion';
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
  FaBars,
  FaTimes,
  FaMoon,
  FaSun,
  FaBell,
  FaBellSlash,
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
  const { theme, toggleTheme, currentTheme } = useTheme();
  const { permission, requestPermission, disableNotifications, notificationsSupported } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`lg:hidden fixed top-4 left-4 z-50 bg-gradient-to-r ${theme.colors.sidebarHeader} text-white p-3 rounded-xl shadow-lg hover:shadow-xl transition-all`}
        aria-label="Toggle menu"
      >
        {isOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
      </button>

      {/* Backdrop overlay for mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSidebar}
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div
        className={`w-72 ${theme.colors.sidebarBg} bg-opacity-100 shadow-2xl h-screen fixed left-0 top-0 flex flex-col border-r-4 ${theme.colors.border} z-40 transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
        style={{ backgroundColor: currentTheme === 'dark' ? '#030712' : '#ffffff' }}
      >
      {/* Header */}
      <div className={`p-6 bg-gradient-to-br ${theme.colors.sidebarHeader}`}>
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
      <div className={`p-3 border-b ${theme.colors.borderLight}`}>
        <div className="flex items-center gap-2">
          <UserAvatar user={userData || user} size={32} />
          <div className="flex-1 min-w-0">
            <h3 className={`text-sm font-bold ${theme.colors.text} truncate`}>
              {userData?.displayName || user?.displayName || 'User'}
            </h3>
            <div className="flex items-center gap-1.5 text-xs">
              <span className={`font-semibold ${currentTheme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>
                {userData?.role === 'parent' ? (currentTheme === 'dark' ? '🦇' : '👑') : (currentTheme === 'dark' ? '🕸️' : '🎮')}
              </span>
              {userData?.points !== undefined && (
                <span className={`font-bold ${currentTheme === 'dark' ? 'text-amber-500' : 'text-yellow-600'}`}>
                  {currentTheme === 'dark' ? '🕷️' : '⭐'} {userData.points}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-4 py-2 transition-all ${
                isActive
                  ? `bg-gradient-to-r ${theme.colors.sidebarActive} border-r-4 ${theme.colors.sidebarActiveBorder} ${theme.colors.sidebarActiveText} font-bold`
                  : `${theme.colors.sidebarText} hover:bg-opacity-10 hover:${theme.colors.sidebarActiveText}`
              }`}
            >
              <span className="text-xl">{item.emoji}</span>
              <span className="font-semibold text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom tools - compact */}
      <div className={`border-t ${theme.colors.borderLight}`}>
        {/* Family members - minimal */}
        {members.length > 0 && (
          <div className={`px-3 py-2 flex items-center justify-center gap-1.5 border-b ${theme.colors.borderLight}`}>
            {members.slice(0, 4).map((member) => (
              <div key={member.id} title={member.displayName} className={`ring-1 ${currentTheme === 'dark' ? 'ring-gray-800' : 'ring-gray-200'} rounded-full`}>
                <UserAvatar user={member} size={24} />
              </div>
            ))}
            {members.length > 4 && (
              <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${currentTheme === 'dark' ? 'from-purple-900 to-gray-800' : 'from-purple-400 to-pink-400'} flex items-center justify-center text-xs font-bold text-white`}>
                +{members.length - 4}
              </div>
            )}
          </div>
        )}

        {/* Action buttons - icon grid */}
        <div className="grid grid-cols-4 gap-1 p-2">
          <button
            onClick={toggleTheme}
            title={currentTheme === 'dark' ? 'Switch to Family Mode' : 'Switch to Dark Mode'}
            className={`flex items-center justify-center p-3 ${theme.colors.sidebarText} ${currentTheme === 'dark' ? 'hover:bg-purple-900/30' : 'hover:bg-gray-100'} rounded-lg transition-all`}
          >
            {currentTheme === 'dark' ? <FaSun size={18} /> : <FaMoon size={18} />}
          </button>

          {notificationsSupported && (
            <button
              onClick={permission === 'granted' ? disableNotifications : requestPermission}
              title={permission === 'granted' ? 'Disable Notifications' : 'Enable Notifications'}
              className={`flex items-center justify-center p-3 ${permission === 'granted' ? (currentTheme === 'dark' ? 'text-green-400' : 'text-green-600') : theme.colors.sidebarText} ${currentTheme === 'dark' ? 'hover:bg-purple-900/30' : 'hover:bg-gray-100'} rounded-lg transition-all`}
            >
              {permission === 'granted' ? <FaBell size={18} /> : <FaBellSlash size={18} />}
            </button>
          )}

          <Link
            href="/settings"
            onClick={closeSidebar}
            title="Settings"
            className={`flex items-center justify-center p-3 ${theme.colors.sidebarText} ${currentTheme === 'dark' ? 'hover:bg-purple-900/30' : 'hover:bg-gray-100'} rounded-lg transition-all`}
          >
            <FaCog size={18} />
          </Link>

          <button
            onClick={signOut}
            title="Sign Out"
            className={`flex items-center justify-center p-3 ${currentTheme === 'dark' ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-100'} rounded-lg transition-all`}
          >
            <FaSignOutAlt size={18} />
          </button>
        </div>
      </div>
      </div>
    </>
  );
}
