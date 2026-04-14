const tagsForm = document.getElementById("tagsForm");
const videoUrlInput = document.getElementById("videoUrl");
const youtubeApiKeyInput = document.getElementById("youtubeApiKey");
const copyTagsBtn = document.getElementById("copyTagsBtn");
const tagsStatus = document.getElementById("tagsStatus");
const tagsResult = document.getElementById("tagsResult");
const tagsCount = document.getElementById("tagsCount");
const tagsList = document.getElementById("tagsList");

let currentTags = [];
let autoFetchTimer;
let lastFetchedVideoId = "";

function setTagsStatus(message, isError = false) {
    tagsStatus.textContent = message;
    tagsStatus.style.color = isError ? "#f87171" : "#fbbf24";
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
        const queryId = parsed.searchParams.get("v");
        if (queryId) {
            return queryId;
        }

        const parts = parsed.pathname.split("/").filter(Boolean);
        const marker = ["shorts", "embed", "live"].find((item) => parts.includes(item));
        if (marker) {
            const index = parts.indexOf(marker);
            return parts[index + 1] || "";
        }
    }

    return "";
}

async function fetchWithTimeout(url, timeoutMs = 6500) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal });
        return response;
    } finally {
        clearTimeout(timeout);
    }
}

async function fetchTextFromAnySource(url) {
    const cleaned = url.replace(/^https?:\/\//i, "");
    const sources = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        `https://r.jina.ai/http://${cleaned}`,
        `https://corsproxy.io/?${encodeURIComponent(url)}`
    ];

    let lastError;
    for (const sourceUrl of sources) {
        try {
            const response = await fetchWithTimeout(sourceUrl);
            if (!response.ok) {
                throw new Error(`source ${response.status}`);
            }
            const text = await response.text();
            if (!text || text.length < 30) {
                throw new Error("empty response");
            }
            return text;
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error("all sources failed");
}

async function fetchJsonFromAnySource(url) {
    const cleaned = url.replace(/^https?:\/\//i, "");
    const sources = [
        url,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        `https://corsproxy.io/?${encodeURIComponent(url)}`
    ];

    let lastError;
    for (const sourceUrl of sources) {
        try {
            const response = await fetchWithTimeout(sourceUrl);
            if (!response.ok) {
                throw new Error(`source ${response.status}`);
            }
            const text = await response.text();
            return JSON.parse(text);
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error("json fetch failed");
}

function parseTagsFromHtml(html) {
    const tags = [];

    const keywordArrayMatch = html.match(/"keywords":(\[[^\]]*\])/) || html.match(/\\"keywords\\":(\[[^\]]*\])/);
    if (keywordArrayMatch?.[1]) {
        try {
            const jsonBlock = keywordArrayMatch[1].replace(/\\"/g, "\"");
            const parsed = JSON.parse(jsonBlock);
            if (Array.isArray(parsed)) {
                parsed.forEach((item) => {
                    if (typeof item === "string" && item.trim()) {
                        tags.push(item.trim());
                    }
                });
            }
        } catch {}
    }

    if (!tags.length) {
        const metaMatch = html.match(/<meta\s+name=["']keywords["']\s+content=["']([^"']*)["']/i);
        if (metaMatch?.[1]) {
            metaMatch[1]
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
                .forEach((item) => tags.push(item));
        }
    }

    if (!tags.length) {
        const jsonLdStringMatch = html.match(/"keywords":"([^"]+)"/i);
        if (jsonLdStringMatch?.[1]) {
            jsonLdStringMatch[1]
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
                .forEach((item) => tags.push(item));
        }
    }

    return Array.from(new Set(tags));
}

async function fetchTagsFromApi(videoId) {
    const endpoints = [
        `https://yt.lemnoslife.com/noKey/videos?part=snippet&id=${encodeURIComponent(videoId)}`,
        `https://piped.video/api/v1/videos/${encodeURIComponent(videoId)}`,
        `https://inv.nadeko.net/api/v1/videos/${encodeURIComponent(videoId)}`,
        `https://invidious.privacyredirect.com/api/v1/videos/${encodeURIComponent(videoId)}`
    ];

    const collected = new Set();

    for (const endpoint of endpoints) {
        try {
            const data = await fetchJsonFromAnySource(endpoint);
            const candidates = [];

            if (Array.isArray(data?.items?.[0]?.snippet?.tags)) {
                candidates.push(...data.items[0].snippet.tags);
            }
            if (Array.isArray(data?.tags)) {
                candidates.push(...data.tags);
            }
            if (Array.isArray(data?.keywords)) {
                candidates.push(...data.keywords);
            }
            if (typeof data?.keywords === "string") {
                candidates.push(...data.keywords.split(","));
            }

            candidates
                .map((item) => (typeof item === "string" ? item.trim() : ""))
                .filter(Boolean)
                .forEach((item) => collected.add(item));

            if (collected.size) {
                return Array.from(collected);
            }
        } catch {
            continue;
        }
    }

    return [];
}

function looksLikeYouTubeApiKey(value) {
    return /^AIza[0-9A-Za-z_-]{20,}$/.test(value.trim());
}

async function fetchTagsFromOfficialApi(videoId, apiKey) {
    const endpoint = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(videoId)}&key=${encodeURIComponent(apiKey)}`;
    const data = await fetchJsonFromAnySource(endpoint);
    const tags = (data?.items?.[0]?.snippet?.tags || [])
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean);
    return Array.from(new Set(tags));
}

function renderTags(tags) {
    tagsList.innerHTML = "";
    tags.forEach((tag) => {
        const chip = document.createElement("span");
        chip.className = "tag-chip";
        chip.textContent = tag;
        tagsList.appendChild(chip);
    });
}

function clearTags() {
    currentTags = [];
    tagsCount.textContent = "";
    tagsList.innerHTML = "";
    tagsResult.classList.add("hidden");
}

async function fetchTagsForCurrentInput(showInvalidError = false) {
    const videoId = extractVideoId(videoUrlInput.value);
    if (!videoId || videoId.length !== 11) {
        clearTags();
        if (showInvalidError) {
            setTagsStatus("Please enter a valid YouTube video URL or 11-character video ID.", true);
        } else if (!videoUrlInput.value.trim()) {
            setTagsStatus("");
        }
        lastFetchedVideoId = "";
        return;
    }

    if (lastFetchedVideoId === videoId) {
        return;
    }

    lastFetchedVideoId = videoId;
    setTagsStatus("Fetching tags...");
    try {
        let tags = [];

        const apiKey = youtubeApiKeyInput ? youtubeApiKeyInput.value.trim() : "";
        if (apiKey && looksLikeYouTubeApiKey(apiKey)) {
            try {
                tags = await fetchTagsFromOfficialApi(videoId, apiKey);
            } catch {
                tags = [];
            }
        }

        if (!tags.length) {
            try {
                tags = await fetchTagsFromApi(videoId);
            } catch {
                tags = [];
            }
        }

        if (!tags.length) {
            const html = await fetchTextFromAnySource(`https://www.youtube.com/watch?v=${videoId}`);
            tags = parseTagsFromHtml(html);
        }

        if (!tags.length) {
            clearTags();
            setTagsStatus("No tags found or tags are hidden by source restrictions.", true);
            lastFetchedVideoId = "";
            return;
        }

        currentTags = tags;
        renderTags(tags);
        tagsCount.textContent = `${tags.length} tag(s) found`;
        tagsResult.classList.remove("hidden");
        setTagsStatus("Tags fetched successfully.");
    } catch {
        clearTags();
        setTagsStatus("Failed to fetch tags. Try another video URL.", true);
        lastFetchedVideoId = "";
    }
}

tagsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await fetchTagsForCurrentInput(true);
});

copyTagsBtn.addEventListener("click", async () => {
    if (!currentTags.length) {
        setTagsStatus("No tags to copy yet.", true);
        return;
    }

    const text = currentTags.join(", ");
    try {
        await navigator.clipboard.writeText(text);
        setTagsStatus("Tags copied to clipboard.");
    } catch {
        setTagsStatus("Clipboard copy blocked. Copy manually from tags list.", true);
    }
});

videoUrlInput.addEventListener("input", () => {
    clearTimeout(autoFetchTimer);
    autoFetchTimer = setTimeout(() => {
        fetchTagsForCurrentInput(false);
    }, 300);
});

videoUrlInput.addEventListener("paste", () => {
    setTimeout(() => {
        fetchTagsForCurrentInput(false);
    }, 0);
});
