const fetchNui = async (evName, data) => {
    const resourceName =
        typeof GetParentResourceName === "function" ? GetParentResourceName() : "qb-ui";
    const rawResp = await fetch(`https://${resourceName}/${evName}`, {
        body: JSON.stringify(data || {}),
        headers: { "Content-Type": "application/json; charset=UTF-8" },
        method: "POST",
    });
    return await rawResp.json();
};

const VALID_PLACEMENTS = new Set([
    "top-left",
    "top-center",
    "top-right",
    "middle-left",
    "center",
    "middle-right",
    "bottom-left",
    "bottom-center",
    "bottom-right",
]);

const DEFAULT_CFG = {
    placement: "bottom-center",
    useExportPosition: false,
    offsetX: 0,
    offsetY: 0,
    background: "rgba(14, 16, 24, 0.92)",
    backgroundActive: "rgba(212, 5, 74, 0.94)",
    textColor: "#f0f2f8",
    borderColor: "rgba(255, 255, 255, 0.14)",
    accentColor: "#d4054a",
    fontSize: "clamp(13px, 1.45vh, 17px)",
    padding: "14px 22px",
    borderRadius: "12px",
    maxWidth: "min(440px, 92vw)",
    shadow: "0 14px 44px rgba(0, 0, 0, 0.55)",
    animationMs: 320,
    insetVh: 3.0,
    insetVw: 2.5,
    bottomVh: 8.0,
};

let drawTextCfg = { ...DEFAULT_CFG };

function normalizePlacement(raw) {
    const p = String(raw || "").toLowerCase().trim();
    if (VALID_PLACEMENTS.has(p)) return p;
    if (p === "left") return "middle-left";
    if (p === "right") return "middle-right";
    if (p === "top") return "top-center";
    if (p === "bottom") return "bottom-center";
    return drawTextCfg.placement || DEFAULT_CFG.placement;
}

function applyDrawTextConfig(cfg) {
    drawTextCfg = { ...DEFAULT_CFG, ...(cfg || {}) };
    const c = drawTextCfg;
    const root = document.documentElement;
    const n = (v, fallback) => (typeof v === "number" && !Number.isNaN(v) ? v : fallback);
    root.style.setProperty("--dt-bg", String(c.background ?? DEFAULT_CFG.background));
    root.style.setProperty("--dt-bg-active", String(c.backgroundActive ?? DEFAULT_CFG.backgroundActive));
    root.style.setProperty("--dt-text", String(c.textColor ?? DEFAULT_CFG.textColor));
    root.style.setProperty("--dt-border", String(c.borderColor ?? DEFAULT_CFG.borderColor));
    root.style.setProperty("--dt-accent", String(c.accentColor ?? DEFAULT_CFG.accentColor));
    root.style.setProperty("--dt-font-size", String(c.fontSize ?? DEFAULT_CFG.fontSize));
    root.style.setProperty("--dt-pad", String(c.padding ?? DEFAULT_CFG.padding));
    root.style.setProperty("--dt-radius", String(c.borderRadius ?? DEFAULT_CFG.borderRadius));
    root.style.setProperty("--dt-max-w", String(c.maxWidth ?? DEFAULT_CFG.maxWidth));
    root.style.setProperty("--dt-shadow", String(c.shadow ?? DEFAULT_CFG.shadow));
    const anim = n(c.animationMs, DEFAULT_CFG.animationMs);
    root.style.setProperty("--dt-anim", `${anim}ms`);
    root.style.setProperty("--dt-anim-fast", `${Math.min(anim, 220)}ms`);
    root.style.setProperty("--dt-inset-vh", `${n(c.insetVh, DEFAULT_CFG.insetVh)}vh`);
    root.style.setProperty("--dt-inset-vw", `${n(c.insetVw, DEFAULT_CFG.insetVw)}vw`);
    root.style.setProperty("--dt-bottom-vh", `${n(c.bottomVh, DEFAULT_CFG.bottomVh)}vh`);
    root.style.setProperty("--dt-off-x", `${n(c.offsetX, 0)}vw`);
    root.style.setProperty("--dt-off-y", `${n(c.offsetY, 0)}vh`);
}

function stripTags(s) {
    const raw = String(s ?? "");
    const withBreaks = raw
        .replace(/<\s*br\s*\/?\s*>/gi, "\n")
        .replace(/<\/\s*(p|div|li|tr|h[1-6])\s*>/gi, "\n");
    return withBreaks.replace(/<[^>]*>/g, "");
}

