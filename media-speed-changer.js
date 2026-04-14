const mscFile = document.getElementById("mscFile");
const mscDrop = document.getElementById("mscDrop");
const mscSpeed = document.getElementById("mscSpeed");
const mscType = document.getElementById("mscType");
const mscRunBtn = document.getElementById("mscRunBtn");
const mscDownloadBtn = document.getElementById("mscDownloadBtn");
const mscStatus = document.getElementById("mscStatus");
let mscSelectedFile = null;
let mscOutBlob = null;
let mscOutExt = "mp4";

function mscStatusSet(msg, mode = "loading") {
  mscStatus.textContent = msg;
  if (mode === "error") mscStatus.style.color = "#ef4444";
  else if (mode === "success") mscStatus.style.color = "#22c55e";
  else mscStatus.style.color = document.body.classList.contains("dark-mode") ? "#facc15" : "#b8860b";
}

function atempoChain(speed) {
  let remaining = Number(speed);
  const parts = [];
  while (remaining > 2) { parts.push("atempo=2.0"); remaining /= 2; }
  while (remaining < 0.5) { parts.push("atempo=0.5"); remaining /= 0.5; }
  parts.push(`atempo=${remaining.toFixed(3)}`);
  return parts.join(",");
}

function setMscFile(file) {
  if (!file || !(file.type.startsWith("audio/") || file.type.startsWith("video/"))) { mscStatusSet("Please select audio/video file.", "error"); return; }
  mscSelectedFile = file; mscOutBlob = null; mscDownloadBtn.classList.add("hidden");
  const isAudio = file.type.startsWith("audio/");
  mscType.textContent = isAudio ? "Detected audio input (export MP3)." : "Detected video input (export MP4).";
  mscStatusSet(`Loaded: ${file.name}`);
}

mscDrop.addEventListener("click", () => mscFile.click());
mscDrop.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); mscFile.click(); } });
["dragenter","dragover"].forEach((n)=>mscDrop.addEventListener(n,(e)=>{e.preventDefault();mscDrop.classList.add("is-dragover");}));
["dragleave","dragend","drop"].forEach((n)=>mscDrop.addEventListener(n,(e)=>{e.preventDefault();mscDrop.classList.remove("is-dragover");}));
mscDrop.addEventListener("drop",(e)=>setMscFile(e.dataTransfer?.files?.[0]||null));
mscFile.addEventListener("change",()=>setMscFile(mscFile.files?.[0]||null));

mscRunBtn.addEventListener("click", async () => {
  if (!mscSelectedFile) { mscStatusSet("Load media first.", "error"); return; }
  mscRunBtn.disabled = true; mscDownloadBtn.classList.add("hidden");
  try {
    const speed = Math.max(0.5, Math.min(2, Number(mscSpeed.value) || 1));
    const ffmpeg = await window.MediaFfmpeg.ensureLoaded((p) => mscStatusSet(`Processing... ${p}%`));
    const ext = window.MediaFfmpeg.extFromName(mscSelectedFile.name, "dat");
    const inName = `in_${Date.now()}.${ext}`;
    const isAudio = mscSelectedFile.type.startsWith("audio/");
    mscOutExt = isAudio ? "mp3" : "mp4";
    const outName = `speed_${Date.now()}.${mscOutExt}`;

    await window.MediaFfmpeg.writeFile(ffmpeg, inName, mscSelectedFile);

    if (isAudio) {
      await ffmpeg.exec(["-y","-i",inName,"-filter:a",atempoChain(speed),"-vn","-c:a","libmp3lame","-q:a","2",outName]);
    } else {
      const vFilter = `setpts=${(1/speed).toFixed(6)}*PTS`;
      await ffmpeg.exec([
        "-y","-i",inName,
        "-filter:v",vFilter,
        "-filter:a",atempoChain(speed),
        "-c:v","libx264","-preset","veryfast","-crf","23",
        "-c:a","aac","-movflags","+faststart",
        outName
      ]);
    }

    const bytes = await window.MediaFfmpeg.readFile(ffmpeg, outName);
    mscOutBlob = new Blob([bytes.buffer], { type: isAudio ? "audio/mpeg" : "video/mp4" });
    mscDownloadBtn.classList.remove("hidden");
    mscStatusSet("Speed change complete.", "success");
  } catch (err) {
    mscStatusSet(`Failed: ${err.message || "Unknown error"}`, "error");
  } finally { mscRunBtn.disabled = false; }
});

mscDownloadBtn.addEventListener("click", () => {
  if (!mscOutBlob || !mscSelectedFile) return;
  const base = window.MediaFfmpeg.baseFromName(mscSelectedFile.name, "media");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(mscOutBlob); a.download = `${base}_${mscSpeed.value}x.${mscOutExt}`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
});
