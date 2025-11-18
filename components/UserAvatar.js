import Image from 'next/image';

export default function UserAvatar({ user, size = 40, className = '' }) {
  const getAvatarUrl = () => {
    if (!user?.avatar) {
      // Default DiceBear avatar based on user ID
      const seed = user?.id || user?.uid || 'default';
      return `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${seed}`;
    }

    switch (user.avatar.type) {
      case 'dicebear':
        return user.avatar.url || `https://api.dicebear.com/7.x/${user.avatar.style || 'fun-emoji'}/svg?seed=${user.avatar.seed}`;
      
      case 'google':
      case 'uploaded':
      case 'custom':
        return user.avatar.url;
      
      default:
        const seed = user?.id || user?.uid || 'default';
        return `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${seed}`;
    }
  };

  return (
    <div 
      className={`relative rounded-full overflow-hidden border-3 border-white shadow-lg bg-gradient-to-br from-primary-300 to-secondary-300 ${className}`}
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
