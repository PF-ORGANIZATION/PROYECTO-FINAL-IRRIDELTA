import React from "react";

function AssessmentSummaryCard({
  title,
  questionCount = 0,
  questionCountToShow = null,
  passingScore = null,
  durationMinutes = null,
  isConfigured = false,
  onEdit,
  showMetrics = false,
  description = "Edita la prueba en una vista enfocada y comoda.",
  showStatus = true,
}) {
  const summaryItems = [
    { label: "Preguntas", value: questionCount },
    ...(questionCountToShow !== null
      ? [{ label: "A mostrar", value: questionCountToShow }]
      : []),
    { label: "Aprobacion", value: passingScore !== null ? `${passingScore}%` : "-" },
    {
      label: "Duracion",
      value: durationMinutes !== null ? `${durationMinutes} min` : "-",
    },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="text-sm font-semibold text-gray-900">{title}</h5>
            {showStatus && (
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  isConfigured
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {isConfigured ? "Configurado" : "Incompleto"}
              </span>
            )}
          </div>
          {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
        </div>

        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-slate-900"
        >
          Editar prueba
        </button>
      </div>

      {showMetrics && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryItems.map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {item.label}
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{item.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AssessmentSummaryCard;
