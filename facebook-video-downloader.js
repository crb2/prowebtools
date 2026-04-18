const fbUrlInput = document.getElementById("fbUrl");
const fbPasteBtn = document.getElementById("fbPasteBtn");
const fbFetchBtn = document.getElementById("fbFetchBtn");
const fbStatus = document.getElementById("fbStatus");
const fbResult = document.getElementById("fbResult");
const fbMeta = document.getElementById("fbMeta");
const fbVideoTitleTop = document.getElementById("fbVideoTitleTop");
const fbDownloadLink = document.getElementById("fbDownloadLink");
const fbQualityActions = document.getElementById("fbQualityActions");
const fbDownloadJobs = document.getElementById("fbDownloadJobs");

let fbObjectUrl = "";
let clipboardAutofillTried = false;
let clipboardPollTimer = null;
let requestWaitTimer = null;
const LOCAL_BACKEND_ORIGIN = "http://localhost:3000";
let lastValidUrl = "";
let lastAutoFetchedUrl = "";
const fetchDefaultText = fbFetchBtn ? fbFetchBtn.textContent : "Fetch Options";
const QUALITY_PRESETS = [1440, 1080, 720, 640, 540, 480, 360, 270];
const PRESET_TOLERANCE = 48;
const DOWNLOAD_TIMEOUT_MS = 7 * 60 * 1000;
const PROD_BACKEND_ORIGIN = "https://prowebtools.onrender.com";
const completedDownloadsByFormat = new Map();
const activeDownloadsByFormat = new Set();
const downloadJobsByFormat = new Map();

function setFbStatus(message, isError = false) {
    if (!fbStatus) return;
    fbStatus.textContent = message;
    fbStatus.classList.toggle("is-error", Boolean(isError));
}

function setBusyState(isBusy, message = "") {
    if (!fbStatus || !fbFetchBtn) return;
    fbStatus.classList.toggle("is-busy", Boolean(isBusy));
    fbFetchBtn.classList.toggle("is-busy", Boolean(isBusy));
    fbFetchBtn.disabled = Boolean(isBusy);
    fbFetchBtn.textContent = isBusy ? "Fetching..." : fetchDefaultText;
    if (message) setFbStatus(message);
}

function cleanupFbObjectUrl() {
    if (!fbObjectUrl) return;
    URL.revokeObjectURL(fbObjectUrl);
    fbObjectUrl = "";
}

function clearCompletedDownloads() {
    completedDownloadsByFormat.forEach((entry) => {
        if (entry?.objectUrl) {
            URL.revokeObjectURL(entry.objectUrl);
        }
    });
    completedDownloadsByFormat.clear();
    cleanupFbObjectUrl();
}

function stopRequestWaitTimer() {
    if (!requestWaitTimer) return;
    window.clearInterval(requestWaitTimer);
    requestWaitTimer = null;
}

function ensureJobsVisible() {
    if (!fbDownloadJobs) return;
    fbDownloadJobs.classList.remove("hidden");
}

function createDownloadJob(label) {
    if (!fbDownloadJobs) return null;
    ensureJobsVisible();

    const row = document.createElement("div");
    row.className = "fb-job";

    const title = document.createElement("div");
    title.className = "fb-job-title";
    title.textContent = `${label} video`;

    const state = document.createElement("div");
    state.className = "fb-job-state";
    state.textContent = `Preparing ${label} video...`;

    const barWrap = document.createElement("div");
    barWrap.className = "fb-job-bar-wrap";
    const bar = document.createElement("div");
    bar.className = "fb-job-bar";
    bar.style.width = "0%";
    barWrap.appendChild(bar);

    const meta = document.createElement("div");
    meta.className = "fb-job-meta";
    meta.textContent = "";

    const actions = document.createElement("div");
    actions.className = "fb-job-actions";
    const downloadBtn = document.createElement("button");
    downloadBtn.type = "button";
    downloadBtn.className = "download-btn fb-job-download hidden";
    downloadBtn.textContent = "Download";
    actions.appendChild(downloadBtn);

    const head = document.createElement("div");
    head.className = "fb-job-head";
    head.appendChild(title);
    head.appendChild(actions);

    row.appendChild(head);
    row.appendChild(state);
    row.appendChild(barWrap);
    row.appendChild(meta);
    fbDownloadJobs.prepend(row);

    return { row, state, bar, meta, downloadBtn };
}

