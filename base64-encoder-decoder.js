const input = document.getElementById("b64Input");
const output = document.getElementById("b64Output");
const statusEl = document.getElementById("b64Status");
const metaEl = document.getElementById("b64Meta");

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function setStatus(message, mode = "loading") {
    statusEl.textContent = message;
    if (mode === "error") statusEl.style.color = "#ef4444";
    else if (mode === "success") statusEl.style.color = "#22c55e";
    else statusEl.style.color = document.body.classList.contains("dark-mode") ? "#facc15" : "#b8860b";
}

function bytesToBase64(bytes) {
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        const part = bytes.subarray(i, i + chunk);
        binary += String.fromCharCode(...part);
    }
    return btoa(binary);
}

function base64ToBytes(base64) {
    const cleaned = base64.replace(/\s+/g, "");
    const binary = atob(cleaned);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function updateMeta() {
    const inSize = new Blob([input.value]).size;
    const outSize = new Blob([output.value]).size;
    metaEl.textContent = `Input: ${inSize.toLocaleString()} bytes | Output: ${outSize.toLocaleString()} bytes`;
}

document.getElementById("b64Encode").addEventListener("click", () => {
    try {
        const bytes = encoder.encode(input.value);
        output.value = bytesToBase64(bytes);
        updateMeta();
        setStatus("Encoded to Base64.", "success");
    } catch (err) {
        setStatus(String(err?.message || "Encode failed."), "error");
    }
});

document.getElementById("b64Decode").addEventListener("click", () => {
    try {
        const bytes = base64ToBytes(input.value);
        output.value = decoder.decode(bytes);
        updateMeta();
        setStatus("Decoded from Base64.", "success");
    } catch {
        setStatus("Invalid Base64 input.", "error");
    }
});

document.getElementById("b64Swap").addEventListener("click", () => {
    const tmp = input.value;
    input.value = output.value;
    output.value = tmp;
    updateMeta();
    setStatus("Input and output swapped.", "success");
});

document.getElementById("b64Copy").addEventListener("click", async () => {
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
        setStatus("Clipboard blocked, output selected.", "error");
    }
});
