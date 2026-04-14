const ravFile = document.getElementById("ravFile");
const ravDrop = document.getElementById("ravDrop");
const ravConvertBtn = document.getElementById("ravConvertBtn");
const ravDownloadBtn = document.getElementById("ravDownloadBtn");
const ravStatus = document.getElementById("ravStatus");
const ravPreview = document.getElementById("ravPreview");
const ravPreviewWrap = document.getElementById("ravPreviewWrap");

let ravSelectedFile = null;
let ravOutputBlob = null;
let ravPreviewUrl = "";

function ravSetStatus(message, mode = "loading") {
    ravStatus.textContent = message;
    if (mode === "error") ravStatus.style.color = "#ef4444";
    else if (mode === "success") ravStatus.style.color = "#22c55e";
    else ravStatus.style.color = document.body.classList.contains("dark-mode") ? "#facc15" : "#b8860b";
}

function updatePreviewRatio(videoEl) {
    const w = Number(videoEl.videoWidth) || 16;
    const h = Number(videoEl.videoHeight) || 9;
    videoEl.style.aspectRatio = `${w} / ${h}`;
}

function ravSetFile(file) {
    if (!file || !file.type.startsWith("video/")) {
        ravSetStatus("Please choose a valid video file.", "error");
        return;
    }
    ravSelectedFile = file;
    ravOutputBlob = null;
    ravDownloadBtn.classList.add("hidden");

    if (ravPreviewUrl) URL.revokeObjectURL(ravPreviewUrl);
    ravPreviewUrl = URL.createObjectURL(file);
    ravPreview.src = ravPreviewUrl;
    ravPreview.style.aspectRatio = "16 / 9";
    ravPreviewWrap.classList.remove("hidden");

    ravSetStatus(`Loaded: ${file.name}`);
}

ravPreview.addEventListener("loadedmetadata", () => updatePreviewRatio(ravPreview));
ravDrop.addEventListener("click", () => ravFile.click());
ravDrop.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); ravFile.click(); } });
["dragenter", "dragover"].forEach((n) => ravDrop.addEventListener(n, (e) => { e.preventDefault(); ravDrop.classList.add("is-dragover"); }));
["dragleave", "dragend", "drop"].forEach((n) => ravDrop.addEventListener(n, (e) => { e.preventDefault(); ravDrop.classList.remove("is-dragover"); }));
ravDrop.addEventListener("drop", (e) => ravSetFile(e.dataTransfer?.files?.[0] || null));
ravFile.addEventListener("change", () => ravSetFile(ravFile.files?.[0] || null));

ravConvertBtn.addEventListener("click", async () => {
    if (!ravSelectedFile) {
        ravSetStatus("Load a video first.", "error");
        return;
    }

    ravConvertBtn.disabled = true;
    ravDownloadBtn.classList.add("hidden");

    try {
        const ffmpeg = await window.MediaFfmpeg.ensureLoaded((p) => ravSetStatus(`Processing... ${p}%`));
        const ext = window.MediaFfmpeg.extFromName(ravSelectedFile.name, "mp4");
        const inName = `input_${Date.now()}.${ext}`;
        const outName = `silent_${Date.now()}.mp4`;

        await window.MediaFfmpeg.writeFile(ffmpeg, inName, ravSelectedFile);
        try {
            await ffmpeg.exec(["-y", "-i", inName, "-c:v", "copy", "-an", outName]);
        } catch {
            await ffmpeg.exec(["-y", "-i", inName, "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-movflags", "+faststart", outName]);
        }

        const bytes = await window.MediaFfmpeg.readFile(ffmpeg, outName);
        ravOutputBlob = new Blob([bytes.buffer], { type: "video/mp4" });
        ravDownloadBtn.classList.remove("hidden");
        ravSetStatus("Audio removed successfully.", "success");
    } catch (err) {
        ravSetStatus(`Failed: ${err.message || "Unknown error"}`, "error");
    } finally {
        ravConvertBtn.disabled = false;
    }
});

ravDownloadBtn.addEventListener("click", () => {
    if (!ravOutputBlob || !ravSelectedFile) return;
    const base = window.MediaFfmpeg.baseFromName(ravSelectedFile.name, "video");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(ravOutputBlob);
    a.download = `${base}_no_audio.mp4`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
});
