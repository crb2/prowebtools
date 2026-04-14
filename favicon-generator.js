const fgFile = document.getElementById("fgFile");
const fgDrop = document.getElementById("fgDrop");
const fgGenerateBtn = document.getElementById("fgGenerateBtn");
const fgDownloadAllBtn = document.getElementById("fgDownloadAllBtn");
const fgDownloadIcoBtn = document.getElementById("fgDownloadIcoBtn");
const fgCopyCodeBtn = document.getElementById("fgCopyCodeBtn");
const fgStatus = document.getElementById("fgStatus");
const fgMeta = document.getElementById("fgMeta");
const fgGrid = document.getElementById("fgGrid");
const fgCode = document.getElementById("fgCode");

const sizes = [16, 32, 48, 64, 128, 180, 192, 512];
let sourceImage = null;
let outputMap = new Map();
let icoBlob = null;

function setStatus(message, mode = "loading") {
    fgStatus.textContent = message;
    if (mode === "error") fgStatus.style.color = "#ef4444";
    else if (mode === "success") fgStatus.style.color = "#22c55e";
    else fgStatus.style.color = document.body.classList.contains("dark-mode") ? "#facc15" : "#b8860b";
}

function downloadBlob(blob, filename) {
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 6000);
}

function buildIcoFromPngBytes(pngBytes, size) {
    const header = new ArrayBuffer(22);
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

function renderSnippet() {
    fgCode.value = [
        '<link rel="icon" type="image/x-icon" href="/favicon.ico">',
        '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">',
        '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">',
        '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
        '<link rel="manifest" href="/site.webmanifest">'
    ].join("\n");
}

async function generateFavicons() {
    if (!sourceImage) {
        setStatus("Load an image first.", "error");
        return;
    }

    outputMap = new Map();
    fgGrid.innerHTML = "";

    for (const size of sizes) {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(sourceImage, 0, 0, size, size);
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
        if (!blob) continue;

        const fileName = size === 180 ? "apple-touch-icon.png" : `favicon-${size}x${size}.png`;
        outputMap.set(size, { blob, fileName, canvas });

        const card = document.createElement("div");
        card.className = "fg-item";

        const preview = document.createElement("canvas");
        preview.width = size;
        preview.height = size;
        preview.getContext("2d")?.drawImage(canvas, 0, 0, size, size);

        const title = document.createElement("p");
        title.className = "note";
        title.style.margin = "8px 0";
        title.textContent = `${size}x${size}`;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "download-btn";
        btn.textContent = "Download";
        btn.addEventListener("click", () => downloadBlob(blob, fileName));

        card.append(preview, title, btn);
        fgGrid.appendChild(card);
    }

    const icoSource = outputMap.get(32) || outputMap.get(64);
    if (icoSource) {
        const bytes = new Uint8Array(await icoSource.blob.arrayBuffer());
        icoBlob = buildIcoFromPngBytes(bytes, 32);
    } else {
        icoBlob = null;
    }

    fgDownloadAllBtn.disabled = outputMap.size === 0;
    fgDownloadIcoBtn.disabled = !icoBlob;
    fgCopyCodeBtn.disabled = outputMap.size === 0;

    renderSnippet();
    setStatus(`Generated ${outputMap.size} favicon sizes.`, "success");
}

function loadImage(file) {
    if (!file || !file.type.startsWith("image/")) {
        setStatus("Please choose an image file.", "error");
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        const img = new Image();
        img.onload = () => {
            sourceImage = img;
            fgMeta.textContent = `Source: ${img.naturalWidth}x${img.naturalHeight}`;
            setStatus(`Loaded: ${file.name}`);
            generateFavicons();
        };
        img.onerror = () => setStatus("Image could not be loaded.", "error");
        img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
}

["dragenter", "dragover"].forEach((name) => {
    fgDrop.addEventListener(name, (event) => {
        event.preventDefault();
        fgDrop.classList.add("is-dragover");
    });
});

["dragleave", "dragend", "drop"].forEach((name) => {
    fgDrop.addEventListener(name, (event) => {
        event.preventDefault();
        fgDrop.classList.remove("is-dragover");
    });
});

fgDrop.addEventListener("drop", (event) => loadImage(event.dataTransfer?.files?.[0] || null));
fgDrop.addEventListener("click", () => fgFile.click());
fgDrop.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        fgFile.click();
    }
});

fgFile.addEventListener("change", () => loadImage(fgFile.files?.[0] || null));
fgGenerateBtn.addEventListener("click", generateFavicons);

fgDownloadAllBtn.addEventListener("click", () => {
    if (!outputMap.size) return;
    let delay = 0;
    outputMap.forEach((entry) => {
        setTimeout(() => downloadBlob(entry.blob, entry.fileName), delay);
        delay += 180;
    });
    setStatus("Download started for all PNG favicon sizes.", "success");
});

fgDownloadIcoBtn.addEventListener("click", () => {
    if (!icoBlob) {
        setStatus("ICO is not ready yet.", "error");
        return;
    }
    downloadBlob(icoBlob, "favicon.ico");
    setStatus("ICO downloaded.", "success");
});

fgCopyCodeBtn.addEventListener("click", async () => {
    if (!fgCode.value) return;
    try {
        await navigator.clipboard.writeText(fgCode.value);
        setStatus("HTML snippet copied.", "success");
    } catch {
        fgCode.focus();
        fgCode.select();
        setStatus("Clipboard blocked. Snippet selected so you can copy.", "error");
    }
});
