// src/context/ProductContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const ProductContext = createContext();

export function ProductProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Traer productos con join de categoría
      const { data: prodData, error: prodError } = await supabase
        .from("productos")
        .select(`
          id,
          nombre,
          descripcion,
          imagen_url,
          id_categoria,
          categorias (id, nombre)
        `);

      if (prodError) throw prodError;

      const mappedProducts = prodData.map((p) => ({
        ...p,
        category: p.categorias ? p.categorias.nombre : "Sin categoría",
      }));

      // Traer categorías
      const { data: catData, error: catError } = await supabase
        .from("categorias")
        .select("id, nombre");

      if (catError) throw catError;

      setProducts(mappedProducts);
      setCategories(catData);
    } catch (err) {
      console.error("Error cargando datos:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Guardar producto
  const saveProduct = async (product) => {
    try {
      if (product.id) {
        const { error } = await supabase
          .from("productos")
          .update({
            nombre: product.nombre,
            descripcion: product.descripcion,
            imagen_url: product.imagen_url,
            id_categoria: product.id_categoria,
          })
          .eq("id", product.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("productos").insert([
          {
            nombre: product.nombre,
            descripcion: product.descripcion,
            imagen_url: product.imagen_url,
            id_categoria: product.id_categoria,
          },
        ]);
        if (error) throw error;
      }
      fetchData();
      return true;
    } catch (err) {
      console.error("Error guardando producto:", err.message);
      return false;
    }
  };

  // Eliminar producto
  const deleteProduct = async (id) => {
    try {
      const { error } = await supabase.from("productos").delete().eq("id", id);
      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error("Error eliminando producto:", err.message);
    }
  };

  // Guardar categoría
  const saveCategory = async (categoria) => {
    try {
      if (categoria.id) {
        const { error } = await supabase
          .from("categorias")
          .update({ nombre: categoria.nombre })
          .eq("id", categoria.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categorias").insert([{ nombre: categoria.nombre }]);
        if (error) throw error;
      }
      fetchData();
      return true;
    } catch (err) {
      console.error("Error guardando categoría:", err.message);
      return false;
    }
  };

  // Eliminar categoría
  const deleteCategory = async (id) => {
    try {
      const { error } = await supabase.from("categorias").delete().eq("id", id);
      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error("Error eliminando categoría:", err.message);
    }
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        categories,
        loading,
        error,
        saveProduct,
        deleteProduct,
        saveCategory,
        deleteCategory,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
}

export const useProducts = () => useContext(ProductContext);

