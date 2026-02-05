import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { startExamination } from '../utils/gemini';
import { extractTextFromPDF, extractTextFromFile } from '../utils/pdfParser';
import { processDocument, isDocumentLoaded } from '../utils/rag';
import { useSpeech } from '../utils/speechUtils';

export default function WelcomeCard() {
    const { state, actions } = useApp();
    const { isMoneyHeist } = useTheme();
    const [activeTab, setActiveTab] = useState('All');
    const [inputValue, setInputValue] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState('');
    const [processingProgress, setProcessingProgress] = useState(null);
    const fileInputRef = useRef(null);

    // Speech hook for voice input
    const {
        startRecording, stopRecording, isRecording, isProcessing: isTranscribing,
        setTranscriptHandler, sttAvailable, error: speechError, clearError
    } = useSpeech();

    // Setup transcript handler
    useEffect(() => {
        setTranscriptHandler((transcript) => {
            setInputValue(prev => prev ? `${prev} ${transcript}` : transcript);
        });
    }, [setTranscriptHandler]);

    // Auto-load removed per user request
    // useEffect(() => { ... }, []);

    // Handle mic button
    const handleMicClick = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const tabs = ['All', 'Text', 'Image', 'Video', 'Music', 'Analytics'];

    const features = [
        {
            id: 1,
            icon: '📄',
            title: 'Upload Papers',
            desc: 'Upload research papers for AI-powered viva examination.',
        },
        {
            id: 2,
            icon: '🧠',
            title: 'RAG-Powered',
            desc: 'AI uses semantic search to find relevant sections.',
        },
        {
            id: 3,
            icon: '📊',
            title: 'Track Progress',
            desc: 'Monitor your performance across subjects.',
        },
    ];

    // Theme-aware values
    const welcomeTitle = isMoneyHeist
        ? 'Welcome to La Casa de Papel'
        : 'How can I help you today?';
    const welcomeSubtitle = isMoneyHeist
        ? 'Upload your heist plans. The Professor will examine your knowledge and prepare you for the mission.'
        : 'Upload a research paper. The AI will build a knowledge base and ask specific questions about your content.';

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) processFile(file);
    };

    const processFile = async (file) => {
        setIsLoading(true);
        setLoadingStatus('Clearing previous data...');
        setProcessingProgress(null);

        // Clear previous state first
        actions.clearPaper();

        try {
            let content = '';
            let title = file.name.replace(/\.[^/.]+$/, '');

            setLoadingStatus('Extracting text from document...');

            // Extract text based on file type
            if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                content = await extractTextFromPDF(file);
            } else {
                content = await extractTextFromFile(file);
            }

            console.log('Extracted content length:', content.length);
            console.log('Document title:', title);

            if (!content || content.trim().length < 100) {
                throw new Error('Could not extract sufficient text from file. Please ensure the file contains readable text.');
            }

            // Save paper content (this is the NEW document only)
            actions.setPaper(content, title, '');

            // Process document with RAG - this clears previous chunks first
            setLoadingStatus('Building knowledge base for this document...');

            const chunkCount = await processDocument(content, title, (progress) => {
                setProcessingProgress(progress);
                setLoadingStatus(progress.status);
            });

            console.log(`RAG processing complete: ${chunkCount} chunks indexed for "${title}"`);

            // Start the AI examination with fresh content
            await beginExamination(content, title);
        } catch (error) {
            console.error('Error processing file:', error);
            alert('Error processing file: ' + error.message);
            setIsLoading(false);
            setLoadingStatus('');
            setProcessingProgress(null);
        }
    };

    const beginExamination = async (content, title) => {
        setLoadingStatus('AI is preparing your examination...');

        try {
            // Get Profesor's greeting and first question using RAG context
            const greeting = await startExamination(content, title);

            console.log('AI Greeting:', greeting);

            // Start the exam with the AI-generated greeting/question
            actions.startExamWithGreeting(greeting);
        } catch (error) {
            console.error('Error starting exam:', error);
            alert('Error starting examination. Please check your API key and try again.');
        } finally {
            setIsLoading(false);
            setLoadingStatus('');
            setProcessingProgress(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        setIsLoading(true);
        setLoadingStatus('Preparing topic-based examination...');

        try {
            const topicContent = `
Research Topic: ${inputValue}

The student wants to be examined on the topic of "${inputValue}".

Key areas to cover:
- Core concepts and definitions related to ${inputValue}
- Key theories, models, or frameworks in ${inputValue}
- Current research and developments in ${inputValue}
- Practical applications of ${inputValue}
- Challenges and future directions in ${inputValue}
- Real-world examples and case studies

Ask specific, probing questions that test deep understanding of ${inputValue}.
`;

            const title = inputValue.trim();
            actions.setPaper(topicContent, title, inputValue);

            // Process with RAG
            await processDocument(topicContent, title, (progress) => {
                setLoadingStatus(progress.status);
            });

            await beginExamination(topicContent, title);
            setInputValue('');
        } catch (error) {
            console.error('Error:', error);
            alert('Error starting examination: ' + error.message);
        } finally {
            setIsLoading(false);
            setLoadingStatus('');
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div
            className={`welcome-card animate-fade-in ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                accept=".pdf,.txt,.doc,.docx"
                onChange={handleFileSelect}
            />

            <div className="welcome-icon">{isMoneyHeist ? '' : '🎓'}</div>

            <h2 className="welcome-title">{welcomeTitle}</h2>

            <p className="welcome-subtitle">
                {welcomeSubtitle}
            </p>



            {/* Tab Filters */}
            <div className="tab-filters">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        className={`tab-filter ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Input Area */}
            {speechError && (
                <div className="voice-error" onClick={clearError} style={{ marginBottom: '0.5rem', textAlign: 'center' }}>
                    ⚠️ {speechError}
                </div>
            )}
            <form className="input-area" onSubmit={handleSubmit}>
                <div className="input-icon">{isMoneyHeist ? '' : '🎓'}</div>
                <input
                    type="text"
                    className="input-field"
                    placeholder={
                        isRecording ? 'Listening...' :
                            isTranscribing ? 'Transcribing...' :
                                isMoneyHeist ? 'Enter your mission briefing...' :
                                    'Type your topic, speak, or drop a file...'
                    }
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={isLoading || isRecording}
                />
                <div className="input-actions">
                    {sttAvailable && (
                        <button
                            type="button"
                            className={`voice-btn mic-btn ${isRecording ? 'recording' : ''} ${isTranscribing ? 'processing' : ''}`}
                            onClick={handleMicClick}
                            disabled={isLoading || isTranscribing}
                            title={isRecording ? 'Stop recording' : 'Start voice input'}
                        >
                            {isTranscribing ? '⏳' : isRecording ? '⏹️' : '🎤'}
                        </button>
                    )}
                    <button
                        type="button"
                        className="input-action-btn"
                        onClick={handleUploadClick}
                        title="Upload file"
                        disabled={isLoading}
                    >
                        📎
                    </button>
                </div>
                <button
                    type="submit"
                    className="send-btn"
                    disabled={!inputValue.trim() || isLoading || isRecording}
                >
                    →
                </button>
            </form>

            {isLoading && (
                <div className="loading-status" style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <p className="text-muted">{loadingStatus || 'Processing...'}</p>
                    {processingProgress && (
                        <div style={{
                            marginTop: '0.5rem',
                            width: '100%',
                            height: '4px',
                            background: 'var(--color-border)',
                            borderRadius: 'var(--radius-full)',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: `${(processingProgress.current / processingProgress.total) * 100}%`,
                                height: '100%',
                                background: 'var(--gradient-green)',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
