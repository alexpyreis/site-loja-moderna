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
PORT=4000
```

2. Frontend (em outro terminal)

```bash
cd frontend
npm install
npm run dev
```

Frontend em `http://localhost:5173`.

## Fluxo

1. Cadastre um produto no formulario da tela.
2. O frontend envia para `POST /api/products`.
3. O backend salva no banco PostgreSQL.
4. O frontend recarrega e mostra o produto no grid.

## Endpoints

- `GET /api/health`
- `GET /api/products`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`
