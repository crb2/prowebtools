const avbFile = document.getElementById("avbFile");
const avbDrop = document.getElementById("avbDrop");
const avbGain = document.getElementById("avbGain");
const avbGainText = document.getElementById("avbGainText");
const avbFormat = document.getElementById("avbFormat");
const avbRunBtn = document.getElementById("avbRunBtn");
const avbDownloadBtn = document.getElementById("avbDownloadBtn");
const avbPreviewCard = document.getElementById("avbPreviewCard");
const avbPreviewAudio = document.getElementById("avbPreviewAudio");
const avbPreviewMeta = document.getElementById("avbPreviewMeta");
const avbStatus = document.getElementById("avbStatus");
const avbMeta = document.getElementById("avbMeta");
let avbSelectedFile = null;
let avbOutBlob = null;
let avbPreviewUrl = "";
let avbOutputExt = "mp3";

function avbStatusSet(msg, mode = "loading") {
  avbStatus.textContent = msg;
  if (mode === "error") avbStatus.style.color = "#ef4444";
  else if (mode === "success") avbStatus.style.color = "#22c55e";
  else avbStatus.style.color = document.body.classList.contains("dark-mode") ? "#facc15" : "#b8860b";
}

function avbSetGainProgress() {
  const min = Number(avbGain.min) || 100;
  const max = Number(avbGain.max) || 300;
  const value = Number(avbGain.value) || min;
  const progress = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  avbGain.style.setProperty("--progress", `${progress}%`);
}

function avbResetPreview() {
  if (avbPreviewAudio) {
    avbPreviewAudio.pause();
    avbPreviewAudio.removeAttribute("src");
    avbPreviewAudio.load();
  }
  if (avbPreviewMeta) avbPreviewMeta.textContent = "";
  if (avbPreviewCard) avbPreviewCard.classList.add("hidden");
  if (avbPreviewUrl) {
    URL.revokeObjectURL(avbPreviewUrl);
    avbPreviewUrl = "";
  }
}

avbGain.addEventListener("input", () => {
  avbGainText.textContent = `${avbGain.value}%`;
  avbSetGainProgress();
});

