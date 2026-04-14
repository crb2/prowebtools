const trimFile = document.getElementById("trimFile");
const trimDrop = document.getElementById("trimDrop");
const trimStart = document.getElementById("trimStart");
const trimEnd = document.getElementById("trimEnd");
const trimRunBtn = document.getElementById("trimRunBtn");
const trimDownloadBtn = document.getElementById("trimDownloadBtn");
const trimStatus = document.getElementById("trimStatus");
const trimPreview = document.getElementById("trimPreview");
const trimPreviewWrap = document.getElementById("trimPreviewWrap");
const trimPlayBtn = document.getElementById("trimPlayBtn");
const trimSeek = document.getElementById("trimSeek");
const trimTime = document.getElementById("trimTime");
const trimTrack = document.getElementById("trimTrack");
const trimThumbs = document.getElementById("trimThumbs");
const trimMaskLeft = document.getElementById("trimMaskLeft");
const trimMaskRight = document.getElementById("trimMaskRight");
const trimSelection = document.getElementById("trimSelection");
const trimHandleStart = document.getElementById("trimHandleStart");
const trimHandleEnd = document.getElementById("trimHandleEnd");
const trimStartPill = document.getElementById("trimStartPill");
const trimLabelStart = document.getElementById("trimLabelStart");
const trimLabelDuration = document.getElementById("trimLabelDuration");
const trimLabelEnd = document.getElementById("trimLabelEnd");
const trimOverlayStart = document.getElementById("trimOverlayStart");
const trimOverlayNow = document.getElementById("trimOverlayNow");
const trimOverlayEnd = document.getElementById("trimOverlayEnd");
const trimControlsToast = document.getElementById("trimControlsToast");
const trimVignetteOverlay = document.getElementById("trimVignetteOverlay");
const trimNoiseOverlay = document.getElementById("trimNoiseOverlay");
const trimModeExtract = document.getElementById("trimModeExtract");
const trimModeDelete = document.getElementById("trimModeDelete");
const trimFadeIn = document.getElementById("trimFadeIn");
const trimFadeOut = document.getElementById("trimFadeOut");
const animTabs = document.querySelectorAll(".anim-tab");
const animGridPanel = document.getElementById("animGridPanel");
const animZoomPanel = document.getElementById("animZoomPanel");
const animZoomPreview = document.getElementById("animZoomPreview");
const animZoomSpeed = document.getElementById("animZoomSpeed");
const animZoomSpeedVal = document.getElementById("animZoomSpeedVal");
const studioAdjustPanel = document.getElementById("studioAdjustPanel");
const studioAnimPanel = document.getElementById("studioAnimPanel");
const studioAdjustToggle = document.getElementById("studioAdjustToggle");
const studioAnimToggle = document.getElementById("studioAnimToggle");

const adjustmentInputs = {
    brightness: document.getElementById("adjBrightness"),
    contrast: document.getElementById("adjContrast"),
    exposure: document.getElementById("adjExposure"),
    hue: document.getElementById("adjHue"),
    saturation: document.getElementById("adjSaturation"),
    sharpen: document.getElementById("adjSharpen"),
    noise: document.getElementById("adjNoise"),
    blur: document.getElementById("adjBlur"),
    vignette: document.getElementById("adjVignette")
};
const adjustmentOutputs = {
    brightness: document.getElementById("adjBrightnessVal"),
    contrast: document.getElementById("adjContrastVal"),
    exposure: document.getElementById("adjExposureVal"),
    hue: document.getElementById("adjHueVal"),
    saturation: document.getElementById("adjSaturationVal"),
    sharpen: document.getElementById("adjSharpenVal"),
    noise: document.getElementById("adjNoiseVal"),
    blur: document.getElementById("adjBlurVal"),
    vignette: document.getElementById("adjVignetteVal")
};

let trimSelectedFile = null;
let trimOutputBlob = null;
let trimPreviewUrl = "";
let trimDuration = 0;
let trimStartSec = 0;
let trimEndSec = 0;
let dragState = null;
let dragResumePlayback = false;
let thumbsRenderToken = 0;
let scrubRaf = 0;
let pendingScrubTime = null;
let trimToastTimer = 0;
let activeAnimTab = "in";
const animationState = {
    in: "none",
    out: "none",
    loop: "none",
    zoomDepth: "none",
    zoomSpeed: 1.2
};

