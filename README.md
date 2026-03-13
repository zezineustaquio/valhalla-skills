# Valhalla Gamify - Árvore de Skills de Cheerleading

Aplicação moderna de gamificação para progressão de habilidades de cheerleading com tema Viking e autenticação Google OAuth.

## Stack

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Banco de Dados**: SQLite (embutido)
- **ORM**: Better-SQLite3
- **Autenticação**: Google OAuth 2.0 + Passport.js

## Requisitos

- **Node.js**: >= 24.14.0
- **npm**: >= 11.9.0
- **Conta Google Cloud** (para OAuth)

Se você usa NVM:
```bash
nvm use
```

## Instalação

```bash
npm install
```

## Configuração

1. **Configure o Google OAuth** seguindo o guia em `GOOGLE_OAUTH_SETUP.md`

2. **Crie o arquivo `.env`** na raiz do projeto:
```env
GOOGLE_CLIENT_ID=seu_client_id_aqui
GOOGLE_CLIENT_SECRET=seu_client_secret_aqui
SESSION_SECRET=valhalla_secret_key_dev
ADMIN_EMAIL=zezineustaquio@gmail.com
```

## Executar

### Desenvolvimento
```bash
npm run dev
```

### Docker
```bash
# Build e executar
docker-compose up --build

# Ou usando Docker diretamente
docker build -t valhalla-gamify .
docker run -p 3001:3001 --env-file .env valhalla-gamify
```

Acesse:
- **Aplicação**: http://localhost:3001
- **API**: http://localhost:3001/api

## Autenticação e Permissões

### Admin (zezineustaquio@gmail.com)
- Acesso total ao painel admin
- CRUD completo de skills e atletas
- Visualizar todas as árvores de progresso

### Atleta (email cadastrado)
- Visualiza automaticamente sua própria árvore
- Pode editar seu progresso
- Sem acesso ao admin

### Usuário Padrão
- Apenas visualização das árvores
- Pode selecionar qualquer atleta para visualizar
- Sem permissão de edição

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