function setAvbFile(file) {
  if (!file || !(file.type.startsWith("audio/") || file.type.startsWith("video/"))) { avbStatusSet("Please select audio/video file.", "error"); return; }
  avbSelectedFile = file; avbOutBlob = null; avbOutputExt = "mp3";
  avbDownloadBtn.classList.add("hidden");
  avbResetPreview();
  if (avbMeta) avbMeta.textContent = `Loaded: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
  avbStatusSet(`Loaded: ${file.name}`);
}

avbDrop.addEventListener("click", () => avbFile.click());
avbDrop.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); avbFile.click(); } });
["dragenter","dragover"].forEach((n)=>avbDrop.addEventListener(n,(e)=>{e.preventDefault();avbDrop.classList.add("is-dragover");}));
["dragleave","dragend","drop"].forEach((n)=>avbDrop.addEventListener(n,(e)=>{e.preventDefault();avbDrop.classList.remove("is-dragover");}));
avbDrop.addEventListener("drop",(e)=>setAvbFile(e.dataTransfer?.files?.[0]||null));
avbFile.addEventListener("change",()=>setAvbFile(avbFile.files?.[0]||null));

avbRunBtn.addEventListener("click", async () => {
  if (!avbSelectedFile) { avbStatusSet("Load media first.", "error"); return; }
  avbRunBtn.disabled = true; avbDownloadBtn.classList.add("hidden");
  try {
    const ffmpeg = await window.MediaFfmpeg.ensureLoaded((p) => avbStatusSet(`Processing... ${p}%`));
    const ext = window.MediaFfmpeg.extFromName(avbSelectedFile.name, "dat");
    const inName = `in_${Date.now()}.${ext}`;
    const format = avbFormat.value === "wav" ? "wav" : avbFormat.value === "m4a" ? "m4a" : "mp3";
    const outName = `boosted_${Date.now()}.${format}`;
    const requestedGain = Math.max(100, Math.min(300, Number(avbGain.value) || 150)) / 100;
    // Keep high gain usable while reducing clipping/distortion near 300%.
    const safeGain = requestedGain <= 2 ? requestedGain : (2 + (requestedGain - 2) * 0.35);
    const gainFilterPrimary = `volume=${safeGain.toFixed(3)},alimiter=limit=0.96`;
    const gainFilterFallback = `volume=${safeGain.toFixed(3)}`;
    await window.MediaFfmpeg.writeFile(ffmpeg, inName, avbSelectedFile);
    const codecArgs = format === "wav"
      ? ["-vn", "-c:a", "pcm_s16le"]
      : format === "m4a"
        ? ["-vn", "-c:a", "aac", "-b:a", "192k"]
        : ["-vn", "-c:a", "libmp3lame", "-q:a", "2"];

    let encoded = false;
    for (const filter of [gainFilterPrimary, gainFilterFallback]) {
      try {
        await ffmpeg.exec(["-y", "-i", inName, "-af", filter, ...codecArgs, outName]);
        encoded = true;
        break;
      } catch {}
    }
    if (!encoded) {
      throw new Error("Unable to apply gain filter");
    }
    const bytes = await window.MediaFfmpeg.readFile(ffmpeg, outName);
    avbOutputExt = format;
    const mime = format === "wav" ? "audio/wav" : format === "m4a" ? "audio/mp4" : "audio/mpeg";
    avbOutBlob = new Blob([bytes.buffer], { type: mime });
    avbResetPreview();
    avbPreviewUrl = URL.createObjectURL(avbOutBlob);
    if (avbPreviewAudio) {
      avbPreviewAudio.src = avbPreviewUrl;
      avbPreviewAudio.load();
    }
    if (avbPreviewMeta) {
      avbPreviewMeta.textContent = `Preview ready (${format.toUpperCase()}) | ${(avbOutBlob.size / 1024 / 1024).toFixed(2)} MB`;
    }
    if (avbPreviewCard) avbPreviewCard.classList.remove("hidden");
    avbDownloadBtn.classList.remove("hidden");
    if (avbMeta) avbMeta.textContent = `Output size: ${(avbOutBlob.size / 1024 / 1024).toFixed(2)} MB`;
    avbStatusSet(`Audio boosting complete (effective gain ${Math.round(safeGain * 100)}%).`, "success");
  } catch (err) {
    avbStatusSet(`Failed: ${err.message || "Unknown error"}`, "error");
  } finally { avbRunBtn.disabled = false; }
});

avbDownloadBtn.addEventListener("click", () => {
  if (!avbOutBlob || !avbSelectedFile) return;
  const base = window.MediaFfmpeg.baseFromName(avbSelectedFile.name, "audio");
  const ext = avbOutputExt || (avbFormat.value === "wav" ? "wav" : avbFormat.value === "m4a" ? "m4a" : "mp3");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(avbOutBlob); a.download = `${base}_boosted.${ext}`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
});

if (avbPreviewAudio && avbPreviewMeta) {
  avbPreviewAudio.addEventListener("loadedmetadata", () => {
    if (!Number.isFinite(avbPreviewAudio.duration) || avbPreviewAudio.duration <= 0) return;
    const secs = Math.round(avbPreviewAudio.duration);
    const m = Math.floor(secs / 60);
    const s = String(secs % 60).padStart(2, "0");
    avbPreviewMeta.textContent = `${avbPreviewMeta.textContent.split("|")[0].trim()} | ${m}:${s}`;
  });
}

window.addEventListener("beforeunload", () => {
  if (avbPreviewUrl) URL.revokeObjectURL(avbPreviewUrl);
});

avbSetGainProgress();