const ANIMATION_OPTIONS = {
    in: ["none", "fade", "float", "zoom-in", "ken-burns-in", "drop", "slide", "wipe", "pop", "bounce", "spin", "slide-bounce", "gentle-float"],
    out: ["none", "fade", "float", "zoom-out", "ken-burns-out", "drop", "slide", "wipe", "pop", "bounce", "spin", "slide-bounce", "gentle-float"],
    loop: ["none", "spin", "spin-smooth", "3d-spin", "bounce", "heartbeat", "sway", "3d-sway", "squeezy", "jiggle"]
};

function trimSetStatus(message, mode = "loading") {
    trimStatus.textContent = message;
    if (mode === "error") trimStatus.style.color = "#ef4444";
    else if (mode === "success") trimStatus.style.color = "#22c55e";
    else trimStatus.style.color = document.body.classList.contains("dark-mode") ? "#facc15" : "#b8860b";
}

function showTrimToast(message, ms = 2200) {
    if (!trimControlsToast) return;
    trimControlsToast.textContent = message;
    trimControlsToast.classList.add("show");
    if (trimToastTimer) clearTimeout(trimToastTimer);
    trimToastTimer = setTimeout(() => {
        trimControlsToast.classList.remove("show");
    }, ms);
}

function titleCaseToken(token) {
    return token
        .split("-")
        .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ""))
        .join(" ");
}

function getAdjustValue(key) {
    return Number(adjustmentInputs[key]?.value || 0);
}

function applyPreviewAdjustments() {
    const baseBrightness = getAdjustValue("brightness");
    const baseContrast = getAdjustValue("contrast");
    const exposure = getAdjustValue("exposure");
    const sharpen = getAdjustValue("sharpen");
    const noise = getAdjustValue("noise");
    const vignette = getAdjustValue("vignette");

    const brightness = 1 + (baseBrightness / 100) + (exposure / 180);
    const contrast = 1 + (baseContrast / 100) + (exposure / 260) + (sharpen / 380);
    const saturate = 1 + (getAdjustValue("saturation") / 100);
    const hue = getAdjustValue("hue");
    const blurPx = (getAdjustValue("blur") / 100) * 3;

    trimPreview.style.filter = [
        `brightness(${Math.max(0, brightness).toFixed(3)})`,
        `contrast(${Math.max(0, contrast).toFixed(3)})`,
        `saturate(${Math.max(0, saturate).toFixed(3)})`,
        `hue-rotate(${hue}deg)`,
        `blur(${blurPx.toFixed(2)}px)`
    ].join(" ");

    if (animZoomPreview) {
        animZoomPreview.style.filter = trimPreview.style.filter;
    }

    if (trimVignetteOverlay) {
        trimVignetteOverlay.style.opacity = String(clamp(vignette / 120, 0, 0.9));
    }
    if (trimNoiseOverlay) {
        trimNoiseOverlay.style.opacity = String(clamp(noise / 260, 0, 0.55));
    }
}

function refreshAdjustmentOutputs() {
    Object.keys(adjustmentInputs).forEach((key) => {
        const value = getAdjustValue(key);
        if (adjustmentOutputs[key]) adjustmentOutputs[key].textContent = String(Math.round(value));
    });
    applyPreviewAdjustments();
}

function renderAnimationCards() {
    if (!animGridPanel) return;
    const options = ANIMATION_OPTIONS[activeAnimTab] || [];
    animGridPanel.innerHTML = "";
    options.forEach((token) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "anim-card";
        if (animationState[activeAnimTab] === token) btn.classList.add("is-active");
        btn.textContent = titleCaseToken(token);
        btn.addEventListener("click", () => {
            animationState[activeAnimTab] = token;
            renderAnimationCards();
        });
        animGridPanel.appendChild(btn);
    });
}

function switchAnimationTab(tab) {
    activeAnimTab = tab;
    animTabs.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.animTab === tab));
    const zoomMode = tab === "zoom";
    animGridPanel.classList.toggle("hidden", zoomMode);
    animZoomPanel.classList.toggle("hidden", !zoomMode);
    if (!zoomMode) renderAnimationCards();
}

function setStudioPanel(panelName) {
    const openAdjust = panelName === "adjust";
    const openAnim = panelName === "anim";
    if (studioAdjustPanel) studioAdjustPanel.classList.toggle("is-open", openAdjust);
    if (studioAnimPanel) studioAnimPanel.classList.toggle("is-open", openAnim);
    if (studioAdjustToggle) studioAdjustToggle.setAttribute("aria-expanded", openAdjust ? "true" : "false");
    if (studioAnimToggle) studioAnimToggle.setAttribute("aria-expanded", openAnim ? "true" : "false");
}

