const TOOL_LINKS = [
    {
        "label":  "Home",
        "file":  "index.html"
    },
    {
        "label":  "YouTube Thumbnail Downloader",
        "file":  "single-downloader.html"
    },
    {
        "label":  "YouTube Tags Finder",
        "file":  "bulk.html"
    },
    {
        "label":  "YouTube Thumbnail Device Preview",
        "file":  "preview.html"
    },
    {
        "label":  "Video to Audio Converter",
        "file":  "convert.html"
    },
    {
        "label":  "What Is My IP Address",
        "file":  "ip.html"
    },
    {
        "label":  "Internet Speed Test",
        "file":  "speed.html"
    },
    {
        "label":  "Local Video Player",
        "file":  "video.html"
    },
    {
        "label":  "Remove Audio from Video",
        "file":  "remove-audio-video.html"
    },
    {
        "label":  "Audio Volume Booster",
        "file":  "audio-volume-booster.html"
    },
    {
        "label":  "Video Trimmer",
        "file":  "video-trimmer.html"
    },
    {
        "label":  "Video Merger",
        "file":  "video-merger.html"
    },
    {
        "label":  "Media Speed Changer",
        "file":  "media-speed-changer.html"
    },
    {
        "label":  "Image to ICO Converter",
        "file":  "image-to-ico.html"
    },
    {
        "label":  "Compress PDF",
        "file":  "compress-pdf.html"
    },
    {
        "label":  "Compress PNG",
        "file":  "compress-png.html"
    },
    {
        "label":  "Compress JPG",
        "file":  "compress-jpg.html"
    },
    {
        "label":  "Merge PDF",
        "file":  "merge-pdf.html"
    },
    {
        "label":  "Facebook Video Downloader",
        "file":  "facebook-video-downloader.html"
    },
    {
        "label":  "Image Resizer",
        "file":  "image-resizer.html"
    },
    {
        "label":  "Find and Replace Text",
        "file":  "find-replace-text.html"
    },
    {
        "label":  "Case Converter",
        "file":  "case-converter.html"
    },
    {
        "label":  "Compress Image to 2MB",
        "file":  "compress-image-2mb.html"
    },
    {
        "label":  "AVIF to PNG Converter",
        "file":  "avif-to-png.html"
    },
    {
        "label":  "Round Corners Image",
        "file":  "round-corners-image.html"
    },
    {
        "label":  "AI Background Remover",
        "file":  "ai-background-remover.html"
    },
    {
        "label":  "Favicon Generator",
        "file":  "favicon-generator.html"
    },
    {
        "label":  "Aspect Ratio Calculator",
        "file":  "aspect-ratio-calculator.html"
    },
    {
        "label":  "Birthdate Calculator",
        "file":  "birthdate-calculator.html"
    },
    {
        "label":  "Spotify Downloader",
        "file":  "spotify-downloader.html"
    },
    {
        "label":  "JSON Formatter",
        "file":  "json-formatter-validator.html"
    },
    {
        "label":  "Password Generator",
        "file":  "password-generator.html"
    },
    {
        "label":  "Base64 Encoder Decoder",
        "file":  "base64-encoder-decoder.html"
    },
    {
        "label":  "Regex Tester",
        "file":  "regex-tester.html"
    },
    {
        "label":  "UUID Generator",
        "file":  "uuid-generator.html"
    }
];

const TOOL_FOOTER_GROUPS = [
    {
        key: "downloaders",
        title: "Downloaders",
        test: (label) => /(downloader|youtube|facebook|spotify)/i.test(label)
    },
    {
        key: "video-audio",
        title: "Video and Audio",
        test: (label) => /(video|audio|player|trimmer|merger|speed changer)/i.test(label)
    },
    {
        key: "image-design",
        title: "Image and Design",
        test: (label) => /(image|thumbnail|favicon|avif|ico|background|corners|preview)/i.test(label)
    },
    {
        key: "pdf-docs",
        title: "PDF and Documents",
        test: (label) => /(pdf)/i.test(label)
    },
    {
        key: "text-dev",
        title: "Text and Developer",
        test: (label) => /(json|regex|base64|case|find and replace|tags finder)/i.test(label)
    },
    {
        key: "utility",
        title: "Utility and Calculators",
        test: (label) => /(calculator|ip|internet speed test|uuid|password)/i.test(label)
    },
    {
        key: "more",
        title: "More Tools",
        test: () => true
    }
];

