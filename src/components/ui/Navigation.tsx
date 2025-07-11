import React from 'react';
import { ThemeToggle } from './ThemeToggle';
import styles from './Navigation.module.css';

interface NavigationProps {
  className?: string;
}

export const Navigation: React.FC<NavigationProps> = ({ className }) => {
  return (
    <nav className={`${styles.navigation} ${className || ''}`}>
      <div className={styles.container}>
        {/* Logo */}
        <div className={styles.logo}>
          <img src="/logo.svg" alt="PanoViewer Logo" className={styles.logoImage} />
          <span className={styles.logoText}>PanoViewer</span>
        </div>
        
        {/* Theme Toggle */}
        <div className={styles.themeToggleWrapper}>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
};

export default Navigation;