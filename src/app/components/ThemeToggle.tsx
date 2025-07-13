'use client';

import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        px-3 py-2 rounded-lg transition-colors
        ${theme === 'dark'
          ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400'
          : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
        }
      `}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}