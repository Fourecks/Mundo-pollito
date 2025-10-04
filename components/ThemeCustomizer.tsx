import React from 'react';
import { ThemeColors } from '../types';

interface ThemeCustomizerProps {
  colors: ThemeColors;
  onColorChange: (colorName: keyof ThemeColors, value: string) => void;
  onReset: () => void;
}

const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({ colors, onColorChange, onReset }) => {
  return (
    <div className="p-3">
      <h4 className="font-bold text-gray-700 dark:text-gray-200 text-sm mb-3 text-center">Personalizar Colores</h4>
      <div className="space-y-3">
        {/* Primary Color */}
        <div>
          <label htmlFor="primary-color" className="text-xs font-semibold text-gray-600 dark:text-gray-300">Primario (Rosado)</label>
          <div className="flex items-center gap-2 mt-1">
            <div className="relative w-8 h-8">
              <input
                type="color"
                id="primary-color"
                value={colors.primary}
                onChange={(e) => onColorChange('primary', e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="w-full h-full rounded-lg border-2 border-white/50 dark:border-black/50" style={{ backgroundColor: colors.primary }}></div>
            </div>
            <input
              type="text"
              value={colors.primary}
              onChange={(e) => onColorChange('primary', e.target.value)}
              className="flex-grow bg-white/60 dark:bg-gray-700/60 text-gray-800 dark:text-gray-200 border-2 border-secondary-light/50 dark:border-gray-600 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-primary-dark dark:focus:ring-primary-dark text-xs"
            />
          </div>
        </div>

        {/* Secondary Color */}
        <div>
          <label htmlFor="secondary-color" className="text-xs font-semibold text-gray-600 dark:text-gray-300">Secundario (Amarillo)</label>
          <div className="flex items-center gap-2 mt-1">
            <div className="relative w-8 h-8">
              <input
                type="color"
                id="secondary-color"
                value={colors.secondary}
                onChange={(e) => onColorChange('secondary', e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="w-full h-full rounded-lg border-2 border-white/50 dark:border-black/50" style={{ backgroundColor: colors.secondary }}></div>
            </div>
            <input
              type="text"
              value={colors.secondary}
              onChange={(e) => onColorChange('secondary', e.target.value)}
              className="flex-grow bg-white/60 dark:bg-gray-700/60 text-gray-800 dark:text-gray-200 border-2 border-secondary-light/50 dark:border-gray-600 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-primary-dark dark:focus:ring-primary-dark text-xs"
            />
          </div>
        </div>
      </div>
      <button 
        onClick={onReset}
        className="w-full mt-4 text-center text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:underline font-semibold transition-colors"
      >
        Restaurar colores
      </button>
    </div>
  );
};

export default ThemeCustomizer;
