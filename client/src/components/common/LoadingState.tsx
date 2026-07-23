/**
 * LoadingState — loading spinner with message.
 * Translated from React Native ActivityIndicator → CSS spinner.
 */
import React from 'react';

export interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12" data-testid="loading-state">
      <div
        className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"
        data-testid="loading-spinner"
      />
      <p className="mt-3 text-sm text-gray-500" data-testid="loading-message">
        {message}
      </p>
    </div>
  );
}
