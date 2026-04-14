const fileInput = document.getElementById("videoPlayerFile");
const dropZone = document.getElementById("videoPlayerDrop");
const video = document.getElementById("localVideo");
const playBtn = document.getElementById("vpPlayBtn");
const muteBtn = document.getElementById("vpMuteBtn");
const loopBtn = document.getElementById("vpLoopBtn");
const captionToggleBtn = document.getElementById("vpCaptionToggleBtn");
const timeText = document.getElementById("vpTime");
const seek = document.getElementById("vpSeek");
const volume = document.getElementById("vpVolume");
const bass = document.getElementById("vpBass");
const speed = document.getElementById("vpSpeed");
const pipBtn = document.getElementById("vpPipBtn");
const fsBtn = document.getElementById("vpFsBtn");
const audioTrackSelect = document.getElementById("vpAudioTrack");
const captionFileInput = document.getElementById("vpCaptionFile");
const captionLangSelect = document.getElementById("vpCaptionLang");
const loadCaptionBtn = document.getElementById("vpLoadCaptionBtn");
const statusEl = document.getElementById("vpStatus");
const playerShell = document.querySelector(".player-shell");

const primaryOut = document.getElementById("vpPrimaryOut");
const secondaryOut = document.getElementById("vpSecondaryOut");
const scanOutputsBtn = document.getElementById("vpScanOutputsBtn");
const dualToggleBtn = document.getElementById("vpDualToggleBtn");

let videoUrl = "";
let dualEnabled = false;
let auxAudio = null;

let userMuted = false;
let userVolume = 1;
const speedSteps = [0.5, 0.75, 1, 1.25, 1.5, 2];

let audioCtx = null;
let sourceNode = null;
let bassFilter = null;
let compressorNode = null;
let outGain = null;
let graphReady = false;
let captionCounter = 0;
let firstInteractionScanDone = false;
let activeCaptionTrack = -1;

function setStatus(text, mode = "loading") {
    statusEl.textContent = text;
    if (mode === "success") {
        statusEl.style.color = "#22c55e";
    } else if (mode === "error") {
        statusEl.style.color = "#ef4444";
    } else {
        const isDark = document.body.classList.contains("dark-mode") || document.documentElement.getAttribute("data-theme") === "dark";
        statusEl.style.color = isDark ? "#facc15" : "#b8860b";
    }
}

