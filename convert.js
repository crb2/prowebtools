const convertForm = document.getElementById("convertForm");
const videoFileInput = document.getElementById("videoFile");
const dropZone = document.getElementById("dropZone");
const videoUrlInput = document.getElementById("videoUrl");
const audioFormatSelect = document.getElementById("audioFormat");
const startTimeInput = document.getElementById("startTime");
const endTimeInput = document.getElementById("endTime");
const startTimeLabel = document.getElementById("startTimeLabel");
const endTimeLabel = document.getElementById("endTimeLabel");
const fileStatsInput = document.getElementById("fileStats");
const fileDetailsMeta = document.getElementById("fileDetailsMeta");
const fileNameHint = document.getElementById("fileNameHint");
const audioFormatTrigger = document.getElementById("audioFormatTrigger");
const audioFormatMenu = document.getElementById("audioFormatMenu");
const audioFormatOptions = Array.from(document.querySelectorAll(".custom-format-option"));
const audioFormatBackdrop = document.getElementById("audioFormatBackdrop");
const outputBaseNameInput = document.getElementById("outputBaseName");
const outputExtSpan = document.getElementById("outputExt");
const convertInfo = document.getElementById("convertInfo");
const convertStatus = document.getElementById("convertStatus");
const convertBtn = document.getElementById("convertBtn");
const downloadBtn = document.getElementById("downloadBtn");
const downloadBassBtn = document.getElementById("downloadBassBtn");
const previewWrap = document.getElementById("previewWrap");
const audioPreview = document.getElementById("audioPreview");
const previewPlayBtn = document.getElementById("previewPlayBtn");
const previewSeek = document.getElementById("previewSeek");
const previewTime = document.getElementById("previewTime");
const previewVolumeBtn = document.getElementById("previewVolumeBtn");
const previewVolumeWrap = document.getElementById("previewVolumeWrap");
const previewVolumePanel = document.getElementById("previewVolumePanel");
const previewVolume = document.getElementById("previewVolume");
const previewBass = document.getElementById("previewBass");
const previewMeta = document.getElementById("previewMeta");
const backendStatusNote = document.getElementById("backendStatusNote");
const BACKEND_FETCH_ENDPOINTS = ["/api/fetch-video", "http://127.0.0.1:3000/api/fetch-video", "http://localhost:3000/api/fetch-video"];
const BACKEND_HEALTH_ENDPOINTS = ["/api/health", "http://127.0.0.1:3000/api/health", "http://localhost:3000/api/health"];

let outputBlob = null;
let outputFileName = "";
let ffmpeg = null;
let ffmpegLoaded = false;
let selectedFile = null;
let selectedDurationSeconds = 0;
let previewObjectUrl = "";
let currentOutputExt = ".mp3";
let currentResultMeta = null;
let clipboardAutoFilled = false;
let youtubeBackendOnline = false;
let selectedDisplayName = "";
let selectedOriginalMeta = null;
let timeUsesHours = false;
let previewAudioContext = null;
let previewSourceNode = null;
let previewBassFilter = null;
let previewCompressor = null;
let previewOutputGain = null;

const MAX_UPLOAD_BYTES = 2 * 1024 ** 3;

const formatConfig = {
    mp3: {
        ext: "mp3",
        mime: "audio/mpeg",
        argSets: [
            ["-vn", "-c:a", "libmp3lame", "-q:a", "2"],
            ["-vn", "-c:a", "mp3", "-q:a", "2"]
        ]
    },
    wav: {
        ext: "wav",
        mime: "audio/wav",
        argSets: [["-vn", "-c:a", "pcm_s16le"]]
    },
    aac: {
        ext: "m4a",
        mime: "audio/mp4",
        argSets: [["-vn", "-c:a", "aac", "-b:a", "192k"]]
    },
    flac: {
        ext: "flac",
        mime: "audio/flac",
        argSets: [["-vn", "-c:a", "flac"]]
    },
    ogg: {
        ext: "ogg",
        mime: "audio/ogg",
        argSets: [
            ["-vn", "-c:a", "libvorbis", "-q:a", "5"],
            ["-vn", "-c:a", "libopus", "-b:a", "128k"]
        ]
    }
};

function setStatus(message, isError = false) {
    convertStatus.textContent = message;
    const isConvertingProgress = /^Converting\.\.\.\s*\d+%/i.test(String(message || ""));
    const isLoadingState = /^Loading(\s|\.\.\.)/i.test(String(message || ""));
    convertStatus.classList.toggle("is-converting", isConvertingProgress);
    convertStatus.classList.toggle("is-loading", isLoadingState && !isConvertingProgress);
    if (isError === true) {
        convertStatus.style.color = "#ef4444";
        return;
    }
    if (isError === "success") {
        convertStatus.style.color = "#22c55e";
        return;
    }
    convertStatus.style.color = "#facc15";
}

function bytesToReadable(bytes) {
    if (bytes >= 1024 ** 3) {
        return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
    }
    if (bytes >= 1024 ** 2) {
        return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
    }
    return `${(bytes / 1024).toFixed(2)} KB`;
}

function bytesToReadableCompact(bytes) {
    if (bytes >= 1024 ** 3) {
        return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
    }
    if (bytes >= 1024 ** 2) {
        return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
    }
    return `${(bytes / 1024).toFixed(1)} KB`;
}

function buildOutputSummary(bytes, bitrateKbps, formatKey) {
    const sizeText = bytesToReadableCompact(bytes);
    if (!(bitrateKbps > 0)) return sizeText;
    const base = `${sizeText} - ${bitrateKbps} kb/s`;
    if (formatKey === "wav") {
        return `${base} (WAV uncompressed, quality not upscaled)`;
    }
    return base;
}

function getBaseName(filename) {
    const lastDot = filename.lastIndexOf(".");
    if (lastDot <= 0) {
        return filename;
    }
    return filename.slice(0, lastDot);
}

function getDownloadBaseName(filename) {
    const raw = getBaseName(filename);
    const cleaned = raw
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/[. ]+$/g, "");
    return cleaned || "audio_output";
}

function sanitizeBaseName(value) {
    const cleaned = (value || "")
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/[. ]+$/g, "");
    return cleaned || "audio_output";
}

function basenameFromPathLike(pathLike) {
    const raw = String(pathLike || "").trim();
    if (!raw) return "";
    const normalized = raw.replace(/\\/g, "/");
    const leaf = normalized.split("/").pop() || "";
    return leaf.trim();
}

function looksLikeGenericNumericName(name) {
    const base = getBaseName(name || "");
    return /^\d{7,}$/.test(base);
}

function resolveLocalDisplayName(file) {
    const candidates = [];
    if (file && file.name) {
        candidates.push(file.name);
    }
    if (file && file.webkitRelativePath) {
        candidates.push(basenameFromPathLike(file.webkitRelativePath));
    }
    if (videoFileInput && videoFileInput.value) {
        const fromInput = basenameFromPathLike(videoFileInput.value);
        if (fromInput && !/^fakepath$/i.test(fromInput)) {
            candidates.push(fromInput);
        }
    }

    const cleaned = candidates
        .map((item) => basenameFromPathLike(item))
        .filter(Boolean);
    if (!cleaned.length) return file && file.name ? file.name : "video_file";

    const better = cleaned.find((name) => !looksLikeGenericNumericName(name));
    return better || cleaned[0];
}

