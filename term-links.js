(() => {
  "use strict";

  const NOLINK_RE = /\[\[nolink:([^\]]+)\]\]/gi;
  const TOKEN_START = "\uE000";
  const TOKEN_END = "\uE001";

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]);
  }

  function protectNoLink(text) {
    const protectedValues = [];
    const masked = String(text ?? "").replace(NOLINK_RE, (_, visible) => {
      const index = protectedValues.push(String(visible)) - 1;
      return `${TOKEN_START}${index}${TOKEN_END}`;
    });
    return { masked, protectedValues };
  }

  function restoreNoLink(html, protectedValues) {
    const pattern = new RegExp(`${TOKEN_START}(\\d+)${TOKEN_END}`, "g");
    return html.replace(pattern, (_, index) => escapeHtml(protectedValues[Number(index)] ?? ""));
  }

  function buildDictionary(entries, currentTerm) {
    const current = String(currentTerm || "").trim().toLowerCase();
    const byLabel = new Map();

    for (const entry of Array.isArray(entries) ? entries : []) {
      const canonical = String(entry?.term || "").trim();
      if (!canonical || canonical.toLowerCase() === current) continue;
      for (const candidate of [canonical, ...(entry.aliases || [])]) {
        const label = String(candidate || "").trim();
        if (!label) continue;
        const key = label.toLowerCase();
        if (!byLabel.has(key)) byLabel.set(key, { label, canonical });
      }
    }

    return [...byLabel.values()].sort((a, b) => b.label.length - a.label.length || a.label.localeCompare(b.label));
  }

  function isWordChar(character) {
    return Boolean(character && /[A-Za-z0-9_]/.test(character));
  }

  function hasValidBoundaries(text, start, length, label) {
    const before = start > 0 ? text[start - 1] : "";
    const after = start + length < text.length ? text[start + length] : "";
    const first = label[0] || "";
    const last = label[label.length - 1] || "";
    if (isWordChar(first) && isWordChar(before)) return false;
    if (isWordChar(last) && isWordChar(after)) return false;
    return true;
  }

  function matchingItem(text, index, dictionary) {
    for (const item of dictionary) {
      const candidate = text.slice(index, index + item.label.length);
      if (candidate.length !== item.label.length) continue;
      if (candidate.toLowerCase() !== item.label.toLowerCase()) continue;
      if (!hasValidBoundaries(text, index, item.label.length, item.label)) continue;
      return item;
    }
    return null;
  }

  function render(text, { currentTerm = "", entries = [] } = {}) {
    const { masked, protectedValues } = protectNoLink(text);
    const dictionary = buildDictionary(entries, currentTerm);
    if (!dictionary.length) return restoreNoLink(escapeHtml(masked), protectedValues);

    let html = "";
    let plainStart = 0;
    let index = 0;

    while (index < masked.length) {
      if (masked[index] === TOKEN_START) {
        const tokenEnd = masked.indexOf(TOKEN_END, index + 1);
        if (tokenEnd >= 0) {
          index = tokenEnd + 1;
          continue;
        }
      }

      const item = matchingItem(masked, index, dictionary);
      if (!item) {
        index += 1;
        continue;
      }

      html += escapeHtml(masked.slice(plainStart, index));
      const visible = masked.slice(index, index + item.label.length);
      html += `<a href="#term=${encodeURIComponent(item.canonical)}" data-term-link data-no-open="true">${escapeHtml(visible)}</a>`;
      index += item.label.length;
      plainStart = index;
    }

    html += escapeHtml(masked.slice(plainStart));
    return restoreNoLink(html, protectedValues);
  }

  function loadV5Presentation() {
    if (typeof document === "undefined") return;
    if (!document.querySelector('link[href="v5.css"]')) {
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = "v5.css";
      document.head.appendChild(stylesheet);
    }
    if (!document.querySelector('script[src="v5.js"]')) {
      const script = document.createElement("script");
      script.src = "v5.js";
      script.async = false;
      document.head.appendChild(script);
    }
  }

  window.WikiTermLinks = Object.freeze({ render });
  loadV5Presentation();
})();
