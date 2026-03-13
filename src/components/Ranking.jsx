import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';

export default function Ranking({ user }) {
  const [rankings, setRankings] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadRankings();
  }, []);

  const loadRankings = async () => {
    const [athletesRes, progressRes] = await Promise.all([
      fetch(`${API_URL}/api/athletes`, { credentials: 'include' }),
      fetch(`${API_URL}/api/progress`, { credentials: 'include' })
    ]);
    
    const athletes = await athletesRes.json();
    const allProgress = await progressRes.json();
    
    const athleteScores = athletes.map(athlete => {
      const athleteProgress = allProgress.filter(p => p.athlete_id === athlete.id);
      const totalRunes = athleteProgress.reduce((sum, p) => sum + (p.rune_level || 0), 0);
      const skillCount = athleteProgress.filter(p => p.rune_level > 0).length;
      
      return {
        ...athlete,
        totalRunes,
        skillCount
      };
    });
    
    athleteScores.sort((a, b) => b.totalRunes - a.totalRunes);
    setRankings(athleteScores);
  };

  const getMedalEmoji = (position) => {
    if (position === 0) return '🥇';
    if (position === 1) return '🥈';
    if (position === 2) return '🥉';
    return `${position + 1}º`;
  };

  return (
    <div style={{ background: 'linear-gradient(180deg, #000 0%, #1e3a8a 100%)', minHeight: '100vh', color: '#fff', fontFamily: 'Cinzel, Georgia, serif', position: 'relative' }}>
      {/* Botões de navegação */}
      <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {user ? (
          <>
            <a href="/tree" title="Árvore de Skills" style={{ padding: '12px', background: 'linear-gradient(135deg, #60a5fa 0%, #93c5fd 100%)', border: '2px solid #2563eb', textDecoration: 'none', borderRadius: '50%', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', backdropFilter: 'blur(10px)', boxShadow: '0 0 15px rgba(96,165,250,0.4)' }}>
              <img src="/tree-icon.png" alt="Árvore" style={{ width: '24px', height: '24px' }} />
            </a>
            {user.isAdmin && <a href="/admin" title="Painel Admin" style={{ padding: '12px', background: 'rgba(30,58,138,0.9)', border: '2px solid #2563eb', color: '#60a5fa', textDecoration: 'none', borderRadius: '50%', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', backdropFilter: 'blur(10px)' }}>⚙️</a>}
            <button onClick={() => {
              fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' })
                .then(() => window.location.reload());
            }} title="Sair" style={{ padding: '12px', background: 'rgba(220,38,38,0.9)', border: '2px solid #dc2626', color: '#fca5a5', cursor: 'pointer', borderRadius: '50%', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', backdropFilter: 'blur(10px)' }}>🚪</button>
          </>
        ) : (
          <a href={`${API_URL}/auth/google`} title="Entrar com Google" style={{ padding: '12px', background: '#fff', color: '#1e3a8a', textDecoration: 'none', borderRadius: '50%', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', boxShadow: '0 0 20px rgba(255,255,255,0.5)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </a>
        )}
      </div>

      <div style={{ padding: '0 20px 40px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {rankings.map((athlete, index) => (
            <div
              key={athlete.id}
              onClick={() => navigate(`/tree?athlete=${athlete.id}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                padding: '20px',
                background: index < 3 
                  ? `linear-gradient(135deg, rgba(255,215,0,${0.2 - index * 0.05}) 0%, rgba(30,58,138,0.3) 100%)`
                  : 'rgba(30,58,138,0.2)',
                border: index < 3 ? '3px solid #ffd700' : '2px solid #2563eb',
                borderRadius: '15px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: index < 3 ? '0 0 20px rgba(255,215,0,0.3)' : 'none'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(96,165,250,0.5)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = index < 3 ? '0 0 20px rgba(255,215,0,0.3)' : 'none';
              }}
            >
              <div style={{ 
                fontSize: '32px', 
                fontWeight: 'bold', 
                minWidth: '60px', 
                textAlign: 'center',
                color: index < 3 ? '#ffd700' : '#60a5fa'
              }}>
                {getMedalEmoji(index)}
              </div>
              
              <img 
                src={athlete.photo_path || (athlete.gender === 'M' ? '/viking.png' : '/valkyrie.png')} 
                alt={athlete.name} 
                style={{ 
                  width: '70px', 
                  height: '70px', 
                  borderRadius: '50%', 
                  objectFit: 'cover', 
                  border: index < 3 ? '3px solid #ffd700' : '3px solid #2563eb',
                  boxShadow: index < 3 ? '0 0 15px rgba(255,215,0,0.5)' : 'none'
                }} 
              />
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ 
                  color: index < 3 ? '#ffd700' : '#60a5fa', 
                  fontSize: '20px', 
                  margin: '0 0 5px 0',
                  textShadow: index < 3 ? '0 0 10px rgba(255,215,0,0.5)' : 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {athlete.name}
                </h3>
                <p style={{ color: '#93c5fd', fontSize: '14px', margin: 0 }}>
                  {athlete.skillCount} skills
                </p>
              </div>
              
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ 
                  fontSize: '28px', 
                  fontWeight: 'bold', 
                  color: index < 3 ? '#ffd700' : '#60a5fa',
                  textShadow: index < 3 ? '0 0 10px rgba(255,215,0,0.5)' : 'none',
                  whiteSpace: 'nowrap'
                }}>
                  {athlete.totalRunes}
                </div>
                <div style={{ fontSize: '12px', color: '#93c5fd', whiteSpace: 'nowrap' }}>runas</div>
              </div>
            </div>
          ))}
        </div>
        
        {rankings.length === 0 && (
          <div style={{ textAlign: 'center', color: '#60a5fa', fontSize: '18px', marginTop: '40px' }}>
            Nenhum atleta cadastrado ainda
          </div>
        )}
      </div>
    </div>
  );
}
