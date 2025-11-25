'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

export const themes = {
  light: {
    name: 'light',
    displayName: 'Family Mode',
    emoji: '☀️',
    colors: {
      // Backgrounds
      bg: 'bg-gray-50',
      bgCard: 'bg-white',
      bgGradient: 'bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500',

      // Text
      text: 'text-gray-900',
      textMuted: 'text-gray-800',
      textLight: 'text-gray-700',

      // Borders
      border: 'border-purple-200',
      borderLight: 'border-gray-100',

      // Buttons & Interactive
      primary: 'from-purple-500 to-pink-500',
      primaryHover: 'from-purple-600 to-pink-600',
      primaryActive: 'from-purple-700 to-pink-700',

      // Sidebar
      sidebarBg: 'bg-white',
      sidebarHeader: 'from-pink-500 via-purple-500 to-blue-500',
      sidebarActive: 'from-purple-100 to-pink-100',
      sidebarActiveBorder: 'border-purple-500',
      sidebarText: 'text-gray-600',
      sidebarActiveText: 'text-purple-700',

      // Stats cards
      statBlue: 'from-blue-500 to-blue-600',
      statPurple: 'from-purple-500 to-purple-600',
      statPink: 'from-pink-500 to-pink-600',
      statGreen: 'from-green-500 to-green-600',
    },
    messages: {
      welcome: 'Welcome back',
      dashboard: 'Your family dashboard',
      noActivity: 'No recent activity yet!',
      allDone: 'All done!',
    }
  },
  dark: {
    name: 'dark',
    displayName: 'Dark Mode',
    emoji: '🌙',
    colors: {
      // Backgrounds - gothic blacks and deep purples
      bg: 'bg-gray-900',
      bgCard: 'bg-gray-800',
      bgGradient: 'bg-gradient-to-br from-purple-900 via-gray-900 to-black',

      // Text - lighter for dark bg
      text: 'text-gray-100',
      textMuted: 'text-gray-300',
      textLight: 'text-gray-400',

      // Borders - subtle dark borders
      border: 'border-purple-900',
      borderLight: 'border-gray-700',

      // Buttons & Interactive - dark purples and blacks
      primary: 'from-purple-900 to-gray-800',
      primaryHover: 'from-purple-800 to-gray-700',
      primaryActive: 'from-purple-950 to-gray-900',

      // Sidebar - deep dark theme
      sidebarBg: 'bg-gray-950',
      sidebarHeader: 'from-purple-950 via-gray-900 to-black',
      sidebarActive: 'from-purple-900/50 to-gray-800/50',
      sidebarActiveBorder: 'border-purple-700',
      sidebarText: 'text-gray-400',
      sidebarActiveText: 'text-purple-300',

      // Stats cards - darker, more muted
      statBlue: 'from-blue-900 to-blue-950',
      statPurple: 'from-purple-900 to-purple-950',
      statPink: 'from-pink-900 to-pink-950',
      statGreen: 'from-green-900 to-green-950',
    },
    messages: {
      welcome: 'Welcome back to the darkness',
      dashboard: 'Your family crypt',
      noActivity: 'Silence... as expected',
      allDone: 'The work is done... for now',
    }
  }
};

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState('light');

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('familyos-theme');
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      setCurrentTheme(savedTheme);
    }
  }, []);

  // Save theme to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('familyos-theme', currentTheme);
    // Update document class for global styling
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(currentTheme);
  }, [currentTheme]);

  const toggleTheme = () => {
    setCurrentTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const theme = themes[currentTheme];

  return (
    <ThemeContext.Provider value={{ theme, currentTheme, toggleTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
}
