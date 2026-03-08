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

interface ThemeContextType {
    dark: boolean;
    toggle: (e?: React.MouseEvent) => void;
    transitionMs: number;
}

const ThemeContext = createContext<ThemeContextType>({
    dark: false,
    toggle: () => { },
    transitionMs: THEME_TRANSITION_MS,
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [dark, setDark] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('velora-theme');
            if (saved) return saved === 'dark';
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });

    const isAnimating = useRef(false);

    // Apply class on initial load (no animation)
    useEffect(() => {
        const root = document.documentElement;
        if (dark) root.classList.add('dark');
        else root.classList.remove('dark');
        localStorage.setItem('velora-theme', dark ? 'dark' : 'light');
    }, [dark]);

    const toggle = useCallback((e?: React.MouseEvent) => {
        if (isAnimating.current) return;

        // Get click coordinates for the radial origin
        const x = e ? e.clientX : window.innerWidth - 80;
        const y = e ? e.clientY : 32;

        // Calculate the maximum radius needed to cover the full screen
        const maxRadius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y),
        );

        // Check if View Transitions API is available
        if (typeof document !== 'undefined' && 'startViewTransition' in document) {
            isAnimating.current = true;

            // Set CSS custom properties for the animation
            document.documentElement.style.setProperty('--theme-x', `${x}px`);
            document.documentElement.style.setProperty('--theme-y', `${y}px`);
            document.documentElement.style.setProperty('--theme-radius', `${maxRadius}px`);
            document.documentElement.style.setProperty('--theme-transition-ms', `${THEME_TRANSITION_MS}ms`);

            const transition = (document as any).startViewTransition(() => {
                setDark(d => {
                    const next = !d;
                    const root = document.documentElement;
                    if (next) root.classList.add('dark');
                    else root.classList.remove('dark');
                    localStorage.setItem('velora-theme', next ? 'dark' : 'light');
                    return next;
                });
            });

            transition.finished.then(() => {
                isAnimating.current = false;
            });
        } else {
            // Fallback: instant toggle if View Transitions not supported
            setDark(d => !d);
        }
    }, []);

    return (
        <ThemeContext.Provider value={{ dark, toggle, transitionMs: THEME_TRANSITION_MS }}>
            {children}
        </ThemeContext.Provider>
    );
};
