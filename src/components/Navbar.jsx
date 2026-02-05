import { useApp } from '../context/AppContext';

export default function Navbar() {
    const { state, actions } = useApp();

    return (
        <nav className="navbar">
            <div className="container navbar-content">
                <div className="logo">
                    <div className="logo-icon">🎓</div>
                    <span className="logo-text">Profesor</span>
                </div>

                <div className="nav-links">
                    <button
                        className={`nav-link ${state.currentView === 'upload' ? 'active' : ''}`}
                        onClick={() => actions.setView('upload')}
                    >
                        Upload Paper
                    </button>
                    <button
                        className={`nav-link ${state.currentView === 'exam' ? 'active' : ''}`}
                        onClick={() => actions.setView('exam')}
                        disabled={!state.isExamActive && !state.paperContent}
                    >
                        Examination
                    </button>
                    <button
                        className={`nav-link ${state.currentView === 'dashboard' ? 'active' : ''}`}
                        onClick={() => actions.setView('dashboard')}
                    >
                        Dashboard
                    </button>
                </div>
            </div>
        </nav>
    );
}
