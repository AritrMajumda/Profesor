/**
 * Speech Utilities for Profesor
 * - Text-to-Speech (TTS): Uses Web Speech API SpeechSynthesis
 * - Speech-to-Text (STT): Uses OpenAI Whisper API
 */

// ===== TEXT-TO-SPEECH (Web Speech API) =====

class TextToSpeech {
    constructor() {
        this.synth = window.speechSynthesis;
        this.utterance = null;
        this.voices = [];
        this.selectedVoice = null;
        this.rate = 1.0;
        this.pitch = 1.0;
        this.volume = 1.0;
        this.isPlaying = false;
        this.isPaused = false;
        this.autoRead = false;
        this.onStateChange = null;

        // Load voices
        this.loadVoices();
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => this.loadVoices();
        }
    }

    loadVoices() {
        this.voices = this.synth.getVoices();
        // Prefer English voices, fallback to first available
        const englishVoices = this.voices.filter(v => v.lang.startsWith('en'));
        this.selectedVoice = englishVoices[0] || this.voices[0] || null;
    }

    getVoices() {
        return this.voices;
    }

    setVoice(voiceName) {
        const voice = this.voices.find(v => v.name === voiceName);
        if (voice) {
            this.selectedVoice = voice;
        }
    }

    setRate(rate) {
        this.rate = Math.max(0.5, Math.min(2.0, rate));
    }

    setPitch(pitch) {
        this.pitch = Math.max(0.5, Math.min(2.0, pitch));
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    setAutoRead(enabled) {
        this.autoRead = enabled;
    }

    speak(text) {
        // Cancel any ongoing speech
        this.stop();

        if (!text || !this.synth) return;

        this.utterance = new SpeechSynthesisUtterance(text);
        this.utterance.voice = this.selectedVoice;
        this.utterance.rate = this.rate;
        this.utterance.pitch = this.pitch;
        this.utterance.volume = this.volume;

        this.utterance.onstart = () => {
            this.isPlaying = true;
            this.isPaused = false;
            this.onStateChange?.({ isPlaying: true, isPaused: false });
        };

        this.utterance.onend = () => {
            this.isPlaying = false;
            this.isPaused = false;
            this.onStateChange?.({ isPlaying: false, isPaused: false });
        };

        this.utterance.onerror = (event) => {
            console.error('TTS Error:', event.error);
            this.isPlaying = false;
            this.isPaused = false;
            this.onStateChange?.({ isPlaying: false, isPaused: false, error: event.error });
        };

        this.synth.speak(this.utterance);
    }

    pause() {
        if (this.synth && this.isPlaying) {
            this.synth.pause();
            this.isPaused = true;
            this.onStateChange?.({ isPlaying: true, isPaused: true });
        }
    }

    resume() {
        if (this.synth && this.isPaused) {
            this.synth.resume();
            this.isPaused = false;
            this.onStateChange?.({ isPlaying: true, isPaused: false });
        }
    }

    stop() {
        if (this.synth) {
            this.synth.cancel();
            this.isPlaying = false;
            this.isPaused = false;
            this.onStateChange?.({ isPlaying: false, isPaused: false });
        }
    }

    toggle() {
        if (this.isPaused) {
            this.resume();
        } else if (this.isPlaying) {
            this.pause();
        }
    }
}

// ===== SPEECH-TO-TEXT (Whisper API) =====

class SpeechToText {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.stream = null;
        this.onTranscript = null;
        this.onStateChange = null;
        this.onError = null;

