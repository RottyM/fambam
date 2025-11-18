'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { FaGoogle } from 'react-icons/fa';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const router = useRouter();

  if (user) {
    router.push('/dashboard');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSignUp) {
      await signUp(email, password, displayName);
    } else {
      await signIn(email, password);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 5, repeat: Infinity }}
          className="absolute top-20 left-10 text-6xl"
        >
          🎨
        </motion.div>
        <motion.div
          animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute top-40 right-20 text-6xl"
        >
          🎉
        </motion.div>
        <motion.div
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 6, repeat: Infinity }}
          className="absolute bottom-20 left-1/4 text-6xl"
        >
          🚀
        </motion.div>
        <motion.div
          animate={{ y: [0, 15, 0] }}
          transition={{ duration: 5.5, repeat: Infinity }}
          className="absolute bottom-40 right-1/4 text-6xl"
        >
          ⭐
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.h1
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="text-6xl font-display font-bold mb-4"
          >
            <span className="gradient-text">Family OS</span>
          </motion.h1>
          <p className="text-xl text-gray-600 font-semibold">
            Your family's new operating system! 👨‍👩‍👧‍👦✨
          </p>
        </div>

        {/* Auth card */}
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 border-4 border-purple-200"
        >
          <h2 className="text-2xl font-display font-bold text-center mb-6 text-gray-800">
            {isSignUp ? '🎉 Join the Fun!' : '👋 Welcome Back!'}
          </h2>

          {/* Google Sign In */}
          <button
            onClick={signInWithGoogle}
            className="w-full bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 active:bg-gray-100 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 mb-6 touch-manipulation min-h-[48px]"
          >
            <FaGoogle className="text-red-500" />
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="text-gray-500 text-sm font-semibold">OR</span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>

          {/* Email/Password form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <input
                type="text"
                placeholder="Your Name 👤"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                required
              />
            )}
            
            <input
              type="email"
              placeholder="Email 📧"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
              required
            />
            
            <input
              type="password"
              placeholder="Password 🔒"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
              required
            />

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white py-3 rounded-xl font-bold hover:from-pink-600 hover:via-purple-600 hover:to-blue-600 active:from-pink-700 active:via-purple-700 active:to-blue-700 transition-all shadow-lg hover:shadow-xl touch-manipulation min-h-[48px]"
            >
              {isSignUp ? '🚀 Create Account' : '🎯 Sign In'}
            </button>
          </form>

          {/* Toggle sign up/in */}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full mt-4 text-purple-600 hover:text-purple-700 active:text-purple-800 font-semibold py-2 touch-manipulation min-h-[44px]"
          >
            {isSignUp
              ? 'Already have an account? Sign in! 👉'
              : "Don't have an account? Sign up! 🎉"}
          </button>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center text-gray-600"
        >
          <p className="font-semibold mb-4 text-lg">✨ Everything your family needs in one place:</p>
          <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
            <span className="bg-white px-3 py-2 rounded-full shadow-md text-sm font-semibold hover:shadow-lg transition-shadow">
              🏠 Family Dashboard
            </span>
            <span className="bg-white px-3 py-2 rounded-full shadow-md text-sm font-semibold hover:shadow-lg transition-shadow">
              💝 Daily Check-In
            </span>
            <span className="bg-white px-3 py-2 rounded-full shadow-md text-sm font-semibold hover:shadow-lg transition-shadow">
              ✅ Shared To-Dos
            </span>
            <span className="bg-white px-3 py-2 rounded-full shadow-md text-sm font-semibold hover:shadow-lg transition-shadow">
              🧹 Chore Tracker
            </span>
            <span className="bg-white px-3 py-2 rounded-full shadow-md text-sm font-semibold hover:shadow-lg transition-shadow">
              📅 Family Calendar
            </span>
            <span className="bg-white px-3 py-2 rounded-full shadow-md text-sm font-semibold hover:shadow-lg transition-shadow">
              🛒 Grocery Lists
            </span>
            <span className="bg-white px-3 py-2 rounded-full shadow-md text-sm font-semibold hover:shadow-lg transition-shadow">
              🍳 Recipe Collection
            </span>
            <span className="bg-white px-3 py-2 rounded-full shadow-md text-sm font-semibold hover:shadow-lg transition-shadow">
              📄 Document Storage
            </span>
            <span className="bg-white px-3 py-2 rounded-full shadow-md text-sm font-semibold hover:shadow-lg transition-shadow">
              📸 Memory Vault
            </span>
            <span className="bg-white px-3 py-2 rounded-full shadow-md text-sm font-semibold hover:shadow-lg transition-shadow">
              ⏰ Time Capsules
            </span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