function fmt(seconds) {
    const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = Math.floor(safe % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
}

function syncTime() {
    const d = Number.isFinite(video.duration) ? video.duration : 0;
    const c = Number.isFinite(video.currentTime) ? video.currentTime : 0;
    seek.max = d > 0 ? String(d) : "0";
    seek.value = String(Math.min(c, d || 0));
    timeText.textContent = `${fmt(c)} / ${fmt(d)}`;
    updateSeekProgressVisual();
}

function updateSeekProgressVisual() {
    setRangeProgress(seek);
}

function setRangeProgress(el) {
    if (!el) return;
    const min = Number(el.min || 0);
    const max = Number(el.max || 0);
    const value = Number(el.value || 0);
    const range = max - min;
    const pct = range > 0 ? ((value - min) / range) * 100 : 0;
    const progress = Math.max(0, Math.min(100, pct));
    el.style.setProperty("--progress", `${progress}%`);
}

function syncVideoAspectRatio() {
    const w = Number(video.videoWidth) || 0;
    const h = Number(video.videoHeight) || 0;
    const ratio = w > 0 && h > 0 ? `${w} / ${h}` : "16 / 9";
    video.style.setProperty("--video-aspect", ratio);
}

function syncButtons() {
    playBtn.textContent = video.paused ? "\u25B6" : "\u23F8";
    playBtn.title = video.paused ? "Play" : "Pause";
    muteBtn.textContent = userMuted ? "\u{1F507}" : "\u{1F50A}";
    muteBtn.title = userMuted ? "Unmute" : "Mute";
    loopBtn.textContent = video.loop ? "\u21BB" : "\u21BA";
    loopBtn.title = video.loop ? "Loop On" : "Loop Off";
}

function syncCaptionToggleButton() {
    if (!captionToggleBtn) return;
    const tracks = Array.from(video.textTracks || []);
    const showing = tracks.findIndex((t) => t.mode === "showing");
    const enabled = showing >= 0;
    if (enabled) activeCaptionTrack = showing;
    captionToggleBtn.classList.toggle("is-on", enabled);
    captionToggleBtn.textContent = "CC";
    captionToggleBtn.title = enabled ? "Captions On" : "Captions Off";
}

function ensureAux() {
    if (auxAudio) return auxAudio;
    auxAudio = document.createElement("audio");
    auxAudio.autoplay = false;
    auxAudio.playsInline = true;
    auxAudio.hidden = true;
    document.body.appendChild(auxAudio);
    return auxAudio;
}

function supportsSinkRouting() {
    return typeof HTMLMediaElement !== "undefined" && typeof HTMLMediaElement.prototype.setSinkId === "function";
}

function bassPercentToGainDb(percent) {
    const p = Math.max(0, Math.min(100, Number(percent) || 0));
    return Math.pow(p / 100, 1.15) * 16;
}

function applyVolumeAndMute() {
    const useGraph = graphReady && audioCtx && audioCtx.state === "running";
    if (!useGraph) {
        video.muted = userMuted;
        video.volume = userVolume;
    } else {
        video.muted = true;
        if (outGain) {
            const gainDb = bassFilter ? bassFilter.gain.value : 0;
            outGain.gain.value = userMuted ? 0 : Math.max(0.74, Math.min(1, userVolume * (1 - gainDb / 32)));
        }
    }
    if (auxAudio) {
        auxAudio.muted = userMuted;
        auxAudio.volume = userVolume;
    }
}

function applyBassValue() {
    if (!graphReady || !bassFilter) return;
    const gainDb = bassPercentToGainDb(bass.value);
    bassFilter.gain.value = gainDb;
    if (outGain) {
        // Keep output stable so higher bass does not collapse perceived loudness.
        outGain.gain.value = userMuted ? 0 : Math.max(0.74, Math.min(1, userVolume * (1 - gainDb / 32)));
    }
    if (gainDb > 10 && compressorNode) {
        compressorNode.threshold.value = -20;
        compressorNode.ratio.value = 4;
    } else if (compressorNode) {
        compressorNode.threshold.value = -16;
        compressorNode.ratio.value = 3;
    }
}

function ensureAudioGraph() {
    if (graphReady) return true;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) {
        setStatus("Bass boost is not supported in this browser.", "error");
        return false;
    }
    try {
        audioCtx = new Ctx();
        sourceNode = audioCtx.createMediaElementSource(video);
        bassFilter = audioCtx.createBiquadFilter();
        compressorNode = audioCtx.createDynamicsCompressor();
        outGain = audioCtx.createGain();

        bassFilter.type = "lowshelf";
        bassFilter.frequency.value = 180;
        compressorNode.threshold.value = -16;
        compressorNode.knee.value = 18;
        compressorNode.ratio.value = 3;
        compressorNode.attack.value = 0.003;
        compressorNode.release.value = 0.2;

        sourceNode.connect(bassFilter);
        bassFilter.connect(compressorNode);
        compressorNode.connect(outGain);
        outGain.connect(audioCtx.destination);

        graphReady = true;
        applyBassValue();
        applyVolumeAndMute();
        return true;
    } catch {
        setStatus("Could not initialize bass boost engine.", "error");
        return false;
    }
}

async function resumeGraphIfNeeded() {
    if (!graphReady || !audioCtx) return false;
    if (audioCtx.state === "running") return true;
    if (audioCtx.state !== "suspended") return false;
    try {
        await audioCtx.resume();
        return audioCtx.state === "running";
    } catch {
        return false;
    }
}

function disableGraphFallback() {
    applyVolumeAndMute();
}

