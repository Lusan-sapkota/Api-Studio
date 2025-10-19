import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) return savedTheme;
    return 'system';
  });

  const getEffectiveTheme = (currentTheme: Theme): 'light' | 'dark' => {
    if (currentTheme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return currentTheme;
  };

  useEffect(() => {
    const root = window.document.documentElement;
    const effectiveTheme = getEffectiveTheme(theme);
    
    root.classList.remove('light', 'dark');
    root.classList.add(effectiveTheme);
    localStorage.setItem('theme', theme);

    // Listen for system theme changes when theme is 'system'
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (theme === 'system') {
        const newEffectiveTheme = getEffectiveTheme('system');
        root.classList.remove('light', 'dark');
        root.classList.add(newEffectiveTheme);
      }
    };

    if (theme === 'system') {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    }

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    const effectiveTheme = getEffectiveTheme(theme);
    setTheme(effectiveTheme === 'light' ? 'dark' : 'light');
  };

  return { 
    theme, 
    setTheme, 
    toggleTheme,
    effectiveTheme: getEffectiveTheme(theme)
  };
}
