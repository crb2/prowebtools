const ipv4Value = document.getElementById("ipv4Value");
const ipv6Value = document.getElementById("ipv6Value");
const ipTypeValue = document.getElementById("ipTypeValue");
const ipStatus = document.getElementById("ipStatus");
const refreshIpBtn = document.getElementById("refreshIpBtn");
const copyIpv4Btn = document.getElementById("copyIpv4Btn");
const copyIpv6Btn = document.getElementById("copyIpv6Btn");

function setIpStatus(message, mode = "loading") {
    ipStatus.textContent = message;
    if (mode === "success") {
        ipStatus.style.color = "#22c55e";
        return;
    }
    if (mode === "error") {
        ipStatus.style.color = "#ef4444";
        return;
    }
    ipStatus.style.color = "#facc15";
}

function isIpv4(value) {
    return /^(\d{1,3}\.){3}\d{1,3}$/.test(value || "");
}

function isIpv6(value) {
    return /:/.test(value || "");
}

async function fetchIp(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`IP service failed (${response.status})`);
    }
    const data = await response.json();
    return String(data.ip || "").trim();
}

function updateDetectedType(ipv4, ipv6) {
    if (ipv4 && ipv6) {
        ipTypeValue.value = "Dual Stack (IPv4 + IPv6)";
        return;
    }
    if (ipv6) {
        ipTypeValue.value = "IPv6 Only";
        return;
    }
    if (ipv4) {
        ipTypeValue.value = "IPv4 Only";
        return;
    }
    ipTypeValue.value = "Unavailable";
}

async function loadPublicIps() {
    setIpStatus("Checking your public IP addresses...");
    ipv4Value.value = "Checking...";
    ipv6Value.value = "Checking...";
    ipTypeValue.value = "Checking...";
    refreshIpBtn.disabled = true;
    copyIpv4Btn.disabled = true;
    copyIpv6Btn.disabled = true;

    let ipv4 = "";
    let ipv6 = "";

    try {
        const [v4, v6] = await Promise.allSettled([
            fetchIp("https://api.ipify.org?format=json"),
            fetchIp("https://api64.ipify.org?format=json")
        ]);

        if (v4.status === "fulfilled" && isIpv4(v4.value)) {
            ipv4 = v4.value;
            ipv4Value.value = ipv4;
            copyIpv4Btn.disabled = false;
        } else {
            ipv4Value.value = "Unavailable";
        }

        if (v6.status === "fulfilled" && isIpv6(v6.value)) {
            ipv6 = v6.value;
            ipv6Value.value = ipv6;
            copyIpv6Btn.disabled = false;
        } else {
            ipv6Value.value = "Unavailable";
        }

        updateDetectedType(ipv4, ipv6);

        if (!ipv4 && !ipv6) {
            setIpStatus("Could not detect public IPv4 or IPv6. Try refresh.", "error");
            return;
        }

        setIpStatus("IP address check completed.", "success");
    } catch (error) {
        ipv4Value.value = "Unavailable";
        ipv6Value.value = "Unavailable";
        ipTypeValue.value = "Unavailable";
        setIpStatus(`Failed to fetch IP data: ${error.message || "Unknown error"}`, "error");
    } finally {
        refreshIpBtn.disabled = false;
    }
}

async function copyText(value, label) {
    const text = String(value || "").trim();
    if (!text || text === "Unavailable" || text === "Checking...") {
        setIpStatus(`${label} is not available to copy.`, "error");
        return;
    }
    try {
        await navigator.clipboard.writeText(text);
        setIpStatus(`${label} copied successfully.`, "success");
    } catch {
        setIpStatus(`Could not copy ${label}.`, "error");
    }
}

refreshIpBtn.addEventListener("click", loadPublicIps);
copyIpv4Btn.addEventListener("click", () => copyText(ipv4Value.value, "IPv4"));
copyIpv6Btn.addEventListener("click", () => copyText(ipv6Value.value, "IPv6"));

loadPublicIps();