function normalizeWhitespace(s) {
    return String(s ?? "")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function splitTitleDetail(plainText) {
    const raw = String(plainText ?? "");
    const lines = raw
        .split(/\r?\n/)
        .map((l) => normalizeWhitespace(l))
        .filter(Boolean);
    if (lines.length >= 2) return { title: lines[0], detail: lines.slice(1).join(" ") };

    const p = normalizeWhitespace(raw);
    if (!p) return { title: "", detail: "" };

    const m = p.match(/^(.{2,48}?)\s*[-–—:]\s*(.{2,80})$/);
    if (m) return { title: m[1].trim(), detail: m[2].trim() };
    return { title: p, detail: "" };
}


function textHasEPrompt(plain) {
    const p = normalizeWhitespace(plain);
    if (!p) return false;
    if (/\[[\s]*E[\s]*\]/i.test(p)) return true;
    // "E - Label" / "E: Label" / "E – Label" at the start (not "Energy - …")
    if (/^E\s*[-–—:]\s*\S/i.test(p)) return true;
    if (/^Press\s+E\b/i.test(p)) return true;
    return false;
}
function stripEPrefixFromRaw(raw) {
    let s = String(raw ?? "");
    s = s.replace(/\[[\s]*E[\s]*\]\s*/gi, "");
    s = s.replace(/^(\s*)E\s*[-–—:]\s*/im, "$1");
    s = s.replace(/^(\s*)Press\s+E\b\s*([-–—:]\s*)?/im, "$1");
    s = s.replace(/^[\s\-–—:]+/, "").trim();
    return s;
}
function renderDrawTextBody(textEl, rawHtml) {
    const raw = String(rawHtml ?? "");
    const plain = stripTags(raw);
    const hasE = textHasEPrompt(plain);

    textEl.textContent = "";

    const root = document.createElement("div");
    root.className = "qb-drawtext__root" + (hasE ? " qb-drawtext__root--e" : " qb-drawtext__root--info");

    const rail = document.createElement("div");
    rail.className = "qb-drawtext__rail";
    rail.setAttribute("aria-hidden", "true");

    const chipWrap = document.createElement("div");
    chipWrap.className = "qb-drawtext__chipwrap";

    const chip = document.createElement("kbd");
    chip.className = "qb-drawtext__chip" + (hasE ? "" : " qb-drawtext__chip--info");
    chip.textContent = hasE ? "E" : "i";
    chip.setAttribute("aria-hidden", "true");

    chipWrap.appendChild(chip);

    const content = document.createElement("div");
    content.className = "qb-drawtext__content";

    let processed = stripEPrefixFromRaw(raw);
    if (!stripTags(processed)) processed = raw;
    const processedPlain = stripTags(processed);
    const { title, detail } = splitTitleDetail(processedPlain);

    const titleEl = document.createElement("div");
    titleEl.className = "qb-drawtext__title";
    titleEl.textContent = title;

    content.appendChild(titleEl);

    if (detail) {
        const detailEl = document.createElement("div");
        detailEl.className = "qb-drawtext__detail";
        detailEl.textContent = detail;
        content.appendChild(detailEl);
    }

    root.appendChild(rail);
    root.appendChild(chipWrap);
    root.appendChild(content);
    textEl.appendChild(root);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const drawText = async (textData) => {
    const container = document.getElementById("drawtext-container");
    const text = document.getElementById("text");
    if (!container || !text) return;

    text.classList.remove("show", "hide", "pressed");
    text.classList.add("qb-drawtext");

    const pos = normalizePlacement(textData?.position);
    container.dataset.placement = pos;
    renderDrawTextBody(text, textData?.text);

    container.classList.add("is-visible");
    await sleep(16);
    text.classList.add("show");
};

const changeText = async (textData) => {
    const container = document.getElementById("drawtext-container");
    const text = document.getElementById("text");
    if (!container || !text) return;

    text.classList.remove("show");
    text.classList.add("pressed", "hide");

    await sleep(Math.min(drawTextCfg.animationMs ?? 320, 400));

    text.classList.remove("pressed", "hide");

    const pos = normalizePlacement(textData?.position);
    container.dataset.placement = pos;
    renderDrawTextBody(text, textData?.text);

    await sleep(16);
    text.classList.add("show");
};

const hideText = async () => {
    const container = document.getElementById("drawtext-container");
    const text = document.getElementById("text");
    if (!container || !text) return;

    text.classList.remove("show");
    text.classList.add("hide");

    const ms = Math.min(drawTextCfg.animationMs ?? 320, 500);
    setTimeout(() => {
        text.classList.remove("hide", "pressed", "qb-drawtext");
        text.innerHTML = "";
        container.classList.remove("is-visible");
        delete container.dataset.placement;
    }, ms + 40);
};

const keyPressed = () => {
    const text = document.getElementById("text");
    if (text) text.classList.add("pressed");
};

window.addEventListener("message", (event) => {
    const data = event.data;
    const action = data.action;
    const textData = data.data;
    switch (action) {
        case "DRAW_TEXT":
            return drawText(textData);
        case "CHANGE_TEXT":
            return changeText(textData);
        case "HIDE_TEXT":
            return hideText();
        case "KEY_PRESSED":
            return keyPressed();
        default:
            return;
    }
});

window.addEventListener("load", async () => {
    try {
        const cfg = await fetchNui("getDrawTextConfig", {});
        applyDrawTextConfig(cfg);
    } catch (_) {
        applyDrawTextConfig({});
    }
});
