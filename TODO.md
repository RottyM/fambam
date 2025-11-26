# Project TODO List

This document outlines major issues and suggestions for improvement identified during the recent code review.

## Major Issues Found

*   **Potential Bug in Dashboard - Medication Data:** The `fetchMedicationsForMember` function in `app/dashboard/page.js` has a potential bug related to a stale closure in `useCallback`. This could lead to incorrect medication data being displayed. (Refer to `app/dashboard/page.js` review notes for more details).

## Suggestions for Improvement

### Code Structure and Maintainability

1.  **Componentization**: Many of the main feature pages (`app/recipes/page.js`, `app/chores/page.js`, `app/medication/page.js`) have become very large and are managing too much state.
    *   **Action**: Break these large components down into smaller, more focused, and reusable components.
    *   **Benefit**: Improves readability, maintainability, reusability, and testability.

2.  **State Management**: For components with complex state logic (e.g., `app/recipes/page.js`), consider centralizing and organizing state.
    *   **Action**: Explore using a state management library (like Zustand or Redux Toolkit) or React's `useReducer` hook.
    *   **Benefit**: Simplifies state logic, reduces prop drilling, and makes debugging easier.

3.  **Configuration Management**: Several parts of the application (e.g., `CATEGORIES` in `app/groceries/page.js`, `EVENT_CATEGORIES` in `app/dashboard/page.js`) have hardcoded configuration data.
    *   **Action**: Move hardcoded configuration data to a central configuration file or consider managing it in a database if dynamic updates are required.
    *   **Benefit**: Makes configuration easier to manage, update, and reuse across the application.

4.  **Remove Dead Code**: The `ignoredHandleMarkAsTaken` function in `app/medication/page.js` was identified as unused.
    *   **Action**: Remove any dead code identified during the review.
    *   **Benefit**: Reduces bundle size and improves code clarity.

### User Experience

1.  **Custom Confirmation Modals**: The application currently uses the browser's native `confirm()` dialog for critical actions (e.g., deleting items in Chores, Groceries, and Medication). These can be jarring and offer limited styling.
    *   **Action**: Replace native `confirm()` dialogs with custom, styled confirmation modals.
    *   **Benefit**: Provides a more consistent and polished user experience.

2.  **Missing "Edit" Functionality**: The Chores, Groceries, and Medication features currently lack the ability to edit existing items. Users can only add or delete.
    *   **Action**: Implement "Edit" functionality for items within the Chores, Groceries, and Medication features.
    *   **Benefit**: Enhances user control and the overall utility of these features.

## Completed Actions (Already Addressed)

*   **Fixed Prerender Error in Music Page**: The `MusicContent` component was dynamically loaded on the client-side to prevent SSR issues.
*   **Fixed Bug in Music Page Playback**: Corrected an error in the `playPrev` function.
*   **Fixed Security Vulnerability in Recipes Feature**: Spoonacular API calls were moved to server-side API routes to prevent client-side API key exposure. The `.env.local.example` was updated accordingly.
*   **Cleaned Up Medication Page**: Removed dead code and excessive `console.log` statements.
