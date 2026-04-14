const mpdfFiles = document.getElementById("mpdfFiles");
const mpdfDrop = document.getElementById("mpdfDrop");
const mpdfList = document.getElementById("mpdfList");
const mpdfRunBtn = document.getElementById("mpdfRunBtn");
const mpdfDownloadBtn = document.getElementById("mpdfDownloadBtn");
const mpdfStatus = document.getElementById("mpdfStatus");
let mpdfSelected = [];
let mpdfOut = null;

function mpdfSetStatus(msg, mode = "loading") {
  mpdfStatus.textContent = msg;
  if (mode === "error") mpdfStatus.style.color = "#ef4444";
  else if (mode === "success") mpdfStatus.style.color = "#22c55e";
  else mpdfStatus.style.color = document.body.classList.contains("dark-mode") ? "#facc15" : "#b8860b";
}

function setMpdfFiles(list){
  const files = Array.from(list || []).filter((f)=>/\.pdf$/i.test(f.name));
  if(!files.length){ mpdfSetStatus("Please select PDF files.","error"); return; }
  mpdfSelected = files; mpdfOut = null; mpdfDownloadBtn.classList.add("hidden");
  mpdfList.innerHTML = "";
  files.forEach((f)=>{ const li=document.createElement("li"); li.textContent=f.name; mpdfList.appendChild(li); });
  mpdfSetStatus(`Loaded ${files.length} PDF file(s).`);
}

mpdfDrop.addEventListener("click",()=>mpdfFiles.click());
mpdfDrop.addEventListener("keydown",(e)=>{ if(e.key==="Enter"){e.preventDefault();mpdfFiles.click();}});
["dragenter","dragover"].forEach((n)=>mpdfDrop.addEventListener(n,(e)=>{e.preventDefault(); mpdfDrop.classList.add("is-dragover");}));
["dragleave","dragend","drop"].forEach((n)=>mpdfDrop.addEventListener(n,(e)=>{e.preventDefault(); mpdfDrop.classList.remove("is-dragover");}));
mpdfDrop.addEventListener("drop",(e)=>setMpdfFiles(e.dataTransfer?.files||[]));
mpdfFiles.addEventListener("change",()=>setMpdfFiles(mpdfFiles.files||[]));

mpdfRunBtn.addEventListener("click", async ()=>{
  if(mpdfSelected.length<2){ mpdfSetStatus("Select at least two PDFs.","error"); return; }
  if(!window.PDFLib){ mpdfSetStatus("PDF engine failed to load.","error"); return; }
  mpdfRunBtn.disabled=true; mpdfDownloadBtn.classList.add("hidden");
  try{
    const { PDFDocument } = window.PDFLib;
    const outDoc = await PDFDocument.create();
    for(const file of mpdfSelected){
      const bytes = new Uint8Array(await file.arrayBuffer());
      const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = await outDoc.copyPages(src, src.getPageIndices());
      pages.forEach((p)=>outDoc.addPage(p));
    }
    const outBytes = await outDoc.save({ useObjectStreams: true, addDefaultPage: false });
    mpdfOut = new Blob([outBytes], { type: "application/pdf" });
    mpdfDownloadBtn.classList.remove("hidden");
    mpdfSetStatus("PDF merge complete.","success");
  }catch(err){ mpdfSetStatus(`Failed: ${err.message || "Unknown error"}`,"error"); }
  finally{ mpdfRunBtn.disabled=false; }
});

mpdfDownloadBtn.addEventListener("click",()=>{
  if(!mpdfOut) return;
  const a=document.createElement("a"); a.href=URL.createObjectURL(mpdfOut); a.download="merged.pdf";
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),5000);
});
