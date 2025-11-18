'use client';

import { useTheme } from '@/contexts/ThemeContext';

export default function ClientLayout({ children }) {
  const { theme } = useTheme();

  return (
    <div className={`${theme.colors.bg} min-h-screen transition-colors duration-300`}>
      {children}
    </div>
  );
}
