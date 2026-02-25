import { useEffect, useMemo, useRef, useState } from "react";
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
const adminPath = import.meta.env.VITE_ADMIN_PATH || "/_owner-area-2049";
const adminTokenStorageKey = "admin_token";
const adminTokenExpiryStorageKey = "admin_token_expires_at";

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
          path={adminPath}
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
  const carouselRef = useRef(null);
  const autoplayRef = useRef(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [autoplayPaused, setAutoplayPaused] = useState(false);

  const featuredProducts = useMemo(() => products.slice(0, 8), [products]);
  const budgetProducts = useMemo(
    () => [...products].sort((a, b) => Number(a.price) - Number(b.price)).slice(0, 4),
    [products]
  );
  const premiumProducts = useMemo(
    () => [...products].sort((a, b) => Number(b.price) - Number(a.price)).slice(0, 4),
    [products]
  );
  const hasCarousel = featuredProducts.length > 1;
  const centerFeaturedTrack = featuredProducts.length > 0 && featuredProducts.length <= 3;
  const singleFeaturedCard = featuredProducts.length === 1;

  function scrollCarousel(direction) {
    if (!carouselRef.current) return;
    const amount = Math.max(carouselRef.current.clientWidth * 0.8, 260);
    carouselRef.current.scrollBy({ left: direction * amount, behavior: "smooth" });
  }

  function goToCarouselStart() {
    if (!carouselRef.current) return;
    carouselRef.current.scrollTo({ left: 0, behavior: "smooth" });
  }

  function scrollToSlide(index) {
    if (!carouselRef.current) return;
    const slide = carouselRef.current.children[index];
    if (!slide) return;
    carouselRef.current.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
  }

  function goToNextSlide() {
    if (!hasCarousel) return;
    const nextIndex = activeSlide >= featuredProducts.length - 1 ? 0 : activeSlide + 1;
    scrollToSlide(nextIndex);
  }

  useEffect(() => {
    if (!carouselRef.current || featuredProducts.length === 0) {
      setActiveSlide(0);
      return;
    }

    const track = carouselRef.current;
    const onScroll = () => {
      const firstSlide = track.children[0];
      if (!firstSlide) {
        setActiveSlide(0);
        return;
      }
      const slideWidth = firstSlide.clientWidth + 12;
      const index = Math.max(0, Math.min(featuredProducts.length - 1, Math.round(track.scrollLeft / slideWidth)));
      setActiveSlide(index);
    };

    onScroll();
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, [featuredProducts]);

  useEffect(() => {
    if (!hasCarousel || autoplayPaused) return;
    autoplayRef.current = setInterval(goToNextSlide, 3500);
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [hasCarousel, autoplayPaused, activeSlide, featuredProducts.length]);

  function ProductCard({ product, cardClassName = "product-card" }) {
    return (
      <article className={cardClassName} key={product.id}>
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
    );
  }

  return (
    <main className="page">
      <section className="hero premium">
        <div className="hero-copy">
          <h1>Moda premium para quem compra com estilo.</h1>
          <p>Selecao moderna com visual black edition. O catalogo atualiza automaticamente.</p>
        </div>
        <button type="button" className="ghost hero-action" onClick={goToCarouselStart}>
          Ver destaques
        </button>
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
        <>
          <section className="panel carousel-panel">
            <div className="section-head section-head-tight">
              <h2>Destaques ({featuredProducts.length})</h2>
              {hasCarousel && (
                <div className="carousel-controls">
                  <button type="button" className="ghost carousel-btn" onClick={() => scrollCarousel(-1)}>
                    {"<"}
                  </button>
                  <button type="button" className="ghost carousel-btn" onClick={() => scrollCarousel(1)}>
                    {">"}
                  </button>
                </div>
              )}
            </div>
            <div
              className={`carousel-track ${centerFeaturedTrack ? "centered" : ""} ${
                singleFeaturedCard ? "single" : ""
              }`}
              ref={carouselRef}
              onMouseEnter={() => setAutoplayPaused(true)}
              onMouseLeave={() => setAutoplayPaused(false)}
              onTouchStart={() => setAutoplayPaused(true)}
              onTouchEnd={() => setAutoplayPaused(false)}
            >
              {featuredProducts.map((product) => (
                <ProductCard
                  product={product}
                  key={`featured-${product.id}`}
                  cardClassName="product-card carousel-card"
                />
              ))}
            </div>
            {featuredProducts.length > 1 && (
              <div className="carousel-dots" role="tablist" aria-label="Selecionar slide de destaque">
                {featuredProducts.map((product, index) => (
                  <button
                    key={`dot-${product.id}`}
                    type="button"
                    className={`carousel-dot ${index === activeSlide ? "active" : ""}`}
                    aria-label={`Ir para destaque ${index + 1}`}
                    aria-selected={index === activeSlide}
                    onClick={() => scrollToSlide(index)}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="section-head section-head-tight">
              <h2>Mais acessiveis ({budgetProducts.length})</h2>
            </div>
            <div className="grid grid-featured">
              {budgetProducts.map((product) => (
                <ProductCard product={product} key={`budget-${product.id}`} />
              ))}
            </div>
          </section>

          <section>
            <div className="section-head section-head-tight">
              <h2>Premium ({premiumProducts.length})</h2>
            </div>
            <div className="grid grid-featured">
              {premiumProducts.map((product) => (
                <ProductCard product={product} key={`premium-${product.id}`} />
              ))}
            </div>
          </section>

          <section>
            <div className="section-head section-head-tight">
              <h2>Todos os produtos ({products.length})</h2>
            </div>
            <div className="grid">
              {products.map((product) => (
                <ProductCard product={product} key={product.id} />
              ))}
            </div>
          </section>
        </>
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
  const [token, setToken] = useState(localStorage.getItem(adminTokenStorageKey) || "");
  const [typedSecret, setTypedSecret] = useState("");
  const [authError, setAuthError] = useState("");
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

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
    } catch {
      // Se a sessao ja expirou no backend, ainda limpamos localmente.
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

  useEffect(() => {
    const storedExpiry = Number(localStorage.getItem(adminTokenExpiryStorageKey) || 0);
    if (!token || !storedExpiry || storedExpiry <= Date.now()) {
      localStorage.removeItem(adminTokenStorageKey);
      localStorage.removeItem(adminTokenExpiryStorageKey);
      setToken("");
    }
  }, [token]);

  if (!token) {
    return (
      <main className="page">
        <section className="panel admin-login">
          <h2>Acesso interno</h2>
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
