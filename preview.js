const fileInput = document.getElementById("tvpFileInput");
const logoInput = document.getElementById("tvpLogoInput");
const logoUploadBtn = document.getElementById("tvpLogoUploadBtn");
const logoPreview = document.getElementById("tvpLogoPreview");
const viewYoutubeBtn = document.getElementById("tvpViewYoutube");
const viewSizeBtn = document.getElementById("tvpViewSize");
const rememberToggle = document.getElementById("tvpRememberProfile");
const layoutButtons = Array.from(document.querySelectorAll(".tvp-layout-toggle button[data-layout]"));
const shuffleBtn = document.getElementById("tvpShuffleBtn");
const resetBtn = document.getElementById("tvpResetBtn");
const randomThumbBtn = document.getElementById("tvpRandomThumbBtn");
const videoTitleInput = document.getElementById("tvpVideoTitle");
const channelNameInput = document.getElementById("tvpChannelName");
const thumbList = document.getElementById("tvpThumbList");
const thumbCount = document.getElementById("tvpThumbCount");
const canvas = document.getElementById("tvpCanvas");
const desktopCanvas = document.getElementById("tvpDesktopCanvas");
const mobileCanvas = document.getElementById("tvpMobileCanvas");
const desktopPanel = document.getElementById("tvpDesktopPanel");
const canvasWrap = document.querySelector(".tvp-canvas-wrap");
const statusLabel = document.getElementById("tvpStatus");

const STORAGE_KEY = "tvp_user_profile_v2";
const DEFAULT_TITLE = "";
const DEFAULT_CHANNEL = "Your Channel Name";

