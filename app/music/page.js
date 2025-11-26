import dynamic from 'next/dynamic';
import DashboardLayout from '@/components/DashboardLayout';

// Dynamically import MusicContent with SSR disabled
const MusicContent = dynamic(() => import('@/components/MusicContent'), { 
  ssr: false,
  // Optional: add a loading component
  loading: () => (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="text-7xl mb-4">
          🎵
        </div>
        <p className={`text-xl font-bold text-purple-600`}>
          Loading music...
        </p>
      </div>
    </div>
  ),
});

export default function MusicPage() {
  return (
    <DashboardLayout>
      <MusicContent />
    </DashboardLayout>
  );
}
