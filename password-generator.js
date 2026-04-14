const lengthEl = document.getElementById("pgLength");
const lengthValEl = document.getElementById("pgLengthVal");
const countEl = document.getElementById("pgCount");
const lowerEl = document.getElementById("pgLower");
const upperEl = document.getElementById("pgUpper");
const numEl = document.getElementById("pgNum");
const symEl = document.getElementById("pgSym");
const noAmbEl = document.getElementById("pgNoAmb");
const outEl = document.getElementById("pgOut");
const statusEl = document.getElementById("pgStatus");
const metaEl = document.getElementById("pgMeta");
const meterEl = document.getElementById("pgMeter");
const STORAGE_KEYS = {
    length: "pg_length",
    count: "pg_count"
};

const SETS = {
    lower: "abcdefghijklmnopqrstuvwxyz",
    upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    num: "0123456789",
    sym: "!@#$%^&*()-_=+[]{};:,.?/|~"
};

function setStatus(message, mode = "loading") {
    statusEl.textContent = message;
    if (mode === "error") statusEl.style.color = "#ef4444";
    else if (mode === "success") statusEl.style.color = "#22c55e";
    else statusEl.style.color = document.body.classList.contains("dark-mode") ? "#facc15" : "#b8860b";
}

function getCharset() {
    let chars = "";
    if (lowerEl.checked) chars += SETS.lower;
    if (upperEl.checked) chars += SETS.upper;
    if (numEl.checked) chars += SETS.num;
    if (symEl.checked) chars += SETS.sym;

    if (noAmbEl.checked) {
        chars = chars.replace(/[0O1lI]/g, "");
    }

    return chars;
}

function randInt(max) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] % max;
}

function generateOne(len, chars) {
    let out = "";
    for (let i = 0; i < len; i += 1) {
        out += chars[randInt(chars.length)];
    }
    return out;
}

function strengthFromEntropy(bits) {
    if (bits < 45) return { label: "Weak", pct: 25, color: "#ef4444" };
    if (bits < 65) return { label: "Medium", pct: 50, color: "#f59e0b" };
    if (bits < 85) return { label: "Strong", pct: 75, color: "#22c55e" };
    return { label: "Very Strong", pct: 100, color: "#16a34a" };
}

function getStoredNumber(key, min, max, fallback) {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const value = Number(raw);
    if (!Number.isFinite(value)) return fallback;
    return Math.max(min, Math.min(max, value));
}

function saveNumericSetting(key, input) {
    if (!(input instanceof HTMLInputElement)) return;
    localStorage.setItem(key, String(input.value));
}

function clampInputValue(input) {
    const min = Number(input.min || 0);
    const max = Number(input.max || Number.MAX_SAFE_INTEGER);
    const fallback = Number(input.defaultValue || min || 0);
    const raw = Number(input.value);
    const next = Number.isFinite(raw) ? raw : fallback;
    input.value = String(Math.max(min, Math.min(max, next)));
    if (input === lengthEl && lengthValEl) {
        lengthValEl.textContent = input.value;
    }
}

function stepInputValue(targetId, direction) {
    const input = document.getElementById(targetId);
    if (!(input instanceof HTMLInputElement)) return;
    const min = Number(input.min || 0);
    const max = Number(input.max || Number.MAX_SAFE_INTEGER);
    const step = Number(input.step || 1) || 1;
    const current = Number(input.value) || Number(input.defaultValue || min || 0);
    const delta = direction === "up" ? step : -step;
    const next = Math.max(min, Math.min(max, current + delta));
    input.value = String(next);
    if (input === lengthEl && lengthValEl) {
        lengthValEl.textContent = input.value;
        saveNumericSetting(STORAGE_KEYS.length, input);
    }
    if (input === countEl) {
        saveNumericSetting(STORAGE_KEYS.count, input);
    }
    if (hasGenerated && (input === lengthEl || input === countEl)) {
        setStatus("Settings changed. Generate again to update passwords.", "loading");
    }
}

let holdDelayTimer = null;
let holdRepeatTimer = null;
let hasGenerated = false;

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

function startStepHold(targetId, direction) {
    stepInputValue(targetId, direction);
    holdDelayTimer = setTimeout(() => {
        holdRepeatTimer = setInterval(() => {
            stepInputValue(targetId, direction);
        }, 70);
    }, 320);
}

document.getElementById("pgGenerate").addEventListener("click", () => {
    const chars = getCharset();
    const len = Math.max(4, Math.min(128, Number(lengthEl.value) || 20));
    const count = Math.max(1, Math.min(50, Number(countEl.value) || 1));

    if (!chars.length) {
        setStatus("Select at least one character set.", "error");
        return;
    }

    const lines = [];
    for (let i = 0; i < count; i += 1) {
        lines.push(generateOne(len, chars));
    }

    outEl.value = lines.join("\n");
    const entropy = len * Math.log2(chars.length);
    const s = strengthFromEntropy(entropy);
    meterEl.style.width = `${s.pct}%`;
    meterEl.style.background = s.color;
    metaEl.textContent = `Strength: ${s.label} | Entropy: ${entropy.toFixed(1)} bits | Charset: ${chars.length}`;
    hasGenerated = true;
    setStatus("Passwords generated.", "success");
});

document.getElementById("pgCopy").addEventListener("click", async () => {
    if (!outEl.value.trim()) {
        setStatus("Generate passwords first.", "error");
        return;
    }
    try {
        await navigator.clipboard.writeText(outEl.value);
        setStatus("Copied all passwords.", "success");
    } catch {
        outEl.focus();
        outEl.select();
        setStatus("Clipboard blocked, output selected.", "error");
    }
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

[lengthEl, countEl].forEach((input) => {
    input.addEventListener("blur", () => {
        clampInputValue(input);
        if (input === lengthEl) saveNumericSetting(STORAGE_KEYS.length, input);
        if (input === countEl) saveNumericSetting(STORAGE_KEYS.count, input);
    });
});

if (lengthEl && lengthValEl) {
    const restoredLen = getStoredNumber(STORAGE_KEYS.length, 4, 128, Number(lengthEl.value) || 20);
    lengthEl.value = String(restoredLen);
    lengthValEl.textContent = lengthEl.value;
    lengthEl.addEventListener("input", () => {
        lengthValEl.textContent = lengthEl.value;
        saveNumericSetting(STORAGE_KEYS.length, lengthEl);
        if (hasGenerated) {
            setStatus("Settings changed. Generate again to update passwords.", "loading");
        }
    });
    lengthEl.addEventListener("change", () => saveNumericSetting(STORAGE_KEYS.length, lengthEl));
}

if (countEl) {
    const restoredCount = getStoredNumber(STORAGE_KEYS.count, 1, 50, Number(countEl.value) || 1);
    countEl.value = String(restoredCount);
    countEl.addEventListener("input", () => {
        saveNumericSetting(STORAGE_KEYS.count, countEl);
        if (hasGenerated) {
            setStatus("Settings changed. Generate again to update passwords.", "loading");
        }
    });
    countEl.addEventListener("change", () => {
        saveNumericSetting(STORAGE_KEYS.count, countEl);
        if (hasGenerated) {
            setStatus("Settings changed. Generate again to update passwords.", "loading");
        }
    });
}

function warnIfSettingsChanged() {
    if (!hasGenerated) return;
    setStatus("Settings changed. Generate again to update passwords.", "loading");
}

[lowerEl, upperEl, numEl, symEl, noAmbEl].forEach((el) => {
    el.addEventListener("change", warnIfSettingsChanged);
});
