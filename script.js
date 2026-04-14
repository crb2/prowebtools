const form = document.getElementById("thumbnailForm");
const urlInput = document.getElementById("youtubeUrl");
const statusText = document.getElementById("status");
const resultSection = document.getElementById("result");
const singlePreview = document.getElementById("singlePreview");
const singlePreviewSize = document.getElementById("singlePreviewSize");
const qualityActions = document.getElementById("qualityActions");

let autoLoadTimer;
let lastLoadedVideoId = "";

const qualityList = [
    { quality: "maxresdefault.jpg", label: "1280x720 (Max HD)" },
    { quality: "sddefault.jpg", label: "640x480 (SD)" },
    { quality: "hqdefault.jpg", label: "480x360 (HQ)" },
    { quality: "mqdefault.jpg", label: "320x180 (MQ)" },
    { quality: "default.jpg", label: "120x90 (Default)" }
];

function setStatus(message, isError = false) {
    statusText.textContent = message;
    statusText.style.color = isError ? "#f87171" : "#fbbf24";
}

function extractVideoId(input) {
    const raw = input.trim();
    if (!raw) {
        return "";
    }

    if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) {
        return raw;
    }

    let parsed;
    try {
        parsed = new URL(raw);
    } catch {
        return "";
    }

    const host = parsed.hostname.replace(/^www\./i, "");
    if (host === "youtu.be") {
        return parsed.pathname.split("/").filter(Boolean)[0] || "";
    }

    if (host.endsWith("youtube.com")) {
        const fromQuery = parsed.searchParams.get("v");
        if (fromQuery) {
            return fromQuery;
        }

        const parts = parsed.pathname.split("/").filter(Boolean);
        const marker = ["shorts", "embed", "live"].find((key) => parts.includes(key));
        if (marker) {
            const markerIndex = parts.indexOf(marker);
            return parts[markerIndex + 1] || "";
        }
    }

    return "";
}

function thumbnailUrl(videoId, quality) {
    return `https://i.ytimg.com/vi/${videoId}/${quality}`;
}

async function downloadImage(url, filename) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error("Image not available");
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(objectUrl);
        setStatus(`Downloaded: ${filename}`);
    } catch {
        window.open(url, "_blank", "noopener,noreferrer");
        setStatus("Download blocked by browser policy. Opened image in new tab.", true);
    }
}

function renderQualityButtons(videoId) {
    qualityActions.innerHTML = "";

    qualityList.forEach((entry) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "download-btn";
        button.textContent = `Download ${entry.label}`;
        button.addEventListener("click", async () => {
            await downloadImage(thumbnailUrl(videoId, entry.quality), `${videoId}-${entry.quality}`);
        });
        qualityActions.appendChild(button);
    });
}

function loadMainPreview(videoId) {
    renderQualityButtons(videoId);
    resultSection.classList.remove("hidden");

    singlePreview.src = thumbnailUrl(videoId, "maxresdefault.jpg");
    singlePreview.onload = () => {
        singlePreviewSize.textContent = `${singlePreview.naturalWidth}x${singlePreview.naturalHeight}`;
    };
    singlePreview.onerror = () => {
        singlePreview.onerror = null;
        singlePreview.src = thumbnailUrl(videoId, "hqdefault.jpg");
    };

    setStatus("Thumbnail loaded. Pick your download resolution.");
}

function clearResult() {
    qualityActions.innerHTML = "";
    singlePreview.removeAttribute("src");
    singlePreviewSize.textContent = "";
    resultSection.classList.add("hidden");
}

function loadThumbnailsFromInput(showError = false) {
    const videoId = extractVideoId(urlInput.value);

    if (!videoId || videoId.length !== 11) {
        if (!urlInput.value.trim()) {
            clearResult();
            setStatus("");
            lastLoadedVideoId = "";
            return;
        }

        if (showError) {
            clearResult();
            setStatus("Please enter a valid YouTube URL or 11-character video ID.", true);
            lastLoadedVideoId = "";
        }
        return;
    }

    if (lastLoadedVideoId === videoId) {
        return;
    }

    lastLoadedVideoId = videoId;
    loadMainPreview(videoId);
}

form.addEventListener("submit", (event) => {
    event.preventDefault();
    loadThumbnailsFromInput(true);
});

urlInput.addEventListener("input", () => {
    clearTimeout(autoLoadTimer);
    autoLoadTimer = setTimeout(() => loadThumbnailsFromInput(false), 250);
});

urlInput.addEventListener("paste", () => {
    setTimeout(() => loadThumbnailsFromInput(false), 0);
});

urlInput.addEventListener("change", () => {
    loadThumbnailsFromInput(false);
});
