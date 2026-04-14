const rciFile = document.getElementById("rciFile");
const rciDrop = document.getElementById("rciDrop");
const rciRadius = document.getElementById("rciRadius");
const rciRadiusText = document.getElementById("rciRadiusText");
const rciRadiusInput = document.getElementById("rciRadiusInput");
const rciStepUp = document.getElementById("rciStepUp");
const rciStepDown = document.getElementById("rciStepDown");
const rciBgSwatches = Array.from(document.querySelectorAll("[data-rci-bg]"));
const rciBgPalette = document.querySelector(".rci-bg-palette");
const rciBgCustomWrap = document.getElementById("rciBgCustomBtn");
const rciColorPopover = document.getElementById("rciColorPopover");
const rciSvWrap = document.getElementById("rciSvWrap");
const rciSvCursor = document.getElementById("rciSvCursor");
const rciHue = document.getElementById("rciHue");
const rciEyeDropBtn = document.getElementById("rciEyeDropBtn");
const rciPickStatus = document.getElementById("rciPickStatus");
const rciColorPreview = document.getElementById("rciColorPreview");
const rciR = document.getElementById("rciR");
const rciG = document.getElementById("rciG");
const rciB = document.getElementById("rciB");
const rciRunBtn = document.getElementById("rciRunBtn");
const rciDownloadBtn = document.getElementById("rciDownloadBtn");
const rciPreviewWrap = document.getElementById("rciPreviewWrap");
const rciPreviewCanvas = document.getElementById("rciPreviewCanvas");
const rciMeta = document.getElementById("rciMeta");
const rciStatus = document.getElementById("rciStatus");

let rciImage = null;
let rciOutBlob = null;
const RCI_RADIUS_LIMIT = 540;
let rciBgValue = "transparent";
const customColorState = { h: 260, s: 0.63, v: 0.96 };

function rciSetStatus(msg, mode = "loading") {
    rciStatus.textContent = msg;
    if (mode === "error") rciStatus.style.color = "#ef4444";
    else if (mode === "success") rciStatus.style.color = "#22c55e";
    else rciStatus.style.color = document.body.classList.contains("dark-mode") ? "#facc15" : "#b8860b";
}

function clampRadius(value) {
    return Math.min(RCI_RADIUS_LIMIT, Math.max(0, Number(value) || 0));
}

function clamp255(value) {
    return Math.min(255, Math.max(0, Number(value) || 0));
}

function clamp01(value) {
    return Math.min(1, Math.max(0, value));
}

function hsvToRgb(h, s, v) {
    const hue = ((h % 360) + 360) % 360;
    const sat = clamp01(s);
    const val = clamp01(v);
    const c = val * sat;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = val - c;
    let rp = 0, gp = 0, bp = 0;
    if (hue < 60) [rp, gp, bp] = [c, x, 0];
    else if (hue < 120) [rp, gp, bp] = [x, c, 0];
    else if (hue < 180) [rp, gp, bp] = [0, c, x];
    else if (hue < 240) [rp, gp, bp] = [0, x, c];
    else if (hue < 300) [rp, gp, bp] = [x, 0, c];
    else [rp, gp, bp] = [c, 0, x];
    return {
        r: Math.round((rp + m) * 255),
        g: Math.round((gp + m) * 255),
        b: Math.round((bp + m) * 255)
    };
}

function rgbToHsv(r, g, b) {
    const rn = clamp255(r) / 255;
    const gn = clamp255(g) / 255;
    const bn = clamp255(b) / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
        if (max === rn) h = ((gn - bn) / d) % 6;
        else if (max === gn) h = (bn - rn) / d + 2;
        else h = (rn - gn) / d + 4;
        h *= 60;
        if (h < 0) h += 360;
    }
    const s = max === 0 ? 0 : d / max;
    return { h, s, v: max };
}

