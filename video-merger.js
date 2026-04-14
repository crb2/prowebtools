const mergeFiles = document.getElementById("mergeFiles");
const mergeDrop = document.getElementById("mergeDrop");
const mergeList = document.getElementById("mergeList");
const mergeRunBtn = document.getElementById("mergeRunBtn");
const mergeDownloadBtn = document.getElementById("mergeDownloadBtn");
const mergeStatus = document.getElementById("mergeStatus");

let mergeSelectedFiles = [];
let mergeOutputBlob = null;

function mergeSetStatus(message, mode = "loading") {
    mergeStatus.textContent = message;
    if (mode === "error") mergeStatus.style.color = "#ef4444";
    else if (mode === "success") mergeStatus.style.color = "#22c55e";
    else mergeStatus.style.color = document.body.classList.contains("dark-mode") ? "#facc15" : "#b8860b";
}

function renderMergeList() {
    mergeList.innerHTML = "";
    mergeSelectedFiles.forEach((f) => {
        const li = document.createElement("li");
        li.textContent = f.name;
        mergeList.appendChild(li);
    });
}

function setMergeFiles(list) {
    const files = Array.from(list || []).filter((f) => f.type.startsWith("video/"));
    if (!files.length) {
        mergeSetStatus("Please choose valid video files.", "error");
        return;
    }
    mergeSelectedFiles = files;
    mergeOutputBlob = null;
    mergeDownloadBtn.classList.add("hidden");
    renderMergeList();
    mergeSetStatus(`Loaded ${files.length} video(s).`);
}

mergeDrop.addEventListener("click", () => mergeFiles.click());
mergeDrop.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); mergeFiles.click(); } });
["dragenter", "dragover"].forEach((n) => mergeDrop.addEventListener(n, (e) => { e.preventDefault(); mergeDrop.classList.add("is-dragover"); }));
["dragleave", "dragend", "drop"].forEach((n) => mergeDrop.addEventListener(n, (e) => { e.preventDefault(); mergeDrop.classList.remove("is-dragover"); }));
mergeDrop.addEventListener("drop", (e) => setMergeFiles(e.dataTransfer?.files || []));
mergeFiles.addEventListener("change", () => setMergeFiles(mergeFiles.files || []));

mergeRunBtn.addEventListener("click", async () => {
    if (mergeSelectedFiles.length < 2) {
        mergeSetStatus("Select at least two videos.", "error");
        return;
    }

    mergeRunBtn.disabled = true;
    mergeDownloadBtn.classList.add("hidden");

    try {
        const ffmpeg = await window.MediaFfmpeg.ensureLoaded((p) => mergeSetStatus(`Processing... ${p}%`));
        const listName = `concat_${Date.now()}.txt`;
        const outName = `merged_${Date.now()}.mp4`;
        const fsNames = [];

        for (let i = 0; i < mergeSelectedFiles.length; i += 1) {
            const file = mergeSelectedFiles[i];
            const ext = window.MediaFfmpeg.extFromName(file.name, "mp4");
            const fsName = `part_${i}_${Date.now()}.${ext}`;
            fsNames.push(fsName);
            await window.MediaFfmpeg.writeFile(ffmpeg, fsName, file);
        }

        const concatText = fsNames.map((n) => `file '${n}'`).join("\n");
        await ffmpeg.writeFile(listName, new TextEncoder().encode(concatText));

        try {
            await ffmpeg.exec(["-y", "-f", "concat", "-safe", "0", "-i", listName, "-c", "copy", outName]);
        } catch {
            await ffmpeg.exec([
                "-y", "-f", "concat", "-safe", "0", "-i", listName,
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
                "-c:a", "aac", "-movflags", "+faststart",
                outName
            ]);
        }

        const bytes = await window.MediaFfmpeg.readFile(ffmpeg, outName);
        mergeOutputBlob = new Blob([bytes.buffer], { type: "video/mp4" });
        mergeDownloadBtn.classList.remove("hidden");
        mergeSetStatus("Merge complete.", "success");
    } catch (err) {
        mergeSetStatus(`Failed: ${err.message || "Unknown error"}`, "error");
    } finally {
        mergeRunBtn.disabled = false;
    }
});

mergeDownloadBtn.addEventListener("click", () => {
    if (!mergeOutputBlob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(mergeOutputBlob);
    a.download = "merged_video.mp4";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
});
