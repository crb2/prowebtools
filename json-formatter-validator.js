const input = document.getElementById("jsonInput");
const output = document.getElementById("jsonOutput");
const statusEl = document.getElementById("jsonStatus");
const metaEl = document.getElementById("jsonMeta");

function setStatus(message, mode = "loading") {
    statusEl.textContent = message;
    if (mode === "error") statusEl.style.color = "#ef4444";
    else if (mode === "success") statusEl.style.color = "#22c55e";
    else statusEl.style.color = document.body.classList.contains("dark-mode") ? "#facc15" : "#b8860b";
}

function countKeys(value) {
    if (!value || typeof value !== "object") return 0;
    let count = 0;
    const walk = (obj) => {
        if (!obj || typeof obj !== "object") return;
        if (Array.isArray(obj)) {
            obj.forEach(walk);
            return;
        }
        Object.keys(obj).forEach((k) => {
            count += 1;
            walk(obj[k]);
        });
    };
    walk(value);
    return count;
}

function indexToLineCol(text, idx) {
    const safe = Math.max(0, Math.min(idx, text.length));
    const slice = text.slice(0, safe);
    const lines = slice.split("\n");
    return { line: lines.length, col: (lines[lines.length - 1] || "").length + 1 };
}

function parseJson() {
    const raw = input.value.trim();
    if (!raw) throw new Error("Please paste JSON input first.");
    return JSON.parse(raw);
}

function updateMeta(parsed, rawText) {
    const keys = countKeys(parsed);
    const size = new Blob([rawText]).size;
    metaEl.textContent = `Keys: ${keys} | Size: ${size.toLocaleString()} bytes`;
}

function safeErrorMessage(err, raw) {
    const text = String(err?.message || "Invalid JSON.");
    const match = text.match(/position\s(\d+)/i);
    if (!match) return text;
    const pos = Number(match[1]);
    const lc = indexToLineCol(raw, pos);
    return `${text} (line ${lc.line}, col ${lc.col})`;
}

document.getElementById("jsonBeautify").addEventListener("click", () => {
    const raw = input.value;
    try {
        const parsed = parseJson();
        const pretty = JSON.stringify(parsed, null, 2);
        output.value = pretty;
        updateMeta(parsed, pretty);
        setStatus("JSON beautified.", "success");
    } catch (err) {
        setStatus(safeErrorMessage(err, raw), "error");
    }
});

document.getElementById("jsonMinify").addEventListener("click", () => {
    const raw = input.value;
    try {
        const parsed = parseJson();
        const minified = JSON.stringify(parsed);
        output.value = minified;
        updateMeta(parsed, minified);
        setStatus("JSON minified.", "success");
    } catch (err) {
        setStatus(safeErrorMessage(err, raw), "error");
    }
});

document.getElementById("jsonValidate").addEventListener("click", () => {
    const raw = input.value;
    try {
        const parsed = parseJson();
        updateMeta(parsed, raw);
        setStatus("Valid JSON.", "success");
    } catch (err) {
        setStatus(safeErrorMessage(err, raw), "error");
    }
});

document.getElementById("jsonCopy").addEventListener("click", async () => {
    if (!output.value) {
        setStatus("No output to copy.", "error");
        return;
    }
    try {
        await navigator.clipboard.writeText(output.value);
        setStatus("Output copied.", "success");
    } catch {
        output.focus();
        output.select();
        setStatus("Clipboard blocked, output selected for manual copy.", "error");
    }
});

document.getElementById("jsonDownload").addEventListener("click", () => {
    const text = output.value || input.value;
    if (!text.trim()) {
        setStatus("Nothing to download.", "error");
        return;
    }
    const blob = new Blob([text], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "data.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    setStatus("JSON downloaded.", "success");
});

input.addEventListener("input", () => {
    if (!input.value.trim()) {
        output.value = "";
        metaEl.textContent = "Keys: -- | Size: --";
        setStatus("Paste JSON to start.");
    }
});
