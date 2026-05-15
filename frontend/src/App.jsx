import { Navigate, Route, Routes } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import AuthPage from './pages/AuthPage';
import ChatPage from './pages/ChatPage';
import { setAuthToken } from './utils/api';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('chat_token') || '');
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('chat_user') || 'null');
    } catch {
      return null;
    }
  });

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  const authenticated = Boolean(token && user);

  const authHandlers = useMemo(
    () => ({
      onAuthSuccess: (nextUser, nextToken) => {
        setUser(nextUser);
        setToken(nextToken);
      },
      onLogout: () => {
        localStorage.removeItem('chat_token');
        localStorage.removeItem('chat_user');
        localStorage.removeItem('lastReceivedAt');
        setToken('');
        setUser(null);
      }
    }),
    []
  );

  return (
    <Routes>
      <Route
        path="/login"
        element={authenticated ? <Navigate to="/chat" replace /> : <AuthPage mode="login" onAuthSuccess={authHandlers.onAuthSuccess} />}
      />
      <Route
        path="/register"
        element={authenticated ? <Navigate to="/chat" replace /> : <AuthPage mode="register" onAuthSuccess={authHandlers.onAuthSuccess} />}
      />
      <Route
        path="/chat"
        element={
          authenticated ? (
            <ChatPage user={user} token={token} onLogout={authHandlers.onLogout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to={authenticated ? '/chat' : '/login'} replace />} />
    </Routes>
  );
}

export default App;
