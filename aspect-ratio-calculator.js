const arW1 = document.getElementById("arW1");
const arH1 = document.getElementById("arH1");
const arW2 = document.getElementById("arW2");
const arH2 = document.getElementById("arH2");
const arPresetTrigger = document.getElementById("arPresetTrigger");
const arPresetList = document.getElementById("arPresetList");
const arRound = document.getElementById("arRound");
const arSwap = document.getElementById("arSwap");
const arReset = document.getElementById("arReset");
const arShowSample = document.getElementById("arShowSample");
const arSample = document.getElementById("arSample");
const arSampleImage = arSample ? arSample.querySelector(".ar-sample-image") : null;
const arExampleText = document.getElementById("arExampleText");
const arExampleBox = document.getElementById("arExampleBox");
const arSampleRatio = document.getElementById("arSampleRatio");
const arSampleSize = document.getElementById("arSampleSize");
const arFitImage = document.getElementById("arFitImage");
const arActions = document.querySelector(".ar-side .convert-actions");
const arUploadZone = document.getElementById("arUploadZone");
const arImageInput = document.getElementById("arImageInput");
const arStatus = document.getElementById("arStatus");
const arResult = document.getElementById("arResult");
const arSimple = document.getElementById("arSimple");

const DEFAULT_PAIR = { w: 1920, h: 1080 };
const PRESET_OPTIONS = [
    { value: "1920x1080", label: "1920 x 1080 (HD TV, iPhone 6 plus)" },
    { value: "7680x4320", label: "7680 x 4320 (8K UHDTV)" },
    { value: "5120x2880", label: "5120 x 2880 (5K, iMac with retina screen)" },
    { value: "3840x2160", label: "3840 x 2160 (4K UHDTV)" },
    { value: "2048x1536", label: "2048 x 1536 (iPad with retina screen)" },
    { value: "1920x1200", label: "1920 x 1200 (WUXGA)" },
    { value: "1334x750", label: "1334 x 750 (iPhone 6)" },
    { value: "1200x630", label: "1200 x 630 (Facebook)" },
    { value: "1136x640", label: "1136 x 640 (iPhone 5 screen)" },
    { value: "1024x768", label: "1024 x 768 (iPad)" },
    { value: "1024x512", label: "1024 x 512 (Twitter)" },
    { value: "960x640", label: "960 x 640 (iPhone 4 screen)" },
    { value: "800x600", label: "800 x 600" },
    { value: "728x90", label: "728 x 90 (Common web banner ad size)" },
    { value: "720x576", label: "720 x 576 (PAL)" },
    { value: "640x480", label: "640 x 480 (VGA)" },
    { value: "576x486", label: "576 x 486 (NTSC)" },
    { value: "320x480", label: "320 x 480 (HVGA)" }
];
const STORAGE_KEY = "ar_calculator_state_v1";
const FIELDS = [arW1, arH1, arW2, arH2];
let holdDelayTimer = null;
let holdRepeatTimer = null;
let isInternalUpdate = false;
let selectedPresetValue = "";
let presetHoverIndex = -1;
let uploadedImageUrl = "";
const defaultSampleSrc = arSampleImage ? arSampleImage.getAttribute("src") || "" : "";
const defaultSampleSrcset = arSampleImage ? arSampleImage.getAttribute("srcset") || "" : "";

function saveUserState() {
    try {
        const payload = {
            preset: selectedPresetValue || "",
            w1: arW1.value || "",
            h1: arH1.value || "",
            stretch: !!arFitImage.checked
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (_) {
        // Ignore persistence errors (private mode, storage disabled, etc.)
    }
}

function loadUserState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return;

        isInternalUpdate = true;
        arW1.value = typeof parsed.w1 === "string" ? parsed.w1 : "";
        arH1.value = typeof parsed.h1 === "string" ? parsed.h1 : "";
        arFitImage.checked = !!parsed.stretch;
        isInternalUpdate = false;

        if (typeof parsed.preset === "string" && parsed.preset) {
            selectedPresetValue = parsed.preset;
            const selectedPreset = PRESET_OPTIONS.find((item) => item.value === selectedPresetValue);
            if (selectedPreset) {
                arPresetTrigger.textContent = selectedPreset.label;
            }
        }
    } catch (_) {
        // Ignore malformed storage data
    }
}

