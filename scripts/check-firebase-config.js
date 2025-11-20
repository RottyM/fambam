#!/usr/bin/env node

/**
 * Firebase Configuration Checker
 * Run this script to verify your Firebase and FCM setup
 */

console.log('\n🔍 Checking Firebase Configuration...\n');

// Check environment variables
const requiredVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'NEXT_PUBLIC_FIREBASE_VAPID_KEY',
];

let allPresent = true;
let vapidKeyValid = false;

console.log('📋 Environment Variables:\n');

requiredVars.forEach((varName) => {
  const value = process.env[varName];
  const isPresent = !!value && value.trim() !== '';
  const status = isPresent ? '✅' : '❌';

  if (!isPresent) {
    allPresent = false;
  }

  if (varName === 'NEXT_PUBLIC_FIREBASE_VAPID_KEY') {
    if (isPresent && value.length === 87 && value.startsWith('B')) {
      vapidKeyValid = true;
      console.log(`${status} ${varName}: ${value.substring(0, 10)}... (${value.length} chars) ✓`);
    } else if (isPresent) {
      console.log(`${status} ${varName}: INVALID (Expected 87 chars starting with 'B', got ${value.length} chars)`);
    } else {
      console.log(`${status} ${varName}: MISSING`);
    }
  } else if (isPresent) {
    console.log(`${status} ${varName}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`${status} ${varName}: MISSING`);
  }
});

console.log('\n📊 Summary:\n');

if (allPresent && vapidKeyValid) {
  console.log('✅ All Firebase configuration variables are present and valid!');
  console.log('✅ VAPID key is properly formatted');
  console.log('\n✨ You should be able to enable notifications now!');
  console.log('\nNext steps:');
  console.log('1. Restart your dev server: npm run dev');
  console.log('2. Click the bell icon in the sidebar');
  console.log('3. Grant notification permission');
} else {
  console.log('❌ Configuration is incomplete or invalid\n');

  if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY) {
    console.log('⚠️  VAPID Key is missing!');
    console.log('\nTo get your VAPID key:');
    console.log('1. Visit: https://console.firebase.google.com/project/family-os-ae80f/settings/cloudmessaging');
    console.log('2. Scroll to "Web Push certificates"');
    console.log('3. Copy the key pair (or click "Generate key pair")');
    console.log('4. Add to .env.local: NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_key_here');
  } else if (!vapidKeyValid) {
    console.log('⚠️  VAPID Key format is invalid!');
    console.log('Expected: 87 characters starting with "B"');
    console.log(`Got: ${process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY.length} characters`);
  }

  console.log('\n📝 Edit .env.local and add missing values');
}

console.log('\n');

process.exit(allPresent && vapidKeyValid ? 0 : 1);
