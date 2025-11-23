'use client';

import { useState } from 'react';
import { FaCalendarAlt, FaApple, FaGoogle, FaCopy, FaCheck } from 'react-icons/fa';

export default function CalendarShare({ id, isDarkMode }) {
  const [copied, setCopied] = useState(false);

  if (!id) return null;

  const encodedId = encodeURIComponent(id);
  const publicUrl = `https://calendar.google.com/calendar/embed?src=${encodedId}&ctz=America%2FNew_York`;
  const iCalUrl = `https://calendar.google.com/calendar/ical/${encodedId}/public/basic.ics`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(iCalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    // FIX: No background classes here at all. Just padding.
    // We rely on the parent page to provide the card background.
    <div className="p-6 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div>
          {/* Use the isDarkMode prop to conditionally style text */}
          <h3 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            <FaCalendarAlt className="text-blue-500" />
            Sync Family Calendar
          </h3>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Share this link to add events to your iPhone or Google Calendar app.
          </p>
        </div>

        <div className="flex-1 max-w-xl">
          {/* Inner Input Box Styling */}
          <div className={`flex items-center gap-2 p-2 rounded-xl border ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <div className={`p-2 rounded-lg border hidden sm:block ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
              <span className="text-xs font-bold text-gray-400">iCal Link</span>
            </div>
            <input 
              readOnly
              value={iCalUrl}
              className={`flex-1 bg-transparent text-xs sm:text-sm outline-none font-mono min-w-0 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
            />
            <button
              onClick={handleCopy}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
                copied 
                  ? 'bg-green-500 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {copied ? <FaCheck /> : <FaCopy />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          
          {/* Footer Links */}
          <div className="flex gap-4 mt-2 text-xs text-gray-400 px-1">
            <a href={publicUrl} target="_blank" rel="noreferrer" className="hover:text-blue-500 flex items-center gap-1">
              <FaGoogle /> View in Browser
            </a>
            <span className="flex items-center gap-1">
              <FaApple /> Works with Apple Calendar
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}