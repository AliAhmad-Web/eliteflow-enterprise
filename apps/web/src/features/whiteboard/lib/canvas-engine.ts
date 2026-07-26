import type { WhiteboardDocument, WhiteboardObject } from "../types/whiteboard.types";

function sortedObjects(doc: WhiteboardDocument): WhiteboardObject[] {
  return [...doc.objects].sort((a, b) => a.zIndex - b.zIndex);
}

function drawObject(
  ctx: CanvasRenderingContext2D,
  obj: WhiteboardObject,
): void {
  ctx.save();
  ctx.globalAlpha = obj.opacity ?? 1;
  ctx.translate(obj.x, obj.y);
  ctx.rotate(((obj.rotation ?? 0) * Math.PI) / 180);

  switch (obj.type) {
    case "path":
    case "highlighter":
    case "free-arrow": {
      const points = obj.points;
      if (points.length < 2) break;
      ctx.strokeStyle = obj.stroke;
      ctx.lineWidth = obj.strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (obj.type === "highlighter") {
        ctx.globalAlpha = (obj.opacity ?? 1) * 0.35;
      }
      ctx.beginPath();
      ctx.moveTo(points[0]!, points[1]!);
      for (let i = 2; i < points.length; i += 2) {
        ctx.lineTo(points[i]!, points[i + 1]!);
      }
      ctx.stroke();
      if (obj.type === "free-arrow" && points.length >= 4) {
        const x1 = points[points.length - 4]!;
        const y1 = points[points.length - 3]!;
        const x2 = points[points.length - 2]!;
        const y2 = points[points.length - 1]!;
        drawArrowHead(ctx, x1, y1, x2, y2, obj.stroke, obj.strokeWidth);
      }
      break;
    }
    case "rect": {
      ctx.strokeStyle = obj.stroke;
      ctx.fillStyle = obj.fill;
      ctx.lineWidth = obj.strokeWidth;
      ctx.beginPath();
      ctx.rect(0, 0, obj.width, obj.height);
      if (obj.fill && obj.fill !== "transparent") ctx.fill();
      ctx.stroke();
      break;
    }
    case "circle": {
      const r = Math.min(Math.abs(obj.width), Math.abs(obj.height)) / 2;
      ctx.strokeStyle = obj.stroke;
      ctx.fillStyle = obj.fill;
      ctx.lineWidth = obj.strokeWidth;
      ctx.beginPath();
      ctx.arc(obj.width / 2, obj.height / 2, Math.abs(r), 0, Math.PI * 2);
      if (obj.fill && obj.fill !== "transparent") ctx.fill();
      ctx.stroke();
      break;
    }
    case "ellipse": {
      ctx.strokeStyle = obj.stroke;
      ctx.fillStyle = obj.fill;
      ctx.lineWidth = obj.strokeWidth;
      ctx.beginPath();
      ctx.ellipse(
        obj.width / 2,
        obj.height / 2,
        Math.abs(obj.width / 2),
        Math.abs(obj.height / 2),
        0,
        0,
        Math.PI * 2,
      );
      if (obj.fill && obj.fill !== "transparent") ctx.fill();
      ctx.stroke();
      break;
    }
    case "line":
    case "dashed-line":
    case "arrow": {
      ctx.strokeStyle = obj.stroke;
      ctx.lineWidth = obj.strokeWidth;
      ctx.setLineDash(obj.type === "dashed-line" ? [8, 6] : []);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(obj.width, obj.height);
      ctx.stroke();
      ctx.setLineDash([]);
      if (obj.type === "arrow") {
        drawArrowHead(ctx, 0, 0, obj.width, obj.height, obj.stroke, obj.strokeWidth);
      }
      break;
    }
    case "text":
    case "sticky": {
      if (obj.type === "sticky") {
        ctx.fillStyle = obj.fill || "#fef08a";
        ctx.fillRect(0, 0, obj.width, obj.height);
        ctx.strokeStyle = obj.stroke || "#ca8a04";
        ctx.strokeRect(0, 0, obj.width, obj.height);
      }
      ctx.fillStyle = obj.color || "#0f172a";
      ctx.font = `${obj.fontSize || 16}px "Plus Jakarta Sans", sans-serif`;
      wrapText(ctx, obj.text || "", 8, 24, obj.width - 16, obj.fontSize || 16);
      break;
    }
    case "image": {
      const img = imageCache.get(obj.src);
      if (img) {
        ctx.drawImage(img, 0, 0, obj.width, obj.height);
      } else {
        ctx.fillStyle = "rgba(148,163,184,0.25)";
        ctx.fillRect(0, 0, obj.width, obj.height);
        void loadImage(obj.src);
      }
      break;
    }
  }

  ctx.restore();
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number,
) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const size = 10 + width;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - size * Math.cos(angle - Math.PI / 6),
    y2 - size * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    x2 - size * Math.cos(angle + Math.PI / 6),
    y2 - size * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/);
  let line = "";
  let cursorY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = word;
      cursorY += lineHeight + 4;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cursorY);
}

