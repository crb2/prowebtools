const speedCard = document.querySelector(".speed-card");
const speedNeedle = document.getElementById("speedNeedle");
const speedPhase = document.getElementById("speedPhase");
const speedLive = document.getElementById("speedLive");
const pingResult = document.getElementById("pingResult");
const jitterResult = document.getElementById("jitterResult");
const downloadResult = document.getElementById("downloadResult");
const uploadResult = document.getElementById("uploadResult");
const speedStatus = document.getElementById("speedStatus");
const speedDataUsed = document.getElementById("speedDataUsed");
const speedContext = document.getElementById("speedContext");
const startSpeedBtn = document.getElementById("startSpeedBtn");
const copySpeedBtn = document.getElementById("copySpeedBtn");
const speedModeButtons = Array.from(document.querySelectorAll(".mode-btn"));
const speedModeEta = document.getElementById("speedModeEta");
const speedModeDetail = document.getElementById("speedModeDetail");
const speedModeUsage = document.getElementById("speedModeUsage");
let detectedConnectionType = "Detecting...";
let detectedProvider = "Detecting...";
let selectedMode = "medium";
let activeTestController = null;

const DOWN_URL = "https://speed.cloudflare.com/__down";
const UP_URL = "https://speed.cloudflare.com/__up";

const SPEED_PROFILES = {
    fast: {
        label: "Fast",
        etaText: "~15-25 seconds",
        detail: "Good for quick checks. Faster, but less stable than Medium and Slow.",
        pingSamples: 4,
        downloadPasses: [
            { size: 4_000_000, repeat: 1 },
            { size: 10_000_000, repeat: 1 },
            { size: 16_000_000, repeat: 1 }
        ],
        uploadSizes: [3_000_000, 6_000_000, 10_000_000],
        strategy: "stable_average"
    },
    medium: {
        label: "Medium",
        etaText: "~25-45 seconds",
        detail: "Balanced mode for daily use. Good mix of speed and accuracy.",
        pingSamples: 8,
        downloadPasses: [
            { size: 4_000_000, repeat: 1 },
            { size: 10_000_000, repeat: 2 },
            { size: 20_000_000, repeat: 2 },
            { size: 30_000_000, repeat: 1 }
        ],
        uploadSizes: [4_000_000, 8_000_000, 14_000_000, 18_000_000],
        strategy: "stable_average"
    },
    slow: {
        label: "Slow / High Accuracy",
        etaText: "~45-80 seconds",
        detail: "Most accurate mode. Uses more samples for stable final numbers.",
        pingSamples: 12,
        downloadPasses: [
            { size: 6_000_000, repeat: 2 },
            { size: 16_000_000, repeat: 2 },
            { size: 30_000_000, repeat: 2 },
            { size: 40_000_000, repeat: 2 }
        ],
        uploadSizes: [6_000_000, 12_000_000, 20_000_000, 24_000_000, 28_000_000],
        strategy: "stable_average"
    }
};

function getSelectedProfile() {
    const mode = selectedMode || "medium";
    return SPEED_PROFILES[mode] || SPEED_PROFILES.medium;
}

function setAutoNetworkInfo(typeValue, providerValue) {
    detectedConnectionType = typeValue || "Unknown";
    detectedProvider = providerValue || "Unknown";
    if (speedContext) {
        speedContext.textContent = `Connection: ${detectedConnectionType} | Provider: ${detectedProvider}`;
    }
}

function guessConnectionTypeFromBrowser() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
    const rawType = typeof conn?.type === "string" ? conn.type.toLowerCase() : "";
    const effective = typeof conn?.effectiveType === "string" ? conn.effectiveType.toLowerCase() : "";
    const ua = (navigator.userAgent || "").toLowerCase();
    const isMobileUA = /android|iphone|ipad|ipod|mobile/.test(ua);

    if (rawType === "wifi") return "Wi-Fi";
    if (rawType === "ethernet") return "LAN / Ethernet";
    if (rawType === "none") return "Offline";

    if (rawType === "cellular") {
        const genMap = {
            "slow-2g": "1G/2G",
            "2g": "2G",
            "3g": "3G",
            "4g": "4G/5G"
        };
        const networkGen = genMap[effective] || "Cellular";
        return `Cellular (${networkGen})`;
    }

    if (isMobileUA && effective) {
        const guessByEffective = {
            "slow-2g": "Cellular (1G/2G)",
            "2g": "Cellular (2G)",
            "3g": "Cellular (3G)",
            "4g": "Cellular (4G/5G)"
        };
        if (guessByEffective[effective]) return guessByEffective[effective];
    }

    return "Unknown";
}

