import React, { useState, useRef, useEffect } from 'react';
import { ParticleType, AmbientSoundType } from '../types';
import SparklesIcon from './icons/SparklesIcon';
import SnowIcon from './icons/SnowIcon';
import RainIcon from './icons/RainIcon';
import StarsIcon from './icons/StarsIcon';
import BubblesIcon from './icons/BubblesIcon';
import SparksIcon from './icons/SparksIcon';
import ParticlesOffIcon from './icons/ParticlesOffIcon';
import ForestIcon from './icons/ForestIcon';
import CoffeeIcon from './icons/CoffeeIcon';
import WaveIcon from './icons/WaveIcon';
import SoundOffIcon from './icons/SoundOffIcon';
import VolumeIcon from './icons/VolumeIcon';


interface AmbienceControlProps {
  particleType: ParticleType;
  setParticleType: (type: ParticleType) => void;
  ambientSound: { type: AmbientSoundType; volume: number };
  setAmbientSound: React.Dispatch<React.SetStateAction<{ type: AmbientSoundType; volume: number }>>;
}

const particleOptions: { type: ParticleType; icon: React.FC; label: string }[] = [
    { type: 'none', icon: ParticlesOffIcon, label: 'Ninguna' },
    { type: 'snow', icon: SnowIcon, label: 'Nieve' },
    { type: 'rain', icon: RainIcon, label: 'Lluvia' },
    { type: 'stars', icon: StarsIcon, label: 'Estrellas' },
    { type: 'bubbles', icon: BubblesIcon, label: 'Burbujas' },
    { type: 'sparks', icon: SparksIcon, label: 'Chispas' },
];

const soundOptions: { type: AmbientSoundType; icon: React.FC; label: string }[] = [
    { type: 'none', icon: SoundOffIcon, label: 'Silencio' },
    { type: 'rain', icon: RainIcon, label: 'Lluvia' },
    { type: 'forest', icon: ForestIcon, label: 'Bosque' },
    { type: 'coffee_shop', icon: CoffeeIcon, label: 'Cafetería' },
    { type: 'ocean', icon: WaveIcon, label: 'Mar' },
];


const AmbienceControl: React.FC<AmbienceControlProps> = ({ 
    particleType, setParticleType, ambientSound, setAmbientSound 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSoundSelect = (type: AmbientSoundType) => {
    setAmbientSound(prev => ({ ...prev, type }));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setAmbientSound(prev => ({...prev, volume: newVolume }));
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(prev => !prev)}
        className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm text-gray-700 dark:text-gray-300 hover:text-primary p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
        aria-label="Control de Ambiente"
      >
        <SparklesIcon className="h-6 w-6" />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="absolute top-full right-0 mt-2 z-10 w-64 bg-white/80 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-2xl p-3 animate-pop-in origin-top-right"
        >
            {/* Partículas */}
            <div>
                <h4 className="font-bold text-gray-700 dark:text-gray-200 text-sm mb-2 text-center">Partículas</h4>
                <div className="grid grid-cols-3 gap-2">
                    {particleOptions.map(opt => (
                        <button 
                            key={opt.type} 
                            onClick={() => setParticleType(opt.type)}
                            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors text-xs font-semibold ${particleType === opt.type ? 'bg-primary-light/50 dark:bg-primary/20 text-primary-dark dark:text-primary' : 'text-gray-600 dark:text-gray-300 hover:bg-secondary-lighter dark:hover:bg-gray-700'}`}
                            title={opt.label}
                        >
                            <opt.icon />
                            <span className="mt-1">{opt.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Sonidos */}
            <div className="mt-3 pt-3 border-t border-secondary-light/50 dark:border-gray-700/50">
                <h4 className="font-bold text-gray-700 dark:text-gray-200 text-sm mb-2 text-center">Sonidos</h4>
                <div className="grid grid-cols-3 gap-2">
                    {soundOptions.map(opt => (
                        <button 
                            key={opt.type}
                            onClick={() => handleSoundSelect(opt.type)}
                            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors text-xs font-semibold ${ambientSound.type === opt.type ? 'bg-primary-light/50 dark:bg-primary/20 text-primary-dark dark:text-primary' : 'text-gray-600 dark:text-gray-300 hover:bg-secondary-lighter dark:hover:bg-gray-700'}`}
                            title={opt.label}
                        >
                            <opt.icon />
                            <span className="mt-1">{opt.label}</span>
                        </button>
                    ))}
                </div>
            </div>
            
            {/* Volumen */}
            <div className={`mt-3 pt-3 border-t border-secondary-light/50 dark:border-gray-700/50 transition-opacity ${ambientSound.type === 'none' ? 'opacity-50' : ''}`}>
                 <div className="flex items-center gap-2">
                    <VolumeIcon />
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={ambientSound.volume}
                        onChange={handleVolumeChange}
                        disabled={ambientSound.type === 'none'}
                        className="w-full h-2 bg-secondary-light/80 dark:bg-gray-600/80 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                    />
                 </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AmbienceControl;