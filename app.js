let skillsData = [];
let points = 10;
let unlockedSkills = new Set();

async function loadSkills() {
    const response = await fetch('skills.csv');
    const text = await response.text();
    const lines = text.trim().split('\n');
    
    skillsData = lines.slice(1).map((line, idx) => {
        const parts = line.split(',');
        const [nivel, categoria, skill, preRequisitos, flyer, base, lateral, back] = parts;
        return {
            id: idx,
            nivel: parseInt(nivel),
            categoria,
            name: skill,
            deps: preRequisitos === 'Nenhum' ? [] : preRequisitos.split(';').map(d => d.trim()),
            cost: parseInt(nivel),
            flyer: parseInt(flyer) || 0,
            base: parseInt(base) || 0,
            lateral: parseInt(lateral) || 0,
            back: parseInt(back) || 0
        };
    });
}

function init() {
    loadSkills().then(() => {
        renderSkillTree();
        updatePoints();
        setupModal();
        scrollToAthlete();
    });
}

function scrollToAthlete() {
    setTimeout(() => {
        const athlete = document.querySelector('.athlete');
        if (athlete) {
            athlete.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
    }, 300);
}

function renderSkillTree() {
    const tree = document.getElementById('skillTree');
    tree.innerHTML = '';
    
    const container = document.createElement('div');
    container.className = 'tree-container';
    
    // Atleta na base
    const athlete = document.createElement('div');
    athlete.className = 'athlete';
    athlete.innerHTML = '🏃';
    container.appendChild(athlete);
    
    // Agrupar por nível e categoria
    const levels = {};
    skillsData.forEach(skill => {
        if (!levels[skill.nivel]) levels[skill.nivel] = {};
        if (!levels[skill.nivel][skill.categoria]) levels[skill.nivel][skill.categoria] = [];
        levels[skill.nivel][skill.categoria].push(skill);
    });
    
    const levelDescriptions = {
        0: 'Habilidades fundamentais',
        1: 'Fundamentos básicos',
        2: 'Técnicas intermediárias',
        3: 'Movimentos avançados',
        4: 'Alta complexidade',
        5: 'Técnicas de elite',
        6: 'Maestria avançada',
        7: 'Nível profissional'
    };
    
    // Renderizar níveis
    Object.keys(levels).sort((a, b) => a - b).forEach((nivel) => {
        const levelDiv = document.createElement('div');
        levelDiv.className = 'skill-level';
        
        const levelHeader = document.createElement('div');
        levelHeader.className = 'level-header';
        levelHeader.innerHTML = `<span class="level-number">Nível ${nivel}</span><span class="level-desc">${levelDescriptions[nivel]}</span>`;
        levelDiv.appendChild(levelHeader);
        
        const categoriesContainer = document.createElement('div');
        categoriesContainer.className = 'categories-container';
        
        const categories = Object.keys(levels[nivel]);
        categories.forEach((categoria) => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'skill-category';
            
            const categoryLabel = document.createElement('div');
            categoryLabel.className = 'category-label';
            categoryLabel.textContent = categoria;
            categoryDiv.appendChild(categoryLabel);
            
            const skillsDiv = document.createElement('div');
            skillsDiv.className = 'skills-row';
            
            levels[nivel][categoria].forEach(skill => {
                const nodeWrapper = document.createElement('div');
                nodeWrapper.className = 'skill-wrapper';
                nodeWrapper.id = `skill-${skill.id}`;
                nodeWrapper.style.position = 'relative';
                
                const node = document.createElement('div');
                node.className = `skill-node ${getSkillState(skill)}`;
                node.innerHTML = getSkillIcon(skill.categoria);
                node.title = skill.name;
                node.onclick = () => openModal(skill);
                
                // Badge de atletas necessários
                if (skill.flyer || skill.base || skill.lateral || skill.back) {
                    const badge = document.createElement('div');
                    badge.className = 'athlete-badge';
                    const athletes = [];
                    if (skill.flyer) athletes.push(`${skill.flyer}F`);
                    if (skill.base) athletes.push(`${skill.base}B`);
                    if (skill.lateral) athletes.push(`${skill.lateral}L`);
                    if (skill.back) athletes.push(`${skill.back}Bk`);
                    badge.textContent = athletes.join(' ');
                    nodeWrapper.appendChild(badge);
                }
                
                nodeWrapper.appendChild(node);
                skillsDiv.appendChild(nodeWrapper);
            });
            
            categoryDiv.appendChild(skillsDiv);
            categoriesContainer.appendChild(categoryDiv);
        });
        
        levelDiv.appendChild(categoriesContainer);
        container.appendChild(levelDiv);
    });
    
    tree.appendChild(container);
    
    // Desenhar conexões após renderizar
    setTimeout(() => drawConnections(), 200);
}

