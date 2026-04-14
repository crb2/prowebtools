import cors from "cors";
import express from "express";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_UPLOAD_BYTES = 2 * 1024 ** 3;
const FFMPEG_BIN = process.env.FFMPEG_BIN || "ffmpeg";
const YT_DLP_TEMP_DIR = process.env.YT_DLP_TEMP_DIR || path.join(process.cwd(), ".yt-dlp-tmp");
const FORMAT_CACHE_TTL_MS = 5 * 60 * 1000;
const FORMAT_FETCH_BUDGET_MS = 28000;
const FORMAT_FETCH_ATTEMPT_TIMEOUT_MS = 7000;
const ENABLE_BROWSER_COOKIE_STRATEGIES = process.env.ENABLE_BROWSER_COOKIE_STRATEGIES === "1";
const facebookFormatCache = new Map();

function resolveWingetYtDlpPath(namePattern) {
    if (process.platform !== "win32") return "";
    const localAppData = process.env.LOCALAPPDATA;
    if (!localAppData) return "";
    const wingetPackagesDir = path.join(localAppData, "Microsoft", "WinGet", "Packages");
    try {
        const entries = fs.readdirSync(wingetPackagesDir, { withFileTypes: true });
        const packageDir = entries.find((entry) =>
            entry.isDirectory() && namePattern.test(entry.name)
        );
        if (!packageDir) return "";
        const packageExe = path.join(wingetPackagesDir, packageDir.name, "yt-dlp.exe");
        return fs.existsSync(packageExe) ? packageExe : "";
    } catch {
        return "";
    }
}

function resolveYtDlpBinaryCandidates() {
    const fromEnv = String(process.env.YT_DLP_BIN || "").trim();
    if (fromEnv) return [fromEnv];

    const nightlyPath = resolveWingetYtDlpPath(/^yt-dlp\.yt-dlp\.nightly_/i);
    const stablePath = resolveWingetYtDlpPath(/^yt-dlp\.yt-dlp_/i);
    const candidates = [nightlyPath, stablePath, "yt-dlp"].filter(Boolean);
    return Array.from(new Set(candidates));
}

const YT_DLP_BIN_CANDIDATES = resolveYtDlpBinaryCandidates();
const YT_DLP_BIN = YT_DLP_BIN_CANDIDATES[0] || "yt-dlp";

try {
    fs.mkdirSync(YT_DLP_TEMP_DIR, { recursive: true });
} catch {
    // Keep running; spawn will fallback to system temp if this fails.
}

app.use(express.json({ limit: "1mb" }));
app.use(
    cors({
        exposedHeaders: [
            "X-File-Name",
            "X-Video-Title",
            "X-Original-Duration",
            "X-Original-Filesize",
            "Content-Disposition"
        ],
        origin(origin, callback) {
            if (!origin) {
                callback(null, true);
                return;
            }
            const allowed = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
            callback(allowed ? null : new Error("CORS blocked"), allowed);
        }
    })
);

function isSupportedVideoHost(hostname) {
    const host = (hostname || "").toLowerCase();
    return (
        host === "youtu.be" ||
        host.endsWith("youtube.com") ||
        host.endsWith("youtube-nocookie.com") ||
        host === "fb.watch" ||
        host.endsWith("facebook.com")
    );
}

function isFacebookHost(hostname) {
    const host = (hostname || "").toLowerCase();
    return host === "fb.watch" || host.endsWith("facebook.com");
}

function sanitizeName(raw) {
    return (raw || "youtube_audio")
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(/[\r\n\t]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/[. ]+$/g, "") || "youtube_audio";
}

function getLikelyMimeByExt(ext) {
    const safe = (ext || "").toLowerCase();
    if (safe === "mp3") return "audio/mpeg";
    if (safe === "m4a" || safe === "mp4") return "audio/mp4";
    if (safe === "webm") return "audio/webm";
    if (safe === "opus") return "audio/ogg";
    if (safe === "ogg") return "audio/ogg";
    if (safe === "flac") return "audio/flac";
    if (safe === "wav") return "audio/wav";
    return "application/octet-stream";
}

function shouldTryAlternativeYtDlp(errorText) {
    const text = String(errorText || "");
    return (
        /cannot parse data|please report this issue on https:\/\/github\.com\/yt-dlp\/yt-dlp\/issues/i.test(text) ||
        /unsupported url|unable to extract|cannot extract/i.test(text) ||
        /yt-dlp is not installed|ENOENT|not recognized as an internal or external command/i.test(text)
    );
}

