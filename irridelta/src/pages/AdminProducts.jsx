import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom"; // 👈 Importamos useNavigate
import { useProducts } from "../context/ProductContext";

// ⚠️ Asumo que puedes importar supabase aquí para cerrar la sesión
// Si usas otro sistema, reemplaza 'supabase' por tu método de auth.
// import { supabase } from '../supabaseClient'; 

function AdminProducts() {
  const { products, categories, saveProduct, deleteProduct, saveCategory, deleteCategory } = useProducts();
  
  // 👈 Usamos useNavigate para la redirección
  const navigate = useNavigate(); 

  const [activeTab, setActiveTab] = useState("productos");
  const [search, setSearch] = useState("");

  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);

  const [formProduct, setFormProduct] = useState({ id: null, nombre: "", descripcion: "", imagen_url: "", id_categoria: "" });
  const [formCategory, setFormCategory] = useState({ id: null, nombre: "" });

  // --- LÓGICA CERRAR SESIÓN ---
  const handleSignOut = async () => {
    // ⚠️ Esta es la lógica de cierre de sesión. AJUSTA esto a tu implementación real.
    // Ejemplo de Supabase:
    // const { error } = await supabase.auth.signOut();
    
    // if (!error) {
    //   navigate("/"); // Redirige a la página de inicio
    // } else {
    //   alert("Error al cerrar sesión.");
    //   console.error(error);
    // }
    
    // EJEMPLO SÓLO DE REDIRECCIÓN (para que funcione en el sandbox)
    // Simula el cierre de sesión y redirige
    console.log("Sesión cerrada. Redirigiendo a /");
    navigate("/"); 
  };
  
  // Filtrado rápido por búsqueda (sin cambios)
  const filteredProducts = useMemo(
    () => products.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase())),
    [products, search]
  );

  const filteredCategories = useMemo(
    () => categories.filter(c => c.nombre.toLowerCase().includes(search.toLowerCase())),
    [categories, search]
  );

  // --- HANDLERS PRODUCTOS (sin cambios) ---
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!formProduct.id_categoria) return alert("Selecciona una categoría");
    const success = await saveProduct(formProduct);
    if (success) {
      setEditingProduct(null);
      setFormProduct({ id: null, nombre: "", descripcion: "", imagen_url: "", id_categoria: "" });
    }
  };

  const handleEditProduct = (p) => {
    setEditingProduct(p.id);
    setFormProduct({ ...p });
  };

  // --- HANDLERS CATEGORÍAS (sin cambios) ---
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    const success = await saveCategory(formCategory);
    if (success) {
      setEditingCategory(null);
      setFormCategory({ id: null, nombre: "" });
    }
  };

  const handleEditCategory = (c) => {
    setEditingCategory(c.id);
    setFormCategory({ ...c });
  };

  return (
    <div className="px-6 md:px-12 lg:px-24 py-6 bg-gray-100 min-h-screen">
      
      {/* 🎯 HEADER CON CERRAR SESIÓN */}
      <header className="flex justify-between items-center mb-6 border-b pb-4">
        <h1 className="text-3xl font-bold">Panel de Administración</h1>
        <button
          onClick={handleSignOut}
          className="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-lg shadow transition duration-200"
        >
          Cerrar Sesión
        </button>
      </header>
      {/* ---------------------------------- */}

      {/* --- TABS --- */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => { setActiveTab("productos"); setSearch(""); }}
          className={`px-4 py-2 rounded ${activeTab === "productos" ? "bg-blue-500 text-white shadow-md" : "bg-white shadow"}`}
        >
          Productos
        </button>
        <button
          onClick={() => { setActiveTab("categorias"); setSearch(""); }}
          className={`px-4 py-2 rounded ${activeTab === "categorias" ? "bg-blue-500 text-white shadow-md" : "bg-white shadow"}`}
        >
          Categorías
        </button>
      </div>

      {/* --- BUSCADOR y Resto del contenido (sin cambios) --- */}
      <input
        type="text"
        placeholder={`Buscar ${activeTab === "productos" ? "productos" : "categorías"}...`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border p-3 w-full rounded mb-6 shadow-sm"
      />

      {/* ... (Contenido de Tabs Productos y Categorías) ... */}
      
      {/* --- TAB PRODUCTOS --- */}
      {activeTab === "productos" && (
        <div className="grid md:grid-cols-2 gap-8">
          {/* FORM PRODUCTOS */}
          <div className="bg-white shadow-md p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">
              {editingProduct ? "Editar Producto" : "Nuevo Producto"}
            </h2>
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <input
                type="text"
                placeholder="Nombre"
                required
                value={formProduct.nombre}
                onChange={(e) => setFormProduct({ ...formProduct, nombre: e.target.value })}
                className="border p-3 w-full rounded"
              />
              <textarea
                placeholder="Descripción"
                required
                value={formProduct.descripcion}
                onChange={(e) => setFormProduct({ ...formProduct, descripcion: e.target.value })}
                className="border p-3 w-full rounded"
              />
              <input
                type="text"
                placeholder="URL de imagen"
                required
                value={formProduct.imagen_url}
                onChange={(e) => setFormProduct({ ...formProduct, imagen_url: e.target.value })}
                className="border p-3 w-full rounded"
              />
              <select
                value={formProduct.id_categoria || ""}
                required
                onChange={(e) => setFormProduct({ ...formProduct, id_categoria: e.target.value ? parseInt(e.target.value) : null })}
                className="border p-3 w-full rounded"
              >
                <option value="">-- Seleccionar categoría --</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <div className="flex gap-3">
                <button type="submit" className="bg-blue-500 text-white px-5 py-2 rounded-lg shadow">
                  {editingProduct ? "Actualizar" : "Guardar"}
                </button>
                {editingProduct && (
                  <button
                    type="button"
                    onClick={() => { setEditingProduct(null); setFormProduct({ id: null, nombre: "", descripcion: "", imagen_url: "", id_categoria: "" }); }}
                    className="bg-gray-500 text-white px-5 py-2 rounded-lg shadow"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* LISTA PRODUCTOS */}
          <div className="bg-white shadow-md rounded-lg p-6 max-h-[600px] overflow-y-auto">
            <ul className="space-y-3">
              {filteredProducts.map((p) => (
                <li key={p.id} className="flex justify-between items-start bg-gray-50 p-4 rounded-lg shadow-sm">
                  <div className="flex-1">
                    <p className="font-bold text-lg">{p.nombre}</p>
                    <p className="text-sm text-gray-700">{p.descripcion}</p>
                    <p className="text-xs text-gray-500">
                      Categoría: {categories.find((c) => c.id === p.id_categoria)?.nombre || "N/A"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    <button onClick={() => handleEditProduct(p)} className="bg-yellow-500 text-white px-4 py-1 rounded-lg">Editar</button>
                    <button onClick={() => deleteProduct(p.id)} className="bg-red-500 text-white px-4 py-1 rounded-lg">Eliminar</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* --- TAB CATEGORÍAS --- */}
      {activeTab === "categorias" && (
        <div className="grid md:grid-cols-2 gap-8 mt-6">
          {/* FORM CATEGORÍAS */}
          <div className="bg-white shadow-md p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">
              {editingCategory ? "Editar Categoría" : "Nueva Categoría"}
            </h2>
            <form onSubmit={handleSaveCategory} className="space-y-4">
              <input
                type="text"
                placeholder="Nombre de categoría"
                value={formCategory.nombre}
                onChange={(e) => setFormCategory({ ...formCategory, nombre: e.target.value })}
                className="border p-3 w-full rounded"
              />
              <div className="flex gap-3">
                <button type="submit" className="bg-blue-500 text-white px-5 py-2 rounded-lg shadow">
                  {editingCategory ? "Actualizar" : "Guardar"}
                </button>
                {editingCategory && (
                  <button
                    type="button"
                    onClick={() => { setEditingCategory(null); setFormCategory({ id: null, nombre: "" }); }}
                    className="bg-gray-500 text-white px-5 py-2 rounded-lg shadow"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* LISTA CATEGORÍAS */}
          <div className="bg-white shadow-md rounded-lg p-6 max-h-[600px] overflow-y-auto">
            <ul className="space-y-3">
              {filteredCategories.map((c) => (
                <li key={c.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-lg shadow-sm">
                  <span>{c.nombre}</span>
                  <div className="flex flex-col gap-2 ml-4">
                    <button onClick={() => handleEditCategory(c)} className="bg-yellow-500 text-white px-4 py-1 rounded-lg">Editar</button>
                    <button onClick={() => deleteCategory(c.id)} className="bg-red-500 text-white px-4 py-1 rounded-lg">Eliminar</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminProducts;

