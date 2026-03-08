import React, { createContext, useContext, useState, useEffect } from 'react';

interface PrivacyContextType {
    hidden: boolean;
    togglePrivacy: () => void;
}

const PrivacyContext = createContext<PrivacyContextType>({
    hidden: false,
    togglePrivacy: () => { },
});

export const usePrivacy = () => useContext(PrivacyContext);

export const PrivacyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [hidden, setHidden] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('velora-privacy') === 'hidden';
        }
        return false;
    });

    useEffect(() => {
        const root = document.documentElement;
        if (hidden) {
            root.classList.add('values-hidden');
        } else {
            root.classList.remove('values-hidden');
        }
        localStorage.setItem('velora-privacy', hidden ? 'hidden' : 'visible');
    }, [hidden]);

    const togglePrivacy = () => setHidden(h => !h);

    return (
        <PrivacyContext.Provider value={{ hidden, togglePrivacy }}>
            {children}
        </PrivacyContext.Provider>
    );
};
