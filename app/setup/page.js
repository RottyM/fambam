'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { db, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import Image from 'next/image';
import AvatarSelector from '@/components/AvatarSelector';

export default function SetupPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [familyName, setFamilyName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleRandomAvatar = () => {
    // Generate a random avatar style from all available styles
    const lightStyles = [
      'fun-emoji', 'adventurer', 'adventurer-neutral',
      'avataaars', 'avataaars-neutral', 'big-smile', 
      'lorelei', 'lorelei-neutral', 'pixel-art', 'pixel-art-neutral',
      'micah', 'miniavs', 'open-peeps', 'personas', 'dylan'
    ];
    const darkStyles = [
      'bottts', 'bottts-neutral', 'shapes', 'identicon', 
      'notionists', 'notionists-neutral', 'thumbs', 'rings',
      'bauhaus', 'croodles', 'croodles-neutral'
    ];
    const allStyles = [...lightStyles, ...darkStyles];
    const randomStyle = allStyles[Math.floor(Math.random() * allStyles.length)];
    const randomSeed = `${user.uid}_${Date.now()}`; // Unique seed for variety
    
    const avatar = {
      type: 'dicebear',
      style: randomStyle,
      seed: randomSeed,
      url: `https://api.dicebear.com/7.x/${randomStyle}/svg?seed=${randomSeed}`,
    };
    setSelectedAvatar(avatar);
    toast.success('Random avatar selected!');
  };

  const handleCreateFamily = async (e) => {
    e.preventDefault();
    if (!familyName.trim()) return;

    try {
      setLoading(true);

      // Create family
      const familyRef = await addDoc(collection(db, 'families'), {
        name: familyName,
        createdAt: new Date(),
        createdBy: user.uid,
        members: [user.uid],
      });

      // Update user with family ID and avatar
      await setDoc(doc(db, 'users', user.uid), {
        familyId: familyRef.id,
        avatar: selectedAvatar,
      }, { merge: true });

      // Create Google Calendar for family
      try {
        const createCalendar = httpsCallable(functions, 'createFamilyCalendar');
        await createCalendar({
          familyId: familyRef.id,
          familyName: familyName,
        });
        toast.success('Family & Calendar created! 📅');
      } catch (calError) {
        console.error('Calendar creation failed:', calError);
        toast.success('Family created! 🎉 (Calendar setup can be done later)');
      }

      router.push('/dashboard');
    } catch (error) {
      console.error(error);
      toast.error('Failed to create family');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        {/* Progress indicator */}
        <div className="flex items-center justify-center mb-8 gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
            step >= 1 ? 'bg-purple-500 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            1
          </div>
          <div className={`w-16 h-1 ${step >= 2 ? 'bg-purple-500' : 'bg-gray-300'}`}></div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
            step >= 2 ? 'bg-purple-500 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            2
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* Step 1: Avatar Selection */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h1 className="text-4xl font-display font-bold mb-2 text-center">
                <span className="gradient-text">Choose Your Avatar</span>
              </h1>
              <p className="text-center text-gray-600 font-semibold mb-8">
                Pick a fun avatar or let us surprise you!
              </p>

              {selectedAvatar && (
                <div className="flex justify-center mb-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-32 h-32 rounded-full overflow-hidden border-4 border-purple-400 shadow-lg"
                  >
                    <Image
                      src={selectedAvatar.url}
                      alt="Selected avatar"
                      width={128}
                      height={128}
                      unoptimized
                    />
                  </motion.div>
                </div>
              )}

              <button
                onClick={handleRandomAvatar}
                disabled={loading}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-4 rounded-2xl font-bold hover:from-pink-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl mb-6 text-lg"
              >
                🎲 Random Avatar!
              </button>

              <div className="mb-8">
                <p className="text-center font-bold text-gray-700 mb-4">Or choose one:</p>
                <AvatarSelector
                  userId={user?.uid}
                  currentAvatar={selectedAvatar}
                  onSelect={setSelectedAvatar}
                  size={80}
                />
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!selectedAvatar}
                className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
                  selectedAvatar
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Next: Create Family →
              </button>
            </motion.div>
          )}

          {/* Step 2: Create Family */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h1 className="text-4xl font-display font-bold mb-2 text-center">
                <span className="gradient-text">Create Your Family</span>
              </h1>
              <p className="text-center text-gray-600 font-semibold mb-8">
                What should we call your family?
              </p>

              <form onSubmit={handleCreateFamily} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Family Name
                  </label>
                  <input
                    type="text"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    placeholder="e.g., The Smith Family"
                    className="w-full px-4 py-4 rounded-2xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none text-lg font-semibold"
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-300 transition-all"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !familyName.trim()}
                    className={`flex-1 py-4 rounded-2xl font-bold transition-all ${
                      loading || !familyName.trim()
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {loading ? 'Creating...' : '🚀 Create Family!'}
                  </button>
                </div>
              </form>

              {/* Join Existing Family Link */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 mb-2">
                  Already have a family invite code?
                </p>
                <button
                  onClick={() => router.push('/join')}
                  className="text-purple-600 hover:text-purple-800 font-bold text-lg underline"
                >
                  Join Existing Family Instead →
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Join Link - Always visible at bottom */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Have a family invite code?{' '}
            <button
              onClick={() => router.push('/join')}
              className="text-purple-600 hover:text-purple-800 font-bold underline"
            >
              Join here
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