function runYtDlpCaptureWithBinary(bin, args, timeoutMs = 120000) {
    return new Promise((resolve, reject) => {
        const proc = spawn(bin, args, {
            windowsHide: true,
            env: {
                ...process.env,
                TEMP: YT_DLP_TEMP_DIR,
                TMP: YT_DLP_TEMP_DIR
            }
        });
        let stdout = "";
        let stderr = "";
        let timedOut = false;
        const timeoutId = setTimeout(() => {
            timedOut = true;
            try {
                proc.kill("SIGKILL");
            } catch {
                // ignore kill errors
            }
        }, Math.max(1000, Number(timeoutMs) || 120000));

        proc.stdout.on("data", (chunk) => {
            stdout += chunk.toString();
        });
        proc.stderr.on("data", (chunk) => {
            stderr += chunk.toString();
        });
        proc.on("error", (error) => {
            clearTimeout(timeoutId);
            reject(error);
        });
        proc.on("close", (code) => {
            clearTimeout(timeoutId);
            if (timedOut) {
                reject(new Error("yt-dlp timed out while fetching metadata/formats."));
                return;
            }
            if (code === 0) {
                resolve({ stdout, stderr, bin });
                return;
            }
            const err = new Error(stderr.trim() || `yt-dlp exited with code ${code}`);
            reject(err);
        });
    });
}

async function runYtDlpCapture(args, timeoutMs = 120000) {
    let lastError = null;
    for (const bin of YT_DLP_BIN_CANDIDATES) {
        try {
            return await runYtDlpCaptureWithBinary(bin, args, timeoutMs);
        } catch (error) {
            lastError = error;
            if (!shouldTryAlternativeYtDlp(error?.message || String(error))) {
                break;
            }
        }
    }
    throw (lastError || new Error("yt-dlp failed to fetch metadata/formats."));
}

function runYtDlpExitWithBinary(bin, args, timeoutMs = 480000) {
    return new Promise((resolve, reject) => {
        const proc = spawn(bin, args, {
            windowsHide: true,
            env: {
                ...process.env,
                TEMP: YT_DLP_TEMP_DIR,
                TMP: YT_DLP_TEMP_DIR
            }
        });
        let stderr = "";
        let timedOut = false;
        const timeoutId = setTimeout(() => {
            timedOut = true;
            try {
                proc.kill("SIGKILL");
            } catch {
                // ignore kill errors
            }
        }, Math.max(1000, Number(timeoutMs) || 480000));
        proc.stderr.on("data", (chunk) => {
            stderr += chunk.toString();
        });
        proc.on("error", (error) => {
            clearTimeout(timeoutId);
            reject(error);
        });
        proc.on("close", (code) => {
            clearTimeout(timeoutId);
            if (timedOut) {
                reject(new Error("yt-dlp timed out while downloading/merging this format."));
                return;
            }
            if (code === 0) {
                resolve({ stderr, bin });
                return;
            }
            const err = new Error(stderr.trim() || `yt-dlp exited with code ${code}`);
            reject(err);
        });
    });
}

async function runYtDlpExit(args, timeoutMs = 480000) {
    let lastError = null;
    for (const bin of YT_DLP_BIN_CANDIDATES) {
        try {
            return await runYtDlpExitWithBinary(bin, args, timeoutMs);
        } catch (error) {
            lastError = error;
            if (!shouldTryAlternativeYtDlp(error?.message || String(error))) {
                break;
            }
        }
    }
    throw (lastError || new Error("yt-dlp failed while downloading/merging this format."));
}

function runFfmpegScale(inputPath, outputPath, targetHeight, timeoutMs = 480000) {
    return new Promise((resolve, reject) => {
        const height = Math.max(144, Math.min(4320, Math.round(Number(targetHeight) || 0)));
        const proc = spawn(FFMPEG_BIN, [
            "-y",
            "-i",
            inputPath,
            "-vf",
            `scale=-2:${height}:flags=lanczos`,
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "23",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-movflags",
            "+faststart",
            outputPath
        ], {
            windowsHide: true
        });

        let stderr = "";
        let timedOut = false;
        const timeoutId = setTimeout(() => {
            timedOut = true;
            try {
                proc.kill("SIGKILL");
            } catch {
                // ignore kill errors
            }
        }, Math.max(1000, Number(timeoutMs) || 480000));

        proc.stderr.on("data", (chunk) => {
            stderr += chunk.toString();
        });
        proc.on("error", (error) => {
            clearTimeout(timeoutId);
            reject(error);
        });
        proc.on("close", (code) => {
            clearTimeout(timeoutId);
            if (timedOut) {
                reject(new Error("ffmpeg timed out while converting this format."));
                return;
            }
            if (code === 0) {
                resolve({ stderr });
                return;
            }
            const err = new Error(stderr.trim() || `ffmpeg exited with code ${code}`);
            reject(err);
        });
    });
}

