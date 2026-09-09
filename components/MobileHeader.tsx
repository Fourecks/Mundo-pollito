import React from 'react';

interface MobileHeaderProps {
  title: string;
  children?: React.ReactNode;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ title, children }) => {
  return (
    <header className="sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md px-4 pt-10 pb-4 z-30 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
      <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">{title}</h1>
      <div className="flex items-center gap-2">
        {children}
      </div>
    </header>
  );
};

export default MobileHeader;