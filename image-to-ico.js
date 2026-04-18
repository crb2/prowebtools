const icoFile = document.getElementById("icoFile");
const icoDrop = document.getElementById("icoDrop");
const icoSize = document.getElementById("icoSize");
const icoCropMode = document.getElementById("icoCropMode");
const icoStretch = document.getElementById("icoStretch");
const icoShowGrid = document.getElementById("icoShowGrid");
const icoRotateLeft = document.getElementById("icoRotateLeft");
const icoRotateRight = document.getElementById("icoRotateRight");
const icoFlipH = document.getElementById("icoFlipH");
const icoFlipV = document.getElementById("icoFlipV");
const icoRunBtn = document.getElementById("icoRunBtn");
const icoRunAllBtn = document.getElementById("icoRunAllBtn");
const icoZipBtn = document.getElementById("icoZipBtn");
const icoStatus = document.getElementById("icoStatus");
const icoMeta = document.getElementById("icoMeta");
const icoQueue = document.getElementById("icoQueue");
const icoPreviewFrame = document.getElementById("icoPreviewFrame");
const icoEditorCanvas = document.getElementById("icoEditorCanvas");
const icoPreviewReset = document.getElementById("icoPreviewReset");
const icoLeft = document.getElementById("icoLeft");
const icoTop = document.getElementById("icoTop");
const icoWidth = document.getElementById("icoWidth");
const icoHeight = document.getElementById("icoHeight");

const HANDLE_SIZE = 9;
const DRAG_THRESHOLD = 8;

const appState = {
  items: [],
  activeId: "",
  dragging: null
};

function statusColor(mode) {
  if (mode === "error") return "#ef4444";
  if (mode === "success") return "#22c55e";
  return document.body.classList.contains("dark-mode") ? "#facc15" : "#b8860b";
}

function setStatus(message, mode = "loading") {
  if (!icoStatus) return;
  icoStatus.textContent = message;
  icoStatus.style.color = statusColor(mode);
}

function toKB(bytes) {
  return `${(Number(bytes || 0) / 1024).toFixed(1)} KB`;
}

