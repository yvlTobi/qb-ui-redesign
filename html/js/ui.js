/**
 * qb-ui NUI (integrated with tobiweb UI)
 */

const VALID_PLACEMENTS = new Set([
    "top-left", "top-center", "top-right",
    "middle-left", "center", "middle-right",
    "bottom-left", "bottom-center", "bottom-right",
]);

const fetchNui = async (evName, data) => {
    const resourceName = typeof GetParentResourceName === "function" ? GetParentResourceName() : "qb-ui";
    try {
        const rawResp = await fetch(`https://${resourceName}/${evName}`, {
            body: JSON.stringify(data || {}),
            headers: { "Content-Type": "application/json; charset=UTF-8" },
            method: "POST",
        });
        return await rawResp.json();
    } catch (e) {
        return {};
    }
};

function normalizePlacement(raw) {
    const p = String(raw || "").toLowerCase().trim();
    if (VALID_PLACEMENTS.has(p)) return p;
    if (p === "left") return "middle-left";
    if (p === "right") return "middle-right";
    if (p === "top") return "top-center";
    if (p === "bottom") return "bottom-center";
    return "bottom-center";
}

function stripTags(s) {
    const raw = String(s ?? "");
    const withBreaks = raw
        .replace(/<\s*br\s*\/?\s*>/gi, "\n")
        .replace(/<\/\s*(p|div|li|tr|h[1-6])\s*>/gi, "\n");
    return withBreaks.replace(/<[^>]*>/g, "");
}

function normalizeWhitespace(s) {
    return String(s ?? "").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
}

function extractKeyPrompt(plain) {
    const p = normalizeWhitespace(plain);
    if (!p) return null;
    const bracket = p.match(/\[\s*([A-Za-z0-9]{1,3})\s*\]/);
    if (bracket?.[1]) return bracket[1].toUpperCase();
    const press = p.match(/^Press\s+([A-Za-z0-9]{1,3})\b/i);
    if (press?.[1]) return press[1].toUpperCase();
    const leading = p.match(/^([A-Za-z0-9]{1,3})\s*[-–—:]\s*\S/i);
    if (leading?.[1]) return leading[1].toUpperCase();
    return null;
}

function stripKeyPrefix(plain, key) {
    let s = String(plain ?? "");
    const k = String(key ?? "").trim();
    if (k) {
        const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        s = s.replace(new RegExp(`\\[\\s*${escaped}\\s*\\]\\s*`, "i"), "");
        s = s.replace(new RegExp(`^(\\s*)${escaped}\\s*[-–—:]\\s*`, "im"), "$1");
        s = s.replace(new RegExp(`^(\\s*)Press\\s+${escaped}\\b\\s*([-–—:]\\s*)?`, "im"), "$1");
    }
    s = s.replace(/^[\s\-–—:]+/, "").trim();
    return s;
}

function splitTitleSubtitle(plainText) {
    const raw = String(plainText ?? "");
    const lines = raw.split(/\r?\n/).map((l) => normalizeWhitespace(l)).filter(Boolean);
    if (lines.length >= 2) return { title: lines[0], subtitle: lines.slice(1).join(" ") };

    const p = normalizeWhitespace(raw);
    if (!p) return { title: "", subtitle: "" };
    const m = p.match(/^(.{2,48}?)\s*[-–—:]\s*(.{2,80})$/);
    if (m) return { title: m[1].trim(), subtitle: m[2].trim() };
    return { title: p, subtitle: "" };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function updateContent(textData) {
    const plain = stripTags(textData.text);
    const key = extractKeyPrompt(plain);
    const cleaned = stripKeyPrefix(plain, key);
    const { title, subtitle } = splitTitleSubtitle(cleaned);

    document.getElementById("keyText").textContent = key || "E";
    document.getElementById("mainText").textContent = title || "";
    document.getElementById("subText").textContent = subtitle || "Press to interact";
    
    const container = document.getElementById("drawtext-container");
    container.dataset.placement = normalizePlacement(textData.position);
}

async function showText(textData) {
    const app = document.getElementById("app");
    const container = document.getElementById("drawtext-container");
    const card = document.querySelector(".garage-btn");

    updateContent(textData);

    container.classList.add("is-visible");
    app.classList.remove("hidden");
    
    await sleep(50); // slight buffer for DOM
    card.classList.add("show");
}

async function changeText(textData) {
    const card = document.querySelector(".garage-btn");
    card.classList.remove("show");
    await sleep(300);
    updateContent(textData);
    card.classList.add("show");
}

async function hideText() {
    const app = document.getElementById("app");
    const container = document.getElementById("drawtext-container");
    const card = document.querySelector(".garage-btn");

    if (!card.classList.contains("show")) return;

    card.classList.remove("show");
    await sleep(300);
    
    app.classList.add("hidden");
    container.classList.remove("is-visible");
}

function keyPressed() {
    const card = document.querySelector(".garage-btn");
    card.classList.add("pressed");
    setTimeout(() => {
        card.classList.remove("pressed");
    }, 200);
}

window.addEventListener("message", (event) => {
    const data = event.data;
    switch (data.action) {
        case "DRAW_TEXT":
            return showText(data.data);
        case "CHANGE_TEXT":
            return changeText(data.data);
        case "HIDE_TEXT":
            return hideText();
        case "KEY_PRESSED":
            return keyPressed();
    }
});

// Fetch config on load (even if not used, keeps compatibility)
window.addEventListener("load", () => {
    fetchNui("getDrawTextConfig", {});
});
