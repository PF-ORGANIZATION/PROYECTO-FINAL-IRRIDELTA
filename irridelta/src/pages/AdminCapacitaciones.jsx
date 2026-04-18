import React from "react";
import AdminLearningManager from "../components/AdminLearningManager";
import { LEARNING_TYPES } from "../services/learningContentService";

function AdminCapacitaciones() {
  return (
    <AdminLearningManager
      type={LEARNING_TYPES.CAPACITACION}
      title="Panel de Capacitaciones"
    />
  );
}

export default AdminCapacitaciones;