function setPlaybackRate(rate) {
    const safe = Math.max(0.25, Math.min(4, Number(rate) || 1));
    video.playbackRate = safe;
    const nearest = speedSteps.reduce((best, cur) => (
        Math.abs(cur - safe) < Math.abs(best - safe) ? cur : best
    ), speedSteps[0]);
    speed.value = String(nearest);
}

function changeSpeedStep(direction) {
    const current = Number(speed.value) || 1;
    const idx = Math.max(0, speedSteps.indexOf(current));
    const nextIdx = Math.min(speedSteps.length - 1, Math.max(0, idx + direction));
    setPlaybackRate(speedSteps[nextIdx]);
}

function stepSeek(secondsDelta) {
    if (!video.src) return;
    const d = Number.isFinite(video.duration) ? video.duration : 0;
    const next = Math.max(0, Math.min(d || Infinity, (video.currentTime || 0) + secondsDelta));
    video.currentTime = next;
    if (auxAudio && Number.isFinite(auxAudio.duration)) {
        try {
            auxAudio.currentTime = next;
        } catch {}
    }
    syncTime();
}

function changeVolume(delta) {
    userVolume = Math.max(0, Math.min(1, userVolume + delta));
    volume.value = String(userVolume);
    applyVolumeAndMute();
    setRangeProgress(volume);
}

async function togglePlay() {
    if (!video.src) {
        setStatus("Load a local video first.", "error");
        return;
    }
    await resumeGraphIfNeeded();
    if (video.paused) {
        await video.play().catch(() => setStatus("Playback blocked by browser.", "error"));
    } else {
        video.pause();
    }
    syncButtons();
}

function toggleMute() {
    userMuted = !userMuted;
    applyVolumeAndMute();
    syncButtons();
}

function toggleLoop() {
    video.loop = !video.loop;
    syncButtons();
}

async function togglePiP() {
    try {
        if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
        } else if (document.pictureInPictureEnabled && !video.disablePictureInPicture) {
            await video.requestPictureInPicture();
        } else {
            setStatus("Picture-in-Picture is not supported.", "error");
        }
    } catch {
        setStatus("Could not toggle Picture-in-Picture.", "error");
    }
}

async function toggleFullscreen() {
    try {
        if (document.fullscreenElement) {
            await document.exitFullscreen();
        } else if (playerShell && typeof playerShell.requestFullscreen === "function") {
            await playerShell.requestFullscreen();
        } else {
            await video.requestFullscreen();
        }
    } catch {
        setStatus("Could not toggle fullscreen.", "error");
    }
}

async function scanOutputs(options = {}) {
    const silent = !!options.silent;
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        if (!silent) setStatus("Audio output scan is not supported in this browser.", "error");
        return;
    }

    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const outputs = devices.filter((d) => d.kind === "audiooutput");
        primaryOut.innerHTML = "";
        secondaryOut.innerHTML = "";

        const defaultOpt1 = document.createElement("option");
        defaultOpt1.value = "";
        defaultOpt1.textContent = "Default output";
        primaryOut.appendChild(defaultOpt1);

        const offOpt = document.createElement("option");
        offOpt.value = "";
        offOpt.textContent = "Disabled";
        secondaryOut.appendChild(offOpt);

        outputs.forEach((d, i) => {
            const label = d.label || `Output Device ${i + 1}`;
            const o1 = document.createElement("option");
            o1.value = d.deviceId;
            o1.textContent = label;
            primaryOut.appendChild(o1);

            const o2 = document.createElement("option");
            o2.value = d.deviceId;
            o2.textContent = label;
            secondaryOut.appendChild(o2);
        });

        if (!silent) setStatus(`Found ${outputs.length} audio output device(s).`, "success");
    } catch (err) {
        if (!silent) setStatus(`Could not scan outputs: ${err.message || "Unknown error"}`, "error");
    }
}

