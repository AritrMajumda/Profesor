import { useApp } from '../context/AppContext';
import { getSessionScoreClass } from '../utils/gemini';

export default function Dashboard() {
    const { state, actions } = useApp();

    // Calculate analytics
    const totalSessions = state.sessions.length;
    const avgScore = state.totalScore || 0;
    const subjectList = Object.entries(state.subjectStats || {});

    // Calculate answer breakdown from all sessions
    const answerBreakdown = { correct: 0, partial: 0, incorrect: 0 };
    state.sessions.forEach(session => {
        session.scores?.forEach(score => {
            if (score >= 7) answerBreakdown.correct++;
            else if (score >= 4) answerBreakdown.partial++;
            else answerBreakdown.incorrect++;
        });
    });

    const totalAnswers = answerBreakdown.correct + answerBreakdown.partial + answerBreakdown.incorrect;

    return (
        <>
            <h3 className="dashboard-title">
                <span>📊</span> Performance Analytics
            </h3>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">📝</div>
                    <div className="stat-value">{state.totalQuestions}</div>
                    <div className="stat-label">Total Questions</div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">🎯</div>
                    <ScoreRing score={avgScore} />
                    <div className="stat-label">Average Score</div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">📚</div>
                    <div className="stat-value">{subjectList.length}</div>
                    <div className="stat-label">Subjects</div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">🎓</div>
                    <div className="stat-value">{totalSessions}</div>
                    <div className="stat-label">Sessions</div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="charts-grid">
                {/* Subject Performance */}
                <div className="chart-card">
                    <h4><span>📈</span> Subject Performance</h4>
                    {subjectList.length > 0 ? (
                        <div className="bar-chart">
                            {subjectList.map(([subject, data]) => (
                                <div key={subject} className="bar-item">
                                    <span className="bar-label">{truncate(subject, 12)}</span>
                                    <div className="bar-track">
                                        <div
                                            className="bar-fill"
                                            style={{ width: `${(data.totalScore / 10) * 100}%` }}
                                        />
                                    </div>
                                    <span className="bar-value">{data.totalScore.toFixed(1)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted text-center" style={{ padding: 'var(--space-8)' }}>
                            No subject data yet. Complete an examination to see stats.
                        </p>
                    )}
                </div>

                {/* Answer Analysis */}
                <div className="chart-card">
                    <h4><span>🎯</span> Answer Analysis</h4>
                    {totalAnswers > 0 ? (
                        <div className="analysis-grid">
                            <div className="analysis-item">
                                <div className="analysis-icon correct">✓</div>
                                <div className="analysis-value correct">{answerBreakdown.correct}</div>
                                <div className="analysis-label">Correct</div>
                            </div>
                            <div className="analysis-item">
                                <div className="analysis-icon partial">◐</div>
                                <div className="analysis-value partial">{answerBreakdown.partial}</div>
                                <div className="analysis-label">Partial</div>
                            </div>
                            <div className="analysis-item">
                                <div className="analysis-icon incorrect">✕</div>
                                <div className="analysis-value incorrect">{answerBreakdown.incorrect}</div>
                                <div className="analysis-label">Incorrect</div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-muted text-center" style={{ padding: 'var(--space-8)' }}>
                            No answers recorded yet.
                        </p>
                    )}
                </div>
            </div>

            {/* Recent Sessions */}
            <div className="chart-card">
                <h4><span>🕐</span> Recent Sessions</h4>
                {state.sessions.length > 0 ? (
                    <table className="sessions-table">
                        <thead>
                            <tr>
                                <th>Subject</th>
                                <th>Paper</th>
                                <th>Questions</th>
                                <th>Score</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {state.sessions.slice(0, 10).map((session) => (
                                <tr
                                    key={session.id}
                                    onClick={() => actions.viewSession(session.id, 'session-analytics')}
                                    style={{ cursor: 'pointer' }}
                                    className="session-row"
                                >
                                    <td>
                                        <div className="session-subject">
                                            <div className="session-subject-icon">📄</div>
                                            {session.subject || 'General'}
                                        </div>
                                    </td>
                                    <td>{truncate(session.paperTitle, 25)}</td>
                                    <td>{session.questionsAsked || 5}</td>
                                    <td>
                                        <span className={`session-score ${getSessionScoreClass(session.totalScore)}`}>
                                            {session.totalScore.toFixed(1)}/10
                                        </span>
                                    </td>
                                    <td className="text-muted">
                                        {formatDate(session.date)}
                                    </td>
                                    <td>
                                        <button
                                            className="btn-icon"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                actions.viewSession(session.id, 'chat-history');
                                            }}
                                            title="View Chat History"
                                            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                                        >
                                            💬
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="text-muted text-center" style={{ padding: 'var(--space-8)' }}>
                        No sessions recorded yet. Complete your first examination to see history.
                    </p>
                )}
            </div>
        </>
    );
}

function ScoreRing({ score }) {
    const circumference = 2 * Math.PI * 35;
    const strokeDashoffset = circumference - (score / 10) * circumference;

    return (
        <div className="score-ring-container">
            <svg className="score-ring" viewBox="0 0 80 80">
                <defs>
                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#22c55e" />
                        <stop offset="100%" stopColor="#16a34a" />
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

function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
