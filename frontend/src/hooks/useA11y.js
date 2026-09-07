import React from 'react';
import { useCallback } from 'react';

const useA11y = () => {
  const handleKeyPress = useCallback((event, callback) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      callback();
    }
  }, []);

  const getAriaLabel = useCallback((text) => {
    return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
  }, []);

  return {
    handleKeyPress,
    getAriaLabel
  };
};

export default useA11y;