function refreshCaptionSelector() {
    const tracks = Array.from(video.textTracks || []);
    if (!tracks.length) {
        activeCaptionTrack = -1;
        syncCaptionToggleButton();
        return;
    }
    const showing = tracks.findIndex((t) => t.mode === "showing");
    if (showing >= 0) {
        activeCaptionTrack = showing;
    } else if (activeCaptionTrack < 0 || activeCaptionTrack >= tracks.length) {
        activeCaptionTrack = 0;
    }
    syncCaptionToggleButton();
}

function applyCaptionSelection(value) {
    const tracks = Array.from(video.textTracks || []);
    tracks.forEach((t) => {
        t.mode = "disabled";
    });
    if (value === "off") {
        syncCaptionToggleButton();
        return;
    }
    const idx = Number(value);
    if (!Number.isFinite(idx) || !tracks[idx]) {
        syncCaptionToggleButton();
        return;
    }
    tracks[idx].mode = "showing";
    activeCaptionTrack = idx;
    syncCaptionToggleButton();
}

function toggleCaptionTrack() {
    const tracks = Array.from(video.textTracks || []);
    if (!tracks.length) {
        setStatus("No captions loaded.", "error");
        syncCaptionToggleButton();
        return;
    }
    const showing = tracks.findIndex((t) => t.mode === "showing");
    if (showing >= 0) {
        applyCaptionSelection("off");
    } else {
        const idx = activeCaptionTrack >= 0 && activeCaptionTrack < tracks.length ? activeCaptionTrack : 0;
        applyCaptionSelection(String(idx));
    }
}

function enableDefaultCaptionIfAvailable() {
    const tracks = Array.from(video.textTracks || []);
    if (!tracks.length) {
        activeCaptionTrack = -1;
        syncCaptionToggleButton();
        return;
    }
    let target = tracks.findIndex((t) => t.mode === "showing");
    if (target < 0) target = 0;
    tracks.forEach((t, i) => {
        t.mode = i === target ? "showing" : "disabled";
    });
    activeCaptionTrack = target;
    syncCaptionToggleButton();
}