function isSampleVisible() {
    return arShowSample.getAttribute("aria-pressed") === "true";
}

function setSampleVisibility(on) {
    arShowSample.setAttribute("aria-pressed", on ? "true" : "false");
    arShowSample.setAttribute("aria-label", on ? "Hide sample image" : "Show sample image");
    arSample.hidden = !on;
    arExampleText.hidden = on;
    if (on) {
        const pair = getAspectPair() || DEFAULT_PAIR;
        arSample.style.aspectRatio = `${pair.w} / ${pair.h}`;
    }
}

function updateSampleFitMode() {
    if (!(arSampleImage instanceof HTMLImageElement)) return;
    arSampleImage.style.objectFit = arFitImage.checked ? "fill" : "cover";
}

function setPreviewImageSource(src, srcset = "") {
    if (!(arSampleImage instanceof HTMLImageElement)) return;
    arSampleImage.src = src;
    if (srcset) arSampleImage.setAttribute("srcset", srcset);
    else arSampleImage.removeAttribute("srcset");
}

function loadImageFile(file) {
    if (!file) return;
    if (!file.type || !file.type.startsWith("image/")) {
        setStatus("Please choose a valid image file.", "error");
        return;
    }
    if (uploadedImageUrl) {
        URL.revokeObjectURL(uploadedImageUrl);
        uploadedImageUrl = "";
    }
    uploadedImageUrl = URL.createObjectURL(file);
    setPreviewImageSource(uploadedImageUrl);

    const probe = new Image();
    probe.onload = () => {
        const w = probe.naturalWidth;
        const h = probe.naturalHeight;
        if (!w || !h) {
            setSampleVisibility(true);
            updateAspectText();
            setStatus(`Image loaded: ${file.name}`, "success");
            return;
        }

        isInternalUpdate = true;
        arW1.value = String(w);
        arH1.value = String(h);
        arW2.value = "";
        arH2.value = "";
        arW1.classList.remove("is-computed");
        arH1.classList.remove("is-computed");
        arW2.classList.remove("is-computed");
        arH2.classList.remove("is-computed");
        selectedPresetValue = "";
        if (arPresetTrigger) arPresetTrigger.textContent = "Select a ratio preset";
        isInternalUpdate = false;

        setSampleVisibility(true);
        updateResultText();
        updateAspectText();
        saveUserState();
        setStatus(`Image loaded: ${file.name} (${w} x ${h})`, "success");
    };

    probe.onerror = () => {
        setSampleVisibility(true);
        updateAspectText();
        setStatus(`Image loaded: ${file.name}`, "success");
    };

    probe.src = uploadedImageUrl;
}

function initImageUpload() {
    if (!(arUploadZone instanceof HTMLElement) || !(arImageInput instanceof HTMLInputElement)) return;

    arUploadZone.addEventListener("click", () => arImageInput.click());
    arUploadZone.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        arImageInput.click();
    });

    arImageInput.addEventListener("change", () => {
        const file = arImageInput.files && arImageInput.files[0];
        if (!file) return;
        loadImageFile(file);
    });

    ["dragenter", "dragover"].forEach((type) => {
        arUploadZone.addEventListener(type, (event) => {
            event.preventDefault();
            arUploadZone.classList.add("is-dragover");
        });
    });

    ["dragleave", "drop"].forEach((type) => {
        arUploadZone.addEventListener(type, (event) => {
            event.preventDefault();
            arUploadZone.classList.remove("is-dragover");
        });
    });

    arUploadZone.addEventListener("drop", (event) => {
        const transfer = event.dataTransfer;
        const file = transfer && transfer.files && transfer.files[0];
        if (!file) return;
        loadImageFile(file);
    });
}

function setStatus(message, mode = "loading") {
    arStatus.textContent = message;
    if (mode === "error") arStatus.style.color = "#ef4444";
    else if (mode === "success") arStatus.style.color = "#22c55e";
    else arStatus.style.color = document.body.classList.contains("dark-mode") ? "#facc15" : "#b8860b";
}

