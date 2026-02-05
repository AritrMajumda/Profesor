import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { generateQuestions, profesorResponses } from '../utils/profesor';

export default function UploadSection() {
    const { state, actions } = useApp();
    const [isDragOver, setIsDragOver] = useState(false);
    const [subject, setSubject] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef(null);

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

        // For demo purposes, we'll read the file as text
        // In production, you'd use pdf.js for PDF parsing
        try {
            let content = '';
            let title = file.name.replace(/\.[^/.]+$/, '');

            if (file.type === 'application/pdf') {
                // Simulate PDF processing
                content = await simulatePDFExtraction(file);
            } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
                content = await file.text();
            } else {
                // Try to read as text anyway
                content = await file.text();
            }

            // Set paper in state
            actions.setPaper(content, title, subject);
        } catch (error) {
            console.error('Error processing file:', error);
            // Fallback: create demo content
            actions.setPaper(
                getDemoContent(),
                file.name.replace(/\.[^/.]+$/, ''),
                subject
            );
        } finally {
            setIsLoading(false);
        }
    };

    const simulatePDFExtraction = async (file) => {
        // In a real implementation, use pdf.js
        // For demo, return the demo content
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(getDemoContent());
            }, 1000);
        });
    };

    const getDemoContent = () => {
        return `
    Abstract: This research paper presents a comprehensive analysis of Machine Learning approaches 
    for Natural Language Processing tasks. The methodology employs Transformer-based architectures 
    with attention mechanisms to improve semantic understanding.
    
    Introduction: Recent advances in Deep Learning have revolutionized the field of NLP. 
    Our approach utilizes BERT-based models fine-tuned on domain-specific datasets. 
    The hypothesis suggests that contextual embeddings outperform traditional word vectors.
    
    Methodology: We conducted experiments using the Stanford Sentiment Analysis dataset. 
    The model architecture consists of 12 transformer layers with multi-head attention. 
    Training was performed using AdamW optimizer with learning rate scheduling.
    
    Results: Our findings demonstrate significant improvements in accuracy metrics. 
    The F1 score increased by 15% compared to baseline models. Cross-validation 
    confirmed the robustness of our approach across different domains.
    
    Discussion: The implications of these results suggest that pre-trained models 
    can effectively transfer knowledge to specialized tasks. However, computational 
    requirements remain a limiting factor for real-world deployment.
    
    Conclusion: This research contributes to the growing body of evidence supporting 
    transfer learning in NLP. Future work should explore model compression techniques 
    to address efficiency concerns while maintaining performance.
    `;
    };

    const handleStartExam = () => {
        if (!state.paperContent) return;

        // Update subject if changed
        if (subject !== state.subject) {
            actions.setPaper(state.paperContent, state.paperTitle, subject);
        }

        // Generate questions from paper content
        const questions = generateQuestions(state.paperContent, 5);
        const greeting = profesorResponses.greeting(state.paperTitle);

        // Start exam
        actions.startExam(questions, greeting);
    };

    const handleRemoveFile = () => {
        actions.clearPaper();
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <section className="upload-section animate-fade-in">
            {/* Hero */}
            <div className="hero">
                <span className="hero-badge">
                    ✨ AI-Powered Examination
                </span>
                <h1>
                    Test Your Understanding with <span>Profesor</span>
                </h1>
                <p className="hero-subtitle">
                    Upload your research paper and face rigorous questioning from our AI examiner.
                    Get scored on your deep comprehension.
                </p>
            </div>

            {/* Upload Zone */}
            <div
                className={`upload-zone glass-card ${isDragOver ? 'drag-over' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    className="upload-input"
                    accept=".pdf,.txt,.doc,.docx"
                    onChange={handleFileSelect}
                />

                {isLoading ? (
                    <>
                        <div className="upload-icon animate-spin">⏳</div>
                        <h3>Processing your paper...</h3>
                        <p className="text-muted">Extracting content for examination</p>
                    </>
                ) : (
                    <>
                        <div className="upload-icon">📄</div>
                        <h3>Drop your research paper here</h3>
                        <p className="text-muted">
                            or click to browse • Supports PDF, TXT, DOC
                        </p>
                    </>
                )}
            </div>

            {/* File Preview */}
            {state.paperContent && (
                <div className="file-preview animate-slide-up">
                    <div className="file-preview-icon">✓</div>
                    <div className="file-preview-info">
                        <div className="file-preview-name">{state.paperTitle}</div>
                        <div className="file-preview-size">
                            {Math.round(state.paperContent.length / 1000)}KB • Ready for examination
                        </div>
                    </div>
                    <button className="file-preview-remove" onClick={handleRemoveFile}>
                        ✕
                    </button>
                </div>
            )}

            {/* Subject Input */}
            {state.paperContent && (
                <div className="subject-input-wrapper animate-slide-up stagger-1">
                    <label htmlFor="subject">Subject / Topic (optional)</label>
                    <input
                        id="subject"
                        type="text"
                        className="input"
                        placeholder="e.g., Machine Learning, Biology, Economics..."
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                    />
                </div>
            )}

            {/* Start Button */}
            {state.paperContent && (
                <div className="start-btn-wrapper animate-slide-up stagger-2">
                    <button className="btn btn-primary btn-lg" onClick={handleStartExam}>
                        🎯 Begin Viva Examination
                    </button>
                </div>
            )}
        </section>
    );
}
