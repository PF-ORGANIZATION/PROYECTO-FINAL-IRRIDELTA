// src/components/admin/CategoryForm.jsx
import React, { useState, useEffect } from "react";

function CategoryForm({ category, onSave }) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (category) setName(category.name || "");
  }, [category]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name });
    setName("");
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow p-4 rounded">
      <h2 className="text-xl font-semibold mb-4">
        {category ? "Editar Categoría" : "Nueva Categoría"}
      </h2>

      <input
        type="text"
        placeholder="Nombre de la categoría"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border p-2 w-full mb-2"
        required
      />

      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Guardar
      </button>
    </form>
  );
}

export default CategoryForm;