function parseRatioValue(value) {
    if (!value) return null;
    const [w, h] = value.split("x").map(Number);
    if (!w || !h) return null;
    return { w, h };
}

function openPresetList() {
    arPresetList.hidden = false;
    arPresetTrigger.setAttribute("aria-expanded", "true");
    const selectedIndex = PRESET_OPTIONS.findIndex((item) => item.value === selectedPresetValue);
    if (selectedIndex >= 0) setPresetHoverIndex(selectedIndex, false);
    else setPresetHoverIndex(0, false);
}

function closePresetList() {
    arPresetList.hidden = true;
    arPresetTrigger.setAttribute("aria-expanded", "false");
    setPresetHoverIndex(-1, false);
}

function previewPair(pair) {
    if (!pair) return;
    const g = gcd(pair.w, pair.h);
    const sw = Math.round(pair.w / g);
    const sh = Math.round(pair.h / g);
    updateExampleBoxSize(pair);
    arExampleText.textContent = `Example (${sw}:${sh})`;
    if (arSampleRatio) arSampleRatio.textContent = `${sw}:${sh}`;
    if (arSampleSize) arSampleSize.textContent = `${formatDim(pair.w)}x${formatDim(pair.h)}`;
    arSimple.textContent = `Your aspect ratio is: ${sw} : ${sh}`;
    if (isSampleVisible()) arSample.style.aspectRatio = `${pair.w} / ${pair.h}`;
}

function restorePreviewFromInputs() {
    updateAspectText();
}

function getFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
}

function exitFullscreenSafe() {
    if (document.exitFullscreen) return document.exitFullscreen();
    if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
    return Promise.resolve();
}

function requestFullscreenSafe(element) {
    if (!element) return Promise.resolve();
    if (element.requestFullscreen) return element.requestFullscreen();
    if (element.webkitRequestFullscreen) return element.webkitRequestFullscreen();
    return Promise.resolve();
}

function togglePreviewFullscreen() {
    const active = getFullscreenElement();
    if (active) {
        exitFullscreenSafe();
        return;
    }
    setSampleVisibility(true);
    updateAspectText();
    const target = arExampleBox ? arExampleBox.closest(".ar-example-wrap") || arExampleBox : arSample;
    requestFullscreenSafe(target);
}

function getPresetItems() {
    return Array.from(arPresetList.querySelectorAll(".ar-preset-item"));
}

function getPresetIndexByElement(element) {
    const items = getPresetItems();
    return items.indexOf(element);
}

function setPresetHoverIndex(index, shouldPreview = true) {
    const items = getPresetItems();
    if (!items.length) return;
    const nextIndex = Math.max(0, Math.min(items.length - 1, index));
    presetHoverIndex = nextIndex;
    items.forEach((item, i) => {
        item.classList.toggle("is-active", i === nextIndex);
    });
    const active = items[nextIndex];
    if (active) active.scrollIntoView({ block: "nearest" });
    if (!shouldPreview || !active) return;
    const value = active.dataset.value || "";
    const pair = parseRatioValue(value);
    if (!pair) return;
    setSampleVisibility(true);
    previewPair(pair);
}

function movePresetHover(delta) {
    const items = getPresetItems();
    if (!items.length) return;
    const start = presetHoverIndex < 0 ? 0 : presetHoverIndex;
    const next = (start + delta + items.length) % items.length;
    setPresetHoverIndex(next, true);
}

function applyHoveredPreset() {
    const items = getPresetItems();
    if (!items.length) return;
    const idx = presetHoverIndex < 0 ? 0 : presetHoverIndex;
    const item = items[idx];
    const value = item ? item.dataset.value || "" : "";
    if (!value) return;
    applyCommonRatio(value);
    closePresetList();
}

function gcd(a, b) {
    let x = Math.abs(Math.round(a));
    let y = Math.abs(Math.round(b));
    while (y) {
        const t = y;
        y = x % y;
        x = t;
    }
    return x || 1;
}

function parseValue(input) {
    const n = Number(input.value);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
}

function formatComputed(value) {
    if (arRound.checked) return String(Math.round(value));
    return String(Number(value.toFixed(4)));
}

