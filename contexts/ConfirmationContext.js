'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import ConfirmationModal from '@/components/ConfirmationModal';

const ConfirmationContext = createContext();

export const useConfirmation = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirmation must be used within a ConfirmationProvider');
  }
  return context;
};

export function ConfirmationProvider({ children }) {
  const [options, setOptions] = useState(null);

  const showConfirmation = useCallback((newOptions) => {
    setOptions({ ...newOptions, isOpen: true });
  }, []);

  const handleClose = () => {
    setOptions(null);
  };

  const handleConfirm = () => {
    if (options && options.onConfirm) {
      options.onConfirm();
    }
    handleClose();
  };

  const handleCancel = () => {
    if (options && options.onCancel) {
      options.onCancel();
    }
    handleClose();
  };

  return (
    <ConfirmationContext.Provider value={{ showConfirmation }}>
      {children}
      {options && options.isOpen && (
        <ConfirmationModal
          {...options}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmationContext.Provider>
  );
}