const LANGUAGE_STORAGE_KEY = "pwt-language";
const TOOL_ROUTE_OVERRIDES = Object.freeze({
    "single-downloader.html": "youtube-thumbnail-downloader",
    "bulk.html": "youtube-tags-finder",
    "preview.html": "youtube-thumbnail-device-preview",
    "convert.html": "video-to-audio-converter",
    "video.html": "local-video-player",
    "remove-audio-video.html": "remove-audio-from-video",
    "avif-to-png.html": "avif-to-png-converter",
    "compress-image-2mb.html": "compress-image-to-2mb",
    "image-to-ico.html": "image-to-ico-converter",
    "speed.html": "internet-speed-test",
    "ip.html": "what-is-my-ip-address"
});
const LEGACY_ROUTE_ALIASES = Object.freeze({
    "single-downloader": "youtube-thumbnail-downloader",
    "bulk": "youtube-tags-finder",
    "preview": "youtube-thumbnail-device-preview",
    "convert": "video-to-audio-converter",
    "video": "local-video-player",
    "remove-audio-video": "remove-audio-from-video",
    "avif-to-png": "avif-to-png-converter",
    "compress-image-2mb": "compress-image-to-2mb",
    "image-to-ico": "image-to-ico-converter",
    "speed": "internet-speed-test",
    "ip": "what-is-my-ip-address"
});
const TRANSLATION_CACHE_KEY = "pwt-translation-cache-v2";
const DEFAULT_LANGUAGE = "en";
const LANGUAGE_CODES = [
    "en", "af", "sq", "am", "ar", "hy", "az", "eu", "be", "bn", "bs", "bg", "ca", "ceb", "ny", "zh",
    "co", "hr", "cs", "da", "nl", "eo", "et", "tl", "fi", "fr", "fy", "gl", "ka", "de", "el", "gu",
    "ht", "ha", "haw", "he", "hi", "hmn", "hu", "is", "ig", "id", "ga", "it", "ja", "jv", "kn", "kk",
    "km", "ko", "ku", "ky", "lo", "la", "lv", "lt", "lb", "mk", "mg", "ms", "ml", "mt", "mi", "mr",
    "mn", "my", "ne", "no", "or", "ps", "fa", "pl", "pt", "pa", "ro", "ru", "sm", "gd", "sr", "st",
    "sn", "sd", "si", "sk", "sl", "so", "es", "su", "sw", "sv", "tg", "ta", "te", "th", "tr", "uk",
    "ur", "uz", "vi", "cy", "xh", "yi", "yo", "zu"
];
const EXCLUDED_TRANSLATION_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "KBD", "SAMP"]);
const TEXT_NODE_SOURCES = new Map();
const ATTR_SOURCES = new Map();
let translationObserver = null;
let translationApplyQueued = false;
let translationMutationQueued = false;
let isApplyingTranslation = false;
let activeTranslationTask = 0;
const BRAND_ENGLISH_TEXT = "ProwebTools";
const BRAND_TRANSLATION_SOURCE = "Pro Web Tools";
const BRAND_TRANSLATION_OVERRIDES = {
    hi: "प्रो वेब टूल्स",
    bn: "প্রো ওয়েব টুলস",
    ta: "ப்ரோ வெப் கருவிகள்",
    te: "ప్రో వెబ్ టూల్స్",
    mr: "प्रो वेब टूल्स",
    gu: "પ્રો વેબ ટૂલ્સ",
    pa: "ਪ੍ਰੋ ਵੈੱਬ ਟੂਲਜ਼",
    ur: "پرو ویب ٹولز",
    ar: "أدوات ويب برو",
    fa: "ابزارهای وب پرو",
    ru: "Про Веб Инструменты",
    zh: "专业网页工具",
    ja: "プロウェブツール",
    ko: "프로 웹 도구"
};

function loadTranslationCache() {
    try {
        const raw = localStorage.getItem(TRANSLATION_CACHE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_) {
        return {};
    }
}

const translationCache = loadTranslationCache();

function saveTranslationCache() {
    try {
        const entries = Object.entries(translationCache);
        if (entries.length > 2400) {
            entries.slice(0, entries.length - 2000).forEach(([k]) => delete translationCache[k]);
        }
        localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(translationCache));
    } catch (_) {
        // ignore
    }
}

function getLanguageName(code) {
    const normalized = (code || "").toLowerCase();
    try {
        const nativeDisplay = new Intl.DisplayNames([normalized], { type: "language" });
        const nativeName = nativeDisplay.of(normalized);
        if (nativeName) return nativeName;
    } catch (_) {
        // fallback
    }
    try {
        const englishDisplay = new Intl.DisplayNames([DEFAULT_LANGUAGE], { type: "language" });
        return englishDisplay.of(normalized) || normalized;
    } catch (_) {
        return normalized;
    }
}

function getEnglishLanguageName(code) {
    const normalized = (code || "").toLowerCase();
    try {
        const display = new Intl.DisplayNames([DEFAULT_LANGUAGE], { type: "language" });
        return display.of(normalized) || normalized;
    } catch (_) {
        return normalized;
    }
}

function getFlagFromRegion(region) {
    if (!region || !/^[A-Z]{2}$/.test(region)) return "🌐";
    const base = 127397;
    return String.fromCodePoint(...region.split("").map((char) => base + char.charCodeAt(0)));
}

const fallbackRegions = {
    en: "US",
    af: "ZA",
    sq: "AL",
    ar: "SA",
    bn: "BD",
    ca: "ES",
    da: "DK",
    de: "DE",
    el: "GR",
    es: "ES",
    fa: "IR",
    fi: "FI",
    fr: "FR",
    he: "IL",
    hi: "IN",
    id: "ID",
    it: "IT",
    ja: "JP",
    ko: "KR",
    ms: "MY",
    nl: "NL",
    no: "NO",
    pl: "PL",
    pt: "PT",
    ru: "RU",
    sv: "SE",
    sw: "TZ",
    ta: "IN",
    te: "IN",
    th: "TH",
    tr: "TR",
    uk: "UA",
    ur: "PK",
    vi: "VN",
    zh: "CN"
};

function getLanguageRegion(code) {
    const normalized = (code || "").toLowerCase();

    try {
        const locale = new Intl.Locale(normalized).maximize();
        return locale.region || fallbackRegions[normalized] || "";
    } catch (_) {
        return fallbackRegions[normalized] || "";
    }
}

function getFlagEmojiForLanguage(code) {
    return getFlagFromRegion(getLanguageRegion(code));
}

function getFlagTwemojiUrl(region) {
    if (!region || !/^[A-Z]{2}$/.test(region)) return "";
    const cps = region.split("").map((char) => (127397 + char.charCodeAt(0)).toString(16));
    return `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${cps.join("-")}.svg`;
}

