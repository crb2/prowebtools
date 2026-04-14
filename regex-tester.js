const patternEl = document.getElementById("rtPattern");
const flagsEl = document.getElementById("rtFlags");
const inputEl = document.getElementById("rtInput");
const replaceEl = document.getElementById("rtReplace");
const outEl = document.getElementById("rtOutput");
const statusEl = document.getElementById("rtStatus");
const matchesEl = document.getElementById("rtMatches");

function setStatus(message, mode = "loading") {
    statusEl.textContent = message;
    if (mode === "error") statusEl.style.color = "#ef4444";
    else if (mode === "success") statusEl.style.color = "#22c55e";
    else statusEl.style.color = document.body.classList.contains("dark-mode") ? "#facc15" : "#b8860b";
}

function runRegex() {
    let regex;
    try {
        regex = new RegExp(patternEl.value, flagsEl.value);
    } catch (err) {
        setStatus(String(err?.message || "Invalid regex."), "error");
        matchesEl.textContent = "Regex compile error.";
        outEl.value = "";
        return;
    }

    const text = inputEl.value;
    if (!text) {
        setStatus("Enter test text.", "error");
        matchesEl.textContent = "No input text.";
        outEl.value = "";
        return;
    }

    const flags = regex.flags.includes("g") ? regex.flags : `${regex.flags}g`;
    const listRegex = new RegExp(regex.source, flags);
    const found = [];
    let m;
    while ((m = listRegex.exec(text)) !== null) {
        found.push({ value: m[0], index: m.index });
        if (m[0] === "") listRegex.lastIndex += 1;
        if (found.length >= 500) break;
    }

    const replRegex = new RegExp(regex.source, regex.flags);
    outEl.value = text.replace(replRegex, replaceEl.value || "");

    if (!found.length) {
        matchesEl.textContent = "No matches.";
        setStatus("No matches found.");
        return;
    }

    matchesEl.innerHTML = found.map((item, i) => `${i + 1}. [${item.index}] ${item.value.replace(/</g, "&lt;")}`).join("<br>");
    setStatus(`Found ${found.length} match(es).`, "success");
}

document.getElementById("rtRun").addEventListener("click", runRegex);
document.getElementById("rtCopy").addEventListener("click", async () => {
    if (!outEl.value) {
        setStatus("Nothing to copy.", "error");
        return;
    }
    try {
        await navigator.clipboard.writeText(outEl.value);
        setStatus("Replace preview copied.", "success");
    } catch {
        outEl.focus();
        outEl.select();
        setStatus("Clipboard blocked, output selected.", "error");
    }
});
