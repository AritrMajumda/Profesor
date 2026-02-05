import { createContext, useContext, useReducer, useEffect } from 'react';

// Initial State
const initialState = {
  // App State
  currentView: 'upload', // 'upload', 'exam', 'dashboard', 'session-analytics', 'chat-history'

  // Paper State
  paperContent: null,
  paperTitle: '',
  subject: '',

  // Exam State
  isExamActive: false,
  currentQuestion: 0,
  questions: [],
  answers: [],
  scores: [],
  feedback: [],
  currentExamStartTime: null,
  // NEW: Store question texts for detailed analytics
  questionTexts: [],

  // Messages for chat
  messages: [],
  isTyping: false,

  // Analytics
  sessions: [],
  totalQuestions: 0,
  totalScore: 0,
  subjectStats: {},

  // NEW: Currently viewing session (for history/analytics)
  viewingSession: null,
};

// Action Types
const ActionTypes = {
  SET_VIEW: 'SET_VIEW',
  SET_PAPER: 'SET_PAPER',
  CLEAR_PAPER: 'CLEAR_PAPER',
  START_EXAM: 'START_EXAM',
  END_EXAM: 'END_EXAM',
  ADD_MESSAGE: 'ADD_MESSAGE',
  SET_TYPING: 'SET_TYPING',
  SUBMIT_ANSWER: 'SUBMIT_ANSWER',
  NEXT_QUESTION: 'NEXT_QUESTION',
  UPDATE_ANALYTICS: 'UPDATE_ANALYTICS',
  LOAD_STATE: 'LOAD_STATE',
  // NEW: Session viewing
  VIEW_SESSION: 'VIEW_SESSION',
  CLEAR_VIEWING_SESSION: 'CLEAR_VIEWING_SESSION',
  // NEW: Store question text
  ADD_QUESTION_TEXT: 'ADD_QUESTION_TEXT',
  UPDATE_LAST_MESSAGE: 'UPDATE_LAST_MESSAGE',
};

// Helper: Generate first-person feedback
function generateFirstPersonFeedback(score, feedback) {
  if (!feedback) {
    if (score >= 8) return "You demonstrated excellent understanding of this topic.";
    if (score >= 6) return "You showed good knowledge with some areas for improvement.";
    if (score >= 4) return "You have a basic understanding but could expand your knowledge.";
    return "You may need to review this topic more thoroughly.";
  }

  // Convert third-person feedback to first-person
  let firstPerson = feedback
    .replace(/The student/gi, 'You')
    .replace(/the student/gi, 'you')
    .replace(/Student/gi, 'You')
    .replace(/student/gi, 'you')
    .replace(/They have/gi, 'You have')
    .replace(/they have/gi, 'you have')
    .replace(/Their/gi, 'Your')
    .replace(/their/gi, 'your')
    .replace(/They/gi, 'You')
    .replace(/they/gi, 'you');

  // Add score-based prefix
  if (score >= 8) {
    firstPerson = "Great job! " + firstPerson;
  } else if (score >= 6) {
    firstPerson = "Good effort! " + firstPerson;
  } else if (score >= 4) {
    firstPerson = "Keep practicing! " + firstPerson;
  } else {
    firstPerson = "Don't give up! " + firstPerson;
  }

  return firstPerson;
}