function getEsperantoFlagDataUrl() {
    const svg = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
  <rect width='64' height='64' rx='10' fill='#1fa64a'/>
  <rect x='0' y='0' width='28' height='28' rx='4' fill='#ffffff'/>
  <polygon points='14,6 16.8,11.8 23.2,12.5 18.6,17 19.8,23.4 14,20.4 8.2,23.4 9.4,17 4.8,12.5 11.2,11.8' fill='#1fa64a'/>
</svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function getFlagAssetForLanguage(code) {
    const normalized = (code || "").toLowerCase();
    const region = getLanguageRegion(normalized);
    if (normalized === "eo") {
        return {
            url: getEsperantoFlagDataUrl(),
            emoji: "🟩",
            region: "EO"
        };
    }
    return {
        url: getFlagTwemojiUrl(region),
        emoji: getFlagEmojiForLanguage(normalized),
        region: region || "GL"
    };
}

function bindFlagMedia(imgEl, emojiEl, code) {
    const asset = getFlagAssetForLanguage(code);
    const url = asset.url;
    const emoji = asset.emoji || getFlagEmojiForLanguage(code);
    if (emojiEl) emojiEl.textContent = emoji;
    if (!imgEl || !url) {
        if (imgEl) imgEl.style.display = "none";
        if (emojiEl) emojiEl.style.display = "inline";
        return;
    }
    imgEl.src = url;
    imgEl.alt = `${asset.region || "global"} flag`;
    imgEl.loading = "lazy";
    imgEl.referrerPolicy = "no-referrer";
    imgEl.onerror = () => {
        imgEl.style.display = "none";
        if (emojiEl) emojiEl.style.display = "inline";
    };
    imgEl.onload = () => {
        imgEl.style.display = "inline-block";
        if (emojiEl) emojiEl.style.display = "none";
    };
}

function getSupportedLanguages() {
    const seen = new Set();
    return LANGUAGE_CODES
        .filter((code) => {
            if (seen.has(code)) return false;
            seen.add(code);
            return true;
        })
        .map((code) => ({ code, label: getLanguageName(code) }))
        .sort((a, b) => {
            if (a.code === DEFAULT_LANGUAGE) return -1;
            if (b.code === DEFAULT_LANGUAGE) return 1;
            return a.label.localeCompare(b.label);
        });
}

function formatLanguageLabel(code) {
    const nativeName = getLanguageName(code);
    const englishName = getEnglishLanguageName(code).toUpperCase().replace(/[^A-Z\s-]/g, "").trim() || code.toUpperCase();
    return `${nativeName} (${englishName})`;
}

function updateLanguageMenuUI(activeCode) {
    const triggerText = document.querySelector(".language-menu-current-label");
    const triggerEmoji = document.querySelector(".language-menu-current-emoji");
    const triggerImg = document.querySelector(".language-menu-current-flag-img");
    if (triggerText) {
        triggerText.textContent = formatLanguageLabel(activeCode);
    }
    if (triggerImg || triggerEmoji) {
        bindFlagMedia(triggerImg, triggerEmoji, activeCode);
    }
    document.querySelectorAll(".language-menu-option").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.lang === activeCode);
    });
}

function getSavedLanguage() {
    const lang = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (!lang) return DEFAULT_LANGUAGE;
    return LANGUAGE_CODES.includes(lang) ? lang : DEFAULT_LANGUAGE;
}

function setSavedLanguage(lang) {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
}

function ensureLanguageSelector() {
    const headerTools = document.querySelector(".headline-bar .tools-group");
    if (!headerTools) return;
    if (headerTools.querySelector(".language-wrap")) return;
    const inlineToolsRow = headerTools.querySelector(".tvp-tools-row");
    const selectorHost = inlineToolsRow || headerTools;

    const currentLanguage = getSavedLanguage();
    const wrap = document.createElement("div");
    wrap.className = "language-wrap";

    const menu = document.createElement("details");
    menu.className = "language-menu";

    const summary = document.createElement("summary");
    summary.className = "language-menu-trigger";
    summary.setAttribute("aria-label", "Select language");
    const currentFlagWrap = document.createElement("span");
    currentFlagWrap.className = "language-menu-current-flag";
    const currentFlagImg = document.createElement("img");
    currentFlagImg.className = "language-menu-current-flag-img";
    currentFlagImg.setAttribute("aria-hidden", "true");
    currentFlagWrap.appendChild(currentFlagImg);
    const currentEmoji = document.createElement("span");
    currentEmoji.className = "language-menu-current-emoji";
    currentEmoji.setAttribute("aria-hidden", "true");
    currentFlagWrap.appendChild(currentEmoji);
    const current = document.createElement("span");
    current.className = "language-menu-current-label";
    current.textContent = `${formatLanguageLabel(currentLanguage)}`;
    summary.appendChild(currentFlagWrap);
    summary.appendChild(current);
    menu.appendChild(summary);

    const panel = document.createElement("div");
    panel.className = "language-menu-panel";
    const langs = getSupportedLanguages();
    langs.forEach((lang) => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "language-menu-option";
        option.dataset.lang = lang.code;
        const icon = document.createElement("span");
        icon.className = "language-option-flag";
        const img = document.createElement("img");
        img.className = "language-option-flag-img";
        icon.appendChild(img);
        const emoji = document.createElement("span");
        emoji.className = "language-option-flag-emoji";
        emoji.setAttribute("aria-hidden", "true");
        icon.appendChild(emoji);
        bindFlagMedia(img, emoji, lang.code);
        const text = document.createElement("span");
        text.className = "language-option-label";
        text.textContent = formatLanguageLabel(lang.code);
        option.appendChild(icon);
        option.appendChild(text);
        option.addEventListener("click", async () => {
            await applyLanguage(lang.code, true);
            updateLanguageMenuUI(lang.code);
            menu.open = false;
        });
        panel.appendChild(option);
    });
    menu.appendChild(panel);

    document.addEventListener("click", (event) => {
        if (!menu.open) return;
        if (menu.contains(event.target)) return;
        menu.open = false;
    });

    wrap.appendChild(menu);
    selectorHost.prepend(wrap);
    updateLanguageMenuUI(currentLanguage);
}

