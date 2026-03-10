import React, { useState } from 'react';

interface TickerLogoProps {
    ticker: string;
    size?: number;       // px — default 28
    className?: string;
}

/**
 * Exibe a logo do ticker via CDN gratuito do Brapi.
 * URL: https://icons.brapi.dev/icons/{TICKER}.svg
 * Se a logo não existir, renderiza um avatar com a inicial do ticker.
 */
export const TickerLogo = ({ ticker, size = 28, className = '' }: TickerLogoProps) => {
    const [failed, setFailed] = useState(false);

    const initial = ticker?.charAt(0).toUpperCase() ?? '?';

    // Gera uma cor de fundo determinística baseada no ticker
    const colors = [
        'bg-blue-100 text-blue-700',
        'bg-violet-100 text-violet-700',
        'bg-emerald-100 text-emerald-700',
        'bg-amber-100 text-amber-700',
        'bg-rose-100 text-rose-700',
        'bg-cyan-100 text-cyan-700',
        'bg-indigo-100 text-indigo-700',
        'bg-pink-100 text-pink-700',
    ];
    const colorClass = colors[ticker.charCodeAt(0) % colors.length];

    const style = { width: size, height: size, minWidth: size };

    if (failed) {
        return (
            <span
                style={style}
                className={`inline-flex items-center justify-center rounded-full text-xs font-bold ${colorClass} ${className}`}
            >
                {initial}
            </span>
        );
    }

    return (
        <img
            src={`https://icons.brapi.dev/icons/${ticker}.svg`}
            alt={ticker}
            style={style}
            className={`rounded-full object-contain bg-white border border-slate-100 ${className}`}
            onError={() => setFailed(true)}
        />
    );
};
