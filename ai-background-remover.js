const abrFile = document.getElementById("abrFile");
const abrDrop = document.getElementById("abrDrop");
const abrThreshold = document.getElementById("abrThreshold");
const abrFeather = document.getElementById("abrFeather");
const abrThresholdText = document.getElementById("abrThresholdText");
const abrFeatherText = document.getElementById("abrFeatherText");
const abrRunBtn = document.getElementById("abrRunBtn");
const abrDownloadBtn = document.getElementById("abrDownloadBtn");
const abrStatus = document.getElementById("abrStatus");
const abrMeta = document.getElementById("abrMeta");
const abrPreviewWrap = document.getElementById("abrPreviewWrap");
const abrCanvas = document.getElementById("abrCanvas");

let sourceImage = null;
let outputBlob = null;

function setStatus(message, mode = "loading") {
    abrStatus.textContent = message;
    if (mode === "error") abrStatus.style.color = "#ef4444";
    else if (mode === "success") abrStatus.style.color = "#22c55e";
    else abrStatus.style.color = document.body.classList.contains("dark-mode") ? "#facc15" : "#b8860b";
}

function distRGB(r1, g1, b1, r2, g2, b2) {
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return Math.sqrt((dr * dr) + (dg * dg) + (db * db));
}

function averageBorderColor(imageData, width, height) {
    const data = imageData.data;
    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    let count = 0;
    const border = Math.max(1, Math.floor(Math.min(width, height) * 0.03));

    function addPixel(x, y) {
        const i = ((y * width) + x) * 4;
        const a = data[i + 3];
        if (a < 5) return;
        sumR += data[i];
        sumG += data[i + 1];
        sumB += data[i + 2];
        count += 1;
    }

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const isBorder = x < border || y < border || x >= width - border || y >= height - border;
            if (isBorder) addPixel(x, y);
        }
    }

    if (!count) return { r: 255, g: 255, b: 255 };
    return {
        r: Math.round(sumR / count),
        g: Math.round(sumG / count),
        b: Math.round(sumB / count)
    };
}

function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
}

function processImage() {
    if (!sourceImage) {
        setStatus("Load an image first.", "error");
        return;
    }

    const width = sourceImage.naturalWidth;
    const height = sourceImage.naturalHeight;
    const temp = document.createElement("canvas");
    temp.width = width;
    temp.height = height;
    const tctx = temp.getContext("2d", { willReadFrequently: true });
    if (!tctx) {
        setStatus("Canvas is not supported in this browser.", "error");
        return;
    }

    tctx.drawImage(sourceImage, 0, 0, width, height);
    const imageData = tctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const bg = averageBorderColor(imageData, width, height);

    const threshold = Number(abrThreshold.value) || 0;
    const feather = Number(abrFeather.value) || 0;
    const edgeStart = Math.max(0, threshold - feather);
    const edgeEnd = Math.min(441, threshold + feather + 1);

    for (let i = 0; i < data.length; i += 4) {
        const distance = distRGB(data[i], data[i + 1], data[i + 2], bg.r, bg.g, bg.b);

        let alpha;
        if (distance <= edgeStart) {
            alpha = 0;
        } else if (distance >= edgeEnd) {
            alpha = 255;
        } else {
            const ratio = (distance - edgeStart) / Math.max(1, edgeEnd - edgeStart);
            alpha = Math.round(clamp(ratio, 0, 1) * 255);
        }

        data[i + 3] = alpha;
    }

    abrCanvas.width = width;
    abrCanvas.height = height;
    const ctx = abrCanvas.getContext("2d");
    if (!ctx) {
        setStatus("Canvas is not supported in this browser.", "error");
        return;
    }

    ctx.clearRect(0, 0, width, height);
    ctx.putImageData(imageData, 0, 0);

    abrPreviewWrap.classList.remove("hidden");
    abrMeta.textContent = `Image: ${width}x${height} | Estimated BG RGB(${bg.r}, ${bg.g}, ${bg.b})`;

    abrCanvas.toBlob((blob) => {
        outputBlob = blob;
        abrDownloadBtn.disabled = !blob;
    }, "image/png");

    setStatus("Background removed. Tune sliders for better edges if needed.", "success");
}

function loadFile(file) {
    if (!file || !file.type.startsWith("image/")) {
        setStatus("Please choose a valid image file.", "error");
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        const image = new Image();
        image.onload = () => {
            sourceImage = image;
            outputBlob = null;
            abrDownloadBtn.disabled = true;
            abrMeta.textContent = `Image: ${image.naturalWidth}x${image.naturalHeight}`;
            setStatus(`Loaded: ${file.name}`);
            processImage();
        };
        image.onerror = () => setStatus("Could not load this image.", "error");
        image.src = String(reader.result || "");
    };
    reader.onerror = () => setStatus("Failed to read file.", "error");
    reader.readAsDataURL(file);
}

["dragenter", "dragover"].forEach((name) => {
    abrDrop.addEventListener(name, (event) => {
        event.preventDefault();
        abrDrop.classList.add("is-dragover");
    });
});

["dragleave", "dragend", "drop"].forEach((name) => {
    abrDrop.addEventListener(name, (event) => {
        event.preventDefault();
        abrDrop.classList.remove("is-dragover");
    });
});

abrDrop.addEventListener("drop", (event) => {
    loadFile(event.dataTransfer?.files?.[0] || null);
});

abrDrop.addEventListener("click", () => abrFile.click());
abrDrop.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        abrFile.click();
    }
});

abrFile.addEventListener("change", () => {
    loadFile(abrFile.files?.[0] || null);
});

function syncSliders() {
    abrThresholdText.textContent = abrThreshold.value;
    abrFeatherText.textContent = abrFeather.value;
    if (sourceImage) processImage();
}

abrThreshold.addEventListener("input", syncSliders);
abrFeather.addEventListener("input", syncSliders);
abrRunBtn.addEventListener("click", processImage);

abrDownloadBtn.addEventListener("click", () => {
    if (!outputBlob) {
        setStatus("Generate output first.", "error");
        return;
    }

    const url = URL.createObjectURL(outputBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "background-removed.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setStatus("PNG downloaded.", "success");
});
