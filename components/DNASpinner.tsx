import React from 'react';

export const DNASpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center gap-2 h-16 w-16">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-full animate-bounce ${
            i === 0 ? 'bg-red-500' :
            i === 1 ? 'bg-blue-500' :
            i === 2 ? 'bg-green-500' :
            'bg-yellow-500'
          }`}
          style={{ 
            animationDuration: '1s',
            animationDelay: `${i * 0.15}s` 
          }}
        />
      ))}
    </div>
  );
};