function normalizeChannelName(value) {
    const normalized = String(value || "").replace(/\s+/g, " ").trim();
    if (!normalized) return DEFAULT_CHANNEL;
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

const defaultThumbs = [
    "./assets/dream-hardcore.jpg",
    "https://picsum.photos/seed/tvp-custom-2/1280/720",
    "https://picsum.photos/seed/tvp-custom-3/1280/720"
];

function makeLogo(label, bg, fg = "#ffffff") {
    const safe = (label || "CH").slice(0, 3).toUpperCase();
    const svg = `
<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'>
<defs>
<linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
<stop offset='0%' stop-color='${bg}'/>
<stop offset='100%' stop-color='#101010'/>
</linearGradient>
</defs>
<rect width='96' height='96' rx='48' fill='url(#g)'/>
<text x='48' y='56' text-anchor='middle' font-family='Arial, sans-serif' font-size='34' font-weight='700' fill='${fg}'>${safe}</text>
</svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const defaultPrimaryLogo = makeLogo("DP", "#2563eb");

const creatorSeed = [
    {
        title: "$1 vs $100,000,000 Car!",
        channel: "MrBeast",
        stats: "128M views - 8 months ago",
        avatar: "./assets/mr-beast-logo.jpg",
        thumb: "./assets/mrbeast-car-thumbnail.jpg",
        duration: "19:12"
    },
    {
        title: "Official Video: Humnava Mere Song | Jubin Nautiyal | Manoj Muntashir | Rocky - Shiv | Bhushan Kumar",
        channel: "T-Series",
        stats: "1.2B views - 7 years ago",
        avatar: "./assets/tseries-logo.jpg",
        thumb: "./assets/tseries-humnava-thumbnail.jpg",
        duration: "6:47",
        durationIcon: "music"
    },
    {
        title: "Kaun Hain Voh - Full Video | Baahubali - The  Beginning | Prabhas | Kailash K | MM Kreem, Manoj M",
        channel: "Zee Music Company",
        stats: "712M views - 10 years ago",
        avatar: "https://yt3.ggpht.com/zGnrFUqmF6Xp2tM8ecG9sVXyHjJUrqa7GnNV_kATAdAvSwfgIg7693GURHASA7C6OPK3YmGZ=s176-c-k-c0x00ffffff-no-rj",
        thumb: "https://i.ytimg.com/vi/WibcvWT7KQQ/maxresdefault.jpg",
        duration: "4:01",
        durationIcon: "music"
    },
    {
        title: "I Survived 100 Days in Hardcore",
        channel: "Dream",
        stats: "22M views - 5 days ago",
        avatar: "./assets/dream-logo.jpg",
        thumb: "./assets/dream-hardcore.jpg",
        duration: "28:41"
    },
    {
        title: "World's Fastest Football Challenge",
        channel: "Dude Perfect",
        stats: "14M views - 1 month ago",
        avatar: "./assets/dude-perfect-logo.jpg",
        thumb: "./assets/dude-perfect-football-thumbnail.jpg",
        duration: "16:24"
    },
    {
        title: "24 Hour Family Challenge Compilation",
        channel: "Vlad and Niki",
        stats: "31M views - 3 months ago",
        avatar: "./assets/vlad-niki-logo.jpg",
        thumb: "./assets/vlad-niki-family-thumbnail.jpg",
        duration: "22:08"
    },
    {
        title: "Wheels on the Bus | @CoComelon Nursery Rhymes & Kids Songs",
        channel: "Cocomelon - Nursery Rhymes",
        stats: "8.7B views - 7 years ago",
        avatar: "https://yt3.ggpht.com/yiljI_XQcX8X0p_E2S0APGrUs7tHBMukf5_3dhVzhbH-z5uhzpt88tUopQa7ngVwO1nGAAnr6A=s176-c-k-c0x00ffffff-no-rj",
        thumb: "https://i.ytimg.com/vi/e_04ZrNroTo/maxresdefault.jpg",
        duration: "3:49"
    },
    {
        title: "Why This Gadget Went Viral Overnight",
        channel: "MKBHD",
        stats: "9.1M views - 6 days ago",
        avatar: "./assets/mkbhd-logo.jpg",
        thumb: "./assets/mkbhd-gadget-thumbnail.jpg",
        duration: "12:31"
    },
    {
        title: "Nastya and Dad open boxes with surprises to learn the alphabet",
        channel: "Like Nastya",
        stats: "883M views - 5 years ago",
        avatar: "https://yt3.ggpht.com/ytc/AIdro_mVv_9v6t_6ni8YIQZWxmabSsNCVTyGQ48CHQ8-2W-OQtM=s176-c-k-c0x00ffffff-no-rj",
        thumb: "https://i.ytimg.com/vi/WN1eYcw6fQ4/maxresdefault.jpg",
        duration: "10:38"
    }
];

const sizeTemplates = [
    { label: "Homepage Large", size: "360x205", kind: "stack" },
    { label: "Homepage Small", size: "240x135", kind: "stack" },
    { label: "Sidebar Suggested Video", size: "168x94", kind: "inline" },
    { label: "Search Result Large", size: "360x202", kind: "inline" },
    { label: "Search Result Small", size: "240x135", kind: "inline" },
    { label: "Channel Page", size: "270x150", kind: "stack" },
    { label: "Channel Page Small", size: "198x112", kind: "stack" },
    { label: "Watch Later", size: "540x106", kind: "banner" },
    { label: "Mobile Homepage", size: "320x180", kind: "stack" },
    { label: "Mobile Suggested", size: "168x94", kind: "inline" },
    { label: "Mobile Search", size: "320x180", kind: "stack" },
    { label: "Apple TV Recommended", size: "512x288", kind: "stack" }
];

const state = {
    view: "youtube",
    layout: "desktop",
    dark: true,
    feedFilter: "all",
    feedShuffleOrder: [],
    rememberProfile: false,
    title: DEFAULT_TITLE,
    channel: DEFAULT_CHANNEL,
    profileLogo: defaultPrimaryLogo,
    thumbs: [],
    activeThumbId: "",
    creatorItems: [],
    objectUrls: new Set()
};

function id(prefix = "t") {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function setStatus(message, isError = false) {
    if (!statusLabel) return;
    statusLabel.textContent = message;
    statusLabel.style.color = isError ? "#fca5a5" : "#93c5fd";
}

function isEditingTarget(target) {
    if (!(target instanceof Element)) return false;
    const tag = target.tagName;
    return target.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

async function requestFullscreenSafe(element) {
    if (!element) return false;
    const candidate = element;
    if (candidate.requestFullscreen) {
        await candidate.requestFullscreen();
        return true;
    }
    if (candidate.webkitRequestFullscreen) {
        candidate.webkitRequestFullscreen();
        return true;
    }
    return false;
}

async function exitFullscreenSafe() {
    if (document.exitFullscreen) {
        await document.exitFullscreen();
        return true;
    }
    if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
        return true;
    }
    return false;
}

async function togglePreviewFullscreen() {
    const isFull = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
    if (isFull) {
        const exited = await exitFullscreenSafe();
        if (exited) setStatus("Fullscreen closed.");
        return;
    }

    if (desktopPanel && !desktopPanel.open) desktopPanel.open = true;
    const target = desktopCanvas || desktopPanel || canvasWrap || canvas;
    const entered = await requestFullscreenSafe(target);
    if (entered) setStatus("Fullscreen opened. Press Ctrl+Shift+F to close.");
}

function shuffle(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function buildCreatorItems() {
    const pinned = creatorSeed.filter((item) => item.channel === "T-Series");
    const rest = shuffle(creatorSeed.filter((item) => item.channel !== "T-Series"));
    return [...pinned, ...rest].map(toRuntimeItem);
}

function getActiveThumb() {
    return state.thumbs.find((thumb) => thumb.id === state.activeThumbId) || state.thumbs[0] || null;
}

function getPrimaryLogo() {
    return state.profileLogo || defaultPrimaryLogo;
}

function loadStoredProfile() {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const shouldRemember = Boolean(parsed?.remember);
        state.rememberProfile = shouldRemember;
        if (!shouldRemember) return;
        if (typeof parsed.channel === "string" && parsed.channel.trim()) {
            state.channel = normalizeChannelName(parsed.channel);
        }
        if (typeof parsed.profileLogo === "string" && parsed.profileLogo.trim()) {
            state.profileLogo = parsed.profileLogo;
        }
    } catch (error) {
        setStatus("Saved profile could not be loaded.", true);
    }
}

function persistProfile() {
    if (!state.rememberProfile) return;
    try {
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                remember: true,
                channel: state.channel,
                profileLogo: state.profileLogo
            })
        );
    } catch (error) {
        setStatus("Profile was applied but could not be saved locally.", true);
    }
}

function clearStoredProfile() {
    try {
        window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        setStatus("Could not clear saved profile.", true);
    }
}

function setRememberProfile(shouldRemember) {
    state.rememberProfile = Boolean(shouldRemember);
    if (rememberToggle) rememberToggle.checked = state.rememberProfile;

    if (state.rememberProfile) {
        persistProfile();
        setStatus("Channel name and logo will be remembered.");
        return;
    }

    clearStoredProfile();
    state.profileLogo = defaultPrimaryLogo;
    renderCanvas();
    setStatus("Remember is off. Default profile logo is active.");
}

function createObjectUrl(file) {
    const objectUrl = URL.createObjectURL(file);
    state.objectUrls.add(objectUrl);
    return objectUrl;
}

function revokeObjectUrl(url) {
    if (!url || !state.objectUrls.has(url)) return;
    URL.revokeObjectURL(url);
    state.objectUrls.delete(url);
}

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Could not read file."));
        reader.readAsDataURL(file);
    });
}

function pickImageFile() {
    return new Promise((resolve) => {
        const picker = document.createElement("input");
        picker.type = "file";
        picker.accept = "image/*";
        picker.className = "sr-only-input";
        picker.addEventListener(
            "change",
            () => {
                const file = (picker.files || [])[0] || null;
                resolve(file);
            },
            { once: true }
        );
        picker.click();
    });
}

function toRuntimeItem(seed) {
    return {
        id: id("v"),
        defaultTitle: seed.title,
        defaultChannel: seed.channel,
        defaultStats: seed.stats,
        defaultAvatar: seed.avatar,
        defaultThumb: seed.thumb,
        duration: seed.duration || "14:57",
        durationIcon: seed.durationIcon || "",
        customTitle: "",
        customThumb: "",
        customThumbObjectUrl: "",
        forceProfileChannel: false
    };
}

function createPrimaryItem() {
    const active = getActiveThumb();
    return {
        id: "primary",
        isPrimary: true,
        title: state.title || DEFAULT_TITLE,
        channel: state.channel || DEFAULT_CHANNEL,
        stats: "Recommended for you",
        avatar: getPrimaryLogo(),
        thumb: active ? active.url : defaultThumbs[0],
        duration: "14:57"
    };
}

function shouldUseProfileBrand(item) {
    if (!item || item.isPrimary) return true;
    return Boolean(item.forceProfileChannel || item.customTitle || item.customThumb);
}

function getItemTitle(item) {
    if (!item) return DEFAULT_TITLE;
    if (item.isPrimary) return item.title;
    return item.customTitle || item.defaultTitle;
}

function getItemThumb(item) {
    if (!item) return defaultThumbs[0];
    if (item.isPrimary) return item.thumb;
    return item.customThumb || item.defaultThumb;
}

function getItemChannel(item) {
    if (!item) return DEFAULT_CHANNEL;
    if (item.isPrimary) return item.channel;
    return shouldUseProfileBrand(item) ? (state.channel || DEFAULT_CHANNEL) : item.defaultChannel;
}

function getItemAvatar(item) {
    if (!item) return defaultPrimaryLogo;
    if (item.isPrimary || shouldUseProfileBrand(item)) return getPrimaryLogo();
    return item.defaultAvatar || makeLogo("CH", "#334155");
}

function getItemStats(item) {
    if (!item) return "";
    if (item.isPrimary) return item.stats || "Recommended for you";
    return item.defaultStats || "";
}

function normalizeItems() {
    if (!state.creatorItems.length) {
        state.creatorItems = buildCreatorItems();
    }
    return [createPrimaryItem(), ...state.creatorItems];
}

async function updateProfileLogoFromFile(file) {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    if (!dataUrl) return;
    state.profileLogo = dataUrl;
    persistProfile();
    renderCanvas();
}

async function handleThumbUpload(item) {
    const file = await pickImageFile();
    if (!file) return;

    if (item.isPrimary) {
        const objectUrl = createObjectUrl(file);
        const created = addThumb(objectUrl, objectUrl);
        state.activeThumbId = created.id;
        syncCounts();
        renderThumbList();
        renderCanvas();
        setStatus("Primary thumbnail changed.");
        return;
    }

    revokeObjectUrl(item.customThumbObjectUrl);
    item.customThumbObjectUrl = "";
    item.customThumb = createObjectUrl(file);
    item.customThumbObjectUrl = item.customThumb;
    renderCanvas();
    setStatus("Video thumbnail changed. Channel name/logo now follows your profile for this video.");
}

function clearCustomThumb(item) {
    if (!item || item.isPrimary || !item.customThumb) return;
    revokeObjectUrl(item.customThumbObjectUrl);
    item.customThumb = "";
    item.customThumbObjectUrl = "";
    renderCanvas();
    setStatus("Custom thumbnail removed from this video.");
}

function clearCustomTitle(item) {
    if (!item || item.isPrimary || !item.customTitle) return;
    item.customTitle = "";
    renderCanvas();
    setStatus("Custom title removed from this video.");
}

function toggleChannelProfile(item) {
    if (!item || item.isPrimary) return;
    const before = shouldUseProfileBrand(item);
    if (before) {
        item.forceProfileChannel = false;
        renderCanvas();
        if (item.customTitle || item.customThumb) {
            setStatus("Profile channel/logo stays because this video still has custom title or thumbnail.");
        } else {
            setStatus("Video reverted to its default channel logo and name.");
        }
        return;
    }

    item.forceProfileChannel = true;
    renderCanvas();
    setStatus("Profile channel/logo applied to this video.");
}

function startInlineTitleEdit(titleEl, item) {
    if (!titleEl || titleEl.dataset.editing === "1") return;
    titleEl.dataset.editing = "1";
    titleEl.classList.add("is-editing");

    const original = getItemTitle(item);
    const editor = document.createElement("input");
    editor.type = "text";
    editor.className = "tvp-inline-title-input";
    editor.maxLength = 120;
    editor.value = original;

    titleEl.style.display = "none";
    titleEl.insertAdjacentElement("afterend", editor);
    editor.focus();
    editor.select();

    const finish = (save = true) => {
        if (titleEl.dataset.editing !== "1") return;
        titleEl.dataset.editing = "0";
        titleEl.classList.remove("is-editing");
        titleEl.style.display = "";

        const next = (editor.value || "").trim();
        editor.remove();

        if (save) {
            let changed = false;
            if (item.isPrimary) {
                const prev = state.title || DEFAULT_TITLE;
                state.title = next || DEFAULT_TITLE;
                if (videoTitleInput) videoTitleInput.value = state.title;
                changed = state.title !== prev;
            } else {
                const prev = item.customTitle || "";
                const defaultTitle = String(item.defaultTitle || "").trim();
                item.customTitle = next && next !== defaultTitle ? next : "";
                changed = item.customTitle !== prev;
            }
            setStatus(changed ? "Title updated." : "Title unchanged.");
        } else {
            titleEl.textContent = original;
        }
        renderCanvas();
    };

    editor.addEventListener("blur", () => finish(true), { once: true });
    editor.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            finish(true);
        } else if (event.key === "Escape") {
            event.preventDefault();
            finish(false);
        }
    });
}

function startInlineChannelEdit(channelEl) {
    if (!channelEl || channelEl.dataset.editing === "1") return;
    channelEl.dataset.editing = "1";

    const original = state.channel || DEFAULT_CHANNEL;
    const editor = document.createElement("input");
    editor.type = "text";
    editor.className = "tvp-inline-channel-input";
    editor.maxLength = 80;
    editor.value = original;

    channelEl.style.display = "none";
    channelEl.insertAdjacentElement("afterend", editor);
    editor.focus();
    editor.select();

    const finish = (save = true) => {
        if (channelEl.dataset.editing !== "1") return;
        channelEl.dataset.editing = "0";
        channelEl.style.display = "";
        const next = (editor.value || "").trim();
        editor.remove();

        if (save) {
            state.channel = normalizeChannelName(next);
            if (channelNameInput) channelNameInput.value = state.channel;
            persistProfile();
            renderCanvas();
            setStatus("Channel name updated.");
        } else {
            renderCanvas();
        }
    };

    editor.addEventListener("blur", () => finish(true), { once: true });
    editor.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            finish(true);
        } else if (event.key === "Escape") {
            event.preventDefault();
            finish(false);
        }
    });
}

function createMetaBlock(item, withDescription = false) {
    const wrap = document.createElement("div");
    wrap.className = "tvp-meta";

    const avatar = document.createElement("img");
    avatar.className = "tvp-avatar";
    avatar.src = getItemAvatar(item);
    avatar.alt = `${getItemChannel(item)} logo`;

    const text = document.createElement("div");
    text.className = "tvp-meta-text";

    const titleWrap = document.createElement("div");
    titleWrap.className = "tvp-title-row";

    const title = document.createElement("p");
    title.className = "tvp-video-title";
    title.textContent = getItemTitle(item);
    title.title = "Double-click to edit title directly";
    title.addEventListener("dblclick", () => startInlineTitleEdit(title, item));
    titleWrap.appendChild(title);

    if (!item.isPrimary && item.customTitle) {
        const clearTitleBtn = document.createElement("button");
        clearTitleBtn.type = "button";
        clearTitleBtn.className = "tvp-title-clear";
        clearTitleBtn.textContent = "-";
        clearTitleBtn.title = "Remove custom title";
        clearTitleBtn.setAttribute("aria-label", "Remove custom title");
        clearTitleBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            clearCustomTitle(item);
        });
        titleWrap.appendChild(clearTitleBtn);
    }

    const channelWrap = document.createElement("div");
    channelWrap.className = "tvp-channel-row";

    const channel = document.createElement("p");
    channel.className = "tvp-video-channel";
    const channelName = document.createElement("span");
    channelName.className = "tvp-channel-name";
    channelName.textContent = getItemChannel(item);

    const channelVerify = document.createElement("span");
    channelVerify.className = "tvp-channel-verify";
    channelVerify.textContent = "\u2713";
    channelVerify.setAttribute("aria-hidden", "true");

    channel.appendChild(channelName);
    channel.appendChild(channelVerify);
    channelWrap.appendChild(channel);

    const stats = document.createElement("p");
    stats.className = "tvp-video-stats";
    stats.textContent = getItemStats(item);

    text.appendChild(titleWrap);
    text.appendChild(channelWrap);
    text.appendChild(stats);

    if (withDescription) {
        const desc = document.createElement("p");
        desc.className = "tvp-video-desc";
        desc.textContent = "Real-time style preview for title balance, logo visibility, and card readability.";
        text.appendChild(desc);
    }

    if (item.isPrimary) {
        const avatarBtn = document.createElement("button");
        avatarBtn.type = "button";
        avatarBtn.className = "tvp-logo-upload-trigger is-avatar";
        avatarBtn.setAttribute("aria-label", "Upload channel logo");
        avatarBtn.addEventListener("click", () => logoInput?.click());
        avatarBtn.appendChild(avatar);
        wrap.appendChild(avatarBtn);
    } else {
        wrap.appendChild(avatar);
    }

    wrap.appendChild(text);
    return wrap;
}

function createThumbFigure(item, ratioClass = "is-16-9") {
    const fig = document.createElement("figure");
    fig.className = `tvp-thumb ${ratioClass}`;

    const img = document.createElement("img");
    img.src = getItemThumb(item);
    img.alt = getItemTitle(item);
    img.loading = "lazy";
    fig.appendChild(img);

    const stamp = document.createElement("span");
    stamp.className = "tvp-duration";
    if (item.durationIcon === "music") {
        const icon = document.createElement("span");
        icon.className = "tvp-duration-music";
        icon.textContent = "♪";
        icon.setAttribute("aria-hidden", "true");
        stamp.appendChild(icon);
    }
    const durationText = document.createElement("span");
    durationText.textContent = item.duration || "14:57";
    stamp.appendChild(durationText);
    fig.appendChild(stamp);

    const uploadBtn = document.createElement("button");
    uploadBtn.type = "button";
    uploadBtn.className = "tvp-thumb-edit";
    uploadBtn.textContent = "+";
    uploadBtn.title = "Change thumbnail";
    uploadBtn.setAttribute("aria-label", "Change thumbnail");
    uploadBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        handleThumbUpload(item);
    });
    fig.appendChild(uploadBtn);

    if (!item.isPrimary && item.customThumb) {
        const clearBtn = document.createElement("button");
        clearBtn.type = "button";
        clearBtn.className = "tvp-thumb-clear";
        clearBtn.textContent = "-";
        clearBtn.title = "Remove custom thumbnail";
        clearBtn.setAttribute("aria-label", "Remove custom thumbnail");
        clearBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            clearCustomThumb(item);
        });
        fig.appendChild(clearBtn);
    }

    return fig;
}

function isCompactViewport() {
    const canvasWrap = document.querySelector(".tvp-canvas-wrap");
    const width = canvasWrap?.clientWidth || window.innerWidth;
    return width <= 640;
}

function iconSvg(name) {
    const map = {
        menu: "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M3 6h18M3 12h18M3 18h18'/></svg>",
        home: "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z'/></svg>",
        shorts: "<img class='tvp-yt-shorts-icon' src='./assets/shorts-icon.png' alt='' aria-hidden='true'>",
        subs: "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 6h16v12H4zM10 10l5 2-5 2z'/></svg>",
        you: "<svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='8' r='3.5'/><path d='M4.5 20c1.2-3.1 4-5 7.5-5s6.3 1.9 7.5 5'/></svg>",
        search: "<svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='11' cy='11' r='6'/><path d='m20 20-4.2-4.2'/></svg>",
        mic: "<svg viewBox='0 0 24 24' aria-hidden='true'><rect x='9' y='4' width='6' height='10' rx='3'/><path d='M6 11a6 6 0 0 0 12 0M12 17v3'/></svg>",
        plus: "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 5v14M5 12h14'/></svg>",
        bell: "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 4a4 4 0 0 0-4 4v3.4l-1.7 2.9A1 1 0 0 0 7.2 16h9.6a1 1 0 0 0 .9-1.5L16 11.4V8a4 4 0 0 0-4-4Z'/><path d='M10 18a2 2 0 0 0 4 0'/></svg>",
        kebab: "<svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='6' r='1.8'/><circle cx='12' cy='12' r='1.8'/><circle cx='12' cy='18' r='1.8'/></svg>"
    };
    return map[name] || "";
}

function renderDesktopShell(items, compact = false) {
    const shell = document.createElement("section");
    shell.className = "tvp-yt-shell";
    if (compact) shell.classList.add("is-compact");

    const top = document.createElement("header");
    top.className = "tvp-yt-topbar";
    if (compact) {
        top.innerHTML = `
            <button class="tvp-yt-icon-btn" type="button" aria-label="Menu">${iconSvg("menu")}</button>
            <div class="tvp-yt-logo"><span class="yt-word">U</span><span class="yt-tail">Tube</span></div>
            <div class="tvp-yt-search">
                <span class="tvp-yt-search-label">Search</span>
                <span class="tvp-yt-search-btn" aria-hidden="true">${iconSvg("search")}</span>
            </div>
            <div class="tvp-yt-top-actions">
                <button class="tvp-yt-icon-btn tvp-yt-icon-search" type="button" aria-label="Search">${iconSvg("search")}</button>
                <button class="tvp-yt-icon-btn tvp-yt-icon-mic" type="button" aria-label="Voice">${iconSvg("mic")}</button>
                <button class="tvp-yt-create-btn" type="button" aria-label="Create">${iconSvg("plus")}<span>Create</span></button>
                <button class="tvp-yt-icon-btn tvp-yt-icon-bell" type="button" aria-label="Notifications">${iconSvg("bell")}</button>
                <div class="tvp-yt-profile-top">
                    <div class="tvp-yt-avatar-top"><img src="${getPrimaryLogo()}" alt="profile"></div>
                    <span class="tvp-yt-profile-name"></span>
                </div>
            </div>
        `;
    } else {
        top.innerHTML = `
            <button class="tvp-yt-icon-btn" type="button" aria-label="Menu">${iconSvg("menu")}</button>
            <div class="tvp-yt-logo"><span class="yt-word">U</span><span class="yt-tail">Tube</span></div>
            <div class="tvp-yt-search">
                <span class="tvp-yt-search-label">Search</span>
                <span class="tvp-yt-search-btn" aria-hidden="true">${iconSvg("search")}</span>
            </div>
            <div class="tvp-yt-top-actions">
                <button class="tvp-yt-icon-btn tvp-yt-icon-mic" type="button" aria-label="Voice">${iconSvg("mic")}</button>
                <button class="tvp-yt-create-btn" type="button" aria-label="Create">${iconSvg("plus")}<span>Create</span></button>
                <button class="tvp-yt-icon-btn tvp-yt-icon-bell" type="button" aria-label="Notifications">${iconSvg("bell")}</button>
                <div class="tvp-yt-profile-top">
                    <div class="tvp-yt-avatar-top"><img src="${getPrimaryLogo()}" alt="profile"></div>
                    <span class="tvp-yt-profile-name"></span>
                </div>
            </div>
        `;
    }

    const topAvatar = top.querySelector(".tvp-yt-avatar-top");
    const topProfileName = top.querySelector(".tvp-yt-profile-name");
    if (topProfileName) {
        topProfileName.textContent = state.channel || DEFAULT_CHANNEL;
        topProfileName.title = state.channel || DEFAULT_CHANNEL;
        topProfileName.style.cursor = "text";
        topProfileName.addEventListener("dblclick", () => startInlineChannelEdit(topProfileName));
    }
    if (topAvatar) {
        topAvatar.style.cursor = "pointer";
        topAvatar.setAttribute("role", "button");
        topAvatar.setAttribute("tabindex", "0");
        topAvatar.setAttribute("aria-label", "Upload profile logo");
        topAvatar.addEventListener("click", () => logoInput?.click());
        topAvatar.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                logoInput?.click();
            }
        });
    }

    const main = document.createElement("div");
    main.className = "tvp-yt-main";

    const nav = document.createElement("aside");
    nav.className = "tvp-yt-nav";
    [
        { key: "home", label: "Home", active: true },
        { key: "shorts", label: "Shorts" },
        { key: "subs", label: "Subscriptions" },
        { key: "you", label: "You" }
    ].forEach((entry) => {
        const navItem = document.createElement("button");
        navItem.type = "button";
        navItem.className = `tvp-yt-nav-item${entry.active ? " is-active" : ""}`;
        navItem.innerHTML = `<span class="tvp-yt-nav-icon">${iconSvg(entry.key)}</span><span class="tvp-yt-nav-label">${entry.label}</span>`;
        nav.appendChild(navItem);
    });

    const content = document.createElement("div");
    content.className = "tvp-yt-content";

    const chips = document.createElement("div");
    chips.className = "tvp-yt-chip-row";
    const chipDefs = [
        { key: "all", label: "All" },
        { key: "shuffle", label: "Shuffle" },
        { key: "gaming", label: "Gaming" },
        { key: "music", label: "Music" },
        { key: "news", label: "News" },
        { key: "live", label: "Live" },
        { key: "recent", label: "Recently uploaded" },
        { key: "watched", label: "Watched" }
    ];
    chipDefs.forEach((chipDef) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = `tvp-yt-chip${state.feedFilter === chipDef.key ? " is-active" : ""}`;
        chip.textContent = chipDef.label;
        chip.addEventListener("click", () => {
            state.feedFilter = chipDef.key;
            if (chipDef.key === "shuffle") {
                state.feedShuffleOrder = shuffle(items.slice(1).map((item) => item.id));
            }
            renderCanvas();
            if (chipDef.key === "shuffle") {
                setStatus("All video cards shuffled.");
            } else if (chipDef.key === "music") {
                setStatus("Showing music videos only.");
            } else if (chipDef.key === "watched") {
                setStatus("Showing videos with your custom thumbnail or title changes.");
            } else if (chipDef.key === "all") {
                setStatus("Showing all videos.");
            }
        });
        chips.appendChild(chip);
    });

    const grid = document.createElement("div");
    grid.className = "tvp-feed tvp-feed-desktop";
    const baseItems = items.slice(1);
    const feedItems = state.feedFilter === "shuffle"
        ? (() => {
            const order = state.feedShuffleOrder.length ? state.feedShuffleOrder : shuffle(baseItems.map((item) => item.id));
            const byId = new Map(baseItems.map((item) => [item.id, item]));
            return order.map((itemId) => byId.get(itemId)).filter(Boolean);
        })()
        : state.feedFilter === "music"
            ? baseItems.filter((item) => item.durationIcon === "music")
            : state.feedFilter === "watched"
                ? baseItems.filter((item) => Boolean(item.customThumb || item.customTitle))
                : baseItems;

    feedItems.forEach((item) => {
        const card = document.createElement("article");
        card.className = "tvp-card";
        card.appendChild(createThumbFigure(item));
        const meta = createMetaBlock(item);
        if (compact) {
            const menu = document.createElement("button");
            menu.type = "button";
            menu.className = "tvp-card-more";
            menu.setAttribute("aria-label", "More actions");
            menu.innerHTML = iconSvg("kebab");
            meta.appendChild(menu);
        }
        card.appendChild(meta);
        grid.appendChild(card);
    });

    content.appendChild(chips);
    content.appendChild(grid);
    main.appendChild(nav);
    main.appendChild(content);
    shell.appendChild(top);
    shell.appendChild(main);
    return shell;
}

function renderYouTubeSearch(items) {
    const list = document.createElement("div");
    list.className = "tvp-feed tvp-feed-search";
    items.slice(1, 6).forEach((item, idx) => {
        const row = document.createElement("article");
        row.className = "tvp-search-row";
        row.appendChild(createThumbFigure(item, idx === 0 ? "is-16-9" : "is-16-9 compact"));
        row.appendChild(createMetaBlock(item, true));
        list.appendChild(row);
    });
    return list;
}

function renderYouTubeSidebar(items) {
    const wrap = document.createElement("div");
    wrap.className = "tvp-feed tvp-feed-sidebar";

    const left = document.createElement("div");
    left.className = "tvp-sidebar-left";
    items.slice(1, 5).forEach((item) => {
        const card = document.createElement("article");
        card.className = "tvp-card";
        card.appendChild(createThumbFigure(item));
        left.appendChild(card);
    });

    const right = document.createElement("div");
    right.className = "tvp-sidebar-right";
    items.slice(1, 5).forEach((item) => {
        const block = document.createElement("article");
        block.className = "tvp-sidebar-meta";
        block.appendChild(createMetaBlock(item, true));
        right.appendChild(block);
    });

    wrap.appendChild(left);
    wrap.appendChild(right);
    return wrap;
}

function renderYouTubeMobile(items) {
    const column = document.createElement("div");
    column.className = "tvp-feed tvp-feed-mobile";
    items.slice(1, 7).forEach((item) => {
        const card = document.createElement("article");
        card.className = "tvp-card tvp-card-mobile";
        card.appendChild(createThumbFigure(item));
        card.appendChild(createMetaBlock(item));
        column.appendChild(card);
    });
    return column;
}

function renderSizeView(items) {
    const active = items[0];
    const wrap = document.createElement("div");
    wrap.className = "tvp-size-feed";

    sizeTemplates.forEach((entry) => {
        const block = document.createElement("section");
        block.className = "tvp-size-block";

        const heading = document.createElement("h3");
        heading.textContent = `${entry.label} (${entry.size})`;
        block.appendChild(heading);

        const [wText, hText] = entry.size.split("x");
        const w = Number(wText) || 320;
        const h = Number(hText) || 180;
        const maxW = entry.kind === "banner" ? 540 : entry.kind === "inline" ? 360 : 512;
        const cardW = Math.min(w, maxW);
        const cardH = Math.max(70, Math.round(cardW * (h / w)));

        const card = document.createElement("article");
        card.className = `tvp-size-card ${entry.kind === "inline" ? "is-inline" : "is-stack"}`;
        card.style.setProperty("--tvp-card-w", `${cardW}px`);

        const thumb = createThumbFigure(active, "is-custom");
        thumb.style.setProperty("--tvp-thumb-h", `${Math.max(64, cardH)}px`);
        card.appendChild(thumb);

        if (entry.kind !== "banner") {
            card.appendChild(createMetaBlock(active, entry.kind === "inline"));
        } else {
            const bannerMeta = document.createElement("p");
            bannerMeta.className = "tvp-banner-meta";
            bannerMeta.textContent = `${state.channel} - Recommended feed position`;
            card.appendChild(bannerMeta);
        }

        block.appendChild(card);
        wrap.appendChild(block);
    });

    return wrap;
}

function renderCanvas() {
    const items = normalizeItems();

    if (desktopCanvas || mobileCanvas) {
        if (desktopCanvas) {
            desktopCanvas.innerHTML = "";
            const desktopContent = renderDesktopShell(items, false);
            desktopCanvas.appendChild(desktopContent);
        }

        if (mobileCanvas) {
            mobileCanvas.innerHTML = "";
            const mobileContent = renderDesktopShell(items, true);
            mobileCanvas.appendChild(mobileContent);
        }
    } else if (canvas) {
        canvas.innerHTML = "";

        const title = document.createElement("h2");
        title.className = "tvp-canvas-title";
        title.textContent = state.view === "youtube" ? "YouTube Preview" : "Size Preview";
        canvas.appendChild(title);

        let content;
        if (state.view === "size") {
            content = renderSizeView(items);
        } else if (state.layout === "search") {
            content = renderYouTubeSearch(items);
        } else if (state.layout === "sidebar") {
            content = renderYouTubeSidebar(items);
        } else if (state.layout === "mobile") {
            content = renderYouTubeMobile(items);
        } else {
            content = renderDesktopShell(items, isCompactViewport());
        }
        canvas.appendChild(content);
    }

    if (logoPreview) {
        logoPreview.src = getPrimaryLogo();
        logoPreview.classList.remove("is-empty");
    }
}

function syncCounts() {
    const count = state.thumbs.length;
    if (thumbCount) thumbCount.textContent = String(count);
}

function addThumb(url, objectUrl = "") {
    const item = {
        id: id(),
        url,
        objectUrl,
        name: "Name it..."
    };
    state.thumbs.push(item);
    if (!state.activeThumbId) state.activeThumbId = item.id;
    return item;
}

function renderThumbList() {
    if (!thumbList) return;
    thumbList.innerHTML = "";

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "tvp-thumb-add";
    addBtn.textContent = "+";
    addBtn.addEventListener("click", () => fileInput?.click());
    thumbList.appendChild(addBtn);

    state.thumbs.forEach((thumb) => {
        const card = document.createElement("article");
        card.className = `tvp-thumb-item${thumb.id === state.activeThumbId ? " is-active" : ""}`;

        const preview = document.createElement("button");
        preview.type = "button";
        preview.className = "tvp-thumb-preview";
        preview.addEventListener("click", () => {
            state.activeThumbId = thumb.id;
            renderThumbList();
            renderCanvas();
        });

        const img = document.createElement("img");
        img.src = thumb.url;
        img.alt = thumb.name;
        img.loading = "lazy";
        preview.appendChild(img);

        if (state.thumbs.length > 1) {
            const removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.className = "tvp-thumb-remove";
            removeBtn.textContent = "x";
            removeBtn.addEventListener("click", (event) => {
                event.stopPropagation();
                revokeObjectUrl(thumb.objectUrl);
                state.thumbs = state.thumbs.filter((item) => item.id !== thumb.id);
                if (!state.thumbs.find((item) => item.id === state.activeThumbId)) {
                    state.activeThumbId = state.thumbs[0]?.id || "";
                }
                syncCounts();
                renderThumbList();
                renderCanvas();
            });
            preview.appendChild(removeBtn);
        }

        const input = document.createElement("input");
        input.type = "text";
        input.maxLength = 40;
        input.value = thumb.name;
        input.placeholder = "Name it...";
        input.addEventListener("input", () => {
            thumb.name = input.value;
        });

        card.appendChild(preview);
        card.appendChild(input);
        thumbList.appendChild(card);
    });
}

function seedInitial() {
    defaultThumbs.forEach((url) => addThumb(url));
    state.activeThumbId = state.thumbs[0]?.id || "";
    state.creatorItems = buildCreatorItems();
}

function applyViewButtons() {
    viewYoutubeBtn?.classList.toggle("is-active", state.view === "youtube");
    viewYoutubeBtn?.setAttribute("aria-selected", String(state.view === "youtube"));
    viewSizeBtn?.classList.toggle("is-active", state.view === "size");
    viewSizeBtn?.setAttribute("aria-selected", String(state.view === "size"));
}

function applyLayoutButtons() {
    layoutButtons.forEach((btn) => {
        const isActive = btn.dataset.layout === state.layout;
        btn.classList.toggle("is-active", isActive);
    });
}

function bindEvents() {
    fileInput?.addEventListener("change", () => {
        const files = Array.from(fileInput.files || []);
        if (!files.length) return;
        files.forEach((file) => {
            const objectUrl = createObjectUrl(file);
            const created = addThumb(objectUrl, objectUrl);
            state.activeThumbId = created.id;
        });
        syncCounts();
        renderThumbList();
        renderCanvas();
        setStatus(`${files.length} thumbnail${files.length > 1 ? "s" : ""} added.`);
        fileInput.value = "";
    });

    logoUploadBtn?.addEventListener("click", () => logoInput?.click());

    rememberToggle?.addEventListener("change", () => {
        setRememberProfile(Boolean(rememberToggle.checked));
    });

    logoInput?.addEventListener("change", async () => {
        const file = (logoInput.files || [])[0];
        if (!file) return;
        if (!state.rememberProfile) {
            state.profileLogo = defaultPrimaryLogo;
            renderCanvas();
            setStatus("Enable 'Remember channel name and logo' to use a custom profile logo.");
            logoInput.value = "";
            return;
        }
        try {
            await updateProfileLogoFromFile(file);
            setStatus("Profile logo updated and saved for future visits.");
        } catch (error) {
            setStatus("Could not update channel logo.", true);
        }
        logoInput.value = "";
    });

    viewYoutubeBtn?.addEventListener("click", () => {
        state.view = "youtube";
        applyViewButtons();
        renderCanvas();
    });

    viewSizeBtn?.addEventListener("click", () => {
        state.view = "size";
        applyViewButtons();
        renderCanvas();
    });

    layoutButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            state.layout = btn.dataset.layout || "desktop";
            applyLayoutButtons();
            renderCanvas();
        });
    });

    shuffleBtn?.addEventListener("click", () => {
        state.creatorItems = shuffle(state.creatorItems);
        if (state.feedFilter === "shuffle") {
            state.feedShuffleOrder = shuffle(state.creatorItems.map((item) => item.id));
        }
        renderCanvas();
        setStatus("Top creator cards shuffled.");
    });

    resetBtn?.addEventListener("click", () => {
        state.view = "youtube";
        state.layout = "desktop";
        state.dark = true;
        state.feedFilter = "all";
        state.feedShuffleOrder = [];
        state.title = DEFAULT_TITLE;
        state.channel = DEFAULT_CHANNEL;
        state.profileLogo = defaultPrimaryLogo;
        clearStoredProfile();
        state.creatorItems.forEach((item) => revokeObjectUrl(item.customThumbObjectUrl));
        state.creatorItems = buildCreatorItems();

        if (videoTitleInput) videoTitleInput.value = state.title;
        if (channelNameInput) channelNameInput.value = state.channel;

        applyViewButtons();
        applyLayoutButtons();
        renderCanvas();
        setStatus("Preview reset to default profile and layout.");
    });

    randomThumbBtn?.addEventListener("click", () => {
        if (!state.thumbs.length) return;
        const random = state.thumbs[Math.floor(Math.random() * state.thumbs.length)];
        state.activeThumbId = random.id;
        renderThumbList();
        renderCanvas();
    });

    videoTitleInput?.addEventListener("input", () => {
        state.title = (videoTitleInput.value || "").trim() || DEFAULT_TITLE;
        renderCanvas();
    });

    channelNameInput?.addEventListener("input", () => {
        state.channel = normalizeChannelName(channelNameInput.value || "");
        channelNameInput.value = state.channel === DEFAULT_CHANNEL ? "" : state.channel;
        persistProfile();
        renderCanvas();
    });

    window.addEventListener("beforeunload", () => {
        state.objectUrls.forEach((url) => URL.revokeObjectURL(url));
        state.objectUrls.clear();
    });

    window.addEventListener("resize", () => {
        if (state.view === "youtube" && state.layout === "desktop") {
            renderCanvas();
        }
    });

    window.addEventListener("keydown", (event) => {
        if (isEditingTarget(event.target)) return;
        if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "f") {
            event.preventDefault();
            togglePreviewFullscreen().catch(() => {
                setStatus("Could not toggle fullscreen.", true);
            });
        }
    });
}

function init() {
    loadStoredProfile();
    seedInitial();
    if (rememberToggle) rememberToggle.checked = state.rememberProfile;
    if (videoTitleInput) videoTitleInput.value = state.title;
    if (channelNameInput) channelNameInput.value = state.channel;
    if (logoPreview) {
        logoPreview.src = getPrimaryLogo();
        logoPreview.classList.remove("is-empty");
    }
    applyViewButtons();
    applyLayoutButtons();
    syncCounts();
    renderThumbList();
    renderCanvas();
    bindEvents();
    setStatus("Desktop YouTube-style preview ready.");
}

init();
