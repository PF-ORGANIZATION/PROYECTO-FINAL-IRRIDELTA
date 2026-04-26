import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AdminLearningManager from "../components/AdminLearningManager";
import UnsavedChangesModal from "../components/UnsavedChangesModal";
import {
  LEARNING_TYPES,
  fetchLearningItems,
} from "../services/learningContentService";
import {
  buildDuplicateForm,
  buildFormFromCapacitacion,
  getInitialCapacitacionForm,
  serializeCapacitacionForm,
} from "../utils/adminCapacitacionesForm";

function AdminCapacitacionEditor() {
  const navigate = useNavigate();
  const location = useLocation();
  const { capacitacionId } = useParams();
  const isNew = !capacitacionId;
  const duplicateFrom = location.state?.duplicateFrom ?? null;
  const initialForm = useMemo(() => {
    if (duplicateFrom) {
      return buildDuplicateForm(duplicateFrom, LEARNING_TYPES.CAPACITACION);
    }

    return getInitialCapacitacionForm(LEARNING_TYPES.CAPACITACION);
  }, [duplicateFrom]);

  const [form, setForm] = useState(initialForm);
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    serializeCapacitacionForm(initialForm)
  );
  const [loading, setLoading] = useState(!isNew && !duplicateFrom);
  const [error, setError] = useState("");
  const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const skipBlockRef = useRef(false);
  const currentSnapshot = useMemo(() => serializeCapacitacionForm(form), [form]);
  const isDirty = !loading && currentSnapshot !== savedSnapshot;

  useEffect(() => {
    skipBlockRef.current = false;
  }, [location.pathname]);

  useEffect(() => {
    if (!isDirty) {
      return undefined;
    }

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) {
      return undefined;
    }

    const handleDocumentClick = (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = event.target.closest("a[href]");

      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }

      const url = new URL(anchor.href, window.location.href);

      if (url.origin !== window.location.origin) {
        return;
      }

      const nextPath = `${url.pathname}${url.search}${url.hash}`;
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;

      if (nextPath === currentPath) {
        return;
      }

      event.preventDefault();
      setPendingNavigation({ to: nextPath });
      setIsUnsavedModalOpen(true);
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [isDirty]);

  useEffect(() => {
    if (isNew) {
      if (duplicateFrom) {
        const duplicatedForm = buildDuplicateForm(
          duplicateFrom,
          LEARNING_TYPES.CAPACITACION
        );
        setForm(duplicatedForm);
        setSavedSnapshot(serializeCapacitacionForm(duplicatedForm));
      } else {
        const emptyForm = getInitialCapacitacionForm(LEARNING_TYPES.CAPACITACION);
        setForm(emptyForm);
        setSavedSnapshot(serializeCapacitacionForm(emptyForm));
      }
      setLoading(false);
      setError("");
      return;
    }

    let ignore = false;

    const loadCapacitacion = async () => {
      setLoading(true);
      setError("");

      try {
        const items = await fetchLearningItems(LEARNING_TYPES.CAPACITACION);
        const currentItem = items.find((item) => item.id === capacitacionId);

        if (ignore) {
          return;
        }

        if (!currentItem) {
          setError("No se encontro la capacitacion que intentas editar.");
          return;
        }

        const nextForm = buildFormFromCapacitacion(
          currentItem,
          LEARNING_TYPES.CAPACITACION
        );
        setForm(nextForm);
        setSavedSnapshot(serializeCapacitacionForm(nextForm));
      } catch (loadError) {
        if (!ignore) {
          console.error("No se pudo cargar la capacitacion", loadError);
          setError("No se pudo cargar la capacitacion.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadCapacitacion();

    return () => {
      ignore = true;
    };
  }, [capacitacionId, duplicateFrom, isNew]);

  const navigateWithoutBlock = (to, options) => {
    skipBlockRef.current = true;
    navigate(to, options);
  };

  const requestNavigation = (to, options) => {
    if (isDirty) {
      setPendingNavigation({ to, options });
      setIsUnsavedModalOpen(true);
      return;
    }

    navigateWithoutBlock(to, options);
  };

  const handleStayEditing = () => {
    setIsUnsavedModalOpen(false);
    setPendingNavigation(null);
  };

  const handleLeaveWithoutSaving = () => {
    setIsUnsavedModalOpen(false);
    if (pendingNavigation?.to) {
      navigateWithoutBlock(pendingNavigation.to, pendingNavigation.options);
    }
    setPendingNavigation(null);
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-600">
        Cargando editor de capacitacion...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
          {error}
        </div>
        <button
          type="button"
          onClick={() => navigateWithoutBlock("/admin/capacitaciones")}
          className="mt-4 rounded-lg bg-slate-800 px-5 py-3 text-sm font-semibold text-white"
        >
          Volver al listado
        </button>
      </div>
    );
  }

  return (
    <>
      <AdminLearningManager
        form={form}
        setForm={setForm}
        title={
          isNew
            ? duplicateFrom
              ? "Duplicar capacitacion"
              : "Nueva capacitacion"
            : form.titulo || "Editar capacitacion"
        }
        onBack={() => requestNavigation("/admin/capacitaciones")}
        onSaveSuccess={(savedItem) => {
          const nextForm = buildFormFromCapacitacion(
            savedItem,
            LEARNING_TYPES.CAPACITACION
          );
          setForm(nextForm);
          setSavedSnapshot(serializeCapacitacionForm(nextForm));
          if (isNew) {
            navigateWithoutBlock(`/admin/capacitaciones/${savedItem.id}/editar`, {
              replace: true,
            });
          }
        }}
        onSaveAndExitSuccess={(savedItem) => {
          const nextForm = buildFormFromCapacitacion(
            savedItem,
            LEARNING_TYPES.CAPACITACION
          );
          setSavedSnapshot(serializeCapacitacionForm(nextForm));
          navigateWithoutBlock("/admin/capacitaciones");
        }}
      />
      <UnsavedChangesModal
        isOpen={isUnsavedModalOpen}
        onStay={handleStayEditing}
        onLeave={handleLeaveWithoutSaving}
      />
    </>
  );
}

export default AdminCapacitacionEditor;
