import React, { useState, useEffect, useMemo } from "react";
import ProductCard from "../components/ProductCard";
import { supabase } from "../supabaseClient.js";
import { Search } from "lucide-react";

const INITIAL_CATEGORIES = ["Todos"];

function Products({ whatsappLink }) {
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState(""); // 👈 Nuevo buscador de categorías

  // Carga productos y categorías desde Supabase
  useEffect(() => {
    async function keepAlive() {
    try {
      const key = import.meta.env.VITE_SUPABASE_URL
      await fetch(key + "/rest/v1/productos", {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_KEY
        }
      });
    } catch (err) {
      console.warn("Ping Supabase falló (no importa):", err.message);
    }
  }

  keepAlive();

    async function fetchData() {
      setLoading(true);
      setError(null);

      const { data: fetchedProducts, error: productsError } = await supabase
        .from("productos")
        .select(`*, categoria:categorias(nombre)`);

      if (productsError) {
        console.error("Error cargando productos:", productsError);
        setError("Hubo un error al cargar los productos.");
        setLoading(false);
        return;
      }

      const { data: fetchedCategories, error: categoriesError } = await supabase
        .from("categorias")
        .select("nombre");

      if (categoriesError) {
        console.error("Error cargando categorías:", categoriesError);
        setError("Error al cargar categorías.");
      } else {
        const categoryNames = fetchedCategories.map((c) => c.nombre);
        const sortedCategories = categoryNames.sort((a, b) =>
          a.localeCompare(b)
        );
        setCategories(["Todos", ...sortedCategories]);
      }

      const productsWithCategoryName = fetchedProducts.map((p) => ({
        ...p,
        category: p.categoria ? p.categoria.nombre : "Sin Categoría",
      }));

      setAllProducts(productsWithCategoryName);
      setLoading(false);
    }

    fetchData();
  }, []);

  // Filtra productos según categoría seleccionada
  const filteredProducts = useMemo(() => {
    if (selectedCategory === "Todos") return allProducts;
    return allProducts.filter((p) => p.category === selectedCategory);
  }, [allProducts, selectedCategory]);

  // Filtra categorías según texto del buscador
  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categories;
    return categories.filter((c) =>
      c.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [categories, searchTerm]);

  if (loading) {
    return (
      <div className="w-full bg-gray-50 p-12 text-center text-xl text-gray-600 min-h-screen">
        Cargando catálogo...
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-red-100 p-12 text-center text-xl text-red-700 min-h-screen">
        ❌ Error: {error}
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-50 p-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-extrabold text-gray-800 border-b pb-2 mb-8">
          Catálogo de Productos
        </h2>

        {/* 🔍 Buscador de categorías */}
        <div className="flex items-center gap-2 mb-6 bg-white border border-gray-300 rounded-lg px-4 py-2 shadow-sm max-w-md">
          <Search className="w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar categoría..."
            className="flex-1 outline-none text-gray-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* 🏷️ Lista de categorías (estilo anterior) */}
        <div className="flex flex-wrap -safe gap-3 mb-10">
          {filteredCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2 rounded-full font-medium transition-all duration-200 border ${
                selectedCategory === cat
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-green-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 🛒 Productos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.map((p) => (
            <ProductCard key={p.id} product={p} whatsappLink={whatsappLink} />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-20 text-xl text-gray-500">
            No se encontraron productos en la categoría "{selectedCategory}".
          </div>
        )}
      </div>
    </div>
  );
}

export default Products;



