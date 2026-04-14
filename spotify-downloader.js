const spInput = document.getElementById("spInput");
const spParseBtn = document.getElementById("spParseBtn");
const spOpenWebBtn = document.getElementById("spOpenWebBtn");
const spOpenAppBtn = document.getElementById("spOpenAppBtn");
const spCopyUriBtn = document.getElementById("spCopyUriBtn");
const spCopyIdBtn = document.getElementById("spCopyIdBtn");
const spStatus = document.getElementById("spStatus");
const spType = document.getElementById("spType");
const spId = document.getElementById("spId");
const spEmbedWrap = document.getElementById("spEmbedWrap");

let parsed = null;

function setStatus(message, mode = "loading") {
    spStatus.textContent = message;
    if (mode === "error") spStatus.style.color = "#ef4444";
    else if (mode === "success") spStatus.style.color = "#22c55e";
    else spStatus.style.color = document.body.classList.contains("dark-mode") ? "#facc15" : "#b8860b";
}

function parseSpotifyInput(raw) {
    const value = raw.trim();
    if (!value) return null;

    const uriMatch = value.match(/^spotify:(track|album|playlist|artist|episode|show):([a-zA-Z0-9]+)$/i);
    if (uriMatch) {
        return {
            type: uriMatch[1].toLowerCase(),
            id: uriMatch[2],
            uri: `spotify:${uriMatch[1].toLowerCase()}:${uriMatch[2]}`,
            webUrl: `https://open.spotify.com/${uriMatch[1].toLowerCase()}/${uriMatch[2]}`
        };
    }

    let url;
    try {
        url = new URL(value);
    } catch {
        return null;
    }

    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    if (host !== "open.spotify.com" && host !== "spotify.link") {
        return null;
    }

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;

    const type = parts[0].toLowerCase();
    const id = parts[1];
    const allowed = ["track", "album", "playlist", "artist", "episode", "show"];
    if (!allowed.includes(type) || !id) return null;

    return {
        type,
        id,
        uri: `spotify:${type}:${id}`,
        webUrl: `https://open.spotify.com/${type}/${id}`
    };
}

function updateUI() {
    const ready = Boolean(parsed);
    spOpenWebBtn.disabled = !ready;
    spOpenAppBtn.disabled = !ready;
    spCopyUriBtn.disabled = !ready;
    spCopyIdBtn.disabled = !ready;

    if (!parsed) {
        spType.textContent = "--";
        spId.textContent = "--";
        spEmbedWrap.classList.add("hidden");
        spEmbedWrap.innerHTML = "";
        return;
    }

    spType.textContent = parsed.type;
    spId.textContent = parsed.id;

    const iframe = document.createElement("iframe");
    iframe.loading = "lazy";
    iframe.allow = "clipboard-write; encrypted-media; fullscreen; picture-in-picture";
    iframe.src = `https://open.spotify.com/embed/${parsed.type}/${parsed.id}`;

    spEmbedWrap.innerHTML = "";
    spEmbedWrap.appendChild(iframe);
    spEmbedWrap.classList.remove("hidden");
}

async function copyText(value, successMessage) {
    try {
        await navigator.clipboard.writeText(value);
        setStatus(successMessage, "success");
    } catch {
        setStatus("Clipboard was blocked by browser permissions.", "error");
    }
}

function analyze() {
    parsed = parseSpotifyInput(spInput.value);

    if (!parsed) {
        updateUI();
        setStatus("Invalid Spotify URL/URI. Use open.spotify.com link or spotify:type:id URI.", "error");
        return;
    }

    updateUI();
    setStatus("Link parsed successfully.", "success");
}

spParseBtn.addEventListener("click", analyze);
spInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        analyze();
    }
});

spOpenWebBtn.addEventListener("click", () => {
    if (!parsed) return;
    window.open(parsed.webUrl, "_blank", "noopener,noreferrer");
    setStatus("Opened in Spotify web player.", "success");
});

spOpenAppBtn.addEventListener("click", () => {
    if (!parsed) return;
    window.location.href = parsed.uri;
});

spCopyUriBtn.addEventListener("click", () => {
    if (!parsed) return;
    copyText(parsed.uri, "Spotify URI copied.");
});

spCopyIdBtn.addEventListener("click", () => {
    if (!parsed) return;
    copyText(parsed.id, "Spotify ID copied.");
});