function sanitizeProviderName(value) {
    const text = (value || "").trim();
    return text || "Unknown";
}

async function fetchJsonWithTimeout(url, timeoutMs = 6000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { cache: "no-store", signal: controller.signal });
        if (!response.ok) {
            throw new Error(`Status ${response.status}`);
        }
        return await response.json();
    } finally {
        clearTimeout(timer);
    }
}

function createAbortError() {
    try {
        return new DOMException("The operation was aborted.", "AbortError");
    } catch {
        const err = new Error("The operation was aborted.");
        err.name = "AbortError";
        return err;
    }
}

function throwIfAborted(signal) {
    if (signal && signal.aborted) {
        throw createAbortError();
    }
}

async function detectProviderByIP() {
    try {
        const data = await fetchJsonWithTimeout("https://ipapi.co/json/");
        const provider = sanitizeProviderName(data.org || data.asn_org);
        if (provider !== "Unknown") return provider;
    } catch {
        // fallback below
    }

    try {
        const data = await fetchJsonWithTimeout("https://ipwho.is/");
        const provider = sanitizeProviderName(data?.connection?.isp || data?.connection?.org);
        if (provider !== "Unknown") return provider;
    } catch {
        // ignore final failure
    }

    try {
        const data = await fetchJsonWithTimeout("https://ipinfo.io/json");
        const provider = sanitizeProviderName(data.org);
        if (provider !== "Unknown") return provider;
    } catch {
        // ignore final failure
    }

    return "Unknown";
}

async function detectNetworkContext() {
    const typeGuess = guessConnectionTypeFromBrowser();
    setAutoNetworkInfo(typeGuess, "Detecting...");
    const provider = await detectProviderByIP();
    setAutoNetworkInfo(typeGuess, provider);
}

function updateModeEta() {
    const profile = getSelectedProfile();
    if (speedModeEta) {
        speedModeEta.textContent = `Estimated test time: ${profile.etaText} (${profile.label} mode).`;
    }
    if (speedModeDetail) {
        speedModeDetail.textContent = profile.detail;
    }
    if (speedModeUsage) {
        const usage = estimateProfileUsage(profile);
        speedModeUsage.textContent = `Approx data usage: ${formatBytes(usage.total)} (Down ${formatBytes(usage.download)} + Up ${formatBytes(usage.upload)})`;
    }
}

function setSpeedStatus(message, mode = "loading") {
    speedStatus.textContent = message;
    if (mode === "success") {
        speedStatus.style.color = "#22c55e";
        return;
    }
    if (mode === "error") {
        speedStatus.style.color = "#ef4444";
        return;
    }
    speedStatus.style.color = "#facc15";
}