function updatePreviewRatio(videoEl) {
    const w = Number(videoEl.videoWidth) || 16;
    const h = Number(videoEl.videoHeight) || 9;
    videoEl.style.aspectRatio = `${w} / ${h}`;
}

function formatTimelineTime(totalSec) {
    const sec = Math.max(0, Number(totalSec) || 0);
    const minutes = Math.floor(sec / 60);
    const seconds = sec - (minutes * 60);
    return `${String(minutes).padStart(2, "0")}:${seconds.toFixed(1).padStart(4, "0")}`;
}

function formatInputTime(totalSec) {
    const sec = Math.max(0, Math.floor(Number(totalSec) || 0));
    const hh = Math.floor(sec / 3600);
    const mm = Math.floor((sec % 3600) / 60);
    const ss = sec % 60;
    if (hh > 0) {
        return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
    }
    return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function formatPlayerTime(totalSec) {
    const sec = Math.max(0, Number(totalSec) || 0);
    const hh = Math.floor(sec / 3600);
    const mm = Math.floor((sec % 3600) / 60);
    const ss = Math.floor(sec % 60);
    if (hh > 0) return `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
    return `${mm}:${String(ss).padStart(2, "0")}`;
}

function parseTrimTime(raw) {
    const value = String(raw || "").trim();
    if (!value) return null;

    if (/^\d+(\.\d+)?$/.test(value)) {
        const sec = Number(value);
        return Number.isFinite(sec) ? sec : NaN;
    }

    const parts = value.split(":");
    if (parts.length !== 2 && parts.length !== 3) return NaN;
    if (!parts.every((p) => /^\d+(\.\d+)?$/.test(p))) return NaN;

    if (parts.length === 2) {
        const mm = Number(parts[0]);
        const ss = Number(parts[1]);
        if (!Number.isFinite(mm) || !Number.isFinite(ss) || ss >= 60) return NaN;
        return (mm * 60) + ss;
    }

    const hh = Number(parts[0]);
    const mm = Number(parts[1]);
    const ss = Number(parts[2]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm) || !Number.isFinite(ss) || mm >= 60 || ss >= 60) return NaN;
    return (hh * 3600) + (mm * 60) + ss;
}

function toFfmpegTime(totalSec) {
    const sec = Math.max(0, Number(totalSec) || 0);
    const hh = Math.floor(sec / 3600);
    const mm = Math.floor((sec % 3600) / 60);
    const ss = sec % 60;
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${ss.toFixed(3).padStart(6, "0")}`;
}

function buildFadeFilters(durationSec) {
    const d = Math.max(0, Number(durationSec) || 0);
    const fadeDur = Math.max(0.2, Math.min(0.8, d / 4));
    const vf = [];
    const af = [];

    if (trimFadeIn.checked && d > 0.25) {
        vf.push(`fade=t=in:st=0:d=${fadeDur.toFixed(3)}`);
        af.push(`afade=t=in:st=0:d=${fadeDur.toFixed(3)}`);
    }
    if (trimFadeOut.checked && d > 0.25) {
        const outStart = Math.max(0, d - fadeDur);
        vf.push(`fade=t=out:st=${outStart.toFixed(3)}:d=${fadeDur.toFixed(3)}`);
        af.push(`afade=t=out:st=${outStart.toFixed(3)}:d=${fadeDur.toFixed(3)}`);
    }

    return {
        vf: vf.join(","),
        af: af.join(",")
    };
}

function buildAdjustmentVideoFilterChain() {
    const b = getAdjustValue("brightness");
    const c = getAdjustValue("contrast");
    const e = getAdjustValue("exposure");
    const h = getAdjustValue("hue");
    const s = getAdjustValue("saturation");
    const sharpen = getAdjustValue("sharpen");
    const noise = getAdjustValue("noise");
    const blur = getAdjustValue("blur");
    const vignette = getAdjustValue("vignette");

    const filters = [];

    const eqBrightness = clamp(b / 100, -1, 1);
    const eqContrast = clamp(1 + (c / 100), 0, 3);
    const eqGamma = clamp(1 + (e / 200), 0.1, 3);
    filters.push(`eq=brightness=${eqBrightness.toFixed(3)}:contrast=${eqContrast.toFixed(3)}:gamma=${eqGamma.toFixed(3)}`);

    const sat = clamp(1 + (s / 100), 0, 3);
    if (h !== 0 || sat !== 1) {
        filters.push(`hue=h=${h.toFixed(2)}:s=${sat.toFixed(3)}`);
    }

    if (sharpen > 0) {
        filters.push(`unsharp=5:5:${(sharpen / 50).toFixed(3)}:5:5:0`);
    }
    if (noise > 0) {
        filters.push(`noise=alls=${Math.max(1, Math.round(noise / 2))}:allf=t+u`);
    }
    if (blur > 0) {
        const blurPower = clamp(blur / 30, 0.2, 3);
        filters.push(`boxblur=${blurPower.toFixed(3)}:1`);
    }
    if (vignette > 0) {
        const angleDiv = clamp(20 - (vignette / 6), 4, 20);
        filters.push(`vignette=PI/${angleDiv.toFixed(3)}`);
    }

    return filters.join(",");
}

function buildAnimationVideoFilters(durationSec) {
    const vf = [];
    const af = [];
    const d = Math.max(0, Number(durationSec) || 0);
    const speed = clamp(Number(animationState.zoomSpeed) || 1.2, 0.4, 3);

    if (animationState.in === "fade" && d > 0.15) {
        const fd = Math.min(speed, Math.max(0.2, d / 3));
        vf.push(`fade=t=in:st=0:d=${fd.toFixed(3)}`);
        af.push(`afade=t=in:st=0:d=${fd.toFixed(3)}`);
    }
    if (animationState.out === "fade" && d > 0.15) {
        const fd = Math.min(speed, Math.max(0.2, d / 3));
        const st = Math.max(0, d - fd);
        vf.push(`fade=t=out:st=${st.toFixed(3)}:d=${fd.toFixed(3)}`);
        af.push(`afade=t=out:st=${st.toFixed(3)}:d=${fd.toFixed(3)}`);
    }

    if (animationState.loop === "spin") {
        vf.push("rotate=0.035*sin(2*PI*t/2.4):c=black@0");
    } else if (animationState.loop === "spin-smooth") {
        vf.push("rotate=0.02*sin(2*PI*t/3.6):c=black@0");
    } else if (animationState.loop === "sway") {
        vf.push("rotate=0.02*sin(2*PI*t/2.8):c=black@0");
    } else if (animationState.loop === "3d-sway") {
        vf.push("rotate=0.028*sin(2*PI*t/2.2):c=black@0");
    } else if (animationState.loop === "jiggle") {
        vf.push("rotate=0.017*sin(2*PI*t*4.0):c=black@0");
    }

    const zoomDepth = animationState.zoomDepth;
    if (zoomDepth && zoomDepth !== "none") {
        const zoomMap = { shallow: 1.03, moderate: 1.07, deep: 1.12 };
        const z = zoomMap[zoomDepth] || 1.03;
        vf.push(`scale=iw*${z.toFixed(3)}:ih*${z.toFixed(3)},crop=iw/${z.toFixed(3)}:ih/${z.toFixed(3)}`);
    }

    return {
        vf: vf.join(","),
        af: af.join(",")
    };
}

function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
}

