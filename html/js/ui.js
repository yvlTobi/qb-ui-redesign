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

let pendingHideTimer = null;
const HIDE_DEBOUNCE_MS = 120;
const HIDE_TRANSITION_MS = 320;
let lastRenderedKey = "";

function textDataKey(d) {
    if (!d) return "";
    return [String(d.text ?? ""), String(d.position ?? ""), String(d.icon ?? "")].join("\0");
}

function cancelPendingHide() {
    if (pendingHideTimer !== null) {
        clearTimeout(pendingHideTimer);
        pendingHideTimer = null;
    }
}

function animateCardIn(card) {
    card.classList.remove("show");
    void card.offsetWidth;
    requestAnimationFrame(() => {
        card.classList.add("show");
    });
}

function updateContent(textData) {
    const plain = stripTags(textData.text);
    const key = extractKeyPrompt(plain);
    const cleaned = stripKeyPrefix(plain, key);
    const { title, subtitle } = splitTitleSubtitle(cleaned);

    document.getElementById("keyText").textContent = key || "E";
    document.getElementById("mainText").textContent = title || "";
    document.getElementById("subText").textContent = subtitle || "Press to interact";

    const iconEl = document.getElementById("watermarkIcon");
    if (iconEl) {
        const iconName = (textData.icon && String(textData.icon).trim()) ? String(textData.icon).trim() : "warehouse";
        iconEl.className = `fa-solid fa-${iconName} watermark`;
    }

    const container = document.getElementById("drawtext-container");
    container.dataset.placement = normalizePlacement(textData.position);
    lastRenderedKey = textDataKey(textData);
}

function showText(textData) {
    const app = document.getElementById("app");
    const container = document.getElementById("drawtext-container");
    const card = document.querySelector(".garage-btn");
    const key = textDataKey(textData);

    const wasHidePending = pendingHideTimer !== null;
    cancelPendingHide();

    if (!wasHidePending && container.classList.contains("is-visible") && card.classList.contains("show") && key === lastRenderedKey) {
        return;
    }

    if (wasHidePending && key === lastRenderedKey) {
        container.classList.add("is-visible");
        app.classList.remove("hidden");
        card.classList.add("show");
        return;
    }

    updateContent(textData);
    container.classList.add("is-visible");
    app.classList.remove("hidden");
    animateCardIn(card);
}

function changeText(textData) {
    const app = document.getElementById("app");
    const container = document.getElementById("drawtext-container");
    const card = document.querySelector(".garage-btn");
    const key = textDataKey(textData);

    const wasHidePending = pendingHideTimer !== null;
    cancelPendingHide();

    if (!wasHidePending && key === lastRenderedKey && card.classList.contains("show")) {
        return;
    }

    if (wasHidePending && key === lastRenderedKey) {
        container.classList.add("is-visible");
        app.classList.remove("hidden");
        card.classList.add("show");
        return;
    }

    card.classList.remove("show");

    const outDuration = wasHidePending ? 0 : 300;

    const doSwap = () => {
        updateContent(textData);
        container.classList.add("is-visible");
        app.classList.remove("hidden");
        animateCardIn(card);
    };

    if (outDuration <= 0) {
        doSwap();
    } else {
        let swapped = false;
        const onEnd = () => {
            if (swapped) return;
            swapped = true;
            doSwap();
        };
        card.addEventListener("transitionend", onEnd, { once: true });
        setTimeout(onEnd, outDuration + 20);
    }
}

function hideText() {
    const app = document.getElementById("app");
    const container = document.getElementById("drawtext-container");
    const card = document.querySelector(".garage-btn");

    if (!container.classList.contains("is-visible")) return;

    if (pendingHideTimer !== null) return;

    pendingHideTimer = setTimeout(() => {
        pendingHideTimer = null;

        card.classList.remove("show");

        let hidden = false;
        const finish = () => {
            if (hidden) return;
            hidden = true;
            app.classList.add("hidden");
            container.classList.remove("is-visible");
            lastRenderedKey = "";
        };

        card.addEventListener("transitionend", finish, { once: true });
        setTimeout(finish, HIDE_TRANSITION_MS + 20);
    }, HIDE_DEBOUNCE_MS);
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

window.addEventListener("load", () => {
    fetchNui("getDrawTextConfig", {});
});