function formatBytes(bytes) {
    const value = Number.isFinite(bytes) ? Math.max(0, bytes) : 0;
    if (value < 1024) return `${value.toFixed(0)} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(2)} KB`;
    if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(2)} MB`;
    return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function estimateProfileUsage(profile) {
    const pingBytes = Math.max(0, (profile?.pingSamples || 0) * 15_000);
    const downloadBytes = (profile?.downloadPasses || []).reduce((sum, pass) => {
        const size = Number(pass?.size) || 0;
        const repeat = Number(pass?.repeat) || 0;
        return sum + (size * repeat);
    }, 0) + pingBytes;
    const uploadBytes = (profile?.uploadSizes || []).reduce((sum, size) => sum + (Number(size) || 0), 0);
    return {
        download: downloadBytes,
        upload: uploadBytes,
        total: downloadBytes + uploadBytes
    };
}

function updateDataUsedLine(downloadBytes, uploadBytes) {
    if (!speedDataUsed) return;
    const down = Number.isFinite(downloadBytes) ? Math.max(0, downloadBytes) : 0;
    const up = Number.isFinite(uploadBytes) ? Math.max(0, uploadBytes) : 0;
    const total = down + up;
    speedDataUsed.textContent = `Data used this test: Download ${formatBytes(down)} + Upload ${formatBytes(up)} = Total ${formatBytes(total)}`;
}

function setPhase(phase, liveValue = 0) {
    speedPhase.textContent = phase;
    const safe = Number.isFinite(liveValue) ? liveValue : 0;
    speedLive.textContent = safe.toFixed(2);
    if (speedNeedle) {
        const pct = Math.max(0, Math.min(100, (Math.log10(safe + 1) / Math.log10(501)) * 100));
        speedNeedle.style.width = `${pct.toFixed(1)}%`;
    }
}

function animateOrb(active) {
    if (!speedCard) return;
    speedCard.classList.toggle("is-testing", Boolean(active));
}

async function timedFetchBytes(url, signal) {
    throwIfAborted(signal);
    const start = performance.now();
    const response = await fetch(url, { cache: "no-store", signal });
    if (!response.ok) {
        throw new Error(`Speed endpoint failed (${response.status})`);
    }
    const blob = await response.blob();
    const end = performance.now();
    return {
        bytes: blob.size,
        seconds: Math.max((end - start) / 1000, 0.001)
    };
}

async function timedPingSample(url, signal) {
    throwIfAborted(signal);
    const start = performance.now();
    const response = await fetch(url, { cache: "no-store", signal });
    if (!response.ok) {
        throw new Error(`Ping endpoint failed (${response.status})`);
    }
    const blob = await response.blob();
    const end = performance.now();
    return {
        ms: end - start,
        bytes: blob.size
    };
}

async function runPingAndJitter(profile, usage, signal) {
    const samples = [];
    for (let i = 0; i < profile.pingSamples; i += 1) {
        const sample = await timedPingSample(`${DOWN_URL}?bytes=15000&n=${Date.now()}_${i}`, signal);
        usage.downloadBytes += sample.bytes;
        samples.push(sample.ms);
    }
    const valid = samples.filter((v) => Number.isFinite(v) && v > 0);
    const sorted = [...valid].sort((a, b) => a - b);
    const ping = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
    const avg = valid.reduce((a, b) => a + b, 0) / (valid.length || 1);
    const jitter = valid.length
        ? Math.sqrt(valid.reduce((acc, x) => acc + Math.pow(x - avg, 2), 0) / valid.length)
        : 0;
    return { ping, jitter };
}

function toMbps(bytes, seconds) {
    return (bytes * 8) / Math.max(seconds, 0.001) / 1_000_000;
}

function summarizeSpeedReadings(readings, strategy = "stable_average") {
    const clean = readings.filter((v) => Number.isFinite(v) && v > 0);
    if (!clean.length) return 0;

    const filtered = clean
        .sort((a, b) => b - a)
        .slice(0, Math.max(2, Math.ceil(clean.length * 0.6)));

    return filtered.length ? filtered.reduce((a, b) => a + b, 0) / filtered.length : 0;
}

function summarizeUploadReadings(readings) {
    const valid = readings.filter((r) => r && Number.isFinite(r.seconds) && r.seconds > 0 && Number.isFinite(r.bytes) && r.bytes > 0);
    if (!valid.length) return 0;

    // Drop first sample as upload warm-up to reduce TLS/startup penalty.
    let stable = valid.length > 2 ? valid.slice(1) : valid;
    if (stable.length > 3) {
        // Drop the single slowest outlier for better real-world estimate.
        stable = [...stable].sort((a, b) => a.mbps - b.mbps).slice(1);
    }

    const totalBytes = stable.reduce((sum, r) => sum + r.bytes, 0);
    const totalSeconds = stable.reduce((sum, r) => sum + r.seconds, 0);
    if (!totalBytes || !totalSeconds) return 0;
    return toMbps(totalBytes, totalSeconds);
}

async function runDownloadTest(profile, usage, signal) {
    const passes = profile.downloadPasses;
    const readings = [];
    const total = passes.reduce((sum, p) => sum + p.repeat, 0);
    let count = 0;

    for (const pass of passes) {
        for (let i = 0; i < pass.repeat; i += 1) {
            count += 1;
            const { bytes, seconds } = await timedFetchBytes(`${DOWN_URL}?bytes=${pass.size}&n=${Date.now()}_${count}`, signal);
            const mbps = toMbps(bytes, seconds);
            usage.downloadBytes += bytes;
            readings.push(mbps);
            setPhase(`Download ${count}/${total}`, mbps);
        }
    }

    return summarizeSpeedReadings(readings, profile.strategy);
}

async function runUploadTest(profile, usage, signal) {
    const payloadSizes = profile.uploadSizes;
    const readings = [];

    for (let i = 0; i < payloadSizes.length; i += 1) {
        const payload = new Uint8Array(payloadSizes[i]);
        crypto.getRandomValues(payload.subarray(0, Math.min(65536, payload.length)));
        const start = performance.now();
        const response = await fetch(`${UP_URL}?n=${Date.now()}_${i}`, {
            method: "POST",
            body: payload,
            cache: "no-store",
            signal
        });
        if (!response.ok) {
            throw new Error(`Upload endpoint failed (${response.status})`);
        }
        const responseText = await response.text();
        const end = performance.now();
        const seconds = Math.max((end - start) / 1000, 0.001);
        const mbps = toMbps(payload.byteLength, seconds);
        usage.uploadBytes += payload.byteLength;
        usage.downloadBytes += responseText.length;
        readings.push({ mbps, bytes: payload.byteLength, seconds });
        setPhase(`Upload ${i + 1}/${payloadSizes.length}`, mbps);
    }

    return summarizeUploadReadings(readings);
}

function renderFinal(pingMs, jitterMs, downMbps, upMbps) {
    pingResult.value = `${pingMs.toFixed(0)} ms`;
    jitterResult.value = `${jitterMs.toFixed(1)} ms`;
    downloadResult.value = `${downMbps.toFixed(2)} Mbps`;
    uploadResult.value = `${upMbps.toFixed(2)} Mbps`;
    setPhase("Done", downMbps);
}

async function runSpeedTest() {
    const profile = getSelectedProfile();
    const usage = { downloadBytes: 0, uploadBytes: 0 };
    const controller = new AbortController();
    const signal = controller.signal;
    activeTestController = controller;
    startSpeedBtn.disabled = true;
    copySpeedBtn.disabled = true;
    animateOrb(true);
    pingResult.value = "-- ms";
    jitterResult.value = "-- ms";
    downloadResult.value = "-- Mbps";
    uploadResult.value = "-- Mbps";
    updateDataUsedLine(0, 0);
    setSpeedStatus(`Running ${profile.label} test (${profile.etaText})...`);

    try {
        setPhase("Ping", 0);
        const { ping, jitter } = await runPingAndJitter(profile, usage, signal);
        pingResult.value = `${ping.toFixed(0)} ms`;
        jitterResult.value = `${jitter.toFixed(1)} ms`;

        const down = await runDownloadTest(profile, usage, signal);
        const up = await runUploadTest(profile, usage, signal);

        renderFinal(ping, jitter, down, up);
        updateDataUsedLine(usage.downloadBytes, usage.uploadBytes);
        setSpeedStatus("Speed test completed.", "success");
        copySpeedBtn.disabled = false;
    } catch (error) {
        if (error && error.name === "AbortError") {
            setPhase("Stopped", 0);
            updateDataUsedLine(usage.downloadBytes, usage.uploadBytes);
            setSpeedStatus("Speed test stopped due to mode change.", "error");
            return;
        }
        setPhase("Error", 0);
        updateDataUsedLine(usage.downloadBytes, usage.uploadBytes);
        setSpeedStatus(`Speed test failed: ${error.message || "Unknown error"}`, "error");
    } finally {
        if (activeTestController === controller) {
            activeTestController = null;
        }
        animateOrb(false);
        startSpeedBtn.disabled = false;
    }
}

async function copyResults() {
    const profile = getSelectedProfile();
    const providerText = detectedProvider || "Unknown";
    const connectionText = detectedConnectionType || "Unknown";
    const text = [
        `Mode: ${profile.label}`,
        `Connection: ${connectionText}`,
        `Provider: ${providerText}`,
        `Ping: ${pingResult.value}`,
        `Jitter: ${jitterResult.value}`,
        `Download: ${downloadResult.value}`,
        `Upload: ${uploadResult.value}`,
        `${speedDataUsed ? speedDataUsed.textContent : "Data used this test: --"}`
    ].join("\n");
    try {
        await navigator.clipboard.writeText(text);
        setSpeedStatus("Speed results copied.", "success");
    } catch {
        setSpeedStatus("Could not copy results.", "error");
    }
}

startSpeedBtn.addEventListener("click", runSpeedTest);
copySpeedBtn.addEventListener("click", copyResults);
if (speedModeButtons.length) {
    speedModeButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const mode = btn.dataset.mode;
            if (!mode || !SPEED_PROFILES[mode]) return;
            if (startSpeedBtn.disabled && activeTestController) {
                activeTestController.abort();
            }
            selectedMode = mode;
            speedModeButtons.forEach((item) => item.classList.toggle("is-active", item === btn));
            updateModeEta();
        });
    });
}

document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const target = event.target;
    const tag = (target && target.tagName ? target.tagName.toLowerCase() : "");
    const isEditableInput = tag === "input" && target && !target.readOnly;
    if (isEditableInput || tag === "textarea" || tag === "select" || (target && target.isContentEditable)) {
        return;
    }
    if (!startSpeedBtn.disabled) {
        event.preventDefault();
        runSpeedTest();
    }
});

updateModeEta();
detectNetworkContext();
