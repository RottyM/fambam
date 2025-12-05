'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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
  FaImages,
  FaSignOutAlt,
  FaCog,
  FaShoppingCart,
  FaBoxOpen,
  FaUtensils,
  FaBars,
  FaTimes,
  FaMoon,
  FaSun,
  FaBell,
  FaBellSlash,
  FaSpinner,
  FaFilm,
  FaMusic, // <--- ADDED IMPORT
} from 'react-icons/fa';

const navItems = [
  { href: '/dashboard', icon: FaHome, label: 'Dashboard', emoji: '🏠' },
  { href: '/daily-checkin', icon: FaCheckSquare, label: 'Daily Check-In', emoji: '💝' },
  { href: '/todos', icon: FaCheckSquare, label: 'To-Dos', emoji: '✅' },
  { href: '/chores', icon: FaBroom, label: 'Chores', emoji: '🧹' },
  { href: '/calendar', icon: FaCalendarAlt, label: 'Calendar', emoji: '📅' },
  { href: '/groceries', icon: FaShoppingCart, label: 'Groceries', emoji: '🛒' },
  { href: '/pantry', icon: FaBoxOpen, label: 'Pantry', emoji: '🥫' },
  { href: '/recipes', icon: FaUtensils, label: 'Recipes', emoji: '🍳' },
  { href: '/movies', icon: FaFilm, label: 'Movie Night', emoji: '🎬' },
  { href: '/music', icon: FaMusic, label: 'Music', emoji: '🎸' }, // <--- ADDED MUSIC ITEM
  { href: '/memories', icon: FaImages, label: 'Memories', emoji: '📸' },
];

export default function DashboardLayout({ children }) { 
  const pathname = usePathname();
  const { user, userData, loading, signOut } = useAuth();
  const { family, loading: familyLoading } = useFamily();
  const { theme, toggleTheme, currentTheme } = useTheme();
  const { notificationsEnabled, requestPermission, disableNotifications, notificationsSupported } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [isTogglingNotifications, setIsTogglingNotifications] = useState(false);
  const mainRef = useRef(null);

  const closeSidebar = () => setIsOpen(false);

  const handleNotificationToggle = useCallback(async () => {
    setIsTogglingNotifications(true);
    try {
      if (notificationsEnabled) {
        await disableNotifications();
      } else {
        await requestPermission();
      }
    } finally {
      setIsTogglingNotifications(false);
    }
  }, [notificationsEnabled, disableNotifications, requestPermission]);

  // Auto-attach nav icon to the first page heading so every page title gets its matching sidebar icon
  useEffect(() => {
    const container = mainRef.current;
    if (!container) return;

    const matchedNav = navItems.find((item) => pathname.startsWith(item.href));
    if (!matchedNav?.emoji) return;

    const attachIcon = () => {
      const heading = container.querySelector('h1');
      if (!heading) return;
      const existingIcon = heading.querySelector('[data-nav-icon]');
      const iconEl = existingIcon || document.createElement('span');
      iconEl.dataset.navIcon = 'true';
      iconEl.textContent = matchedNav.emoji;
      iconEl.setAttribute('aria-hidden', 'true');
      iconEl.className = 'ml-3 inline-flex items-center justify-center text-3xl leading-none align-middle';

      heading.classList.add('flex', 'items-baseline', 'gap-2', 'flex-wrap');
      if (!existingIcon) heading.append(iconEl);
      return true;
    };

    const attached = attachIcon();

    const observer = new MutationObserver(() => {
      const done = attachIcon();
      if (done) observer.disconnect();
    });
    if (!attached) {
      observer.observe(container, { childList: true, subtree: true });
    }

    return () => observer.disconnect();
  }, [pathname]);

  const isHydrating = loading || (user && !userData) || familyLoading;

  if (isHydrating) {
    return (
      <div className={`min-h-screen ${theme.colors.bg} flex items-center justify-center`}>
        <div className="flex items-center gap-3 text-lg font-semibold">
          <FaSpinner className="animate-spin" />
          <span>Loading your profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.colors.bg} transition-colors duration-300`}> 
      
      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`lg:hidden fixed top-4 left-4 z-50 bg-gradient-to-r ${theme.colors.sidebarHeader} text-white p-2 rounded-lg shadow-lg hover:shadow-xl transition-all`}
        aria-label="Toggle menu"
      >
        {isOpen ? <FaTimes size={18} /> : <FaBars size={18} />}
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
        style={{ 
          backgroundColor: currentTheme === 'dark' ? '#030712' : '#ffffff',
          height: '100vh',
          height: '100dvh' // Dynamic viewport height for mobile browsers
        }}
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
        <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-transparent">
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

        {/* Bottom tools - compact - sticky to bottom with safe area */}
        <div className={`border-t ${theme.colors.borderLight} pb-safe`} style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
          {/* Action buttons - icon grid */}
          <div className="flex justify-center p-2">
            <div className="grid grid-cols-4 gap-1">
            <button
              onClick={toggleTheme}
              title={currentTheme === 'dark' ? 'Switch to Family Mode' : 'Switch to Dark Mode'}
              className={`flex items-center justify-center p-3 ${theme.colors.sidebarText} ${currentTheme === 'dark' ? 'hover:bg-purple-900/30' : 'hover:bg-gray-100'} rounded-lg transition-all`}
            >
              {currentTheme === 'dark' ? <FaSun size={18} /> : <FaMoon size={18} />}
            </button>

            {notificationsSupported && (
              <button
                onClick={handleNotificationToggle}
                disabled={isTogglingNotifications}
                title={notificationsEnabled ? 'Disable Notifications' : 'Enable Notifications'}
                className={`flex items-center justify-center p-3 ${
                  isTogglingNotifications
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                } ${
                  notificationsEnabled
                    ? (currentTheme === 'dark' ? 'text-green-400' : 'text-green-600')
                    : (currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-500')
                } ${
                  currentTheme === 'dark' ? 'hover:bg-purple-900/30' : 'hover:bg-gray-100'
                } rounded-lg transition-all relative group`}
              >
                {isTogglingNotifications ? (
                  <FaSpinner size={18} className="animate-spin" />
                ) : notificationsEnabled ? (
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <FaBell size={18} />
                  </motion.div>
                ) : (
                  <FaBellSlash size={18} />
                )}
                {/* Tooltip on hover */}
                <span className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded ${
                  currentTheme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-gray-700 text-white'
                } whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`}>
                  {notificationsEnabled ? '🔔 Enabled' : '🔕 Disabled'}
                </span>
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
      </div>

      {/* Main content area - Pushed to the right */}
      <div className="lg:pl-72 min-h-screen transition-all duration-300 ease-in-out">
        <div ref={mainRef} className="pt-16 px-4 pb-24 md:p-8 lg:p-12 max-w-7xl mx-auto" data-page-content>
          {children}
        </div>
      </div>
    </div>
  );
}