function syncInputsFromRange() {
    trimStart.value = formatInputTime(trimStartSec);
    trimEnd.value = formatInputTime(trimEndSec);
}

function updateTimelineUI() {
    const width = trimTrack.clientWidth || 1;
    const startX = (trimStartSec / Math.max(0.001, trimDuration)) * width;
    const endX = (trimEndSec / Math.max(0.001, trimDuration)) * width;
    const edgeBleed = 2;

    trimMaskLeft.style.width = `${Math.max(0, startX + edgeBleed)}px`;
    trimMaskRight.style.width = `${Math.max(0, (width - endX) + edgeBleed)}px`;

    trimSelection.style.left = `${Math.max(0, startX - edgeBleed)}px`;
    trimSelection.style.width = `${Math.max(0, (endX - startX) + (edgeBleed * 2))}px`;

    trimHandleStart.style.left = `${startX - (trimHandleStart.offsetWidth / 2)}px`;
    trimHandleEnd.style.left = `${endX - (trimHandleEnd.offsetWidth / 2)}px`;

    trimStartPill.textContent = formatTimelineTime(trimStartSec);
    trimLabelStart.textContent = formatTimelineTime(trimStartSec);
    trimLabelDuration.textContent = `Selected: ${formatTimelineTime(trimEndSec - trimStartSec)}`;
    trimLabelEnd.textContent = formatTimelineTime(trimEndSec);
    if (trimOverlayStart) trimOverlayStart.textContent = `Start ${formatTimelineTime(trimStartSec)}`;
    if (trimOverlayEnd) trimOverlayEnd.textContent = `End ${formatTimelineTime(trimEndSec)}`;
}

