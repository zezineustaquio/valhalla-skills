import { useState, useEffect } from 'react';

export default function Admin() {
  const [skills, setSkills] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [view, setView] = useState('skills');
  const [editingSkill, setEditingSkill] = useState(null);
  const [editingAthlete, setEditingAthlete] = useState(null);
  const [showPrereqModal, setShowPrereqModal] = useState(false);
  const [selectedPrereqs, setSelectedPrereqs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSkills();
    loadAthletes();
  }, []);

  const loadSkills = async () => {
    const res = await fetch('/api/skills');
    setSkills(await res.json());
  };

  const loadAthletes = async () => {
    const res = await fetch('/api/athletes');
    setAthletes(await res.json());
  };

  const saveSkill = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    data.prereq = selectedPrereqs.join('; ');
    
    try {
      let response;
      if (editingSkill.id) {
        response = await fetch(`/api/skills/${editingSkill.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      } else {
        response = await fetch('/api/skills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      }
      
      if (response.ok) {
        showToast('✓ Skill salva com sucesso!', 'success');
        setEditingSkill(null);
        setSelectedPrereqs([]);
        loadSkills();
      } else {
        const error = await response.json();
        showToast('✗ Erro ao salvar: ' + error.error, 'error');
      }
    } catch (error) {
      showToast('✗ Erro ao salvar skill', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type) => {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 25px;
      background: ${type === 'success' ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' : 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'};
      color: white;
      border-radius: 10px;
      border: 2px solid ${type === 'success' ? '#10b981' : '#ef4444'};
      font-weight: bold;
      z-index: 10000;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      animation: slideIn 0.3s ease-out;
      max-width: 400px;
      word-wrap: break-word;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  };

  const deleteSkill = async (id) => {
    if (confirm('Excluir skill?')) {
      try {
        const response = await fetch(`/api/skills/${id}`, { method: 'DELETE' });
        if (response.ok) {
          showToast('✓ Skill excluída com sucesso!', 'success');
          loadSkills();
        } else {
          const error = await response.json();
          showToast(error.error || '✗ Erro ao excluir skill', 'error');
        }
      } catch (error) {
        showToast('✗ Erro ao excluir skill', 'error');
      }
    }
  };

  const saveAthlete = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    const data = { 
      name: formData.get('name'), 
      gender: formData.get('gender'),
      email: formData.get('email')
    };
    
    try {
      let athleteId = editingAthlete?.id;
      
      if (athleteId) {
        const response = await fetch(`/api/athletes/${athleteId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error();
      } else {
        const response = await fetch('/api/athletes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error();
        const result = await response.json();
        athleteId = result.id;
      }
      
      const photo = formData.get('photo');
      if (photo && photo.size > 0 && athleteId) {
        const photoForm = new FormData();
        photoForm.append('photo', photo);
        await fetch(`/api/athletes/${athleteId}/photo`, {
          method: 'POST',
          body: photoForm
        });
      }
      
      showToast('✓ Atleta salvo com sucesso!', 'success');
      setEditingAthlete(null);
      loadAthletes();
    } catch (error) {
      showToast('✗ Erro ao salvar atleta', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteAthlete = async (id) => {
    if (confirm('Excluir atleta?')) {
      try {
        const response = await fetch(`/api/athletes/${id}`, { method: 'DELETE' });
        if (response.ok) {
          showToast('✓ Atleta excluído com sucesso!', 'success');
          loadAthletes();
        } else {
          showToast('✗ Erro ao excluir atleta', 'error');
        }
      } catch (error) {
        showToast('✗ Erro ao excluir atleta', 'error');
      }
    }
  };

  return (
    <div style={{ background: 'linear-gradient(180deg, #000 0%, #1e3a8a 100%)', minHeight: '100vh', color: '#fff', fontFamily: 'Cinzel, Georgia, serif' }}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(400px); opacity: 0; }
        }
      `}</style>
      <header style={{ background: 'rgba(0,0,0,0.9)', borderBottom: '2px solid #1e3a8a', padding: '20px', position: 'sticky', top: 0, zIndex: 100 }}>
        <h1 style={{ textAlign: 'center', color: '#60a5fa', textShadow: '0 0 10px rgba(96,165,250,0.5)', marginBottom: '15px' }}>⚔ Admin - Valhalla Skills ⚔</h1>
        <nav style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button onClick={() => setView('skills')} style={{ padding: '10px 20px', background: view === 'skills' ? 'rgba(37,99,235,0.5)' : 'rgba(30,58,138,0.3)', border: '1px solid #2563eb', color: '#60a5fa', cursor: 'pointer', borderRadius: '8px' }}>Skills</button>
          <button onClick={() => setView('athletes')} style={{ padding: '10px 20px', background: view === 'athletes' ? 'rgba(37,99,235,0.5)' : 'rgba(30,58,138,0.3)', border: '1px solid #2563eb', color: '#60a5fa', cursor: 'pointer', borderRadius: '8px' }}>Atletas</button>
          <a href="/" style={{ padding: '10px 20px', background: 'rgba(30,58,138,0.3)', border: '1px solid #2563eb', color: '#60a5fa', textDecoration: 'none', borderRadius: '8px' }}>Ver Árvore</a>
        </nav>
      </header>

      <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
        {view === 'skills' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
              <h2 style={{ color: '#60a5fa' }}>Skills</h2>
              <button onClick={() => { setEditingSkill({}); setSelectedPrereqs([]); }} title="Nova skill" style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', border: '2px solid #2563eb', color: '#fff', cursor: 'pointer', borderRadius: '8px', fontWeight: 'bold' }}>+ Nova Skill</button>
            </div>
            
            {editingSkill && (
              <div onClick={() => { setEditingSkill(null); setSelectedPrereqs([]); }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                <form onSubmit={saveSkill} onClick={(e) => e.stopPropagation()} style={{ background: 'linear-gradient(180deg, #1e3a8a 0%, #0a0a0a 100%)', border: '3px solid #2563eb', borderRadius: '20px', padding: '30px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
                  <h3 style={{ color: '#60a5fa', marginBottom: '25px', textAlign: 'center', fontSize: '24px' }}>{editingSkill.id ? 'Editar' : 'Nova'} Skill</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', color: '#60a5fa', marginBottom: '8px', fontWeight: 'bold' }}>Nome da Skill</label>
                      <input name="name" defaultValue={editingSkill.name} required style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.5)', border: '2px solid #2563eb', borderRadius: '8px', color: '#fff', fontSize: '16px' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <div>
                        <label style={{ display: 'block', color: '#60a5fa', marginBottom: '8px', fontWeight: 'bold' }}>Nível</label>
                        <select name="nivel" defaultValue={editingSkill.nivel} required onChange={(e) => { setEditingSkill({...editingSkill, nivel: parseInt(e.target.value)}); setSelectedPrereqs([]); }} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.5)', border: '2px solid #2563eb', borderRadius: '8px', color: '#fff', fontSize: '16px' }}>
                          {[0,1,2,3,4,5,6,7].map(n => <option key={n} value={n}>Nível {n}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', color: '#60a5fa', marginBottom: '8px', fontWeight: 'bold' }}>Categoria</label>
                        <select name="categoria" defaultValue={editingSkill.categoria} required style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.5)', border: '2px solid #2563eb', borderRadius: '8px', color: '#fff', fontSize: '16px' }}>
                          <option value="Fundamentos">Fundamentos</option>
                          <option value="Tumbling">Tumbling</option>
                          <option value="Jumps">Jumps</option>
                          <option value="Stunts">Stunts</option>
                          <option value="Partner">Partner</option>
                          <option value="Pyramid">Pyramid</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#60a5fa', marginBottom: '8px', fontWeight: 'bold' }}>Pré-requisitos</label>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ flex: 1, padding: '12px', background: 'rgba(0,0,0,0.5)', border: '2px solid #2563eb', borderRadius: '8px', color: '#93c5fd', fontSize: '14px', minHeight: '46px' }}>
                          {selectedPrereqs.length > 0 ? selectedPrereqs.join(', ') : 'Nenhum pré-requisito'}
                        </div>
                        <button type="button" onClick={() => { if (!selectedPrereqs.length && editingSkill.prereq) { setSelectedPrereqs(editingSkill.prereq.split(';').map(p => p.trim()).filter(Boolean)); } setShowPrereqModal(true); }} style={{ padding: '12px 20px', background: 'rgba(37,99,235,0.5)', border: '2px solid #2563eb', color: '#60a5fa', cursor: 'pointer', borderRadius: '8px', fontWeight: 'bold' }}>Selecionar</button>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#60a5fa', marginBottom: '12px', fontWeight: 'bold' }}>Atletas Necessários</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                          <label style={{ display: 'block', color: '#93c5fd', marginBottom: '6px', fontSize: '14px' }}>Flyers</label>
                          <input name="flyer" type="number" min="0" defaultValue={editingSkill.flyer || ''} placeholder="0" style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.5)', border: '2px solid #2563eb', borderRadius: '8px', color: '#fff', fontSize: '16px' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', color: '#93c5fd', marginBottom: '6px', fontSize: '14px' }}>Bases</label>
                          <input name="base" type="number" min="0" defaultValue={editingSkill.base || ''} placeholder="0" style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.5)', border: '2px solid #2563eb', borderRadius: '8px', color: '#fff', fontSize: '16px' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', color: '#93c5fd', marginBottom: '6px', fontSize: '14px' }}>Laterais</label>
                          <input name="lateral" type="number" min="0" defaultValue={editingSkill.lateral || ''} placeholder="0" style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.5)', border: '2px solid #2563eb', borderRadius: '8px', color: '#fff', fontSize: '16px' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', color: '#93c5fd', marginBottom: '6px', fontSize: '14px' }}>Backs</label>
                          <input name="back" type="number" min="0" defaultValue={editingSkill.back || ''} placeholder="0" style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.5)', border: '2px solid #2563eb', borderRadius: '8px', color: '#fff', fontSize: '16px' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                    <button type="submit" disabled={loading} style={{ flex: 1, padding: '15px', background: loading ? '#6b7280' : 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', border: '2px solid #2563eb', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', opacity: loading ? 0.6 : 1 }}>{loading ? '⏳ Salvando...' : 'Salvar'}</button>
                    <button type="button" onClick={() => { setEditingSkill(null); setSelectedPrereqs([]); }} disabled={loading} style={{ flex: 1, padding: '15px', background: 'linear-gradient(135deg, #374151 0%, #6b7280 100%)', border: '2px solid #6b7280', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', opacity: loading ? 0.6 : 1 }}>Cancelar</button>
                  </div>
                </form>
              </div>
            )}

            {showPrereqModal && (
              <div onClick={() => setShowPrereqModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: '20px' }}>
                <div onClick={(e) => e.stopPropagation()} style={{ background: 'linear-gradient(180deg, #1e3a8a 0%, #0a0a0a 100%)', border: '3px solid #2563eb', borderRadius: '20px', padding: '30px', maxWidth: '700px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
                  <h3 style={{ color: '#60a5fa', marginBottom: '20px', textAlign: 'center', fontSize: '22px' }}>Selecionar Pré-requisitos</h3>
                  <p style={{ color: '#93c5fd', marginBottom: '20px', textAlign: 'center', fontSize: '14px' }}>Apenas skills de nível {editingSkill.nivel || 0} ou inferior</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                    {skills.filter(s => s.nivel <= (editingSkill.nivel || 0) && s.id !== editingSkill.id).map(skill => (
                          <label key={skill.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: selectedPrereqs.includes(skill.name) ? 'rgba(37,99,235,0.3)' : 'rgba(0,0,0,0.3)', border: '2px solid', borderColor: selectedPrereqs.includes(skill.name) ? '#2563eb' : '#374151', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>
                            <input type="checkbox" checked={selectedPrereqs.includes(skill.name)} onChange={(e) => { setSelectedPrereqs(e.target.checked ? [...selectedPrereqs, skill.name] : selectedPrereqs.filter(p => p !== skill.name)); }} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ color: '#60a5fa', fontWeight: 'bold' }}>{skill.name}</div>
                              <div style={{ color: '#93c5fd', fontSize: '12px' }}>Nível {skill.nivel} | {skill.categoria}</div>
                            </div>
                          </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              {[...Array(8)].map((_, nivel) => {
                const skillsInLevel = skills.filter(s => s.nivel === nivel).sort((a, b) => a.categoria.localeCompare(b.categoria));
                if (skillsInLevel.length === 0) return null;
                
                return (
                  <div key={nivel}>
                    <h3 style={{ color: '#60a5fa', marginBottom: '15px', fontSize: '18px', borderBottom: '2px solid #2563eb', paddingBottom: '8px' }}>Nível {nivel}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                      {skillsInLevel.map(skill => (
                        <div key={skill.id} style={{ background: 'rgba(30,58,138,0.2)', border: '2px solid #2563eb', borderRadius: '10px', padding: '12px' }}>
                          <h3 style={{ color: '#60a5fa', marginBottom: '6px', fontSize: '16px' }}>{skill.name}</h3>
                          <p style={{ color: '#93c5fd', fontSize: '12px', marginBottom: '8px' }}>{skill.categoria}</p>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button onClick={() => { const prereqs = skill.prereq ? skill.prereq.split(';').map(p => p.trim()).filter(Boolean) : []; setSelectedPrereqs(prereqs); setEditingSkill(skill); }} title="Editar skill" style={{ padding: '6px 10px', background: 'rgba(37,99,235,0.3)', border: '1px solid #2563eb', color: '#60a5fa', cursor: 'pointer', borderRadius: '6px', fontSize: '16px' }}>✏️</button>
                            <button onClick={() => deleteSkill(skill.id)} title="Excluir skill" style={{ padding: '6px 10px', background: 'rgba(220,38,38,0.3)', border: '1px solid #dc2626', color: '#fca5a5', cursor: 'pointer', borderRadius: '6px', fontSize: '16px' }}>🗑️</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {view === 'athletes' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
              <h2 style={{ color: '#60a5fa' }}>Atletas</h2>
              <button onClick={() => setEditingAthlete({})} style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', border: '2px solid #2563eb', color: '#fff', cursor: 'pointer', borderRadius: '8px', fontWeight: 'bold' }}>+ Novo Atleta</button>
            </div>

            {editingAthlete && (
              <div onClick={() => setEditingAthlete(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                <form onSubmit={saveAthlete} onClick={(e) => e.stopPropagation()} style={{ background: 'linear-gradient(180deg, #1e3a8a 0%, #0a0a0a 100%)', border: '3px solid #2563eb', borderRadius: '20px', padding: '30px', maxWidth: '500px', width: '100%' }}>
                  <h3 style={{ color: '#60a5fa', marginBottom: '25px', textAlign: 'center', fontSize: '24px' }}>{editingAthlete.id ? 'Editar' : 'Novo'} Atleta</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', color: '#60a5fa', marginBottom: '8px', fontWeight: 'bold' }}>Nome</label>
                      <input name="name" defaultValue={editingAthlete.name} required style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.5)', border: '2px solid #2563eb', borderRadius: '8px', color: '#fff', fontSize: '16px' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#60a5fa', marginBottom: '8px', fontWeight: 'bold' }}>Email</label>
                      <input name="email" type="email" defaultValue={editingAthlete.email} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.5)', border: '2px solid #2563eb', borderRadius: '8px', color: '#fff', fontSize: '16px' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#60a5fa', marginBottom: '8px', fontWeight: 'bold' }}>Gênero</label>
                      <select name="gender" defaultValue={editingAthlete.gender} required style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.5)', border: '2px solid #2563eb', borderRadius: '8px', color: '#fff', fontSize: '16px' }}>
                        <option value="M">Masculino</option>
                        <option value="F">Feminino</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#60a5fa', marginBottom: '8px', fontWeight: 'bold' }}>Foto</label>
                      <input name="photo" type="file" accept="image/*" style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.5)', border: '2px solid #2563eb', borderRadius: '8px', color: '#fff', fontSize: '14px' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                    <button type="submit" disabled={loading} style={{ flex: 1, padding: '15px', background: loading ? '#6b7280' : 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', border: '2px solid #2563eb', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', opacity: loading ? 0.6 : 1 }}>{loading ? '⏳ Salvando...' : 'Salvar'}</button>
                    <button type="button" onClick={() => setEditingAthlete(null)} disabled={loading} style={{ flex: 1, padding: '15px', background: 'linear-gradient(135deg, #374151 0%, #6b7280 100%)', border: '2px solid #6b7280', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', opacity: loading ? 0.6 : 1 }}>Cancelar</button>
                  </div>
                </form>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {athletes.map(athlete => (
                <div key={athlete.id} style={{ background: 'rgba(30,58,138,0.2)', border: '2px solid #2563eb', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <img src={athlete.photo_path || (athlete.gender === 'M' ? '/viking.png' : '/valkyrie.png')} alt={athlete.name} style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #2563eb' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ color: '#60a5fa', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{athlete.name}</h3>
                      <p style={{ color: '#93c5fd', fontSize: '11px' }}>{athlete.gender === 'M' ? '♂' : '♀'}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                    <button onClick={() => setEditingAthlete(athlete)} title="Editar atleta" style={{ padding: '6px 10px', background: 'rgba(37,99,235,0.3)', border: '1px solid #2563eb', color: '#60a5fa', cursor: 'pointer', borderRadius: '6px', fontSize: '16px' }}>✏️</button>
                    <button onClick={() => deleteAthlete(athlete.id)} title="Excluir atleta" style={{ padding: '6px 10px', background: 'rgba(220,38,38,0.3)', border: '1px solid #dc2626', color: '#fca5a5', cursor: 'pointer', borderRadius: '6px', fontSize: '16px' }}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