const imageCache = new Map<string, HTMLImageElement>();
const pending = new Set<string>();

function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) return Promise.resolve(cached);
  if (pending.has(src)) {
    return new Promise((resolve) => {
      const timer = window.setInterval(() => {
        const img = imageCache.get(src);
        if (img) {
          window.clearInterval(timer);
          resolve(img);
        }
      }, 50);
    });
  }
  pending.add(src);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      imageCache.set(src, img);
      pending.delete(src);
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
}

export function renderDocument(
  ctx: CanvasRenderingContext2D,
  doc: WhiteboardDocument,
  opts: {
    width: number;
    height: number;
    dpr: number;
    background: string;
    selectedIds?: string[];
  },
) {
  const { width, height, dpr, background, selectedIds = [] } = opts;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  ctx.setTransform(
    doc.viewport.zoom * dpr,
    0,
    0,
    doc.viewport.zoom * dpr,
    doc.viewport.x * dpr,
    doc.viewport.y * dpr,
  );

  // Infinite grid
  drawGrid(ctx, doc, width / dpr, height / dpr);

  for (const obj of sortedObjects(doc)) {
    drawObject(ctx, obj);
    if (selectedIds.includes(obj.id)) {
      drawSelection(ctx, obj);
    }
  }
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  doc: WhiteboardDocument,
  viewW: number,
  viewH: number,
) {
  const zoom = doc.viewport.zoom;
  const step = 40;
  const left = (-doc.viewport.x) / zoom;
  const top = (-doc.viewport.y) / zoom;
  const right = left + viewW / zoom;
  const bottom = top + viewH / zoom;

  ctx.save();
  ctx.strokeStyle = "rgba(148,163,184,0.18)";
  ctx.lineWidth = 1 / zoom;
  ctx.beginPath();
  for (let x = Math.floor(left / step) * step; x <= right; x += step) {
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
  }
  for (let y = Math.floor(top / step) * step; y <= bottom; y += step) {
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawSelection(ctx: CanvasRenderingContext2D, obj: WhiteboardObject) {
  const bounds = getObjectBounds(obj);
  ctx.save();
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(bounds.x - 4, bounds.y - 4, bounds.w + 8, bounds.h + 8);
  ctx.restore();
}

export function getObjectBounds(obj: WhiteboardObject): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  if (obj.type === "path" || obj.type === "highlighter" || obj.type === "free-arrow") {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < obj.points.length; i += 2) {
      const px = obj.x + obj.points[i]!;
      const py = obj.y + obj.points[i + 1]!;
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px);
      maxY = Math.max(maxY, py);
    }
    return {
      x: minX,
      y: minY,
      w: Math.max(1, maxX - minX),
      h: Math.max(1, maxY - minY),
    };
  }

  if (obj.type === "line" || obj.type === "arrow" || obj.type === "dashed-line") {
    return {
      x: Math.min(obj.x, obj.x + obj.width),
      y: Math.min(obj.y, obj.y + obj.height),
      w: Math.abs(obj.width) || 1,
      h: Math.abs(obj.height) || 1,
    };
  }

  return {
    x: obj.x,
    y: obj.y,
    w: Math.abs("width" in obj ? obj.width : 1),
    h: Math.abs("height" in obj ? obj.height : 1),
  };
}

export function hitTest(
  doc: WhiteboardDocument,
  worldX: number,
  worldY: number,
): WhiteboardObject | null {
  const ordered = [...sortedObjects(doc)].reverse();
  for (const obj of ordered) {
    const b = getObjectBounds(obj);
    if (
      worldX >= b.x - 4 &&
      worldX <= b.x + b.w + 4 &&
      worldY >= b.y - 4 &&
      worldY <= b.y + b.h + 4
    ) {
      return obj;
    }
  }
  return null;
}