function toVttTimestamp(totalSeconds) {
    const sec = Math.max(0, Number(totalSeconds) || 0);
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = Math.floor(sec % 60);
    const millis = Math.floor((sec - Math.floor(sec)) * 1000);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

function parseTimeToSeconds(value) {
    if (!value) return NaN;
    const raw = String(value).trim().replace(",", ".");
    if (!raw) return NaN;
    if (/^\d+(\.\d+)?$/.test(raw)) return Number(raw);
    const parts = raw.split(":").map((p) => p.trim()).filter(Boolean);
    if (!parts.length) return NaN;
    const nums = parts.map((p) => Number(p));
    if (nums.some((n) => !Number.isFinite(n))) return NaN;
    if (nums.length === 3) return nums[0] * 3600 + nums[1] * 60 + nums[2];
    if (nums.length === 2) return nums[0] * 60 + nums[1];
    return nums[0];
}

function srtToVtt(text) {
    const normalized = String(text || "").replace(/\r/g, "").trim();
    if (!normalized) return "WEBVTT\n\n";
    const blocks = normalized.split(/\n{2,}/);
    const out = ["WEBVTT", ""];
    for (const block of blocks) {
        const lines = block.split("\n").map((l) => l.trimEnd());
        if (!lines.length) continue;
        let idx = 0;
        if (/^\d+$/.test(lines[0])) idx = 1;
        if (!lines[idx] || !lines[idx].includes("-->")) continue;
        const timing = lines[idx].replace(/,/g, ".");
        const payload = lines.slice(idx + 1).join("\n").trim();
        if (!payload) continue;
        out.push(timing);
        out.push(payload);
        out.push("");
    }
    return `${out.join("\n")}\n`;
}

function plainTextToVtt(text) {
    const lines = String(text || "")
        .replace(/\r/g, "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
    const out = ["WEBVTT", ""];
    let start = 0;
    for (const line of lines) {
        const end = start + 3;
        out.push(`${toVttTimestamp(start)} --> ${toVttTimestamp(end)}`);
        out.push(line);
        out.push("");
        start = end;
    }
    return `${out.join("\n")}\n`;
}

function parseCsvLine(line) {
    const out = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        if (ch === "\"") {
            if (quoted && line[i + 1] === "\"") {
                cur += "\"";
                i += 1;
            } else {
                quoted = !quoted;
            }
            continue;
        }
        if (ch === "," && !quoted) {
            out.push(cur.trim());
            cur = "";
            continue;
        }
        cur += ch;
    }
    out.push(cur.trim());
    return out;
}

function csvToVtt(text) {
    const rows = String(text || "")
        .replace(/\r/g, "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map(parseCsvLine);
    if (!rows.length) return "WEBVTT\n\n";
    const header = rows[0].map((c) => c.toLowerCase());
    const startIdx = header.findIndex((h) => h === "start" || h === "start_time" || h === "from");
    const endIdx = header.findIndex((h) => h === "end" || h === "end_time" || h === "to");
    const textIdx = header.findIndex((h) => h === "text" || h === "caption" || h === "subtitle");
    const hasHeader = startIdx >= 0 && endIdx >= 0 && textIdx >= 0;
    const dataRows = hasHeader ? rows.slice(1) : rows;

    const out = ["WEBVTT", ""];
    let autoStart = 0;
    for (const row of dataRows) {
        let start;
        let end;
        let caption;
        if (hasHeader) {
            start = parseTimeToSeconds(row[startIdx]);
            end = parseTimeToSeconds(row[endIdx]);
            caption = row[textIdx] || "";
        } else {
            start = parseTimeToSeconds(row[0]);
            end = parseTimeToSeconds(row[1]);
            caption = row.slice(2).join(",") || row[0] || "";
        }
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
            start = autoStart;
            end = start + 3;
            caption = row.join(", ");
        }
        if (!caption.trim()) continue;
        out.push(`${toVttTimestamp(start)} --> ${toVttTimestamp(end)}`);
        out.push(caption.trim());
        out.push("");
        autoStart = end;
    }
    return `${out.join("\n")}\n`;
}

async function docxToVtt(file) {
    if (!window.mammoth || typeof window.mammoth.extractRawText !== "function") {
        throw new Error("DOCX captions need mammoth.js loaded in the page.");
    }
    const data = await file.arrayBuffer();
    const result = await window.mammoth.extractRawText({ arrayBuffer: data });
    return plainTextToVtt(result && result.value ? result.value : "");
}

async function convertCaptionFileToVtt(file) {
    const lower = (file.name || "").toLowerCase();
    if (lower.endsWith(".srt")) {
        return srtToVtt(await file.text());
    }
    throw new Error("Unsupported caption file format. Use SRT only.");
}

function refreshAudioTrackSelector() {
    if (!audioTrackSelect) return;
    audioTrackSelect.innerHTML = "";
    const defaultOpt = document.createElement("option");
    defaultOpt.value = "default";
    defaultOpt.textContent = "Default";
    audioTrackSelect.appendChild(defaultOpt);
    const list = video.audioTracks;
    if (!list || !Number.isFinite(list.length)) {
        const notSupported = document.createElement("option");
        notSupported.value = "na";
        notSupported.textContent = "Not supported";
        audioTrackSelect.appendChild(notSupported);
        audioTrackSelect.value = "na";
        audioTrackSelect.disabled = true;
        return;
    }
    audioTrackSelect.disabled = false;
    let enabledIndex = -1;
    for (let i = 0; i < list.length; i += 1) {
        const t = list[i];
        const o = document.createElement("option");
        o.value = String(i);
        o.textContent = t.label || t.language || `Track ${i + 1}`;
        if (t.enabled) enabledIndex = i;
        audioTrackSelect.appendChild(o);
    }
    if (enabledIndex >= 0) {
        audioTrackSelect.value = String(enabledIndex);
    }
}

function applyAudioTrackSelection(value) {
    const list = video.audioTracks;
    if (!list || !Number.isFinite(list.length)) return;
    const idx = Number(value);
    if (!Number.isFinite(idx) || idx < 0 || idx >= list.length) return;
    for (let i = 0; i < list.length; i += 1) {
        list[i].enabled = i === idx;
    }
    setStatus(`Audio track changed to ${idx + 1}.`, "success");
}

async function applyDualOutput() {
    if (!supportsSinkRouting()) {
        setStatus("Dual output is not supported in this browser. Try latest Chrome/Edge.", "error");
        return;
    }
    if (!video.src) {
        setStatus("Load a local video first.", "error");
        return;
    }

    const primaryId = primaryOut.value || "";
    const secondaryId = secondaryOut.value || "";

    try {
        if (primaryId && typeof video.setSinkId === "function") await video.setSinkId(primaryId);
        if (!secondaryId) {
            dualEnabled = false;
            dualToggleBtn.textContent = "Enable Dual Output";
            if (auxAudio) {
                auxAudio.pause();
                auxAudio.srcObject = null;
                auxAudio.removeAttribute("src");
                auxAudio.load();
            }
            setStatus("Dual output disabled.", "success");
            return;
        }

        if (primaryId && secondaryId && primaryId === secondaryId) {
            setStatus("Choose a different secondary output device.", "error");
            return;
        }

        const aux = ensureAux();
        const mediaSrc = video.currentSrc || video.src;
        if (!mediaSrc && typeof video.captureStream !== "function") {
            setStatus("Dual output failed: no playable media source found.", "error");
            return;
        }

        aux.pause();
        aux.srcObject = null;
        aux.removeAttribute("src");

        if (typeof video.captureStream === "function") {
            aux.srcObject = video.captureStream();
        } else {
            aux.src = mediaSrc;
            try {
                aux.currentTime = video.currentTime || 0;
            } catch {}
        }

        aux.playbackRate = video.playbackRate || 1;
        aux.volume = userVolume;
        aux.muted = userMuted;
        await aux.setSinkId(secondaryId);
        dualEnabled = true;
        dualToggleBtn.textContent = "Disable Dual Output";
        if (!video.paused) {
            await aux.play().catch(() => {});
        }
        setStatus("Dual audio output enabled.", "success");
    } catch (err) {
        setStatus(`Dual output failed: ${err.message || "Unknown error"} (check HTTPS/localhost and speaker permissions).`, "error");
    }
}

async function loadVideo(file) {
    if (!file || !file.type.startsWith("video/")) {
        setStatus("Please choose a valid video file.", "error");
        return;
    }
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    videoUrl = URL.createObjectURL(file);
    video.src = videoUrl;
    video.style.setProperty("--video-aspect", "16 / 9");
    video.load();
    video.currentTime = 0;
    setPlaybackRate(1);
    volume.value = "1";
    userVolume = 1;
    userMuted = false;
    bass.value = "0";
    video.loop = false;
    captionCounter = 0;
    refreshCaptionSelector();
    refreshAudioTrackSelector();
    dualEnabled = false;
    dualToggleBtn.textContent = "Enable Dual Output";
    if (auxAudio) {
        auxAudio.pause();
        auxAudio.srcObject = null;
        auxAudio.removeAttribute("src");
        auxAudio.load();
    }
    disableGraphFallback();
    applyVolumeAndMute();
    if (graphReady) applyBassValue();
    setRangeProgress(volume);
    setRangeProgress(bass);
    syncTime();
    syncButtons();
    setStatus(`Loaded: ${file.name}`, "success");
}

function isTypingTarget(target) {
    if (!target) return false;
    const tag = (target.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
}

fileInput.addEventListener("change", () => {
    const file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
    loadVideo(file);
});

dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        fileInput.click();
    }
});

