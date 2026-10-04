import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProjectDetails from './pages/ProjectDetails';
import TestReport from './pages/TestReport';
import API from './services/api';

const getToken = () => localStorage.getItem('token');

const ProtectedRoute = ({ children }) => {
  const token = getToken();
  return token ? children : <Navigate to="/login" replace />;
};

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await API.get('/auth/me');
        setUser(data.user);
      } catch (error) {
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    window.location.href = '/login';
  };

  if (loading) {
    return <div className="loading-text">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <nav className="topbar">
          <div className="brand">Visual Regression Testing System</div>
          <div className="nav-actions">
            {user ? (
              <>
                <span className="welcome-text">Welcome, {user.name}</span>
                <button className="link-button" onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <>
                <Link to="/login">Login</Link>
                <Link to="/register">Register</Link>
              </>
            )}
          </div>
        </nav>

        <Routes>
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <ProtectedRoute>
                <ProjectDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/:runId"
            element={
              <ProtectedRoute>
                <TestReport />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;