function rgbToHex(r, g, b) {
    const toHex = (v) => clamp255(v).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb(hex) {
    const raw = String(hex || "").trim().replace(/^#/, "");
    if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null;
    return {
        r: parseInt(raw.slice(0, 2), 16),
        g: parseInt(raw.slice(2, 4), 16),
        b: parseInt(raw.slice(4, 6), 16)
    };
}

function updateSliderProgress() {
    const max = Number(rciRadius.max) || RCI_RADIUS_LIMIT;
    const value = Number(rciRadius.value) || 0;
    const progress = Math.max(0, Math.min(100, (value / max) * 100));
    rciRadius.style.setProperty("--progress", `${progress}%`);
}

function setBgActiveVisual(value, isCustom = false) {
    rciBgSwatches.forEach((swatch) => {
        const isActive = !isCustom && swatch.dataset.rciBg === value;
        swatch.classList.toggle("is-active", isActive);
        swatch.setAttribute("aria-checked", isActive ? "true" : "false");
    });
    if (rciBgCustomWrap) {
        rciBgCustomWrap.classList.toggle("is-active", isCustom);
        rciBgCustomWrap.setAttribute("aria-checked", isCustom ? "true" : "false");
    }
}

function setBackgroundValue(nextValue, isCustom = false) {
    rciBgValue = nextValue;
    setBgActiveVisual(nextValue, isCustom);
    syncPreviewWrapBackground();
    if (rciImage) drawRoundedToCanvas();
}

function syncCustomPickerUI() {
    const hueColor = hsvToRgb(customColorState.h, 1, 1);
    const hueHex = rgbToHex(hueColor.r, hueColor.g, hueColor.b);
    rciSvWrap.style.background = `linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #fff, ${hueHex})`;
    rciSvCursor.style.left = `${customColorState.s * 100}%`;
    rciSvCursor.style.top = `${(1 - customColorState.v) * 100}%`;
    rciHue.value = String(Math.round(customColorState.h));
    const rgb = hsvToRgb(customColorState.h, customColorState.s, customColorState.v);
    rciR.value = String(rgb.r);
    rciG.value = String(rgb.g);
    rciB.value = String(rgb.b);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    rciColorPreview.style.background = hex;
    rciBgCustomWrap?.style.setProperty("--custom-core", hex);
    setBackgroundValue(hex, true);
}

function openCustomPicker() {
    rciColorPopover.classList.remove("hidden");
    if (rciEyeDropBtn) {
        rciEyeDropBtn.disabled = typeof window.EyeDropper !== "function";
        rciEyeDropBtn.textContent = rciEyeDropBtn.disabled ? "Screen Picker Not Supported" : "Pick From Screen";
    }
    syncCustomPickerUI();
}

function closeCustomPicker() {
    rciColorPopover.classList.add("hidden");
}

function syncPreviewWrapBackground() {
    rciPreviewWrap.classList.remove("bg-solid", "bg-light");
    if (rciBgValue === "transparent") {
        rciPreviewWrap.style.removeProperty("background");
        return;
    }
    const wrapColor = rciBgValue.toLowerCase() === "#000000" ? "#0a0a0a" : rciBgValue;
    rciPreviewWrap.style.background = wrapColor;
}

function drawRoundedToCanvas() {
    if (!rciImage) return null;

    const radius = clampRadius(rciRadius.value);
    const sourceW = rciImage.width;
    const sourceH = rciImage.height;
    const sourceMinSide = Math.min(sourceW, sourceH);
    const sourceMaxRadius = Math.floor(sourceMinSide / 2);
    const appliedRadius = Math.min(radius, sourceMaxRadius);
    const outW = sourceW;
    const outH = sourceH;

    const canvas = rciPreviewCanvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    canvas.width = outW;
    canvas.height = outH;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const bg = rciBgValue;
    syncPreviewWrapBackground();
    if (bg !== "transparent") {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const w = outW;
    const h = outH;
    const r = appliedRadius;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(w - r, 0);
    ctx.quadraticCurveTo(w, 0, w, r);
    ctx.lineTo(w, h - r);
    ctx.quadraticCurveTo(w, h, w - r, h);
    ctx.lineTo(r, h);
    ctx.quadraticCurveTo(0, h, 0, h - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(rciImage, 0, 0, w, h);
    ctx.restore();

    rciMeta.textContent = `Output: ${w}x${h} | Radius: ${radius}px | Applied: ${appliedRadius}px`;
    return { w, h, radius, appliedRadius };
}

function syncRadiusUI(next) {
    rciRadius.value = String(next);
    rciRadiusInput.value = String(next);
    updateSliderProgress();
}

function nudgeRadius(delta) {
    const current = Number(rciRadiusInput.value) || 0;
    const next = clampRadius(current + delta);
    syncRadiusUI(next);
    invalidateAppliedState();
    if (rciImage) drawRoundedToCanvas();
}

function invalidateAppliedState() {
    if (!rciOutBlob) return;
    rciOutBlob = null;
    rciDownloadBtn.classList.add("hidden");
    rciSetStatus("Settings changed. Click Apply Rounded Corners.", "loading");
}

let nudgeTimer = null;
let nudgeInterval = null;

function stopNudge() {
    if (nudgeTimer) {
        clearTimeout(nudgeTimer);
        nudgeTimer = null;
    }
    if (nudgeInterval) {
        clearInterval(nudgeInterval);
        nudgeInterval = null;
    }
}

function startNudge(delta) {
    stopNudge();
    nudgeRadius(delta);
    nudgeTimer = setTimeout(() => {
        nudgeInterval = setInterval(() => nudgeRadius(delta), 45);
    }, 250);
}

function setFile(file) {
    if (!file || !file.type.startsWith("image/")) {
        rciSetStatus("Please choose a valid image file.", "error");
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        const img = new Image();
        img.onload = () => {
            rciImage = img;
            rciOutBlob = null;
            rciDownloadBtn.classList.add("hidden");
            rciPreviewWrap.classList.remove("hidden");
            syncRadiusUI(clampRadius(rciRadius.value));
            const originalKb = (file.size || 0) / 1024;
            rciRadiusText.textContent = `Original: ${img.width}x${img.height} | ${originalKb.toFixed(1)} KB`;
            drawRoundedToCanvas();
            rciSetStatus(`Loaded: ${file.name}`);
        };
        img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
}

function exportRoundedPng() {
    if (!rciImage) {
        rciSetStatus("Load an image first.", "error");
        return;
    }

    const result = drawRoundedToCanvas();
    if (!result) return;

    rciPreviewCanvas.toBlob((blob) => {
        if (!blob) {
            rciSetStatus("Failed to create output image.", "error");
            return;
        }
        rciOutBlob = blob;
        rciDownloadBtn.classList.remove("hidden");
        rciMeta.textContent = `Output: ${result.w}x${result.h} | Radius: ${result.radius}px | Applied: ${result.appliedRadius}px | ${(blob.size / 1024).toFixed(1)} KB`;
        rciSetStatus("Rounded corners applied.", "success");
    }, "image/png");
}

rciRadius.addEventListener("input", () => {
    const next = clampRadius(rciRadius.value);
    syncRadiusUI(next);
    invalidateAppliedState();
    if (rciImage) drawRoundedToCanvas();
});

rciRadiusInput.addEventListener("input", () => {
    const next = clampRadius(rciRadiusInput.value);
    syncRadiusUI(next);
    invalidateAppliedState();
    if (rciImage) drawRoundedToCanvas();
});

if (rciStepUp && rciStepDown) {
    const bindStepperHold = (button, delta) => {
        button.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            button.setPointerCapture?.(e.pointerId);
            startNudge(delta);
        });
        button.addEventListener("pointerup", stopNudge);
        button.addEventListener("pointercancel", stopNudge);
        button.addEventListener("pointerleave", stopNudge);
        button.addEventListener("lostpointercapture", stopNudge);
    };

    bindStepperHold(rciStepUp, 1);
    bindStepperHold(rciStepDown, -1);
    window.addEventListener("blur", stopNudge);
}

rciBgSwatches.forEach((swatch) => {
    swatch.addEventListener("click", () => {
        const value = swatch.dataset.rciBg || "transparent";
        setBackgroundValue(value, false);
    });
});

rciBgCustomWrap?.addEventListener("click", () => {
    if (rciColorPopover.classList.contains("hidden")) openCustomPicker();
    else closeCustomPicker();
});

rciHue?.addEventListener("input", () => {
    customColorState.h = Number(rciHue.value) || 0;
    syncCustomPickerUI();
});

if (rciSvWrap) {
    const updateSvFromEvent = (event) => {
        const rect = rciSvWrap.getBoundingClientRect();
        const x = clamp01((event.clientX - rect.left) / rect.width);
        const y = clamp01((event.clientY - rect.top) / rect.height);
        customColorState.s = x;
        customColorState.v = 1 - y;
        syncCustomPickerUI();
    };

    let svPointerId = null;
    rciSvWrap.addEventListener("pointerdown", (event) => {
        svPointerId = event.pointerId;
        rciSvWrap.setPointerCapture?.(event.pointerId);
        updateSvFromEvent(event);
    });
    rciSvWrap.addEventListener("pointermove", (event) => {
        if (svPointerId === event.pointerId) updateSvFromEvent(event);
    });
    rciSvWrap.addEventListener("pointerup", () => { svPointerId = null; });
    rciSvWrap.addEventListener("pointercancel", () => { svPointerId = null; });
}

[rciR, rciG, rciB].forEach((input) => {
    input?.addEventListener("input", () => {
        const r = clamp255(rciR.value);
        const g = clamp255(rciG.value);
        const b = clamp255(rciB.value);
        const hsv = rgbToHsv(r, g, b);
        customColorState.h = hsv.h;
        customColorState.s = hsv.s;
        customColorState.v = hsv.v;
        syncCustomPickerUI();
    });
});

if (rciEyeDropBtn) {
    rciEyeDropBtn.addEventListener("click", async () => {
        if (typeof window.EyeDropper !== "function") {
            if (rciPickStatus) rciPickStatus.textContent = "Screen picker not supported";
            return;
        }
        try {
            const picker = new window.EyeDropper();
            const result = await picker.open();
            const rgb = hexToRgb(result?.sRGBHex || "");
            if (!rgb) throw new Error("Invalid picked color");
            const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
            customColorState.h = hsv.h;
            customColorState.s = hsv.s;
            customColorState.v = hsv.v;
            syncCustomPickerUI();
            if (rciPickStatus) rciPickStatus.textContent = `Picked color: ${rgbToHex(rgb.r, rgb.g, rgb.b)}`;
        } catch (error) {
            const msg = String(error?.message || "");
            if (msg.toLowerCase().includes("abort")) return;
            if (rciPickStatus) rciPickStatus.textContent = "Pick failed. Try again.";
        }
    });
}

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeCustomPicker();
});

rciDrop.addEventListener("click", () => rciFile.click());
rciDrop.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        rciFile.click();
    }
});

["dragenter", "dragover"].forEach((name) => {
    rciDrop.addEventListener(name, (e) => {
        e.preventDefault();
        rciDrop.classList.add("is-dragover");
    });
});

["dragleave", "dragend", "drop"].forEach((name) => {
    rciDrop.addEventListener(name, (e) => {
        e.preventDefault();
        rciDrop.classList.remove("is-dragover");
    });
});

rciDrop.addEventListener("drop", (e) => {
    setFile(e.dataTransfer?.files?.[0] || null);
    rciDrop.classList.remove("is-dropped");
    // Restart animation on every drop.
    void rciDrop.offsetWidth;
    rciDrop.classList.add("is-dropped");
});
rciDrop.addEventListener("animationend", () => {
    rciDrop.classList.remove("is-dropped");
});
rciFile.addEventListener("change", () => setFile(rciFile.files?.[0] || null));

rciRunBtn.addEventListener("click", exportRoundedPng);

rciDownloadBtn.addEventListener("click", () => {
    if (!rciOutBlob) {
        exportRoundedPng();
        return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(rciOutBlob);
    a.download = "rounded_corners.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
});

updateSliderProgress();
setBgActiveVisual(rciBgValue, false);
syncPreviewWrapBackground();