["dragenter", "dragover"].forEach((name) => {
    dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add("is-dragover");
    });
});

["dragleave", "dragend", "drop"].forEach((name) => {
    dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove("is-dragover");
    });
});

dropZone.addEventListener("drop", (e) => {
    const f = e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files[0] : null;
    loadVideo(f);
});

playBtn.addEventListener("click", togglePlay);
muteBtn.addEventListener("click", toggleMute);
loopBtn.addEventListener("click", toggleLoop);

seek.addEventListener("input", () => {
    const t = Number(seek.value);
    if (!Number.isFinite(t)) return;
    video.currentTime = t;
    if (auxAudio && Number.isFinite(auxAudio.duration)) {
        try {
            auxAudio.currentTime = t;
        } catch {}
    }
    syncTime();
    updateSeekProgressVisual();
});

volume.addEventListener("input", () => {
    userVolume = Math.max(0, Math.min(1, Number(volume.value)));
    applyVolumeAndMute();
    setRangeProgress(volume);
});

bass.addEventListener("input", async () => {
    if (!ensureAudioGraph()) return;
    const running = await resumeGraphIfNeeded();
    if (!running) {
        applyVolumeAndMute();
        setStatus("Bass boost is not supported on this browser/device.", "error");
        return;
    }
    applyBassValue();
    applyVolumeAndMute();
    setRangeProgress(bass);
    setStatus(`Bass boost set to ${Math.round(Number(bass.value) || 0)}%.`, "success");
});

