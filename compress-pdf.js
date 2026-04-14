const pdfFile = document.getElementById("pdfFile");
const pdfDrop = document.getElementById("pdfDrop");
const pdfRunBtn = document.getElementById("pdfRunBtn");
const pdfDownloadBtn = document.getElementById("pdfDownloadBtn");
const pdfStatus = document.getElementById("pdfStatus");
const pdfMeta = document.getElementById("pdfMeta");
const pdfLevel = document.getElementById("pdfLevel");
const pdfLevelText = document.getElementById("pdfLevelText");
const pdfEstimate = document.getElementById("pdfEstimate");
const pdfPreviewWrap = document.getElementById("pdfPreviewWrap");
const pdfPreview = document.getElementById("pdfPreview");

let pdfSelectedFile = null;
let pdfOutputBlob = null;
let pdfPreviewUrl = "";

function fmtBytes(bytes) {
    if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(2)} KB`;
}

function getLevelInfo(level) {
    if (level <= 1) return { label: "Low", factor: 0.90, tick: 30 };
    if (level >= 3) return { label: "High", factor: 0.65, tick: 120 };
    return { label: "Medium", factor: 0.78, tick: 70 };
}

function updateEstimate() {
    if (!pdfSelectedFile) {
        pdfEstimate.textContent = "";
        return;
    }
    const info = getLevelInfo(Number(pdfLevel.value));
    pdfLevelText.textContent = info.label;
    const estimated = Math.max(0, Math.round(pdfSelectedFile.size * info.factor));
    pdfEstimate.textContent = `Approx output size: ${fmtBytes(estimated)} (estimate)`;
}

function pdfSetStatus(message, mode = "loading") {
    pdfStatus.textContent = message;
    if (mode === "error") pdfStatus.style.color = "#ef4444";
    else if (mode === "success") pdfStatus.style.color = "#22c55e";
    else pdfStatus.style.color = document.body.classList.contains("dark-mode") ? "#facc15" : "#b8860b";
}

function setPdfFile(file) {
    if (!file || !/\.pdf$/i.test(file.name)) {
        pdfSetStatus("Please choose a PDF file.", "error");
        return;
    }
    pdfSelectedFile = file;
    pdfOutputBlob = null;
    pdfDownloadBtn.classList.add("hidden");
    pdfPreviewWrap.classList.add("hidden");
    if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
        pdfPreviewUrl = "";
    }
    pdfMeta.textContent = `Original size: ${fmtBytes(file.size)}`;
    updateEstimate();
    pdfSetStatus(`Loaded: ${file.name}`);
}

pdfLevel.addEventListener("input", updateEstimate);
pdfDrop.addEventListener("click", () => pdfFile.click());
pdfDrop.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); pdfFile.click(); } });
["dragenter", "dragover"].forEach((n) => pdfDrop.addEventListener(n, (e) => { e.preventDefault(); pdfDrop.classList.add("is-dragover"); }));
["dragleave", "dragend", "drop"].forEach((n) => pdfDrop.addEventListener(n, (e) => { e.preventDefault(); pdfDrop.classList.remove("is-dragover"); }));
pdfDrop.addEventListener("drop", (e) => setPdfFile(e.dataTransfer?.files?.[0] || null));
pdfFile.addEventListener("change", () => setPdfFile(pdfFile.files?.[0] || null));

pdfRunBtn.addEventListener("click", async () => {
    if (!pdfSelectedFile) {
        pdfSetStatus("Load a PDF first.", "error");
        return;
    }
    if (!window.PDFLib) {
        pdfSetStatus("PDF engine failed to load. Check internet and retry.", "error");
        return;
    }

    pdfRunBtn.disabled = true;
    pdfDownloadBtn.classList.add("hidden");

    try {
        const { PDFDocument } = window.PDFLib;
        const levelInfo = getLevelInfo(Number(pdfLevel.value));
        pdfSetStatus("Compressing PDF...");

        const srcBytes = new Uint8Array(await pdfSelectedFile.arrayBuffer());
        const srcDoc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
        const outDoc = await PDFDocument.create();
        const pages = await outDoc.copyPages(srcDoc, srcDoc.getPageIndices());
        pages.forEach((p) => outDoc.addPage(p));

        const outBytes = await outDoc.save({
            useObjectStreams: true,
            addDefaultPage: false,
            objectsPerTick: levelInfo.tick
        });
        pdfOutputBlob = new Blob([outBytes], { type: "application/pdf" });

        const before = pdfSelectedFile.size;
        const after = pdfOutputBlob.size;
        const delta = before > 0 ? (((before - after) / before) * 100) : 0;

        pdfMeta.textContent = `Original: ${fmtBytes(before)} | Compressed: ${fmtBytes(after)} | Saved: ${Math.max(0, delta).toFixed(1)}%`;
        pdfDownloadBtn.classList.remove("hidden");

        if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
        pdfPreviewUrl = URL.createObjectURL(pdfOutputBlob);
        pdfPreview.src = pdfPreviewUrl;
        pdfPreviewWrap.classList.remove("hidden");

        pdfSetStatus("Compression complete.", "success");
    } catch (err) {
        pdfSetStatus(`Failed: ${err.message || "Unknown error"}`, "error");
    } finally {
        pdfRunBtn.disabled = false;
    }
});

pdfDownloadBtn.addEventListener("click", () => {
    if (!pdfOutputBlob || !pdfSelectedFile) return;
    const base = pdfSelectedFile.name.replace(/\.pdf$/i, "");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(pdfOutputBlob);
    a.download = `${base}_compressed.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
});