function shouldTranslateString(value) {
    if (!value) return false;
    const text = value.trim();
    if (!text) return false;
    if (/\([^)]*\bthumbnail\b[^)]*\)/i.test(text)) return true;
    if (!/[A-Za-z]/.test(text)) return false;
    if (/^[\d\s\W_]+$/.test(text)) return false;
    return true;
}

function shouldSkipNode(node) {
    const parent = node.parentElement;
    if (!parent) return true;
    if (EXCLUDED_TRANSLATION_TAGS.has(parent.tagName)) return true;
    if (parent.closest("[data-no-translate], .language-wrap")) return true;
    return false;
}

function registerTextNode(node) {
    if (!node || TEXT_NODE_SOURCES.has(node) || shouldSkipNode(node)) return;
    const source = node.nodeValue || "";
    if (!shouldTranslateString(source)) return;
    TEXT_NODE_SOURCES.set(node, source);
}

function registerElementAttributes(el) {
    if (!el || !el.getAttribute) return;
    if (el.closest("[data-no-translate], .language-wrap")) return;
    ["placeholder", "title", "aria-label", "alt"].forEach((attr) => {
        if (!el.hasAttribute(attr)) return;
        const source = el.getAttribute(attr) || "";
        if (!shouldTranslateString(source)) return;
        if (!ATTR_SOURCES.has(el)) ATTR_SOURCES.set(el, {});
        const attrs = ATTR_SOURCES.get(el);
        if (!attrs[attr]) {
            attrs[attr] = source;
        }
    });
}

function collectTranslatableNodes(root = document.body) {
    if (!root) return;

    if (root.nodeType === Node.TEXT_NODE) {
        registerTextNode(root);
        return;
    }

    if (root.nodeType === Node.ELEMENT_NODE) {
        registerElementAttributes(root);
    }

    const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
            if (shouldSkipNode(node)) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
        }
    });
    while (textWalker.nextNode()) {
        registerTextNode(textWalker.currentNode);
    }

    const elementWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null);
    while (elementWalker.nextNode()) {
        registerElementAttributes(elementWalker.currentNode);
    }
}

function getCacheKey(lang, source) {
    return `${lang}::${source}`;
}

function getCachedTranslation(lang, source) {
    if (lang === DEFAULT_LANGUAGE) return source;
    return translationCache[getCacheKey(lang, source)] || "";
}

function setCachedTranslation(lang, source, translated) {
    if (!translated || !translated.trim()) return;
    translationCache[getCacheKey(lang, source)] = translated;
}

async function translateByLibreEndpoint(endpoint, text, targetLanguage) {
    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            q: text,
            source: DEFAULT_LANGUAGE,
            target: targetLanguage,
            format: "text"
        })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return (data.translatedText || "").trim();
}

async function translateByMyMemory(text, targetLanguage) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${DEFAULT_LANGUAGE}|${encodeURIComponent(targetLanguage)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const translated = data?.responseData?.translatedText || "";
    return translated.trim();
}

async function translateByGoogleUnofficial(text, targetLanguage) {
    const params = new URLSearchParams({
        client: "gtx",
        sl: DEFAULT_LANGUAGE,
        tl: targetLanguage,
        dt: "t",
        q: text
    });
    const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const parts = Array.isArray(data?.[0]) ? data[0] : [];
    const translated = parts.map((entry) => entry?.[0] || "").join("");
    return translated.trim();
}

async function translateText(text, targetLanguage) {
    if (!text || targetLanguage === DEFAULT_LANGUAGE) return text;
    const cached = getCachedTranslation(targetLanguage, text);
    if (cached) return cached;

    try {
        const translated = await translateByGoogleUnofficial(text, targetLanguage);
        if (translated) {
            setCachedTranslation(targetLanguage, text, translated);
            return translated;
        }
    } catch (_) {
        // fallback
    }

    const endpoints = [
        "https://translate.terraprint.co/translate",
        "https://translate.argosopentech.com/translate",
        "https://libretranslate.de/translate"
    ];

    for (const endpoint of endpoints) {
        try {
            const translated = await translateByLibreEndpoint(endpoint, text, targetLanguage);
            if (translated) {
                setCachedTranslation(targetLanguage, text, translated);
                return translated;
            }
        } catch (_) {
            // fallback
        }
    }

    try {
        const translated = await translateByMyMemory(text, targetLanguage);
        if (translated) {
            setCachedTranslation(targetLanguage, text, translated);
            return translated;
        }
    } catch (_) {
        // ignore
    }

    return text;
}

function getBrandNodes() {
    return Array.from(document.querySelectorAll(".title-text, .site-brand-text"))
        .filter((node) => node && !node.closest(".language-wrap"));
}

