const irFile = document.getElementById("irFile");
const irDrop = document.getElementById("irDrop");
const irWidth = document.getElementById("irWidth");
const irHeight = document.getElementById("irHeight");
const irFormat = document.getElementById("irFormat");
const irLock = document.getElementById("irLock");
const irRunBtn = document.getElementById("irRunBtn");
const irDownloadBtn = document.getElementById("irDownloadBtn");
const irStatus = document.getElementById("irStatus");
const irMeta = document.getElementById("irMeta");
const irPreviewWrap = document.getElementById("irPreviewWrap");
const irPreview = document.getElementById("irPreview");

let irImage = null;
let irOriginalWidth = 0;
let irOriginalHeight = 0;
let irOutputBlob = null;

function irSetStatus(message, mode = "loading") {
    irStatus.textContent = message;
    if (mode === "error") irStatus.style.color = "#ef4444";
    else if (mode === "success") irStatus.style.color = "#22c55e";
    else irStatus.style.color = document.body.classList.contains("dark-mode") ? "#facc15" : "#b8860b";
}

function setImageFile(file) {
    if (!file || !file.type.startsWith("image/")) {
        irSetStatus("Please choose a valid image.", "error");
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        const img = new Image();
        img.onload = () => {
            irImage = img;
            irOriginalWidth = img.width;
            irOriginalHeight = img.height;
            irWidth.value = String(img.width);
            irHeight.value = String(img.height);
            irOutputBlob = null;
            irDownloadBtn.classList.add("hidden");
            irMeta.textContent = `Original: ${img.width}x${img.height}`;
            irPreview.src = img.src;
            irPreviewWrap.classList.remove("hidden");
            irSetStatus(`Loaded: ${file.name}`);
        };
        img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
}

function syncDimension(changed) {
    if (!irLock.checked || !irOriginalWidth || !irOriginalHeight) return;
    if (changed === "w") {
        const w = Number(irWidth.value);
        if (!Number.isFinite(w) || w <= 0) return;
        irHeight.value = String(Math.max(1, Math.round((w / irOriginalWidth) * irOriginalHeight)));
    } else {
        const h = Number(irHeight.value);
        if (!Number.isFinite(h) || h <= 0) return;
        irWidth.value = String(Math.max(1, Math.round((h / irOriginalHeight) * irOriginalWidth)));
    }
}

irDrop.addEventListener("click", () => irFile.click());
irDrop.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); irFile.click(); } });
["dragenter", "dragover"].forEach((n) => irDrop.addEventListener(n, (e) => { e.preventDefault(); irDrop.classList.add("is-dragover"); }));
["dragleave", "dragend", "drop"].forEach((n) => irDrop.addEventListener(n, (e) => { e.preventDefault(); irDrop.classList.remove("is-dragover"); }));
irDrop.addEventListener("drop", (e) => setImageFile(e.dataTransfer?.files?.[0] || null));
irFile.addEventListener("change", () => setImageFile(irFile.files?.[0] || null));
irWidth.addEventListener("input", () => syncDimension("w"));
irHeight.addEventListener("input", () => syncDimension("h"));

irRunBtn.addEventListener("click", () => {
    if (!irImage) {
        irSetStatus("Load an image first.", "error");
        return;
    }

    const w = Math.max(1, Math.floor(Number(irWidth.value) || 0));
    const h = Math.max(1, Math.floor(Number(irHeight.value) || 0));
    if (!w || !h) {
        irSetStatus("Width and height must be valid numbers.", "error");
        return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        irSetStatus("Canvas is not supported in this browser.", "error");
        return;
    }

    ctx.drawImage(irImage, 0, 0, w, h);

    const mime = irFormat.value || "image/png";
    const quality = mime === "image/png" ? undefined : 0.9;
    canvas.toBlob((blob) => {
        if (!blob) {
            irSetStatus("Failed to render output image.", "error");
            return;
        }
        irOutputBlob = blob;
        irDownloadBtn.classList.remove("hidden");
        irPreview.src = URL.createObjectURL(blob);
        irMeta.textContent = `Output: ${w}x${h} | Size: ${(blob.size / 1024).toFixed(1)} KB`;
        irSetStatus("Resize complete.", "success");
    }, mime, quality);
});

irDownloadBtn.addEventListener("click", () => {
    if (!irOutputBlob) return;
    const ext = irFormat.value === "image/jpeg" ? "jpg" : (irFormat.value === "image/webp" ? "webp" : "png");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(irOutputBlob);
    a.download = `resized_image.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
});
