import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
});

const initialForm = {
  name: "",
  description: "",
  price: "",
  imageUrl: "",
};

export default function App() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const productCount = useMemo(() => products.length, [products]);

  async function loadProducts() {
    try {
      setLoading(true);
      const { data } = await api.get("/products");
      setProducts(data);
    } catch {
      setError("Falha ao carregar produtos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function onChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      await api.post("/products", {
        ...form,
        price: Number(form.price),
      });

      setForm(initialForm);
      await loadProducts();
    } catch {
      setError("Falha ao cadastrar produto. Verifique os campos.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id) {
    try {
      await api.delete(`/products/${id}`);
      setProducts((prev) => prev.filter((product) => product.id !== id));
    } catch {
      setError("Não foi possível remover o produto.");
    }
  }

  return (
    <main className="page">
      <header className="hero">
        <h1>Loja Moderna</h1>
        <p>Cadastre produtos no backend e veja no frontend em tempo real.</p>
      </header>

      <section className="panel">
        <h2>Cadastrar Produto</h2>
        <form onSubmit={onSubmit} className="form">
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            placeholder="Nome do produto"
            required
          />
          <textarea
            name="description"
            value={form.description}
            onChange={onChange}
            placeholder="Descrição"
            required
          />
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={onChange}
            placeholder="Preço (ex: 129.90)"
            required
          />
          <input
            name="imageUrl"
            value={form.imageUrl}
            onChange={onChange}
            placeholder="URL da imagem (opcional)"
          />
          <button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Cadastrar"}
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Produtos ({productCount})</h2>
          <button onClick={loadProducts} type="button">
            Atualizar
          </button>
        </div>

        {error && <p className="error">{error}</p>}
        {loading ? (
          <p>Carregando...</p>
        ) : (
          <div className="grid">
            {products.map((product) => (
              <article className="card" key={product.id}>
                <div className="media">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} />
                  ) : (
                    <span>Sem imagem</span>
                  )}
                </div>
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                <strong>
                  {product.price.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </strong>
                <button
                  className="danger"
                  type="button"
                  onClick={() => deleteProduct(product.id)}
                >
                  Excluir
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
