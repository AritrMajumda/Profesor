import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Sidebar() {
    const { state, actions } = useApp();
    const { state: authState, actions: authActions } = useAuth();
    const { isMoneyHeist } = useTheme();

    return (
        <aside className="sidebar">
            {/* Header */}
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">
                        {isMoneyHeist ? '' : '🎓'}
                    </div>
                    <span className="sidebar-logo-text">
                        {isMoneyHeist ? 'La Casa de Papel' : 'My Sessions'}
                    </span>
                </div>
            </div>

            {/* User Profile / Account */}
            {authState.user && (
                <div className="sidebar-user">
                    <div className="sidebar-user-avatar">
                        {authState.user.avatar || authState.user.name?.charAt(0) || '?'}
                    </div>
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">{authState.user.name}</div>
                        <div className="sidebar-user-email">{authState.user.email}</div>
                    </div>
                    <button
                        className="sidebar-user-logout"
                        onClick={authActions.logout}
                        title="Sign out"
                    >
                        ⏻
                    </button>
                </div>
            )}

            {/* Past Conversations / Sessions */}
            <div className="sidebar-section" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="sidebar-section-header">
                    <span className="sidebar-section-title">Past Sessions</span>
                    <button
                        className="sidebar-section-btn"
                        onClick={() => actions.setView('dashboard')}
                        title="View all analytics"
                    >
                        📊
                    </button>
                </div>

                <div className="chat-list" style={{ flex: 1, overflow: 'auto' }}>
                    {state.sessions.length > 0 ? (
                        state.sessions.map((session) => (
                            <div
                                key={session.id}
                                className={`chat-item ${state.viewingSession?.id === session.id ? 'active' : ''}`}
                                onClick={() => actions.viewSession(session.id, 'chat-history')}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="chat-item-header">
                                    <span className="chat-item-icon">📝</span>
                                    <span className="chat-item-title">
                                        {truncate(session.paperTitle || 'Exam Session', 18)}
                                    </span>
                                    <button
                                        className="session-analytics-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            actions.viewSession(session.id, 'session-analytics');
                                        }}
                                        title="View analytics"
                                    >
                                        📊
                                    </button>
                                </div>
                                <div className="chat-item-preview">
                                    <span>{session.subject || 'General'}</span>
                                    <span className={`session-score-badge ${getScoreClass(session.totalScore)}`}>
                                        {session.totalScore?.toFixed(1) || '0'}/10
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="empty-sessions">
                            <p className="text-muted" style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-4)', textAlign: 'center' }}>
                                No exam sessions yet. Start your first viva to see history here.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* New Exam Button */}
            <button
                className="new-chat-btn"
                onClick={() => {
                    actions.clearViewingSession();
                    actions.setView('upload');
                }}
            >
                <span>New exam</span>
                <span className="new-chat-btn-icon">+</span>
            </button>
        </aside>
    );
}

function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
}

function getScoreClass(score) {
    if (!score) return '';
    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
}