function updatePreviewTimeUI() {
    const duration = Math.max(0, Number(trimPreview.duration) || trimDuration || 0);
    const current = Math.max(0, Number(trimPreview.currentTime) || 0);
    const percent = duration > 0 ? (current / duration) * 100 : 0;
    trimSeek.value = String(percent);
    trimTime.textContent = `${formatPlayerTime(current)} / ${formatPlayerTime(duration)}`;
    if (trimOverlayNow) trimOverlayNow.textContent = `Now ${formatTimelineTime(current)}`;
}

function syncPlayButtonState() {
    trimPlayBtn.textContent = trimPreview.paused ? "Play" : "Pause";
}

function requestPreviewSeek(targetSec) {
    if (!trimSelectedFile) return;
    pendingScrubTime = clamp(Number(targetSec) || 0, 0, trimDuration || Number(trimPreview.duration) || 0);
    if (scrubRaf) return;

    scrubRaf = requestAnimationFrame(() => {
        scrubRaf = 0;
        const nextTime = pendingScrubTime;
        pendingScrubTime = null;
        if (!Number.isFinite(nextTime)) return;

        const current = Number(trimPreview.currentTime) || 0;
        const delta = Math.abs(current - nextTime);
        if (delta < 0.02) {
            updatePreviewTimeUI();
            return;
        }

        try {
            if (typeof trimPreview.fastSeek === "function" && delta > 0.2) {
                trimPreview.fastSeek(nextTime);
            } else {
                trimPreview.currentTime = nextTime;
            }
        } catch {
            trimPreview.currentTime = nextTime;
        }
        updatePreviewTimeUI();
    });
}

function applyInputTimes() {
    if (!trimDuration) return;
    const start = parseTrimTime(trimStart.value);
    const end = parseTrimTime(trimEnd.value);
    if (start === null || end === null || Number.isNaN(start) || Number.isNaN(end)) return;

    const clampedStart = clamp(start, 0, trimDuration);
    const clampedEnd = clamp(end, 0, trimDuration);
    if (clampedEnd <= clampedStart) return;

    trimStartSec = clampedStart;
    trimEndSec = clampedEnd;
    updateTimelineUI();
}

function xToTime(clientX) {
    const rect = trimTrack.getBoundingClientRect();
    const px = clamp(clientX - rect.left, 0, rect.width || 1);
    return (px / Math.max(1, rect.width)) * trimDuration;
}

function beginHandleDrag(which, event) {
    if (!trimDuration) return;
    dragResumePlayback = !trimPreview.paused;
    trimPreview.pause();
    dragState = { which, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
}

function onHandleMove(event) {
    if (!dragState || !trimDuration) return;
    const minGap = Math.min(0.2, trimDuration / 100);
    const t = xToTime(event.clientX);

    if (dragState.which === "start") {
        trimStartSec = clamp(t, 0, trimEndSec - minGap);
    } else {
        trimEndSec = clamp(t, trimStartSec + minGap, trimDuration);
    }

    syncInputsFromRange();
    updateTimelineUI();
    requestPreviewSeek(dragState.which === "start" ? trimStartSec : trimEndSec);
}

function endHandleDrag() {
    if (dragResumePlayback) {
        trimPreview.play().catch(() => {});
    }
    dragResumePlayback = false;
    dragState = null;
}

function nudgeHandle(which, deltaSeconds) {
    if (!trimDuration) return;
    const minGap = Math.min(0.2, trimDuration / 100);
    if (which === "start") {
        trimStartSec = clamp(trimStartSec + deltaSeconds, 0, trimEndSec - minGap);
        requestPreviewSeek(trimStartSec);
    } else {
        trimEndSec = clamp(trimEndSec + deltaSeconds, trimStartSec + minGap, trimDuration);
        requestPreviewSeek(trimEndSec);
    }
    syncInputsFromRange();
    updateTimelineUI();
}

function shouldIgnoreGlobalTrimHotkey(event) {
    const target = event.target;
    if (!(target instanceof Element)) return false;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
        return true;
    }
    return target.closest("[contenteditable='true']") !== null;
}

async function waitForEvent(target, eventName) {
    return new Promise((resolve, reject) => {
        const onDone = () => {
            cleanup();
            resolve();
        };
        const onError = () => {
            cleanup();
            reject(new Error(`Failed while waiting for ${eventName}`));
        };
        const cleanup = () => {
            target.removeEventListener(eventName, onDone);
            target.removeEventListener("error", onError);
        };
        target.addEventListener(eventName, onDone, { once: true });
        target.addEventListener("error", onError, { once: true });
    });
}

