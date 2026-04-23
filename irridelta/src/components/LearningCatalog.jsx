import React, { useEffect, useState } from "react";
import { fetchLearningItems } from "../services/learningContentService";

function LearningCatalog({ type, title, emptyMessage }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    const loadItems = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await fetchLearningItems(type);

        if (!ignore) {
          setItems(data);
        }
      } catch (loadError) {
        if (!ignore) {
          console.error("No se pudo cargar el contenido formativo", loadError);
          setError(
            "No se pudo cargar el contenido. Revisa que las tablas esten creadas en Supabase."
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadItems();

    return () => {
      ignore = true;
    };
  }, [type]);

  return (
    <section className="min-h-[70vh] bg-gray-50 px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold tracking-wide text-gray-900 md:text-6xl">
            {title}
          </h1>
        </header>

        {loading && (
          <div className="rounded-xl bg-white p-8 text-center text-gray-600 shadow">
            Cargando contenido...
          </div>
        )}

        {!loading && error && (
          <div className="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="rounded-xl bg-white p-8 text-center text-gray-600 shadow">
            {emptyMessage}
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl bg-white p-6 shadow-md transition duration-200 hover:shadow-lg"
              >
                <div className="mb-3">
                  <h2 className="text-2xl font-bold text-gray-900">{item.titulo}</h2>
                </div>

                {item.descripcion && (
                  <p className="mb-5 text-sm leading-6 text-gray-600">
                    {item.descripcion}
                  </p>
                )}

                <p className="mt-5 text-xs text-gray-400">
                  {item.created_at
                    ? `Publicado el ${new Date(item.created_at).toLocaleDateString("es-AR")}`
                    : ""}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default LearningCatalog;
