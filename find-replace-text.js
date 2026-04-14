const frInput = document.getElementById("frInput");
const frFind = document.getElementById("frFind");
const frReplace = document.getElementById("frReplace");
const frCase = document.getElementById("frCase");
const frRegex = document.getElementById("frRegex");
const frRunBtn = document.getElementById("frRunBtn");
const frCopyBtn = document.getElementById("frCopyBtn");
const frStatus = document.getElementById("frStatus");
const frOutput = document.getElementById("frOutput");

function frSetStatus(msg, mode = "loading") {
  frStatus.textContent = msg;
  if (mode === "error") frStatus.style.color = "#ef4444";
  else if (mode === "success") frStatus.style.color = "#22c55e";
  else frStatus.style.color = document.body.classList.contains("dark-mode") ? "#facc15" : "#b8860b";
}

frRunBtn.addEventListener("click", () => {
  const input = frInput.value || "";
  const find = frFind.value;
  const replaceWith = frReplace.value || "";
  if (!find) { frSetStatus("Enter text to find.", "error"); return; }

  try {
    let result = input;
    let count = 0;

    if (frRegex.checked) {
      const flags = frCase.checked ? "g" : "gi";
      const re = new RegExp(find, flags);
      result = input.replace(re, () => { count += 1; return replaceWith; });
    } else {
      if (frCase.checked) {
        count = input.split(find).length - 1;
        result = input.split(find).join(replaceWith);
      } else {
        const esc = find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(esc, "gi");
        result = input.replace(re, () => { count += 1; return replaceWith; });
      }
    }

    frOutput.value = result;
    frSetStatus(`Replaced ${count} occurrence(s).`, "success");
  } catch (err) {
    frSetStatus(`Invalid pattern: ${err.message || "Unknown error"}`, "error");
  }
});

frCopyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(frOutput.value || "");
    frSetStatus("Result copied to clipboard.", "success");
  } catch {
    frSetStatus("Copy failed. Browser blocked clipboard access.", "error");
  }
});
