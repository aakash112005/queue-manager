import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import QueueView from './pages/QueueView.jsx';
import Analytics from './pages/Analytics.jsx';
import { api, getToken, setToken } from './api';

function Shell({ manager, onLogout, children }) {
  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          Queue Manager
        </div>
        <nav className="nav-tabs">
          <NavLink to="/queues" className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}>
            Queues
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}>
            Analytics
          </NavLink>
        </nav>
        <div className="topbar-right">
          <span>{manager?.username}</span>
          <button className="btn ghost small" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </div>
      <div className="main">{children}</div>
    </div>
  );
}

export default function App() {
  const [manager, setManager] = useState(undefined); // undefined = checking, null = signed out
  const navigate = useNavigate();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setManager(null);
      return;
    }
    api
      .me()
      .then((d) => setManager(d.manager))
      .catch(() => {
        setToken(null);
        setManager(null);
      });
  }, []);

  function handleLogout() {
    setToken(null);
    setManager(null);
    navigate('/login');
  }

  if (manager === undefined) {
    return <div className="loading-line">Loading…</div>;
  }

  if (!manager) {
    return (
      <Routes>
        <Route path="*" element={<Login onAuthed={setManager} />} />
      </Routes>
    );
  }

  return (
    <Shell manager={manager} onLogout={handleLogout}>
      <Routes>
        <Route path="/queues" element={<Dashboard />} />
        <Route path="/queues/:id" element={<QueueView />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="*" element={<Navigate to="/queues" replace />} />
      </Routes>
    </Shell>
  );
}
