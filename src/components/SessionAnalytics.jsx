import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';

export default function SessionAnalytics() {
    const { state, actions } = useApp();
    const { isMoneyHeist } = useTheme();
    const session = state.viewingSession;

    if (!session) {
        return (
            <div className="central-area">
                <div className="welcome-card">
                    <div className="empty-state">
                        <div className="empty-icon">📊</div>
                        <h3>No Session Selected</h3>
                        <p className="text-muted">
                            Select a session from the sidebar to view its analytics.
                        </p>
                        <button
                            className="btn btn-primary"
                            style={{ marginTop: '1.5rem' }}
                            onClick={() => actions.setView('dashboard')}
                        >
                            Go to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const avgScore = session.totalScore || 0;
    const questionData = session.questionData || [];

    return (
        <div className="session-analytics-container animate-fade-in">
            {/* Header */}
            <div className="session-analytics-header">
                <button
                    className="back-btn"
                    onClick={() => {
                        actions.clearViewingSession();
                        actions.setView('dashboard');
                    }}
                >
                    ← Back to Dashboard
                </button>
                <h2 className="session-analytics-title">
                    {isMoneyHeist ? '🎭' : '📊'} Session Analytics
                </h2>
            </div>

            {/* Session Info Card */}
            <div className="session-info-card">
                <div className="session-info-main">
                    <h3 className="session-paper-title">{session.paperTitle || 'Exam Session'}</h3>
                    <p className="session-meta">
                        <span>{session.subject || 'General'}</span>
                        <span>•</span>
                        <span>{formatDate(session.date)}</span>
                        <span>•</span>
                        <span>{formatDuration(session.duration)}</span>
                    </p>
                </div>
                <div className="session-score-ring">
                    <ScoreRing score={avgScore} />
                    <span className="session-score-label">Overall Score</span>
                </div>
            </div>

            {/* Question by Question Breakdown */}
            <div className="questions-breakdown">
                <h3 className="breakdown-title">📝 Question-by-Question Breakdown</h3>

                {questionData.length > 0 ? (
                    <div className="questions-list">
                        {questionData.map((q, idx) => (
                            <div key={idx} className="question-card">
                                <div className="question-header">
                                    <span className="question-number">Question {idx + 1}</span>
                                    <span className={`score-badge ${getScoreClass(q.score)}`}>
                                        {q.score}/10
                                    </span>
                                </div>

                                <div className="question-text">
                                    <strong>Q:</strong> {q.questionText}
                                </div>

                                <div className="answer-text">
                                    <strong>Your Answer:</strong> {q.answerText}
                                </div>

                                <div className={`feedback-box ${getScoreClass(q.score)}`}>
                                    <div className="feedback-icon">
                                        {q.score >= 7 ? '✅' : q.score >= 4 ? '💡' : '📚'}
                                    </div>
                                    <p className="first-person-feedback">
                                        {q.firstPersonFeedback}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted text-center" style={{ padding: 'var(--space-8)' }}>
                        No detailed question data available for this session.
                    </p>
                )}
            </div>

            {/* Action Buttons */}
            <div className="session-actions">
                <button
                    className="btn btn-secondary"
                    onClick={() => {
                        actions.viewSession(session.id, 'chat-history');
                    }}
                >
                    💬 View Chat History
                </button>
                <button
                    className="btn btn-primary"
                    onClick={() => actions.setView('upload')}
                >
                    + Start New Exam
                </button>
            </div>
        </div>
    );
}

function ScoreRing({ score }) {
    const circumference = 2 * Math.PI * 35;
    const strokeDashoffset = circumference - (score / 10) * circumference;

    return (
        <div className="score-ring-container">
            <svg className="score-ring" viewBox="0 0 80 80">
                <defs>
                    <linearGradient id="scoreGradientSession" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--color-accent)" />
                        <stop offset="100%" stopColor="var(--color-accent-dark)" />
                    </linearGradient>
                </defs>
                <circle className="score-ring-bg" cx="40" cy="40" r="35" />
                <circle
                    className="score-ring-progress"
                    cx="40"
                    cy="40"
                    r="35"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                />
            </svg>
            <div className="score-ring-value">
                {score.toFixed(1)}
            </div>
        </div>
    );
}

function getScoreClass(score) {
    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatDuration(ms) {
    if (!ms) return '';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
}
