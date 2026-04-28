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

function escapePdfText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function buildPdfObject(id, content) {
  return `${id} 0 obj\n${content}\nendobj\n`;
}

export function downloadCertificatePdf(data) {
  const certificateDate = formatCertificateDate(data.approvedAt);
  const capacitacionTitle = data.capacitacionTitle || data.certificationTitle;
  const lines = [
    "q",
    "0.06 0.09 0.16 rg 0 0 842 595 re f",
    "0.08 0.33 0.18 rg 0 0 842 210 re f",
    "0.52 0.93 0.67 RG 3 w 42 42 758 511 re S",
    "1 1 1 rg BT /F1 36 Tf 211 470 Td (Certificado de Aprobacion) Tj ET",
    "0.82 0.98 0.90 rg BT /F2 15 Tf 348 425 Td (IRRIDELTA certifica que) Tj ET",
    `1 1 1 rg BT /F1 30 Tf 0 0 Td 421 365 Td (${escapePdfText(data.requesterName)}) Tj ET`,
    "0.90 0.91 0.92 rg BT /F2 15 Tf 243 325 Td (ha aprobado satisfactoriamente la capacitacion) Tj ET",
    `0.73 0.97 0.82 rg BT /F1 22 Tf 0 0 Td 421 285 Td (${escapePdfText(capacitacionTitle)}) Tj ET`,
    `0.90 0.91 0.92 rg BT /F2 15 Tf 326 220 Td (Fecha de emision: ${escapePdfText(certificateDate)}) Tj ET`,
    "1 1 1 rg BT /F1 26 Tf 95 105 Td (IRRIDELTA) Tj ET",
    "0.52 0.93 0.67 rg BT /F2 12 Tf 97 80 Td (Formacion tecnica en riego) Tj ET",
    "1 1 1 RG 1.5 w 540 112 m 730 112 l S",
    "1 1 1 rg BT /F2 13 Tf 562 88 Td (Administracion IRRIDELTA) Tj ET",
    "0.73 0.97 0.82 rg BT /F2 10 Tf 552 68 Td (Certificacion validada por administrador) Tj ET",
    "Q",
  ];
  const stream = lines.join("\n");
  const objects = [
    buildPdfObject(1, "<< /Type /Catalog /Pages 2 0 R >>"),
    buildPdfObject(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    buildPdfObject(
      3,
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>"
    ),
    buildPdfObject(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"),
    buildPdfObject(5, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),
    buildPdfObject(6, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`),
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += object;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  downloadBlob(
    new Blob([pdf], { type: "application/pdf" }),
    `${getCertificateFileBase(data)}.pdf`
  );
}
