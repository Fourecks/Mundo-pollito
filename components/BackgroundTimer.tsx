
import React from 'react';

interface BackgroundTimerProps {
  timeLeft: number;
  opacity: number;
}

const BackgroundTimer: React.FC<BackgroundTimerProps> = ({ timeLeft, opacity }) => {
  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const secs = (timeLeft % 60).toString().padStart(2, '0');

  return (
    <div 
        className="fixed inset-0 flex flex-col items-center justify-center -z-20 pointer-events-none"
        aria-hidden="true"
    >
      <div className="font-bold select-none text-center leading-none" style={{ color: `rgba(255, 255, 255, ${opacity / 100})`, textShadow: '0 0 30px rgba(0,0,0,0.5)' }}>
        <span className="text-[18vw]">{mins}</span>
        <span className="text-[10vw] block -mt-[2vw]">{secs}</span>
      </div>
    </div>
  );
};

export default BackgroundTimer;
