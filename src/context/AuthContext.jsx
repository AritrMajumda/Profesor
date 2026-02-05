import { createContext, useContext, useReducer, useEffect } from 'react';

// Initial State
const initialState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
};

// Action Types
const ActionTypes = {
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    REGISTER: 'REGISTER',
    SET_LOADING: 'SET_LOADING',
    LOAD_USER: 'LOAD_USER',
};

// Reducer
function authReducer(state, action) {
    switch (action.type) {
        case ActionTypes.LOGIN:
        case ActionTypes.REGISTER:
            return {
                ...state,
                user: action.payload,
                isAuthenticated: true,
                isLoading: false,
            };

        case ActionTypes.LOGOUT:
            return {
                ...state,
                user: null,
                isAuthenticated: false,
                isLoading: false,
            };

        case ActionTypes.SET_LOADING:
            return { ...state, isLoading: action.payload };

        case ActionTypes.LOAD_USER:
            return {
                ...state,
                user: action.payload,
                isAuthenticated: !!action.payload,
                isLoading: false,
            };

        default:
            return state;
    }
}

// Context
const AuthContext = createContext(null);

// Provider Component
export function AuthProvider({ children }) {
    const [state, dispatch] = useReducer(authReducer, initialState);

    // Load user from localStorage on mount
    useEffect(() => {
        const savedUser = localStorage.getItem('profesor-user');
        if (savedUser) {
            try {
                const user = JSON.parse(savedUser);
                dispatch({ type: ActionTypes.LOAD_USER, payload: user });
            } catch (e) {
                console.error('Failed to load user:', e);
                localStorage.removeItem('profesor-user'); // Clear invalid data
                dispatch({ type: ActionTypes.SET_LOADING, payload: false });
            }
        } else {
            dispatch({ type: ActionTypes.SET_LOADING, payload: false });
        }
    }, []);

    // Save user to localStorage when it changes
    useEffect(() => {
        if (state.user) {
            localStorage.setItem('profesor-user', JSON.stringify(state.user));
        }
    }, [state.user]);

    // Action creators
    const actions = {
        login: (email, password) => {
            // Get registered users from localStorage
            const users = JSON.parse(localStorage.getItem('profesor-users') || '[]');
            const user = users.find(u => u.email === email);

            if (!user) {
                throw new Error('User not found. Please register first.');
            }

            if (user.password !== password) {
                throw new Error('Invalid password.');
            }

            const { password: _, ...userWithoutPassword } = user;
            dispatch({ type: ActionTypes.LOGIN, payload: userWithoutPassword });
            return userWithoutPassword;
        },

        register: (name, email, password) => {
            // Get existing users
            const users = JSON.parse(localStorage.getItem('profesor-users') || '[]');

            // Check if email already exists
            if (users.some(u => u.email === email)) {
                throw new Error('Email already registered. Please login.');
            }

            // Create new user
            const newUser = {
                id: Date.now().toString(),
                name,
                email,
                password,
                createdAt: new Date().toISOString(),
                avatar: name.charAt(0).toUpperCase(),
            };

            // Save to users list
            users.push(newUser);
            localStorage.setItem('profesor-users', JSON.stringify(users));

            // Login the new user
            const { password: _, ...userWithoutPassword } = newUser;
            dispatch({ type: ActionTypes.REGISTER, payload: userWithoutPassword });
            return userWithoutPassword;
        },

        logout: () => {
            localStorage.removeItem('profesor-user');
            dispatch({ type: ActionTypes.LOGOUT });
        },

        updateProfile: (updates) => {
            const updatedUser = { ...state.user, ...updates };
            dispatch({ type: ActionTypes.LOGIN, payload: updatedUser });

            // Also update in users list
            const users = JSON.parse(localStorage.getItem('profesor-users') || '[]');
            const idx = users.findIndex(u => u.id === updatedUser.id);
            if (idx >= 0) {
                users[idx] = { ...users[idx], ...updates };
                localStorage.setItem('profesor-users', JSON.stringify(users));
            }
        },
    };

    return (
        <AuthContext.Provider value={{ state, actions }}>
            {children}
        </AuthContext.Provider>
    );
}

// Custom hook
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