function updateFileNameHint(name, isLinkedSource) {
    if (!fileNameHint) return;
    if (isLinkedSource) {
        fileNameHint.textContent = "";
        fileNameHint.classList.add("hidden");
        fileNameHint.classList.remove("is-error");
        return;
    }
    if (looksLikeGenericNumericName(name)) {
        fileNameHint.textContent = "Gallery provided a temporary filename. For exact original name, use File Manager/Files app or Rename Video.";
        fileNameHint.classList.remove("hidden");
        fileNameHint.classList.add("is-error");
        return;
    }
    fileNameHint.textContent = "";
    fileNameHint.classList.add("hidden");
    fileNameHint.classList.remove("is-error");
}

function getOutputExtByFormat(format) {
    const config = formatConfig[format] || formatConfig.mp3;
    return config.ext;
}

function updateOutputExtUi() {
    if (outputExtSpan) {
        outputExtSpan.textContent = currentOutputExt;
    }
}

function getComposedOutputName() {
    const base = sanitizeBaseName(outputBaseNameInput ? outputBaseNameInput.value : "");
    return `${base}${currentOutputExt}`;
}

function isYoutubeUrl(url) {
    const host = (url.hostname || "").toLowerCase();
    return host === "youtu.be" || host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com");
}

function isLikelyVideoLink(urlText) {
    try {
        const parsed = new URL(urlText);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
        if (isYoutubeUrl(parsed)) return true;
        return /\.(mp4|m4v|mov|webm|mkv|avi|mpeg|mpg|3gp|ts|m2ts)(\?.*)?$/i.test(parsed.pathname);
    } catch {
        return false;
    }
}

async function tryAutofillVideoUrlFromClipboard() {
    if (!videoUrlInput || !navigator.clipboard || !window.isSecureContext) return;
    if ((videoUrlInput.value || "").trim()) return;
    try {
        const clip = (await navigator.clipboard.readText() || "").trim();
        if (!clip || !isLikelyVideoLink(clip)) return;
        videoUrlInput.value = clip;
        clipboardAutoFilled = true;
        setStatus("Video link auto-filled from clipboard.");
    } catch {
        // Clipboard access may be blocked by browser permission; ignore silently.
    }
}

async function fetchVideoViaBackend(urlText) {
    let lastError = null;
    for (const endpoint of BACKEND_FETCH_ENDPOINTS) {
        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ url: urlText })
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                const reason = payload && payload.error ? payload.error : `Backend failed (${response.status})`;
                throw new Error(reason);
            }

            const blob = await response.blob();
            if (!blob || blob.size <= 0) {
                throw new Error("Backend returned an empty file.");
            }
            if (blob.size > MAX_UPLOAD_BYTES) {
                throw new Error("Downloaded file exceeds 2 GB limit.");
            }
            const headerRawName = response.headers.get("X-File-Name") || "";
            const titleRaw = response.headers.get("X-Video-Title") || "";
            const durationRaw = response.headers.get("X-Original-Duration") || "";
            const filesizeRaw = response.headers.get("X-Original-Filesize") || "";
            let headerName = headerRawName;
            if (headerRawName) {
                try {
                    headerName = decodeURIComponent(headerRawName);
                } catch {
                    headerName = headerRawName;
                }
            }
            let videoTitle = titleRaw;
            if (titleRaw) {
                try {
                    videoTitle = decodeURIComponent(titleRaw);
                } catch {
                    videoTitle = titleRaw;
                }
            }
            videoTitle = cleanDisplayName(videoTitle);
            const fallbackName = getFileNameFromUrl(urlText, blob.type || "video/mp4");
            const headerExt = getExtFromName(headerName);
            const fallbackExt = headerExt || getExtFromName(fallbackName) || getExtFromMime(blob.type || "video/mp4");
            const preferredName = videoTitle ? `${videoTitle}.${fallbackExt}` : (headerName || fallbackName);
            const fileName = sanitizeFileName(preferredName, fallbackExt);
            selectedDisplayName = cleanDisplayName(videoTitle ? `${videoTitle}.${fallbackExt}` : fileName);
            const originalDurationSec = Number(durationRaw || 0);
            const originalFilesize = Number(filesizeRaw || 0);
            selectedOriginalMeta = {
                durationSec: Number.isFinite(originalDurationSec) && originalDurationSec > 0 ? originalDurationSec : 0,
                filesize: Number.isFinite(originalFilesize) && originalFilesize > 0
                    ? originalFilesize
                    : (blob.size > 0 ? blob.size : 0)
            };
            return new File([blob], fileName, { type: blob.type || "video/mp4" });
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error("Link service is not reachable.");
}

function setBackendStatusUi(online) {
    youtubeBackendOnline = Boolean(online);
    if (!backendStatusNote) return;
    if (youtubeBackendOnline) {
        backendStatusNote.textContent = "";
        backendStatusNote.classList.add("hidden");
        backendStatusNote.classList.remove("is-error");
        return;
    }
    backendStatusNote.textContent = "YouTube link mode is currently unavailable.";
    backendStatusNote.classList.remove("hidden");
    backendStatusNote.classList.add("is-error");
}

async function refreshBackendHealth() {
    let online = false;
    for (const endpoint of BACKEND_HEALTH_ENDPOINTS) {
        try {
            const res = await fetch(endpoint, { method: "GET", cache: "no-store" });
            if (res.ok) {
                online = true;
                break;
            }
        } catch {}
    }
    setBackendStatusUi(online);
}

function getExtFromMime(mimeType) {
    const map = {
        "video/mp4": "mp4",
        "video/webm": "webm",
        "video/quicktime": "mov",
        "video/x-matroska": "mkv",
        "video/x-msvideo": "avi",
        "video/mpeg": "mpeg"
    };
    return map[mimeType] || "mp4";
}

function getFileNameFromUrl(urlText, mimeType) {
    try {
        const url = new URL(urlText);
        const namePart = decodeURIComponent(url.pathname.split("/").pop() || "").trim();
        const base = sanitizeBaseName(getBaseName(namePart || "linked_video"));
        const hasExt = /\.[a-zA-Z0-9]{2,5}$/.test(namePart);
        if (hasExt) return `${base}${namePart.slice(namePart.lastIndexOf("."))}`;
        return `${base}.${getExtFromMime(mimeType)}`;
    } catch {
        return `linked_video.${getExtFromMime(mimeType)}`;
    }
}

function getExtFromName(fileName) {
    const name = (fileName || "").trim();
    const idx = name.lastIndexOf(".");
    if (idx <= 0 || idx === name.length - 1) return "";
    return name.slice(idx + 1).toLowerCase();
}

