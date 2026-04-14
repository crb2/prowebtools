const ccInput = document.getElementById("ccInput");
const ccLanguage = document.getElementById("ccLanguage");
const ccLangTrigger = document.getElementById("ccLangTrigger");
const ccLangMenu = document.getElementById("ccLangMenu");
const ccLangFlag = document.getElementById("ccLangFlag");
const ccLangLabel = document.getElementById("ccLangLabel");
const ccLangOptions = Array.from(document.querySelectorAll(".cc-lang-option"));
const ccMeta = document.getElementById("ccMeta");
const ccStatus = document.getElementById("ccStatus");
const ccFontDec = document.getElementById("ccFontDec");
const ccFontInc = document.getElementById("ccFontInc");
const ccFontSizeValue = document.getElementById("ccFontSizeValue");
const ccBold = document.getElementById("ccBold");
const ccItalic = document.getElementById("ccItalic");
const ccAlignButtons = Array.from(document.querySelectorAll(".cc-align"));
const ccUndo = document.getElementById("ccUndo");
const ccRedo = document.getElementById("ccRedo");
const ccContinue = document.getElementById("ccContinue");
const ccSentence = document.getElementById("ccSentence");
const ccLower = document.getElementById("ccLower");
const ccUpper = document.getElementById("ccUpper");
const ccCapitalized = document.getElementById("ccCapitalized");
const ccInverse = document.getElementById("ccInverse");
const ccAlternating = document.getElementById("ccAlternating");
const ccDownload = document.getElementById("ccDownload");
const ccCopy = document.getElementById("ccCopy");
const ccClear = document.getElementById("ccClear");

const STORAGE_KEY = "case_converter_state_v1";
const CONTINUE_KEY = "case_converter_continue_v1";
const HISTORY_LIMIT = 120;

let historyStack = [];
let historyIndex = -1;
let isApplyingHistory = false;
let inputDebounceTimer = null;
let fontHoldDelayTimer = null;
let fontHoldRepeatTimer = null;
let activeCaseHint = "default";

const LANGUAGE_PLACEHOLDERS = {
    "en-US": "Type or paste text here...",
    "en-GB": "Type or paste text here...",
    "es-ES": "Escribe o pega tu texto aquí...",
    "es-MX": "Escribe o pega tu texto aquí...",
    "pt-BR": "Digite ou cole seu texto aqui...",
    "pt-PT": "Escreva ou cole o seu texto aqui...",
    "fr-FR": "Saisissez ou collez votre texte ici...",
    "de-DE": "Geben Sie hier Ihren Text ein oder fügen Sie ihn ein...",
    "nl-NL": "Typ of plak hier tekst...",
    "sv-SE": "Skriv eller klistra in text här...",
    "no-NO": "Skriv eller lim inn tekst her...",
    "da-DK": "Skriv eller indsæt tekst her...",
    "fi-FI": "Kirjoita tai liitä teksti tähän...",
    "pl-PL": "Wpisz lub wklej tekst tutaj...",
    "cs-CZ": "Sem napište nebo vložte text...",
    "sk-SK": "Sem napíšte alebo vložte text...",
    "sl-SI": "Vnesite ali prilepite besedilo tukaj...",
    "hr-HR": "Upišite ili zalijepite tekst ovdje...",
    "ro-RO": "Scrie sau lipește textul aici...",
    "hu-HU": "Írja be vagy illessze be a szöveget ide...",
    "ru-RU": "Введите или вставьте текст здесь...",
    "uk-UA": "Введіть або вставте текст тут...",
    "bg-BG": "Въведете или поставете текст тук...",
    "el-GR": "Πληκτρολογήστε ή επικολλήστε κείμενο εδώ...",
    "lt-LT": "Įveskite arba įklijuokite tekstą čia...",
    "lv-LV": "Ierakstiet vai ielīmējiet tekstu šeit...",
    "et-EE": "Sisestage või kleepige tekst siia...",
    "is-IS": "Skrifaðu eða límdu texta hér...",
    "sq-AL": "Shkruani ose ngjisni tekstin këtu...",
    "az-AZ": "Mətni bura yazın və ya yapışdırın...",
    "id-ID": "Ketik atau tempel teks di sini...",
    "ms-MY": "Taip atau tampal teks di sini...",
    "vi-VN": "Nhập hoặc dán văn bản tại đây...",
    "tl-PH": "I-type o i-paste ang text dito...",
    "ca-ES": "Escriu o enganxa el text aquí...",
    "tr-TR": "Metni buraya yazın veya yapıştırın...",
    "it-IT": "Scrivi o incolla qui il testo..."
};

