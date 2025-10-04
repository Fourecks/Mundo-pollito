import React from 'react';
import ChickenIcon from './ChickenIcon';

interface NoteCardProps {
  isFlipped: boolean;
  text: string;
  colorClass: string;
}

const NoteCard: React.FC<NoteCardProps> = ({ isFlipped, text, colorClass }) => {
  return (
    <div className="w-64 h-64 perspective-1000">
      <div
        className="relative w-full h-full transform-style-3d transition-transform duration-700"
        style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
      >
        {/* Back of the card */}
        <div className={`absolute w-full h-full backface-hidden rounded-2xl shadow-lg flex items-center justify-center ${colorClass}`}>
          <ChickenIcon className="w-20 h-20 text-white/40" />
        </div>
        {/* Front of the card */}
        <div className={`absolute w-full h-full backface-hidden rounded-2xl shadow-lg flex items-center justify-center p-6 text-center transform-rotate-y-180 ${colorClass}`}>
          <p className="font-semibold text-lg text-white/90" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
            {text}
          </p>
        </div>
      </div>
    </div>
  );
};

export default NoteCard;
