const statusEl = document.getElementById("uuidStatus");
const outEl = document.getElementById("uuidOut");
const countEl = document.getElementById("uuidCount");
const validateEl = document.getElementById("uuidValidate");

function setStatus(message, mode = "loading") {
    statusEl.textContent = message;
    if (mode === "error") statusEl.style.color = "#ef4444";
    else if (mode === "success") statusEl.style.color = "#22c55e";
    else statusEl.style.color = document.body.classList.contains("dark-mode") ? "#facc15" : "#b8860b";
}

function fallbackUuid() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

function genUuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return fallbackUuid();
}

const v4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

document.getElementById("uuidGenerate").addEventListener("click", () => {
    const count = Math.max(1, Math.min(500, Number(countEl.value) || 1));
    const list = [];
    for (let i = 0; i < count; i += 1) list.push(genUuid());
    outEl.value = list.join("\n");
    setStatus(`Generated ${count} UUID v4 values.`, "success");
});

document.getElementById("uuidCopy").addEventListener("click", async () => {
    if (!outEl.value.trim()) {
        setStatus("Nothing to copy.", "error");
        return;
    }
    try {
        await navigator.clipboard.writeText(outEl.value);
        setStatus("UUID list copied.", "success");
    } catch {
        outEl.focus();
        outEl.select();
        setStatus("Clipboard blocked, output selected.", "error");
    }
});

document.getElementById("uuidDownload").addEventListener("click", () => {
    if (!outEl.value.trim()) {
        setStatus("Nothing to download.", "error");
        return;
    }
    const blob = new Blob([outEl.value], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "uuid-list.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    setStatus("UUID list downloaded.", "success");
});

document.getElementById("uuidCheck").addEventListener("click", () => {
    const value = validateEl.value.trim();
    if (!value) {
        setStatus("Paste a UUID to validate.", "error");
        return;
    }
    if (v4Regex.test(value)) setStatus("Valid UUID v4.", "success");
    else setStatus("Not a valid UUID v4.", "error");
});