speed.addEventListener("change", () => {
    const r = Number(speed.value);
    if (!Number.isFinite(r) || r <= 0) return;
    setPlaybackRate(r);
});

pipBtn.addEventListener("click", togglePiP);
fsBtn.addEventListener("click", toggleFullscreen);
scanOutputsBtn.addEventListener("click", scanOutputs);
dualToggleBtn.addEventListener("click", applyDualOutput);

if (captionToggleBtn) {
    captionToggleBtn.addEventListener("click", () => {
        toggleCaptionTrack();
    });
}

if (audioTrackSelect) {
    audioTrackSelect.addEventListener("change", () => {
        const value = audioTrackSelect.value;
        if (value === "default" || value === "na") return;
        applyAudioTrackSelection(value);
    });
}

if (loadCaptionBtn && captionFileInput) {
    loadCaptionBtn.addEventListener("click", () => {
        captionFileInput.click();
    });
    captionFileInput.addEventListener("change", () => {
        void (async () => {
        const file = captionFileInput.files && captionFileInput.files[0] ? captionFileInput.files[0] : null;
        if (!file) return;
        if (!/\.srt$/i.test(file.name)) {
            setStatus("Unsupported caption file. Use SRT only.", "error");
            return;
        }
        if (!video.src) {
            setStatus("Load a video first, then add captions.", "error");
            return;
        }
        try {
            const vttText = await convertCaptionFileToVtt(file);
            const blob = new Blob([vttText], { type: "text/vtt" });
            const label = `Caption ${captionCounter + 1}`;
            const lang = (captionLangSelect && captionLangSelect.value) ? captionLangSelect.value : "en";
            const track = document.createElement("track");
            track.kind = "subtitles";
            track.label = label;
            track.srclang = lang;
            track.src = URL.createObjectURL(blob);
            track.default = false;
            video.appendChild(track);
            captionCounter += 1;
            setTimeout(() => {
                refreshCaptionSelector();
                const tracks = Array.from(video.textTracks || []);
                const idx = tracks.length - 1;
                if (idx >= 0) {
                    applyCaptionSelection(String(idx));
                }
            }, 40);
            setStatus(`Caption loaded: ${file.name}`, "success");
        } catch (error) {
            setStatus(`Caption load failed: ${error.message || "Unknown error"}`, "error");
        }
        })();
    });
}