function sanitizeFileName(value, fallbackExt = "mp4") {
    const raw = String(value || "").trim();
    const cleaned = raw
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(/[\r\n\t]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/[. ]+$/g, "");
    if (!cleaned) return `video_file.${fallbackExt}`;
    const hasExt = /\.[a-zA-Z0-9]{2,5}$/.test(cleaned);
    if (hasExt) return cleaned;
    return `${cleaned}.${fallbackExt}`;
}

function cleanDisplayName(value) {
    return String(value || "")
        .replace(/\uFFFD/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function syncCustomFormatUi() {
    if (!audioFormatSelect || !audioFormatTrigger || !audioFormatOptions.length) return;
    const current = audioFormatSelect.value || "mp3";
    let matched = null;
    for (const option of audioFormatOptions) {
        const isActive = option.dataset.value === current;
        option.classList.toggle("is-active", isActive);
        option.setAttribute("aria-selected", isActive ? "true" : "false");
        if (isActive) matched = option;
    }
    if (matched) {
        audioFormatTrigger.textContent = matched.textContent || "Select format";
    }
}

function closeCustomFormatMenu() {
    if (!audioFormatMenu || !audioFormatTrigger) return;
    audioFormatMenu.classList.add("hidden");
    audioFormatMenu.classList.remove("is-modal");
    if (audioFormatBackdrop) {
        audioFormatBackdrop.classList.add("hidden");
    }
    audioFormatTrigger.setAttribute("aria-expanded", "false");
}

function openCustomFormatMenu() {
    if (!audioFormatMenu || !audioFormatTrigger) return;
    audioFormatMenu.classList.remove("hidden");
    audioFormatMenu.classList.add("is-modal");
    if (audioFormatBackdrop) {
        audioFormatBackdrop.classList.remove("hidden");
    }
    audioFormatTrigger.setAttribute("aria-expanded", "true");
}

function updateReadyOutputLabel() {
    const file = getActiveFile();
    if (!file) {
        return;
    }
    const outputName = getComposedOutputName();
    if (outputBlob) {
        outputFileName = outputName;
    }
    if (currentResultMeta) {
        convertInfo.textContent = `${currentResultMeta.prefix}${currentResultMeta.detail}`;
    } else if (outputBlob) {
        convertInfo.textContent = "Ready to download normal/bass boosted audio.";
    } else {
        convertInfo.textContent = "Ready to convert.";
    }
}

function clearOutput() {
    outputBlob = null;
    outputFileName = "";
    currentResultMeta = null;
    downloadBtn.disabled = true;
    if (downloadBassBtn) {
        downloadBassBtn.disabled = true;
    }
    if (audioPreview) {
        audioPreview.pause();
        audioPreview.removeAttribute("src");
        audioPreview.load();
    }
    if (previewPlayBtn) {
        previewPlayBtn.textContent = "Play";
    }
    if (previewSeek) {
        previewSeek.value = "0";
    }
    if (previewTime) {
        previewTime.textContent = "0:00 / 0:00";
    }
    if (previewVolumePanel) {
        previewVolumePanel.classList.add("hidden");
    }
    if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = "";
    }
    if (previewWrap) {
        previewWrap.classList.add("hidden");
    }
    if (previewMeta) {
        previewMeta.textContent = "";
        previewMeta.classList.add("hidden");
    }
}

function autoResizeFileStats() {
    if (!fileStatsInput) return;
    fileStatsInput.style.height = "auto";
    fileStatsInput.style.height = `${Math.max(92, fileStatsInput.scrollHeight)}px`;
}

function getActiveFile() {
    return selectedFile || (videoFileInput.files && videoFileInput.files[0] ? videoFileInput.files[0] : null);
}

function safeErrorMessage(error) {
    if (!error) return "Unknown error";
    if (typeof error === "string") return error;
    if (error && typeof error.message === "string") return error.message;
    return "Unexpected encoder failure";
}

function formatPlayerTime(seconds) {
    const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
    const m = Math.floor(safe / 60);
    const s = Math.floor(safe % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
}

function formatMinutesSeconds(totalSeconds) {
    const safe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? totalSeconds : 0;
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const seconds = Math.floor(safe % 60);
    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    }
    return `${minutes}m ${seconds}s`;
}

function setTimeInputMode(durationSeconds) {
    const useHours = Number.isFinite(durationSeconds) && durationSeconds >= 3600;
    timeUsesHours = useHours;
    const labelText = useHours ? "HH:MM:SS" : "MM:SS";
    const placeholder = useHours ? "00:00:00" : "00:00";
    if (startTimeLabel) startTimeLabel.textContent = `Start Time (${labelText})`;
    if (endTimeLabel) endTimeLabel.textContent = `End Time (${labelText})`;
    if (startTimeInput) {
        startTimeInput.placeholder = placeholder;
        startTimeInput.value = normalizeTimeInput(startTimeInput.value, useHours);
    }
    if (endTimeInput) {
        endTimeInput.placeholder = placeholder;
        endTimeInput.value = normalizeTimeInput(endTimeInput.value, useHours);
    }
}

function bassPercentToGainDb(percent) {
    const p = Math.max(0, Math.min(100, Number(percent) || 0));
    return Math.pow(p / 100, 1.15) * 10;
}

function applyBassBoost() {
    if (!previewBassFilter || !previewBass) return;
    const gainDb = bassPercentToGainDb(previewBass.value);
    previewBassFilter.gain.value = gainDb;
    if (previewOutputGain) {
        previewOutputGain.gain.value = Math.max(0.78, 1 - gainDb / 30);
    }
}

function ensurePreviewAudioGraph() {
    if (!audioPreview) return false;
    if (previewAudioContext && previewSourceNode && previewBassFilter && previewCompressor && previewOutputGain) {
        applyBassBoost();
        return true;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    try {
        previewAudioContext = new Ctx();
        previewSourceNode = previewAudioContext.createMediaElementSource(audioPreview);
        previewBassFilter = previewAudioContext.createBiquadFilter();
        previewCompressor = previewAudioContext.createDynamicsCompressor();
        previewOutputGain = previewAudioContext.createGain();
        previewBassFilter.type = "lowshelf";
        previewBassFilter.frequency.value = 180;
        previewCompressor.threshold.value = -16;
        previewCompressor.knee.value = 18;
        previewCompressor.ratio.value = 3;
        previewCompressor.attack.value = 0.003;
        previewCompressor.release.value = 0.2;
        previewSourceNode.connect(previewBassFilter);
        previewBassFilter.connect(previewCompressor);
        previewCompressor.connect(previewOutputGain);
        previewOutputGain.connect(previewAudioContext.destination);
        applyBassBoost();
        return true;
    } catch {
        return false;
    }
}

function syncPreviewUi() {
    if (!audioPreview || !previewSeek || !previewTime) return;
    const duration = Number.isFinite(audioPreview.duration) ? audioPreview.duration : 0;
    const current = Number.isFinite(audioPreview.currentTime) ? audioPreview.currentTime : 0;
    previewSeek.max = duration > 0 ? String(duration) : "0";
    previewSeek.value = String(Math.min(current, duration || 0));
    previewTime.textContent = `${formatPlayerTime(current)} / ${formatPlayerTime(duration)}`;
}

function setPreviewFromBlob(blob) {
    if (!audioPreview || !previewWrap) return;
    if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = "";
    }
    previewObjectUrl = URL.createObjectURL(blob);
    audioPreview.src = previewObjectUrl;
    audioPreview.volume = 0.5;
    if (previewVolume) {
        previewVolume.value = "0.5";
    }
    if (previewBass) {
        previewBass.value = "0";
    }
    applyBassBoost();
    audioPreview.currentTime = 0;
    syncPreviewUi();
    if (previewPlayBtn) {
        previewPlayBtn.textContent = "Play";
    }
    if (previewVolumePanel) {
        previewVolumePanel.classList.remove("hidden");
    }
    previewWrap.classList.remove("hidden");
}

function encodeWav(audioBuffer) {
    const channels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const samples = audioBuffer.length;
    const bytesPerSample = 2;
    const blockAlign = channels * bytesPerSample;
    const dataSize = samples * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    function writeString(offset, text) {
        for (let i = 0; i < text.length; i += 1) {
            view.setUint8(offset + i, text.charCodeAt(i));
        }
    }

    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, dataSize, true);

    const channelData = [];
    for (let channel = 0; channel < channels; channel += 1) {
        channelData.push(audioBuffer.getChannelData(channel));
    }

    let offset = 44;
    for (let i = 0; i < samples; i += 1) {
        for (let channel = 0; channel < channels; channel += 1) {
            const value = Math.max(-1, Math.min(1, channelData[channel][i]));
            const int16 = value < 0 ? value * 0x8000 : value * 0x7fff;
            view.setInt16(offset, int16, true);
            offset += 2;
        }
    }

    return new Blob([buffer], { type: "audio/wav" });
}

