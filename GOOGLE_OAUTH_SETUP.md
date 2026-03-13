# Configuração de Autenticação com Google OAuth

## 1. Criar Projeto no Google Cloud Console

1. Acesse: https://console.cloud.google.com/
2. Crie um novo projeto ou selecione um existente
3. No menu lateral, vá em **APIs & Services** > **Credentials**

## 2. Configurar OAuth Consent Screen

1. Clique em **OAuth consent screen**
2. Selecione **External** (para testes) ou **Internal** (se tiver Google Workspace)
3. Preencha:
   - **App name**: Valhalla Gamify
   - **User support email**: seu email
   - **Developer contact**: seu email
4. Clique em **Save and Continue**
5. Em **Scopes**, adicione:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
6. Clique em **Save and Continue**
7. Em **Test users**, adicione os emails que poderão fazer login (incluindo `zezineustaquio@gmail.com`)

## 3. Criar Credenciais OAuth 2.0

1. Vá em **Credentials** > **Create Credentials** > **OAuth client ID**
2. Selecione **Web application**
3. Preencha:
   - **Name**: Valhalla Gamify Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:3000`
     - `http://localhost:3001`
   - **Authorized redirect URIs**:
     - `http://localhost:3001/auth/google/callback`
4. Clique em **Create**
5. Copie o **Client ID** e **Client Secret**

## 4. Configurar Variáveis de Ambiente

Edite o arquivo `.env` na raiz do projeto:

```env
GOOGLE_CLIENT_ID=seu_client_id_aqui
GOOGLE_CLIENT_SECRET=seu_client_secret_aqui
SESSION_SECRET=valhalla_secret_key_dev
ADMIN_EMAIL=zezineustaquio@gmail.com
```

## 5. Testar

```bash
npm run dev
```

Acesse: http://localhost:3000

- Você será redirecionado para `/login`
- Clique em "Entrar com Google"
- Faça login com sua conta Google
- Se o email for `zezineustaquio@gmail.com`, você terá acesso admin
- Se o email corresponder a um atleta cadastrado, verá sua árvore automaticamente

## Permissões

- **Admin** (`zezineustaquio@gmail.com`):
  - Acesso total ao painel admin
  - Criar/editar/excluir skills e atletas
  - Visualizar todas as árvores

- **Atleta** (email cadastrado na tabela `athletes`):
  - Visualizar e editar apenas sua própria árvore
  - Sem acesso ao admin

- **Usuário padrão** (qualquer outro email):
  - Apenas visualização das árvores
  - Pode selecionar qualquer atleta para visualizar

## Produção

Para produção, você precisará:

1. Adicionar o domínio de produção nas **Authorized JavaScript origins** e **Authorized redirect URIs**
2. Atualizar as URLs no código (substituir `http://localhost:3001` pelo domínio real)
3. Mudar o OAuth consent screen para **Published** (se External)
4. Usar variáveis de ambiente seguras (não commitar `.env`)
