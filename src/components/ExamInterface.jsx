import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import {
    evaluateAndRespond,
    extractScore,
    formatDuration,
    getScoreCategory
} from '../utils/gemini';
import { useSpeech } from '../utils/speechUtils';

export default function ExamInterface() {
    const { state, actions } = useApp();
    const { isMoneyHeist } = useTheme();
    const [input, setInput] = useState('');
    const [elapsedTime, setElapsedTime] = useState(0);
    const [showSummary, setShowSummary] = useState(false);
    const [questionNumber, setQuestionNumber] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showVoiceSettings, setShowVoiceSettings] = useState(false);
    const [speakingMsgIdx, setSpeakingMsgIdx] = useState(null);
    const messagesEndRef = useRef(null);

    // Speech hook for TTS and STT
    const {
        speak, stopSpeaking, isPlaying, isPaused, pauseResume,
        voices, selectedVoice, changeVoice, rate, changeRate,
        autoRead, toggleAutoRead,
        startRecording, stopRecording, isRecording, isProcessing: isTranscribing,
        setTranscriptHandler, sttAvailable, error: speechError, clearError
    } = useSpeech();

    // Theme-aware avatars - use empty string for Money Heist (CSS shows the image)
    const profesorAvatar = isMoneyHeist ? '' : '🎓';
    const userAvatar = isMoneyHeist ? '' : '👤';

    // Timer effect
    useEffect(() => {
        if (!state.isExamActive) return;

        const interval = setInterval(() => {
            setElapsedTime(Date.now() - state.currentExamStartTime);
        }, 1000);

        return () => clearInterval(interval);
    }, [state.isExamActive, state.currentExamStartTime]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [state.messages]);

    // Setup transcript handler for voice input
    useEffect(() => {
        setTranscriptHandler((transcript) => {
            setInput(prev => prev ? `${prev} ${transcript}` : transcript);
        });
    }, [setTranscriptHandler]);

    // Auto-read new AI messages if enabled
    useEffect(() => {
        if (autoRead && state.messages.length > 0) {
            const lastMsg = state.messages[state.messages.length - 1];
            if (lastMsg.type === 'profesor') {
                handleSpeak(lastMsg.text, state.messages.length - 1);
            }
        }
    }, [state.messages, autoRead]);

    // Handle speaking a message
    const handleSpeak = (text, idx) => {
        if (isPlaying && speakingMsgIdx === idx) {
            stopSpeaking();
            setSpeakingMsgIdx(null);
        } else {
            speak(text);
            setSpeakingMsgIdx(idx);
        }
    };

    // Handle mic button
    const handleMicClick = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isProcessing) return;

        const userAnswer = input.trim();
        setInput('');

        // Add user message
        actions.addMessage('user', userAnswer);

        // Show typing indicator
        setIsProcessing(true);
        actions.setTyping(true);

        try {
            // Add placeholder message for specific AI response
            actions.addMessage('profesor', '');

            // Get AI evaluation with streaming
            let fullResponse = '';

            const response = await evaluateAndRespond(
                state.paperContent,
                state.messages,
                userAnswer,
                questionNumber,
                (token) => {
                    fullResponse += token;
                    // Directly update the last message in the UI state
                    // Note: In a real reducer, we might need a dedicated STREAM_UPDATE action
                    // But for now, we'll try a simpler 'force update' approach or just accept 
                    // that we need to dispatch updates occasionally to not kill React
                    // A better way: dispatch 'UPDATE_LAST_MESSAGE'
                    actions.updateLastMessage(fullResponse);
                }
            );

            actions.setTyping(false);

            // Extract score from final response
            const score = extractScore(response);

            // Clean the response (remove score marker for display)
            const cleanResponse = response.replace(/\[SCORE:\s*\d+\s*\/\s*10\]/gi, '').trim();

            // Extract question text from previous AI message for analytics
            // Find the last profesor message (which contains the question)
            const lastProfesorMsgIdx = [...state.messages].reverse().findIndex(m => m.type === 'profesor');
            if (lastProfesorMsgIdx !== -1) {
                const lastProfesorMsg = state.messages[state.messages.length - 1 - lastProfesorMsgIdx];
                actions.addQuestionText(lastProfesorMsg.text);
            }

            // Final update to clean response
            actions.updateLastMessage(cleanResponse);

            // Store the score
            actions.submitAnswer(userAnswer, score, cleanResponse);

            // Check if exam is complete (after 5 questions)
            if (questionNumber >= 5) {
                setShowSummary(true);
                actions.endExam();
            } else {
                setQuestionNumber(prev => prev + 1);
            }
        } catch (error) {
            console.error('Error getting response:', error);
            actions.setTyping(false);
            actions.addMessage('profesor', 'I apologize, there was an issue processing your response. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const progress = (questionNumber / 5) * 100;

    // Check if viewing chat history (past session)
    const isViewingHistory = state.currentView === 'chat-history' && state.viewingSession;
    const displayMessages = isViewingHistory ? (state.viewingSession.messages || []) : state.messages;

    // Show empty state if no exam is active and not viewing history
    if (!state.isExamActive && state.messages.length === 0 && !isViewingHistory) {
        return (
            <div className="central-area">
                <div className="welcome-card">
                    <div className="empty-state">
                        <div className="empty-icon">🎓</div>
                        <h3>No Active Examination</h3>
                        <p className="text-muted">
                            Upload a research paper first to begin your viva voce with Profesor.
                        </p>
                        <button
                            className="btn btn-primary"
                            style={{ marginTop: '1.5rem' }}
                            onClick={() => actions.setView('upload')}
                        >
                            Start New Exam
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-container animate-fade-in">
            {/* Header - Different for history view vs active exam */}
            {isViewingHistory ? (
                <div style={{
                    padding: 'var(--space-4)',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--color-bg-tertiary)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <button
                            className="back-btn"
                            onClick={() => {
                                actions.clearViewingSession();
                                actions.setView('dashboard');
                            }}
                        >
                            ← Back
                        </button>
                        <div>
                            <h3 style={{ fontSize: 'var(--text-base)', margin: 0 }}>
                                💬 Chat History
                            </h3>
                            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                                {state.viewingSession.paperTitle || 'Exam Session'}
                            </span>
                        </div>
                    </div>
                    <button
                        className="btn btn-secondary"
                        style={{ padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-sm)' }}
                        onClick={() => actions.viewSession(state.viewingSession.id, 'session-analytics')}
                    >
                        📊 View Analytics
                    </button>
                </div>
            ) : (
                <div style={{
                    padding: 'var(--space-4)',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                        <div style={{
                            width: '200px',
                            height: '6px',
                            background: 'var(--color-border)',
                            borderRadius: 'var(--radius-full)',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: `${progress}%`,
                                height: '100%',
                                background: 'var(--gradient-green)',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>
                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                            Question {questionNumber} of 5
                        </span>
                    </div>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        color: 'var(--color-accent)',
                        fontFamily: 'monospace'
                    }}>
                        ⏱️ {formatDuration(elapsedTime)}
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="chat-messages">
                {displayMessages.map((msg, idx) => (
                    <div key={idx} className={`message ${msg.type}`}>
                        <div className="message-avatar">
                            {msg.type === 'profesor' ? profesorAvatar : userAvatar}
                        </div>
                        <div className="message-content">
                            <p className="message-text">{msg.text}</p>
                            {msg.type === 'profesor' && (
                                <button
                                    className={`voice-btn tts-btn ${isPlaying && speakingMsgIdx === idx ? 'playing' : ''}`}
                                    onClick={() => handleSpeak(msg.text, idx)}
                                    title={isPlaying && speakingMsgIdx === idx ? 'Stop speaking' : 'Read aloud'}
                                >
                                    {isPlaying && speakingMsgIdx === idx ? '⏹️' : '🔊'}
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {/* Typing Indicator */}
                {state.isTyping && (
                    <div className="message profesor">
                        <div className="message-avatar">{profesorAvatar}</div>
                        <div className="message-content">
                            <div className="typing-indicator">
                                <span className="typing-dot"></span>
                                <span className="typing-dot"></span>
                                <span className="typing-dot"></span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area - Hide when viewing history */}
            {!isViewingHistory && (
                <div className="chat-input-container">
                    {/* Voice Settings Toggle */}
                    <div className="voice-controls-row">
                        <button
                            className={`voice-settings-toggle ${showVoiceSettings ? 'active' : ''}`}
                            onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                            title="Voice settings"
                        >
                            ⚙️ Voice
                        </button>
                        {speechError && (
                            <div className="voice-error" onClick={clearError}>
                                ⚠️ {speechError}
                            </div>
                        )}
                    </div>

                    {/* Voice Settings Panel */}
                    {showVoiceSettings && (
                        <div className="voice-settings-panel">
                            <div className="voice-setting">
                                <label>Voice:</label>
                                <select
                                    value={selectedVoice}
                                    onChange={(e) => changeVoice(e.target.value)}
                                >
                                    {voices.map((v) => (
                                        <option key={v.name} value={v.name}>
                                            {v.name} ({v.lang})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="voice-setting">
                                <label>Speed: {rate.toFixed(1)}x</label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="2"
                                    step="0.1"
                                    value={rate}
                                    onChange={(e) => changeRate(parseFloat(e.target.value))}
                                />
                            </div>
                            <div className="voice-setting">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={autoRead}
                                        onChange={toggleAutoRead}
                                    />
                                    Auto-read AI responses
                                </label>
                            </div>
                        </div>
                    )}

                    <form className="input-area" onSubmit={handleSubmit}>
                        <div className="input-icon">{profesorAvatar}</div>
                        <input
                            type="text"
                            className="input-field"
                            placeholder={isRecording ? 'Listening...' : isTranscribing ? 'Transcribing...' : 'Type or speak your answer...'}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isProcessing || showSummary || isRecording}
                        />
                        <div className="input-actions">
                            {sttAvailable && (
                                <button
                                    type="button"
                                    className={`voice-btn mic-btn ${isRecording ? 'recording' : ''} ${isTranscribing ? 'processing' : ''}`}
                                    onClick={handleMicClick}
                                    disabled={isProcessing || showSummary || isTranscribing}
                                    title={isRecording ? 'Stop recording' : 'Start voice input'}
                                >
                                    {isTranscribing ? '⏳' : isRecording ? '⏹️' : '🎤'}
                                </button>
                            )}
                        </div>
                        <button
                            type="submit"
                            className="send-btn"
                            disabled={!input.trim() || isProcessing || showSummary || isRecording}
                        >
                            →
                        </button>
                    </form>
                </div>
            )}

            {/* Exam Summary Modal */}
            {showSummary && (
                <ExamSummary
                    scores={state.scores}
                    duration={elapsedTime}
                    onViewDashboard={() => {
                        setShowSummary(false);
                        actions.setView('dashboard');
                    }}
                    onNewExam={() => {
                        setShowSummary(false);
                        setQuestionNumber(1);
                        actions.setView('upload');
                    }}
                />
            )}
        </div>
    );
}

function ExamSummary({ scores, duration, onViewDashboard, onNewExam }) {
    const avgScore = scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;

    return (
        <div className="exam-summary">
            <div className="summary-card">
                <div className="summary-icon">🏆</div>

                <h2>Examination Complete</h2>
                <p className="text-muted">Here's your performance summary:</p>

                <div className="summary-stats">
                    <div className="summary-stat">
                        <div className="summary-stat-value">{avgScore.toFixed(1)}</div>
                        <div className="summary-stat-label">Average</div>
                    </div>
                    <div className="summary-stat">
                        <div className="summary-stat-value">{maxScore}</div>
                        <div className="summary-stat-label">Best</div>
                    </div>
                    <div className="summary-stat">
                        <div className="summary-stat-value">{formatDuration(duration)}</div>
                        <div className="summary-stat-label">Duration</div>
                    </div>
                </div>

                <div className="summary-actions">
                    <button className="btn btn-secondary" onClick={onNewExam}>
                        New Exam
                    </button>
                    <button className="btn btn-primary" onClick={onViewDashboard}>
                        View Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}
