import './App.css';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AuthScreen from './components/AuthScreen';
import Sidebar from './components/Sidebar';
import MainHeader from './components/MainHeader';
import WelcomeCard from './components/WelcomeCard';
import ExamInterface from './components/ExamInterface';
import Dashboard from './components/Dashboard';
import SessionAnalytics from './components/SessionAnalytics';

function AppContent() {
  const { state } = useApp();
  const { state: authState } = useAuth();

  // Show loading state
  if (authState.isLoading) {
    return (
      <div className="auth-screen">
        <div className="auth-bg"></div>
        <div className="welcome-icon animate-pulse">🎓</div>
      </div>
    );
  }

  // Show auth screen if not authenticated
  if (!authState.isAuthenticated) {
    return <AuthScreen />;
  }

  const renderContent = () => {
    switch (state.currentView) {
      case 'exam':
        return <ExamInterface />;
      case 'chat-history':
        return <ExamInterface />;
      case 'session-analytics':
        return <SessionAnalytics />;
      case 'dashboard':
        return (
          <div className="dashboard animate-fade-in">
            <Dashboard />
          </div>
        );
      default:
        return (
          <div className="central-area">
            <WelcomeCard />
          </div>
        );
    }
  };

  return (
    <div className="app">
      <Sidebar />

      <main className="main-content">
        <MainHeader />
        {renderContent()}

        {state.currentView === 'upload' && (
          <footer className="main-footer">
            <p className="footer-text">
              Profesor can make mistakes. Consider verifying important information.
            </p>
          </footer>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
