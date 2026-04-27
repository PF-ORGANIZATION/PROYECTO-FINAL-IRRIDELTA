import React from "react";
import { RESOURCE_TYPES } from "../services/learningContentService";

function LearningItemPreviewCard({ item, showPublishedDate = true }) {
  if (!item) {
    return null;
  }

  return (
    <article className="rounded-2xl bg-white p-6 shadow-md">
      <div className="mb-3">
        <h2 className="text-2xl font-bold text-gray-900">{item.titulo}</h2>
      </div>

      {item.descripcion && (
        <p className="mb-5 text-sm leading-6 text-gray-600">{item.descripcion}</p>
      )}

      {item.modulos?.length > 0 && (
        <div className="space-y-4">
          {item.modulos.map((module, moduleIndex) => (
            <section
              key={module.id ?? `${item.id}-module-${moduleIndex}`}
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
                  {module.recursos.map((resource, resourceIndex) => {
                    const isFile = resource.tipo === RESOURCE_TYPES.ARCHIVO;
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
                        key={resource.id ?? `${module.id ?? moduleIndex}-${resourceIndex}`}
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

      {showPublishedDate && item.created_at && (
        <p className="mt-5 text-xs text-gray-400">
          {`Publicado el ${new Date(item.created_at).toLocaleDateString("es-AR")}`}
        </p>
      )}
    </article>
  );
}

export default LearningItemPreviewCard;