async function getBrandTranslation(language) {
    const lang = (language || DEFAULT_LANGUAGE).toLowerCase();
    if (lang === DEFAULT_LANGUAGE) return BRAND_ENGLISH_TEXT;
    if (BRAND_TRANSLATION_OVERRIDES[lang]) return BRAND_TRANSLATION_OVERRIDES[lang];

    let translated = await translateText(BRAND_TRANSLATION_SOURCE, lang);
    if (!translated || translated.toLowerCase() === BRAND_TRANSLATION_SOURCE.toLowerCase()) {
        translated = await translateText("Professional Web Tools", lang);
    }
    if (!translated || translated.toLowerCase() === "professional web tools") {
        translated = await translateText(BRAND_ENGLISH_TEXT, lang);
    }
    return translated || BRAND_ENGLISH_TEXT;
}

async function applyBrandLanguage(language) {
    const translated = await getBrandTranslation(language);
    getBrandNodes().forEach((node) => {
        node.textContent = translated;
    });
}

function restoreDefaultLanguage() {
    TEXT_NODE_SOURCES.forEach((source, node) => {
        if (node.isConnected) node.nodeValue = source;
    });
    ATTR_SOURCES.forEach((attrs, el) => {
        if (!el.isConnected) return;
        Object.entries(attrs).forEach(([attr, value]) => {
            el.setAttribute(attr, value);
        });
    });
}

async function applyTranslatedLanguage(targetLanguage) {
    const sources = new Set();
    TEXT_NODE_SOURCES.forEach((source, node) => {
        if (!node.isConnected) return;
        if (!getCachedTranslation(targetLanguage, source)) sources.add(source);
    });
    ATTR_SOURCES.forEach((attrs, el) => {
        if (!el.isConnected) return;
        Object.values(attrs).forEach((source) => {
            if (!getCachedTranslation(targetLanguage, source)) sources.add(source);
        });
    });

    const sourceList = Array.from(sources).slice(0, 320);
    const overlay = ensureTranslationProgressUI();
    const taskId = ++activeTranslationTask;
    let done = 0;
    const total = sourceList.length;
    if (total > 0) {
        showTranslationProgress(overlay, done, total, targetLanguage);
    }

    const concurrency = 8;
    let cursor = 0;
    async function worker() {
        while (cursor < sourceList.length) {
            const idx = cursor++;
            const source = sourceList[idx];
            await translateText(source, targetLanguage);
            done += 1;
            if (activeTranslationTask === taskId) {
                showTranslationProgress(overlay, done, total, targetLanguage);
            }
        }
    }

    const workerCount = Math.max(1, Math.min(concurrency, sourceList.length));
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    TEXT_NODE_SOURCES.forEach((source, node) => {
        if (!node.isConnected) return;
        const translated = getCachedTranslation(targetLanguage, source) || source;
        node.nodeValue = translated;
    });
    ATTR_SOURCES.forEach((attrs, el) => {
        if (!el.isConnected) return;
        Object.entries(attrs).forEach(([attr, source]) => {
            const translated = getCachedTranslation(targetLanguage, source) || source;
            el.setAttribute(attr, translated);
        });
    });

    saveTranslationCache();
    if (activeTranslationTask === taskId) {
        hideTranslationProgress(overlay);
    }
}

function scheduleLanguageApply() {
    if (translationApplyQueued) return;
    translationApplyQueued = true;
    setTimeout(async () => {
        translationApplyQueued = false;
        const lang = (getSavedLanguage() || DEFAULT_LANGUAGE).toLowerCase();
        await applyLanguage(lang, false);
        updateLanguageMenuUI(lang);
    }, 80);
}

async function applyLanguage(language, persist) {
    const lang = LANGUAGE_CODES.includes(language) ? language : DEFAULT_LANGUAGE;
    if (persist) setSavedLanguage(lang);
    document.documentElement.setAttribute("lang", lang);

    collectTranslatableNodes(document.body);
    restoreDefaultLanguage();
    collectTranslatableNodes(document.body);
    isApplyingTranslation = true;
    const overlay = ensureTranslationProgressUI();
    try {
        if (lang === DEFAULT_LANGUAGE) {
            await applyBrandLanguage(lang);
            hideTranslationProgress(overlay);
            return;
        }
        await applyTranslatedLanguage(lang);
        await applyBrandLanguage(lang);
    } finally {
        isApplyingTranslation = false;
    }
}

function observeTranslations() {
    if (translationObserver) return;
    translationObserver = new MutationObserver((mutations) => {
        if (isApplyingTranslation) return;
        if (getSavedLanguage() !== DEFAULT_LANGUAGE) return;
        let changed = false;
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                collectTranslatableNodes(node);
                changed = true;
            });
            if (mutation.type === "characterData" && mutation.target) {
                collectTranslatableNodes(mutation.target);
                changed = true;
            }
        });
        if (!changed || translationMutationQueued) return;
        translationMutationQueued = true;
        setTimeout(() => {
            translationMutationQueued = false;
            scheduleLanguageApply();
        }, 150);
    });
    translationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });
}

function ensureTranslationProgressUI() {
    let el = document.querySelector(".translation-progress");
    if (el) return el;

    el = document.createElement("div");
    el.className = "translation-progress hidden";
    el.setAttribute("aria-live", "polite");
    el.innerHTML = `
        <span class="translation-progress-spinner" aria-hidden="true"></span>
        <span class="translation-progress-text"></span>
    `;
    document.body.appendChild(el);
    return el;
}

function showTranslationProgress(el, done, total, language) {
    if (!el) return;
    const text = el.querySelector(".translation-progress-text");
    const langName = getLanguageName(language);
    if (text) text.textContent = `Translating to ${langName}: ${done}/${total}`;
    el.classList.remove("hidden");
}

