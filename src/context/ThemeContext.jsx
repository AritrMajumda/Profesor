import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

const THEMES = {
    NORMAL: 'normal',
    MONEY_HEIST: 'moneyheist',
};

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        // Load saved theme from localStorage
        const saved = localStorage.getItem('profesor-theme');
        return saved || THEMES.NORMAL;
    });

    useEffect(() => {
        // Apply theme to document
        document.documentElement.setAttribute('data-theme', theme);
        // Save to localStorage
        localStorage.setItem('profesor-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) =>
            prev === THEMES.NORMAL ? THEMES.MONEY_HEIST : THEMES.NORMAL
        );
    };

    const isMoneyHeist = theme === THEMES.MONEY_HEIST;

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, isMoneyHeist, THEMES }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
}
