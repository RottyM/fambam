import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';

export default function UserAvatar({ user, size = 40, className = '' }) {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';

  const getAvatarUrl = () => {
    const seed = user?.id || user?.uid || 'default';

    if (!user?.avatar) {
      // Dark mode: use bottts (robot avatars) with dark colors
      if (isDark) {
        return `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=1a1a2e,16213e,0f0e17&primaryColor=6C63FF,a855f7,8b5cf6`;
      }
      // Light mode: use fun-emoji
      return `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${seed}`;
    }

    switch (user.avatar.type) {
      case 'dicebear':
        if (isDark) {
          return `https://api.dicebear.com/7.x/bottts/svg?seed=${user.avatar.seed || seed}&backgroundColor=1a1a2e,16213e,0f0e17&primaryColor=6C63FF,a855f7,8b5cf6`;
        }
        return user.avatar.url || `https://api.dicebear.com/7.x/${user.avatar.style || 'fun-emoji'}/svg?seed=${user.avatar.seed}`;

      case 'google':
      case 'uploaded':
      case 'custom':
        return user.avatar.url;

      default:
        if (isDark) {
          return `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=1a1a2e,16213e,0f0e17&primaryColor=6C63FF,a855f7,8b5cf6`;
        }
        return `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${seed}`;
    }
  };

  const borderColor = isDark ? 'border-purple-900' : 'border-white';
  const bgGradient = isDark
    ? 'bg-gradient-to-br from-gray-900 to-purple-900'
    : 'bg-gradient-to-br from-primary-300 to-secondary-300';

  return (
    <div
      className={`relative rounded-full overflow-hidden border-3 ${borderColor} shadow-lg ${bgGradient} ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={getAvatarUrl()}
        alt={user?.displayName || 'User'}
        width={size}
        height={size}
        className="object-cover"
        unoptimized
      />
    </div>
  );
}
