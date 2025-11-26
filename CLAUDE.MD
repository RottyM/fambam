# Claude Code Customization for Family OS

This file contains rules and context to help Claude Code assist with the Family OS project.

## Project Overview

Family OS is a comprehensive family management application built with Next.js 14 and Firebase. It helps families coordinate daily activities, track chores, manage todos, share memories, and stay organized - all in one colorful, engaging interface.

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TailwindCSS
- **Backend**: Firebase (Firestore, Auth, Storage, Functions)
- **UI Libraries**: Framer Motion, Lucide React, React Icons
- **Key Features**: PWA support, Google Calendar sync, OCR, real-time updates

### Key Features
- Multi-user management (parent/child roles with permissions)
- Real-time shared todos with priority levels
- Gamified chore tracking with points and rewards
- Google Calendar integration
- Document vault with OCR text extraction
- Memory vault for photos/videos
- Daily memes, leaderboards, and fun avatars
- Dark mode support
- Medication tracking
- Recipe management
- Grocery lists
- Movies/Music tracking
- Daily check-ins

## Project Structure

```
family-os/
├── app/                      # Next.js app router pages
│   ├── page.js              # Landing/login page
│   ├── layout.js            # Root layout with providers
│   ├── globals.css          # Global styles
│   ├── dashboard/           # Main dashboard
│   ├── todos/               # Todo management
│   ├── chores/              # Chore tracking
│   ├── calendar/            # Calendar view
│   ├── documents/           # Document vault
│   ├── memories/            # Photo/video gallery
│   ├── recipes/             # Recipe management
│   ├── groceries/           # Shopping lists
│   ├── medication/          # Medication tracking
│   ├── movies/              # Movie watchlist
│   ├── music/               # Music preferences
│   ├── credentials/         # Secure credentials storage
│   ├── daily-checkin/       # Daily check-in system
│   ├── settings/            # User settings
│   ├── setup/               # Initial family setup
│   └── api/                 # API routes
├── components/              # Reusable React components
├── contexts/                # React contexts (Auth, Family)
├── hooks/                   # Custom React hooks
├── lib/                     # Utilities and configs
│   ├── firebase.js          # Firebase configuration
│   └── icons.js             # Icon mappings
├── functions/               # Firebase Cloud Functions
└── public/                  # Static assets
```

## Coding Standards

### General Rules
- Always use functional components with hooks (no class components)
- Use modern JavaScript/ES6+ features
- Keep components small and focused on a single responsibility
- Never remove existing code unless explicitly asked
- Maintain the colorful, fun, family-friendly aesthetic
- Always handle loading and error states

### File Operations
- NEVER use Edit tool on files that don't exist - use Write instead
- ALWAYS use Read tool before editing an existing file
- Use Edit tool for modifying existing files
- Keep existing functionality intact unless asked to change it

### React/Next.js Patterns
- Use "use client" directive for client components
- Leverage Next.js App Router conventions (page.js, layout.js)
- Use React Context for global state (AuthContext, FamilyContext)
- Implement real-time listeners with Firebase onSnapshot
- Handle authentication state properly using AuthContext
- Use dynamic imports for heavy components

### Styling
- Use TailwindCSS utility classes
- Maintain the existing color scheme (vibrant, playful)
- Support both light and dark modes
- Keep responsive design in mind (mobile-first)
- Use Framer Motion for animations
- Emoji icons are encouraged for a fun feel

### Firebase Patterns
- Use real-time listeners (onSnapshot) for live data
- Always check user permissions before operations
- Handle offline states gracefully
- Use subcollections for nested data (e.g., families/{id}/todos)
- Implement proper error handling with try/catch
- Use Firebase security rules to protect data

### State Management
- Use AuthContext for authentication state
- Use FamilyContext for family-wide data
- Use local state (useState) for component-specific state
- Use useEffect for side effects and subscriptions
- Clean up listeners in useEffect return functions

### Error Handling
- Always wrap Firebase operations in try/catch
- Show user-friendly error messages with react-hot-toast
- Log errors to console for debugging
- Handle edge cases (no family, no permissions, offline)

## Component Patterns

