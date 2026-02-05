import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthScreen() {
    const { actions } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (isLogin) {
                if (!formData.email || !formData.password) {
                    throw new Error('Please fill in all fields.');
                }
                await actions.login(formData.email, formData.password);
            } else {
                if (!formData.name || !formData.email || !formData.password) {
                    throw new Error('Please fill in all fields.');
                }
                if (formData.password !== formData.confirmPassword) {
                    throw new Error('Passwords do not match.');
                }
                if (formData.password.length < 6) {
                    throw new Error('Password must be at least 6 characters.');
                }
                await actions.register(formData.name, formData.email, formData.password);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setError('');
        setFormData({ name: '', email: '', password: '', confirmPassword: '' });
    };

    return (
        <div className="auth-screen">
            <div className="auth-bg"></div>

            <div className="auth-card animate-fade-in">
                <div className="auth-logo">
                    <div className="auth-logo-icon">🎓</div>
                    <span className="auth-logo-text">Profesor</span>
                </div>

                <h2 className="auth-title">
                    {isLogin ? 'Welcome back' : 'Create account'}
                </h2>
                <p className="auth-subtitle">
                    {isLogin
                        ? 'Sign in to continue your exam preparation'
                        : 'Start your journey with AI-powered viva voce'}
                </p>

                {error && (
                    <div className="auth-error animate-slide-up">
                        <span>⚠️</span> {error}
                    </div>
                )}

                <form className="auth-form" onSubmit={handleSubmit}>
                    {!isLogin && (
                        <div className="auth-field">
                            <label htmlFor="name">Full Name</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                className="auth-input"
                                placeholder="Enter your name"
                                value={formData.name}
                                onChange={handleChange}
                            />
                        </div>
                    )}

                    <div className="auth-field">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            className="auth-input"
                            placeholder="Enter your email"
                            value={formData.email}
                            onChange={handleChange}
                            autoComplete="username"
                        />
                    </div>

                    <div className="auth-field">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            className="auth-input"
                            placeholder="Enter your password"
                            value={formData.password}
                            onChange={handleChange}
                            autoComplete={isLogin ? "current-password" : "new-password"}
                        />
                    </div>

                    {!isLogin && (
                        <div className="auth-field">
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                className="auth-input"
                                placeholder="Confirm your password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                autoComplete="new-password"
                            />
                        </div>
                    )}

                    {isLogin && (
                        <div className="auth-forgot">
                            <a href="#" onClick={(e) => { e.preventDefault(); alert('Password reset coming soon!'); }}>
                                Forgot password?
                            </a>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="auth-submit-btn"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span className="auth-loading">Loading...</span>
                        ) : (
                            isLogin ? 'Sign In' : 'Create Account'
                        )}
                    </button>
                </form>

                <p className="auth-toggle">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button type="button" onClick={toggleMode}>
                        {isLogin ? 'Sign up' : 'Sign in'}
                    </button>
                </p>
            </div>
        </div>
    );
}
