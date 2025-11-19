'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

function JoinFamilyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, userData } = useAuth();
  const [familyCode, setFamilyCode] = useState(searchParams.get('code') || '');
  const [loading, setLoading] = useState(false);
  const [familyName, setFamilyName] = useState('');

  useEffect(() => {
    // If user already has a family, redirect to dashboard
    if (userData?.familyId) {
      router.push('/dashboard');
    }
  }, [userData, router]);

  useEffect(() => {
    // Auto-check if code is provided in URL
    if (familyCode && !familyName) {
      checkFamilyCode(familyCode);
    }
  }, [familyCode]);

  const checkFamilyCode = async (code) => {
    if (!code) return;

    try {
      const familyDoc = await getDoc(doc(db, 'families', code));
      if (familyDoc.exists()) {
        setFamilyName(familyDoc.data().name);
      } else {
        setFamilyName('');
      }
    } catch (error) {
      console.error('Error checking family code:', error);
    }
  };

  const handleJoinFamily = async (e) => {
    e.preventDefault();
    if (!user || !familyCode.trim()) return;

    try {
      setLoading(true);

      // Verify family exists
      const familyRef = doc(db, 'families', familyCode);
      const familyDoc = await getDoc(familyRef);
      if (!familyDoc.exists()) {
        toast.error('Invalid family code!');
        return;
      }

      const familyData = familyDoc.data();

      // Update user with family ID
      await setDoc(
        doc(db, 'users', user.uid),
        {
          familyId: familyCode,
        },
        { merge: true }
      );

      // Add user to family's members array
      const currentMembers = familyData.members || [];
      if (!currentMembers.includes(user.uid)) {
        await setDoc(
          familyRef,
          {
            members: [...currentMembers, user.uid],
          },
          { merge: true }
        );
      }

      toast.success(`Joined ${familyData.name}! 🎉`);
      router.push('/dashboard');
    } catch (error) {
      console.error('Error joining family:', error);
      toast.error('Failed to join family');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center"
        >
          <div className="text-6xl mb-4">🔐</div>
          <h1 className="text-3xl font-display font-bold mb-4 gradient-text">
            Sign In Required
          </h1>
          <p className="text-gray-600 mb-6">
            You need to sign in before joining a family.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg"
          >
            Go to Sign In
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
      >
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
          <h1 className="text-3xl font-display font-bold mb-2 gradient-text">
            Join a Family
          </h1>
          <p className="text-gray-600">
            Enter the invite code to join your family!
          </p>
        </div>

        <form onSubmit={handleJoinFamily} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Family Invite Code
            </label>
            <input
              type="text"
              value={familyCode}
              onChange={(e) => {
                setFamilyCode(e.target.value);
                checkFamilyCode(e.target.value);
              }}
              placeholder="Enter family code..."
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-mono text-lg font-bold text-center"
              required
            />
          </div>

          {familyName && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-center"
            >
              <p className="text-sm text-gray-600 mb-1">You're joining:</p>
              <p className="text-xl font-bold text-green-700">✓ {familyName}</p>
            </motion.div>
          )}

          {familyCode && !familyName && familyCode.length > 10 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-center"
            >
              <p className="text-sm font-bold text-red-700">
                ❌ Family not found - check the code!
              </p>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading || !familyName}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Joining...' : 'Join Family 🎉'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Don't have a code?{' '}
            <button
              onClick={() => router.push('/setup')}
              className="text-purple-600 font-bold hover:underline"
            >
              Create your own family
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 flex items-center justify-center">
        <div className="text-6xl animate-bounce">👨‍👩‍👧‍👦</div>
      </div>
    }>
      <JoinFamilyContent />
    </Suspense>
  );
}