async function renderTimelineThumbnails() {
    const token = ++thumbsRenderToken;
    if (!trimPreviewUrl || !trimDuration) return;

    const canvas = trimThumbs;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = Math.max(300, trimTrack.clientWidth || 900);
    const height = 56;
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = "#0f1c37";
    ctx.fillRect(0, 0, width, height);

    const sampleVideo = document.createElement("video");
    sampleVideo.preload = "auto";
    sampleVideo.muted = true;
    sampleVideo.src = trimPreviewUrl;

    try {
        await waitForEvent(sampleVideo, "loadeddata");
    } catch {
        return;
    }

    const frameCount = Math.max(8, Math.min(24, Math.floor(width / 72)));
    const frameWidth = width / frameCount;

    for (let i = 0; i < frameCount; i += 1) {
        if (token !== thumbsRenderToken) return;

        const t = (i / Math.max(1, frameCount - 1)) * Math.max(0.001, trimDuration - 0.05);
        try {
            sampleVideo.currentTime = t;
            await waitForEvent(sampleVideo, "seeked");
        } catch {
            break;
        }

        const x = i * frameWidth;
        ctx.drawImage(sampleVideo, x, 0, frameWidth + 1, height);
        ctx.fillStyle = "rgba(3, 14, 32, 0.14)";
        ctx.fillRect(x + frameWidth - 1, 0, 1, height);
    }

    sampleVideo.src = "";
}

function setTrimFile(file) {
    if (!file || !file.type.startsWith("video/")) {
        trimSetStatus("Please choose a valid video file.", "error");
        return;
    }

    trimSelectedFile = file;
    trimOutputBlob = null;
    trimDownloadBtn.classList.add("hidden");

    if (trimPreviewUrl) URL.revokeObjectURL(trimPreviewUrl);
    trimPreviewUrl = URL.createObjectURL(file);
    trimPreview.src = trimPreviewUrl;
    if (animZoomPreview) {
        animZoomPreview.src = trimPreviewUrl;
        animZoomPreview.play().catch(() => {});
    }
    trimPreview.style.aspectRatio = "16 / 9";
    trimPreviewWrap.classList.remove("hidden");

    trimSetStatus(`Loaded: ${file.name}`);
}

trimPreview.addEventListener("loadedmetadata", async () => {
    updatePreviewRatio(trimPreview);
    trimDuration = Math.max(0, Number(trimPreview.duration) || 0);
    trimStartSec = 0;
    trimEndSec = trimDuration;
    syncInputsFromRange();
    updateTimelineUI();
    updatePreviewTimeUI();
    syncPlayButtonState();
    await renderTimelineThumbnails();
});

trimPreview.addEventListener("timeupdate", () => {
    if (!trimPreview.paused && trimEndSec > trimStartSec && trimPreview.currentTime >= trimEndSec) {
        trimPreview.currentTime = trimStartSec;
    }
    updatePreviewTimeUI();
});

trimPreview.addEventListener("play", syncPlayButtonState);
trimPreview.addEventListener("pause", syncPlayButtonState);
trimPreview.addEventListener("ended", syncPlayButtonState);

trimDrop.addEventListener("click", () => trimFile.click());
trimDrop.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); trimFile.click(); } });
["dragenter", "dragover"].forEach((n) => trimDrop.addEventListener(n, (e) => { e.preventDefault(); trimDrop.classList.add("is-dragover"); }));
["dragleave", "dragend", "drop"].forEach((n) => trimDrop.addEventListener(n, (e) => { e.preventDefault(); trimDrop.classList.remove("is-dragover"); }));
trimDrop.addEventListener("drop", (e) => setTrimFile(e.dataTransfer?.files?.[0] || null));
trimFile.addEventListener("change", () => setTrimFile(trimFile.files?.[0] || null));

trimStart.addEventListener("change", applyInputTimes);
trimEnd.addEventListener("change", applyInputTimes);

trimPlayBtn.addEventListener("click", async () => {
    if (!trimSelectedFile) return;
    if (trimPreview.paused) {
        if (trimPreview.currentTime < trimStartSec || trimPreview.currentTime > trimEndSec) {
            trimPreview.currentTime = trimStartSec;
        }
        await trimPreview.play().catch(() => {});
    } else {
        trimPreview.pause();
    }
    syncPlayButtonState();
});