// Reducer
function appReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_VIEW:
      return { ...state, currentView: action.payload };

    case ActionTypes.SET_PAPER:
      return {
        ...state,
        paperContent: action.payload.content,
        paperTitle: action.payload.title,
        subject: action.payload.subject || '',
      };

    case ActionTypes.CLEAR_PAPER:
      return {
        ...state,
        paperContent: null,
        paperTitle: '',
        subject: '',
      };

    case ActionTypes.START_EXAM:
      return {
        ...state,
        isExamActive: true,
        currentQuestion: 0,
        questions: action.payload.questions,
        answers: [],
        scores: [],
        feedback: [],
        questionTexts: [], // Reset question texts
        messages: [{
          type: 'profesor',
          text: action.payload.greeting,
          timestamp: Date.now(),
        }],
        currentExamStartTime: Date.now(),
        currentView: 'exam',
        viewingSession: null, // Clear any viewing session
      };

    case ActionTypes.ADD_MESSAGE:
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };

    case ActionTypes.UPDATE_LAST_MESSAGE: {
      const newMessages = [...state.messages];
      if (newMessages.length > 0) {
        newMessages[newMessages.length - 1] = {
          ...newMessages[newMessages.length - 1],
          text: action.payload
        };
      }
      return { ...state, messages: newMessages };
    }

    case ActionTypes.SET_TYPING:
      return { ...state, isTyping: action.payload };

    case ActionTypes.SUBMIT_ANSWER:
      return {
        ...state,
        answers: [...state.answers, action.payload.answer],
        scores: [...state.scores, action.payload.score],
        feedback: [...state.feedback, action.payload.feedback],
      };

    case ActionTypes.NEXT_QUESTION:
      return {
        ...state,
        currentQuestion: state.currentQuestion + 1,
      };

    case ActionTypes.END_EXAM: {
      const avgScore = state.scores.length > 0
        ? state.scores.reduce((a, b) => a + b, 0) / state.scores.length
        : 0;

      // Build detailed question data with first-person feedback
      const questionData = state.scores.map((score, idx) => ({
        questionText: state.questionTexts[idx] || `Question ${idx + 1}`,
        answerText: state.answers[idx] || '',
        score: score,
        feedback: state.feedback[idx] || '',
        firstPersonFeedback: generateFirstPersonFeedback(score, state.feedback[idx]),
      }));

      const newSession = {
        id: Date.now(),
        subject: state.subject || 'General',
        paperTitle: state.paperTitle,
        date: new Date().toISOString(),
        questionsAsked: state.scores.length,
        totalScore: avgScore,
        duration: Date.now() - state.currentExamStartTime,
        // Store full chat for replay
        messages: [...state.messages],
        // Store detailed question data
        questionData: questionData,
      };

      const newSessions = [newSession, ...state.sessions];
      const newTotalQuestions = state.totalQuestions + state.scores.length;
      const newTotalScore = (state.totalScore * state.totalQuestions + avgScore * state.scores.length) / (newTotalQuestions || 1);

      // Update subject stats
      const subjectStats = { ...state.subjectStats };
      const subj = state.subject || 'General';
      if (!subjectStats[subj]) {
        subjectStats[subj] = { count: 0, totalScore: 0 };
      }
      subjectStats[subj].count += 1;
      subjectStats[subj].totalScore = ((subjectStats[subj].totalScore * (subjectStats[subj].count - 1)) + avgScore) / subjectStats[subj].count;

      return {
        ...state,
        isExamActive: false,
        sessions: newSessions,
        totalQuestions: newTotalQuestions,
        totalScore: newTotalScore,
        subjectStats,
      };
    }

    case ActionTypes.VIEW_SESSION: {
      const session = state.sessions.find(s => s.id === action.payload.sessionId);
      return {
        ...state,
        viewingSession: session || null,
        currentView: action.payload.viewType, // 'chat-history' or 'session-analytics'
      };
    }

    case ActionTypes.CLEAR_VIEWING_SESSION:
      return {
        ...state,
        viewingSession: null,
      };

    case ActionTypes.ADD_QUESTION_TEXT:
      return {
        ...state,
        questionTexts: [...state.questionTexts, action.payload],
      };

    case ActionTypes.LOAD_STATE:
      return { ...state, ...action.payload };

    default:
      return state;
  }
}

// Context
const AppContext = createContext(null);