video.addEventListener("loadedmetadata", syncTime);
video.addEventListener("loadedmetadata", syncVideoAspectRatio);
video.addEventListener("loadedmetadata", refreshCaptionSelector);
video.addEventListener("loadedmetadata", enableDefaultCaptionIfAvailable);
video.addEventListener("loadedmetadata", refreshAudioTrackSelector);
video.addEventListener("timeupdate", syncTime);
video.addEventListener("timeupdate", () => {
    if (!dualEnabled || !auxAudio || auxAudio.paused) return;
    const drift = Math.abs((auxAudio.currentTime || 0) - (video.currentTime || 0));
    if (drift > 0.4) {
        try {
            auxAudio.currentTime = video.currentTime || 0;
        } catch {}
    }
});
video.addEventListener("play", async () => {
    if (graphReady && (Number(bass.value) || 0) > 0) {
        const running = await resumeGraphIfNeeded();
        if (!running) {
            setStatus("Bass boost engine could not resume. Tap again to allow audio processing.", "error");
        }
        applyVolumeAndMute();
    }
    if (dualEnabled && auxAudio) {
        auxAudio.playbackRate = video.playbackRate || 1;
        try {
            auxAudio.currentTime = video.currentTime || 0;
        } catch {}
        await auxAudio.play().catch(() => {});
    }
    syncButtons();
});
video.addEventListener("ratechange", () => {
    if (!dualEnabled || !auxAudio) return;
    auxAudio.playbackRate = video.playbackRate || 1;
});
video.addEventListener("pause", () => {
    if (auxAudio) auxAudio.pause();
    syncButtons();
});
video.addEventListener("ended", () => {
    if (auxAudio) auxAudio.pause();
    syncButtons();
});

document.addEventListener("keydown", async (event) => {
    if (isTypingTarget(event.target)) return;

    const key = (event.key || "").toLowerCase();

    if (event.code === "Space") {
        event.preventDefault();
        if (video.src) {
            await togglePlay();
        } else {
            setStatus("Load a local video first.", "error");
        }
        return;
    }

    if (!video.src) return;

    if (event.ctrlKey && event.key === "ArrowUp") {
        event.preventDefault();
        changeSpeedStep(1);
        return;
    }
    if (event.ctrlKey && event.key === "ArrowDown") {
        event.preventDefault();
        changeSpeedStep(-1);
        return;
    }

    if (key === "+" || key === "=") {
        event.preventDefault();
        changeSpeedStep(1);
        return;
    }
    if (key === "-" || key === "_") {
        event.preventDefault();
        changeSpeedStep(-1);
        return;
    }

    if (key === "f") {
        event.preventDefault();
        await toggleFullscreen();
        return;
    }
    if (key === "p") {
        event.preventDefault();
        await togglePiP();
        return;
    }
    if (key === "l") {
        event.preventDefault();
        toggleLoop();
        return;
    }
    if (key === "m") {
        event.preventDefault();
        toggleMute();
        return;
    }
    if (event.key === "ArrowRight") {
        event.preventDefault();
        stepSeek(5);
        return;
    }
    if (event.key === "ArrowLeft") {
        event.preventDefault();
        stepSeek(-5);
        return;
    }
    if (event.key === "ArrowUp") {
        event.preventDefault();
        changeVolume(0.05);
        return;
    }
    if (event.key === "ArrowDown") {
        event.preventDefault();
        changeVolume(-0.05);
        return;
    }
    if (key === "c") {
        event.preventDefault();
        toggleCaptionTrack();
    }
}, true);

window.addEventListener("beforeunload", () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
});

setStatus("Load a local video to start.");
setRangeProgress(seek);
setRangeProgress(volume);
setRangeProgress(bass);

function runFirstInteractionScan() {
    if (firstInteractionScanDone) return;
    firstInteractionScanDone = true;
    document.removeEventListener("pointerdown", runFirstInteractionScan, true);
    document.removeEventListener("keydown", runFirstInteractionScan, true);
    document.removeEventListener("touchstart", runFirstInteractionScan, true);
    void scanOutputs({ silent: true });
}

document.addEventListener("pointerdown", runFirstInteractionScan, true);
document.addEventListener("keydown", runFirstInteractionScan, true);
document.addEventListener("touchstart", runFirstInteractionScan, true);