function updatePlaceholderByMode() {
    const lang = (ccInput.lang && LANGUAGE_PLACEHOLDERS[ccInput.lang]) ? ccInput.lang : "en-US";
    const base = LANGUAGE_PLACEHOLDERS[lang] || LANGUAGE_PLACEHOLDERS["en-US"];
    if (activeCaseHint === "sentence") {
        ccInput.placeholder = toSentenceCase(base);
        return;
    }
    if (activeCaseHint === "lower") {
        ccInput.placeholder = base.toLowerCase();
        return;
    }
    if (activeCaseHint === "upper") {
        ccInput.placeholder = base.toUpperCase();
        return;
    }
    if (activeCaseHint === "capitalized") {
        ccInput.placeholder = toCapitalizedCase(base);
        return;
    }
    if (activeCaseHint === "inverse") {
        ccInput.placeholder = toInverseCase(base);
        return;
    }
    if (activeCaseHint === "alternating") {
        ccInput.placeholder = toAlternatingCase(base);
        return;
    }
    ccInput.placeholder = base;
}

function getLanguageFontStack(lang, dir) {
    return `Consolas, "Cascadia Mono", "Courier New", monospace`;
}

function setStatus(message, mode = "loading") {
    ccStatus.textContent = message;
    if (mode === "error") ccStatus.style.color = "#ef4444";
    else if (mode === "success") ccStatus.style.color = "#22c55e";
    else ccStatus.style.color = document.body.classList.contains("dark-mode") ? "#facc15" : "#b8860b";
}

function getWordCount(text) {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
}

function getLineCount(text) {
    if (!text) return 0;
    return text.split(/\r?\n/).length;
}

function updateMeta() {
    const text = ccInput.value || "";
    const chars = text.length;
    const words = getWordCount(text);
    const lines = getLineCount(text);
    ccMeta.textContent = `Chars: ${chars} | Words: ${words} | Lines: ${lines}`;
}

function getCurrentState() {
    const size = Number(ccFontSizeValue.textContent) || 16;
    const activeAlign = ccAlignButtons.find((btn) => btn.classList.contains("is-active"));
    const selectedLang = ccLanguage ? ccLanguage.value : "en-US";
    const selectedOption = getLanguageOption(selectedLang);
    return {
        text: ccInput.value || "",
        size: Math.max(10, Math.min(72, size)),
        bold: ccBold.classList.contains("is-active"),
        italic: ccItalic.classList.contains("is-active"),
        align: activeAlign ? activeAlign.dataset.align : "left",
        lang: selectedLang,
        dir: selectedOption ? (selectedOption.dataset.dir || "ltr") : "ltr"
    };
}

function applyState(state) {
    const next = state || {};
    const safeSize = Math.max(10, Math.min(72, Number(next.size) || 16));
    const align = next.align === "center" || next.align === "right" ? next.align : "left";
    const lang = typeof next.lang === "string" && next.lang ? next.lang : "en-US";
    ccInput.value = typeof next.text === "string" ? next.text : "";
    applyLanguageSelection(lang, { commit: false, showStatus: false });
    ccFontSizeValue.textContent = String(safeSize);
    ccBold.classList.toggle("is-active", !!next.bold);
    ccItalic.classList.toggle("is-active", !!next.italic);
    ccAlignButtons.forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.align === align);
    });
    renderTextStyles();
    updateMeta();
}

