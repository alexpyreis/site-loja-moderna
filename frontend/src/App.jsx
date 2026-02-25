import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { NavLink, Route, Routes } from "react-router-dom";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
});

const initialForm = {
  name: "",
  description: "",
  price: "",
  imageUrl: "",
};

function money(value) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem("cart") || "[]"));
  const [cartOpen, setCartOpen] = useState(false);

  async function loadProducts() {
    try {
      setLoading(true);
      const { data } = await api.get("/products");
      setProducts(data);
      setError("");
    } catch {
      setError("Falha ao carregar produtos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  function addToCart(product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setCartOpen(true);
  }

  function changeQty(id, delta) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(id) {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }

  function clearCart() {
    setCart([]);
  }

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );
  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
    [cart]
  );

  return (
    <div className="site">
      <header className="topbar">
        <div className="logo">UNIOSTORE</div>
        <nav>
          <NavLink to="/">Loja</NavLink>
          <NavLink to="/compras">Compras</NavLink>
          <NavLink to="/admin-secreto">Admin</NavLink>
        </nav>
        <button className="cart-pill" onClick={() => setCartOpen((v) => !v)} type="button">
          Carrinho ({cartCount})
        </button>
      </header>

      <Routes>
        <Route
          path="/"
          element={
            <StorePage
              products={products}
              loading={loading}
              error={error}
              onRefresh={loadProducts}
              onAddToCart={addToCart}
            />
          }
        />
        <Route
          path="/compras"
          element={<CheckoutPage cart={cart} cartTotal={cartTotal} onChangeQty={changeQty} />}
        />
        <Route
          path="/admin-secreto"
          element={<AdminPage products={products} onRefresh={loadProducts} onDelete={removeFromCart} />}
        />
      </Routes>

      <aside className={`cart-hud ${cartOpen ? "open" : ""}`}>
        <div className="cart-head">
          <h3>Carrinho</h3>
          <button type="button" onClick={() => setCartOpen(false)}>
            Fechar
          </button>
        </div>
        {cart.length === 0 ? (
          <p className="muted">Seu carrinho esta vazio.</p>
        ) : (
          <div className="cart-items">
            {cart.map((item) => (
              <article key={item.id} className="cart-item">
                <div>
                  <strong>{item.name}</strong>
                  <small>{money(item.price)}</small>
                </div>
                <div className="qty">
                  <button type="button" onClick={() => changeQty(item.id, -1)}>
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button type="button" onClick={() => changeQty(item.id, 1)}>
                    +
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        <footer className="cart-foot">
          <strong>Total: {money(cartTotal)}</strong>
          <button type="button" className="ghost" onClick={clearCart}>
            Limpar
          </button>
        </footer>
      </aside>
    </div>
  );
}

function StorePage({ products, loading, error, onRefresh, onAddToCart }) {
  return (
    <main className="page">
      <section className="hero premium">
        <h1>Moda premium para quem compra com estilo.</h1>
        <p>Selecao moderna com visual black edition.</p>
      </section>

      <section className="section-head">
        <h2>Catalogo</h2>
        <button type="button" onClick={onRefresh}>
          Atualizar
        </button>
      </section>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="muted">Carregando produtos...</p>
      ) : (
        <section className="grid">
          {products.map((product) => (
            <article className="product-card" key={product.id}>
              <div className="media">
                {product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : <span>Sem imagem</span>}
              </div>
              <h3>{product.name}</h3>
              <p>{product.description}</p>
              <strong>{money(product.price)}</strong>
              <button type="button" onClick={() => onAddToCart(product)}>
                Adicionar ao carrinho
              </button>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

function CheckoutPage({ cart, cartTotal, onChangeQty }) {
  const [placed, setPlaced] = useState(false);

  function onSubmit(event) {
    event.preventDefault();
    setPlaced(true);
  }

  return (
    <main className="page">
      <section className="panel dark">
        <h2>Pagina de compras</h2>
        <p className="muted">Finalize seus itens com um fluxo premium.</p>
      </section>
      <section className="panel">
        {cart.length === 0 ? (
          <p className="muted">Adicione produtos no carrinho para continuar.</p>
        ) : (
          <div className="checkout-grid">
            <div className="line-items">
              {cart.map((item) => (
                <article key={item.id} className="line-item">
                  <div>
                    <strong>{item.name}</strong>
                    <p>{money(item.price)}</p>
                  </div>
                  <div className="qty">
                    <button type="button" onClick={() => onChangeQty(item.id, -1)}>
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => onChangeQty(item.id, 1)}>
                      +
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <form className="checkout-form" onSubmit={onSubmit}>
              <h3>Pagamento</h3>
              <input placeholder="Nome completo" required />
              <input type="email" placeholder="Email" required />
              <input placeholder="Endereco de entrega" required />
              <input placeholder="Cartao (demo)" required />
              <strong>Total: {money(cartTotal)}</strong>
              <button type="submit">Finalizar compra</button>
              {placed && <p className="success">Pedido confirmado com sucesso.</p>}
            </form>
          </div>
        )}
      </section>
    </main>
  );
}

function AdminPage({ products, onRefresh }) {
  const [secret, setSecret] = useState(localStorage.getItem("admin_secret") || "");
  const [typedSecret, setTypedSecret] = useState("");
  const [authError, setAuthError] = useState("");
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  async function authLogin(event) {
    event.preventDefault();
    try {
      await api.post("/admin/session", { secret: typedSecret });
      localStorage.setItem("admin_secret", typedSecret);
      setSecret(typedSecret);
      setTypedSecret("");
      setAuthError("");
    } catch {
      setAuthError("Senha admin invalida.");
    }
  }

  function logout() {
    localStorage.removeItem("admin_secret");
    setSecret("");
  }

  async function submitProduct(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, price: Number(form.price) };
      const config = { headers: { "x-admin-secret": secret } };
      if (editingId) {
        await api.put(`/products/${editingId}`, payload, config);
      } else {
        await api.post("/products", payload, config);
      }
      setForm(initialForm);
      setEditingId(null);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id) {
    await api.delete(`/products/${id}`, {
      headers: { "x-admin-secret": secret },
    });
    await onRefresh();
  }

  function startEdit(product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description,
      price: product.price,
      imageUrl: product.imageUrl || "",
    });
  }

  if (!secret) {
    return (
      <main className="page">
        <section className="panel admin-login">
          <h2>Area admin secreta</h2>
          <p className="muted">Apenas para gerenciamento interno da loja.</p>
          <form className="form" onSubmit={authLogin}>
            <input
              value={typedSecret}
              onChange={(e) => setTypedSecret(e.target.value)}
              placeholder="Senha secreta"
              type="password"
              required
            />
            <button type="submit">Entrar</button>
          </form>
          {authError && <p className="error">{authError}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="section-head">
        <h2>Painel Admin</h2>
        <button type="button" onClick={logout} className="ghost">
          Sair
        </button>
      </section>
      <section className="panel">
        <form className="form" onSubmit={submitProduct}>
          <input
            placeholder="Nome"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <textarea
            placeholder="Descricao"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            required
          />
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Preco"
            value={form.price}
            onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
            required
          />
          <input
            placeholder="URL da imagem"
            value={form.imageUrl}
            onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
          />
          <div className="actions">
            <button type="submit" disabled={saving}>
              {saving ? "Salvando..." : editingId ? "Atualizar produto" : "Cadastrar produto"}
            </button>
            {editingId && (
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setEditingId(null);
                  setForm(initialForm);
                }}
              >
                Cancelar edicao
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="grid">
        {products.map((product) => (
          <article className="product-card" key={product.id}>
            <div className="media">
              {product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : <span>Sem imagem</span>}
            </div>
            <h3>{product.name}</h3>
            <p>{product.description}</p>
            <strong>{money(product.price)}</strong>
            <div className="actions">
              <button type="button" onClick={() => startEdit(product)} className="ghost">
                Editar
              </button>
              <button type="button" onClick={() => deleteProduct(product.id)} className="danger">
                Excluir
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
