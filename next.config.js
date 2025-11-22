/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: false, // We handle registration in NotificationContext
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  sw: 'sw.js',
  // --- THE FIX: Import Firebase logic into the PWA worker ---
  importScripts: ['/firebase-messaging-sw.js'], 
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'firebase-storage-cache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-cache',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
    {
      urlPattern: /^https:\/\/api\.dicebear\.com\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'avatar-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'api.dicebear.com',
      'firebasestorage.googleapis.com',
      'i.imgflip.com',
      'imgflip.com'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  reactStrictMode: true,
}

module.exports = withPWA(nextConfig);