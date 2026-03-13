import Database from 'better-sqlite3';
import { readFileSync } from 'fs';

const db = new Database('valhalla.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    nivel INTEGER NOT NULL,
    categoria TEXT NOT NULL,
    flyer INTEGER DEFAULT 0,
    base INTEGER DEFAULT 0,
    lateral INTEGER DEFAULT 0,
    back INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS skill_dependencies (
    skill_id INTEGER NOT NULL,
    prerequisite_id INTEGER NOT NULL,
    PRIMARY KEY (skill_id, prerequisite_id),
    FOREIGN KEY (skill_id) REFERENCES skills(id),
    FOREIGN KEY (prerequisite_id) REFERENCES skills(id)
  );

  CREATE TABLE IF NOT EXISTS athletes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    gender TEXT NOT NULL,
    email TEXT,
    photo_path TEXT,
    is_admin INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS user_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    athlete_id INTEGER NOT NULL,
    skill_id INTEGER NOT NULL,
    unlocked INTEGER DEFAULT 0,
    rune_level INTEGER DEFAULT 0,
    UNIQUE(athlete_id, skill_id),
    FOREIGN KEY (athlete_id) REFERENCES athletes(id),
    FOREIGN KEY (skill_id) REFERENCES skills(id)
  );
`);

// Importar CSV inicial se tabela vazia
const count = db.prepare('SELECT COUNT(*) as count FROM skills').get();
if (count.count === 0) {
  try {
    const csv = readFileSync('skills.csv', 'utf-8');
    const lines = csv.trim().split('\n').slice(1);
    
    const insertSkill = db.prepare(`
      INSERT OR IGNORE INTO skills (nivel, categoria, name, flyer, base, lateral, back)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertDep = db.prepare(`
      INSERT OR IGNORE INTO skill_dependencies (skill_id, prerequisite_id)
      VALUES (?, ?)
    `);
    
    const importSkills = db.transaction(() => {
      const skillMap = new Map();
      
      // Primeira passagem: inserir todas as skills
      lines.forEach(line => {
        const [nivel, categoria, name, prereq, flyer, base, lateral, back] = line.split(',');
        const result = insertSkill.run(
          parseInt(nivel),
          categoria,
          name,
          parseInt(flyer) || 0,
          parseInt(base) || 0,
          parseInt(lateral) || 0,
          parseInt(back) || 0
        );
        if (result.changes > 0) {
          skillMap.set(name, result.lastInsertRowid);
        }
      });
      
      // Segunda passagem: inserir dependências
      lines.forEach(line => {
        const [nivel, categoria, name, prereq] = line.split(',');
        if (prereq && prereq !== 'Nenhum') {
          const skillId = skillMap.get(name);
          const prereqs = prereq.split(';').map(p => p.trim());
          prereqs.forEach(prereqName => {
            const prereqId = skillMap.get(prereqName);
            if (skillId && prereqId) {
              insertDep.run(skillId, prereqId);
            }
          });
        }
      });
    });
    
    importSkills();
    console.log(`✓ ${lines.length} skills importadas do CSV`);
  } catch (e) {
    console.log('Erro ao importar CSV:', e.message);
  }
}

export default db;