trimSeek.addEventListener("input", () => {
    const duration = Math.max(0, Number(trimPreview.duration) || trimDuration || 0);
    const percent = Number(trimSeek.value) || 0;
    requestPreviewSeek((percent / 100) * duration);
});

Object.keys(adjustmentInputs).forEach((key) => {
    const input = adjustmentInputs[key];
    if (!input) return;
    input.addEventListener("input", refreshAdjustmentOutputs);
});

animTabs.forEach((btn) => {
    btn.addEventListener("click", () => switchAnimationTab(btn.dataset.animTab || "in"));
});

animZoomPanel?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const depth = target.getAttribute("data-zoom-depth");
    if (!depth) return;
    animationState.zoomDepth = depth;
    animZoomPanel.querySelectorAll("[data-zoom-depth]").forEach((node) => {
        node.classList.toggle("is-active", node.getAttribute("data-zoom-depth") === depth);
    });
});

if (animZoomSpeed) {
    animZoomSpeed.addEventListener("input", () => {
        animationState.zoomSpeed = Number(animZoomSpeed.value) || 1.2;
        if (animZoomSpeedVal) animZoomSpeedVal.textContent = `${animationState.zoomSpeed.toFixed(1)}s`;
    });
}

trimHandleStart.addEventListener("pointerdown", (e) => beginHandleDrag("start", e));
trimHandleEnd.addEventListener("pointerdown", (e) => beginHandleDrag("end", e));

trimHandleStart.addEventListener("keydown", (event) => {
    const step = event.shiftKey ? 1 : 0.1;
    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        event.preventDefault();
        nudgeHandle("start", -step);
    } else if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        event.preventDefault();
        nudgeHandle("start", step);
    }
});

trimHandleEnd.addEventListener("keydown", (event) => {
    const step = event.shiftKey ? 1 : 0.1;
    if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") {
        event.preventDefault();
        nudgeHandle("end", step);
    } else if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") {
        event.preventDefault();
        nudgeHandle("end", -step);
    }
});

window.addEventListener("keydown", (event) => {
    if (!trimSelectedFile || !trimDuration) return;
    if (shouldIgnoreGlobalTrimHotkey(event)) return;

    const key = event.key.toLowerCase();
    const step = event.shiftKey ? 1 : 0.1;

    if (key === "a") {
        event.preventDefault();
        nudgeHandle("start", -step);
    } else if (key === "d") {
        event.preventDefault();
        nudgeHandle("start", step);
    } else if (key === "w") {
        event.preventDefault();
        nudgeHandle("end", step);
    } else if (key === "s") {
        event.preventDefault();
        nudgeHandle("end", -step);
    }
});

trimHandleStart.addEventListener("focus", () => {
    showTrimToast("Start handle: use A / D (Shift = bigger step)");
});
trimHandleEnd.addEventListener("focus", () => {
    showTrimToast("End handle: use W / S (Shift = bigger step)");
});
window.addEventListener("pointermove", onHandleMove);
window.addEventListener("pointerup", endHandleDrag);
window.addEventListener("resize", () => {
    updateTimelineUI();
    if (trimDuration) renderTimelineThumbnails();
});

switchAnimationTab("in");
renderAnimationCards();
refreshAdjustmentOutputs();
showTrimToast("Controls: Start A/D | End W/S | Shift = bigger step");

studioAdjustToggle?.addEventListener("click", () => {
    const isOpen = studioAdjustPanel?.classList.contains("is-open");
    setStudioPanel(isOpen ? null : "adjust");
});
studioAnimToggle?.addEventListener("click", () => {
    const isOpen = studioAnimPanel?.classList.contains("is-open");
    setStudioPanel(isOpen ? null : "anim");
});
setStudioPanel("adjust");

