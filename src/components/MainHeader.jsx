import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';

export default function MainHeader() {
    const { state, actions } = useApp();
    const { isMoneyHeist, toggleTheme } = useTheme();

    const getTitle = () => {
        switch (state.currentView) {
            case 'exam':
                return state.paperTitle || 'Examination';
            case 'dashboard':
                return 'Analytics Dashboard';
            default:
                return 'New Examination';
        }
    };

    return (
        <header className="main-header">
            <div className="main-header-left">
                {state.currentView !== 'upload' && (
                    <button className="back-btn" onClick={() => actions.setView('upload')}>
                        ← Back
                    </button>
                )}
                <span className="header-title">{getTitle()}</span>
                <span className="header-badge">Profesor AI</span>
            </div>

            <div className="main-header-right">
                <button
                    className="header-action-btn theme-toggle"
                    onClick={toggleTheme}
                    title={isMoneyHeist ? 'Switch to Normal Theme' : 'Switch to Money Heist Theme'}
                >
                    {isMoneyHeist ? '🌲' : '🎭'}
                </button>
            </div>
        </header>
    );
}