function hideTranslationProgress(el) {
    if (!el) return;
    el.classList.add("hidden");
}
function buildToolsMenu() {
    const panel = document.querySelector('.tools-menu-panel');
    if (!panel) return;

    const current = getCurrentToolFile();
    const baseUrl = getToolBaseUrl();
    panel.innerHTML = '';

    TOOL_LINKS.forEach((tool) => {
        const a = document.createElement('a');
        a.href = getToolHref(tool.file, baseUrl);
        a.textContent = tool.label;
        if (tool.file.toLowerCase() === current) {
            a.classList.add('active');
        }
        panel.appendChild(a);
    });
}

function removeHeaderToolsMenu() {
    document.querySelectorAll(".headline-bar .tools-menu").forEach((menu) => menu.remove());
}

function buildBrandLink() {
    const header = document.querySelector(".headline-bar");
    if (!header) return;
    const current = getCurrentToolFile();
    const isHomePage = current === "index.html";
    document.body?.classList.toggle("home-page", isHomePage);
    if (header.querySelector(".content .title")) {
        return;
    }

    header.classList.add("headline-with-brand");
    const h1 = header.querySelector("h1");
    if (h1) h1.classList.add("site-tool-title");

    const baseUrl = getToolBaseUrl();
    const homeHref = getToolHref("index.html", baseUrl);
    const applyBrand = (linkEl) => {
        linkEl.classList.add("site-brand-link");
        linkEl.classList.remove("brand");
        linkEl.classList.remove("home-brand-link");
        linkEl.innerHTML = '<span class="site-brand-text">ProwebTools</span>';
    };

    const existing = header.querySelector(".site-brand-link");
    if (existing) {
        existing.href = homeHref;
        applyBrand(existing);
        return;
    }

    const legacyBrand = header.querySelector(".brand");
    if (legacyBrand) {
        const tag = legacyBrand.tagName.toLowerCase();
        if (tag === "a") {
            legacyBrand.href = homeHref;
            applyBrand(legacyBrand);
            return;
        }

        const link = document.createElement("a");
        link.href = homeHref;
        link.className = "";
        applyBrand(link);
        legacyBrand.replaceWith(link);
        return;
    }

    const link = document.createElement("a");
    link.href = homeHref;
    applyBrand(link);

    const title = header.querySelector("h1");
    if (title) {
        header.insertBefore(link, title);
        return;
    }

    header.prepend(link);
}

const FAQ_SHORTCUTS_BY_TOOL = {
    "aspect-ratio-calculator.html": [
        "<code>Ctrl + Shift + F</code>: Open or close fullscreen preview.",
        "<code>W / S</code> or <code>Arrow Up / Arrow Down</code>: Move through ratio presets.",
        "<code>Enter</code>: Apply the highlighted preset.",
        "<code>Esc</code>: Close the preset list.",
        "<code>Shift + W</code> / <code>Shift + S</code>: Increase or decrease <code>W1</code>.",
        "<code>Shift + E</code> / <code>Shift + D</code>: Increase or decrease <code>H1</code>.",
        "<code>Numpad 8</code> / <code>Numpad 5</code>: Increase or decrease <code>W2</code>.",
        "<code>Numpad 9</code> / <code>Numpad 6</code>: Increase or decrease <code>H2</code>."
    ],
    "video-trimmer.html": [
        "<code>A / D</code>: Move start trim handle left or right.",
        "<code>W / S</code>: Move end trim handle right or left.",
        "<code>Shift + A/D/W/S</code>: Use a bigger trim step."
    ],
    "speed.html": [
        "<code>Enter</code>: Start speed test when no input field is focused."
    ],
    "convert.html": [
        "<code>Esc</code>: Close open format and volume panels quickly."
    ]
};

function getFaqToolType(title) {
    const lower = title.toLowerCase();
    if (/(video|audio|player|trimmer|merger|downloader|spotify)/.test(lower)) return "video";
    if (/(image|thumbnail|favicon|avif|png|jpg|jpeg|ico|background|corners|resizer|preview)/.test(lower)) return "image";
    if (/(pdf)/.test(lower)) return "pdf";
    if (/(json|regex|base64|case|find and replace|uuid|password)/.test(lower)) return "text";
    return "utility";
}

function getFaqBestSettingText(type) {
    if (type === "video") return "Start with a common output format (for example MP3 or MP4), keep source quality high, and trim only the required segment to reduce processing time.";
    if (type === "image") return "Use the target platform size first, then export with moderate compression for a balance of quality and file size.";
    if (type === "pdf") return "Use medium compression first, compare readability, then increase compression only if the file is still too large.";
    if (type === "text") return "Paste clean input, test with a small sample first, then run the final full text to avoid mistakes.";
    return "Use default settings first, verify the output, then adjust one option at a time for better control.";
}

function getFaqTips(type) {
    if (type === "video") {
        return [
            "Use short clips for quick testing before full export.",
            "Keep original files unchanged and export to a new filename.",
            "If performance is slow, close extra browser tabs."
        ];
    }
    if (type === "image") {
        return [
            "Start with the highest available source image.",
            "Preview before final export to avoid repeated edits.",
            "For social media, use platform-recommended dimensions."
        ];
    }
    if (type === "pdf") {
        return [
            "Back up original PDFs before compressing or merging.",
            "Check text clarity at 100% zoom after export.",
            "Merge in final reading order to avoid rework."
        ];
    }
    if (type === "text") {
        return [
            "Test transformations on a small text sample first.",
            "Keep a copy of original input when doing bulk edits.",
            "Use clear naming when generating outputs for teams."
        ];
    }
    return [
        "Run one change at a time and verify output after each step.",
        "Use modern browsers for best compatibility.",
        "Keep source data backed up before processing."
    ];
}

