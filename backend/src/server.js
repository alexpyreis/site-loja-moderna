const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4000;
const ADMIN_SECRET = process.env.ADMIN_SECRET || "troque-esta-senha";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL nao configurada.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

app.use(cors());
app.use(express.json());

function requireAdmin(req, res, next) {
  const provided = req.headers["x-admin-secret"];
  if (!provided || provided !== ADMIN_SECRET) {
    return res.status(401).json({ error: "Acesso admin negado." });
  }
  next();
}

app.get("/api/health", (_, res) => {
  res.json({ ok: true });
});

app.post("/api/admin/session", (req, res) => {
  const { secret } = req.body || {};
  if (!secret || secret !== ADMIN_SECRET) {
    return res.status(401).json({ ok: false, error: "Senha admin invalida." });
  }
  return res.json({ ok: true });
});

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price NUMERIC(12, 2) NOT NULL CHECK(price >= 0),
      "imageUrl" TEXT,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

function parseProductInput(body) {
  const { name, description, price, imageUrl } = body;
  if (!name || !description || price === undefined || price === null) {
    return { error: "name, description e price sao obrigatorios." };
  }

  const parsedPrice = Number(price);
  if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
    return { error: "price precisa ser um numero valido." };
  }

  return {
    name: String(name).trim(),
    description: String(description).trim(),
    price: parsedPrice,
    imageUrl: imageUrl ? String(imageUrl).trim() : null,
  };
}

app.get("/api/products", async (_, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY "createdAt" DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Falha ao carregar produtos." });
  }
});

app.post("/api/products", requireAdmin, async (req, res) => {
  const input = parseProductInput(req.body);
  if (input.error) {
    return res.status(400).json({ error: input.error });
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO products (name, description, price, "imageUrl")
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      [input.name, input.description, input.price, input.imageUrl]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Falha ao cadastrar produto." });
  }
});

app.put("/api/products/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "ID invalido." });
  }

  const input = parseProductInput(req.body);
  if (input.error) {
    return res.status(400).json({ error: input.error });
  }

  try {
    const result = await pool.query(
      `
        UPDATE products
        SET name = $1, description = $2, price = $3, "imageUrl" = $4, "updatedAt" = NOW()
        WHERE id = $5
        RETURNING *
      `,
      [input.name, input.description, input.price, input.imageUrl, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Produto nao encontrado." });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Falha ao atualizar produto." });
  }
});

app.delete("/api/products/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "ID invalido." });
  }

  try {
    const result = await pool.query("DELETE FROM products WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Produto nao encontrado." });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Falha ao remover produto." });
  }
});

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API rodando em http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Erro ao iniciar o banco de dados", error);
    process.exit(1);
  });