function uid() {
  return `ico_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function safeName(name) {
  return String(name || "icon")
    .replace(/\.[^/.]+$/i, "")
    .replace(/[^\w\- ]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "icon";
}

function activeItem() {
  return appState.items.find((entry) => entry.id === appState.activeId) || null;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createItemFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const minSide = Math.min(image.width, image.height);
        const cropSize = Math.max(1, Math.floor(minSide));
        const crop = {
          left: Math.floor((image.width - cropSize) / 2),
          top: Math.floor((image.height - cropSize) / 2),
          width: cropSize,
          height: cropSize
        };
        const item = {
          id: uid(),
          file,
          name: file.name || "icon.png",
          image,
          crop,
          size: Number(icoSize?.value || 256),
          cropMode: String(icoCropMode?.value || "square"),
          stretch: Boolean(icoStretch?.checked),
          rotate: 0,
          flipH: false,
          flipV: false,
          convertedIcoBlob: null,
          convertedPngBlob: null,
          convertedPreviewUrl: "",
          showConverted: false,
          progress: 0,
          state: "pending",
          meta: "",
          sourceCache: null
        };
        if (item.cropMode === "original") {
          item.crop = {
            left: 0,
            top: 0,
            width: image.width,
            height: image.height
          };
        }
        resolve(item);
      };
      image.onerror = () => reject(new Error("Could not decode image."));
      image.src = String(reader.result || "");
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

function syncControlsFromItem(item) {
  if (!item) return;
  icoSize.value = String(item.size || 256);
  icoCropMode.value = item.cropMode || "square";
  icoStretch.checked = Boolean(item.stretch);
  syncCoordInputs(item);
  resizePreviewFrame(item);
}

function syncCoordInputs(item) {
  if (!item) return;
  icoLeft.value = String(Math.round(item.crop.left));
  icoTop.value = String(Math.round(item.crop.top));
  icoWidth.value = String(Math.round(item.crop.width));
  icoHeight.value = String(Math.round(item.crop.height));
}

function setMeta(text = "") {
  if (!icoMeta) return;
  icoMeta.textContent = text;
  icoMeta.classList.toggle("hidden", !text);
}

function setActiveItem(id) {
  const target = appState.items.find((entry) => entry.id === id);
  if (!target) return;
  appState.activeId = target.id;
  syncControlsFromItem(target);
  drawEditor();
  renderQueue();
}

function queueEmptyState() {
  icoQueue.className = "ico-queue empty";
  icoQueue.textContent = "No images loaded yet.";
  syncPreviewFrameState(null);
}

function renderQueue() {
  if (!icoQueue) return;
  if (!appState.items.length) {
    queueEmptyState();
    return;
  }

  icoQueue.className = "ico-queue";
  icoQueue.innerHTML = "";
  appState.items.forEach((item) => {
    const card = document.createElement("div");
    card.className = `ico-item${item.id === appState.activeId ? " active" : ""}`;
    const main = document.createElement("div");
    main.className = "ico-item-main";

    const top = document.createElement("div");
    top.className = "ico-item-top";
    const name = document.createElement("p");
    name.className = "ico-item-name";
    name.textContent = item.name;
    const state = document.createElement("p");
    state.className = "ico-item-state";
    state.textContent = item.state === "done"
      ? `Done${item.meta ? ` | ${item.meta}` : ""}`
      : item.state === "processing"
      ? `Processing ${Math.round(item.progress)}%`
      : item.state === "error"
      ? "Failed"
      : "Pending";
    top.appendChild(name);
    top.appendChild(state);

    const progressRow = document.createElement("div");
    progressRow.className = "ico-item-progress-row";

    const thumb = document.createElement("img");
    thumb.className = "ico-item-thumb";
    thumb.alt = "";
    thumb.decoding = "async";
    thumb.loading = "lazy";
    thumb.src = item.showConverted && item.convertedPreviewUrl ? item.convertedPreviewUrl : item.image.src;

    const progress = document.createElement("div");
    progress.className = "ico-progress";
    const fill = document.createElement("span");
    fill.style.width = `${clamp(item.progress, 0, 100)}%`;
    progress.appendChild(fill);
    const progressText = document.createElement("p");
    progressText.className = "ico-progress-text";
    progressText.textContent = `${Math.round(clamp(item.progress, 0, 100))}%`;
    progressRow.appendChild(thumb);
    progressRow.appendChild(progress);
    progressRow.appendChild(progressText);

    const actions = document.createElement("div");
    actions.className = "ico-item-actions";

    const selectBtn = document.createElement("button");
    selectBtn.type = "button";
    selectBtn.textContent = item.id === appState.activeId ? "Editing" : "Edit";
    selectBtn.addEventListener("click", () => setActiveItem(item.id));
    actions.appendChild(selectBtn);

    const convertBtn = document.createElement("button");
    convertBtn.type = "button";
    convertBtn.textContent = "Convert";
    convertBtn.disabled = item.state === "processing";
    convertBtn.addEventListener("click", async () => {
      await convertItem(item, true);
    });
    actions.appendChild(convertBtn);

    const dlBtn = document.createElement("button");
    dlBtn.type = "button";
    dlBtn.className = item.convertedIcoBlob ? "" : "hidden";
    dlBtn.textContent = "Download";
    dlBtn.addEventListener("click", () => downloadItemIco(item));
    actions.appendChild(dlBtn);

    main.appendChild(top);
    main.appendChild(progressRow);
    main.appendChild(actions);
    card.appendChild(main);
    icoQueue.appendChild(card);
  });
}

function getPreviewSize(item) {
  const dropRect = icoDrop?.getBoundingClientRect();
  const fallbackWidth = Math.min(window.innerWidth - 48, 900);
  const base = Math.max(220, Math.round(dropRect?.width || fallbackWidth));
  let ratio = 16 / 9;

  const source = getTransformedSource(item);
  if (item.cropMode === "original") {
    ratio = source.width / Math.max(1, source.height);
  } else if (item.cropMode === "free") {
    ratio = item.crop.width / Math.max(1, item.crop.height);
  }

  const width = base;
  const idealHeight = width / Math.max(0.2, ratio);
  const maxHeight = Math.max(220, Math.min(Math.round(window.innerHeight * 0.56), 560));
  const height = clamp(Math.round(idealHeight), 180, maxHeight);

  return {
    width: Math.max(220, Math.round(width)),
    height
  };
}

function syncPreviewFrameState(item) {
  if (!icoPreviewFrame || !icoEditorCanvas) return;
  const isEmpty = !item;
  icoPreviewFrame.classList.toggle("is-empty", isEmpty);
  if (isEmpty) {
    icoPreviewFrame.style.width = "";
    icoPreviewFrame.style.height = "";
    icoEditorCanvas.width = 320;
    icoEditorCanvas.height = 196;
  }
}

function resizePreviewFrame(item) {
  if (!icoPreviewFrame || !icoEditorCanvas) return;
  syncPreviewFrameState(item);
  if (!item) return;
  const dims = getPreviewSize(item);
  icoPreviewFrame.style.width = `${dims.width}px`;
  icoPreviewFrame.style.height = `${dims.height}px`;
  icoEditorCanvas.width = dims.width;
  icoEditorCanvas.height = dims.height;
}

function imageToCanvas(image) {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.drawImage(image, 0, 0);
  return canvas;
}

function transformKey(item) {
  return `${item.rotate}|${item.flipH ? 1 : 0}|${item.flipV ? 1 : 0}`;
}

function getTransformedSource(item) {
  if (!item) return document.createElement("canvas");
  const key = transformKey(item);
  if (item.sourceCache?.key === key && item.sourceCache.canvas) {
    return item.sourceCache.canvas;
  }

  const baseCanvas = imageToCanvas(item.image);
  const canvas = (item.rotate || item.flipH || item.flipV)
    ? drawWithTransform(baseCanvas, item)
    : baseCanvas;

  item.sourceCache = { key, canvas };
  return canvas;
}

function imageFitGeometry(sourceCanvas) {
  const cw = icoEditorCanvas.width;
  const ch = icoEditorCanvas.height;
  const iw = sourceCanvas.width;
  const ih = sourceCanvas.height;
  const scale = Math.min(cw / iw, ch / ih);
  const drawW = iw * scale;
  const drawH = ih * scale;
  const offsetX = (cw - drawW) / 2;
  const offsetY = (ch - drawH) / 2;
  return { scale, offsetX, offsetY, drawW, drawH };
}

function cropToScreen(item, geometry) {
  const x = geometry.offsetX + item.crop.left * geometry.scale;
  const y = geometry.offsetY + item.crop.top * geometry.scale;
  const w = item.crop.width * geometry.scale;
  const h = item.crop.height * geometry.scale;
  return { x, y, w, h };
}

function drawGrid(ctx, rect) {
  const dark = document.body.classList.contains("dark-mode");
  const strongLine = dark ? "rgba(11, 22, 40, 0.75)" : "rgba(21, 78, 136, 0.5)";
  const softLine = dark ? "rgba(195, 220, 255, 0.48)" : "rgba(255, 255, 255, 0.85)";
  const xThird = rect.w / 3;
  const yThird = rect.h / 3;
  ctx.save();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = strongLine;
  for (let i = 1; i <= 2; i += 1) {
    const vx = rect.x + xThird * i;
    const hy = rect.y + yThird * i;
    ctx.beginPath();
    ctx.moveTo(vx, rect.y);
    ctx.lineTo(vx, rect.y + rect.h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(rect.x, hy);
    ctx.lineTo(rect.x + rect.w, hy);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
  ctx.strokeStyle = softLine;
  for (let i = 1; i <= 2; i += 1) {
    const vx = rect.x + xThird * i + 0.5;
    const hy = rect.y + yThird * i + 0.5;
    ctx.beginPath();
    ctx.moveTo(vx, rect.y);
    ctx.lineTo(vx, rect.y + rect.h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(rect.x, hy);
    ctx.lineTo(rect.x + rect.w, hy);
    ctx.stroke();
  }
  ctx.restore();
}

function handleRects(rect) {
  const h = HANDLE_SIZE;
  const half = h / 2;
  const centers = {
    nw: [rect.x, rect.y],
    n: [rect.x + rect.w / 2, rect.y],
    ne: [rect.x + rect.w, rect.y],
    e: [rect.x + rect.w, rect.y + rect.h / 2],
    se: [rect.x + rect.w, rect.y + rect.h],
    s: [rect.x + rect.w / 2, rect.y + rect.h],
    sw: [rect.x, rect.y + rect.h],
    w: [rect.x, rect.y + rect.h / 2]
  };
  return Object.entries(centers).map(([key, [cx, cy]]) => ({
    key,
    x: cx - half,
    y: cy - half,
    w: h,
    h
  }));
}

function drawHandles(ctx, rect) {
  const dark = document.body.classList.contains("dark-mode");
  ctx.save();
  ctx.fillStyle = dark ? "#173254" : "#f9fcff";
  ctx.strokeStyle = dark ? "#9bc1f2" : "#2e6fa8";
  ctx.lineWidth = 1;
  handleRects(rect).forEach((h) => {
    ctx.beginPath();
    ctx.rect(h.x, h.y, h.w, h.h);
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
}

function setPreviewResetVisibility(visible) {
  if (!icoPreviewReset) return;
  icoPreviewReset.classList.toggle("hidden", !visible);
  icoPreviewReset.disabled = !visible;
}

function drawEditor() {
  const item = activeItem();
  if (!icoEditorCanvas) return;
  if (!item) {
    setPreviewResetVisibility(false);
    syncPreviewFrameState(null);
    const emptyCtx = icoEditorCanvas.getContext("2d");
    if (emptyCtx) {
      emptyCtx.clearRect(0, 0, icoEditorCanvas.width, icoEditorCanvas.height);
    }
    return;
  }
  resizePreviewFrame(item);

  const ctx = icoEditorCanvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, icoEditorCanvas.width, icoEditorCanvas.height);
  if (item.showConverted && item.convertedPreviewUrl) {
    setPreviewResetVisibility(true);
    const converted = new Image();
    converted.onload = () => {
      ctx.clearRect(0, 0, icoEditorCanvas.width, icoEditorCanvas.height);
      ctx.fillStyle = document.body.classList.contains("dark-mode") ? "#0f1d31" : "#deebfa";
      ctx.fillRect(0, 0, icoEditorCanvas.width, icoEditorCanvas.height);
      ctx.drawImage(converted, 0, 0, icoEditorCanvas.width, icoEditorCanvas.height);
    };
    converted.src = item.convertedPreviewUrl;
    return;
  }
  setPreviewResetVisibility(false);

  const source = getTransformedSource(item);
  const geometry = imageFitGeometry(source);
  ctx.fillStyle = document.body.classList.contains("dark-mode") ? "#0f1d31" : "#deebfa";
  ctx.fillRect(0, 0, icoEditorCanvas.width, icoEditorCanvas.height);
  ctx.drawImage(source, geometry.offsetX, geometry.offsetY, geometry.drawW, geometry.drawH);

  const rect = cropToScreen(item, geometry);

  const frameW = icoEditorCanvas.width;
  const frameH = icoEditorCanvas.height;
  const right = rect.x + rect.w;
  const bottom = rect.y + rect.h;
  const dark = document.body.classList.contains("dark-mode");
  ctx.fillStyle = dark ? "rgba(3, 9, 19, 0.48)" : "rgba(11, 42, 77, 0.25)";
  ctx.fillRect(0, 0, frameW, Math.max(0, rect.y));
  ctx.fillRect(0, rect.y, Math.max(0, rect.x), rect.h);
  ctx.fillRect(right, rect.y, Math.max(0, frameW - right), rect.h);
  ctx.fillRect(0, bottom, frameW, Math.max(0, frameH - bottom));

  ctx.save();
  ctx.strokeStyle = dark ? "rgba(160, 205, 255, 0.95)" : "rgba(41, 120, 205, 0.97)";
  ctx.lineWidth = 2;
  ctx.shadowColor = dark ? "rgba(4, 10, 20, 0.8)" : "rgba(255, 255, 255, 0.45)";
  ctx.shadowBlur = 1;
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();

  if (icoShowGrid?.checked) {
    drawGrid(ctx, rect);
  }
  drawHandles(ctx, rect);
}

function clampCropInside(item) {
  const source = getTransformedSource(item);
  const imgW = source.width;
  const imgH = source.height;
  item.crop.width = clamp(item.crop.width, 1, imgW);
  item.crop.height = clamp(item.crop.height, 1, imgH);
  item.crop.left = clamp(item.crop.left, 0, imgW - item.crop.width);
  item.crop.top = clamp(item.crop.top, 0, imgH - item.crop.height);
}

function enforceModeConstraints(item, origin = "width") {
  if (item.cropMode === "square") {
    const edge = origin === "height" ? item.crop.height : item.crop.width;
    item.crop.width = edge;
    item.crop.height = edge;
  } else if (item.cropMode === "original") {
    const source = getTransformedSource(item);
    const ratio = source.width / Math.max(1, source.height);
    if (origin === "height") {
      item.crop.width = Math.round(item.crop.height * ratio);
    } else {
      item.crop.height = Math.round(item.crop.width / ratio);
    }
  }
  clampCropInside(item);
}

function markPending(item) {
  if (item.convertedPreviewUrl) {
    URL.revokeObjectURL(item.convertedPreviewUrl);
    item.convertedPreviewUrl = "";
  }
  item.showConverted = false;
  item.convertedIcoBlob = null;
  item.convertedPngBlob = null;
  item.meta = "";
  if (item.state === "done") item.state = "pending";
  item.progress = 0;
}

function applyControlChanges() {
  const item = activeItem();
  if (!item) return;

  const previousMode = item.cropMode;
  item.size = clamp(Number(icoSize.value || 256), 16, 512);
  item.cropMode = String(icoCropMode.value || "square");
  item.stretch = Boolean(icoStretch.checked);
  if (previousMode === "free" && item.cropMode !== "free") {
    resetCropForMode(item, item.cropMode);
  } else {
    enforceModeFromSelection(item);
  }
  markPending(item);
  syncCoordInputs(item);
  drawEditor();
  renderQueue();
  setMeta("");
}

function resetCropForMode(item, mode) {
  const source = getTransformedSource(item);
  if (mode === "original") {
    item.crop.left = 0;
    item.crop.top = 0;
    item.crop.width = source.width;
    item.crop.height = source.height;
    return;
  }
  if (mode === "square") {
    const edge = Math.max(1, Math.min(source.width, source.height));
    item.crop.left = Math.floor((source.width - edge) / 2);
    item.crop.top = Math.floor((source.height - edge) / 2);
    item.crop.width = edge;
    item.crop.height = edge;
    return;
  }
  clampCropInside(item);
}

function enforceModeFromSelection(item) {
  if (item.cropMode === "square") {
    const edge = Math.max(1, Math.min(item.crop.width, item.crop.height));
    item.crop.width = edge;
    item.crop.height = edge;
  } else if (item.cropMode === "original") {
    const source = getTransformedSource(item);
    item.crop.left = 0;
    item.crop.top = 0;
    item.crop.width = source.width;
    item.crop.height = source.height;
  }
  clampCropInside(item);
}

function normalizeCropAfterTransform(item) {
  if (item.cropMode === "original") {
    enforceModeFromSelection(item);
  } else {
    clampCropInside(item);
  }
}

function onCoordInput() {
  const item = activeItem();
  if (!item) return;
  item.crop.left = Number(icoLeft.value || 0);
  item.crop.top = Number(icoTop.value || 0);
  item.crop.width = Number(icoWidth.value || item.crop.width);
  item.crop.height = Number(icoHeight.value || item.crop.height);

  enforceModeConstraints(item, document.activeElement === icoHeight ? "height" : "width");
  markPending(item);
  syncCoordInputs(item);
  drawEditor();
  renderQueue();
  setMeta("");
}

function normalizeCrop(item) {
  item.crop.left = Math.round(item.crop.left);
  item.crop.top = Math.round(item.crop.top);
  item.crop.width = Math.round(item.crop.width);
  item.crop.height = Math.round(item.crop.height);
  clampCropInside(item);
}

function screenToSource(item, x, y) {
  const source = getTransformedSource(item);
  const g = imageFitGeometry(source);
  const sx = (x - g.offsetX) / g.scale;
  const sy = (y - g.offsetY) / g.scale;
  return { sx, sy, g };
}

function hitTest(item, x, y) {
  const source = getTransformedSource(item);
  const g = imageFitGeometry(source);
  const rect = cropToScreen(item, g);
  const handles = handleRects(rect);
  const hitHandle = handles.find((h) => x >= h.x - DRAG_THRESHOLD && x <= h.x + h.w + DRAG_THRESHOLD && y >= h.y - DRAG_THRESHOLD && y <= h.y + h.h + DRAG_THRESHOLD);
  if (hitHandle && item.cropMode === "free") return { type: "resize", handle: hitHandle.key, g };
  if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) return { type: "move", g };
  return { type: "", g };
}

function applyDrag(item, drag, x, y) {
  const dx = (x - drag.startX) / drag.geometry.scale;
  const dy = (y - drag.startY) / drag.geometry.scale;
  const source = getTransformedSource(item);
  const imgW = source.width;
  const imgH = source.height;

  let left = drag.initial.left;
  let top = drag.initial.top;
  let width = drag.initial.width;
  let height = drag.initial.height;

  if (drag.kind === "move") {
    left = drag.initial.left + dx;
    top = drag.initial.top + dy;
    left = clamp(left, 0, imgW - width);
    top = clamp(top, 0, imgH - height);
  } else if (drag.kind === "resize") {
    const h = drag.handle;
    if (h.includes("w")) {
      left = drag.initial.left + dx;
      left = clamp(left, 0, drag.initial.left + drag.initial.width - 1);
      width = drag.initial.left + drag.initial.width - left;
    }
    if (h.includes("e")) {
      width = drag.initial.width + dx;
      width = clamp(width, 1, imgW - left);
    }
    if (h.includes("n")) {
      top = drag.initial.top + dy;
      top = clamp(top, 0, drag.initial.top + drag.initial.height - 1);
      height = drag.initial.top + drag.initial.height - top;
    }
    if (h.includes("s")) {
      height = drag.initial.height + dy;
      height = clamp(height, 1, imgH - top);
    }
  }

  item.crop.left = left;
  item.crop.top = top;
  item.crop.width = width;
  item.crop.height = height;
  if (item.cropMode === "free") {
    clampCropInside(item);
  } else {
    enforceModeConstraints(item, "width");
  }
  normalizeCrop(item);
  syncCoordInputs(item);
}

function canvasPointer(event) {
  const rect = icoEditorCanvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function cursorForHandle(handle) {
  if (handle === "e" || handle === "w") return "ew-resize";
  if (handle === "n" || handle === "s") return "ns-resize";
  if (handle === "nw" || handle === "se") return "nwse-resize";
  if (handle === "ne" || handle === "sw") return "nesw-resize";
  return "default";
}

function updateCanvasCursor(pointerEvent) {
  if (!icoEditorCanvas) return;
  const item = activeItem();
  if (!item) {
    icoEditorCanvas.style.cursor = "default";
    return;
  }
  const drag = appState.dragging;
  if (drag) {
    icoEditorCanvas.style.cursor = drag.kind === "move" ? "grabbing" : cursorForHandle(drag.handle);
    return;
  }
  if (!pointerEvent) {
    icoEditorCanvas.style.cursor = "default";
    return;
  }
  const p = canvasPointer(pointerEvent);
  const hit = hitTest(item, p.x, p.y);
  if (hit.type === "move") {
    icoEditorCanvas.style.cursor = "grab";
    return;
  }
  if (hit.type === "resize") {
    icoEditorCanvas.style.cursor = cursorForHandle(hit.handle);
    return;
  }
  icoEditorCanvas.style.cursor = "default";
}

icoEditorCanvas?.addEventListener("pointerdown", (event) => {
  const item = activeItem();
  if (!item) return;
  const p = canvasPointer(event);
  const hit = hitTest(item, p.x, p.y);
  if (!hit.type) return;
  icoEditorCanvas.setPointerCapture(event.pointerId);
  appState.dragging = {
    pointerId: event.pointerId,
    kind: hit.type,
    handle: hit.handle || "",
    startX: p.x,
    startY: p.y,
    geometry: hit.g,
    initial: { ...item.crop }
  };
  updateCanvasCursor(event);
});

icoEditorCanvas?.addEventListener("pointermove", (event) => {
  const item = activeItem();
  const drag = appState.dragging;
  if (!item) return;
  if (!drag) {
    updateCanvasCursor(event);
    return;
  }
  if (drag.pointerId !== event.pointerId) return;
  const p = canvasPointer(event);
  applyDrag(item, drag, p.x, p.y);
  markPending(item);
  drawEditor();
  renderQueue();
  setMeta("");
  updateCanvasCursor(event);
});

function stopDrag(pointerId) {
  if (!appState.dragging) return;
  if (pointerId !== undefined && appState.dragging.pointerId !== pointerId) return;
  appState.dragging = null;
}

icoEditorCanvas?.addEventListener("pointerup", (event) => {
  stopDrag(event.pointerId);
  updateCanvasCursor(event);
});
icoEditorCanvas?.addEventListener("pointercancel", (event) => {
  stopDrag(event.pointerId);
  updateCanvasCursor(event);
});
icoEditorCanvas?.addEventListener("pointerleave", () => {
  if (!appState.dragging && icoEditorCanvas) {
    icoEditorCanvas.style.cursor = "default";
  }
});

function drawWithTransform(srcCanvas, item) {
  const rotateSteps = ((item.rotate % 360) + 360) % 360 / 90;
  const swap = rotateSteps % 2 === 1;
  const outW = swap ? srcCanvas.height : srcCanvas.width;
  const outH = swap ? srcCanvas.width : srcCanvas.height;
  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  const ctx = out.getContext("2d");
  if (!ctx) return out;

  ctx.translate(outW / 2, outH / 2);
  ctx.rotate((item.rotate * Math.PI) / 180);
  ctx.scale(item.flipH ? -1 : 1, item.flipV ? -1 : 1);
  ctx.drawImage(srcCanvas, -srcCanvas.width / 2, -srcCanvas.height / 2);
  return out;
}

function buildFinalCanvas(item) {
  normalizeCrop(item);
  const transformedSource = getTransformedSource(item);
  const cut = document.createElement("canvas");
  cut.width = Math.max(1, Math.round(item.crop.width));
  cut.height = Math.max(1, Math.round(item.crop.height));
  const cutCtx = cut.getContext("2d");
  if (!cutCtx) return null;
  cutCtx.drawImage(
    transformedSource,
    item.crop.left,
    item.crop.top,
    item.crop.width,
    item.crop.height,
    0,
    0,
    cut.width,
    cut.height
  );

  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = item.size;
  finalCanvas.height = item.size;
  const finalCtx = finalCanvas.getContext("2d");
  if (!finalCtx) return null;
  finalCtx.clearRect(0, 0, item.size, item.size);

  if (item.stretch) {
    finalCtx.drawImage(cut, 0, 0, item.size, item.size);
  } else {
    const ratio = Math.min(item.size / cut.width, item.size / cut.height);
    const w = cut.width * ratio;
    const h = cut.height * ratio;
    const x = (item.size - w) / 2;
    const y = (item.size - h) / 2;
    finalCtx.drawImage(cut, x, y, w, h);
  }
  return finalCanvas;
}

function createIcoBitmapBytes(finalCanvas) {
  const size = finalCanvas.width;
  const ctx = finalCanvas.getContext("2d");
  if (!ctx) return null;
  const imageData = ctx.getImageData(0, 0, size, size).data;

  const headerSize = 40;
  const xorRowBytes = size * 4;
  const xorSize = xorRowBytes * size;
  const andRowBytes = Math.ceil(size / 32) * 4;
  const andSize = andRowBytes * size;
  const total = headerSize + xorSize + andSize;
  const buffer = new ArrayBuffer(total);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  view.setUint32(0, 40, true);
  view.setInt32(4, size, true);
  view.setInt32(8, size * 2, true);
  view.setUint16(12, 1, true);
  view.setUint16(14, 32, true);
  view.setUint32(16, 0, true);
  view.setUint32(20, xorSize + andSize, true);

  let p = headerSize;
  for (let y = size - 1; y >= 0; y -= 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      bytes[p] = imageData[i + 2];
      bytes[p + 1] = imageData[i + 1];
      bytes[p + 2] = imageData[i];
      bytes[p + 3] = imageData[i + 3];
      p += 4;
    }
  }
  bytes.fill(0, headerSize + xorSize);
  return bytes;
}

function buildIcoBlobFromBytes(bytes, size) {
  const dir = new ArrayBuffer(22);
  const view = new DataView(dir);
  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, 1, true);
  view.setUint8(6, size >= 256 ? 0 : size);
  view.setUint8(7, size >= 256 ? 0 : size);
  view.setUint8(8, 0);
  view.setUint8(9, 0);
  view.setUint16(10, 1, true);
  view.setUint16(12, 32, true);
  view.setUint32(14, bytes.byteLength, true);
  view.setUint32(18, 22, true);
  return new Blob([dir, bytes], { type: "image/x-icon" });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function convertItem(item, announce = false) {
  if (!item) return;
  item.state = "processing";
  item.progress = 6;
  renderQueue();
  if (announce) setStatus(`Converting ${item.name}...`);
  await wait(60);

  try {
    item.progress = 26;
    renderQueue();
    await wait(40);

    const finalCanvas = buildFinalCanvas(item);
    if (!finalCanvas) throw new Error("Canvas not available");

    item.progress = 52;
    renderQueue();
    await wait(40);

    const bitmap = createIcoBitmapBytes(finalCanvas);
    if (!bitmap) throw new Error("Could not build ICO bitmap");

    const pngBlob = await new Promise((resolve) => finalCanvas.toBlob(resolve, "image/png"));
    if (!pngBlob) throw new Error("Could not create preview image");
    item.convertedPngBlob = pngBlob;
    item.convertedIcoBlob = buildIcoBlobFromBytes(bitmap, item.size);
    if (item.convertedPreviewUrl) {
      URL.revokeObjectURL(item.convertedPreviewUrl);
      item.convertedPreviewUrl = "";
    }
    item.convertedPreviewUrl = URL.createObjectURL(pngBlob);
    item.showConverted = true;

    item.progress = 100;
    item.state = "done";
    item.meta = `${item.size}x${item.size} | ${toKB(item.convertedIcoBlob.size)}`;
    if (item.id === appState.activeId) {
      setMeta(`Output: ${item.meta}`);
      setStatus(`Converted ${item.name} successfully.`, "success");
    }
  } catch (error) {
    item.state = "error";
    item.progress = 0;
    item.meta = "";
    if (item.id === appState.activeId) {
      setMeta("");
      setStatus(`Failed: ${error?.message || "Unknown error"}`, "error");
    }
  }
  drawEditor();
  renderQueue();
}

function downloadBlob(blob, filename) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 3000);
}

function downloadItemIco(item) {
  if (!item?.convertedIcoBlob) {
    setStatus("Convert this item first.", "error");
    return;
  }
  downloadBlob(item.convertedIcoBlob, `${safeName(item.name)}-${item.size}x${item.size}.ico`);
  setStatus(`Downloaded ${item.name}`, "success");
}

function uint8Concat(chunks) {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((c) => {
    out.set(c, offset);
    offset += c.length;
  });
  return out;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime = ((date.getHours() & 0x1f) << 11) | ((date.getMinutes() & 0x3f) << 5) | ((Math.floor(date.getSeconds() / 2)) & 0x1f);
  const dosDate = (((year - 1980) & 0x7f) << 9) | (((date.getMonth() + 1) & 0x0f) << 5) | (date.getDate() & 0x1f);
  return { dosDate, dosTime };
}

async function blobToBytes(blob) {
  return new Uint8Array(await blob.arrayBuffer());
}

function buildZipBlob(files) {
  const localChunks = [];
  const centralChunks = [];
  let offset = 0;
  const dt = dosDateTime(new Date());
  const enc = new TextEncoder();

  files.forEach((file) => {
    const nameBytes = enc.encode(file.name);
    const data = file.bytes;
    const checksum = crc32(data);
    const size = data.length;

    const local = new ArrayBuffer(30 + nameBytes.length);
    const lv = new DataView(local);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, dt.dosTime, true);
    lv.setUint16(12, dt.dosDate, true);
    lv.setUint32(14, checksum, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    new Uint8Array(local, 30).set(nameBytes);
    localChunks.push(new Uint8Array(local), data);

    const central = new ArrayBuffer(46 + nameBytes.length);
    const cv = new DataView(central);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, dt.dosTime, true);
    cv.setUint16(14, dt.dosDate, true);
    cv.setUint32(16, checksum, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    new Uint8Array(central, 46).set(nameBytes);
    centralChunks.push(new Uint8Array(central));

    offset += (30 + nameBytes.length + size);
  });

  const centralDir = uint8Concat(centralChunks);
  const end = new ArrayBuffer(22);
  const ev = new DataView(end);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralDir.length, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);
  return new Blob([...localChunks, centralDir, new Uint8Array(end)], { type: "application/zip" });
}

async function convertAllItems() {
  if (!appState.items.length) {
    setStatus("Load images first.", "error");
    return;
  }
  for (const item of appState.items) {
    if (item.state === "done") continue;
    await convertItem(item);
  }
  setStatus("All items converted.", "success");
}

async function downloadZipAll() {
  if (!appState.items.length) {
    setStatus("Load images first.", "error");
    return;
  }
  const pending = appState.items.some((item) => !item.convertedIcoBlob);
  if (pending) {
    setStatus("Preparing ZIP: converting all items...");
    await convertAllItems();
  }

  const ready = appState.items.filter((item) => item.convertedIcoBlob);
  if (!ready.length) {
    setStatus("No converted icons found.", "error");
    return;
  }

  const files = [];
  for (const item of ready) {
    files.push({
      name: `${safeName(item.name)}-${item.size}x${item.size}.ico`,
      bytes: await blobToBytes(item.convertedIcoBlob)
    });
  }
  const zip = buildZipBlob(files);
  downloadBlob(zip, `icons-${Date.now()}.zip`);
  setStatus("ZIP downloaded successfully.", "success");
}

async function addFiles(fileList) {
  const files = Array.from(fileList || []).filter((file) => String(file.type || "").startsWith("image/"));
  if (!files.length) {
    setStatus("Please provide image files only.", "error");
    return;
  }

  setStatus(`Loading ${files.length} image${files.length > 1 ? "s" : ""}...`);
  for (const file of files) {
    try {
      const item = await createItemFromFile(file);
      appState.items.push(item);
      if (!appState.activeId) appState.activeId = item.id;
    } catch {
      // Skip bad file and continue queue.
    }
  }
  const current = activeItem();
  if (current) {
    syncControlsFromItem(current);
    drawEditor();
  }
  renderQueue();
  setMeta("");
  setStatus(`Loaded ${files.length} image${files.length > 1 ? "s" : ""}.`);
}

icoDrop?.addEventListener("click", () => icoFile?.click());
icoDrop?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  icoFile?.click();
});

["dragenter", "dragover"].forEach((type) => {
  icoDrop?.addEventListener(type, (event) => {
    event.preventDefault();
    icoDrop.classList.add("is-dragover");
  });
});
["dragleave", "dragend", "drop"].forEach((type) => {
  icoDrop?.addEventListener(type, (event) => {
    event.preventDefault();
    icoDrop.classList.remove("is-dragover");
  });
});

icoDrop?.addEventListener("drop", async (event) => {
  await addFiles(event.dataTransfer?.files || []);
});
icoFile?.addEventListener("change", async () => {
  await addFiles(icoFile.files || []);
  icoFile.value = "";
});

icoSize?.addEventListener("change", applyControlChanges);
icoCropMode?.addEventListener("change", applyControlChanges);
icoStretch?.addEventListener("change", applyControlChanges);
icoShowGrid?.addEventListener("change", drawEditor);
icoPreviewReset?.addEventListener("click", () => {
  const item = activeItem();
  if (!item) return;
  if (!item.showConverted) return;
  item.showConverted = false;
  drawEditor();
  setStatus("Converted preview reset to editable image.", "success");
});

icoRotateLeft?.addEventListener("click", () => {
  const item = activeItem();
  if (!item) return;
  item.rotate = (item.rotate - 90 + 360) % 360;
  item.sourceCache = null;
  normalizeCropAfterTransform(item);
  markPending(item);
  syncCoordInputs(item);
  drawEditor();
  renderQueue();
  setMeta("");
});
icoRotateRight?.addEventListener("click", () => {
  const item = activeItem();
  if (!item) return;
  item.rotate = (item.rotate + 90) % 360;
  item.sourceCache = null;
  normalizeCropAfterTransform(item);
  markPending(item);
  syncCoordInputs(item);
  drawEditor();
  renderQueue();
  setMeta("");
});
icoFlipH?.addEventListener("click", () => {
  const item = activeItem();
  if (!item) return;
  item.flipH = !item.flipH;
  item.sourceCache = null;
  normalizeCropAfterTransform(item);
  markPending(item);
  syncCoordInputs(item);
  drawEditor();
  renderQueue();
  setMeta("");
});
icoFlipV?.addEventListener("click", () => {
  const item = activeItem();
  if (!item) return;
  item.flipV = !item.flipV;
  item.sourceCache = null;
  normalizeCropAfterTransform(item);
  markPending(item);
  syncCoordInputs(item);
  drawEditor();
  renderQueue();
  setMeta("");
});

[icoLeft, icoTop, icoWidth, icoHeight].forEach((input) => {
  input?.addEventListener("input", onCoordInput);
  input?.addEventListener("change", onCoordInput);
});

icoRunBtn?.addEventListener("click", async () => {
  const item = activeItem();
  if (!item) {
    setStatus("Load an image first.", "error");
    return;
  }
  await convertItem(item, true);
});
icoRunAllBtn?.addEventListener("click", async () => {
  await convertAllItems();
});
icoZipBtn?.addEventListener("click", async () => {
  await downloadZipAll();
});

queueEmptyState();
window.addEventListener("resize", () => {
  if (!activeItem()) return;
  drawEditor();
});
window.addEventListener("beforeunload", () => {
  appState.items.forEach((item) => {
    if (item.convertedPreviewUrl) {
      URL.revokeObjectURL(item.convertedPreviewUrl);
      item.convertedPreviewUrl = "";
    }
  });
});