function updateJob(job, { state, percent, meta } = {}) {
    if (!job) return;
    if (state) job.state.textContent = state;
    if (typeof percent === "number" && Number.isFinite(percent)) {
        const clamped = Math.max(0, Math.min(100, percent));
        job.bar.style.width = `${clamped}%`;
    }
    if (typeof meta === "string") job.meta.textContent = meta;
}

function finalizeJob(job, text, isError = false) {
    if (!job) return;
    job.state.textContent = text;
    if (isError) {
        job.row.classList.add("is-error");
        if (job.downloadBtn) {
            job.downloadBtn.classList.add("hidden");
            job.downloadBtn.onclick = null;
        }
        return;
    }
    job.row.classList.add("is-done");
    job.row.classList.remove("is-error");
    job.bar.style.width = "100%";
}

function triggerBrowserDownload(objectUrl, fileName) {
    const tempLink = document.createElement("a");
    tempLink.href = objectUrl;
    tempLink.download = fileName || "facebook_video.mp4";
    tempLink.rel = "noopener";
    tempLink.style.display = "none";
    document.body.appendChild(tempLink);
    tempLink.click();
    tempLink.remove();
}

function enableJobDownloadButton(job, fileName, objectUrl, label) {
    if (!job?.downloadBtn) return;
    job.downloadBtn.classList.remove("hidden");
    job.downloadBtn.textContent = "Redownload";
    job.downloadBtn.onclick = () => {
        triggerBrowserDownload(objectUrl, fileName);
        setFbStatus(`Downloaded ${label}.`);
    };
}

function formatDurationShort(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function parseQualityHeight(label) {
    const text = String(label || "").toLowerCase();
    const match = text.match(/(\d{3,4})p/);
    return match ? Number(match[1] || 0) : 0;
}

function estimatePrepareMs(label) {
    const h = parseQualityHeight(label);
    if (h >= 1440) return 105000;
    if (h >= 1080) return 85000;
    if (h >= 720) return 65000;
    if (h >= 540) return 50000;
    return 42000;
}

function formatBytes(bytes) {
    const value = Number(bytes || 0);
    if (!Number.isFinite(value) || value <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    let size = value;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex += 1;
    }
    const decimals = unitIndex === 0 ? 0 : 1;
    return `${size.toFixed(decimals)} ${units[unitIndex]}`;
}

function startRequestWaitTimer(startedAt) {
    stopRequestWaitTimer();
    requestWaitTimer = window.setInterval(() => {
        const elapsed = Date.now() - startedAt;
        setFbStatus(`Preparing video... ${formatDurationShort(elapsed)}`);
    }, 1000);
}

async function responseToBlobWithProgress(response, onProgress) {
    if (!response.body || typeof response.body.getReader !== "function") {
        const fallbackBlob = await response.blob();
        onProgress(fallbackBlob.size);
        return fallbackBlob;
    }

    const reader = response.body.getReader();
    const chunks = [];
    let loaded = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        chunks.push(value);
        loaded += value.byteLength;
        onProgress(loaded);
    }
    return new Blob(chunks, { type: response.headers.get("Content-Type") || "application/octet-stream" });
}

function getHeaderText(headers, key) {
    const value = headers.get(key);
    return value ? decodeURIComponent(value) : "";
}

