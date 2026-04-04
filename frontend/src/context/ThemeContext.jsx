import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() =>
    localStorage.getItem('finos-theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  );
  const [animating, setAnimating] = useState(false);
  const [rippleOrigin, setRippleOrigin] = useState({ x: 100, y: 100 });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('finos-theme', theme);
  }, [theme]);

  const toggle = (e) => {
    if (animating) return;
    const rect = e?.currentTarget?.getBoundingClientRect();
    setRippleOrigin({
      x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
      y: rect ? rect.top + rect.height / 2 : window.innerHeight / 2,
    });
    setAnimating(true);
    setTimeout(() => {
      setTheme(t => t === 'dark' ? 'light' : 'dark');
      setTimeout(() => setAnimating(false), 600);
    }, 80);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle, isDark: theme === 'dark', animating }}>
      {animating && (
        <div
          className="fixed inset-0 pointer-events-none z-[9999] theme-ripple-anim"
          style={{
            background: theme === 'dark' ? 'radial-gradient(circle at var(--rx) var(--ry), #f1f5f9 0%, transparent 100%)' : 'radial-gradient(circle at var(--rx) var(--ry), #0f172a 0%, transparent 100%)',
            '--rx': `${rippleOrigin.x}px`,
            '--ry': `${rippleOrigin.y}px`,
          }}
        />
      )}
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