### Standard Component Structure
```javascript
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import toast from 'react-hot-toast';

export default function ComponentName() {
  const { user } = useAuth();
  const { familyId, familyData } = useFamily();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  useEffect(() => {
    if (!familyId) return;

    // Firebase listener setup
    const unsubscribe = onSnapshot(
      collection(db, 'families', familyId, 'collection'),
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setData(items);
        setLoading(false);
      },
      (error) => {
        console.error('Error:', error);
        toast.error('Failed to load data');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [familyId]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {/* Component content */}
    </div>
  );
}
```

### Firebase Operations
```javascript
// Adding a document
const addItem = async (data) => {
  try {
    await addDoc(collection(db, 'families', familyId, 'items'), {
      ...data,
      createdAt: serverTimestamp(),
      createdBy: user.uid
    });
    toast.success('Item added!');
  } catch (error) {
    console.error('Error adding item:', error);
    toast.error('Failed to add item');
  }
};

// Updating a document
const updateItem = async (itemId, updates) => {
  try {
    await updateDoc(doc(db, 'families', familyId, 'items', itemId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
    toast.success('Item updated!');
  } catch (error) {
    console.error('Error updating item:', error);
    toast.error('Failed to update item');
  }
};

// Deleting a document
const deleteItem = async (itemId) => {
  try {
    await deleteDoc(doc(db, 'families', familyId, 'items', itemId));
    toast.success('Item deleted!');
  } catch (error) {
    console.error('Error deleting item:', error);
    toast.error('Failed to delete item');
  }
};
```

## Recent Changes

### Dark Mode Implementation
- Added dark mode support throughout the application
- Theme toggle in settings
- Persistent theme preference in localStorage
- Proper contrast for all UI elements in dark mode

### Memory Spotlight Feature
- Time capsule support for memories
- Spotlight card on dashboard showing featured memories
- Cleaner design for memory cards

### UI Improvements
- Better page titles and navigation
- Improved modal designs
- Enhanced mobile layout (content pushes down, not right)
- Better todo priority label contrast

## Development Workflow

### Running the Project
```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
```

### Firebase Commands
```bash
firebase deploy --only functions    # Deploy cloud functions
firebase deploy --only firestore    # Deploy firestore rules
firebase deploy --only storage      # Deploy storage rules
```

## Important Notes

### Authentication
- Users must be authenticated to access most features
- Parent role has full permissions
- Child role has limited permissions (can't delete, can't approve chores)
- Check role before allowing destructive operations

### Data Structure
All user data is organized under families:
```
families/{familyId}/
  ├── todos/
  ├── chores/
  ├── memories/
  ├── documents/
  ├── recipes/
  ├── groceries/
  ├── medications/
  └── members/
```

### Performance
- Use pagination for large lists
- Implement lazy loading for images
- Use React.memo for expensive components
- Debounce search inputs
- Optimize Firebase queries with proper indexes

### Testing
- Test all features in both light and dark modes
- Test responsive layouts on mobile and desktop
- Test with both parent and child user roles
- Test offline functionality
- Verify Firebase security rules

## Common Tasks

### Adding a New Page
1. Create folder in `app/` directory
2. Add `page.js` with component
3. Update sidebar navigation in `components/Sidebar.js`
4. Add appropriate Firebase security rules
5. Test with different user roles

### Adding a New Feature to Dashboard
1. Create component in `components/`
2. Import in `app/dashboard/page.js`
3. Add Firebase listener if needed
4. Style with TailwindCSS
5. Test in both light and dark modes

### Modifying Firebase Structure
1. Update the data in Firestore
2. Update security rules in `firestore.rules`
3. Update related components
4. Deploy rules: `firebase deploy --only firestore`

## Environment Variables

Required in `.env.local`:
- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Framer Motion Documentation](https://www.framer.com/motion/)

## AI Assistant Guidelines

When helping with this project:
1. Maintain the fun, colorful, family-friendly aesthetic
2. Always consider both parent and child user roles
3. Ensure real-time updates work properly
4. Test features in both light and dark modes
5. Keep mobile responsiveness in mind
6. Follow the existing code patterns and structure
7. Never remove features without explicit instruction
8. Always add proper error handling
9. Use emoji icons where appropriate
10. Keep the codebase clean and maintainable
