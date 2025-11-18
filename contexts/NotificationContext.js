'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const NotificationContext = createContext({});

export const useNotifications = () => useContext(NotificationContext);

export function NotificationProvider({ children }) {
  const [permission, setPermission] = useState('default');
  const [fcmToken, setFcmToken] = useState(null);
  const { user } = useAuth();

  // Request notification permission and get FCM token
  const requestPermission = async () => {
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult === 'granted' && user) {
        // Get FCM token
        const messaging = getMessaging();
        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        });

        if (token) {
          setFcmToken(token);

          // Save token to user document
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            fcmToken: token,
            notificationsEnabled: true,
            updatedAt: new Date(),
          });

          toast.success('Notifications enabled!');
        }
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to enable notifications');
    }
  };

  // Disable notifications
  const disableNotifications = async () => {
    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          fcmToken: null,
          notificationsEnabled: false,
          updatedAt: new Date(),
        });

        setFcmToken(null);
        toast.success('Notifications disabled');
      } catch (error) {
        console.error('Error disabling notifications:', error);
        toast.error('Failed to disable notifications');
      }
    }
  };

  // Listen for foreground messages
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const messaging = getMessaging();

      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Foreground notification received:', payload);

        // Show toast notification
        toast.custom((t) => (
          <div
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <span className="text-2xl">{payload.notification?.icon || '🔔'}</span>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-bold text-gray-900">
                    {payload.notification?.title}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {payload.notification?.body}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-200">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-purple-600 hover:text-purple-500 focus:outline-none"
              >
                Close
              </button>
            </div>
          </div>
        ), {
          duration: 6000,
        });
      });

      return unsubscribe;
    }
  }, []);

  // Check current permission status
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const value = {
    permission,
    fcmToken,
    requestPermission,
    disableNotifications,
    notificationsSupported: typeof window !== 'undefined' && 'Notification' in window,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
