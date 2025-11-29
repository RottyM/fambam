'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext'; 
import toast from 'react-hot-toast';

const NotificationContext = createContext({});

export const useNotifications = () => useContext(NotificationContext);

// Generate a unique device ID for this browser/device
const getDeviceId = () => {
  if (typeof window === 'undefined') return null;

  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
};

export function NotificationProvider({ children }) {
  const [permission, setPermission] = useState('default');
  const [fcmToken, setFcmToken] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationsSupported, setNotificationsSupported] = useState(false);
  const { user, userData } = useAuth();

  // Request notification permission and get FCM token
  const requestPermission = async () => {
    try {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          // Unregister any worker that isn't the main PWA worker
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            const scriptUrl = registration.active?.scriptURL || registration.scriptURL;
            const isMainWorker = scriptUrl?.includes('/sw.js');
            if (!isMainWorker) await registration.unregister();
          }

          // Use a single worker everywhere; sw.js already imports firebase-messaging-sw.js
          const workerFile = '/sw.js';

          const registration = await navigator.serviceWorker.register(workerFile, {
            scope: '/',
          });

          await navigator.serviceWorker.ready;
          console.log(`Service Worker registered: ${workerFile}`);

        } catch (swError) {
          console.error('Service Worker registration failed:', swError);
          return;
        }
      }

      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult === 'granted' && user) {
        // Validate VAPID key
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        
        const messaging = getMessaging();

        // Wait for service worker to be fully ready
        const swRegistration = await navigator.serviceWorker.ready;

        // Extra check: ensure service worker is active
        if (!swRegistration.active) {
          console.log('Waiting for service worker to activate...');
          await new Promise(resolve => {
            if (swRegistration.installing) {
              swRegistration.installing.addEventListener('statechange', function() {
                if (this.state === 'activated') {
                  resolve(null);
                }
              });
            } else if (swRegistration.waiting) {
              swRegistration.waiting.addEventListener('statechange', function() {
                if (this.state === 'activated') {
                  resolve(null);
                }
              });
            } else {
              resolve(null);
            }
          });
        }

        try {
          const token = await getToken(messaging, {
            vapidKey: vapidKey,
            serviceWorkerRegistration: swRegistration,
          });

          if (token) {
            console.log('FCM token obtained');
            const deviceId = getDeviceId();
            const userRef = doc(db, 'users', user.uid);

            // Store token in fcmTokens map with deviceId as key
            await updateDoc(userRef, {
              [`fcmTokens.${deviceId}`]: token,
              notificationsEnabled: true,
              updatedAt: new Date(),
            });

            setFcmToken(token);
            setNotificationsEnabled(true);
            toast.success('Notifications enabled! 🔔');
            console.log(`FCM token saved for device: ${deviceId}`);
          } 
        } catch (tokenError) {
          console.error('Error getting FCM token:', tokenError);
          toast.error('Notification setup failed. Check console.');
        }
      } else if (permissionResult === 'denied') {
        toast.error('Notification permission denied.');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
    }
  };

  // Disable notifications logic
  const disableNotifications = async () => {
    if (user) {
      try {
        const deviceId = getDeviceId();
        const userRef = doc(db, 'users', user.uid);

        // Remove only this device's token from fcmTokens map
        await updateDoc(userRef, {
          [`fcmTokens.${deviceId}`]: null,
          updatedAt: new Date(),
        });

        setFcmToken(null);
        setNotificationsEnabled(false);
        toast.success('Notifications disabled for this device');
        console.log(`FCM token removed for device: ${deviceId}`);
      } catch (error) {
        toast.error('Failed to disable notifications');
      }
    }
  };

  // Check if browser supports notifications (client-side only to avoid hydration errors)
  useEffect(() => {
    setNotificationsSupported(
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator
    );
  }, []);

  // Sync state
  useEffect(() => {
    if (userData) {
      const deviceId = getDeviceId();
      const deviceToken = userData.fcmTokens?.[deviceId] || null;

      setNotificationsEnabled(!!deviceToken);
      setFcmToken(deviceToken);
    }
  }, [userData]);

  // Auto-register worker on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && !notificationsEnabled) {
       const workerFile = '/sw.js';
       navigator.serviceWorker.register(workerFile, { scope: '/' });
    }
  }, [notificationsEnabled]);

  // Foreground listener
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const messaging = getMessaging();
        const unsubscribe = onMessage(messaging, (payload) => {
          console.log('Foreground notification:', payload);
          toast.custom((t) => (
            <div className="max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5">
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-0.5 text-2xl">
                    {payload.notification?.icon || '🔔'}
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-bold text-gray-900">{payload.notification?.title}</p>
                    <p className="mt-1 text-sm text-gray-500">{payload.notification?.body}</p>
                  </div>
                </div>
              </div>
              <div className="flex border-l border-gray-200">
                <button onClick={() => toast.dismiss(t.id)} className="w-full border border-transparent rounded-none rounded-r-lg p-4 text-sm font-medium text-purple-600">Close</button>
              </div>
            </div>
          ), { duration: 6000 });
        });
        return () => unsubscribe();
      } catch (error) {
        console.error("Failed to init messaging listener", error);
      }
    }
  }, []);

  const value = {
    permission,
    fcmToken,
    notificationsEnabled,
    requestPermission,
    disableNotifications,
    notificationsSupported,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
