// src/components/admin/ProductList.jsx
import React from "react";

function ProductList({ products, onEdit, onDelete }) {
  if (!products.length) {
    return <p className="text-gray-600">No hay productos cargados.</p>;
  }

  return (
    <div className="bg-white shadow p-4 rounded mt-6">
      <h2 className="text-2xl font-semibold mb-4">Productos</h2>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Nombre</th>
            <th className="border p-2">Precio</th>
            <th className="border p-2">Stock</th>
            <th className="border p-2">Categoría</th>
            <th className="border p-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td className="border p-2">{p.nombre}</td>
              <td className="border p-2">${p.precio}</td>
              <td className="border p-2">{p.stock}</td>
              <td className="border p-2">{p.category}</td>
              <td className="border p-2 space-x-2">
                <button
                  onClick={() => onEdit(p)}
                  className="bg-yellow-500 text-white px-3 py-1 rounded"
                >
                  Editar
                </button>
                <button
                  onClick={() => onDelete(p.id)}
                  className="bg-red-600 text-white px-3 py-1 rounded"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ProductList;