function setComputedField(input, value) {
    isInternalUpdate = true;
    input.value = formatComputed(value);
    input.classList.add("is-computed");
    isInternalUpdate = false;
}

function clearComputedStyles(except = null) {
    FIELDS.forEach((input) => {
        if (input !== except) input.classList.remove("is-computed");
    });
}

function getAspectPair() {
    const w1 = parseValue(arW1);
    const h1 = parseValue(arH1);
    if (w1 && h1) return { w: w1, h: h1 };

    const w2 = parseValue(arW2);
    const h2 = parseValue(arH2);
    if (w2 && h2) return { w: w2, h: h2 };
    return null;
}

function formatDim(value) {
    if (!Number.isFinite(value)) return "--";
    return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function updateExampleBoxSize(pair) {
    if (!arExampleBox) return;
    const active = pair || DEFAULT_PAIR;
    const ratio = active.w / active.h;
    const wrap = arExampleBox.closest(".ar-example-wrap");
    const isFullscreen = !!(
        wrap &&
        (document.fullscreenElement === wrap || document.webkitFullscreenElement === wrap)
    );

    let maxW;
    let maxH;
    if (isFullscreen) {
        const pad = 40;
        maxW = Math.max(120, window.innerWidth - pad);
        maxH = Math.max(120, window.innerHeight - pad);
    } else {
        const maxPreviewW = 480;
        const maxPreviewH = 270;
        const card = arExampleBox.closest(".card");
        const cardWidth = card ? card.clientWidth - 32 : maxPreviewW;
        const viewportWidth = window.innerWidth - 36;
        maxW = Math.max(120, Math.min(maxPreviewW, cardWidth, viewportWidth));
        maxH = maxPreviewH;

        // Portrait/square ratios: cap preview height so the bottom line of
        // the action buttons aligns with the bottom of the left summary box.
        if (ratio <= 1) {
            const summaryBox = arSimple ? arSimple.closest(".ar-summary") : null;
            if (summaryBox) {
                const exampleRect = arExampleBox.getBoundingClientRect();
                const summaryRect = summaryBox.getBoundingClientRect();
                const actionsRect = arActions ? arActions.getBoundingClientRect() : null;
                const actionsHeight = actionsRect ? actionsRect.height : 0;
                const verticalGap = 7;
                const bySummaryBottom = Math.floor(summaryRect.bottom - exampleRect.top - actionsHeight - verticalGap);
                if (Number.isFinite(bySummaryBottom) && bySummaryBottom > 0) {
                    maxH = Math.max(80, bySummaryBottom);
                }
            }
        } else if (arResult) {
            // Landscape ratios keep the previous cap near the Result line.
            const exampleTop = arExampleBox.getBoundingClientRect().top;
            const resultTop = arResult.getBoundingClientRect().top;
            const byResultLine = Math.floor(resultTop - exampleTop - 8);
            if (Number.isFinite(byResultLine) && byResultLine > 0) {
                maxH = Math.max(120, byResultLine);
            }
        }
    }

    // Fit preview inside available box in both dimensions (contain behavior).
    const w = Math.min(maxW, maxH * ratio);
    arExampleBox.style.width = `${Math.round(w)}px`;
    arExampleBox.style.aspectRatio = `${active.w} / ${active.h}`;
    arExampleBox.style.height = "auto";
}

function updateAspectText() {
    const pair = getAspectPair();
    updateExampleBoxSize(pair);

    if (!pair) {
        arSimple.textContent = "Your aspect ratio is: 16 : 9";
        arExampleText.textContent = "Example (16:9)";
        if (arSampleRatio) arSampleRatio.textContent = "16:9";
        if (arSampleSize) arSampleSize.textContent = "1920x1080";
        if (isSampleVisible()) arSample.style.aspectRatio = `${DEFAULT_PAIR.w} / ${DEFAULT_PAIR.h}`;
        return;
    }

    const g = gcd(pair.w, pair.h);
    const sw = Math.round(pair.w / g);
    const sh = Math.round(pair.h / g);
    arSimple.textContent = `Your aspect ratio is: ${sw} : ${sh}`;
    arExampleText.textContent = `Example (${sw}:${sh})`;
    if (arSampleRatio) arSampleRatio.textContent = `${sw}:${sh}`;
    if (arSampleSize) arSampleSize.textContent = `${formatDim(pair.w)}x${formatDim(pair.h)}`;

    if (!isSampleVisible()) return;
    arSample.style.aspectRatio = `${pair.w} / ${pair.h}`;
}

function updateSampleVisibility() {
    setSampleVisibility(isSampleVisible());
}

function updateResultText() {
    const w1 = parseValue(arW1);
    const h1 = parseValue(arH1);
    const w2 = parseValue(arW2);
    const h2 = parseValue(arH2);
    if (w1 && h1 && w2 && h2) {
        arResult.textContent = `Result: ${w1} / ${h1} = ${w2} / ${h2}`;
        return;
    }
    arResult.textContent = "Result: --";
}

function computeFromTarget(target, w1, h1, w2, h2) {
    if (target === arW1 && h1 && w2 && h2) {
        setComputedField(arW1, (h1 * w2) / h2);
        return true;
    }
    if (target === arH1 && w1 && w2 && h2) {
        setComputedField(arH1, (w1 * h2) / w2);
        return true;
    }
    if (target === arW2 && w1 && h1 && h2) {
        setComputedField(arW2, (w1 * h2) / h1);
        return true;
    }
    if (target === arH2 && w1 && h1 && w2) {
        setComputedField(arH2, (h1 * w2) / w1);
        return true;
    }
    return false;
}

function calculateMissing(changedInput = null) {
    if (!changedInput) return;
    const previouslyComputed = FIELDS.find((input) => input.classList.contains("is-computed"));
    changedInput.classList.remove("is-computed");

    const w1 = parseValue(arW1);
    const h1 = parseValue(arH1);
    const w2 = parseValue(arW2);
    const h2 = parseValue(arH2);

    const knownCount = [w1, h1, w2, h2].filter((v) => v !== null).length;
    clearComputedStyles();

    if (knownCount < 3) {
        updateResultText();
        updateAspectText();
        setStatus("Enter any 3 values to calculate the missing one.");
        return;
    }

    if (knownCount === 3) {
        if (!w1) computeFromTarget(arW1, w1, h1, w2, h2);
        else if (!h1) computeFromTarget(arH1, w1, h1, w2, h2);
        else if (!w2) computeFromTarget(arW2, w1, h1, w2, h2);
        else if (!h2) computeFromTarget(arH2, w1, h1, w2, h2);
    } else if (knownCount === 4) {
        const pairedTarget =
            changedInput === arW1 ? arH1 :
            changedInput === arH1 ? arW1 :
            changedInput === arW2 ? arH2 :
            changedInput === arH2 ? arW2 :
            null;

        // Keep user-entered fields stable by updating the prior computed field.
        if (previouslyComputed && previouslyComputed !== changedInput) {
            if (!computeFromTarget(previouslyComputed, w1, h1, w2, h2) && pairedTarget) {
                computeFromTarget(pairedTarget, w1, h1, w2, h2);
            }
        } else if (pairedTarget) {
            computeFromTarget(pairedTarget, w1, h1, w2, h2);
        }
    }

    updateResultText();
    updateAspectText();
    setStatus("Calculated missing value.", "success");
}

function applyCommonRatio(value) {
    const ratio = parseRatioValue(value);
    if (!ratio) return;
    const { w, h } = ratio;

    isInternalUpdate = true;
    arW1.value = String(w);
    arH1.value = String(h);
    arW2.value = "";
    arH2.value = "";
    arW1.classList.remove("is-computed");
    arH1.classList.remove("is-computed");
    arW2.classList.remove("is-computed");
    arH2.classList.remove("is-computed");
    isInternalUpdate = false;
    selectedPresetValue = value;
    const selectedPreset = PRESET_OPTIONS.find((item) => item.value === value);
    arPresetTrigger.textContent = selectedPreset ? selectedPreset.label : "Select a ratio preset";
    setSampleVisibility(true);
    updateResultText();
    updateAspectText();
    setStatus(`Ratio preset applied: ${w}:${h}`, "success");
    saveUserState();
}

function initPresetList() {
    if (!arPresetList || !arPresetTrigger) return;
    const frag = document.createDocumentFragment();
    PRESET_OPTIONS.forEach((opt) => {
        const item = document.createElement("div");
        item.className = "ar-preset-item";
        item.textContent = opt.label;
        item.dataset.value = opt.value;
        item.addEventListener("mouseenter", () => {
            const idx = getPresetIndexByElement(item);
            setPresetHoverIndex(idx, true);
        });
        item.addEventListener("click", () => {
            applyCommonRatio(opt.value);
            closePresetList();
        });
        frag.appendChild(item);
    });
    arPresetList.innerHTML = "";
    arPresetList.appendChild(frag);

    arPresetList.addEventListener("mousemove", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const item = target.closest(".ar-preset-item");
        if (!(item instanceof HTMLElement)) return;
        const idx = getPresetIndexByElement(item);
        if (idx < 0 || idx === presetHoverIndex) return;
        setPresetHoverIndex(idx, true);
    });

    arPresetList.addEventListener("mouseleave", restorePreviewFromInputs);
    arPresetTrigger.addEventListener("click", () => {
        if (arPresetList.hidden) openPresetList();
        else closePresetList();
    });
    arPresetTrigger.addEventListener("keydown", (event) => {
        const key = event.key.toLowerCase();
        if (key === "w" || event.key === "ArrowUp") {
            event.preventDefault();
            if (arPresetList.hidden) openPresetList();
            movePresetHover(-1);
            return;
        }
        if (key === "s" || event.key === "ArrowDown") {
            event.preventDefault();
            if (arPresetList.hidden) openPresetList();
            movePresetHover(1);
            return;
        }
        if (event.key === "Enter") {
            if (!arPresetList.hidden) {
                event.preventDefault();
                applyHoveredPreset();
            }
            return;
        }
        if (event.key === "Escape" && !arPresetList.hidden) {
            event.preventDefault();
            closePresetList();
            restorePreviewFromInputs();
        }
    });
    document.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Node)) return;
        const inside = arPresetList.contains(target) || arPresetTrigger.contains(target);
        if (!inside) {
            closePresetList();
            restorePreviewFromInputs();
        }
    });
}

