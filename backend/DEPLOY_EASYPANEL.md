# Deploy ARKHÉ Backend no Easypanel

## 1. Criar Serviço PostgreSQL
- No Easypanel, crie um serviço **Postgres**
- Anote: host interno, porta (5432), user, password, database

## 2. Criar Serviço Backend (App)

### Opção recomendada: usar este mesmo repositório
- Tipo: **Github**
- Repositório: **o mesmo repo já conectado no Lovable**
- Branch: `main`
- Caminho de Build: `/backend`

Assim o Easypanel vai usar a pasta `backend/`, onde já estão:
- `Dockerfile`
- `package.json`
- `src/`
- `sql/`

### Opção alternativa: repositório separado só para o backend
- Repositório: `r2d2agency/arkhe-backend`
- Branch: `main`
- Caminho de Build: `/`

### Variáveis de Ambiente do Backend:
```
DATABASE_URL=postgresql://postgres:SENHA@NOME-DO-SERVICO-PG:5432/arkhe
JWT_SECRET=gere-uma-chave-segura-com-64-caracteres
JWT_REFRESH_SECRET=gere-outra-chave-segura-com-64-caracteres
CORS_ORIGIN=https://seu-dominio-frontend.com
PORT=3001
```

### Porta: `3001`

## 3. Frontend (Vite)
O frontend permanece neste repositório, na raiz do projeto.

No serviço do frontend no Easypanel, use:
- **Caminho de Build**: `/`
- **Porta**: a padrão do serviço Vite/Nginx que você configurar

Variável de ambiente do frontend:
```
VITE_API_URL=https://url-publica-do-backend-easypanel.com/api
```

## 4. Credenciais Iniciais
- **Email**: admin@arkhe.app
- **Senha**: arkhe@2026

## 5. Estrutura de Repos

### Estrutura atual deste projeto
- **Frontend**: raiz do repositório
- **Backend**: pasta `backend/`

### IMPORTANTE
Se você for subir **o mesmo repositório** no Easypanel:
- backend usa **Caminho de Build `/backend`**
- frontend usa **Caminho de Build `/`**

Se configurar o backend com build path `/`, o Easypanel não vai achar os arquivos corretos do backend, porque o `Dockerfile` dele está dentro de `backend/`.

## 6. Resumo do que colocar no Easypanel

### Serviço Backend
- Tipo: **Github**
- Repositório: **este repositório atual**
- Branch: `main`
- Caminho de Build: `/backend`
- Porta: `3001`

### Variáveis do Backend
```
DATABASE_URL=postgresql://postgres:SENHA@NOME-DO-SERVICO-PG:5432/arkhe
JWT_SECRET=gere-uma-chave-segura-com-64-caracteres
JWT_REFRESH_SECRET=gere-outra-chave-segura-com-64-caracteres
CORS_ORIGIN=https://url-do-frontend.com
PORT=3001
```

### Serviço Frontend
- Tipo: **Github**
- Repositório: **este repositório atual**
- Branch: `main`
- Caminho de Build: `/`

### Variável do Frontend
```
VITE_API_URL=https://url-publica-do-backend-easypanel.com/api
```
