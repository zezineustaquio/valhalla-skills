import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import SkillTree from './components/SkillTree';
import Admin from './components/Admin';
import Ranking from './components/Ranking';
import { API_URL } from './config';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/auth/user`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => setUser(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ 
        background: 'linear-gradient(180deg, #000 0%, #1e3a8a 100%)', 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#fff',
        fontSize: '24px'
      }}>
        ⏳ Carregando...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Ranking user={user} />} />
        <Route path="/tree" element={<SkillTree user={user} />} />
        <Route path="/admin" element={user?.isAdmin ? <Admin user={user} /> : <Ranking user={user} />} />
      </Routes>
    </BrowserRouter>
  );
}