function statesEqual(a, b) {
    if (!a || !b) return false;
    return (
        a.text === b.text &&
        a.size === b.size &&
        a.bold === b.bold &&
        a.italic === b.italic &&
        a.align === b.align &&
        a.lang === b.lang &&
        a.dir === b.dir
    );
}

function pushHistoryState() {
    if (isApplyingHistory) return;
    const current = getCurrentState();
    const last = historyStack[historyIndex];
    if (last && statesEqual(last, current)) return;

    if (historyIndex < historyStack.length - 1) {
        historyStack = historyStack.slice(0, historyIndex + 1);
    }
    historyStack.push(current);
    if (historyStack.length > HISTORY_LIMIT) {
        historyStack.shift();
    }
    historyIndex = historyStack.length - 1;
    updateHistoryButtons();
}

function updateHistoryButtons() {
    ccUndo.disabled = historyIndex <= 0;
    ccRedo.disabled = historyIndex >= historyStack.length - 1;
}

function renderTextStyles() {
    const size = Number(ccFontSizeValue.textContent) || 16;
    const align = getActiveAlign();
    ccInput.style.fontSize = `${Math.max(10, Math.min(72, size))}px`;
    ccInput.style.fontWeight = ccBold.classList.contains("is-active") ? "700" : "400";
    ccInput.style.fontStyle = ccItalic.classList.contains("is-active") ? "italic" : "normal";
    ccInput.style.textAlign = align;
}

function getActiveAlign() {
    return (ccAlignButtons.find((btn) => btn.classList.contains("is-active")) || {}).dataset?.align || "left";
}

function getLanguageOption(value) {
    return ccLangOptions.find((opt) => opt.dataset.value === value) || null;
}

function updateLanguagePickerUI(option) {
    if (!option) return;
    ccLangOptions.forEach((opt) => opt.classList.toggle("is-active", opt === option));
    if (ccLangLabel) ccLangLabel.textContent = option.textContent || "";
    if (ccLangFlag) {
        const country = (option.dataset.country || "us").toLowerCase();
        ccLangFlag.src = `https://flagcdn.com/w20/${country}.png`;
        ccLangFlag.alt = `${country.toUpperCase()} flag`;
    }
}

function buildAlignedTextForExport(text) {
    const align = getActiveAlign();
    if (align === "left") return text;

    const lines = (text || "").split(/\r?\n/);
    const longest = lines.reduce((max, line) => Math.max(max, line.length), 0);
    if (longest <= 0) return text;

    return lines
        .map((line) => {
            if (!line) return line;
            if (align === "right") {
                return `${" ".repeat(Math.max(0, longest - line.length))}${line}`;
            }
            const leftPad = Math.floor(Math.max(0, longest - line.length) / 2);
            return `${" ".repeat(leftPad)}${line}`;
        })
        .join("\n");
}

function saveStateIfNeeded() {
    if (!ccContinue.checked) return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(getCurrentState()));
    } catch (_) {
        // Ignore storage errors
    }
}

function saveContinuePreference() {
    try {
        localStorage.setItem(CONTINUE_KEY, ccContinue.checked ? "1" : "0");
    } catch (_) {
        // Ignore storage errors
    }
}

function loadContinuePreference() {
    try {
        const raw = localStorage.getItem(CONTINUE_KEY);
        if (raw === "0") ccContinue.checked = false;
        else if (raw === "1") ccContinue.checked = true;
    } catch (_) {
        // Ignore storage errors
    }
}

function loadSavedState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return false;
        applyState(parsed);
        return true;
    } catch (_) {
        return false;
    }
}

function setFontSize(nextSize) {
    const clamped = Math.max(10, Math.min(72, nextSize));
    ccFontSizeValue.textContent = String(clamped);
    renderTextStyles();
    pushHistoryState();
    saveStateIfNeeded();
}

function clearFontHold() {
    if (fontHoldDelayTimer) {
        clearTimeout(fontHoldDelayTimer);
        fontHoldDelayTimer = null;
    }
    if (fontHoldRepeatTimer) {
        clearInterval(fontHoldRepeatTimer);
        fontHoldRepeatTimer = null;
    }
}