function clampInputValue(input) {
    const min = Number(input.min || 1);
    const max = Number(input.max || Number.MAX_SAFE_INTEGER);
    const fallback = Number(input.defaultValue || min || 1);
    const raw = Number(input.value);
    const next = Number.isFinite(raw) ? raw : fallback;
    input.value = String(Math.max(min, Math.min(max, next)));
}

function stepInputValue(targetId, direction) {
    const input = document.getElementById(targetId);
    if (!(input instanceof HTMLInputElement)) return;
    const min = Number(input.min || 1);
    const max = Number(input.max || Number.MAX_SAFE_INTEGER);
    const step = Number(input.step || 1) || 1;
    const current = Number(input.value) || Number(input.defaultValue || min || 1);
    const delta = direction === "up" ? step : -step;
    const next = Math.max(min, Math.min(max, current + delta));

    isInternalUpdate = true;
    input.value = String(next);
    isInternalUpdate = false;
    calculateMissing(input);
}

function clearStepHold() {
    if (holdDelayTimer) {
        clearTimeout(holdDelayTimer);
        holdDelayTimer = null;
    }
    if (holdRepeatTimer) {
        clearInterval(holdRepeatTimer);
        holdRepeatTimer = null;
    }
}

function isTypingTarget(target) {
    if (!(target instanceof Element)) return false;
    const tag = target.tagName;
    return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable
    );
}

