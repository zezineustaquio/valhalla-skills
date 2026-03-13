import { useState, useEffect } from 'react';
import { API_URL } from '../config';

export default function SkillTree({ user }) {
  const [skills, setSkills] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [showAthleteModal, setShowAthleteModal] = useState(false);
  const [skillProgress, setSkillProgress] = useState(new Map());
  const [selectedSkill, setSelectedSkill] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [skillsRes, athletesRes] = await Promise.all([
      fetch(`${API_URL}/api/skills`, { credentials: 'include' }),
      fetch(`${API_URL}/api/athletes`, { credentials: 'include' })
    ]);
    
    const skillsData = await skillsRes.json();
    const normalizedSkills = skillsData.map(skill => ({
      ...skill,
      nivel: Number(skill.nivel)
    }));
    setSkills(normalizedSkills);
    const athletesData = await athletesRes.json();
    setAthletes(athletesData);
    
    // Verificar se há parâmetro de atleta na URL
    const urlParams = new URLSearchParams(window.location.search);
    const athleteIdParam = urlParams.get('athlete');
    
    if (athleteIdParam) {
      const athlete = athletesData.find(a => a.id === parseInt(athleteIdParam));
      if (athlete) {
        setSelectedAthlete(athlete);
        loadProgress(athlete.id);
        return;
      }
    }
    
    // Se o usuário tem athleteId, seleciona automaticamente
    if (user?.athleteId) {
      const athlete = athletesData.find(a => a.id === user.athleteId);
      if (athlete) {
        setSelectedAthlete(athlete);
        loadProgress(athlete.id);
        return;
      }
    }
    
    // Caso contrário, seleciona o primeiro atleta
    if (athletesData.length > 0 && !selectedAthlete) {
      const firstAthlete = athletesData[0];
      setSelectedAthlete(firstAthlete);
      loadProgress(firstAthlete.id);
    }
  };

  const loadProgress = async (athleteId) => {
    const progressRes = await fetch(`${API_URL}/api/progress/${athleteId}`, { credentials: 'include' });
    const progress = await progressRes.json();
    const progressMap = new Map();
    progress.forEach(p => progressMap.set(p.skill_id, p.rune_level));
    setSkillProgress(progressMap);
  };

  const groupByLevel = () => {
    const levels = {};
    skills.forEach(skill => {
      const nivel = skill.nivel;
      if (!levels[nivel]) levels[nivel] = {};
      if (!levels[nivel][skill.categoria]) levels[nivel][skill.categoria] = [];
      levels[nivel][skill.categoria].push(skill);
    });
    return levels;
  };

  const getSkillState = (skill) => {
    const runeLevel = skillProgress.get(skill.id) || 0;
    if (runeLevel > 0) return 'unlocked';
    
    const deps = skill.prereq ? skill.prereq.split(';').map(d => d.trim()).filter(d => d) : [];
    const depsUnlocked = deps.length === 0 || deps.every(depName => {
      const depSkill = skills.find(s => s.name === depName);
      return depSkill && skillProgress.get(depSkill.id) > 0;
    });
    return depsUnlocked ? 'available' : 'locked';
  };

  const getRuneLevel = (skillId) => {
    return skillProgress.get(skillId) || 0;
  };

  const getRuneColor = (level) => {
    if (level === 0) return null;
    if (level === 1) return '#cd7f32'; // Bronze
    if (level === 2) return '#c0c0c0'; // Prata
    if (level === 3) return '#ffd700'; // Ouro
    return null;
  };

  useEffect(() => {
    if (skills.length > 0) {
      setTimeout(() => {
        drawConnections();
        scrollToAthlete();
      }, 300);
      window.addEventListener('resize', drawConnections);
      return () => window.removeEventListener('resize', drawConnections);
    }
  }, [skills, skillProgress]);

  const scrollToAthlete = () => {
    const athlete = document.querySelector('.athlete');
    if (athlete) {
      athlete.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
  };

  const drawConnections = () => {
    const svg = document.getElementById('connections-svg');
    if (!svg) return;
    
    svg.innerHTML = '';
    const container = document.querySelector('.tree-container');
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    
    skills.forEach(skill => {
      if (!skill.prereq) return;
      
      const deps = skill.prereq.split(';').map(d => d.trim()).filter(d => d);
      deps.forEach(depName => {
        const depSkill = skills.find(s => s.name === depName);
        if (!depSkill) return;
        
        const fromEl = document.getElementById(`skill-${depSkill.id}`);
        const toEl = document.getElementById(`skill-${skill.id}`);
        
        if (!fromEl || !toEl) return;
        
        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();
        
        const x1 = fromRect.left + fromRect.width / 2 - containerRect.left;
        const y1 = fromRect.top + fromRect.height / 2 - containerRect.top;
        const x2 = toRect.left + toRect.width / 2 - containerRect.left;
        const y2 = toRect.top + toRect.height / 2 - containerRect.top;
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        
        const isActive = skillProgress.get(depSkill.id) > 0 && skillProgress.get(skill.id) > 0;
        line.setAttribute('stroke', isActive ? '#2563eb' : '#333');
        line.setAttribute('stroke-width', isActive ? '3' : '2');
        line.setAttribute('opacity', isActive ? '0.8' : '0.3');
        
        svg.appendChild(line);
      });
    });
  };

  const unlockSkill = async (skill) => {
    console.log('Unlocking skill:', skill.id, 'for athlete:', selectedAthlete?.id);
    
    if (!user?.isAdmin) {
      alert('Apenas administradores podem editar o progresso');
      return;
    }
    
    if (!selectedAthlete) {
      alert('Selecione um atleta primeiro');
      return;
    }
    
    const currentLevel = getRuneLevel(skill.id);
    if (currentLevel >= 3) {
      alert('Skill já está no nível máximo (Ouro)');
      return;
    }
    
    const newLevel = currentLevel + 1;
    const newProgress = new Map(skillProgress);
    newProgress.set(skill.id, newLevel);
    setSkillProgress(newProgress);
    
    try {
      const response = await fetch(`${API_URL}/api/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          athlete_id: selectedAthlete.id, 
          skill_id: skill.id, 
          rune_level: newLevel
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Error response:', error);
      }
    } catch (error) {
      console.error('Erro ao salvar progresso:', error);
    }
    
    setSelectedSkill(null);
  };

  const downgradeSkill = async (skill) => {
    if (!user?.isAdmin) {
      alert('Apenas administradores podem editar o progresso');
      return;
    }
    
    if (!selectedAthlete) return;
    
    const currentLevel = getRuneLevel(skill.id);
    if (currentLevel === 0) return;
    
    // Verificar se há skills dependentes desbloqueadas
    const dependentSkills = skills.filter(s => {
      const deps = s.prereq ? s.prereq.split(';').map(d => d.trim()) : [];
      return deps.includes(skill.name) && getRuneLevel(s.id) > 0;
    });
    
    if (dependentSkills.length > 0 && currentLevel === 1) {
      alert(`Não é possível bloquear esta skill. As seguintes skills dependem dela: ${dependentSkills.map(s => s.name).join(', ')}`);
      return;
    }
    
    const newLevel = currentLevel - 1;
    const newProgress = new Map(skillProgress);
    if (newLevel === 0) {
      newProgress.delete(skill.id);
    } else {
      newProgress.set(skill.id, newLevel);
    }
    setSkillProgress(newProgress);
    
    try {
      await fetch(`${API_URL}/api/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          athlete_id: selectedAthlete.id, 
          skill_id: skill.id, 
          rune_level: newLevel
        })
      });
    } catch (error) {
      console.error('Erro ao salvar progresso:', error);
    }
    
    setSelectedSkill(null);
  };

  const getIcon = (categoria) => {
    const icons = { Fundamentos: '⬢', Tumbling: '◈', Jumps: '◊', Stunts: '◐', Partner: '◑', Pyramid: '◕' };
    return icons[categoria] || '◆';
  };

  const selectAthlete = (athlete) => {
    console.log('Selecting athlete:', athlete);
    setSelectedAthlete(athlete);
    setShowAthleteModal(false);
    loadProgress(athlete.id);
  };

  const levels = groupByLevel();
  const currentAthlete = selectedAthlete || athletes[0];

  return (
    <div style={{ background: 'linear-gradient(180deg, #000 0%, #1e3a8a 100%)', minHeight: '100vh', color: '#fff', fontFamily: 'Cinzel, Georgia, serif', position: 'relative' }}>
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>

      {/* Botões de navegação */}
      <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, display: 'flex', gap: '10px', background: 'rgba(0,0,0,0.8)', padding: '10px', borderRadius: '50px', border: '2px solid #2563eb', backdropFilter: 'blur(10px)' }}>
        {user ? (
          <>
            <a href="/" title="Ranking" style={{ padding: '12px', background: 'rgba(30,58,138,0.9)', border: '2px solid #2563eb', color: '#60a5fa', textDecoration: 'none', borderRadius: '50%', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px' }}>🏆</a>
            {user.isAdmin && <a href="/admin" title="Painel Admin" style={{ padding: '12px', background: 'rgba(30,58,138,0.9)', border: '2px solid #2563eb', color: '#60a5fa', textDecoration: 'none', borderRadius: '50%', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px' }}>⚙️</a>}
            <button onClick={() => {
              fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' })
                .then(() => window.location.href = '/');
            }} title="Sair" style={{ padding: '12px', background: 'rgba(220,38,38,0.9)', border: '2px solid #dc2626', color: '#fca5a5', cursor: 'pointer', borderRadius: '50%', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px' }}>🚪</button>
          </>
        ) : (
          <>
            <a href="/" title="Ranking" style={{ padding: '12px', background: 'rgba(30,58,138,0.9)', border: '2px solid #2563eb', color: '#60a5fa', textDecoration: 'none', borderRadius: '50%', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px' }}>🏆</a>
            <a href={`${API_URL}/auth/google`} title="Entrar com Google" style={{ padding: '12px', background: '#fff', color: '#1e3a8a', textDecoration: 'none', borderRadius: '50%', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', boxShadow: '0 0 20px rgba(255,255,255,0.5)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </a>
          </>
        )}
      </div>

      <div style={{ padding: '100px 10px 80px', display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end', position: 'relative', overflowX: 'auto' }}>
        <div className="tree-container" style={{ display: 'flex', flexDirection: 'column-reverse', alignItems: 'center', gap: '40px', padding: '20px', position: 'relative', width: 'max-content', margin: '0 auto' }}>
          
          <svg id="connections-svg" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0, overflow: 'visible' }}></svg>
          
          <div className="athlete" onClick={() => setShowAthleteModal(true)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', animation: 'bounce 2s infinite', cursor: 'pointer' }}>
            {currentAthlete ? (
              <>
                <img src={currentAthlete.photo_path || (currentAthlete.gender === 'M' ? '/viking.png' : '/valkyrie.png')} alt={currentAthlete.name} style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid #60a5fa', objectFit: 'cover' }} />
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#60a5fa', textShadow: '0 0 10px rgba(96,165,250,0.5)', textAlign: 'center' }}>{currentAthlete.name}</div>
              </>
            ) : (
              <>
                <img src="/viking.png" alt="Atleta" style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid #60a5fa', objectFit: 'cover' }} />
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#60a5fa', textShadow: '0 0 10px rgba(96,165,250,0.5)' }}>Atleta</div>
              </>
            )}
          </div>

          {Object.keys(levels).sort((a, b) => Number(a) - Number(b)).map(nivelStr => {
            const nivel = Number(nivelStr);
            return (
            <div key={nivel} style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: 'max-content', padding: '20px 10px', background: 'rgba(30,58,138,0.05)', borderRadius: '20px', border: '2px solid rgba(37,99,235,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', padding: '10px', background: 'linear-gradient(90deg, transparent, rgba(37,99,235,0.2), transparent)', borderRadius: '10px' }}>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#60a5fa', letterSpacing: '2px' }}>NÍVEL {nivel}</span>
                <span style={{ fontSize: '12px', color: '#93c5fd', fontStyle: 'italic' }}>
                  {['Habilidades fundamentais', 'Fundamentos básicos', 'Técnicas intermediárias', 'Movimentos avançados', 'Alta complexidade', 'Técnicas de elite', 'Maestria avançada', 'Nível profissional'][nivel]}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'nowrap' }}>
                {Object.keys(levels[nivelStr]).sort().map(categoria => (
                  <div key={categoria} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '10px', background: 'rgba(30,58,138,0.1)', borderRadius: '15px', border: '1px solid rgba(37,99,235,0.3)', minWidth: '100px', flexShrink: 0 }}>
                    <div style={{ fontSize: '11px', letterSpacing: '2px', fontWeight: 'bold', color: '#60a5fa', padding: '5px 10px', background: 'rgba(0,0,0,0.8)', borderRadius: '10px', border: '1px solid #2563eb' }}>{categoria}</div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      {levels[nivelStr][categoria].map(skill => {
                        const state = getSkillState(skill);
                        const runeLevel = getRuneLevel(skill.id);
                        const runeColor = getRuneColor(runeLevel);
                        return (
                          <div key={skill.id} id={`skill-${skill.id}`} style={{ position: 'relative' }}>
                            <div
                              onClick={() => setSelectedSkill(skill)}
                              title={skill.name}
                              style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '35px',
                                cursor: 'pointer',
                                border: '3px solid',
                                transition: 'all 0.3s',
                                background: state === 'unlocked' ? 'radial-gradient(circle, #2563eb 0%, #1e3a8a 100%)' : state === 'available' ? 'radial-gradient(circle, #1e3a8a 0%, #0a0a0a 100%)' : 'radial-gradient(circle, #1a1a1a 0%, #000 100%)',
                                borderColor: runeColor || (state === 'available' ? '#2563eb' : '#333'),
                                color: runeColor || (state === 'unlocked' ? '#fff' : state === 'available' ? '#60a5fa' : '#444'),
                                opacity: state === 'locked' ? 0.5 : 1,
                                boxShadow: runeColor ? `0 0 30px ${runeColor}` : state === 'available' ? '0 0 20px rgba(37,99,235,0.6)' : '0 4px 20px rgba(0,0,0,0.8)'
                              }}
                            >
                              {getIcon(skill.categoria)}
                            </div>
                            {(skill.flyer > 0 || skill.base > 0 || skill.lateral > 0 || skill.back > 0) && (
                              <div style={{ position: 'absolute', bottom: '-8px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.9)', color: '#60a5fa', fontSize: '9px', padding: '2px 6px', borderRadius: '8px', border: '1px solid #2563eb', whiteSpace: 'nowrap', fontWeight: 'bold' }}>
                                {[
                                  skill.flyer > 0 && `${skill.flyer}F`,
                                  skill.base > 0 && `${skill.base}B`,
                                  skill.lateral > 0 && `${skill.lateral}L`,
                                  skill.back > 0 && `${skill.back}Bk`
                                ].filter(Boolean).join(' ')}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {selectedSkill && (
        <div onClick={() => setSelectedSkill(null)} style={{ display: 'flex', position: 'fixed', zIndex: 1000, left: 0, top: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'linear-gradient(135deg, #000 0%, #0a0a0a 50%, #1e3a8a 100%)', padding: '30px', border: '3px solid #2563eb', borderRadius: '20px', width: '90%', maxWidth: '400px', position: 'relative', boxShadow: '0 0 50px rgba(37,99,235,0.5)' }}>
            <span onClick={() => setSelectedSkill(null)} style={{ position: 'absolute', right: '20px', top: '20px', fontSize: '30px', cursor: 'pointer' }}>&times;</span>
            <div style={{ fontSize: '60px', textAlign: 'center', marginBottom: '20px' }}>{getIcon(selectedSkill.categoria)}</div>
            <h2 style={{ textAlign: 'center', marginBottom: '15px', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '2px', textShadow: '0 0 10px rgba(96,165,250,0.7)' }}>{selectedSkill.name}</h2>
            <p style={{ textAlign: 'center', lineHeight: '1.6', marginBottom: '20px', color: '#ccc' }}>
              {selectedSkill.categoria} - Nível {selectedSkill.nivel}
              {(selectedSkill.flyer > 0 || selectedSkill.base > 0 || selectedSkill.lateral > 0 || selectedSkill.back > 0) && (
                <><br /><br />Atletas: {[
                  selectedSkill.flyer > 0 && `${selectedSkill.flyer} Flyer`,
                  selectedSkill.base > 0 && `${selectedSkill.base} Base`,
                  selectedSkill.lateral > 0 && `${selectedSkill.lateral} Lateral`,
                  selectedSkill.back > 0 && `${selectedSkill.back} Back`
                ].filter(Boolean).join(', ')}</>
              )}
            </p>
            <div style={{ margin: '15px 0', padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', fontSize: '14px' }}>
              {selectedSkill.prereq ? <><strong>Requer:</strong> {selectedSkill.prereq}</> : <strong>Sem pré-requisitos</strong>}
            </div>
            {(() => {
              const runeLevel = getRuneLevel(selectedSkill.id);
              const state = getSkillState(selectedSkill);
              const runeNames = ['', '🥉 Bronze', '🥈 Prata', '🥇 Ouro'];
              
              return (
                <>
                  {runeLevel > 0 && (
                    <div style={{ textAlign: 'center', marginBottom: '15px', fontSize: '18px', fontWeight: 'bold', color: getRuneColor(runeLevel) }}>
                      {runeNames[runeLevel]}
                    </div>
                  )}
                  {user?.isAdmin && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {runeLevel > 0 && (
                        <button
                          onClick={() => downgradeSkill(selectedSkill)}
                          style={{ 
                            flex: 1,
                            padding: '15px', 
                            fontSize: '16px', 
                            fontWeight: 'bold', 
                            border: '2px solid #dc2626', 
                            borderRadius: '10px', 
                            cursor: 'pointer', 
                            background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)', 
                            color: '#fff'
                          }}
                        >
                          ⬇ {runeLevel === 1 ? 'Bloquear' : 'Rebaixar'}
                        </button>
                      )}
                      <button
                        onClick={() => unlockSkill(selectedSkill)}
                        disabled={state === 'locked' || runeLevel >= 3}
                        style={{ 
                          flex: 1,
                          padding: '15px', 
                          fontSize: '16px', 
                          fontWeight: 'bold', 
                          border: '2px solid #2563eb', 
                          borderRadius: '10px', 
                          cursor: state !== 'locked' && runeLevel < 3 ? 'pointer' : 'not-allowed', 
                          background: runeLevel >= 3 ? 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)' : state === 'available' || state === 'unlocked' ? 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' : 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)', 
                          color: '#fff', 
                          opacity: state !== 'locked' && runeLevel < 3 ? 1 : 0.5 
                        }}
                      >
                        {runeLevel >= 3 ? '✓ Máximo' : state === 'locked' ? 'Bloqueada' : runeLevel === 0 ? '🥉 Bronze' : runeLevel === 1 ? '🥈 Prata' : '🥇 Ouro'}
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {showAthleteModal && (
        <div onClick={() => setShowAthleteModal(false)} style={{ display: 'flex', position: 'fixed', zIndex: 1000, left: 0, top: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'linear-gradient(135deg, #000 0%, #0a0a0a 50%, #1e3a8a 100%)', padding: '30px', border: '3px solid #2563eb', borderRadius: '20px', width: '90%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto', position: 'relative', boxShadow: '0 0 50px rgba(37,99,235,0.5)' }}>
            <span onClick={() => setShowAthleteModal(false)} style={{ position: 'absolute', right: '20px', top: '20px', fontSize: '30px', cursor: 'pointer' }}>&times;</span>
            <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '2px', textShadow: '0 0 10px rgba(96,165,250,0.7)' }}>Selecionar Atleta</h2>
            <div style={{ display: 'grid', gap: '15px' }}>
              {athletes.map(athlete => (
                <div
                  key={athlete.id}
                  onClick={() => selectAthlete(athlete)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    padding: '15px',
                    background: selectedAthlete?.id === athlete.id ? 'rgba(37,99,235,0.3)' : 'rgba(30,58,138,0.2)',
                    border: selectedAthlete?.id === athlete.id ? '2px solid #60a5fa' : '2px solid #2563eb',
                    borderRadius: '15px',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                >
                  <img src={athlete.photo_path || (athlete.gender === 'M' ? '/viking.png' : '/valkyrie.png')} alt={athlete.name} style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #2563eb' }} />
                  <div>
                    <h3 style={{ color: '#60a5fa', marginBottom: '5px' }}>{athlete.name}</h3>
                    <p style={{ color: '#93c5fd', fontSize: '14px' }}>{athlete.gender === 'M' ? 'Masculino' : 'Feminino'}</p>
                    {athlete.email && <p style={{ color: '#93c5fd', fontSize: '12px' }}>{athlete.email}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
