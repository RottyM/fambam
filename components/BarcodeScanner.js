"use client";

import React, { useState } from "react";
import { useZxing } from "react-zxing";

export default function BarcodeScanner({ onScan, onClose }) {
  const [error, setError] = useState(null);

  // useZxing hook handles the camera logic
  const { ref } = useZxing({
    // Force the back camera ("environment")
    constraints: { video: { facingMode: "environment" } },
    onDecodeResult(result) {
      // Pass the raw text (e.g., "123456789") up to the parent
      onScan(result.getText());
    },
    onError(err) {
      // Ignore minor scanning errors, but capture real failures (like no camera perm)
      if (err.name === "NotAllowedError") {
        setError("Camera permission denied. Please allow camera access.");
      }
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-2xl ring-1 ring-white/10">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
            Scan Item 🥫
          </h3>
          <button
            onClick={onClose}
            className="rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Camera View */}
        <div className="relative aspect-square w-full bg-black">
          {error ? (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center text-white">
              <p className="mb-2 text-3xl">🚫</p>
              <p>{error}</p>
            </div>
          ) : (
            <>
              {/* The actual video element */}
              <video 
                ref={ref} 
                className="h-full w-full object-cover" 
                muted // Mute required for autoplay on some browsers
              />
              
              {/* Overlay: Scanning Guide Box */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative h-48 w-64 rounded-lg border-2 border-primary/50 dark:border-primary/80">
                  {/* Corner Markers */}
                  <div className="absolute -top-1 -left-1 h-4 w-4 border-l-4 border-t-4 border-primary"></div>
                  <div className="absolute -top-1 -right-1 h-4 w-4 border-r-4 border-t-4 border-primary"></div>
                  <div className="absolute -bottom-1 -left-1 h-4 w-4 border-l-4 border-b-4 border-primary"></div>
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 border-r-4 border-b-4 border-primary"></div>
                  
                  {/* Animated Scan Line */}
                  {/* Animated Scan Line - Uses standard Tailwind + Inline CSS to avoid touching global config */}
                  <div 
                    className="absolute left-0 h-0.5 w-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,1)]"
                    style={{ 
                      animation: "scan-vertical 2s ease-in-out infinite" 
                    }}
                  >
                    <style jsx>{`
                      @keyframes scan-vertical {
                        0%, 100% { top: 0%; opacity: 0; }
                        10% { opacity: 1; }
                        90% { opacity: 1; }
                        100% { top: 100%; opacity: 0; }
                      }
                    `}</style>
                  </div>
                                    </div>
                                </div>
                              </>
                            )}
                          </div>

        {/* Footer Hint */}
        <div className="bg-gray-50 px-4 py-3 text-center text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          Point camera at a barcode to add to Pantry
        </div>
      </div>
    </div>
  );
}