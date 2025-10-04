import React from 'react';

interface MobileHeaderProps {
  title: string;
  children?: React.ReactNode;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ title, children }) => {
  return (
    <header className="sticky top-0 bg-yellow-50/80 dark:bg-gray-800/80 backdrop-blur-md p-4 z-30 border-b border-yellow-300/50 dark:border-gray-700/50 flex items-center justify-between">
      <h1 className="text-xl font-bold text-pink-500 dark:text-pink-400">{title}</h1>
      <div className="flex items-center gap-2">
        {children}
      </div>
    </header>
  );
};

export default MobileHeader;