function renderFaqShortcutBlock(current) {
    const items = FAQ_SHORTCUTS_BY_TOOL[current];
    if (!items || !items.length) return "";

    const list = items.map((item) => `<li>${item}</li>`).join("");
    return `
        <details class="faq-item">
            <summary>What keyboard shortcuts are available in this tool?</summary>
            <p>Use these shortcuts to work faster:</p>
            <ul>${list}</ul>
        </details>
    `;
}

function buildGlobalFaq() {
    if (document.body?.hasAttribute("data-skip-global-faq")) return;

    const appRoot = document.querySelector("main.app") || document.querySelector("main");
    if (!appRoot) return;

    const title = (document.querySelector("h1")?.textContent || "this tool").trim();
    const current = getCurrentToolFile();
    const toolType = getFaqToolType(title);
    const tips = getFaqTips(toolType);
    const shortcutsBlock = renderFaqShortcutBlock(current);
    const existingFaq = appRoot.querySelector(".faq-section");
    const faq = existingFaq || document.createElement("section");
    faq.className = "faq-section";

    faq.innerHTML = `
        <h2>FAQ</h2>
        <div class="faq-list">
            <details class="faq-item" open>
                <summary>How to use ${title} online for free?</summary>
                <p>Open the tool, add your input file or text, choose output settings, then process and download the result.</p>
                <p>Quick tip: test with a small sample first, then run your full file for faster troubleshooting.</p>
            </details>
            <details class="faq-item">
                <summary>What are the best settings for ${title}?</summary>
                <p>${getFaqBestSettingText(toolType)}</p>
            </details>
            <details class="faq-item">
                <summary>Is ${title} safe to use? Are files uploaded?</summary>
                <p>Most tasks run in your browser. If any network step is required, the page flow indicates it clearly.</p>
            </details>
            <details class="faq-item">
                <summary>Why is ${title} not working or stuck?</summary>
                <p>Try a smaller input, switch output format, refresh the page, then retry. For large files, keep enough free memory and close heavy tabs.</p>
            </details>
            <details class="faq-item">
                <summary>Can I use ${title} on mobile?</summary>
                <p>Yes. The tool works on modern mobile browsers, but desktop usually performs better for large files and long processing jobs.</p>
            </details>
            <details class="faq-item">
                <summary>Pro tips to get better results with ${title}</summary>
                <ul>
                    <li>${tips[0]}</li>
                    <li>${tips[1]}</li>
                    <li>${tips[2]}</li>
                </ul>
            </details>
            ${shortcutsBlock}
        </div>
    `;

    if (!existingFaq) appRoot.appendChild(faq);
}

function buildToolsFooter() {
    if (document.body?.hasAttribute("data-skip-tools-footer")) return;
    if (document.querySelector(".tools-footer-nav")) return;

    const current = getCurrentToolFile();
    if (current === "index.html") return;

    const appRoot = document.querySelector("main.app") || document.querySelector("main");
    if (!appRoot) return;

    const baseUrl = getToolBaseUrl();
    const footer = document.createElement("details");
    footer.className = "tools-footer-nav";
    footer.open = true;

    const trigger = document.createElement("summary");
    trigger.className = "tools-footer-trigger";
    trigger.textContent = "All Tools";
    footer.appendChild(trigger);

    const content = document.createElement("div");
    content.className = "tools-footer-content";

    const grid = document.createElement("div");
    grid.className = "tools-footer-groups";

    const tools = TOOL_LINKS.filter((tool) => tool.file.toLowerCase() !== "index.html")
        .slice()
        .sort((a, b) => a.label.localeCompare(b.label));

    const groupedTools = new Map(TOOL_FOOTER_GROUPS.map((group) => [group.key, []]));
    tools.forEach((tool) => {
        const group = TOOL_FOOTER_GROUPS.find((entry) => entry.test(tool.label)) || TOOL_FOOTER_GROUPS[TOOL_FOOTER_GROUPS.length - 1];
        groupedTools.get(group.key).push(tool);
    });

    TOOL_FOOTER_GROUPS.forEach((group) => {
        const matches = groupedTools.get(group.key) || [];
        if (!matches.length) return;

        const section = document.createElement("section");
        section.className = "tools-footer-group";

        const heading = document.createElement("h3");
        heading.textContent = group.title;
        section.appendChild(heading);

        const linksWrap = document.createElement("div");
        linksWrap.className = "tools-footer-links";

        matches.forEach((tool) => {
            const link = document.createElement("a");
            link.href = getToolHref(tool.file, baseUrl);
            link.textContent = tool.label;
            if (tool.file.toLowerCase() === current) {
                link.classList.add("active");
            }
            linksWrap.appendChild(link);
        });

        section.appendChild(linksWrap);
        grid.appendChild(section);
    });

    const legal = document.createElement("div");
    legal.className = "tools-footer-legal tools-footer-legal-global";
    legal.innerHTML = `
        <a href="${new URL("./about-us/", baseUrl).href}">About Us</a>
        <a href="${new URL("./privacy-policy/", baseUrl).href}">Privacy Policy</a>
        <a href="${new URL("./terms-and-conditions/", baseUrl).href}">Terms and Conditions</a>
        <a href="${new URL("./feedback/", baseUrl).href}">Feedback Form</a>
    `;

    content.appendChild(grid);
    footer.appendChild(content);
    appRoot.appendChild(footer);
    appRoot.appendChild(legal);
}
function getToolBaseUrl() {
    try {
        const src = document.currentScript?.src;
        if (src) return new URL("./", src);
    } catch (_) {
        // ignore and fallback
    }
    try {
        const tag = document.querySelector('script[src$="tools-menu.js"], script[src*="/tools-menu.js"]');
        const src = tag?.getAttribute("src");
        if (src) return new URL(src, window.location.href);
    } catch (_) {
        // ignore and fallback
    }
    return new URL("./", window.location.href);
}

