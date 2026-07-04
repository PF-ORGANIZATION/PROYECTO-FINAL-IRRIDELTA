import React from "react";
import KbDocumentList from "../components/KbDocumentList";
import KbPreviewModal from "../components/KbPreviewModal";
import KbUploadPanel from "../components/KbUploadPanel";
import { useAdminKbController } from "../hooks/useAdminKbController";

function AdminKB() {
  const kb = useAdminKbController();

  return (
    <section className="page-wrapper">
      <div className="container-main max-w-4xl space-y-8">
        <KbUploadPanel
          dragHandlers={kb.dragHandlers}
          file={kb.file}
          fileInputRef={kb.fileInputRef}
          isDragging={kb.isDragging}
          isProcessing={kb.isProcessing}
          manualText={kb.manualText}
          onClearFile={kb.clearSelectedFile}
          onFileSelected={kb.validateAndSetFile}
          onManualTextChange={kb.setManualText}
          onSubmit={kb.handleProcess}
          progress={kb.progress}
          status={kb.status}
        />

        <KbDocumentList
          files={kb.filesList}
          isActive={kb.isActive}
          isLoading={kb.isLoadingList}
          onDelete={kb.handleDeleteFile}
          onDownload={kb.handleDownloadFile}
          onPreview={kb.handlePreviewFile}
          onToggleActive={kb.handleToggleActive}
        />

        {kb.preview && (
          <KbPreviewModal
            isActive={kb.isActive}
            isLoading={kb.isLoadingPreview}
            onClose={() => kb.setPreview(null)}
            onToggleActive={kb.handleToggleActive}
            preview={kb.preview}
          />
        )}
      </div>
    </section>
  );
}

export default AdminKB;
