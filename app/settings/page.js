'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { motion } from 'framer-motion';
import { FaMoon, FaSun, FaBell, FaBellSlash, FaSpinner, FaUser, FaPalette, FaKey, FaTrash, FaSignOutAlt } from 'react-icons/fa';
import UserAvatar from '@/components/UserAvatar';
import Link from 'next/link'; // Added Link import
import toast from 'react-hot-toast';
import { useState } from 'react'; // Added useState import

function SettingsContent() {
  const { user, userData, signOut } = useAuth();
  const { theme, toggleTheme, currentTheme } = useTheme();
  const { 
    notificationsSupported, 
    notificationsEnabled, 
    requestPermission, 
    disableNotifications, 
    resetNotificationState 
  } = useNotifications();
  const [isToggling, setIsToggling] = useState(false);

  const handleNotificationToggle = async () => {
    setIsToggling(true);
    try {
      if (notificationsEnabled) {
        await disableNotifications();
      } else {
        await requestPermission();
      }
    } finally {
      setIsToggling(false);
    }
  };

  const handleSignOut = () => {
    // Using a safer method than window.confirm for cross-platform/PWA compatibility
    toast((t) => (
      <div className="flex flex-col gap-3 p-4 bg-white rounded-lg shadow-lg">
        <p className="font-bold text-gray-800">Are you sure you want to sign out?</p>
        <div className="flex justify-end gap-2">
          <button 
            onClick={() => toast.dismiss(t.id)} 
            className="text-gray-500 hover:text-gray-800 font-semibold"
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              signOut(); 
              toast.dismiss(t.id);
            }} 
            className="bg-red-500 text-white py-1 px-3 rounded-md hover:bg-red-600"
          >
            Sign Out
          </button>
        </div>
      </div>
    ), { duration: 9000, position: 'top-center' });
  };

  const Card = ({ title, description, children }) => (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100"
    >
      <h3 className="text-2xl font-bold mb-2 gradient-text">{title}</h3>
      <p className="text-gray-500 mb-4 text-sm">{description}</p>
      {children}
    </motion.div>
  );

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-display font-bold mb-4">
        <span className="gradient-text">Settings & Profile</span>
      </h1>

      {/* Profile Card */}
      <Card title="User Profile" description="View and manage your account details.">
        <div className="flex items-center gap-4">
          <UserAvatar user={userData || user} size={64} />
          <div>
            <p className="text-xl font-bold">{userData?.displayName || user?.email}</p>
            <p className={`text-sm ${theme.colors.textMuted}`}>{userData?.role} | Points: {userData?.points || 0}</p>
          </div>
        </div>
        <button 
          onClick={handleSignOut}
          className="mt-6 bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-2"
        >
          <FaSignOutAlt /> Sign Out
        </button>
      </Card>

      {/* Theme Card */}
      <Card title="App Theme" description="Switch between Family-Friendly Light mode and Dark Mode.">
        <button 
          onClick={toggleTheme}
          className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-3 ${
            currentTheme === 'dark' 
              ? 'bg-purple-800 text-white hover:bg-purple-700' 
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          {currentTheme === 'dark' ? <FaSun size={20} /> : <FaMoon size={20} />}
          Switch to {currentTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
      </Card>

      {/* Notifications Card */}
      <Card 
        title="Notifications" 
        description="Receive reminders for chores and events."
      >
        {notificationsSupported ? (
          <div className="space-y-3">
            <button
              onClick={handleNotificationToggle}
              disabled={isToggling}
              className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-3 ${
                notificationsEnabled
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-yellow-500 text-yellow-900 hover:bg-yellow-600'
              }`}
            >
              {isToggling ? <FaSpinner className="animate-spin" /> : notificationsEnabled ? <FaBellSlash size={20} /> : <FaBell size={20} />}
              {isToggling ? 'Updating...' : notificationsEnabled ? 'Disable Notifications' : 'Enable Notifications'}
            </button>
            <p className={`text-center text-xs font-semibold ${notificationsEnabled ? 'text-green-600' : 'text-red-500'}`}>
              Status: {notificationsEnabled ? 'Enabled' : 'Disabled'}
            </p>

            {/* Debug Button (optional, but helpful for testing) */}
            <button
                onClick={resetNotificationState}
                className="w-full text-sm mt-3 text-red-400 hover:text-red-600 font-semibold"
            >
                Reset Notification State (Troubleshoot)
            </button>
          </div>
        ) : (
          <div className="text-center p-4 bg-gray-100 rounded-xl">
            <p className="text-gray-600">Notifications not supported by this browser/device.</p>
          </div>
        )}
      </Card>
      
      {/* Footer link to other settings */}
      <div className="text-center pt-4">
        <Link href="/credentials" className="text-purple-600 hover:text-purple-800 font-bold flex items-center justify-center gap-2">
            <FaKey /> Manage Family Credentials
        </Link>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <SettingsContent />
    </DashboardLayout>
  );
}