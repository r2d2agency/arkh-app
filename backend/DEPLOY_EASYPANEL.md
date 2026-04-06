# Deploy ARKHÉ Backend no Easypanel

## 1. Criar Serviço PostgreSQL
- No Easypanel, crie um serviço **Postgres**
- Anote: host interno, porta (5432), user, password, database

## 2. Criar Serviço Backend (App)
- Tipo: **Github**
- Repositório: `r2d2agency/arkhe-backend` (crie este repo no GitHub)
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
O frontend roda aqui no Lovable. Configure a variável de ambiente:

No código frontend, crie um arquivo `.env`:
```
VITE_API_URL=https://url-publica-do-backend-easypanel.com/api
```

## 4. Credenciais Iniciais
- **Email**: admin@arkhe.app
- **Senha**: arkhe@2026

## 5. Estrutura de Repos

Você precisa de **2 repositórios** no GitHub:

1. **arkhe-backend** — este projeto backend (pasta `backend/`)
2. **arkhe-app** — o frontend (já no Lovable, conecte via GitHub)

### IMPORTANTE:
No Easypanel, o **Caminho de Build** deve ser `/` (raiz) porque o Dockerfile está na raiz do repo backend.

O erro "Repository not found" que você viu acontece porque o repo ainda não existe no GitHub. 
Crie o repo `arkhe-backend` no GitHub primeiro, depois faça push dos arquivos desta pasta `backend/`.

## 6. Como subir o backend

```bash
cd backend
git init
git remote add origin https://github.com/r2d2agency/arkhe-backend.git
git add .
git commit -m "Initial backend setup"
git push -u origin main
```

Depois configure no Easypanel apontando para `r2d2agency/arkhe-backend`.
