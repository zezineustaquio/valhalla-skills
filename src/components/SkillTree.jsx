import { useState, useEffect } from 'react';

export default function SkillTree() {
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
      fetch('/api/skills'),
      fetch('/api/athletes')
    ]);
    
    setSkills(await skillsRes.json());
    const athletesData = await athletesRes.json();
    setAthletes(athletesData);
    if (athletesData.length > 0 && !selectedAthlete) {
      const firstAthlete = athletesData[0];
      setSelectedAthlete(firstAthlete);
      loadProgress(firstAthlete.id);
    }
  };

  const loadProgress = async (athleteId) => {
    const progressRes = await fetch(`/api/progress/${athleteId}`);
    const progress = await progressRes.json();
    const progressMap = new Map();
    progress.forEach(p => progressMap.set(p.skill_id, p.rune_level));
    setSkillProgress(progressMap);
  };

  const groupByLevel = () => {
    const levels = {};
    skills.forEach(skill => {
      if (!levels[skill.nivel]) levels[skill.nivel] = {};
      if (!levels[skill.nivel][skill.categoria]) levels[skill.nivel][skill.categoria] = [];
      levels[skill.nivel][skill.categoria].push(skill);
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
      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    <div style={{ background: 'linear-gradient(180deg, #000 0%, #1e3a8a 100%)', minHeight: '100vh', color: '#fff', fontFamily: 'Cinzel, Georgia, serif' }}>
      <header style={{ background: 'rgba(0,0,0,0.9)', borderBottom: '2px solid #1e3a8a', padding: '15px 20px', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '18px', letterSpacing: '2px', color: '#60a5fa', textShadow: '0 0 10px rgba(96,165,250,0.5)' }}>⚔ VALHALLA SKILLS ⚔</h1>
        <a href="/admin" style={{ padding: '8px 16px', background: 'rgba(30,58,138,0.3)', border: '1px solid #2563eb', color: '#60a5fa', textDecoration: 'none', borderRadius: '8px', fontSize: '14px' }}>Admin</a>
      </header>

      <div style={{ padding: '20px 10px 80px', display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end', position: 'relative', overflowX: 'auto' }}>
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

          {Object.keys(levels).sort((a, b) => a - b).map(nivel => (
            <div key={nivel} style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: 'max-content', padding: '20px 10px', background: 'rgba(30,58,138,0.05)', borderRadius: '20px', border: '2px solid rgba(37,99,235,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', padding: '10px', background: 'linear-gradient(90deg, transparent, rgba(37,99,235,0.2), transparent)', borderRadius: '10px' }}>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#60a5fa', letterSpacing: '2px' }}>NÍVEL {nivel}</span>
                <span style={{ fontSize: '12px', color: '#93c5fd', fontStyle: 'italic' }}>
                  {['Habilidades fundamentais', 'Fundamentos básicos', 'Técnicas intermediárias', 'Movimentos avançados', 'Alta complexidade', 'Técnicas de elite', 'Maestria avançada', 'Nível profissional'][nivel]}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'nowrap' }}>
                {Object.keys(levels[nivel]).map(categoria => (
                  <div key={categoria} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '10px', background: 'rgba(30,58,138,0.1)', borderRadius: '15px', border: '1px solid rgba(37,99,235,0.3)', minWidth: '100px', flexShrink: 0 }}>
                    <div style={{ fontSize: '11px', letterSpacing: '2px', fontWeight: 'bold', color: '#60a5fa', padding: '5px 10px', background: 'rgba(0,0,0,0.8)', borderRadius: '10px', border: '1px solid #2563eb' }}>{categoria}</div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      {levels[nivel][categoria].map(skill => {
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
                                {skill.flyer > 0 ? `${skill.flyer}F ` : ''}{skill.base > 0 ? `${skill.base}B ` : ''}{skill.lateral > 0 ? `${skill.lateral}L ` : ''}{skill.back > 0 ? `${skill.back}Bk` : ''}
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
          ))}
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
              {(selectedSkill.flyer || selectedSkill.base || selectedSkill.lateral || selectedSkill.back) && (
                <><br /><br />Atletas: {selectedSkill.flyer ? `${selectedSkill.flyer} Flyer ` : ''}{selectedSkill.base ? `${selectedSkill.base} Base ` : ''}{selectedSkill.lateral ? `${selectedSkill.lateral} Lateral ` : ''}{selectedSkill.back ? `${selectedSkill.back} Back` : ''}</>
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