function stepFontSize(direction) {
    const current = Number(ccFontSizeValue.textContent) || 16;
    const delta = direction === "up" ? 1 : -1;
    setFontSize(current + delta);
}

function startFontHold(direction) {
    stepFontSize(direction);
    fontHoldDelayTimer = setTimeout(() => {
        fontHoldRepeatTimer = setInterval(() => {
            stepFontSize(direction);
        }, 70);
    }, 300);
}

function setAlign(align) {
    ccAlignButtons.forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.align === align);
    });
    renderTextStyles();
    pushHistoryState();
    saveStateIfNeeded();
}

function applyLanguageSelection(value = null, options = {}) {
    if (!ccLanguage) return;
    const { commit = true, showStatus = true } = options;
    const lang = value || ccLanguage.value || "en-US";
    const option = getLanguageOption(lang) || getLanguageOption("en-US");
    if (!option) return;
    ccLanguage.value = option.dataset.value || "en-US";
    const dir = option.dataset.dir === "rtl" ? "rtl" : "ltr";
    updateLanguagePickerUI(option);
    ccInput.lang = ccLanguage.value || "en-US";
    ccInput.dir = dir;
    updatePlaceholderByMode();
    ccInput.style.fontFamily = getLanguageFontStack(ccInput.lang, dir);

    // Keep typing/placeholder start side aligned with language direction.
    const activeAlign = getActiveAlign();
    if (dir === "rtl" && activeAlign === "left") {
        ccAlignButtons.forEach((btn) => {
            btn.classList.toggle("is-active", btn.dataset.align === "right");
        });
        renderTextStyles();
    } else if (dir === "ltr" && activeAlign === "right") {
        ccAlignButtons.forEach((btn) => {
            btn.classList.toggle("is-active", btn.dataset.align === "left");
        });
        renderTextStyles();
    }

    if (commit) {
        pushHistoryState();
        saveStateIfNeeded();
    }
    if (showStatus) setStatus(`Language set to ${option.textContent}.`, "success");
}

function hasMatches(text, pattern) {
    const matches = text.match(pattern);
    return matches ? matches.length : 0;
}

function countScriptChars(text, pattern) {
    const matches = text.match(pattern);
    return matches ? matches.length : 0;
}

function countDictionaryHits(text, wordsSet) {
    const tokens = (text.toLowerCase().match(/[a-zà-öø-ÿ]+/gi) || []).map((w) => w.toLowerCase());
    let hits = 0;
    for (let i = 0; i < tokens.length; i += 1) {
        if (wordsSet.has(tokens[i])) hits += 1;
    }
    return hits;
}