async function convertToWavFallback(file) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const wavBlob = encodeWav(decoded);
    await audioContext.close();
    return wavBlob;
}

async function renderBassBoostedWav(sourceBlob, bassDb) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx || typeof OfflineAudioContext === "undefined") {
        throw new Error("Bass boost export is not supported in this browser.");
    }
    const audioCtx = new Ctx();
    try {
        const sourceBuffer = await sourceBlob.arrayBuffer();
        const decoded = await audioCtx.decodeAudioData(sourceBuffer.slice(0));
        const channels = decoded.numberOfChannels;
        const sampleRate = decoded.sampleRate;
        const length = decoded.length;
        const offline = new OfflineAudioContext(channels, length, sampleRate);
        const source = offline.createBufferSource();
        source.buffer = decoded;
        const bass = offline.createBiquadFilter();
        const compressor = offline.createDynamicsCompressor();
        const outGain = offline.createGain();
        bass.type = "lowshelf";
        bass.frequency.value = 180;
        bass.gain.value = Math.max(0, Math.min(10, Number.isFinite(bassDb) ? bassDb : 0));
        compressor.threshold.value = -16;
        compressor.knee.value = 18;
        compressor.ratio.value = 3;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.2;
        outGain.gain.value = Math.max(0.78, 1 - bass.gain.value / 30);
        source.connect(bass);
        bass.connect(compressor);
        compressor.connect(outGain);
        outGain.connect(offline.destination);
        source.start(0);
        const rendered = await offline.startRendering();
        return encodeWav(rendered);
    } finally {
        await audioCtx.close();
    }
}

async function getVideoDuration(file) {
    return new Promise((resolve) => {
        const tempUrl = URL.createObjectURL(file);
        const media = document.createElement("video");
        media.preload = "metadata";
        media.src = tempUrl;
        media.onloadedmetadata = () => {
            const duration = Number.isFinite(media.duration) ? media.duration : 0;
            URL.revokeObjectURL(tempUrl);
            resolve(duration);
        };
        media.onerror = () => {
            URL.revokeObjectURL(tempUrl);
            resolve(0);
        };
    });
}

async function showSelectedFile(file) {
    if (!file) {
        setTimeInputMode(0);
        fileStatsInput.value = "";
        fileStatsInput.title = "";
        autoResizeFileStats();
        if (fileDetailsMeta) {
            fileDetailsMeta.textContent = "Size: -- | Duration: --";
        }
        updateFileNameHint("", false);
        convertInfo.textContent = "Choose a video and click convert.";
        return;
    }

    const seconds = await getVideoDuration(file);
    selectedDurationSeconds = seconds || 0;
    const shownDuration = selectedOriginalMeta && selectedOriginalMeta.durationSec > 0 ? selectedOriginalMeta.durationSec : seconds;
    setTimeInputMode(shownDuration || 0);
    const usingLinkMeta = Boolean(selectedOriginalMeta);
    const shownSize = usingLinkMeta
        ? (selectedOriginalMeta && selectedOriginalMeta.filesize > 0 ? selectedOriginalMeta.filesize : 0)
        : (file && file.size > 0 ? file.size : 0);
    const minuteText = shownDuration ? formatMinutesSeconds(shownDuration) : "unknown duration";
    const isLinkedSource = Boolean(selectedOriginalMeta);
    const localName = resolveLocalDisplayName(file);
    const finalDisplayName = isLinkedSource ? cleanDisplayName(selectedDisplayName || file.name) : localName;
    fileStatsInput.value = finalDisplayName;
    fileStatsInput.title = fileStatsInput.value;
    updateFileNameHint(finalDisplayName, isLinkedSource);
    autoResizeFileStats();
    if (fileDetailsMeta) {
        const sizeText = shownSize > 0 ? bytesToReadable(shownSize) : "unknown size";
        fileDetailsMeta.textContent = `Size: ${sizeText} | Duration: ${minuteText}`;
    }
    if (outputBaseNameInput) {
        outputBaseNameInput.value = getDownloadBaseName(selectedDisplayName || file.name);
    }
    currentOutputExt = `.${getOutputExtByFormat(audioFormatSelect.value)}`;
    updateOutputExtUi();
    updateReadyOutputLabel();
}

async function setSelectedFile(file, keepVideoUrl = false) {
    if (file && file.type && !file.type.startsWith("video/") && !file.type.startsWith("audio/")) {
        selectedFile = null;
        selectedDurationSeconds = 0;
        setTimeInputMode(0);
        fileStatsInput.value = "";
        fileStatsInput.title = "";
        autoResizeFileStats();
        if (fileDetailsMeta) {
            fileDetailsMeta.textContent = "Size: -- | Duration: --";
        }
        updateFileNameHint("", false);
        convertInfo.textContent = "Choose a video and click convert.";
        setStatus("Only video or audio source files are supported for conversion.", true);
        return;
    }
    selectedFile = file;
    if (!keepVideoUrl) {
        selectedDisplayName = "";
        selectedOriginalMeta = null;
    }
    if (videoUrlInput && file && !keepVideoUrl) {
        videoUrlInput.value = "";
    }
    clearOutput();
    setStatus("");
    await showSelectedFile(file);
}

