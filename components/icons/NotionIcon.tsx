import React from 'react';

interface NotionIconProps {
  className?: string;
  size?: number;
}

const NotionIcon: React.FC<NotionIconProps> = ({ className = 'w-5 h-5', size }) => {
  const style = size ? { width: size, height: size } : undefined;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M10 8v8" />
      <path d="M10 8l4 8" />
      <path d="M14 8v8" />
    </svg>
  );
};

export default NotionIcon;
