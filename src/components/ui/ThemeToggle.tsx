import React, { useState, useEffect } from 'react';
import { FiSun, FiMoon } from 'react-icons/fi';
import styles from './ThemeToggle.module.css';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    // Check for saved theme preference or default to dark
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const applyTheme = (newTheme: 'light' | 'dark') => {
    const root = document.documentElement;
    if (newTheme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className={`${styles.themeToggle} ${theme === 'light' ? styles.light : styles.dark} ${className || ''}`}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className={styles.track}>
        <div className={`${styles.slider} ${theme === 'light' ? styles.sliderLight : styles.sliderDark}`}>
          <div className={styles.iconContainer}>
            {theme === 'light' ? (
              <FiMoon className={styles.icon} />
            ) : (
              <FiSun className={styles.icon} />
            )}
          </div>
        </div>
        <div className={styles.trackIcons}>
          <FiSun className={`${styles.trackIcon} ${styles.sunIcon}`} />
          <FiMoon className={`${styles.trackIcon} ${styles.moonIcon}`} />
        </div>
      </div>
    </button>
  );
};

export default ThemeToggle;