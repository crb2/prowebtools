const c2File = document.getElementById("c2File");
const c2Drop = document.getElementById("c2Drop");
const c2Format = document.getElementById("c2Format");
const c2RunBtn = document.getElementById("c2RunBtn");
const c2DownloadBtn = document.getElementById("c2DownloadBtn");
const c2Meta = document.getElementById("c2Meta");
const c2Status = document.getElementById("c2Status");
let c2Img = null;
let c2FileObj = null;
let c2Out = null;

function c2SetStatus(msg, mode = "loading") {
  c2Status.textContent = msg;
  if (mode === "error") c2Status.style.color = "#ef4444";
  else if (mode === "success") c2Status.style.color = "#22c55e";
  else c2Status.style.color = document.body.classList.contains("dark-mode") ? "#facc15" : "#b8860b";
}

function setC2File(file){
  if(!file || !file.type.startsWith("image/")){ c2SetStatus("Please select image file.","error"); return; }
  c2FileObj=file; c2Out=null; c2DownloadBtn.classList.add("hidden");
  const r=new FileReader(); r.onload=()=>{ const img=new Image(); img.onload=()=>{ c2Img=img; c2Meta.textContent=`Original: ${(file.size/1024/1024).toFixed(2)} MB`; c2SetStatus(`Loaded: ${file.name}`); }; img.src=String(r.result||""); }; r.readAsDataURL(file);
}

c2Drop.addEventListener("click",()=>c2File.click());
c2Drop.addEventListener("keydown",(e)=>{if(e.key==="Enter"){e.preventDefault();c2File.click();}});
["dragenter","dragover"].forEach((n)=>c2Drop.addEventListener(n,(e)=>{e.preventDefault();c2Drop.classList.add("is-dragover");}));
["dragleave","dragend","drop"].forEach((n)=>c2Drop.addEventListener(n,(e)=>{e.preventDefault();c2Drop.classList.remove("is-dragover");}));
c2Drop.addEventListener("drop",(e)=>setC2File(e.dataTransfer?.files?.[0]||null));
c2File.addEventListener("change",()=>setC2File(c2File.files?.[0]||null));

async function renderAt(scale, quality){
  const w=Math.max(1,Math.round(c2Img.width*scale));
  const h=Math.max(1,Math.round(c2Img.height*scale));
  const canvas=document.createElement("canvas"); canvas.width=w; canvas.height=h;
  const ctx=canvas.getContext("2d"); if(!ctx) return null;
  ctx.drawImage(c2Img,0,0,w,h);
  const mime=c2Format.value || "image/jpeg";
  const q=mime==="image/png" ? undefined : quality;
  return await new Promise((resolve)=>canvas.toBlob(resolve,mime,q));
}

c2RunBtn.addEventListener("click", async ()=>{
  if(!c2Img || !c2FileObj){ c2SetStatus("Load image first.","error"); return; }
  c2RunBtn.disabled=true; c2DownloadBtn.classList.add("hidden"); c2SetStatus("Compressing...");
  try{
    const target=2*1024*1024;
    let best=null;
    for(let scale=1; scale>=0.35; scale-=0.08){
      for(let q=0.92; q>=0.45; q-=0.07){
        const blob=await renderAt(scale,q);
        if(!blob) continue;
        if(!best || blob.size<best.size){ best=blob; }
        if(blob.size<=target){ best=blob; scale=0; break; }
      }
    }
    if(!best){ c2SetStatus("Could not compress image.","error"); return; }
    c2Out=best; c2DownloadBtn.classList.remove("hidden");
    const mb=(best.size/1024/1024).toFixed(2);
    c2Meta.textContent=`Output: ${mb} MB${best.size<=target ? " (within 2MB)" : " (best effort)"}`;
    c2SetStatus("Compression complete.","success");
  }catch(err){ c2SetStatus(`Failed: ${err.message || "Unknown error"}`,"error"); }
  finally{ c2RunBtn.disabled=false; }
});

c2DownloadBtn.addEventListener("click",()=>{
  if(!c2Out) return;
  const ext=c2Format.value==="image/png"?"png":(c2Format.value==="image/webp"?"webp":"jpg");
  const a=document.createElement("a"); a.href=URL.createObjectURL(c2Out); a.download=`image_under_2mb.${ext}`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),5000);
});