function parseFacebookUrl(raw) {
    const text = String(raw || "").trim();
    if (!text) return null;

    // Accept pasted text that contains a URL among other words.
    const directMatch = text.match(/https?:\/\/[^\s"'<>]+/i);
    const candidate = directMatch ? directMatch[0] : text;

    try {
        const url = new URL(candidate);
        const host = (url.hostname || "").toLowerCase();
        const isFacebook = host === "fb.watch" || host.endsWith("facebook.com");
        if (!isFacebook) return null;
        return url.toString();
    } catch {
        return null;
    }
}

function getApiUrl(pathname) {
    const path = String(pathname || "");
    const host = (window.location.hostname || "").toLowerCase();
    const isLocalHost = host === "localhost" || host === "127.0.0.1";
    const isBackendPort = window.location.port === "3000";

    // If page is opened from another local server/port (for example Live Server),
    // send API calls directly to backend on 3000.
    if (isLocalHost && !isBackendPort) {
        return `${LOCAL_BACKEND_ORIGIN}${path}`;
    }

    // Production fallback when frontend and backend are on different origins.
    if (!isLocalHost && PROD_BACKEND_ORIGIN) {
        return `${PROD_BACKEND_ORIGIN}${path}`;
    }

    return path;
}

function getApiFallbackUrl(pathname) {
    const path = String(pathname || "");
    const host = (window.location.hostname || "").toLowerCase();
    const isLocalHost = host === "localhost" || host === "127.0.0.1";
    if (isLocalHost) return "";
    if (!PROD_BACKEND_ORIGIN) return "";
    return `${PROD_BACKEND_ORIGIN}${path}`;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isLocalRuntime() {
    const host = (window.location.hostname || "").toLowerCase();
    return host === "localhost" || host === "127.0.0.1";
}

async function postApiWithFallback(pathname, payload, options = {}) {
    const primaryUrl = getApiUrl(pathname);
    const fallbackUrl = getApiFallbackUrl(pathname);
    const urls = Array.from(new Set([primaryUrl, fallbackUrl].filter(Boolean)));
    const reqInit = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: options.signal
    };

    let lastError = null;
    for (const url of urls) {
        for (let attempt = 0; attempt < 2; attempt += 1) {
            try {
                const response = await fetch(url, reqInit);
                const shouldRetryFallback =
                    !response.ok &&
                    (response.status === 404 ||
                        response.status === 405 ||
                        response.status === 501 ||
                        String(response.headers.get("content-type") || "").includes("text/html"));

                if (shouldRetryFallback && urls.length > 1 && url === primaryUrl) {
                    break;
                }
                return response;
            } catch (err) {
                lastError = err;
                if (attempt === 0) {
                    await sleep(1800);
                    continue;
                }
            }
        }
    }

    throw (lastError || new Error("Failed to fetch"));
}

function autoFetchIfNeeded(url) {
    const normalized = parseFacebookUrl(url || "");
    if (!normalized) return;
    if (!fbFetchBtn || fbFetchBtn.disabled) return;
    if (lastAutoFetchedUrl === normalized) return;
    lastAutoFetchedUrl = normalized;
    window.setTimeout(() => {
        if (!fbFetchBtn || fbFetchBtn.disabled) return;
        if ((fbUrlInput?.value || "").trim() !== normalized) return;
        fetchFacebookVideo();
    }, 120);
}

async function tryAutofillFromClipboard() {
    if (clipboardAutofillTried) return;
    clipboardAutofillTried = true;
    if (!fbUrlInput) return;
    if ((fbUrlInput.value || "").trim()) return;
    if (!navigator.clipboard || !window.isSecureContext) return;

    try {
        const clipboardText = await navigator.clipboard.readText();
        const validUrl = parseFacebookUrl(clipboardText);
        if (!validUrl) return;
        if ((fbUrlInput.value || "").trim()) return;
        fbUrlInput.value = validUrl;
        lastValidUrl = validUrl;
        setFbStatus("Detected a Facebook URL from clipboard and pasted it automatically.");
        autoFetchIfNeeded(validUrl);
    } catch {
        // Ignore clipboard permission errors.
    }
}

async function pasteFromClipboard(forcePrompt = false) {
    if (!fbUrlInput) return false;
    if (!navigator.clipboard || !window.isSecureContext) {
        setFbStatus("Clipboard read requires HTTPS or localhost secure context.", true);
        return false;
    }

    try {
        const text = await navigator.clipboard.readText();
        const validUrl = parseFacebookUrl(text);
        if (!validUrl) {
            if (forcePrompt) {
                setFbStatus("Clipboard text is not a valid Facebook URL.", true);
            }
            return false;
        }
        if ((fbUrlInput.value || "").trim() !== validUrl) {
            fbUrlInput.value = validUrl;
            lastValidUrl = validUrl;
            setFbStatus("Facebook URL pasted from clipboard.");
            autoFetchIfNeeded(validUrl);
        }
        return true;
    } catch {
        if (forcePrompt) {
            setFbStatus("Clipboard permission denied. Allow clipboard access and try Paste again.", true);
        }
        return false;
    }
}

function startClipboardWatcher() {
    if (clipboardPollTimer || !navigator.clipboard || !window.isSecureContext) return;
    clipboardPollTimer = window.setInterval(() => {
        if (!document.hasFocus()) return;
        if (!fbUrlInput) return;
        // Keep this non-intrusive: auto-fill only when input is empty.
        if ((fbUrlInput.value || "").trim()) return;
        pasteFromClipboard(false);
    }, 350);
}

async function fetchFacebookVideo() {
    if (!fbUrlInput || !fbFetchBtn || !fbResult || !fbMeta || !fbDownloadLink || !fbQualityActions) return;

    const normalizedUrl = parseFacebookUrl(fbUrlInput.value || "");
    if (!normalizedUrl) {
        setFbStatus("Please paste a valid Facebook URL (facebook.com or fb.watch).", true);
        fbUrlInput.focus();
        return;
    }
    fbUrlInput.value = normalizedUrl;
    lastValidUrl = normalizedUrl;

    setBusyState(true, "Fetching available quality options...");
    fbResult.classList.add("hidden");
    fbQualityActions.innerHTML = "";
    activeDownloadsByFormat.clear();
    downloadJobsByFormat.clear();
    clearCompletedDownloads();
    if (fbDownloadJobs) {
        fbDownloadJobs.innerHTML = "";
        fbDownloadJobs.classList.add("hidden");
    }

    try {
        const response = await postApiWithFallback(
            "/api/fetch-facebook-video",
            { url: normalizedUrl, listFormats: true }
        );

        if (!response.ok) {
            let message = `Request failed (${response.status}).`;
            if (response.status === 405) {
                message = "API method not allowed on current host. Backend should run on http://localhost:3000.";
            }
            try {
                const raw = (await response.text()).trim();
                if (raw) {
                    try {
                        const data = JSON.parse(raw);
                        if (data?.error) {
                            message = data.error;
                        } else {
                            message = raw.slice(0, 280);
                        }
                    } catch {
                        message = raw.slice(0, 280);
                    }
                }
            } catch {
                // ignore parse issues
            }
            throw new Error(message || "Could not fetch this video link.");
        }

        const payload = await response.json();
        const formats = Array.isArray(payload?.formats) ? payload.formats : [];
        if (!formats.length) {
            throw new Error("No downloadable quality options were found for this link.");
        }

        const titleText = String(payload?.title || "").trim();
        if (fbVideoTitleTop) {
            if (titleText) {
                fbVideoTitleTop.textContent = `Video: ${titleText}`;
                fbVideoTitleTop.classList.remove("hidden");
            } else {
                fbVideoTitleTop.textContent = "";
                fbVideoTitleTop.classList.add("hidden");
            }
        }
        fbMeta.textContent = "Choose exact quality to download.";

        renderQualityButtons(formats);
        fbResult.classList.remove("hidden");
        setFbStatus(`Found ${formats.length} quality options.`);
    } catch (error) {
        const raw = error?.message || "";
        const normalized = /Failed to fetch/i.test(raw)
            ? (isLocalRuntime()
                ? "Cannot reach backend. Start server.js and try again."
                : "Backend is temporarily unreachable or waking up. Please retry in 30-60 seconds.")
            : raw || "Failed to fetch video.";
        setFbStatus(normalized, true);
    } finally {
        setBusyState(false);
    }
}

async function downloadByFormat(formatId, label, buttonEl) {
    if (!lastValidUrl || !formatId) return;
    if (!fbFetchBtn) return;

    const cached = completedDownloadsByFormat.get(formatId);
    if (cached?.objectUrl) {
        triggerBrowserDownload(cached.objectUrl, cached.fileName);
        setFbStatus(`Downloaded ${label}.`);
        return;
    }
    if (activeDownloadsByFormat.has(formatId)) {
        setFbStatus(`${label} is already processing.`, false);
        return;
    }
    activeDownloadsByFormat.add(formatId);

    if (buttonEl) {
        buttonEl.classList.add("is-busy");
        buttonEl.disabled = true;
    }
    setFbStatus(`Starting ${label}...`);
    let timeoutId = null;
    let waitTimer = null;
    let job = downloadJobsByFormat.get(formatId);
    if (!job || !job.row?.isConnected) {
        job = createDownloadJob(label);
        if (job) downloadJobsByFormat.set(formatId, job);
    } else {
        job.row.classList.remove("is-done", "is-error");
        if (job.downloadBtn) {
            job.downloadBtn.classList.add("hidden");
            job.downloadBtn.onclick = null;
        }
        updateJob(job, { state: `Preparing ${label} video...`, percent: 0, meta: "" });
    }
    const estimatedPrepareMs = estimatePrepareMs(label);

    try {
        const controller = new AbortController();
        timeoutId = window.setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
        const startedAt = Date.now();
        waitTimer = window.setInterval(() => {
            const elapsed = Date.now() - startedAt;
            const progressPct = Math.min(90, Math.round((elapsed / estimatedPrepareMs) * 90));
            const remainingMs = Math.max(0, estimatedPrepareMs - elapsed);
            updateJob(job, {
                state: `Preparing ${label} video...`,
                percent: progressPct,
                meta: `Elapsed ${formatDurationShort(elapsed)} - Est. ${formatDurationShort(remainingMs)} left`
            });
        }, 1000);
        const response = await postApiWithFallback(
            "/api/fetch-facebook-video",
            {
                url: lastValidUrl,
                formatId
            },
            { signal: controller.signal }
        );
        if (waitTimer) {
            window.clearInterval(waitTimer);
            waitTimer = null;
        }

        if (!response.ok) {
            let message = `Request failed (${response.status}).`;
            try {
                const raw = (await response.text()).trim();
                if (raw) {
                    try {
                        const data = JSON.parse(raw);
                        message = data?.error || raw.slice(0, 280);
                    } catch {
                        message = raw.slice(0, 280);
                    }
                }
            } catch {
                // ignore parse issues
            }
            throw new Error(message);
        }

        const headerSize = Number(
            response.headers.get("Content-Length") ||
            response.headers.get("X-Original-Filesize") ||
            0
        );
        const hasTotal = Number.isFinite(headerSize) && headerSize > 0;
        const dlStartedAt = Date.now();
        const blob = await responseToBlobWithProgress(response, (loaded) => {
            const elapsedSec = Math.max(1, (Date.now() - dlStartedAt) / 1000);
            const speed = loaded / elapsedSec;
            if (hasTotal) {
                const pct = Math.min(100, Math.round((loaded / headerSize) * 100));
                const remain = Math.max(0, headerSize - loaded);
                const etaSec = speed > 0 ? Math.ceil(remain / speed) : 0;
                updateJob(job, {
                    state: `Downloading ${label}... ${pct}%`,
                    percent: pct,
                    meta: `${formatBytes(loaded)} / ${formatBytes(headerSize)} - ${formatBytes(speed)}/s - ETA ${formatDurationShort(etaSec * 1000)}`
                });
                setFbStatus(`Downloading ${label}: ${pct}%`);
                return;
            }
            updateJob(job, {
                state: `Downloading ${label}...`,
                meta: `${formatBytes(loaded)} - ${formatBytes(speed)}/s`
            });
            setFbStatus(`Downloading ${label}: ${formatBytes(loaded)}`);
        });
        if (!blob || blob.size === 0) {
            throw new Error("Received an empty file for this quality.");
        }

        const objectUrl = URL.createObjectURL(blob);
        fbObjectUrl = objectUrl;

        const fileName = getHeaderText(response.headers, "X-File-Name") || "facebook_video.mp4";
        completedDownloadsByFormat.set(formatId, { objectUrl, fileName, label });
        triggerBrowserDownload(objectUrl, fileName);
        enableJobDownloadButton(job, fileName, objectUrl, label);
        setFbStatus(`Downloaded ${label}.`);
        finalizeJob(job, `Completed ${label}`);
    } catch (error) {
        const raw = error?.message || "";
        const normalized = /AbortError|timed out|timeout/i.test(raw)
            ? "Download took too long. Try 1080p or 720p for faster results."
            : /Failed to fetch/i.test(raw)
            ? (isLocalRuntime()
                ? "Cannot reach backend. Start server.js and try again."
                : "Backend is temporarily unreachable or waking up. Please retry in 30-60 seconds.")
            : raw || "Failed to download selected quality.";
        setFbStatus(normalized, true);
        finalizeJob(job, normalized, true);
    } finally {
        if (timeoutId) {
            window.clearTimeout(timeoutId);
        }
        if (waitTimer) {
            window.clearInterval(waitTimer);
        }
        if (buttonEl) {
            buttonEl.classList.remove("is-busy");
            buttonEl.disabled = false;
        }
        activeDownloadsByFormat.delete(formatId);
    }
}

function renderQualityButtons(formats) {
    if (!fbQualityActions) return;
    fbQualityActions.innerHTML = "";
    const inferHeight = (source) => {
        const text = String(source || "").toLowerCase();
        const pMatch = text.match(/(\d{3,4})\s*p\b/);
        if (pMatch) return Number(pMatch[1] || 0);
        if (/\b8k\b/.test(text)) return 4320;
        if (/\b4k\b/.test(text)) return 2160;
        if (/\b2k\b/.test(text)) return 1440;
        const resMatch = text.match(/(\d{3,5})\s*x\s*(\d{3,5})/);
        if (resMatch) {
            const a = Number(resMatch[1] || 0);
            const b = Number(resMatch[2] || 0);
            return Math.min(a, b);
        }
        return 0;
    };
    const normalized = (Array.isArray(formats) ? formats : [])
        .map((f) => ({
            id: String(f?.id || ""),
            height: Number(f?.height || 0) || inferHeight(f?.label) || inferHeight(f?.resolution),
            label: String(f?.label || ""),
            tbr: Number(f?.tbr || 0),
            hasAudio: Boolean(f?.hasAudio)
        }))
        .filter((f) => f.id && f.height > 0)
        .sort((a, b) => (b.height - a.height) || (b.tbr - a.tbr));

    const requestedOrder = [...QUALITY_PRESETS].sort((a, b) => a - b);
    const pickedIds = new Set();

    requestedOrder.forEach((presetHeight) => {
        const exact = normalized
            .filter((fmt) => fmt.height === presetHeight && !pickedIds.has(fmt.id))
            .sort((a, b) => (Number(b.hasAudio) - Number(a.hasAudio)) || (b.tbr - a.tbr));

        const near = normalized
            .filter((fmt) => Math.abs(fmt.height - presetHeight) <= PRESET_TOLERANCE && !pickedIds.has(fmt.id))
            .sort((a, b) =>
                (Number(b.hasAudio) - Number(a.hasAudio)) ||
                (Math.abs(a.height - presetHeight) - Math.abs(b.height - presetHeight)) ||
                (b.tbr - a.tbr)
            );

        const candidate = exact[0] || near[0];
        if (!candidate) return;
        pickedIds.add(candidate.id);

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "download-btn fb-quality-btn";
        const label = `${presetHeight}p`;
        btn.innerHTML = `<span class="fb-q-main"><span class="fb-q-icon" aria-hidden="true">&#x2B07;</span><span class="fb-q-label">${label}</span></span>`;
        btn.title = `${label}`;
        btn.addEventListener("click", () => {
            downloadByFormat(candidate.id, label, btn);
        });
        fbQualityActions.appendChild(btn);
    });

    if (!fbQualityActions.children.length) {
        const seenHeights = new Set();
        normalized.forEach((candidate) => {
            if (seenHeights.has(candidate.height)) return;
            seenHeights.add(candidate.height);

            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "download-btn fb-quality-btn";
            const label = `${candidate.height}p`;
            btn.innerHTML = `<span class="fb-q-main"><span class="fb-q-icon" aria-hidden="true">&#x2B07;</span><span class="fb-q-label">${label}</span></span>`;
            btn.title = `${label}`;
            btn.addEventListener("click", () => {
                downloadByFormat(candidate.id, label, btn);
            });
            fbQualityActions.appendChild(btn);
        });
    }
}

if (fbFetchBtn) {
    fbFetchBtn.addEventListener("click", fetchFacebookVideo);
}

if (fbPasteBtn) {
    fbPasteBtn.addEventListener("click", () => {
        pasteFromClipboard(true);
    });
}

if (fbUrlInput) {
    fbUrlInput.addEventListener("focus", tryAutofillFromClipboard);
    fbUrlInput.addEventListener("input", () => {
        const validUrl = parseFacebookUrl(fbUrlInput.value || "");
        if (validUrl) {
            fbUrlInput.value = validUrl;
            lastValidUrl = validUrl;
            setFbStatus("Valid Facebook URL detected.");
        }
    });
    fbUrlInput.addEventListener("paste", (event) => {
        const text = event.clipboardData?.getData("text") || "";
        const validUrl = parseFacebookUrl(text);
        if (!validUrl) return;
        event.preventDefault();
        fbUrlInput.value = validUrl;
        lastValidUrl = validUrl;
        setFbStatus("Valid Facebook URL pasted from clipboard.");
        autoFetchIfNeeded(validUrl);
    });
    fbUrlInput.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        fetchFacebookVideo();
    });
}

tryAutofillFromClipboard();
startClipboardWatcher();
window.addEventListener("beforeunload", () => {
    clearCompletedDownloads();
});
