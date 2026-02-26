import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { NavLink, Route, Routes } from "react-router-dom";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
});

const adminPath = import.meta.env.VITE_ADMIN_PATH || "/_owner-area-2049";
const adminTokenStorageKey = "admin_token";
const adminTokenExpiryStorageKey = "admin_token_expires_at";

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

function ProductCard({ product, onAddToCart, compact = false }) {
  return (
    <article className={`product-card ${compact ? "compact" : ""}`}>
      <div className="media">
        {product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : <span>Sem imagem</span>}
      </div>
      <div className="product-body">
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <div className="product-foot">
          <strong>{money(product.price)}</strong>
          {onAddToCart && (
            <button type="button" onClick={() => onAddToCart(product)}>
              Adicionar
            </button>
          )}
        </div>
      </div>
    </article>
  );
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
    const refreshOnFocus = () => loadProducts();
    const refreshOnVisible = () => {
      if (document.visibilityState === "visible") loadProducts();
    };
    const interval = setInterval(loadProducts, 30000);
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisible);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisible);
    };
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

  function clearCart() {
    setCart([]);
  }

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
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
              onAddToCart={addToCart}
            />
          }
        />
        <Route
          path="/compras"
          element={<CheckoutPage cart={cart} cartTotal={cartTotal} onChangeQty={changeQty} />}
        />
        <Route path={adminPath} element={<AdminPage products={products} onRefresh={loadProducts} />} />
      </Routes>

      <aside className={`cart-hud ${cartOpen ? "open" : ""}`}>
        <div className="cart-head">
          <h3>Sacola</h3>
          <button type="button" className="ghost" onClick={() => setCartOpen(false)}>
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

function StorePage({ products, loading, error, onAddToCart }) {
  const [mainProduct, leftProduct, rightProduct] = products;

  const launchCards = [
    { product: leftProduct, variant: "side" },
    { product: mainProduct, variant: "main" },
    { product: rightProduct, variant: "side" },
  ];

  return (
    <main className="showcase-page">
      <section className="launches-panel">
        <div className="launches-top-band" />
        <h1>LANÇAMENTOS</h1>

        <div className="launches-grid">
          {launchCards.map(({ product, variant }, index) => (
            <article key={`${product?.id || "placeholder"}-${index}`} className={`launch-card ${variant}`}>
              <div className="launch-media">
                {product?.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : <span />}
              </div>
              <div
                className="launch-strip"
                onClick={() => variant === "main" && product && onAddToCart(product)}
                role={variant === "main" && product ? "button" : undefined}
                tabIndex={variant === "main" && product ? 0 : undefined}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && variant === "main" && product) onAddToCart(product);
                }}
              >
                {variant === "main" && product && (
                  <p>
                    <strong>{product.name}</strong>
                    <span>{money(product.price)}</span>
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>

        <h2>COLLECTIONS</h2>
      </section>

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Carregando produtos...</p>}
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
      <section className="panel">
        <h2>Checkout</h2>
        <p className="muted">Revise os itens e finalize com seguranca.</p>
      </section>
      <section className="panel">
        {cart.length === 0 ? (
          <p className="muted">Seu carrinho esta vazio.</p>
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
  const [token, setToken] = useState(localStorage.getItem(adminTokenStorageKey) || "");
  const [typedSecret, setTypedSecret] = useState("");
  const [authError, setAuthError] = useState("");
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const storedExpiry = Number(localStorage.getItem(adminTokenExpiryStorageKey) || 0);
    if (!token || !storedExpiry || storedExpiry <= Date.now()) {
      localStorage.removeItem(adminTokenStorageKey);
      localStorage.removeItem(adminTokenExpiryStorageKey);
      setToken("");
    }
  }, [token]);

  async function authLogin(event) {
    event.preventDefault();
    try {
      const { data } = await api.post("/admin/session", { secret: typedSecret });
      localStorage.setItem(adminTokenStorageKey, data.token);
      localStorage.setItem(adminTokenExpiryStorageKey, String(data.expiresAt));
      setToken(data.token);
      setTypedSecret("");
      setAuthError("");
    } catch {
      setAuthError("Senha admin invalida.");
    }
  }

  async function logout() {
    try {
      await api.post(
        "/admin/logout",
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } finally {
      localStorage.removeItem(adminTokenStorageKey);
      localStorage.removeItem(adminTokenExpiryStorageKey);
      setToken("");
    }
  }

  async function submitProduct(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, price: Number(form.price) };
      const config = { headers: { Authorization: `Bearer ${token}` } };
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
      headers: { Authorization: `Bearer ${token}` },
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

  if (!token) {
    return (
      <main className="page">
        <section className="panel admin-login">
          <h2>Acesso interno</h2>
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

      <section className="grid admin-products">
        {products.map((product) => (
          <article key={product.id} className="panel admin-product">
            <ProductCard product={product} />
            <div className="actions">
              <button type="button" className="ghost" onClick={() => startEdit(product)}>
                Editar
              </button>
              <button type="button" className="danger" onClick={() => deleteProduct(product.id)}>
                Remover
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