function mapYtDlpError(errorText) {
    const text = String(errorText || "");
    if (/cannot parse data|please report this issue on https:\/\/github\.com\/yt-dlp\/yt-dlp\/issues/i.test(text)) {
        return {
            status: 502,
            message: "Facebook changed this page format. Try opening the post publicly in browser and copy the direct /videos/ URL."
        };
    }
    if (/failed to decrypt with dpapi|dpapi/i.test(text)) {
        return {
            status: 400,
            message: "This Facebook link appears private, unavailable, or login-only. Please try a publicly accessible link."
        };
    }
    if (/timed out|timeout/i.test(text)) {
        return { status: 504, message: "This quality is taking too long to process. Try 1080p/720p or retry in a minute." };
    }
    if (/ffmpeg.*not found|ffmpeg is not recognized|no such file or directory.*ffmpeg/i.test(text)) {
        return { status: 500, message: "ffmpeg is required for converted quality downloads. Install ffmpeg and restart backend." };
    }
    if (/ffmpeg|avconv|postprocessing: ffprobe and ffmpeg not found/i.test(text)) {
        return { status: 500, message: "High-quality Facebook formats require ffmpeg to merge video+audio. Install ffmpeg and restart backend." };
    }
    if (/HTTP Error 429/i.test(text)) {
        return { status: 429, message: "YouTube is rate-limiting this network right now (429). Please wait a few minutes and try again, or change network." };
    }
    if (/HTTP Error 403/i.test(text)) {
        return { status: 403, message: "YouTube denied access to this video (403). Try another video, switch network, or use upload fallback." };
    }
    if (/not found|ENOENT|is not recognized as an internal or external command/i.test(text)) {
        return { status: 500, message: "yt-dlp is not installed or not in PATH. Install it and restart backend." };
    }
    if (/login required|private|not available|unsupported url|cannot extract/i.test(text)) {
        return {
            status: 400,
            message: "This Facebook link may be private, expired, or requires login. Try opening the video publicly and copy the direct video page URL."
        };
    }
    return { status: 500, message: text || "yt-dlp failed to fetch this link." };
}

async function resolveShareUrl(urlText) {
    let parsed;
    try {
        parsed = new URL(urlText);
    } catch {
        return urlText;
    }

    const host = (parsed.hostname || "").toLowerCase();
    if (!isFacebookHost(host)) return parsed.toString();

    const path = (parsed.pathname || "").toLowerCase();
    const isFacebookShare = path.startsWith("/share/");
    const isFacebookRedirector = (host === "l.facebook.com" || host === "lm.facebook.com") && path.startsWith("/l.php");
    const isFbWatch = host === "fb.watch";

    const normalizeFacebookUrl = (rawUrl) => {
        try {
            const raw = new URL(rawUrl);
            const rawHost = (raw.hostname || "").toLowerCase();
            if ((rawHost === "l.facebook.com" || rawHost === "lm.facebook.com") && raw.pathname.toLowerCase() === "/l.php") {
                const redirected = raw.searchParams.get("u");
                if (redirected) {
                    try {
                        const decoded = new URL(redirected);
                        if (isFacebookHost(decoded.hostname)) {
                            decoded.hash = "";
                            return decoded.toString();
                        }
                    } catch {
                        // keep the original URL if u= is not a valid absolute URL
                    }
                }
            }
            const pathLower = (raw.pathname || "").toLowerCase();
            const pruned = new URL(raw.toString());
            const keepOnly = (allowedKeys = []) => {
                const nextParams = new URLSearchParams();
                for (const key of allowedKeys) {
                    const value = pruned.searchParams.get(key);
                    if (value) nextParams.set(key, value);
                }
                pruned.search = nextParams.toString() ? `?${nextParams.toString()}` : "";
            };

            // Normalize known Facebook video/reel patterns to canonical, extractor-friendly URLs.
            if (/^\/reel\/\d+\/?$/i.test(pathLower) || /^\/[^/]+\/reels\/\d+\/?$/i.test(pathLower)) {
                keepOnly([]);
            } else if (/\/videos\/\d+\/?$/i.test(pathLower)) {
                keepOnly([]);
            } else if (pathLower === "/watch" || pathLower === "/watch/") {
                keepOnly(["v"]);
            } else if (pathLower.startsWith("/share/")) {
                // share links are transient wrappers; drop tracking noise.
                keepOnly([]);
            } else {
                // Generic cleanup: remove known tracking params.
                const trackingParams = [
                    "rdid",
                    "share_url",
                    "mibextid",
                    "sfnsn",
                    "refsrc",
                    "ref",
                    "locale2",
                    "__tn__",
                    "paipv",
                    "s",
                    "notif_id",
                    "notif_t",
                    "fs",
                    "hoisted_section_header_type",
                    "eid",
                    "_rdr"
                ];
                for (const key of trackingParams) {
                    pruned.searchParams.delete(key);
                }
                pruned.search = pruned.searchParams.toString() ? `?${pruned.searchParams.toString()}` : "";
            }
            raw.search = pruned.search;
            raw.hash = "";
            return raw.toString();
        } catch {
            return rawUrl;
        }
    };

    const extractFacebookCanonicalFromHtml = (htmlText) => {
        const html = String(htmlText || "");
        if (!html) return "";
        const candidates = [
            /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i,
            /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
            /"canonical_url":"([^"]+)"/i,
            /"video_url":"([^"]+)"/i
        ];
        for (const pattern of candidates) {
            const match = html.match(pattern);
            if (!match || !match[1]) continue;
            const decoded = match[1].replace(/\\\//g, "/").replace(/&amp;/g, "&");
            try {
                const parsedCandidate = new URL(decoded);
                if (isFacebookHost(parsedCandidate.hostname)) {
                    return normalizeFacebookUrl(parsedCandidate.toString());
                }
            } catch {
                // keep searching
            }
        }
        return "";
    };

    const addFacebookHostVariants = (inputUrl, target) => {
        let base;
        try {
            base = new URL(inputUrl);
        } catch {
            return;
        }
        const baseHost = (base.hostname || "").toLowerCase();
        if (!isFacebookHost(baseHost) || baseHost === "fb.watch") {
            target.add(base.toString());
            return;
        }
        for (const variantHost of ["www.facebook.com", "m.facebook.com", "mbasic.facebook.com", "basic.facebook.com"]) {
            const next = new URL(base.toString());
            next.hostname = variantHost;
            next.hash = "";
            target.add(next.toString());
        }
    };

    if (!isFacebookShare && !isFacebookRedirector && !isFbWatch) {
        return normalizeFacebookUrl(parsed.toString());
    }

    const attemptUrls = new Set();
    addFacebookHostVariants(parsed.toString(), attemptUrls);

    try {
        for (const candidateUrl of attemptUrls) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            try {
                const response = await fetch(candidateUrl, {
                    method: "GET",
                    redirect: "follow",
                    signal: controller.signal,
                    headers: {
                        "user-agent": "Mozilla/5.0"
                    }
                });
                clearTimeout(timeout);
                let resolvedRaw = response.url || candidateUrl;
                let resolved = normalizeFacebookUrl(resolvedRaw);

                // Some /share/r links stay on a shell URL; parse canonical/og:url from HTML.
                if (/\/share\//i.test(new URL(resolved).pathname)) {
                    try {
                        const html = await response.text();
                        const canonical = extractFacebookCanonicalFromHtml(html);
                        if (canonical) {
                            resolved = canonical;
                        }
                    } catch {
                        // ignore HTML parse errors and use redirect result
                    }
                } else {
                    try {
                        await response.body?.cancel();
                    } catch {
                        // ignore stream cancel errors
                    }
                }
                try {
                    const resolvedParsed = new URL(resolved);
                    const resolvedHost = (resolvedParsed.hostname || "").toLowerCase();
                    if (/^(m|mbasic|basic)\.facebook\.com$/i.test(resolvedHost)) {
                        resolvedParsed.hostname = "www.facebook.com";
                    }
                    resolvedParsed.hash = "";
                    return resolvedParsed.toString();
                } catch {
                    return resolved;
                }
            } catch {
                clearTimeout(timeout);
                // try next variant
            }
        }
    } catch {
        // fall through to normalized original below
    }

    return normalizeFacebookUrl(parsed.toString());
}

