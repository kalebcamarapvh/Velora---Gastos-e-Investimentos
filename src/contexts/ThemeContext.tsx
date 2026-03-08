import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════════
   🎨 CONFIGURAÇÃO DE VELOCIDADE DA TRANSIÇÃO DE TEMA
   ─────────────────────────────────────────────────────────────
   Altere este valor (em milissegundos) para controlar a
   velocidade da animação circular de troca de tema.

   Valores recomendados:
     400  → Rápido
     700  → Normal (padrão)
     1200 → Suave / cinematográfico
     2000 → Bem lento (para demonstração)
   ═══════════════════════════════════════════════════════════════ */
export const THEME_TRANSITION_MS = 1200;

export type ThemeType = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: ThemeType;
    isDark: boolean;
    setTheme: (newTheme: ThemeType, e?: React.MouseEvent) => void;
    toggle: (e?: React.MouseEvent) => void;
    transitionMs: number;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: 'dark',
    isDark: true,
    setTheme: () => { },
    toggle: () => { },
    transitionMs: THEME_TRANSITION_MS,
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<ThemeType>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('velora-theme-pref') as ThemeType;
            if (saved && ['light', 'dark', 'system'].includes(saved)) return saved;
        }
        return 'system';
    });

    const [isDark, setIsDark] = useState(false);
    const isAnimating = useRef(false);

    // Compute active darkness and apply classes
    useEffect(() => {
        const root = document.documentElement;
        let shouldBeDark = false;

        if (theme === 'system') {
            shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        } else {
            shouldBeDark = theme === 'dark';
        }

        if (shouldBeDark !== isDark) {
            if (shouldBeDark) root.classList.add('dark');
            else root.classList.remove('dark');
            setIsDark(shouldBeDark);
        }
        localStorage.setItem('velora-theme-pref', theme);
    }, [theme, isDark]);

    // Listener for system preference changes
    useEffect(() => {
        if (theme !== 'system') return;
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => {
            const root = document.documentElement;
            if (e.matches) root.classList.add('dark');
            else root.classList.remove('dark');
            setIsDark(e.matches);
        };
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    const setTheme = useCallback((newTheme: ThemeType, e?: React.MouseEvent) => {
        if (isAnimating.current || newTheme === theme) return;

        // Calculate if actual visual mode will change
        const currentIsDark = isDark;
        let nextIsDark = false;
        if (newTheme === 'system') {
            nextIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        } else {
            nextIsDark = newTheme === 'dark';
        }

        // If no visual change, just set state
        if (currentIsDark === nextIsDark || !e || typeof document === 'undefined' || !('startViewTransition' in document)) {
            setThemeState(newTheme);
            return;
        }

        // Get click coordinates for the radial origin
        const x = e.clientX;
        const y = e.clientY;

        // Calculate the maximum radius needed to cover the full screen
        const maxRadius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y),
        );

        isAnimating.current = true;

        // Set CSS custom properties for the animation
        document.documentElement.style.setProperty('--theme-x', `${x}px`);
        document.documentElement.style.setProperty('--theme-y', `${y}px`);
        document.documentElement.style.setProperty('--theme-radius', `${maxRadius}px`);
        document.documentElement.style.setProperty('--theme-transition-ms', `${THEME_TRANSITION_MS}ms`);

        const transition = (document as any).startViewTransition(() => {
            setThemeState(newTheme);
            const root = document.documentElement;
            if (nextIsDark) root.classList.add('dark');
            else root.classList.remove('dark');
            setIsDark(nextIsDark);
        });

        transition.finished.then(() => {
            isAnimating.current = false;
        });
    }, [theme, isDark]);

    const toggle = useCallback((e?: React.MouseEvent) => {
        const nextTheme = isDark ? 'light' : 'dark';
        setTheme(nextTheme, e);
    }, [isDark, setTheme]);

    return (
        <ThemeContext.Provider value={{ theme, isDark, setTheme, toggle, transitionMs: THEME_TRANSITION_MS }}>
            {children}
        </ThemeContext.Provider>
    );
};
