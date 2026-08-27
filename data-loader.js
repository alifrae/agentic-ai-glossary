(() => {
  "use strict";

  const nativeFetch = window.fetch.bind(window);
  const glossaryFiles = ["glossary-1.json", "glossary-2.json", "glossary-3.json", "glossary-4.json", "glossary-5.json"];
  const STORAGE_KEY = "agentic-ai-glossary.local.v1";
  let learningPaths = {};
  let glossaryEntries = [];

  function unique(values) {
    return [...new Set((values || []).map(String).map(v => v.trim()).filter(Boolean))];
  }

  async function loadLearningPaths() {
    try {
      const response = await nativeFetch("learning-paths.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`learning-paths.json: HTTP ${response.status}`);
      const payload = await response.json();
      learningPaths = payload.entries || {};
    } catch (error) {
      console.warn("Learning paths unavailable; glossary will continue without prerequisites.", error);
      learningPaths = {};
    }
    window.__wikiLearningPaths = learningPaths;
    return learningPaths;
  }

  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input?.url;
    if (url !== "glossary.json") return nativeFetch(input, init);

    const [payloads, paths] = await Promise.all([
      Promise.all(glossaryFiles.map(async file => {
        const response = await nativeFetch(file, { ...init, cache: "no-store" });
        if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
        return response.json();
      })),
      loadLearningPaths()
    ]);

    glossaryEntries = payloads.flatMap(payload => payload.entries || []).map(entry => {
      const learning = paths[entry.term] || {};
      return {
        ...entry,
        memoryHook: entry.memoryHook || learning.memoryHook || "",
        confusedWith: unique([...(entry.confusedWith || []), ...(learning.confusedWith || [])])
      };
    });
    window.__wikiGlossaryEntries = glossaryEntries;

    return new Response(JSON.stringify({ entries: glossaryEntries }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  function slug(value) {
    return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  }

  function readLocal() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function findBaseEntry(term) {
    const needle = String(term || "").trim().toLowerCase();
    const index = glossaryEntries.findIndex(entry =>
      String(entry.term || "").toLowerCase() === needle ||
      (entry.aliases || []).some(alias => String(alias).toLowerCase() === needle)
    );
    if (index < 0) return null;
    const entry = glossaryEntries[index];
    return { entry, id: entry.id || `base-${index}-${slug(entry.term || "entry")}` };
  }

  function progressFor(term) {
    const found = findBaseEntry(term);
    if (!found) return { status: "new", label: "Not reviewed", found: false };
    const local = readLocal();
    const learning = local.learning?.[found.id] || {};
    const status = learning.status || "new";
    const labels = { new: "Not reviewed", learning: "Learning", familiar: "Familiar", mastered: "Solid" };
    return { status, label: labels[status] || "Not reviewed", found: true };
  }

  function prerequisitesFor(term) {
    return unique(learningPaths[term]?.understandFirst || []);
  }

  function unmetPrerequisites(term) {
    return prerequisitesFor(term).filter(prereq => {
      const progress = progressFor(prereq);
      return !["familiar", "mastered"].includes(progress.status);
    });
  }

  function openTerm(term) {
    location.hash = `#term=${encodeURIComponent(term)}`;
    location.reload();
  }

  function installStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .prereq-panel { margin: .75rem 0 1rem; padding: .8rem .85rem; border: 1px solid var(--border); border-radius: 10px; background: var(--soft); }
      .prereq-panel[hidden] { display: none; }
      .prereq-head { display: flex; align-items: baseline; justify-content: space-between; gap: .75rem; flex-wrap: wrap; }
      .prereq-head strong { font-size: .9rem; }
      .prereq-summary { margin: .15rem 0 0; color: var(--muted); font-size: .82rem; }
      .prereq-list { display: flex; flex-wrap: wrap; gap: .45rem; margin-top: .65rem; }
      .prereq-chip { min-height: 38px; display: inline-flex; align-items: center; gap: .4rem; padding: .45rem .6rem; text-align: left; background: var(--panel); }
      .prereq-chip[data-ready="true"] { opacity: .76; }
      .prereq-state { color: var(--muted); font-size: .72rem; white-space: nowrap; }
      .focus-foundation-note { margin: .45rem 0 0; color: var(--muted); font-size: .82rem; }
      .focus-foundation-note button { min-height: 32px; padding: .25rem .5rem; margin-left: .35rem; font-size: .78rem; }
    `;
    document.head.appendChild(style);
  }

  function installPrerequisiteUI() {
    const focusDialog = document.querySelector("#focusDialog");
    const focusTerm = document.querySelector("#focusTerm");
    const focusMeta = document.querySelector("#focusMeta");
    const focusNowHint = document.querySelector("#focusNowHint");
    const focusNowTerm = document.querySelector("#focusNowTerm");
    if (!focusDialog || !focusTerm || !focusMeta) return;

    installStyles();

    const panel = document.createElement("section");
    panel.id = "prereqPanel";
    panel.className = "prereq-panel";
    panel.hidden = true;
    panel.setAttribute("aria-label", "Prerequisite concepts");
    panel.innerHTML = `
      <div class="prereq-head">
        <strong>Understand first</strong>
        <span id="prereqStatus" class="prereq-summary"></span>
      </div>
      <p id="prereqMessage" class="prereq-summary"></p>
      <div id="prereqList" class="prereq-list"></div>
    `;
    focusMeta.insertAdjacentElement("afterend", panel);

    const foundationNote = document.createElement("div");
    foundationNote.id = "focusFoundationNote";
    foundationNote.className = "focus-foundation-note";
    foundationNote.hidden = true;
    focusNowHint?.insertAdjacentElement("afterend", foundationNote);

    function renderFocusPrerequisites() {
      const term = focusTerm.textContent.trim();
      const prereqs = prerequisitesFor(term);
      if (!term || prereqs.length === 0) {
        panel.hidden = true;
        return;
      }

      const list = panel.querySelector("#prereqList");
      const status = panel.querySelector("#prereqStatus");
      const message = panel.querySelector("#prereqMessage");
      const unmet = unmetPrerequisites(term);

      status.textContent = unmet.length === 0 ? "foundations familiar" : `${unmet.length} still fuzzy`;
      message.textContent = unmet.length === 0
        ? "The foundations for this concept are already familiar. Continue."
        : "For deep understanding, review the fuzzy foundations first. For a quick lookup, you can continue.";

      list.replaceChildren();
      prereqs.forEach(prereq => {
        const progress = progressFor(prereq);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "prereq-chip";
        button.dataset.ready = String(["familiar", "mastered"].includes(progress.status));
        button.title = `Focus ${prereq}`;
        button.innerHTML = `<span>${escapeHtml(prereq)}</span><span class="prereq-state">${escapeHtml(progress.label)}</span>`;
        button.addEventListener("click", () => openTerm(prereq));
        list.appendChild(button);
      });
      panel.hidden = false;
    }

    function renderHomeFoundationNote() {
      if (!foundationNote || !focusNowTerm) return;
      const term = focusNowTerm.textContent.trim();
      if (!term || term === "No active concept") {
        foundationNote.hidden = true;
        return;
      }
      const unmet = unmetPrerequisites(term);
      if (unmet.length === 0) {
        foundationNote.hidden = true;
        return;
      }
      foundationNote.replaceChildren();
      const text = document.createElement("span");
      text.textContent = `Foundation check: ${unmet.length} prerequisite${unmet.length === 1 ? "" : "s"} still fuzzy.`;
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `Review ${unmet[0]}`;
      button.addEventListener("click", () => openTerm(unmet[0]));
      foundationNote.append(text, button);
      foundationNote.hidden = false;
    }

    const focusObserver = new MutationObserver(renderFocusPrerequisites);
    focusObserver.observe(focusTerm, { childList: true, subtree: true, characterData: true });
    focusObserver.observe(focusDialog, { attributes: true, attributeFilter: ["open"] });

    if (focusNowTerm) {
      const homeObserver = new MutationObserver(renderHomeFoundationNote);
      homeObserver.observe(focusNowTerm, { childList: true, subtree: true, characterData: true });
    }

    window.addEventListener("storage", () => {
      renderFocusPrerequisites();
      renderHomeFoundationNote();
    });
    focusDialog.addEventListener("close", renderHomeFoundationNote);
    renderFocusPrerequisites();
    renderHomeFoundationNote();
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installPrerequisiteUI, { once: true });
  } else {
    installPrerequisiteUI();
  }
})();