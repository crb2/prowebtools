const icoFile = document.getElementById("icoFile");
const icoDrop = document.getElementById("icoDrop");
const icoSize = document.getElementById("icoSize");
const icoRunBtn = document.getElementById("icoRunBtn");
const icoDownloadBtn = document.getElementById("icoDownloadBtn");
const icoStatus = document.getElementById("icoStatus");
const icoMeta = document.getElementById("icoMeta");
const icoPreviewWrap = document.getElementById("icoPreviewWrap");
const icoPreview = document.getElementById("icoPreview");
let icoImage = null;
let icoOutBlob = null;

function icoStatusSet(msg, mode = "loading") {
  icoStatus.textContent = msg;
  if (mode === "error") icoStatus.style.color = "#ef4444";
  else if (mode === "success") icoStatus.style.color = "#22c55e";
  else icoStatus.style.color = document.body.classList.contains("dark-mode") ? "#facc15" : "#b8860b";
}

function setIcoFile(file) {
  if (!file || !file.type.startsWith("image/")) { icoStatusSet("Please choose an image file.", "error"); return; }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      icoImage = img;
      icoOutBlob = null;
      icoDownloadBtn.classList.add("hidden");
      icoMeta.textContent = `Source: ${img.width}x${img.height}`;
      if (icoPreview) icoPreview.src = String(reader.result || "");
      if (icoPreviewWrap) icoPreviewWrap.classList.remove("hidden");
      icoStatusSet(`Loaded: ${file.name}`);
    };
    img.src = String(reader.result || "");
  };
  reader.readAsDataURL(file);
}

function buildIcoFromPngBytes(pngBytes, size) {
  const header = new ArrayBuffer(6 + 16);
  const view = new DataView(header);
  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, 1, true);
  view.setUint8(6, size === 256 ? 0 : size);
  view.setUint8(7, size === 256 ? 0 : size);
  view.setUint8(8, 0);
  view.setUint8(9, 0);
  view.setUint16(10, 1, true);
  view.setUint16(12, 32, true);
  view.setUint32(14, pngBytes.byteLength, true);
  view.setUint32(18, 22, true);
  return new Blob([header, pngBytes], { type: "image/x-icon" });
}

icoDrop.addEventListener("click", () => icoFile.click());
icoDrop.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); icoFile.click(); } });
["dragenter","dragover"].forEach((n)=>icoDrop.addEventListener(n,(e)=>{e.preventDefault();icoDrop.classList.add("is-dragover");}));
["dragleave","dragend","drop"].forEach((n)=>icoDrop.addEventListener(n,(e)=>{e.preventDefault();icoDrop.classList.remove("is-dragover");}));
icoDrop.addEventListener("drop",(e)=>setIcoFile(e.dataTransfer?.files?.[0]||null));
icoFile.addEventListener("change",()=>setIcoFile(icoFile.files?.[0]||null));

icoRunBtn.addEventListener("click", async () => {
  if (!icoImage) { icoStatusSet("Load an image first.", "error"); return; }
  try {
    const size = Number(icoSize.value) || 256;
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) { icoStatusSet("Canvas not supported.", "error"); return; }
    ctx.clearRect(0,0,size,size);
    ctx.drawImage(icoImage, 0, 0, size, size);
    const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!pngBlob) { icoStatusSet("Failed to render icon.", "error"); return; }
    const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
    icoOutBlob = buildIcoFromPngBytes(pngBytes, size);
    icoDownloadBtn.classList.remove("hidden");
    icoMeta.textContent = `Output: ${size}x${size} | ${(icoOutBlob.size/1024).toFixed(1)} KB`;
    icoStatusSet("ICO generated successfully.", "success");
  } catch (err) {
    icoStatusSet(`Failed: ${err.message || "Unknown error"}`, "error");
  }
});

icoDownloadBtn.addEventListener("click", () => {
  if (!icoOutBlob) return;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(icoOutBlob); a.download = "favicon.ico";
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
});