function detectLanguageFromText(text, currentLang = "en-US") {
    const sample = (text || "").trim().slice(-320);
    if (!sample) return null;

    // Script-first detection for strong signals (count-based to avoid one-char false positives).
    const cyrillicCount = countScriptChars(sample, /[\u0400-\u04FF]/gu);
    const greekCount = countScriptChars(sample, /[\u0370-\u03FF]/gu);

    if (greekCount >= 2) return "el-GR";
    if (cyrillicCount >= 2) {
        if (/[іїєґІЇЄҐ]/u.test(sample)) return "uk-UA";
        if (/[ЪъЍѝ]/u.test(sample)) return "bg-BG";
        return "ru-RU";
    }

    // Latin-script heuristics for supported languages.
    const latinCount = hasMatches(sample, /[A-Za-z]/g);
    if (!latinCount) return null;

    const scores = {
        "en-US": 0,
        "en-GB": 0,
        "es-ES": 0,
        "es-MX": 0,
        "pt-BR": 0,
        "pt-PT": 0,
        "fr-FR": 0,
        "de-DE": 0,
        "tr-TR": 0,
        "it-IT": 0,
        "id-ID": 0
    };

    scores["tr-TR"] += hasMatches(sample, /[çğıİöşü]/g) * 3;
    scores["de-DE"] += hasMatches(sample, /[äöüß]/gi) * 3;
    scores["es-ES"] += hasMatches(sample, /[ñ¿¡]/g) * 4;
    scores["es-ES"] += hasMatches(sample, /[áéíóúü]/gi);
    scores["pt-BR"] += hasMatches(sample, /[ãõâêôàç]/gi) * 3;
    scores["pt-BR"] += hasMatches(sample, /[áéíóú]/gi);
    scores["fr-FR"] += hasMatches(sample, /[àâæçéèêëîïôœùûÿ]/gi) * 3;
    scores["it-IT"] += hasMatches(sample, /[àèéìíîòóù]/gi) * 2;

    // Word-level hints to avoid close-language false positives.
    const spanishWords = new Set(["el", "la", "los", "las", "de", "del", "que", "como", "con", "para", "una", "uno", "está", "gracias", "hola", "pero", "por", "sin", "muy", "más"]);
    const portugueseWords = new Set(["o", "a", "os", "as", "de", "do", "da", "que", "com", "para", "uma", "um", "você", "não", "está", "obrigado", "obrigada", "muito", "mais", "por"]);
    const germanWords = new Set(["der", "die", "das", "und", "ist", "nicht", "ich", "du", "wir", "sie", "ein", "eine", "mit", "auf", "zu", "im", "den", "dem", "des", "für", "von", "bei"]);
    const frenchWords = new Set(["le", "la", "les", "et", "est", "je", "tu", "vous", "nous", "un", "une", "de", "du", "des", "dans", "pour", "avec", "pas", "que", "qui"]);
    const italianWords = new Set(["il", "lo", "la", "gli", "le", "che", "per", "con", "una", "un", "sono", "non", "come", "ciao", "grazie", "questo", "questa", "del", "della", "molto"]);
    const indonesianWords = new Set(["yang", "dan", "dengan", "untuk", "ini", "itu", "saya", "kamu", "tidak", "ada", "akan", "sudah", "bisa", "dari", "ke", "di", "pada", "karena", "seperti", "juga"]);

    scores["es-ES"] += countDictionaryHits(sample, spanishWords) * 2;
    scores["pt-BR"] += countDictionaryHits(sample, portugueseWords) * 2;
    scores["de-DE"] += countDictionaryHits(sample, germanWords) * 2;
    scores["fr-FR"] += countDictionaryHits(sample, frenchWords) * 2;
    scores["it-IT"] += countDictionaryHits(sample, italianWords) * 2;
    scores["id-ID"] += countDictionaryHits(sample, indonesianWords) * 2;
    scores["en-GB"] = scores["en-US"];
    scores["es-MX"] = scores["es-ES"];
    scores["pt-PT"] = scores["pt-BR"];

    // Resolve frequent DE/FR ties using script-specific accents.
    if (scores["de-DE"] === scores["fr-FR"] && scores["de-DE"] > 0) {
        if (/[äöüß]/i.test(sample)) return "de-DE";
        if (/[àâæçéèêëîïôœùûÿ]/i.test(sample)) return "fr-FR";
    }

    const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const best = ranked[0];
    if (best && best[1] >= 3) {
        const topScore = best[1];
        const tiedTop = ranked.filter((entry) => entry[1] === topScore).map((entry) => entry[0]);
        if (tiedTop.includes(currentLang)) return currentLang;
        return best[0];
    }

    // Plain latin text: default to English only when coming from non-latin scripts.
    const nonLatinLangs = new Set(["ru-RU", "uk-UA", "bg-BG", "el-GR"]);
    if (latinCount >= 3 && nonLatinLangs.has(currentLang)) return "en-US";

    return null;
}

function autoDetectAndApplyLanguage() {
    if (!ccLanguage) return;
    const currentLang = ccLanguage.value || "en-US";
    const detectedLang = detectLanguageFromText(ccInput.value || "", currentLang);
    if (!detectedLang || detectedLang === currentLang) return;
    const currentFamily = currentLang.split("-")[0];
    const detectedFamily = detectedLang.split("-")[0];
    if (currentFamily === detectedFamily) return;
    applyLanguageSelection(detectedLang, { commit: false, showStatus: false });
    const detectedOption = getLanguageOption(detectedLang);
    if (detectedOption) {
        setStatus(`Language auto-detected: ${detectedOption.textContent}.`, "success");
    }
}

