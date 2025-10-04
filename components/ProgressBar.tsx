import React from 'react';

interface ProgressBarProps {
  completed: number;
  total: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ completed, total }) => {
  const percentage = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="my-4 px-2">
      <div className="relative h-3 w-full rounded-full bg-secondary-light/80 dark:bg-gray-700 shadow-inner">
        {/* Filled part */}
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        ></div>
        {/* Chicken Emoji */}
        <div
          className="absolute top-1/2 -translate-y-1/2"
          style={{ left: `${percentage}%`, transition: 'left 0.5s ease-out' }}
        >
          <div className="-translate-x-1/2 transform -scale-x-100">
             <span className="text-3xl drop-shadow-lg" role="img" aria-label="pollito">🐤</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;