async function loadVideoFromUrl(urlText) {
    let parsed;
    try {
        parsed = new URL(urlText);
    } catch {
        throw new Error("Please enter a valid URL starting with http:// or https://");
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("Only http:// or https:// links are supported.");
    }

    if (isYoutubeUrl(parsed)) {
        if (!youtubeBackendOnline) {
            throw new Error("YouTube link mode is offline.");
        }
        setStatus("Downloading video from link...");
        const ytFile = await fetchVideoViaBackend(parsed.toString());
        await setSelectedFile(ytFile, true);
        setStatus("YouTube link loaded. You can now convert.", "success");
        return;
    }

    setStatus("Fetching video from link...");
    const response = await fetch(parsed.toString());
    if (!response.ok) {
        throw new Error(`Link fetch failed (${response.status}).`);
    }

    const blob = await response.blob();
    if (blob.size <= 0) {
        throw new Error("Could not read video data from this link.");
    }
    if (blob.size > MAX_UPLOAD_BYTES) {
        throw new Error("File exceeds max upload size of 2 GB.");
    }

    const mime = blob.type || "";
    const looksLikeVideo = mime.startsWith("video/");
    const pathLooksVideo = /\.(mp4|m4v|mov|webm|mkv|avi|mpeg|mpg|3gp|ts|m2ts)(\?.*)?$/i.test(parsed.pathname);
    if (!looksLikeVideo && !pathLooksVideo) {
        throw new Error("This link does not look like a direct video file URL.");
    }

    const fileName = getFileNameFromUrl(parsed.toString(), mime || "video/mp4");
    const file = new File([blob], fileName, { type: mime || "video/mp4" });
    await setSelectedFile(file, true);
    setStatus("Video link loaded. You can now convert.", "success");
}

function hasFfmpegGlobals() {
    return Boolean(window.FFmpegWASM);
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[data-ffmpeg-src="${src}"]`);
        if (existing) {
            if (existing.getAttribute("data-loaded") === "true") {
                resolve();
                return;
            }
            existing.addEventListener("load", () => resolve(), { once: true });
            existing.addEventListener("error", () => reject(new Error(`Failed script: ${src}`)), { once: true });
            return;
        }

        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.setAttribute("data-ffmpeg-src", src);
        script.addEventListener("load", () => {
            script.setAttribute("data-loaded", "true");
            resolve();
        });
        script.addEventListener("error", () => reject(new Error(`Failed script: ${src}`)));
        document.head.appendChild(script);
    });
}

async function ensureFfmpegScripts() {
    if (hasFfmpegGlobals()) {
        return;
    }

    const sources = [
        {
            ffmpeg: "vendor/ffmpeg/ffmpeg.js"
        },
        {
            ffmpeg: "https://unpkg.com/@ffmpeg/ffmpeg@0.12.15/dist/umd/ffmpeg.js"
        },
        {
            ffmpeg: "https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.15/dist/umd/ffmpeg.js"
        }
    ];

    let lastError = null;
    for (const source of sources) {
        try {
            await loadScript(source.ffmpeg);
            if (hasFfmpegGlobals()) {
                return;
            }
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error("Unable to load ffmpeg runtime scripts");
}

async function fetchArrayBuffer(path) {
    const response = await fetch(path);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${path} (${response.status})`);
    }
    return response.arrayBuffer();
}

async function toBlobURLFromPath(path, mime) {
    const content = await fetchArrayBuffer(path);
    return URL.createObjectURL(new Blob([content], { type: mime }));
}

async function fileToUint8Array(file) {
    return new Uint8Array(await file.arrayBuffer());
}

function parseTimeToSeconds(raw, withHours = timeUsesHours) {
    const value = (raw || "").trim();
    if (!value) return null;
    if (withHours) {
        if (!/^\d{1,2}:\d{2}:\d{2}$/.test(value)) return NaN;
        const [hh, mm, ss] = value.split(":").map(Number);
        if (Number.isNaN(hh) || Number.isNaN(mm) || Number.isNaN(ss) || mm > 59 || ss > 59) return NaN;
        return hh * 3600 + mm * 60 + ss;
    }
    if (!/^\d{1,2}:\d{2}$/.test(value)) return NaN;
    const [mm, ss] = value.split(":").map(Number);
    if (Number.isNaN(mm) || Number.isNaN(ss) || ss > 59) return NaN;
    return mm * 60 + ss;
}

function normalizeTimeInput(raw, withHours = timeUsesHours) {
    const value = (raw || "").trim();
    if (!value) return withHours ? "00:00:00" : "00:00";
    if (withHours) {
        const parts = value.split(":");
        if (parts.length === 3) {
            const hhRaw = parts[0].replace(/\D/g, "");
            const mmRaw = parts[1].replace(/\D/g, "");
            const ssRaw = parts[2].replace(/\D/g, "");
            const hh = hhRaw ? Number(hhRaw) : 0;
            let mm = 0;
            let ss = 0;
            if (mmRaw.length === 1) mm = Number(mmRaw) * 10;
            else if (mmRaw.length >= 2) mm = Number(mmRaw.slice(0, 2));
            if (ssRaw.length === 1) ss = Number(ssRaw) * 10;
            else if (ssRaw.length >= 2) ss = Number(ssRaw.slice(0, 2));
            if (!Number.isFinite(hh) || !Number.isFinite(mm) || !Number.isFinite(ss) || hh < 0 || mm < 0 || ss < 0) return "00:00:00";
            return `${String(hh).padStart(2, "0")}:${String(Math.min(mm, 59)).padStart(2, "0")}:${String(Math.min(ss, 59)).padStart(2, "0")}`;
        }
        if (parts.length === 2) {
            const mmRaw = parts[0].replace(/\D/g, "");
            const ssRaw = parts[1].replace(/\D/g, "");
            const mm = mmRaw ? Number(mmRaw) : 0;
            let ss = 0;
            if (ssRaw.length === 1) ss = Number(ssRaw) * 10;
            else if (ssRaw.length >= 2) ss = Number(ssRaw.slice(0, 2));
            if (!Number.isFinite(mm) || !Number.isFinite(ss) || mm < 0 || ss < 0) return "00:00:00";
            return `00:${String(Math.min(mm, 59)).padStart(2, "0")}:${String(Math.min(ss, 59)).padStart(2, "0")}`;
        }
        const digits = value.replace(/\D/g, "");
        if (!digits) return "00:00:00";
        let hh = 0;
        let mm = 0;
        let ss = 0;
        if (digits.length <= 2) {
            hh = Number(digits);
        } else if (digits.length <= 4) {
            mm = Number(digits.slice(0, -2));
            ss = Number(digits.slice(-2));
        } else if (digits.length === 5) {
            hh = Number(digits.slice(0, 1));
            mm = Number(digits.slice(1, 3));
            ss = Number(digits.slice(3, 5));
        } else {
            hh = Number(digits.slice(0, digits.length - 4));
            mm = Number(digits.slice(digits.length - 4, digits.length - 2));
            ss = Number(digits.slice(digits.length - 2));
        }
        if (!Number.isFinite(hh) || !Number.isFinite(mm) || !Number.isFinite(ss) || hh < 0 || mm < 0 || ss < 0) return "00:00:00";
        return `${String(hh).padStart(2, "0")}:${String(Math.min(mm, 59)).padStart(2, "0")}:${String(Math.min(ss, 59)).padStart(2, "0")}`;
    }
    const parts = value.split(":");
    if (parts.length === 2) {
        const left = parts[0].replace(/\D/g, "");
        const right = parts[1].replace(/\D/g, "");
        const mm = left ? Number(left) : 0;
        let ss = 0;
        if (right.length === 1) {
            ss = Number(right) * 10;
        } else if (right.length >= 2) {
            ss = Number(right.slice(0, 2));
        }
        if (!Number.isFinite(mm) || !Number.isFinite(ss) || mm < 0 || ss < 0) return "00:00";
        return `${String(mm).padStart(2, "0")}:${String(Math.min(ss, 59)).padStart(2, "0")}`;
    }

    const digitsOnly = value.replace(/\D/g, "");
    if (!digitsOnly) return "00:00";

    // Mobile-friendly compact typing:
    // 2    -> 02:00
    // 22   -> 22:00
    // 022  -> 00:22
    // 1256 -> 12:56
    if (digitsOnly.length <= 2) {
        const mm = Number(digitsOnly);
        if (!Number.isFinite(mm) || mm < 0) return "00:00";
        return `${String(mm).padStart(2, "0")}:00`;
    }

    const left = digitsOnly.slice(0, -2);
    const right = digitsOnly.slice(-2);
    const mm = Number(left);
    const ss = Number(right);
    if (!Number.isFinite(mm) || !Number.isFinite(ss) || mm < 0 || ss < 0) return "00:00";
    return `${String(mm).padStart(2, "0")}:${String(Math.min(ss, 59)).padStart(2, "0")}`;
}

function secondsToFfmpegTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function buildTrimArgs(startRaw, endRaw) {
    const normalizedStart = normalizeTimeInput(startRaw, timeUsesHours);
    const normalizedEnd = normalizeTimeInput(endRaw, timeUsesHours);
    const startSec = parseTimeToSeconds(normalizedStart, timeUsesHours);
    const endSec = parseTimeToSeconds(normalizedEnd, timeUsesHours);

    if (Number.isNaN(startSec) || Number.isNaN(endSec)) {
        throw new Error(`Invalid time format. Use ${timeUsesHours ? "HH:MM:SS" : "MM:SS"}.`);
    }

    if (startSec === 0 && endSec === 0) {
        return [];
    }

    if (startSec !== null && endSec !== null && endSec <= startSec) {
        throw new Error("End time must be greater than start time.");
    }

    const args = [];
    if (startSec !== null) {
        args.push("-ss", secondsToFfmpegTime(startSec));
    }
    if (endSec !== null) {
        args.push("-to", secondsToFfmpegTime(endSec));
    }

    return args;
}

async function ensureFfmpegLoaded() {
    if (ffmpegLoaded) {
        return;
    }

    await ensureFfmpegScripts();

    setStatus("Loading...");
    convertInfo.textContent = "First run may take a little longer while encoder files are loaded.";

    const { FFmpeg } = window.FFmpegWASM;
    ffmpeg = new FFmpeg();

    ffmpeg.on("progress", ({ progress }) => {
        const pct = Math.max(0, Math.min(100, Math.round(progress * 100)));
        setStatus(`Converting... ${pct}%`);
    });

    const bases = [
        "vendor/ffmpeg",
        "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd",
        "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd"
    ];
    let loaded = false;
    let lastError = null;

    for (const base of bases) {
        try {
            if (base.startsWith("http")) {
                await ffmpeg.load({
                    coreURL: await toBlobURLFromPath(`${base}/ffmpeg-core.js`, "text/javascript"),
                    wasmURL: await toBlobURLFromPath(`${base}/ffmpeg-core.wasm`, "application/wasm")
                });
            } else {
                await ffmpeg.load({
                    coreURL: `${base}/ffmpeg-core.js`,
                    wasmURL: `${base}/ffmpeg-core.wasm`
                });
            }
            loaded = true;
            break;
        } catch (error) {
            lastError = error;
        }
    }

    if (!loaded) {
        throw lastError || new Error("Unable to load ffmpeg core files");
    }

    ffmpegLoaded = true;
}

async function convertWithFfmpeg(file, format, trimArgs = []) {
    const config = formatConfig[format] || formatConfig.wav;
    const safeName = `job_${Date.now()}`;
    const downloadBaseName = sanitizeBaseName(outputBaseNameInput ? outputBaseNameInput.value : getDownloadBaseName(file.name));
    const inputName = `input_${Date.now()}_${safeName}`;
    const internalOutputName = `output_${Date.now()}.${config.ext}`;
    const downloadName = `${downloadBaseName}.${config.ext}`;

    await ffmpeg.writeFile(inputName, await fileToUint8Array(file));
    try {
        let encoded = false;
        let lastError = null;

        for (const args of config.argSets) {
            try {
                await ffmpeg.exec(["-y", "-i", inputName, ...trimArgs, ...args, internalOutputName]);
                encoded = true;
                break;
            } catch (error) {
                lastError = error;
            }
        }

        if (!encoded) {
            throw lastError || new Error("No working encoder found for selected format");
        }

        const data = await ffmpeg.readFile(internalOutputName);
        const blob = new Blob([data], { type: config.mime });
        return { blob, outputName: downloadName };
    } finally {
        try {
            await ffmpeg.deleteFile(inputName);
        } catch {}
        try {
            await ffmpeg.deleteFile(internalOutputName);
        } catch {}
    }
}

videoFileInput.addEventListener("change", async () => {
    const file = videoFileInput.files && videoFileInput.files[0] ? videoFileInput.files[0] : null;
    await setSelectedFile(file);
});
if (videoUrlInput) {
    videoUrlInput.addEventListener("focus", async () => {
        if (!clipboardAutoFilled) {
            await tryAutofillVideoUrlFromClipboard();
        }
    });
    videoUrlInput.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        if (!convertBtn.disabled) {
            convertForm.requestSubmit();
        }
    });
}

convertForm.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const target = event.target;
    if (target instanceof HTMLTextAreaElement) return;
    if (target instanceof HTMLButtonElement) return;
    if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement) {
        event.preventDefault();
        if (!convertBtn.disabled) {
            convertForm.requestSubmit();
        }
    }
});

window.addEventListener("focus", async () => {
    await tryAutofillVideoUrlFromClipboard();
    await refreshBackendHealth();
});

setTimeout(() => {
    tryAutofillVideoUrlFromClipboard();
}, 250);
setTimeout(() => {
    refreshBackendHealth();
}, 350);

if (dropZone) {
    dropZone.addEventListener("click", () => videoFileInput.click());
    dropZone.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            videoFileInput.click();
        }
    });

    const dragEvents = ["dragenter", "dragover"];
    dragEvents.forEach((eventName) => {
        dropZone.addEventListener(eventName, (event) => {
            event.preventDefault();
            event.stopPropagation();
            dropZone.classList.add("is-dragover");
        });
    });

    ["dragleave", "dragend", "drop"].forEach((eventName) => {
        dropZone.addEventListener(eventName, (event) => {
            event.preventDefault();
            event.stopPropagation();
            dropZone.classList.remove("is-dragover");
        });
    });

    dropZone.addEventListener("drop", async (event) => {
        const files = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files : null;
        const file = files && files[0] ? files[0] : null;
        if (!file) {
            return;
        }
        await setSelectedFile(file);
    });
}

convertForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearOutput();

    let file = getActiveFile();
    if (!file && videoUrlInput && (videoUrlInput.value || "").trim()) {
        try {
            await loadVideoFromUrl(videoUrlInput.value.trim());
            file = getActiveFile();
        } catch (error) {
            const rawReason = safeErrorMessage(error);
            let reason = rawReason;
            let hint = "Direct links may be blocked by website policy.";
            try {
                const parsed = new URL((videoUrlInput.value || "").trim());
                if (isYoutubeUrl(parsed)) {
                    hint = "";
                    if (/rate-limiting this network right now \\(429\\)/i.test(rawReason)) {
                        hint = " Try again in a few minutes, switch network/hotspot, or upload file directly.";
                    }
                    if (/youtube link mode is offline/i.test(rawReason)) {
                        hint = " Start the link service and retry.";
                    }
                    if (/failed to fetch/i.test(rawReason)) {
                        reason = "Cannot connect to local YouTube backend.";
                        hint = " Start the link service and retry.";
                    }
                }
            } catch {}
            const suffix = hint || "";
            setStatus(`Unable to load link: ${reason}${suffix}`, true);
            return;
        }
    }

    if (!file) {
        setStatus("Please upload a video file or paste a video URL.", true);
        return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
        setStatus("File exceeds max upload size of 2 GB.", true);
        return;
    }

    const chosenFormat = audioFormatSelect.value;
    if (!formatConfig[chosenFormat]) {
        setStatus("Unsupported format selected.", true);
        return;
    }

    let trimArgs = [];
    let trimDurationSeconds = selectedDurationSeconds || 0;
    try {
        const normalizedStart = normalizeTimeInput(startTimeInput ? startTimeInput.value : "");
        const normalizedEnd = normalizeTimeInput(endTimeInput ? endTimeInput.value : "");
        if (startTimeInput) startTimeInput.value = normalizedStart;
        if (endTimeInput) endTimeInput.value = normalizedEnd;

        trimArgs = buildTrimArgs(
            normalizedStart,
            normalizedEnd
        );
        const startSec = parseTimeToSeconds(normalizedStart);
        const endSec = parseTimeToSeconds(normalizedEnd);
        const from = startSec !== null ? startSec : 0;
        const to = endSec !== null ? endSec : (selectedDurationSeconds || 0);
        if (to > from) {
            trimDurationSeconds = to - from;
        }
    } catch (timeError) {
        setStatus(safeErrorMessage(timeError), true);
        return;
    }

    convertBtn.disabled = true;
    downloadBtn.disabled = true;
    setStatus("Preparing conversion...");
    convertInfo.textContent = "Processing your file locally in browser.";

    try {
        await ensureFfmpegLoaded();
        const result = await convertWithFfmpeg(file, chosenFormat, trimArgs);
        outputBlob = result.blob;
        currentOutputExt = `.${getOutputExtByFormat(chosenFormat)}`;
        updateOutputExtUi();
        const durationForBitrate = trimDurationSeconds > 0 ? trimDurationSeconds : selectedDurationSeconds;
        const bitrateKbps = durationForBitrate > 0 ? Math.max(1, Math.round((outputBlob.size * 8) / durationForBitrate / 1000)) : 0;
        const summaryText = buildOutputSummary(outputBlob.size, bitrateKbps, chosenFormat);
        currentResultMeta = null;
        if (previewMeta) {
            previewMeta.textContent = summaryText;
            previewMeta.classList.remove("hidden");
        }
        outputFileName = getComposedOutputName();
        updateReadyOutputLabel();
        setPreviewFromBlob(outputBlob);
        setStatus("Conversion completed. Preview is ready. Click Download Audio.", "success");
        downloadBtn.disabled = false;
        if (downloadBassBtn) {
            downloadBassBtn.disabled = false;
        }
    } catch (error) {
        const reason = safeErrorMessage(error);
        try {
            const fallbackBlob = await convertToWavFallback(file);
            outputBlob = fallbackBlob;
            currentOutputExt = ".wav";
            updateOutputExtUi();
            const fallbackBitrate = selectedDurationSeconds > 0
                ? Math.max(1, Math.round((outputBlob.size * 8) / selectedDurationSeconds / 1000))
                : 0;
            const summaryText = buildOutputSummary(outputBlob.size, fallbackBitrate, "wav");
            currentResultMeta = { prefix: "Fallback ready", detail: ` - ${summaryText}` };
            if (previewMeta) {
                previewMeta.textContent = summaryText;
                previewMeta.classList.remove("hidden");
            }
            outputFileName = getComposedOutputName();
            updateReadyOutputLabel();
            setPreviewFromBlob(outputBlob);
            setStatus(`Primary encoder failed (${reason}). WAV preview is ready. You can download it.`, true);
            downloadBtn.disabled = false;
            if (downloadBassBtn) {
                downloadBassBtn.disabled = false;
            }
        } catch (fallbackError) {
            clearOutput();
            const fallbackReason = safeErrorMessage(fallbackError);
            convertInfo.textContent = "Conversion failed. Try a smaller file or a different browser.";
            setStatus(`Encoder failed: ${reason}. Fallback failed: ${fallbackReason}.`, true);
        }
    } finally {
        convertBtn.disabled = false;
    }
});

audioFormatSelect.addEventListener("change", () => {
    syncCustomFormatUi();
    currentOutputExt = `.${getOutputExtByFormat(audioFormatSelect.value)}`;
    updateOutputExtUi();
    if (outputBlob) {
        clearOutput();
        setStatus("Format changed. Convert again to generate new output.");
    }
    updateReadyOutputLabel();
});

if (outputBaseNameInput) {
    outputBaseNameInput.addEventListener("input", () => {
        if (!selectedFile) return;
        updateReadyOutputLabel();
    });
    outputBaseNameInput.addEventListener("blur", () => {
        outputBaseNameInput.value = sanitizeBaseName(outputBaseNameInput.value);
        if (selectedFile) updateReadyOutputLabel();
    });
}

