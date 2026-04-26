import React from "react";
import { Helmet } from "react-helmet-async";
import LearningCatalog from "../components/LearningCatalog";
import { LEARNING_TYPES } from "../services/learningContentService";

function Capacitaciones() {
  return (
    <>
      <Helmet>
        <title>Capacitaciones | IRRIDELTA</title>
      </Helmet>

      <LearningCatalog
        type={LEARNING_TYPES.CAPACITACION}
        title="CAPACITACIONES"
        emptyMessage="Todavia no hay capacitaciones publicadas."
        onlyPublished
      />
    </>
  );
}

export default Capacitaciones;