function getToolHref(file, baseUrl) {
    const normalized = (file || "").toLowerCase();
    if (normalized === "index.html") {
        return new URL("./", baseUrl).href;
    }
    const slug = getCanonicalToolSlug(normalized);
    return new URL(`./${slug}/`, baseUrl).href;
}

function getCanonicalToolSlug(file) {
    const normalized = String(file || "").toLowerCase();
    const ensuredFile = normalized.endsWith(".html") ? normalized : `${normalized}.html`;
    return TOOL_ROUTE_OVERRIDES[ensuredFile] || ensuredFile.replace(/\.html$/i, "");
}

function resolveToolFileFromSlug(slug) {
    const normalized = String(slug || "").toLowerCase().replace(/\/+$/g, "");
    if (!normalized) return "";

    const canonicalSlug = LEGACY_ROUTE_ALIASES[normalized] || normalized;
    for (const tool of TOOL_LINKS) {
        const file = String(tool.file || "").toLowerCase();
        if (!file || file === "index.html") continue;
        const directSlug = file.replace(/\.html$/i, "");
        const mappedSlug = getCanonicalToolSlug(file);
        if (canonicalSlug === mappedSlug || canonicalSlug === directSlug) {
            return file;
        }
    }
    return "";
}

function normalizeCleanUrl() {
    const { pathname, search, hash } = window.location;
    let cleanPath = pathname;

    if (/\/index\.html$/i.test(cleanPath)) {
        cleanPath = cleanPath.replace(/index\.html$/i, "");
    }

    const parts = cleanPath.split("/").filter(Boolean);
    if (parts.length) {
        const last = parts[parts.length - 1].toLowerCase();
        const resolved = resolveToolFileFromSlug(last);
        if (resolved) {
            const canonicalSlug = getCanonicalToolSlug(resolved);
            if (last !== canonicalSlug) {
                parts[parts.length - 1] = canonicalSlug;
                cleanPath = `/${parts.join("/")}/`;
            }
        }
    }

    if (cleanPath !== pathname) {
        history.replaceState({}, "", `${cleanPath}${search}${hash}`);
    }
}

function selectionIntersectsTarget(target) {
    if (!(target instanceof Node) || typeof window.getSelection !== "function") return false;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return false;
    if (!String(selection.toString() || "").trim()) return false;

    for (let index = 0; index < selection.rangeCount; index += 1) {
        try {
            if (selection.getRangeAt(index).intersectsNode(target)) {
                return true;
            }
        } catch (_) {
            // Ignore browsers that reject intersectsNode for detached nodes.
        }
    }
    return false;
}

function preventClicksAfterTextSelection() {
    if (document.documentElement.dataset.selectionClickGuardReady === "true") return;
    document.documentElement.dataset.selectionClickGuardReady = "true";

    document.addEventListener("click", (event) => {
        if (event.defaultPrevented || event.detail === 0) return;

        const target = event.target;
        if (!(target instanceof Node)) return;

        const element = target instanceof Element ? target : target.parentElement;
        if (!element) return;
        if (element.closest("input, textarea, select, option, [contenteditable], .tools-menu-panel, .language-menu-panel")) {
            return;
        }
        if (!selectionIntersectsTarget(target)) return;

        event.preventDefault();
        event.stopImmediatePropagation();
        event.stopPropagation();
    }, true);
}

function getCurrentToolFile() {
    const parts = location.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return "index.html";
    const last = (parts[parts.length - 1] || "").toLowerCase();

    if (last === "index.html" && parts.length >= 2) {
        const parent = parts[parts.length - 2].toLowerCase();
        const resolvedParent = resolveToolFileFromSlug(parent);
        if (resolvedParent) return resolvedParent;
        return "index.html";
    }

    if (last.endsWith(".html")) {
        const direct = TOOL_LINKS.find((tool) => (tool.file || "").toLowerCase() === last);
        if (direct) return last;
        const resolvedFromHtml = resolveToolFileFromSlug(last.replace(/\.html$/i, ""));
        if (resolvedFromHtml) return resolvedFromHtml;
        return "index.html";
    }

    const resolved = resolveToolFileFromSlug(last);
    if (resolved) return resolved;
    return "index.html";
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        normalizeCleanUrl();
        preventClicksAfterTextSelection();
        removeHeaderToolsMenu();
        buildBrandLink();
        ensureLanguageSelector();
        buildToolsMenu();
        buildGlobalFaq();
        buildToolsFooter();
        collectTranslatableNodes(document.body);
        scheduleLanguageApply();
        observeTranslations();
    });
} else {
    normalizeCleanUrl();
    preventClicksAfterTextSelection();
    removeHeaderToolsMenu();
    buildBrandLink();
    ensureLanguageSelector();
    buildToolsMenu();
    buildGlobalFaq();
    buildToolsFooter();
    collectTranslatableNodes(document.body);
    scheduleLanguageApply();
    observeTranslations();
}