// Provider Component
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('profesor-state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        dispatch({
          type: ActionTypes.LOAD_STATE,
          payload: {
            sessions: parsed.sessions || [],
            totalQuestions: parsed.totalQuestions || 0,
            totalScore: parsed.totalScore || 0,
            subjectStats: parsed.subjectStats || {},

            // Restore Active Exam State
            isExamActive: parsed.isExamActive || false,
            currentView: parsed.currentView || 'upload',
            paperContent: parsed.paperContent || null,
            paperTitle: parsed.paperTitle || '',
            subject: parsed.subject || '',

            currentQuestion: parsed.currentQuestion || 0,
            questions: parsed.questions || [],
            answers: parsed.answers || [],
            scores: parsed.scores || [],
            feedback: parsed.feedback || [],
            questionTexts: parsed.questionTexts || [],
            messages: parsed.messages || [],
            currentExamStartTime: parsed.currentExamStartTime || null,
          },
        });
      } catch (e) {
        console.error('Failed to load saved state:', e);
      }
    }
  }, []);

  // Save state to localStorage when significant changes occur
  useEffect(() => {
    const toSave = {
      // Analytics & History
      sessions: state.sessions,
      totalQuestions: state.totalQuestions,
      totalScore: state.totalScore,
      subjectStats: state.subjectStats,

      // Active Exam State (Persistence)
      isExamActive: state.isExamActive,
      currentView: state.currentView,
      paperContent: state.paperContent,
      paperTitle: state.paperTitle,
      subject: state.subject,

      currentQuestion: state.currentQuestion,
      questions: state.questions,
      answers: state.answers,
      scores: state.scores,
      feedback: state.feedback,
      questionTexts: state.questionTexts,
      messages: state.messages,
      currentExamStartTime: state.currentExamStartTime,
    };
    localStorage.setItem('profesor-state', JSON.stringify(toSave));
  }, [
    state.sessions, state.totalQuestions, state.totalScore, state.subjectStats,
    state.isExamActive, state.messages, state.currentQuestion, state.currentView
  ]);

  // Action creators
  const actions = {
    setView: (view) => dispatch({ type: ActionTypes.SET_VIEW, payload: view }),

    setPaper: (content, title, subject) => dispatch({
      type: ActionTypes.SET_PAPER,
      payload: { content, title, subject },
    }),

    clearPaper: () => dispatch({ type: ActionTypes.CLEAR_PAPER }),

    startExam: (questions, greeting) => dispatch({
      type: ActionTypes.START_EXAM,
      payload: { questions, greeting },
    }),

    startExamWithGreeting: (greeting) => dispatch({
      type: ActionTypes.START_EXAM,
      payload: { questions: [], greeting },
    }),

    addMessage: (type, text) => dispatch({
      type: ActionTypes.ADD_MESSAGE,
      payload: { type, text, timestamp: Date.now() },
    }),

    // NEW: Update the text of the most recent message (for streaming)
    updateLastMessage: (text) => dispatch({
      type: ActionTypes.UPDATE_LAST_MESSAGE,
      payload: text
    }),

    setTyping: (isTyping) => dispatch({
      type: ActionTypes.SET_TYPING,
      payload: isTyping,
    }),

    submitAnswer: (answer, score, feedback) => dispatch({
      type: ActionTypes.SUBMIT_ANSWER,
      payload: { answer, score, feedback },
    }),

    nextQuestion: () => dispatch({ type: ActionTypes.NEXT_QUESTION }),

    endExam: () => dispatch({ type: ActionTypes.END_EXAM }),

    // NEW: View a past session
    viewSession: (sessionId, viewType = 'chat-history') => dispatch({
      type: ActionTypes.VIEW_SESSION,
      payload: { sessionId, viewType },
    }),

    // NEW: Clear viewing session
    clearViewingSession: () => dispatch({ type: ActionTypes.CLEAR_VIEWING_SESSION }),

    // NEW: Store question text for analytics
    addQuestionText: (questionText) => dispatch({
      type: ActionTypes.ADD_QUESTION_TEXT,
      payload: questionText,
    }),
  };

  return (
    <AppContext.Provider value={{ state, actions }}>
      {children}
    </AppContext.Provider>
  );
}

// Custom hook
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