function handleValueShortcut(event) {
    if (event.altKey || event.metaKey || event.ctrlKey) return false;

    if (event.shiftKey) {
        if (event.code === "KeyW") {
            event.preventDefault();
            stepInputValue("arW1", "up");
            return true;
        }
        if (event.code === "KeyS") {
            event.preventDefault();
            stepInputValue("arW1", "down");
            return true;
        }
        if (event.code === "KeyE") {
            event.preventDefault();
            stepInputValue("arH1", "up");
            return true;
        }
        if (event.code === "KeyD") {
            event.preventDefault();
            stepInputValue("arH1", "down");
            return true;
        }
        return false;
    }

    if (event.code === "Numpad8") {
        event.preventDefault();
        stepInputValue("arW2", "up");
        return true;
    }
    if (event.code === "Numpad5") {
        event.preventDefault();
        stepInputValue("arW2", "down");
        return true;
    }
    if (event.code === "Numpad9") {
        event.preventDefault();
        stepInputValue("arH2", "up");
        return true;
    }
    if (event.code === "Numpad6") {
        event.preventDefault();
        stepInputValue("arH2", "down");
        return true;
    }
    return false;
}

function startStepHold(targetId, direction) {
    stepInputValue(targetId, direction);
    holdDelayTimer = setTimeout(() => {
        holdRepeatTimer = setInterval(() => {
            stepInputValue(targetId, direction);
        }, 70);
    }, 320);
}

