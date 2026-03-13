# Valhalla Gamify - Árvore de Skills de Cheerleading

Aplicação moderna de gamificação para progressão de habilidades de cheerleading com tema Viking.

## Stack

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Banco de Dados**: SQLite (embutido)
- **ORM**: Better-SQLite3

## Requisitos

- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0

Se você usa NVM:
```bash
nvm use
```

## Instalação

```bash
npm install
```

## Executar

```bash
npm run dev
```

Acesse:
- **Árvore de Skills**: http://localhost:3000
- **Admin**: http://localhost:3000/admin
- **API**: http://localhost:3001/api

## Funcionalidades

### Árvore de Skills
- Visualização em camadas (níveis 0-7)
- Agrupamento por categoria (Fundamentos, Tumbling, Jumps, Stunts, Partner, Pyramid)
- Sistema de pré-requisitos
- Indicadores de atletas necessários (Flyer, Base, Lateral, Back)
- Sistema de pontos (runas) para desbloquear skills
- Progresso salvo no banco

### Admin
- CRUD completo de skills
- CRUD completo de atletas
- Upload de fotos de atletas
- Ícones padrão: viking.png (M) e valkyrie.png (F)

## Estrutura

```
valhalla-gamify/
├── server/
│   ├── db.js           # SQLite + schema
│   ├── api.js          # API REST
│   └── uploads/        # Fotos
├── src/
│   ├── components/
│   │   ├── SkillTree.jsx
│   │   └── Admin.jsx
│   ├── App.jsx
│   └── main.jsx
├── public/
│   ├── viking.png      # Ícone masculino padrão
│   └── valkyrie.png    # Ícone feminino padrão
├── valhalla.db         # Banco SQLite (gerado)
└── skills.csv          # Dados iniciais
```

## Build para Produção

```bash
npm run build
```

Arquivos gerados em `dist/`