if (audioFormatTrigger && audioFormatMenu && audioFormatOptions.length && audioFormatSelect) {
    audioFormatTrigger.addEventListener("click", () => {
        const isOpen = !audioFormatMenu.classList.contains("hidden");
        if (isOpen) {
            closeCustomFormatMenu();
        } else {
            openCustomFormatMenu();
        }
    });

    for (const option of audioFormatOptions) {
        option.addEventListener("click", () => {
            const next = option.dataset.value || "mp3";
            if (audioFormatSelect.value !== next) {
                audioFormatSelect.value = next;
                audioFormatSelect.dispatchEvent(new Event("change", { bubbles: true }));
            } else {
                syncCustomFormatUi();
            }
            closeCustomFormatMenu();
        });
    }

    document.addEventListener("pointerdown", (event) => {
        if (!audioFormatMenu || !audioFormatTrigger) return;
        if (audioFormatMenu.classList.contains("hidden")) return;
        const target = event.target;
        if (!(target instanceof Node)) return;
        const clickInsideBackdrop = audioFormatBackdrop && audioFormatBackdrop.contains(target);
        if (clickInsideBackdrop) {
            closeCustomFormatMenu();
            return;
        }
        if (!audioFormatMenu.contains(target) && !audioFormatTrigger.contains(target)) {
            closeCustomFormatMenu();
        }
    });
}

if (startTimeInput) {
    startTimeInput.value = normalizeTimeInput(startTimeInput.value, timeUsesHours);
    startTimeInput.addEventListener("focus", () => {
        startTimeInput.value = normalizeTimeInput(startTimeInput.value, timeUsesHours);
    });
    startTimeInput.addEventListener("blur", () => {
        startTimeInput.value = normalizeTimeInput(startTimeInput.value, timeUsesHours);
    });
}

if (endTimeInput) {
    endTimeInput.value = normalizeTimeInput(endTimeInput.value, timeUsesHours);
    endTimeInput.addEventListener("focus", () => {
        endTimeInput.value = normalizeTimeInput(endTimeInput.value, timeUsesHours);
    });
    endTimeInput.addEventListener("blur", () => {
        endTimeInput.value = normalizeTimeInput(endTimeInput.value, timeUsesHours);
    });
}

autoResizeFileStats();
setTimeInputMode(0);
updateOutputExtUi();
syncCustomFormatUi();

if (audioPreview) {
    audioPreview.volume = 0.5;
    audioPreview.addEventListener("loadedmetadata", () => {
        audioPreview.volume = 0.5;
        syncPreviewUi();
    });
    audioPreview.addEventListener("timeupdate", syncPreviewUi);
    audioPreview.addEventListener("play", () => {
        if (previewPlayBtn) previewPlayBtn.textContent = "Pause";
    });
    audioPreview.addEventListener("pause", () => {
        if (previewPlayBtn) previewPlayBtn.textContent = "Play";
    });
    audioPreview.addEventListener("ended", () => {
        if (previewPlayBtn) previewPlayBtn.textContent = "Play";
    });
}

if (previewPlayBtn && audioPreview) {
    previewPlayBtn.addEventListener("click", async () => {
        if (!audioPreview.src) return;
        ensurePreviewAudioGraph();
        if (previewAudioContext && previewAudioContext.state === "suspended") {
            try {
                await previewAudioContext.resume();
            } catch {}
        }
        if (audioPreview.paused) {
            try {
                await audioPreview.play();
            } catch {
                setStatus("Preview playback was blocked by browser.", true);
            }
        } else {
            audioPreview.pause();
        }
    });
}

if (previewSeek && audioPreview) {
    previewSeek.addEventListener("input", () => {
        const next = Number(previewSeek.value);
        if (!Number.isFinite(next)) return;
        audioPreview.currentTime = next;
        syncPreviewUi();
    });
}

if (previewVolumeBtn && previewVolumePanel) {
    previewVolumeBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        const isHidden = previewVolumePanel.classList.contains("hidden");
        if (isHidden) {
            previewVolumePanel.classList.remove("hidden");
        } else {
            previewVolumePanel.classList.add("hidden");
        }
    });
}

if (previewVolume && audioPreview) {
    previewVolume.addEventListener("input", () => {
        const vol = Number(previewVolume.value);
        if (!Number.isFinite(vol)) return;
        audioPreview.volume = Math.max(0, Math.min(1, vol));
    });
}

if (previewBass) {
    previewBass.addEventListener("input", () => {
        ensurePreviewAudioGraph();
        applyBassBoost();
    });
}

document.addEventListener("pointerdown", (event) => {
    if (!previewVolumePanel || !previewVolumeWrap) return;
    if (previewVolumePanel.classList.contains("hidden")) return;
    if (!previewVolumeWrap.contains(event.target)) {
        previewVolumePanel.classList.add("hidden");
    }
});

if (previewVolumeWrap) {
    previewVolumeWrap.addEventListener("click", (event) => {
        event.stopPropagation();
    });
}

function isTypingTarget(target) {
    if (!target) return false;
    const tag = (target.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
}

document.addEventListener("keydown", async (event) => {
    if (event.key === "Escape" && audioFormatMenu && !audioFormatMenu.classList.contains("hidden")) {
        closeCustomFormatMenu();
        return;
    }
    if (event.key === "Escape" && previewVolumePanel && !previewVolumePanel.classList.contains("hidden")) {
        previewVolumePanel.classList.add("hidden");
        return;
    }
    if (!audioPreview || !audioPreview.src) return;
    if (isTypingTarget(event.target)) return;

    if (event.code === "Space") {
        event.preventDefault();
        ensurePreviewAudioGraph();
        if (previewAudioContext && previewAudioContext.state === "suspended") {
            try {
                await previewAudioContext.resume();
            } catch {}
        }
        if (audioPreview.paused) {
            try {
                await audioPreview.play();
            } catch {
                setStatus("Preview playback was blocked by browser.", true);
            }
        } else {
            audioPreview.pause();
        }
        return;
    }

    if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        audioPreview.muted = !audioPreview.muted;
        return;
    }

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        const step = 0.05;
        const dir = event.key === "ArrowUp" ? 1 : -1;
        const next = Math.max(0, Math.min(1, audioPreview.volume + dir * step));
        audioPreview.muted = false;
        audioPreview.volume = next;
        if (previewVolume) {
            previewVolume.value = String(next);
        }
    }
});

downloadBtn.addEventListener("click", () => {
    if (!outputBlob) {
        setStatus("Convert a file first.", true);
        return;
    }

    const url = URL.createObjectURL(outputBlob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = outputFileName || "audio.bin";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setStatus("Audio downloaded successfully.", "success");
});

if (downloadBassBtn) {
    downloadBassBtn.addEventListener("click", async () => {
        if (!outputBlob) {
            setStatus("Convert a file first.", true);
            return;
        }
        const bassDb = previewBass ? bassPercentToGainDb(previewBass.value) : 0;
        downloadBassBtn.disabled = true;
        setStatus("Preparing bass boosted export...");
        try {
            const boostedBlob = await renderBassBoostedWav(outputBlob, bassDb);
            const base = sanitizeBaseName(getBaseName(outputFileName || "audio_output"));
            const bassTag = `+${Math.round(bassDb)}`;
            const bassName = `${base} (bass ${bassTag}dB).wav`;
            const url = URL.createObjectURL(boostedBlob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = bassName;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
            setStatus("Bass boosted audio downloaded.", "success");
        } catch (error) {
            setStatus(`Bass boosted export failed: ${safeErrorMessage(error)}`, true);
        } finally {
            downloadBassBtn.disabled = false;
        }
    });
}

window.addEventListener("beforeunload", () => {
    if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
    }
});
