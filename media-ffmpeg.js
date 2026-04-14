(function () {
    function hasRuntime() {
        return Boolean(window.FFmpegWASM && window.FFmpegWASM.FFmpeg);
    }

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[data-ffmpeg-src="${src}"]`);
            if (existing) {
                if (existing.getAttribute("data-loaded") === "true") {
                    resolve();
                    return;
                }
                existing.addEventListener("load", () => resolve(), { once: true });
                existing.addEventListener("error", () => reject(new Error(`Failed script: ${src}`)), { once: true });
                return;
            }

            const script = document.createElement("script");
            script.src = src;
            script.async = true;
            script.setAttribute("data-ffmpeg-src", src);
            script.addEventListener("load", () => {
                script.setAttribute("data-loaded", "true");
                resolve();
            });
            script.addEventListener("error", () => reject(new Error(`Failed script: ${src}`)));
            document.head.appendChild(script);
        });
    }

    async function toBlobURL(path, mime) {
        const res = await fetch(path);
        if (!res.ok) throw new Error(`Failed to fetch ${path} (${res.status})`);
        const buf = await res.arrayBuffer();
        return URL.createObjectURL(new Blob([buf], { type: mime }));
    }

    async function ensureScripts() {
        if (hasRuntime()) return;
        const scriptSources = [
            "vendor/ffmpeg/ffmpeg.js",
            "https://unpkg.com/@ffmpeg/ffmpeg@0.12.15/dist/umd/ffmpeg.js",
            "https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.15/dist/umd/ffmpeg.js"
        ];
        let lastError = null;
        for (const src of scriptSources) {
            try {
                await loadScript(src);
                if (hasRuntime()) return;
            } catch (err) {
                lastError = err;
            }
        }
        throw lastError || new Error("Unable to load ffmpeg runtime script.");
    }

    async function ensureLoaded(onProgress) {
        if (window.__mediaFfmpegLoaded && window.__mediaFfmpegInstance) {
            window.__mediaFfmpegInstance.off?.("progress");
            if (typeof onProgress === "function") {
                window.__mediaFfmpegInstance.on("progress", ({ progress }) => onProgress(Math.round((progress || 0) * 100)));
            }
            return window.__mediaFfmpegInstance;
        }

        await ensureScripts();
        const { FFmpeg } = window.FFmpegWASM;
        const ffmpeg = new FFmpeg();

        if (typeof onProgress === "function") {
            ffmpeg.on("progress", ({ progress }) => onProgress(Math.round((progress || 0) * 100)));
        }

        const coreBases = [
            "vendor/ffmpeg",
            "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd",
            "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd"
        ];

        let loaded = false;
        let lastError = null;

        for (const base of coreBases) {
            try {
                if (base.startsWith("http")) {
                    const coreURL = await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript");
                    const wasmURL = await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm");
                    await ffmpeg.load({ coreURL, wasmURL });
                } else {
                    await ffmpeg.load({
                        coreURL: `${base}/ffmpeg-core.js`,
                        wasmURL: `${base}/ffmpeg-core.wasm`
                    });
                }
                loaded = true;
                break;
            } catch (err) {
                lastError = err;
            }
        }

        if (!loaded) throw lastError || new Error("Unable to load ffmpeg core files.");

        window.__mediaFfmpegLoaded = true;
        window.__mediaFfmpegInstance = ffmpeg;
        return ffmpeg;
    }

    function extFromName(name, fallback) {
        const m = /\.([a-z0-9]+)$/i.exec(name || "");
        return m ? m[1].toLowerCase() : (fallback || "dat");
    }

    function baseFromName(name, fallback) {
        const n = String(name || fallback || "output");
        const last = n.lastIndexOf(".");
        return (last > 0 ? n.slice(0, last) : n).replace(/[\\/:*?"<>|]/g, "").trim() || "output";
    }

    window.MediaFfmpeg = {
        ensureLoaded,
        extFromName,
        baseFromName,
        async writeFile(ffmpeg, name, file) {
            await ffmpeg.writeFile(name, new Uint8Array(await file.arrayBuffer()));
        },
        async readFile(ffmpeg, name) {
            return await ffmpeg.readFile(name);
        }
    };
})();