export async function exportDocument(
  doc: WhiteboardDocument,
  format: "PNG" | "JPG" | "PDF" | "SVG",
  background: string,
): Promise<void> {
  const bounds = computeContentBounds(doc);
  const padding = 40;
  const width = Math.max(800, Math.ceil(bounds.w + padding * 2));
  const height = Math.max(600, Math.ceil(bounds.h + padding * 2));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const exportDoc: WhiteboardDocument = {
    ...doc,
    viewport: {
      x: -bounds.x + padding,
      y: -bounds.y + padding,
      zoom: 1,
    },
  };

  // Ensure images loaded
  await Promise.all(
    doc.objects
      .filter((o): o is Extract<WhiteboardObject, { type: "image" }> => o.type === "image")
      .map((o) => loadImage(o.src).catch(() => null)),
  );

  renderDocument(ctx, exportDoc, {
    width,
    height,
    dpr: 1,
    background: format === "JPG" ? background || "#ffffff" : background,
  });

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

  if (format === "SVG") {
    const png = canvas.toDataURL("image/png");
    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><image href="${png}" width="${width}" height="${height}"/></svg>`;
    downloadBlob(
      new Blob([svg], { type: "image/svg+xml" }),
      `eliteflow-whiteboard-${stamp}.svg`,
    );
    return;
  }

  if (format === "PDF") {
    // Lightweight PDF wrapping a JPEG image (no third-party PDF lib).
    const jpeg = canvas.toDataURL("image/jpeg", 0.92);
    const pdf = buildSimplePdf(jpeg, width, height);
    downloadBlob(
      new Blob([pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer], {
        type: "application/pdf",
      }),
      `eliteflow-whiteboard-${stamp}.pdf`,
    );
    return;
  }

  const mime = format === "JPG" ? "image/jpeg" : "image/png";
  const ext = format === "JPG" ? "jpg" : "png";
  const link = document.createElement("a");
  link.download = `eliteflow-whiteboard-${stamp}.${ext}`;
  link.href = canvas.toDataURL(mime, 0.92);
  link.click();
}

function computeContentBounds(doc: WhiteboardDocument) {
  if (doc.objects.length === 0) {
    return { x: 0, y: 0, w: 1200, h: 800 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const obj of doc.objects) {
    const b = getObjectBounds(obj);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildSimplePdf(dataUrl: string, width: number, height: number): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const imgBytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) imgBytes[i] = binary.charCodeAt(i);

  const encoder = new TextEncoder();
  const objects: Uint8Array[] = [];
  const offsets: number[] = [];

  const push = (content: string | Uint8Array) => {
    offsets.push(objects.reduce((sum, o) => sum + o.length, 0));
    objects.push(typeof content === "string" ? encoder.encode(content) : content);
  };

  push("%PDF-1.4\n");
  push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n");
  push("2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n");
  push(
    `3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents 4 0 R /Resources << /XObject << /Im0 5 0 R >> >> >>endobj\n`,
  );
  const contentStream = `q ${width} 0 0 ${height} 0 0 cm /Im0 Do Q`;
  push(
    `4 0 obj<< /Length ${contentStream.length} >>stream\n${contentStream}\nendstream\nendobj\n`,
  );

  const imgHeader = encoder.encode(
    `5 0 obj<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgBytes.length} >>stream\n`,
  );
  const imgFooter = encoder.encode("\nendstream\nendobj\n");
  const imgObj = new Uint8Array(imgHeader.length + imgBytes.length + imgFooter.length);
  imgObj.set(imgHeader, 0);
  imgObj.set(imgBytes, imgHeader.length);
  imgObj.set(imgFooter, imgHeader.length + imgBytes.length);
  push(imgObj);

  const bodyLength = objects.reduce((sum, o) => sum + o.length, 0);
  const xrefStart = bodyLength;
  let xref = `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  const trailer = `trailer<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const parts = [...objects, encoder.encode(xref), encoder.encode(trailer)];
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function captureThumbnail(
  doc: WhiteboardDocument,
  background: string,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 180;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const bounds = computeContentBounds(doc);
  const scale = Math.min(320 / Math.max(bounds.w, 1), 180 / Math.max(bounds.h, 1));
  renderDocument(ctx, {
    ...doc,
    viewport: {
      x: -bounds.x * scale + (320 - bounds.w * scale) / 2,
      y: -bounds.y * scale + (180 - bounds.h * scale) / 2,
      zoom: scale,
    },
  }, { width: 320, height: 180, dpr: 1, background });
  return canvas.toDataURL("image/png");
}