function applyTextTransform(transformFn, successMessage) {
    const text = ccInput.value || "";
    const result = transformFn(text);
    ccInput.value = result;
    updateMeta();
    pushHistoryState();
    saveStateIfNeeded();
    setStatus(successMessage, "success");
}

function toSentenceCase(text) {
    const lower = text.toLowerCase();
    return lower.replace(/(^|[.!?]\s+|\n+)(\p{L})/gu, (match, start, letter) => `${start}${letter.toUpperCase()}`);
}

function toCapitalizedCase(text) {
    return text
        .toLowerCase()
        .replace(/(^|[^\p{L}\p{N}]+)(\p{L})/gu, (match, boundary, letter) => `${boundary}${letter.toUpperCase()}`);
}

function toInverseCase(text) {
    let out = "";
    for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        const lower = ch.toLowerCase();
        const upper = ch.toUpperCase();
        if (ch === lower && ch !== upper) out += upper;
        else if (ch === upper && ch !== lower) out += lower;
        else out += ch;
    }
    return out;
}

function toAlternatingCase(text) {
    let out = "";
    let upperNext = false;
    for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        const isLetter = /\p{L}/u.test(ch);
        if (!isLetter) {
            out += ch;
            continue;
        }
        out += upperNext ? ch.toUpperCase() : ch.toLowerCase();
        upperNext = !upperNext;
    }
    return out;
}

function handleUndo() {
    if (historyIndex <= 0) return;
    historyIndex -= 1;
    isApplyingHistory = true;
    applyState(historyStack[historyIndex]);
    isApplyingHistory = false;
    updateHistoryButtons();
    saveStateIfNeeded();
    setStatus("Undo applied.", "success");
}

function handleRedo() {
    if (historyIndex >= historyStack.length - 1) return;
    historyIndex += 1;
    isApplyingHistory = true;
    applyState(historyStack[historyIndex]);
    isApplyingHistory = false;
    updateHistoryButtons();
    saveStateIfNeeded();
    setStatus("Redo applied.", "success");
}

function downloadTextFile() {
    const text = buildAlignedTextForExport(ccInput.value || "");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "case-converted.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatus("Downloaded as case-converted.txt.", "success");
}

async function copyToClipboard() {
    try {
        await navigator.clipboard.writeText(ccInput.value || "");
        setStatus("Copied to clipboard.", "success");
    } catch (_) {
        setStatus("Copy failed. Browser blocked clipboard access.", "error");
    }
}

function clearAll() {
    ccInput.value = "";
    updateMeta();
    pushHistoryState();
    saveStateIfNeeded();
    setStatus("Cleared.", "success");
}

ccInput.addEventListener("input", () => {
    autoDetectAndApplyLanguage();
    updateMeta();
    if (inputDebounceTimer) clearTimeout(inputDebounceTimer);
    inputDebounceTimer = setTimeout(() => {
        pushHistoryState();
        saveStateIfNeeded();
    }, 200);
});

[ccFontDec, ccFontInc].forEach((btn) => {
    const direction = btn === ccFontInc ? "up" : "down";
    btn.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        clearFontHold();
        startFontHold(direction);
    });
    btn.addEventListener("pointerup", clearFontHold);
    btn.addEventListener("pointerleave", clearFontHold);
    btn.addEventListener("pointercancel", clearFontHold);
    btn.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        stepFontSize(direction);
    });
});

document.addEventListener("pointerup", clearFontHold);

ccBold.addEventListener("click", () => {
    ccBold.classList.toggle("is-active");
    renderTextStyles();
    pushHistoryState();
    saveStateIfNeeded();
});

