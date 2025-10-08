// src/components/admin/ProductForm.jsx
import React, { useState, useEffect } from "react";

function ProductForm({ categories, product, onSave }) {
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    stock: "",
    category: categories[0] || "Todos",
  });

  useEffect(() => {
    if (product) {
      setFormData({
        nombre: product.nombre || "",
        descripcion: product.descripcion || "",
        precio: product.precio || "",
        stock: product.stock || "",
        category: product.category || categories[0] || "Todos",
      });
    }
  }, [product, categories]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    setFormData({
      nombre: "",
      descripcion: "",
      precio: "",
      stock: "",
      category: categories[0] || "Todos",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow p-4 rounded">
      <h2 className="text-xl font-semibold mb-4">
        {product ? "Editar Producto" : "Nuevo Producto"}
      </h2>

      <input
        type="text"
        name="nombre"
        placeholder="Nombre"
        value={formData.nombre}
        onChange={handleChange}
        className="border p-2 w-full mb-2"
        required
      />

      <textarea
        name="descripcion"
        placeholder="Descripción"
        value={formData.descripcion}
        onChange={handleChange}
        className="border p-2 w-full mb-2"
      />

      <input
        type="number"
        name="precio"
        placeholder="Precio"
        value={formData.precio}
        onChange={handleChange}
        className="border p-2 w-full mb-2"
        required
      />

      <input
        type="number"
        name="stock"
        placeholder="Stock"
        value={formData.stock}
        onChange={handleChange}
        className="border p-2 w-full mb-2"
        required
      />

      <select
        name="category"
        value={formData.category}
        onChange={handleChange}
        className="border p-2 w-full mb-2"
      >
        {categories.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        Guardar
      </button>
    </form>
  );
}

export default ProductForm;
