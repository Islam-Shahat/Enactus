import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Check saved preference or default to dark
    try {
      const saved = localStorage.getItem('enactus_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // localStorage might fail in private browsing
    }
    return 'dark';
  });

  useEffect(() => {
    try {
      localStorage.setItem('enactus_theme', theme);
    } catch {
      // ignore
    }

    const root = document.documentElement;
    const body = document.body;

    root.setAttribute('data-theme', theme);
    body.setAttribute('data-theme', theme);

    if (theme === 'light') {
      root.classList.add('light-theme');
      body.classList.add('light-theme');
    } else {
      root.classList.remove('light-theme');
      body.classList.remove('light-theme');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
