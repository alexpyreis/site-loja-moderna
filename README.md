# Loja Moderna - Fullstack

Projeto com:
- Frontend em React + Vite
- Backend em Express
- Banco de dados PostgreSQL

## Estrutura

- `frontend/`: interface para cadastrar e listar produtos
- `backend/`: API REST e persistencia em PostgreSQL

## Como rodar

1. Backend

```bash
cd backend
npm install
npm run dev
```

API em `http://localhost:4000`.

Antes de iniciar, configure `backend/.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
DATABASE_SSL=true
ADMIN_SECRET=sua-senha-admin-forte
PORT=4000
```

2. Frontend (em outro terminal)

```bash
cd frontend
npm install
npm run dev
```

Frontend em `http://localhost:5173`.

## Deploy (Vercel + Render + Supabase)

### 1) Backend no Render

- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm run start`

Variaveis de ambiente no Render:

```env
DATABASE_URL=postgresql://postgres.xxxxx:senha@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
DATABASE_SSL=true
ADMIN_SECRET=sua-senha-admin-forte
CORS_ORIGIN=https://seu-front.vercel.app
```

Opcional:

```env
SERVE_FRONTEND=false
```

### 2) Frontend no Vercel

- Root Directory: `frontend`
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

Variavel de ambiente no Vercel:

```env
VITE_API_URL=https://seu-backend.onrender.com/api
VITE_ADMIN_PATH=/sua-rota-admin-unica
```

Observacao: o arquivo `frontend/vercel.json` ja foi adicionado para funcionar com rotas SPA (`/`, `/compras` e sua rota privada de admin) sem erro 404.
Observacao 2: o painel admin nao aparece no menu publico. O acesso e somente pela rota definida em `VITE_ADMIN_PATH`.

## Fluxo

1. Cadastre um produto no formulario da tela.
2. O frontend envia para `POST /api/products`.
3. O backend salva no banco PostgreSQL.
4. O frontend recarrega e mostra o produto no grid.

## Endpoints

- `GET /api/health`
- `GET /api/products`
- `POST /api/admin/session` (login admin)
- `POST /api/products` (admin, header `x-admin-secret`)
- `PUT /api/products/:id` (admin, header `x-admin-secret`)
- `DELETE /api/products/:id` (admin, header `x-admin-secret`)

## Paginas Frontend

- `/` loja publica premium + carrinho
- `/compras` checkout
- `/admin-secreto` painel admin para CRUD de produtos