        // Whisper API configuration - uses Groq's Whisper endpoint (fast & free tier available)
        // Fallback to OpenAI Whisper if Groq not available
        this.whisperEndpoint = null;
        this.apiKey = null;
        this.detectWhisperEndpoint();
    }

    detectWhisperEndpoint() {
        // Priority: Groq -> OpenAI -> Native Browser API
        const groqKey = import.meta.env.VITE_GROQ_API_KEY;
        const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;

        if (groqKey) {
            this.whisperEndpoint = 'https://api.groq.com/openai/v1/audio/transcriptions';
            this.apiKey = groqKey;
            this.model = 'whisper-large-v3';
            this.mode = 'api';
        } else if (openaiKey) {
            this.whisperEndpoint = 'https://api.openai.com/v1/audio/transcriptions';
            this.apiKey = openaiKey;
            this.model = 'whisper-1';
            this.mode = 'api';
        } else if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            console.log('Using native browser Speech Recognition');
            this.mode = 'native';
            this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';
        } else {
            console.warn('No STT provider found (No API keys and no browser support)');
        }
    }

    async checkMicrophonePermission() {
        try {
            const result = await navigator.permissions.query({ name: 'microphone' });
            return result.state;
        } catch {
            return 'prompt';
        }
    }

    async startRecording() {
        if (this.isRecording) return;

        if (!this.mode) {
            this.onError?.('Voice input not supported in this browser.');
            return;
        }

        if (this.mode === 'native') {
            this.startNativeRecording();
        } else {
            this.startApiRecording();
        }
    }

    startNativeRecording() {
        try {
            this.isRecording = true;
            this.onStateChange?.({ isRecording: true });

            this.recognition.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    this.onTranscript?.(finalTranscript);
                }
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                this.isRecording = false;
                this.onStateChange?.({ isRecording: false });
            };

            this.recognition.onend = () => {
                if (this.isRecording) {
                    // unexpected end, restart if supposed to be recording? 
                    // or just stop. simpler to stop.
                    this.isRecording = false;
                    this.onStateChange?.({ isRecording: false });
                }
            };

            this.recognition.start();
        } catch (e) {
            console.error(e);
            this.isRecording = false;
            this.onStateChange?.({ isRecording: false });
            this.onError?.('Could not start voice recognition');
        }
    }

    async startApiRecording() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000
                }
            });

            this.audioChunks = [];
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
            });

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = async () => {
                await this.processAudio();
            };

            this.mediaRecorder.start(100); // Collect data every 100ms
            this.isRecording = true;
            this.onStateChange?.({ isRecording: true });

        } catch (error) {
            console.error('Error starting recording:', error);
            this.onError?.(error.message || 'Failed to access microphone');
        }
    }

    async stopRecording() {
        if (!this.isRecording) return;

        this.isRecording = false;
        this.onStateChange?.({ isRecording: false, isProcessing: this.mode === 'api' }); // Native doesn't have processing step

        if (this.mode === 'native') {
            this.recognition.stop();
        } else if (this.mediaRecorder) {
            this.mediaRecorder.stop();
            // Stop all audio tracks
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
                this.stream = null;
            }
        }
    }

    async processAudio() {
        if (this.audioChunks.length === 0) {
            this.onStateChange?.({ isRecording: false, isProcessing: false });
            return;
        }

        try {
            const audioBlob = new Blob(this.audioChunks, {
                type: this.mediaRecorder?.mimeType || 'audio/webm'
            });

            // Create form data for Whisper API
            const formData = new FormData();
            formData.append('file', audioBlob, 'recording.webm');
            formData.append('model', this.model);
            formData.append('language', 'en');
            formData.append('response_format', 'json');

            const response = await fetch(this.whisperEndpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `Whisper API error: ${response.status}`);
            }

            const result = await response.json();
            const transcript = result.text?.trim() || '';

            if (transcript) {
                this.onTranscript?.(transcript);
            }

        } catch (error) {
            console.error('Error processing audio:', error);
            this.onError?.(error.message || 'Failed to transcribe audio');
        } finally {
            this.audioChunks = [];
            this.onStateChange?.({ isRecording: false, isProcessing: false });
        }
    }

    cancelRecording() {
        this.isRecording = false;

        if (this.mode === 'native' && this.recognition) {
            this.recognition.stop();
        } else {
            if (this.mediaRecorder) this.mediaRecorder.stop();
            this.audioChunks = [];
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
                this.stream = null;
            }
        }

        this.onStateChange?.({ isRecording: false, isProcessing: false });
    }

    isAvailable() {
        return !!this.mode; // Available if we implement 'native' or have API keys
    }
}

// ===== Singleton instances =====

let ttsInstance = null;
let sttInstance = null;

export function getTTS() {
    if (!ttsInstance) {
        ttsInstance = new TextToSpeech();
    }
    return ttsInstance;
}

export function getSTT() {
    if (!sttInstance) {
        sttInstance = new SpeechToText();
    }
    return sttInstance;
}

// ===== React Hook =====

import { useState, useEffect, useCallback } from 'react';

export function useSpeech() {
    const [ttsState, setTtsState] = useState({ isPlaying: false, isPaused: false });
    const [sttState, setSttState] = useState({ isRecording: false, isProcessing: false });
    const [voices, setVoices] = useState([]);
    const [selectedVoice, setSelectedVoice] = useState('');
    const [rate, setRate] = useState(1.0);
    const [autoRead, setAutoRead] = useState(false);
    const [error, setError] = useState(null);

    const tts = getTTS();
    const stt = getSTT();

    useEffect(() => {
        // Setup TTS callbacks
        tts.onStateChange = (state) => {
            setTtsState(state);
            if (state.error) setError(state.error);
        };

        // Load voices
        const loadVoices = () => {
            const availableVoices = tts.getVoices();
            setVoices(availableVoices);
            if (tts.selectedVoice) {
                setSelectedVoice(tts.selectedVoice.name);
            }
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;

        // Setup STT callbacks
        stt.onStateChange = setSttState;
        stt.onError = setError;

        return () => {
            tts.stop();
            stt.cancelRecording();
        };
    }, []);

    const speak = useCallback((text) => {
        setError(null);
        tts.speak(text);
    }, []);

    const pauseResume = useCallback(() => {
        tts.toggle();
    }, []);

    const stopSpeaking = useCallback(() => {
        tts.stop();
    }, []);

    const changeVoice = useCallback((voiceName) => {
        tts.setVoice(voiceName);
        setSelectedVoice(voiceName);
    }, []);

    const changeRate = useCallback((newRate) => {
        tts.setRate(newRate);
        setRate(newRate);
    }, []);

    const toggleAutoRead = useCallback(() => {
        const newValue = !autoRead;
        tts.setAutoRead(newValue);
        setAutoRead(newValue);
    }, [autoRead]);

    const startRecording = useCallback(async () => {
        setError(null);
        await stt.startRecording();
    }, []);

    const stopRecording = useCallback(async () => {
        await stt.stopRecording();
    }, []);

    const cancelRecording = useCallback(() => {
        stt.cancelRecording();
    }, []);

    const setTranscriptHandler = useCallback((handler) => {
        stt.onTranscript = handler;
    }, []);

    return {
        // TTS
        speak,
        pauseResume,
        stopSpeaking,
        isPlaying: ttsState.isPlaying,
        isPaused: ttsState.isPaused,
        voices,
        selectedVoice,
        changeVoice,
        rate,
        changeRate,
        autoRead,
        toggleAutoRead,

        // STT
        startRecording,
        stopRecording,
        cancelRecording,
        isRecording: sttState.isRecording,
        isProcessing: sttState.isProcessing,
        setTranscriptHandler,
        sttAvailable: stt.isAvailable(),

        // Common
        error,
        clearError: () => setError(null)
    };
}
