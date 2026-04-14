const cpngFile = document.getElementById("cpngFile");
const cpngDrop = document.getElementById("cpngDrop");
const cpngScale = document.getElementById("cpngScale");
const cpngScaleText = document.getElementById("cpngScaleText");
const cpngRunBtn = document.getElementById("cpngRunBtn");
const cpngDownloadBtn = document.getElementById("cpngDownloadBtn");
const cpngStatus = document.getElementById("cpngStatus");
const cpngMeta = document.getElementById("cpngMeta");
const cpngPreviewWrap = document.getElementById("cpngPreviewWrap");
const cpngPreview = document.getElementById("cpngPreview");
let cpngImage = null; let cpngFileObj = null; let cpngOutBlob = null;

function cpngStatusSet(msg, mode = "loading") {
  cpngStatus.textContent = msg;
  if (mode === "error") cpngStatus.style.color = "#ef4444";
  else if (mode === "success") cpngStatus.style.color = "#22c55e";
  else cpngStatus.style.color = document.body.classList.contains("dark-mode") ? "#facc15" : "#b8860b";
}

cpngScale.addEventListener("input",()=>{cpngScaleText.textContent=`${cpngScale.value}%`;});
function setCpngFile(file){
  if(!file || !file.type.startsWith("image/")){cpngStatusSet("Please choose an image file.","error");return;}
  cpngFileObj=file; cpngOutBlob=null; cpngDownloadBtn.classList.add("hidden");
  const r=new FileReader(); r.onload=()=>{const img=new Image(); img.onload=()=>{cpngImage=img; cpngMeta.textContent=`Original: ${img.width}x${img.height} | ${(file.size/1024).toFixed(1)} KB`; if(cpngPreview){cpngPreview.src=String(r.result||"");} if(cpngPreviewWrap){cpngPreviewWrap.classList.remove("hidden");} cpngStatusSet(`Loaded: ${file.name}`);}; img.src=String(r.result||"");}; r.readAsDataURL(file);
}

cpngDrop.addEventListener("click",()=>cpngFile.click());
cpngDrop.addEventListener("keydown",(e)=>{if(e.key==="Enter"){e.preventDefault();cpngFile.click();}});
["dragenter","dragover"].forEach((n)=>cpngDrop.addEventListener(n,(e)=>{e.preventDefault();cpngDrop.classList.add("is-dragover");}));
["dragleave","dragend","drop"].forEach((n)=>cpngDrop.addEventListener(n,(e)=>{e.preventDefault();cpngDrop.classList.remove("is-dragover");}));
cpngDrop.addEventListener("drop",(e)=>setCpngFile(e.dataTransfer?.files?.[0]||null));
cpngFile.addEventListener("change",()=>setCpngFile(cpngFile.files?.[0]||null));

cpngRunBtn.addEventListener("click", async ()=>{
 if(!cpngImage || !cpngFileObj){cpngStatusSet("Load image first.","error");return;}
 const s=(Number(cpngScale.value)||100)/100;
 const w=Math.max(1,Math.round(cpngImage.width*s));
 const h=Math.max(1,Math.round(cpngImage.height*s));
 const canvas=document.createElement("canvas"); canvas.width=w; canvas.height=h;
 const ctx=canvas.getContext("2d"); if(!ctx){cpngStatusSet("Canvas not supported.","error");return;}
 ctx.drawImage(cpngImage,0,0,w,h);
 const blob=await new Promise((resolve)=>canvas.toBlob(resolve,"image/png"));
 if(!blob){cpngStatusSet("Failed to create output PNG.","error");return;}
 cpngOutBlob=blob; cpngDownloadBtn.classList.remove("hidden");
 const saved=((cpngFileObj.size-blob.size)/cpngFileObj.size)*100;
 cpngMeta.textContent=`Output: ${w}x${h} | ${(blob.size/1024).toFixed(1)} KB | Saved: ${Math.max(0,saved).toFixed(1)}%`;
 if(cpngPreview){cpngPreview.src = URL.createObjectURL(blob);} if(cpngPreviewWrap){cpngPreviewWrap.classList.remove("hidden");}
 cpngStatusSet("PNG compression complete.","success");
});

cpngDownloadBtn.addEventListener("click",()=>{
 if(!cpngOutBlob) return;
 const a=document.createElement("a"); a.href=URL.createObjectURL(cpngOutBlob); a.download="compressed.png";
 document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),5000);
});