ccItalic.addEventListener("click", () => {
    ccItalic.classList.toggle("is-active");
    renderTextStyles();
    pushHistoryState();
    saveStateIfNeeded();
});

ccAlignButtons.forEach((btn) => {
    btn.addEventListener("click", () => setAlign(btn.dataset.align || "left"));
});

ccUndo.addEventListener("click", handleUndo);
ccRedo.addEventListener("click", handleRedo);

ccContinue.addEventListener("change", () => {
    saveContinuePreference();
    if (!ccContinue.checked) {
        localStorage.removeItem(STORAGE_KEY);
        setStatus("Auto-save turned off.", "loading");
        return;
    }
    saveStateIfNeeded();
    setStatus("Auto-save turned on.", "success");
});

if (ccLanguage) {
    ccLanguage.addEventListener("change", () => applyLanguageSelection(ccLanguage.value));
}

if (ccLangTrigger && ccLangMenu) {
    ccLangTrigger.addEventListener("click", () => {
        const willOpen = ccLangMenu.hasAttribute("hidden");
        if (willOpen) {
            ccLangMenu.removeAttribute("hidden");
            ccLangTrigger.setAttribute("aria-expanded", "true");
        } else {
            ccLangMenu.setAttribute("hidden", "");
            ccLangTrigger.setAttribute("aria-expanded", "false");
        }
    });
}

ccLangOptions.forEach((opt) => {
    opt.addEventListener("click", () => {
        applyLanguageSelection(opt.dataset.value || "en-US");
        if (ccLangMenu) ccLangMenu.setAttribute("hidden", "");
        if (ccLangTrigger) ccLangTrigger.setAttribute("aria-expanded", "false");
    });
});

document.addEventListener("click", (event) => {
    if (!ccLangMenu || !ccLangTrigger) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    const inside = ccLangMenu.contains(target) || ccLangTrigger.contains(target);
    if (inside) return;
    ccLangMenu.setAttribute("hidden", "");
    ccLangTrigger.setAttribute("aria-expanded", "false");
});

ccSentence.addEventListener("click", () => {
    activeCaseHint = "sentence";
    updatePlaceholderByMode();
    applyTextTransform(toSentenceCase, "Converted to sentence case.");
});
ccLower.addEventListener("click", () => {
    activeCaseHint = "lower";
    updatePlaceholderByMode();
    applyTextTransform((t) => t.toLowerCase(), "Converted to lower case.");
});
ccUpper.addEventListener("click", () => {
    activeCaseHint = "upper";
    updatePlaceholderByMode();
    applyTextTransform((t) => t.toUpperCase(), "Converted to upper case.");
});
ccCapitalized.addEventListener("click", () => {
    activeCaseHint = "capitalized";
    updatePlaceholderByMode();
    applyTextTransform(toCapitalizedCase, "Converted to capitalized case.");
});
ccInverse.addEventListener("click", () => {
    activeCaseHint = "inverse";
    updatePlaceholderByMode();
    applyTextTransform(toInverseCase, "Converted to inverse case.");
});
ccAlternating.addEventListener("click", () => {
    activeCaseHint = "alternating";
    updatePlaceholderByMode();
    applyTextTransform(toAlternatingCase, "Converted to alternating case.");
});

ccDownload.addEventListener("click", downloadTextFile);
ccCopy.addEventListener("click", copyToClipboard);
ccClear.addEventListener("click", clearAll);

document.addEventListener("keydown", (event) => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    if (event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        handleUndo();
        return;
    }
    if ((event.key.toLowerCase() === "y") || (event.key.toLowerCase() === "z" && event.shiftKey)) {
        event.preventDefault();
        handleRedo();
    }
});

function init() {
    loadContinuePreference();
    const restored = ccContinue.checked ? loadSavedState() : false;
    if (!restored) {
        applyState({
            text: "",
            size: 16,
            bold: false,
            italic: false,
            align: "left",
            lang: "en-US",
            dir: "ltr"
        });
    }
    pushHistoryState();
    updateHistoryButtons();
    updatePlaceholderByMode();
    setStatus("Ready.");
}

init();

