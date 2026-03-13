import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import multer from 'multer';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import passport from './auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const upload = multer({ dest: 'server/uploads/' });

app.use(cors({ origin: process.env.VITE_CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'valhalla_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Serve static files from dist directory
app.use(express.static(join(__dirname, '..', 'dist')));

// Auth routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => res.redirect(process.env.VITE_CLIENT_URL || 'http://localhost:3000')
);

app.get('/auth/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

app.post('/auth/logout', (req, res) => {
  req.logout(() => res.json({ success: true }));
});

// Middleware de autenticação
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Unauthorized' });
};

const requireAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.isAdmin) return next();
  res.status(403).json({ error: 'Forbidden' });
};

// Skills (público para leitura)
app.get('/api/skills', (req, res) => {
  const skills = db.prepare(`
    SELECT s.*, GROUP_CONCAT(p.name, ';') as prereq
    FROM skills s
    LEFT JOIN skill_dependencies sd ON s.id = sd.skill_id
    LEFT JOIN skills p ON sd.prerequisite_id = p.id
    GROUP BY s.id
    ORDER BY s.nivel, s.name
  `).all();
  res.json(skills);
});

app.post('/api/skills', requireAdmin, (req, res) => {
  const { name, nivel, categoria, prereq, flyer, base, lateral, back } = req.body;
  
  const insertSkill = db.prepare(`
    INSERT INTO skills (name, nivel, categoria, flyer, base, lateral, back)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertDep = db.prepare(`
    INSERT OR IGNORE INTO skill_dependencies (skill_id, prerequisite_id)
    VALUES (?, ?)
  `);
  
  const transaction = db.transaction(() => {
    const result = insertSkill.run(name, nivel, categoria, flyer || 0, base || 0, lateral || 0, back || 0);
    const skillId = result.lastInsertRowid;
    
    if (prereq) {
      const prereqs = prereq.split(';').map(p => p.trim()).filter(p => p);
      prereqs.forEach(prereqName => {
        const prereqSkill = db.prepare('SELECT id FROM skills WHERE name = ?').get(prereqName);
        if (prereqSkill) {
          insertDep.run(skillId, prereqSkill.id);
        } else {
          console.warn(`Pré-requisito não encontrado: ${prereqName}`);
        }
      });
    }
    
    return skillId;
  });
  
  try {
    const skillId = transaction();
    res.json({ id: skillId });
  } catch (error) {
    console.error('Erro ao criar skill:', error);
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/skills/:id', requireAdmin, (req, res) => {
  const { name, nivel, categoria, prereq, flyer, base, lateral, back } = req.body;
  const skillId = parseInt(req.params.id);
  
  console.log('Atualizando skill ID:', skillId);
  
  const updateSkill = db.prepare(`
    UPDATE skills SET name=?, nivel=?, categoria=?, flyer=?, base=?, lateral=?, back=?
    WHERE id=?
  `);
  
  const deleteDeps = db.prepare('DELETE FROM skill_dependencies WHERE skill_id=?');
  
  const insertDep = db.prepare(`
    INSERT OR IGNORE INTO skill_dependencies (skill_id, prerequisite_id)
    VALUES (?, ?)
  `);
  
  const transaction = db.transaction(() => {
    updateSkill.run(name, nivel, categoria, flyer || 0, base || 0, lateral || 0, back || 0, skillId);
    deleteDeps.run(skillId);
    
    if (prereq) {
      const prereqs = prereq.split(';').map(p => p.trim()).filter(p => p);
      prereqs.forEach(prereqName => {
        const prereqSkill = db.prepare('SELECT id FROM skills WHERE name = ?').get(prereqName);
        if (prereqSkill && prereqSkill.id) {
          insertDep.run(skillId, prereqSkill.id);
        }
      });
    }
  });
  
  try {
    transaction();
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar skill:', error);
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/skills/:id', requireAdmin, (req, res) => {
  try {
    // Verificar se outras skills dependem desta
    const dependentSkills = db.prepare(`
      SELECT s.name 
      FROM skills s
      JOIN skill_dependencies sd ON s.id = sd.skill_id
      WHERE sd.prerequisite_id = ?
    `).all(req.params.id);
    
    if (dependentSkills.length > 0) {
      const skillNames = dependentSkills.map(s => s.name).join(', ');
      return res.status(400).json({ 
        error: `Não é possível excluir. As seguintes skills dependem dela: ${skillNames}` 
      });
    }
    
    const transaction = db.transaction(() => {
      // Deletar dependências onde esta skill depende de outras
      db.prepare('DELETE FROM skill_dependencies WHERE skill_id=?').run(req.params.id);
      // Deletar progresso dos atletas nesta skill
      db.prepare('DELETE FROM user_progress WHERE skill_id=?').run(req.params.id);
      // Deletar a skill
      db.prepare('DELETE FROM skills WHERE id=?').run(req.params.id);
    });
    
    transaction();
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir skill:', error);
    res.status(400).json({ error: error.message });
  }
});

// Athletes
app.get('/api/athletes', (req, res) => {
  const athletes = db.prepare('SELECT * FROM athletes').all();
  res.json(athletes);
});

app.post('/api/athletes', requireAdmin, (req, res) => {
  const { name, gender, email } = req.body;
  const result = db.prepare('INSERT INTO athletes (name, gender, email) VALUES (?, ?, ?)').run(name, gender, email);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/athletes/:id', requireAdmin, (req, res) => {
  const { name, gender, email, is_admin } = req.body;
  db.prepare('UPDATE athletes SET name=?, gender=?, email=?, is_admin=? WHERE id=?').run(name, gender, email, is_admin ? 1 : 0, req.params.id);
  res.json({ success: true });
});

app.patch('/api/athletes/:id/admin', requireAdmin, (req, res) => {
  const { is_admin } = req.body;
  db.prepare('UPDATE athletes SET is_admin=? WHERE id=?').run(is_admin ? 1 : 0, req.params.id);
  res.json({ success: true });
});

app.delete('/api/athletes/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM athletes WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

app.post('/api/athletes/:id/photo', requireAdmin, upload.single('photo'), (req, res) => {
  const photoPath = `/uploads/${req.file.filename}`;
  db.prepare('UPDATE athletes SET photo_path=? WHERE id=?').run(photoPath, req.params.id);
  res.json({ photo_path: photoPath });
});

// Progress
app.get('/api/progress', (req, res) => {
  const progress = db.prepare('SELECT athlete_id, skill_id, rune_level FROM user_progress WHERE unlocked=1').all();
  res.json(progress);
});

app.get('/api/progress/:athleteId', (req, res) => {
  const progress = db.prepare('SELECT skill_id, rune_level FROM user_progress WHERE athlete_id=? AND unlocked=1').all(req.params.athleteId);
  res.json(progress);
});

app.post('/api/progress', requireAuth, (req, res) => {
  console.log('Received progress data:', req.body);
  const { athlete_id, skill_id, rune_level } = req.body;
  
  if (!athlete_id || !skill_id) {
    console.error('Missing data - athlete_id:', athlete_id, 'skill_id:', skill_id);
    return res.status(400).json({ error: 'athlete_id and skill_id are required' });
  }
  
  try {
    db.prepare('INSERT OR REPLACE INTO user_progress (athlete_id, skill_id, unlocked, rune_level) VALUES (?, ?, 1, ?)').run(athlete_id, skill_id, rune_level || 1);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving progress:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '..', 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
