const cjpgFile = document.getElementById("cjpgFile");
const cjpgDrop = document.getElementById("cjpgDrop");
const cjpgQuality = document.getElementById("cjpgQuality");
const cjpgQualityText = document.getElementById("cjpgQualityText");
const cjpgScale = document.getElementById("cjpgScale");
const cjpgScaleText = document.getElementById("cjpgScaleText");
const cjpgRunBtn = document.getElementById("cjpgRunBtn");
const cjpgDownloadBtn = document.getElementById("cjpgDownloadBtn");
const cjpgStatus = document.getElementById("cjpgStatus");
const cjpgMeta = document.getElementById("cjpgMeta");
let cjpgImage = null; let cjpgFileObj = null; let cjpgOutBlob = null;

function cjpgStatusSet(msg, mode = "loading") {
  cjpgStatus.textContent = msg;
  if (mode === "error") cjpgStatus.style.color = "#ef4444";
  else if (mode === "success") cjpgStatus.style.color = "#22c55e";
  else cjpgStatus.style.color = document.body.classList.contains("dark-mode") ? "#facc15" : "#b8860b";
}

cjpgQuality.addEventListener("input",()=>{cjpgQualityText.textContent=cjpgQuality.value;});
cjpgScale.addEventListener("input",()=>{cjpgScaleText.textContent=`${cjpgScale.value}%`;});

function setCjpgFile(file){
  if(!file || !file.type.startsWith("image/")){cjpgStatusSet("Please choose an image file.","error");return;}
  cjpgFileObj=file; cjpgOutBlob=null; cjpgDownloadBtn.classList.add("hidden");
  const r=new FileReader(); r.onload=()=>{const img=new Image(); img.onload=()=>{cjpgImage=img; cjpgMeta.textContent=`Original: ${img.width}x${img.height} | ${(file.size/1024).toFixed(1)} KB`; cjpgStatusSet(`Loaded: ${file.name}`);}; img.src=String(r.result||"");}; r.readAsDataURL(file);
}

cjpgDrop.addEventListener("click",()=>cjpgFile.click());
cjpgDrop.addEventListener("keydown",(e)=>{if(e.key==="Enter"){e.preventDefault();cjpgFile.click();}});
["dragenter","dragover"].forEach((n)=>cjpgDrop.addEventListener(n,(e)=>{e.preventDefault();cjpgDrop.classList.add("is-dragover");}));
["dragleave","dragend","drop"].forEach((n)=>cjpgDrop.addEventListener(n,(e)=>{e.preventDefault();cjpgDrop.classList.remove("is-dragover");}));
cjpgDrop.addEventListener("drop",(e)=>setCjpgFile(e.dataTransfer?.files?.[0]||null));
cjpgFile.addEventListener("change",()=>setCjpgFile(cjpgFile.files?.[0]||null));

cjpgRunBtn.addEventListener("click", async ()=>{
 if(!cjpgImage || !cjpgFileObj){cjpgStatusSet("Load image first.","error");return;}
 const s=(Number(cjpgScale.value)||100)/100;
 const q=Math.max(0.3,Math.min(0.95,(Number(cjpgQuality.value)||80)/100));
 const w=Math.max(1,Math.round(cjpgImage.width*s));
 const h=Math.max(1,Math.round(cjpgImage.height*s));
 const canvas=document.createElement("canvas"); canvas.width=w; canvas.height=h;
 const ctx=canvas.getContext("2d"); if(!ctx){cjpgStatusSet("Canvas not supported.","error");return;}
 ctx.drawImage(cjpgImage,0,0,w,h);
 const blob=await new Promise((resolve)=>canvas.toBlob(resolve,"image/jpeg",q));
 if(!blob){cjpgStatusSet("Failed to create output JPG.","error");return;}
 cjpgOutBlob=blob; cjpgDownloadBtn.classList.remove("hidden");
 const saved=((cjpgFileObj.size-blob.size)/cjpgFileObj.size)*100;
 cjpgMeta.textContent=`Output: ${w}x${h} | ${(blob.size/1024).toFixed(1)} KB | Saved: ${Math.max(0,saved).toFixed(1)}%`;
 cjpgStatusSet("JPG compression complete.","success");
});

cjpgDownloadBtn.addEventListener("click",()=>{
 if(!cjpgOutBlob) return;
 const a=document.createElement("a"); a.href=URL.createObjectURL(cjpgOutBlob); a.download="compressed.jpg";
 document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),5000);
});
