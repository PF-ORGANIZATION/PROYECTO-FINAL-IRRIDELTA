import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProducts } from "../context/ProductContext";
import { useAuth } from "../hooks/useAuth";

function AdminProducts() {
  const {
    products,
    categories,
    saveProduct,
    deleteProduct,
    saveCategory,
    deleteCategory,
  } = useProducts();
  const { logOut } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("productos");
  const [search, setSearch] = useState("");
  const [signOutError, setSignOutError] = useState("");

  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);

  const [formProduct, setFormProduct] = useState({
    id: null,
    nombre: "",
    descripcion: "",
    imagen_url: "",
    id_categoria: "",
  });
  const [formCategory, setFormCategory] = useState({
    id: null,
    nombre: "",
  });

  const handleSignOut = async () => {
    setSignOutError("");

    try {
      await logOut();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("No se pudo cerrar la sesion", error);
      setSignOutError("No se pudo cerrar la sesion. Intenta de nuevo.");
    }
  };

  const filteredProducts = useMemo(
    () =>
      products.filter((product) =>
        product.nombre.toLowerCase().includes(search.toLowerCase())
      ),
    [products, search]
  );

  const filteredCategories = useMemo(
    () =>
      categories.filter((category) =>
        category.nombre.toLowerCase().includes(search.toLowerCase())
      ),
    [categories, search]
  );

  const resetProductForm = () => {
    setEditingProduct(null);
    setFormProduct({
      id: null,
      nombre: "",
      descripcion: "",
      imagen_url: "",
      id_categoria: "",
    });
  };

  const resetCategoryForm = () => {
    setEditingCategory(null);
    setFormCategory({
      id: null,
      nombre: "",
    });
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();

    if (!formProduct.id_categoria) {
      alert("Selecciona una categoria");
      return;
    }

    const success = await saveProduct(formProduct);

    if (success) {
      resetProductForm();
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product.id);
    setFormProduct({ ...product });
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();

    const success = await saveCategory(formCategory);

    if (success) {
      resetCategoryForm();
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category.id);
    setFormCategory({ ...category });
  };

  return (
    <div className="min-h-screen bg-gray-100 px-6 py-6 md:px-12 lg:px-24">
      <header className="mb-6 flex items-center justify-between border-b pb-4">
        <h1 className="text-3xl font-bold">Panel de Administracion</h1>
        <button
          onClick={handleSignOut}
          className="rounded-lg bg-red-500 px-4 py-2 font-semibold text-white shadow transition duration-200 hover:bg-red-600"
        >
          Cerrar sesion
        </button>
      </header>

      {signOutError && (
        <div className="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
          {signOutError}
        </div>
      )}

      <div className="mb-6 flex gap-4">
        <button
          onClick={() => {
            setActiveTab("productos");
            setSearch("");
          }}
          className={`rounded px-4 py-2 ${
            activeTab === "productos"
              ? "bg-blue-500 text-white shadow-md"
              : "bg-white shadow"
          }`}
        >
          Productos
        </button>
        <button
          onClick={() => {
            setActiveTab("categorias");
            setSearch("");
          }}
          className={`rounded px-4 py-2 ${
            activeTab === "categorias"
              ? "bg-blue-500 text-white shadow-md"
              : "bg-white shadow"
          }`}
        >
          Categorias
        </button>
      </div>

      <input
        type="text"
        placeholder={`Buscar ${
          activeTab === "productos" ? "productos" : "categorias"
        }...`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-6 w-full rounded border p-3 shadow-sm"
      />

      {activeTab === "productos" && (
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-xl font-semibold">
              {editingProduct ? "Editar producto" : "Nuevo producto"}
            </h2>
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <input
                type="text"
                placeholder="Nombre"
                required
                value={formProduct.nombre}
                onChange={(e) =>
                  setFormProduct({ ...formProduct, nombre: e.target.value })
                }
                className="w-full rounded border p-3"
              />
              <textarea
                placeholder="Descripcion"
                required
                value={formProduct.descripcion}
                onChange={(e) =>
                  setFormProduct({
                    ...formProduct,
                    descripcion: e.target.value,
                  })
                }
                className="w-full rounded border p-3"
              />
              <input
                type="text"
                placeholder="URL de imagen"
                required
                value={formProduct.imagen_url}
                onChange={(e) =>
                  setFormProduct({
                    ...formProduct,
                    imagen_url: e.target.value,
                  })
                }
                className="w-full rounded border p-3"
              />
              <select
                value={formProduct.id_categoria || ""}
                required
                onChange={(e) =>
                  setFormProduct({
                    ...formProduct,
                    id_categoria: e.target.value
                      ? parseInt(e.target.value, 10)
                      : null,
                  })
                }
                className="w-full rounded border p-3"
              >
                <option value="">-- Seleccionar categoria --</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.nombre}
                  </option>
                ))}
              </select>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="rounded-lg bg-blue-500 px-5 py-2 text-white shadow"
                >
                  {editingProduct ? "Actualizar" : "Guardar"}
                </button>
                {editingProduct && (
                  <button
                    type="button"
                    onClick={resetProductForm}
                    className="rounded-lg bg-gray-500 px-5 py-2 text-white shadow"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="max-h-[600px] overflow-y-auto rounded-lg bg-white p-6 shadow-md">
            <ul className="space-y-3">
              {filteredProducts.map((product) => (
                <li
                  key={product.id}
                  className="flex items-start justify-between rounded-lg bg-gray-50 p-4 shadow-sm"
                >
                  <div className="flex-1">
                    <p className="text-lg font-bold">{product.nombre}</p>
                    <p className="text-sm text-gray-700">
                      {product.descripcion}
                    </p>
                    <p className="text-xs text-gray-500">
                      Categoria:{" "}
                      {categories.find(
                        (category) => category.id === product.id_categoria
                      )?.nombre || "N/A"}
                    </p>
                  </div>
                  <div className="ml-4 flex flex-col gap-2">
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="rounded-lg bg-yellow-500 px-4 py-1 text-white"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="rounded-lg bg-red-500 px-4 py-1 text-white"
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {activeTab === "categorias" && (
        <div className="mt-6 grid gap-8 md:grid-cols-2">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-xl font-semibold">
              {editingCategory ? "Editar categoria" : "Nueva categoria"}
            </h2>
            <form onSubmit={handleSaveCategory} className="space-y-4">
              <input
                type="text"
                placeholder="Nombre de categoria"
                value={formCategory.nombre}
                onChange={(e) =>
                  setFormCategory({ ...formCategory, nombre: e.target.value })
                }
                className="w-full rounded border p-3"
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="rounded-lg bg-blue-500 px-5 py-2 text-white shadow"
                >
                  {editingCategory ? "Actualizar" : "Guardar"}
                </button>
                {editingCategory && (
                  <button
                    type="button"
                    onClick={resetCategoryForm}
                    className="rounded-lg bg-gray-500 px-5 py-2 text-white shadow"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="max-h-[600px] overflow-y-auto rounded-lg bg-white p-6 shadow-md">
            <ul className="space-y-3">
              {filteredCategories.map((category) => (
                <li
                  key={category.id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-4 shadow-sm"
                >
                  <span>{category.nombre}</span>
                  <div className="ml-4 flex flex-col gap-2">
                    <button
                      onClick={() => handleEditCategory(category)}
                      className="rounded-lg bg-yellow-500 px-4 py-1 text-white"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deleteCategory(category.id)}
                      className="rounded-lg bg-red-500 px-4 py-1 text-white"
                    >
                      Eliminar
                    </button>
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