trimRunBtn.addEventListener("click", async () => {
    if (!trimSelectedFile) {
        trimSetStatus("Load a video first.", "error");
        return;
    }

    const startSec = parseTrimTime(trimStart.value);
    const endSec = parseTrimTime(trimEnd.value);
    if (Number.isNaN(startSec) || Number.isNaN(endSec) || startSec === null || endSec === null) {
        trimSetStatus("Use MM:SS or HH:MM:SS format for start and end.", "error");
        return;
    }
    if (endSec <= startSec) {
        trimSetStatus("End time must be greater than start time.", "error");
        return;
    }
    if (!trimModeExtract.checked && !trimModeDelete.checked) {
        trimSetStatus("Choose extract or delete mode.", "error");
        return;
    }

    trimRunBtn.disabled = true;
    trimDownloadBtn.classList.add("hidden");

    try {
        const ffmpeg = await window.MediaFfmpeg.ensureLoaded((p) => trimSetStatus(`Processing... ${p}%`));
        const ext = window.MediaFfmpeg.extFromName(trimSelectedFile.name, "mp4");
        const inName = `input_${Date.now()}.${ext}`;
        const outName = `trim_${Date.now()}.mp4`;
        const mode = trimModeDelete.checked ? "delete" : "extract";

        await window.MediaFfmpeg.writeFile(ffmpeg, inName, trimSelectedFile);
        let outputDuration = endSec - startSec;

        if (mode === "extract") {
            await ffmpeg.exec([
                "-y", "-ss", toFfmpegTime(startSec), "-to", toFfmpegTime(endSec),
                "-i", inName,
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
                "-c:a", "aac", "-movflags", "+faststart",
                outName
            ]);
        } else {
            const total = trimDuration || Math.max(endSec, startSec);
            if (startSec <= 0 && endSec >= total) {
                throw new Error("Delete range covers entire video.");
            }

            if (startSec <= 0) {
                outputDuration = Math.max(0, total - endSec);
                await ffmpeg.exec([
                    "-y", "-ss", toFfmpegTime(endSec),
                    "-i", inName,
                    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
                    "-c:a", "aac", "-movflags", "+faststart",
                    outName
                ]);
            } else if (endSec >= total) {
                outputDuration = Math.max(0, startSec);
                await ffmpeg.exec([
                    "-y", "-ss", "00:00:00.000", "-to", toFfmpegTime(startSec),
                    "-i", inName,
                    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
                    "-c:a", "aac", "-movflags", "+faststart",
                    outName
                ]);
            } else {
                outputDuration = Math.max(0, total - (endSec - startSec));
                const filter = [
                    `[0:v]trim=0:${startSec.toFixed(3)},setpts=PTS-STARTPTS[v0]`,
                    `[0:a]atrim=0:${startSec.toFixed(3)},asetpts=PTS-STARTPTS[a0]`,
                    `[0:v]trim=start=${endSec.toFixed(3)}:end=${total.toFixed(3)},setpts=PTS-STARTPTS[v1]`,
                    `[0:a]atrim=start=${endSec.toFixed(3)}:end=${total.toFixed(3)},asetpts=PTS-STARTPTS[a1]`,
                    `[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]`
                ].join(";");

                await ffmpeg.exec([
                    "-y", "-i", inName,
                    "-filter_complex", filter,
                    "-map", "[v]", "-map", "[a]",
                    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
                    "-c:a", "aac", "-movflags", "+faststart",
                    outName
                ]);
            }
        }

        const fades = buildFadeFilters(outputDuration);
        const adjustments = buildAdjustmentVideoFilterChain();
        const animations = buildAnimationVideoFilters(outputDuration);
        const finalVf = [fades.vf, adjustments, animations.vf].filter(Boolean).join(",");
        const finalAf = [fades.af, animations.af].filter(Boolean).join(",");

        if (finalVf || finalAf) {
            const styledOut = `styled_${Date.now()}.mp4`;
            const styleArgs = ["-y", "-i", outName];
            if (finalVf) styleArgs.push("-vf", finalVf);
            if (finalAf) styleArgs.push("-af", finalAf);
            styleArgs.push(
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
                "-c:a", "aac", "-movflags", "+faststart",
                styledOut
            );
            await ffmpeg.exec(styleArgs);
            const styledBytes = await window.MediaFfmpeg.readFile(ffmpeg, styledOut);
            trimOutputBlob = new Blob([styledBytes.buffer], { type: "video/mp4" });
        } else {
            const bytes = await window.MediaFfmpeg.readFile(ffmpeg, outName);
            trimOutputBlob = new Blob([bytes.buffer], { type: "video/mp4" });
        }

        trimDownloadBtn.classList.remove("hidden");
        trimSetStatus(`Done: ${mode === "extract" ? "Extracted selected" : "Deleted selected"} with styled adjustments.`, "success");
    } catch (err) {
        trimSetStatus(`Failed: ${err.message || "Unknown error"}`, "error");
    } finally {
        trimRunBtn.disabled = false;
    }
});

trimDownloadBtn.addEventListener("click", () => {
    if (!trimOutputBlob || !trimSelectedFile) return;
    const base = window.MediaFfmpeg.baseFromName(trimSelectedFile.name, "video");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(trimOutputBlob);
    a.download = `${base}_trimmed.mp4`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
});