arSwap.addEventListener("click", () => {
    isInternalUpdate = true;
    const leftW = arW1.value;
    const leftH = arH1.value;
    arW1.value = arW2.value;
    arH1.value = arH2.value;
    arW2.value = leftW;
    arH2.value = leftH;
    isInternalUpdate = false;
    clearComputedStyles();
    updateResultText();
    updateAspectText();
    setStatus("Sides swapped.", "success");
});

arReset.addEventListener("click", () => {
    isInternalUpdate = true;
    FIELDS.forEach((input) => {
        input.value = "";
        input.classList.remove("is-computed");
    });
    selectedPresetValue = "";
    arPresetTrigger.textContent = "Select a ratio preset";
    arRound.checked = true;
    arFitImage.checked = false;
    if (uploadedImageUrl) {
        URL.revokeObjectURL(uploadedImageUrl);
        uploadedImageUrl = "";
    }
    setPreviewImageSource(defaultSampleSrc, defaultSampleSrcset);
    if (arImageInput) arImageInput.value = "";
    isInternalUpdate = false;
    updateSampleFitMode();
    setSampleVisibility(false);
    updateResultText();
    updateAspectText();
    setStatus("Reset complete.");
    saveUserState();
});

arRound.addEventListener("change", () => {
    const computed = FIELDS.find((input) => input.classList.contains("is-computed"));
    if (computed) calculateMissing(computed);
    else updateResultText();
});

arShowSample.addEventListener("click", () => {
    setSampleVisibility(!isSampleVisible());
    updateAspectText();
});

arFitImage.addEventListener("change", updateSampleFitMode);
arFitImage.addEventListener("change", saveUserState);

FIELDS.forEach((input) => {
    input.addEventListener("input", () => {
        if (isInternalUpdate) return;
        calculateMissing(input);
        if (input === arW1 || input === arH1) saveUserState();
    });
    input.addEventListener("blur", () => {
        clampInputValue(input);
        calculateMissing(input);
        if (input === arW1 || input === arH1) saveUserState();
    });
});

document.querySelectorAll("[data-step-target][data-step-dir]").forEach((btn) => {
    btn.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        const targetId = btn.getAttribute("data-step-target");
        const direction = btn.getAttribute("data-step-dir");
        if (!targetId || !direction) return;
        clearStepHold();
        startStepHold(targetId, direction);
    });

    btn.addEventListener("pointerup", clearStepHold);
    btn.addEventListener("pointercancel", clearStepHold);
    btn.addEventListener("pointerleave", clearStepHold);

    btn.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        const targetId = btn.getAttribute("data-step-target");
        const direction = btn.getAttribute("data-step-dir");
        if (!targetId || !direction) return;
        stepInputValue(targetId, direction);
    });
});

document.addEventListener("pointerup", clearStepHold);
document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (event.ctrlKey && event.shiftKey && key === "f") {
        event.preventDefault();
        togglePreviewFullscreen();
        return;
    }
    if (isTypingTarget(event.target)) return;
    handleValueShortcut(event);
});
loadUserState();
setSampleVisibility(false);
updateSampleFitMode();
updateResultText();
updateAspectText();
window.addEventListener("resize", updateAspectText);
document.addEventListener("fullscreenchange", updateAspectText);
document.addEventListener("webkitfullscreenchange", updateAspectText);
initPresetList();
initImageUpload();