function buildFacebookCandidateUrls(...sources) {
    const result = new Set();
    const add = (candidate) => {
        let parsed;
        try {
            parsed = new URL(String(candidate || ""));
        } catch {
            return;
        }
        if (!isFacebookHost(parsed.hostname)) return;
        parsed.hash = "";
        const host = (parsed.hostname || "").toLowerCase();
        result.add(parsed.toString());
        if (host === "fb.watch") return;
        for (const variantHost of ["www.facebook.com", "m.facebook.com", "mbasic.facebook.com", "basic.facebook.com"]) {
            const variant = new URL(parsed.toString());
            variant.hostname = variantHost;
            variant.hash = "";
            result.add(variant.toString());
        }
    };

    sources.flat().forEach((source) => add(source));
    return Array.from(result);
}

app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
});

app.get("/", (_req, res) => {
    res.status(200).send("Backend running");
});

app.post("/api/fetch-video", async (req, res) => {
    const urlText = String(req.body?.url || "").trim();
    if (!urlText) {
        res.status(400).json({ error: "URL is required." });
        return;
    }

    let parsed;
    try {
        parsed = new URL(urlText);
    } catch {
        res.status(400).json({ error: "Invalid URL." });
        return;
    }

    if (!/^https?:$/i.test(parsed.protocol)) {
        res.status(400).json({ error: "Only http/https links are supported." });
        return;
    }

    if (!isSupportedVideoHost(parsed.hostname)) {
        res.status(400).json({ error: "This endpoint supports YouTube and Facebook links." });
        return;
    }

    try {
        const sourceUrl = await resolveShareUrl(parsed.toString());

        const meta = await runYtDlpCapture([
            "--no-playlist",
            "-f",
            "bestaudio/best",
            "--print",
            "%(title)s",
            "--print",
            "%(ext)s",
            "--print",
            "%(duration)s",
            "--print",
            "%(filesize)s",
            "--print",
            "%(filesize_approx)s",
            sourceUrl
        ]);
        const lines = meta.stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
        const rawTitle = (lines[0] || "youtube_audio").replace(/[\r\n\t]/g, " ").replace(/\s+/g, " ").trim();
        const title = sanitizeName(rawTitle);
        const ext = sanitizeName(lines[1] || "m4a").replace(/\./g, "") || "m4a";
        const durationSec = Number(lines[2] || 0);
        const filesizeExact = Number(lines[3] || 0);
        const filesizeApprox = Number(lines[4] || 0);
        const originalSize = Number.isFinite(filesizeExact) && filesizeExact > 0 ? filesizeExact : filesizeApprox;
        const fileName = `${title}.${ext}`;

        res.setHeader("Content-Type", getLikelyMimeByExt(ext));
        res.setHeader("X-File-Name", encodeURIComponent(fileName));
        res.setHeader("X-Video-Title", encodeURIComponent(rawTitle || title));
        if (Number.isFinite(durationSec) && durationSec > 0) {
            res.setHeader("X-Original-Duration", String(Math.round(durationSec)));
        }
        if (Number.isFinite(originalSize) && originalSize > 0) {
            res.setHeader("X-Original-Filesize", String(Math.round(originalSize)));
        }
        res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`);
        res.setHeader("Cache-Control", "no-store");

        const proc = spawn(YT_DLP_BIN, [
            "--no-playlist",
            "-f",
            "bestaudio/best",
            "-o",
            "-",
            sourceUrl
        ], {
            windowsHide: true,
            env: {
                ...process.env,
                TEMP: YT_DLP_TEMP_DIR,
                TMP: YT_DLP_TEMP_DIR
            }
        });

        let streamedBytes = 0;
        let stderrText = "";
        let endedBySizeLimit = false;

        proc.stdout.on("data", (chunk) => {
            streamedBytes += chunk.length;
            if (streamedBytes > MAX_UPLOAD_BYTES) {
                endedBySizeLimit = true;
                proc.kill("SIGKILL");
                return;
            }
            if (!res.writableEnded) {
                res.write(chunk);
            }
        });

        proc.stderr.on("data", (chunk) => {
            stderrText += chunk.toString();
        });

        proc.on("error", (error) => {
            if (!res.headersSent) {
                const mapped = mapYtDlpError(error.message);
                res.status(mapped.status).json({ error: mapped.message });
            } else {
                res.end();
            }
        });

        proc.on("close", (code) => {
            if (endedBySizeLimit) {
                if (!res.headersSent) {
                    res.status(413).json({ error: "Downloaded file exceeds 2 GB limit." });
                } else {
                    res.end();
                }
                return;
            }
            if (code === 0) {
                if (!res.writableEnded) {
                    res.end();
                }
                return;
            }
            const mapped = mapYtDlpError(stderrText);
            if (!res.headersSent) {
                res.status(mapped.status).json({ error: mapped.message });
            } else {
                res.end();
            }
        });

        req.on("close", () => {
            if (!proc.killed) {
                proc.kill("SIGKILL");
            }
        });
    } catch (error) {
        const mapped = mapYtDlpError(error?.message || String(error));
        res.status(mapped.status).json({ error: mapped.message });
    }
});

app.post("/api/fetch-facebook-video", async (req, res) => {
    const urlText = String(req.body?.url || "").trim();
    if (!urlText) {
        res.status(400).json({ error: "URL is required." });
        return;
    }

    let parsed;
    try {
        parsed = new URL(urlText);
    } catch {
        res.status(400).json({ error: "Invalid URL." });
        return;
    }

    if (!/^https?:$/i.test(parsed.protocol)) {
        res.status(400).json({ error: "Only http/https links are supported." });
        return;
    }

    if (!isFacebookHost(parsed.hostname)) {
        res.status(400).json({ error: "This endpoint supports Facebook links only." });
        return;
    }

    try {
        const listFormats = Boolean(req.body?.listFormats);
        const requestedFormatId = String(req.body?.formatId || "").trim();
        const cacheKey = parsed.toString();
        const cached = facebookFormatCache.get(cacheKey);
        const hasFreshCache = Boolean(cached && (Date.now() - cached.at) < FORMAT_CACHE_TTL_MS);
        if (listFormats && hasFreshCache) {
            res.json({
                ok: true,
                title: cached.title,
                formats: cached.formats
            });
            return;
        }
        const sourceUrl = await resolveShareUrl(parsed.toString());
        const candidateUrls = buildFacebookCandidateUrls(sourceUrl, parsed.toString());
        const strategies = [
            {
                name: "facebook-mp4-edge-cookies",
                formatSelector: "best[ext=mp4]/best",
                args: [
                    "--no-playlist",
                    "--cookies-from-browser",
                    "edge",
                    "--add-header",
                    "Referer:https://www.facebook.com/",
                    "--add-header",
                    "User-Agent:Mozilla/5.0"
                ]
            },
            {
                name: "facebook-mp4-chrome-cookies",
                formatSelector: "best[ext=mp4]/best",
                args: [
                    "--no-playlist",
                    "--cookies-from-browser",
                    "chrome",
                    "--add-header",
                    "Referer:https://www.facebook.com/",
                    "--add-header",
                    "User-Agent:Mozilla/5.0"
                ]
            },
            {
                name: "facebook-mp4",
                formatSelector: "best[ext=mp4]/best",
                args: [
                    "--no-playlist",
                    "--add-header",
                    "Referer:https://www.facebook.com/",
                    "--add-header",
                    "User-Agent:Mozilla/5.0"
                ]
            },
            {
                name: "facebook-best-edge-cookies",
                formatSelector: "best",
                args: [
                    "--no-playlist",
                    "--cookies-from-browser",
                    "edge",
                    "--add-header",
                    "Referer:https://www.facebook.com/",
                    "--add-header",
                    "User-Agent:Mozilla/5.0"
                ]
            },
            {
                name: "facebook-best-chrome-cookies",
                formatSelector: "best",
                args: [
                    "--no-playlist",
                    "--cookies-from-browser",
                    "chrome",
                    "--add-header",
                    "Referer:https://www.facebook.com/",
                    "--add-header",
                    "User-Agent:Mozilla/5.0"
                ]
            },
            {
                name: "facebook-best",
                formatSelector: "best",
                args: [
                    "--no-playlist",
                    "--add-header",
                    "Referer:https://www.facebook.com/",
                    "--add-header",
                    "User-Agent:Mozilla/5.0"
                ]
            },
            {
                name: "generic-best",
                formatSelector: "best",
                args: [
                    "--no-playlist"
                ]
            }
        ];
        const strategiesFiltered = ENABLE_BROWSER_COOKIE_STRATEGIES
            ? strategies
            : strategies.filter((s) => !s.name.includes("cookies"));
        const strategyByName = new Map(strategiesFiltered.map((s) => [s.name, s]));
        const orderedDownloadStrategies = [
            "facebook-best",
            "generic-best",
            "facebook-mp4",
            "facebook-best-edge-cookies",
            "facebook-best-chrome-cookies",
            "facebook-mp4-edge-cookies",
            "facebook-mp4-chrome-cookies"
        ].map((name) => strategyByName.get(name)).filter(Boolean);

        function buildStrategyArgs(strategy, formatSelector) {
            const args = [...strategy.args];
            if (formatSelector) {
                args.push("-f", formatSelector);
            }
            return args;
        }

        function mapFormatsFromInfo(info) {
            const formats = Array.isArray(info?.formats) ? info.formats : [];
            const pickedByHeight = new Map();

            formats.forEach((fmt) => {
                const explicitWidth = Number(fmt?.width || 0);
                const explicitHeightRaw = Number(fmt?.height || 0);
                // Normalize portrait/landscape streams to "p" by shorter side
                // so 540x960 is treated as 540p (not 960p).
                const explicitHeight = explicitWidth > 0 && explicitHeightRaw > 0
                    ? Math.min(explicitWidth, explicitHeightRaw)
                    : explicitHeightRaw;
                const resolutionText = String(fmt?.resolution || "").toLowerCase();
                const formatNoteText = String(fmt?.format_note || "").toLowerCase();
                const formatText = String(fmt?.format || "").toLowerCase();
                const qualityText = String(fmt?.quality || "").toLowerCase();
                const formatIdText = String(fmt?.format_id || "").toLowerCase();
                let parsedHeight = 0;

                if (!explicitHeight) {
                    const noteMatch = formatNoteText.match(/(\d{3,4})p/);
                    if (noteMatch) parsedHeight = Number(noteMatch[1] || 0);
                }
                if (!explicitHeight && !parsedHeight) {
                    const anyLabel = `${formatText} ${qualityText} ${formatIdText}`;
                    const pMatch = anyLabel.match(/(\d{3,4})p/);
                    if (pMatch) parsedHeight = Number(pMatch[1] || 0);
                    if (!parsedHeight) {
                        const hdMatch = anyLabel.match(/hd\s*(\d{3,4})/);
                        if (hdMatch) parsedHeight = Number(hdMatch[1] || 0);
                    }
                }
                if (!explicitHeight && !parsedHeight) {
                    if (/\b8k\b/.test(formatNoteText) || /\b8k\b/.test(resolutionText)) {
                        parsedHeight = 4320;
                    } else if (/\b4k\b/.test(formatNoteText) || /\b4k\b/.test(resolutionText)) {
                        parsedHeight = 2160;
                    } else if (/\b2k\b/.test(formatNoteText) || /\b2k\b/.test(resolutionText)) {
                        parsedHeight = 1440;
                    }
                }
                if (!explicitHeight && !parsedHeight) {
                    const resMatch = resolutionText.match(/(\d{3,5})x(\d{3,5})/);
                    if (resMatch) {
                        const a = Number(resMatch[1] || 0);
                        const b = Number(resMatch[2] || 0);
                        parsedHeight = Math.min(a, b);
                    }
                }

                const height = explicitHeight || parsedHeight;
                const formatId = String(fmt?.format_id || "").trim();
                const hasVideo = fmt?.vcodec && fmt.vcodec !== "none";
                const hasAudio = fmt?.acodec && fmt.acodec !== "none";
                if (!height || !formatId || !hasVideo || !hasAudio) return;

                const normalizedFmt = {
                    ...fmt,
                    _resolvedHeight: height
                };
                const existing = pickedByHeight.get(height);
                const currentScore = Number(normalizedFmt?.tbr || 0);
                const existingScore = existing ? Number(existing?.tbr || 0) : -1;
                const existingHasAudio = Boolean(existing?.acodec && existing.acodec !== "none");
                // Prefer variants that already include audio. If both are same class, pick higher bitrate.
                if (
                    !existing ||
                    (hasAudio && !existingHasAudio) ||
                    (hasAudio === existingHasAudio && currentScore > existingScore)
                ) {
                    pickedByHeight.set(height, normalizedFmt);
                }
            });

            return Array.from(pickedByHeight.values())
                .sort((a, b) => Number(b?._resolvedHeight || b?.height || 0) - Number(a?._resolvedHeight || a?.height || 0))
                .map((fmt) => {
                    const h = Number(fmt?._resolvedHeight || fmt?.height || 0);
                    const fps = Number(fmt?.fps || 0);
                    const ext = String(fmt?.ext || "mp4").toLowerCase();
                    const tbr = Number(fmt?.tbr || 0);
                    const acodecText = String(fmt?.acodec || "").toLowerCase();
                    const formatNoteText = String(fmt?.format_note || "").toLowerCase();
                    const formatText = String(fmt?.format || "").toLowerCase();
                    const hasAudio = !(
                        acodecText === "none" ||
                        /\bvideo only\b/.test(formatNoteText) ||
                        /\bvideo only\b/.test(formatText)
                    );
                    return {
                        id: String(fmt?.format_id || ""),
                        height: h,
                        resolution: String(fmt?.resolution || ""),
                        ext,
                        fps,
                        tbr,
                        hasAudio,
                        label: `${h}p${fps ? ` ${fps}fps` : ""} (${ext.toUpperCase()}${hasAudio ? ", with audio" : ", video only"})`
                    };
                });
        }

        if (listFormats) {
            let chosenInfo = null;
            let chosenTitle = "";
            let lastFormatError = "";
            const rememberFormatError = (error) => {
                const text = String(error?.message || error || "");
                if (!text) return;
                if (/dpapi/i.test(text) && lastFormatError) return;
                lastFormatError = text;
            };
            let bestScore = -1;
            let stopEarly = false;
            const startedAt = Date.now();
            const candidatePriority = buildFacebookCandidateUrls(sourceUrl, parsed.toString());
            const prioritizedUrls = Array.from(new Set([...candidatePriority, ...candidateUrls]));
            const listStrategyOrder = [
                "facebook-best",
                "generic-best",
                "facebook-best-edge-cookies",
                "facebook-best-chrome-cookies",
                "facebook-mp4-edge-cookies",
                "facebook-mp4-chrome-cookies",
                "facebook-mp4"
            ];
            const listStrategies = listStrategyOrder
                .map((name) => strategyByName.get(name))
                .filter(Boolean);

            for (const candidateUrl of prioritizedUrls) {
                for (const strategy of listStrategies) {
                    if ((Date.now() - startedAt) > FORMAT_FETCH_BUDGET_MS) {
                        stopEarly = true;
                        break;
                    }
                    try {
                        const infoRaw = await runYtDlpCapture([
                            ...buildStrategyArgs(strategy, null),
                            "-J",
                            candidateUrl
                        ], FORMAT_FETCH_ATTEMPT_TIMEOUT_MS);
                        const parsedInfo = JSON.parse(infoRaw.stdout || "{}");
                        const mapped = mapFormatsFromInfo(parsedInfo);
                        if (!mapped.length) {
                            throw new Error("No downloadable video+audio formats found.");
                        }
                        const maxHeight = mapped.reduce((max, f) => Math.max(max, Number(f?.height || 0)), 0);
                        const withAudioCount = mapped.reduce((acc, f) => acc + (f?.hasAudio ? 1 : 0), 0);
                        const score = (maxHeight * 10000) + (mapped.length * 100) + withAudioCount;
                        if (score > bestScore) {
                            bestScore = score;
                            chosenInfo = mapped;
                            chosenTitle = String(parsedInfo?.title || "facebook_video").trim();
                            if (maxHeight >= 1440 || (maxHeight >= 1080 && mapped.length >= 3)) {
                                stopEarly = true;
                            }
                        }
                    } catch (error) {
                        rememberFormatError(error);
                    }
                    if (stopEarly) break;
                }
                if (stopEarly) break;
            }

            if (!chosenInfo) {
                if (cached?.formats?.length) {
                    res.json({
                        ok: true,
                        title: cached.title || "facebook_video",
                        formats: cached.formats,
                        cached: true
                    });
                    return;
                }
                const mapped = mapYtDlpError(lastFormatError || "No formats found for this Facebook URL.");
                res.status(mapped.status).json({ error: mapped.message });
                return;
            }

            facebookFormatCache.set(cacheKey, {
                at: Date.now(),
                title: chosenTitle,
                formats: chosenInfo
            });
            if (facebookFormatCache.size > 100) {
                const oldestKey = facebookFormatCache.keys().next().value;
                if (oldestKey) facebookFormatCache.delete(oldestKey);
            }

            res.json({
                ok: true,
                title: chosenTitle,
                formats: chosenInfo
            });
            return;
        }

        let chosenStrategy = null;
        let chosenUrl = "";
        let chosenMetaLines = null;
        let lastMetaError = "";
        const rememberMetaError = (error) => {
            const text = String(error?.message || error || "");
            if (!text) return;
            if (/dpapi/i.test(text) && lastMetaError) return;
            lastMetaError = text;
        };

            for (const candidateUrl of candidateUrls) {
                for (const strategy of orderedDownloadStrategies) {
                    try {
                        const selector = requestedFormatId || strategy.formatSelector;
                        const meta = await runYtDlpCapture([
                            ...buildStrategyArgs(strategy, selector),
                            "--print",
                        "%(title)s",
                        "--print",
                        "%(ext)s",
                        "--print",
                        "%(duration)s",
                        "--print",
                        "%(filesize)s",
                        "--print",
                        "%(filesize_approx)s",
                        candidateUrl
                    ]);
                    const lines = meta.stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
                    if (!lines.length) {
                        throw new Error("No metadata returned");
                    }
                    chosenStrategy = strategy;
                    chosenUrl = candidateUrl;
                    chosenMetaLines = lines;
                    break;
                } catch (error) {
                    rememberMetaError(error);
                }
            }
            if (chosenStrategy && chosenMetaLines) {
                break;
            }
        }

        if (!chosenStrategy || !chosenMetaLines) {
            const mapped = mapYtDlpError(lastMetaError || "Unable to extract Facebook video metadata.");
            res.status(mapped.status).json({ error: mapped.message });
            return;
        }

        const rawTitle = (chosenMetaLines[0] || "facebook_video").replace(/[\r\n\t]/g, " ").replace(/\s+/g, " ").trim();
        const title = sanitizeName(rawTitle);
        const ext = sanitizeName(chosenMetaLines[1] || "mp4").replace(/\./g, "") || "mp4";
        const durationSec = Number(chosenMetaLines[2] || 0);
        const filesizeExact = Number(chosenMetaLines[3] || 0);
        const filesizeApprox = Number(chosenMetaLines[4] || 0);
        const originalSize = Number.isFinite(filesizeExact) && filesizeExact > 0 ? filesizeExact : filesizeApprox;
        const fileName = `${title}.${ext}`;
        const responseExt = ext;
        const responseFileName = `${title}.${responseExt}`;

        res.setHeader("Content-Type", responseExt === "mp4" ? "video/mp4" : "application/octet-stream");
        res.setHeader("X-File-Name", encodeURIComponent(responseFileName));
        res.setHeader("X-Video-Title", encodeURIComponent(rawTitle || title));
        if (Number.isFinite(durationSec) && durationSec > 0) {
            res.setHeader("X-Original-Duration", String(Math.round(durationSec)));
        }
        if (Number.isFinite(originalSize) && originalSize > 0) {
            res.setHeader("X-Original-Filesize", String(Math.round(originalSize)));
        }
        res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(responseFileName)}`);
        res.setHeader("Cache-Control", "no-store");

        const proc = spawn(YT_DLP_BIN, [
            ...buildStrategyArgs(
                chosenStrategy,
                requestedFormatId || chosenStrategy.formatSelector
            ),
            "-o",
            "-",
            chosenUrl
        ], {
            windowsHide: true,
            env: {
                ...process.env,
                TEMP: YT_DLP_TEMP_DIR,
                TMP: YT_DLP_TEMP_DIR
            }
        });

        let streamedBytes = 0;
        let stderrText = "";
        let endedBySizeLimit = false;
        let timedOut = false;
        const streamTimeoutId = setTimeout(() => {
            timedOut = true;
            try {
                proc.kill("SIGKILL");
            } catch {
                // ignore kill errors
            }
        }, 5 * 60 * 1000);

        proc.stdout.on("data", (chunk) => {
            streamedBytes += chunk.length;
            if (streamedBytes > MAX_UPLOAD_BYTES) {
                endedBySizeLimit = true;
                proc.kill("SIGKILL");
                return;
            }
            if (!res.writableEnded) {
                res.write(chunk);
            }
        });

        proc.stderr.on("data", (chunk) => {
            stderrText += chunk.toString();
        });

        proc.on("error", (error) => {
            clearTimeout(streamTimeoutId);
            if (!res.headersSent) {
                const mapped = mapYtDlpError(error.message);
                res.status(mapped.status).json({ error: mapped.message });
            } else {
                res.end();
            }
        });

        proc.on("close", (code) => {
            clearTimeout(streamTimeoutId);
            if (timedOut) {
                if (!res.headersSent) {
                    res.status(504).json({ error: "Preparing this quality took too long. Please try another quality." });
                } else {
                    res.end();
                }
                return;
            }
            if (endedBySizeLimit) {
                if (!res.headersSent) {
                    res.status(413).json({ error: "Downloaded file exceeds 2 GB limit." });
                } else {
                    res.end();
                }
                return;
            }
            if (code === 0) {
                if (!res.writableEnded) {
                    res.end();
                }
                return;
            }
            const mapped = mapYtDlpError(stderrText);
            if (!res.headersSent) {
                res.status(mapped.status).json({ error: mapped.message });
            } else {
                res.end();
            }
        });

        req.on("close", () => {
            clearTimeout(streamTimeoutId);
            if (!proc.killed) {
                proc.kill("SIGKILL");
            }
        });
    } catch (error) {
        const mapped = mapYtDlpError(error?.message || String(error));
        res.status(mapped.status).json({ error: mapped.message });
    }
});

app.listen(PORT, () => {
    console.log(`Video backend running on http://localhost:${PORT}`);
    console.log(`Using yt-dlp binary: ${YT_DLP_BIN}`);
    console.log(`yt-dlp fallback candidates: ${YT_DLP_BIN_CANDIDATES.join(" | ")}`);
});