function drawConnections() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '-1';
    
    const tree = document.getElementById('skillTree');
    const treeRect = tree.getBoundingClientRect();
    
    skillsData.forEach(skill => {
        if (skill.deps.length === 0 || !skill.deps[0]) return;
        
        const depSkill = skillsData.find(s => s.name === skill.deps[0]);
        if (!depSkill) return;
        
        const fromEl = document.getElementById(`skill-${depSkill.id}`);
        const toEl = document.getElementById(`skill-${skill.id}`);
        
        if (!fromEl || !toEl) return;
        
        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();
        
        const x1 = fromRect.left + fromRect.width / 2 - treeRect.left;
        const y1 = fromRect.top + fromRect.height / 2 - treeRect.top;
        const x2 = toRect.left + toRect.width / 2 - treeRect.left;
        const y2 = toRect.top + toRect.height / 2 - treeRect.top;
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        
        const isActive = unlockedSkills.has(depSkill.id) && unlockedSkills.has(skill.id);
        line.setAttribute('stroke', isActive ? '#2563eb' : '#333');
        line.setAttribute('stroke-width', isActive ? '3' : '2');
        line.setAttribute('opacity', isActive ? '0.8' : '0.3');
        
        svg.appendChild(line);
    });
    
    tree.insertBefore(svg, tree.firstChild);
}

function getSkillIcon(categoria) {
    const icons = {
        'Fundamentos': '⬢',
        'Tumbling': '◈',
        'Jumps': '◊',
        'Stunts': '◐',
        'Partner': '◑',
        'Pyramid': '◕'
    };
    return icons[categoria] || '◆';
}

function getSkillState(skill) {
    if (unlockedSkills.has(skill.id)) return 'unlocked';
    const depsUnlocked = skill.deps.length === 0 || skill.deps.every(depName => {
        return skillsData.some(s => s.name === depName && unlockedSkills.has(s.id));
    });
    return depsUnlocked ? 'available' : 'locked';
}

function drawConnections() {
    // Remove SVG anterior se existir
    const oldSvg = document.querySelector('#skillTree svg');
    if (oldSvg) oldSvg.remove();
    
    const tree = document.getElementById('skillTree');
    const container = tree.querySelector('.tree-container');
    if (!container) return;
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '0';
    svg.style.overflow = 'visible';
    
    const containerRect = container.getBoundingClientRect();
    
    skillsData.forEach(skill => {
        if (skill.deps.length === 0 || !skill.deps[0]) return;
        
        skill.deps.forEach(depName => {
            const depSkill = skillsData.find(s => s.name === depName);
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
            
            const isActive = unlockedSkills.has(depSkill.id) && unlockedSkills.has(skill.id);
            line.setAttribute('stroke', isActive ? '#2563eb' : '#333');
            line.setAttribute('stroke-width', isActive ? '3' : '2');
            line.setAttribute('opacity', isActive ? '0.8' : '0.3');
            
            svg.appendChild(line);
        });
    });
    
    container.insertBefore(svg, container.firstChild);
}

function openModal(skill) {
    const modal = document.getElementById('modal');
    const state = getSkillState(skill);
    
    document.getElementById('modalIcon').innerHTML = getSkillIcon(skill.categoria);
    document.getElementById('modalTitle').textContent = skill.name;
    
    let desc = `${skill.categoria} - Nível ${skill.nivel}`;
    if (skill.flyer || skill.base || skill.lateral || skill.back) {
        const athletes = [];
        if (skill.flyer) athletes.push(`${skill.flyer} Flyer`);
        if (skill.base) athletes.push(`${skill.base} Base`);
        if (skill.lateral) athletes.push(`${skill.lateral} Lateral`);
        if (skill.back) athletes.push(`${skill.back} Back`);
        desc += `\n\nAtletas necessários: ${athletes.join(', ')}`;
    }
    document.getElementById('modalDesc').textContent = desc;
    
    const depsDiv = document.getElementById('modalDeps');
    if (skill.deps.length > 0 && skill.deps[0]) {
        depsDiv.innerHTML = `<strong>Requer:</strong> ${skill.deps.join(', ')}`;
    } else {
        depsDiv.innerHTML = '<strong>Sem pré-requisitos</strong>';
    }
    
    const btn = document.getElementById('unlockBtn');
    if (state === 'unlocked') {
        btn.textContent = '✓ Desbloqueada';
        btn.disabled = true;
    } else if (state === 'available') {
        btn.textContent = `Desbloquear (${skill.cost} runas)`;
        btn.disabled = points < skill.cost;
        btn.onclick = () => unlockSkill(skill);
    } else {
        btn.textContent = 'Bloqueada';
        btn.disabled = true;
    }
    
    modal.style.display = 'block';
}

function unlockSkill(skill) {
    if (points >= skill.cost) {
        points -= skill.cost;
        unlockedSkills.add(skill.id);
        updatePoints();
        renderSkillTree();
        closeModal();
    }
}

function unlockSkill(skill) {
    if (points >= skill.cost) {
        points -= skill.cost;
        unlockedSkills.add(skill.id);
        updatePoints();
        renderSkillTree();
        closeModal();
    }
}

function updatePoints() {
    document.getElementById('points').textContent = points;
}

function setupModal() {
    const modal = document.getElementById('modal');
    const close = document.querySelector('.close');
    
    close.onclick = closeModal;
    window.onclick = (e) => {
        if (e.target === modal) closeModal();
    };
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

init();
