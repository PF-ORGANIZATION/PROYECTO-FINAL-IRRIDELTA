const CERTIFICATE_WIDTH = 1200;
const CERTIFICATE_HEIGHT = 850;

function sanitizeFileName(value) {
  return (value || "certificado")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function formatCertificateDate(value) {
  const date = value ? new Date(value) : new Date();

  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) {
    ctx.fillText(line, x, currentY);
  }

  return currentY;
}

function getCertificateFileBase(data) {
  return sanitizeFileName(
    `certificado-${data.requesterName}-${data.capacitacionTitle || data.certificationTitle}`
  );
}

export function drawCertificateToCanvas(canvas, data) {
  const ctx = canvas.getContext("2d");
  const certificateDate = formatCertificateDate(data.approvedAt);
  const capacitacionTitle = data.capacitacionTitle || data.certificationTitle;

  canvas.width = CERTIFICATE_WIDTH;
  canvas.height = CERTIFICATE_HEIGHT;

  const background = ctx.createLinearGradient(0, 0, CERTIFICATE_WIDTH, CERTIFICATE_HEIGHT);
  background.addColorStop(0, "#0f172a");
  background.addColorStop(0.52, "#14532d");
  background.addColorStop(1, "#052e16");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, CERTIFICATE_WIDTH, CERTIFICATE_HEIGHT);

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  for (let index = 0; index < 11; index += 1) {
    const offset = index * 120;
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset - 420, CERTIFICATE_HEIGHT);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(34,197,94,0.12)";
  ctx.beginPath();
  ctx.arc(980, 170, 220, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#86efac";
  ctx.lineWidth = 5;
  ctx.strokeRect(58, 58, CERTIFICATE_WIDTH - 116, CERTIFICATE_HEIGHT - 116);

  ctx.strokeStyle = "rgba(255,255,255,0.42)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(84, 84, CERTIFICATE_WIDTH - 168, CERTIFICATE_HEIGHT - 168);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 54px Arial";
  ctx.fillText("Certificado de Aprobacion", CERTIFICATE_WIDTH / 2, 165);

  ctx.font = "500 22px Arial";
  ctx.fillStyle = "#d1fae5";
  ctx.fillText("IRRIDELTA certifica que", CERTIFICATE_WIDTH / 2, 225);

  ctx.font = "700 58px Arial";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(data.requesterName, CERTIFICATE_WIDTH / 2, 305);

  ctx.font = "400 24px Arial";
  ctx.fillStyle = "#e5e7eb";
  ctx.fillText("ha aprobado satisfactoriamente la capacitacion", CERTIFICATE_WIDTH / 2, 365);

  ctx.font = "700 36px Arial";
  ctx.fillStyle = "#bbf7d0";
  wrapText(ctx, capacitacionTitle, CERTIFICATE_WIDTH / 2, 425, 820, 42);

  ctx.font = "400 22px Arial";
  ctx.fillStyle = "#e5e7eb";
  ctx.fillText(`Fecha de emision: ${certificateDate}`, CERTIFICATE_WIDTH / 2, 560);

  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "700 40px Arial";
  ctx.fillText("IRRIDELTA", 150, 690);

  ctx.fillStyle = "#86efac";
  ctx.font = "400 18px Arial";
  ctx.fillText("Formacion tecnica en riego", 152, 725);

  ctx.textAlign = "center";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(765, 680);
  ctx.lineTo(1035, 680);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "600 21px Arial";
  ctx.fillText("Administracion IRRIDELTA", 900, 715);

  ctx.fillStyle = "#bbf7d0";
  ctx.font = "400 16px Arial";
  ctx.fillText("Certificacion validada por administrador", 900, 742);
}

export function downloadCertificatePng(data) {
  const canvas = document.createElement("canvas");
  drawCertificateToCanvas(canvas, data);

  canvas.toBlob((blob) => {
    if (!blob) {
      return;
    }

    downloadBlob(blob, `${getCertificateFileBase(data)}.png`);
  }, "image/png");
}

function buildPdfObject(id, content) {
  return `${id} 0 obj\n${content}\nendobj\n`;
}

function getCanvasJpegBinary(canvas) {
  const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
  const base64 = dataUrl.split(",")[1] ?? "";

  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);

  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index);
  }

  return bytes;
}

function encodePdfText(value) {
  return new TextEncoder().encode(value);
}

function appendPdfPart(parts, offsets, part) {
  const bytes = typeof part === "string" ? encodePdfText(part) : part;
  parts.push(bytes);
  offsets.total += bytes.byteLength;
}

export function downloadCertificatePdf(data) {
  const canvas = document.createElement("canvas");
  drawCertificateToCanvas(canvas, data);

  const imageBytes = getCanvasJpegBinary(canvas);
  const pageStream = `q\n${CERTIFICATE_WIDTH} 0 0 ${CERTIFICATE_HEIGHT} 0 0 cm\n/CertImage Do\nQ`;
  const imageHeader = `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${CERTIFICATE_WIDTH} /Height ${CERTIFICATE_HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.byteLength} >>\nstream\n`;
  const imageFooter = "\nendstream\nendobj\n";
  const objectParts = [
    [buildPdfObject(1, "<< /Type /Catalog /Pages 2 0 R >>")],
    [buildPdfObject(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>")],
    [
      buildPdfObject(
        3,
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${CERTIFICATE_WIDTH} ${CERTIFICATE_HEIGHT}] /Resources << /XObject << /CertImage 4 0 R >> >> /Contents 5 0 R >>`
      ),
    ],
    [imageHeader, imageBytes, imageFooter],
    [
      buildPdfObject(
        5,
        `<< /Length ${pageStream.length} >>\nstream\n${pageStream}\nendstream`
      ),
    ],
  ];

  const parts = [];
  const offsetsState = { total: 0 };
  const offsets = [0];

  appendPdfPart(parts, offsetsState, "%PDF-1.4\n");

  for (const objectPart of objectParts) {
    offsets.push(offsetsState.total);

    for (const part of objectPart) {
      appendPdfPart(parts, offsetsState, part);
    }
  }

  const xrefOffset = offsetsState.total;
  let xref = `xref\n0 ${objectParts.length + 1}\n`;
  xref += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) {
    xref += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objectParts.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  appendPdfPart(parts, offsetsState, xref);

  downloadBlob(
    new Blob(parts, { type: "application/pdf" }),
    `${getCertificateFileBase(data)}.pdf`
  );
}
