import React, { useEffect, useState } from "react";
import {
  RESOURCE_TYPES,
  fetchLearningItems,
} from "../services/learningContentService";

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

                {item.modulos?.length > 0 && (
                  <div className="space-y-4">
                    {item.modulos.map((module, moduleIndex) => (
                      <section
                        key={module.id}
                        className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                      >
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                            Modulo {moduleIndex + 1}
                          </p>
                          <h3 className="mt-1 text-lg font-bold text-gray-900">
                            {module.titulo}
                          </h3>
                          {module.descripcion && (
                            <p className="mt-2 text-sm leading-6 text-gray-600">
                              {module.descripcion}
                            </p>
                          )}
                        </div>

                        {module.recursos?.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {module.recursos.map((resource) => {
                              const isFile =
                                resource.tipo === RESOURCE_TYPES.ARCHIVO;
                              const href = isFile
                                ? resource.archivo_url
                                : resource.youtube_url;
                              const label = isFile
                                ? resource.archivo_nombre ?? "Abrir archivo"
                                : "Ver YouTube";

                              if (!href) {
                                return null;
                              }

                              return (
                                <a
                                  key={resource.id}
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={
                                    isFile
                                      ? "rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-blue-600"
                                      : "rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-red-600"
                                  }
                                >
                                  {label}
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </section>
                    ))}
                  </div>
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
