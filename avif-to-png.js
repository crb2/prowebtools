const a2pFile = document.getElementById("a2pFile");
const a2pDrop = document.getElementById("a2pDrop");
const a2pRunBtn = document.getElementById("a2pRunBtn");
const a2pDownloadBtn = document.getElementById("a2pDownloadBtn");
const a2pMeta = document.getElementById("a2pMeta");
const a2pStatus = document.getElementById("a2pStatus");
let a2pImg = null;
let a2pOut = null;

function a2pSetStatus(msg, mode = "loading") {
  a2pStatus.textContent = msg;
  if (mode === "error") a2pStatus.style.color = "#ef4444";
  else if (mode === "success") a2pStatus.style.color = "#22c55e";
  else a2pStatus.style.color = document.body.classList.contains("dark-mode") ? "#facc15" : "#b8860b";
}

function setA2pFile(file){
  if(!file || !file.type.startsWith("image/")){ a2pSetStatus("Please select image file.","error"); return; }
  const url=URL.createObjectURL(file);
  const img=new Image();
  img.onload=()=>{ a2pImg=img; a2pOut=null; a2pDownloadBtn.classList.add("hidden"); a2pMeta.textContent=`Loaded: ${img.width}x${img.height}`; a2pSetStatus(`Ready: ${file.name}`); URL.revokeObjectURL(url); };
  img.onerror=()=>{ a2pSetStatus("This browser cannot decode this AVIF/image file.","error"); URL.revokeObjectURL(url); };
  img.src=url;
}

a2pDrop.addEventListener("click",()=>a2pFile.click());
a2pDrop.addEventListener("keydown",(e)=>{if(e.key==="Enter"){e.preventDefault();a2pFile.click();}});
["dragenter","dragover"].forEach((n)=>a2pDrop.addEventListener(n,(e)=>{e.preventDefault();a2pDrop.classList.add("is-dragover");}));
["dragleave","dragend","drop"].forEach((n)=>a2pDrop.addEventListener(n,(e)=>{e.preventDefault();a2pDrop.classList.remove("is-dragover");}));
a2pDrop.addEventListener("drop",(e)=>setA2pFile(e.dataTransfer?.files?.[0]||null));
a2pFile.addEventListener("change",()=>setA2pFile(a2pFile.files?.[0]||null));

a2pRunBtn.addEventListener("click", async ()=>{
  if(!a2pImg){ a2pSetStatus("Load AVIF image first.","error"); return; }
  const canvas=document.createElement("canvas"); canvas.width=a2pImg.width; canvas.height=a2pImg.height;
  const ctx=canvas.getContext("2d"); if(!ctx){ a2pSetStatus("Canvas not supported.","error"); return; }
  ctx.drawImage(a2pImg,0,0);
  const blob=await new Promise((resolve)=>canvas.toBlob(resolve,"image/png"));
  if(!blob){ a2pSetStatus("Conversion failed.","error"); return; }
  a2pOut=blob; a2pDownloadBtn.classList.remove("hidden"); a2pMeta.textContent=`PNG size: ${(blob.size/1024).toFixed(1)} KB`; a2pSetStatus("Conversion complete.","success");
});

a2pDownloadBtn.addEventListener("click",()=>{
  if(!a2pOut) return;
  const a=document.createElement("a"); a.href=URL.createObjectURL(a2pOut); a.download="converted.png";
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),5000);
});
