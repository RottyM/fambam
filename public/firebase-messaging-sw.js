// Firebase Cloud Messaging Service Worker
// This file handles background notifications

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyCGqgnFv00GBTUo2ufp_5i6dGW9aQr7uIQ",
  authDomain: "fambam-d5582.firebaseapp.com",
  projectId: "fambam-d5582",
  storageBucket: "fambam-d5582.firebasestorage.app",
  messagingSenderId: "582301224528",
  appId: "1:582301224528:web:81a330a6364e98a7e18b55"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'Family OS';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: payload.notification?.icon || '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: payload.data?.tag || 'family-os-notification',
    data: payload.data,
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  // Open the app or focus existing window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          return client.focus();
        }
      }

      // Open new window if none exists
      if (clients.openWindow) {
        const urlToOpen = event.notification.data?.url || '/dashboard';
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
