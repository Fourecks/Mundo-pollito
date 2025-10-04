import React from 'react';
import SunIcon from './icons/SunIcon';
import MoonIcon from './icons/MoonIcon';

interface ThemeToggleButtonProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}
const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({ theme, toggleTheme }) => (
  <button
    onClick={toggleTheme}
    className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm text-gray-700 dark:text-gray-300 hover:text-pink-500 dark:hover:text-pink-400 p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
    aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
  >
    {theme === 'light' ? <MoonIcon /> : <SunIcon />}
  </button>
);

export default ThemeToggleButton;
