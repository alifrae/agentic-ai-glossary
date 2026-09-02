(() => {
  "use strict";

  const STORAGE_KEY = "agentic-ai-glossary.local.v1";
  const PAGES = new Set(["wiki", "learn", "eli5"]);
  const VERDICTS = ["False", "Misleading", "Depends", "Reasonable but uncertain"];
  const ELI5_TERMS = [
    "AI", "Neural network", "Model", "LLM", "AI assistant", "Token", "Prompt", "Context",
    "Training", "Inference", "Hallucination", "Agent", "Tool", "Memory", "RAG", "World model", "AGI", "ASI"
  ];

  let installed = false;
  let shell = null;

  function entries() {
    return Array.isArray(window.__wikiGlossaryEntries) ? window.__wikiGlossaryEntries : [];
  }

  function slug(value) {
    return String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[character]);
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function unique(values) {
    const seen = new Set();
    return (values || []).map(String).map(value => value.trim()).filter(value => {
      const key = value.toLowerCase();
      if (!value || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function resolveTerm(term) {
    const needle = String(term || "").trim().toLowerCase();
    if (!needle) return null;
    return entries().find(entry =>
      String(entry.term || "").toLowerCase() === needle ||
      (entry.aliases || []).some(alias => String(alias).toLowerCase() === needle)
    ) || null;
  }

  function entryIndex(entry) {
    return entries().findIndex(candidate => candidate === entry || candidate.term === entry.term);
  }

  function baseId(entry) {
    const index = entryIndex(entry);
    return index < 0 ? "" : `base-${index}-${slug(entry.term)}`;
  }

  function entryByBaseId(id) {
    return entries().find(entry => baseId(entry) === id) || null;
  }

  function wikiFor(entry) {
    return window.__wikiContent?.[entry.term] || {};
  }

  function learningFor(entry) {
    try {
      const local = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      const status = local.learning?.[baseId(entry)]?.status || "new";
      return {
        status,
        label: ({ new: "Not reviewed", learning: "Learning", familiar: "Familiar", mastered: "Solid" })[status] || "Not reviewed"
      };
    } catch {
      return { status: "new", label: "Not reviewed" };
    }
  }

  function parseHash() {
    const hash = location.hash || "";
    if (hash.startsWith("#term=")) {
      try {
        return { page: "wiki", term: decodeURIComponent(hash.slice("#term=".length)) };
      } catch {
        return { page: "wiki", term: "" };
      }
    }
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const page = params.get("page") || "wiki";
    return { page: PAGES.has(page) ? page : "wiki", term: "" };
  }

  function goToPage(page) {
    const target = PAGES.has(page) ? page : "wiki";
    const hash = `#page=${target}`;
    if (location.hash === hash) renderState();
    else location.hash = hash;
  }

  function openWikiTerm(term) {
    const hash = `#term=${encodeURIComponent(term)}`;
    if (location.hash === hash) renderState();
    else location.hash = hash;
  }

  function installShell() {
    if (document.querySelector("#primaryNav")) return readShell();
    const main = document.querySelector("main");
    const header = document.querySelector(".site-header");
    if (!main || !header) return null;

    const nav = document.createElement("nav");
    nav.id = "primaryNav";
    nav.className = "wiki-primary-nav";
    nav.setAttribute("aria-label", "Primary");
    nav.innerHTML = `
      <button type="button" data-wiki-page="wiki">Wiki</button>
      <button type="button" data-wiki-page="learn">Learn</button>
      <button type="button" data-wiki-page="eli5">ELI5 &amp; Misconceptions</button>
    `;
    header.insertAdjacentElement("afterend", nav);

    const wikiView = document.createElement("section");
    wikiView.id = "wikiView";
    wikiView.className = "wiki-surface";
    wikiView.setAttribute("aria-label", "Wiki");

    const learnView = document.createElement("section");
    learnView.id = "learnView";
    learnView.className = "wiki-surface";
    learnView.setAttribute("aria-label", "Learn");

    const eli5View = document.createElement("section");
    eli5View.id = "eli5View";
    eli5View.className = "wiki-surface";
    eli5View.setAttribute("aria-label", "ELI5 and misconceptions");

    const conceptPage = document.createElement("article");
    conceptPage.id = "conceptPage";
    conceptPage.className = "concept-page";
    conceptPage.hidden = true;

    const conceptContent = document.createElement("div");
    conceptContent.id = "conceptContent";
    conceptPage.appendChild(conceptContent);

    const wikiIndex = document.createElement("div");
    wikiIndex.id = "wikiIndex";
    wikiIndex.className = "wiki-index";

    [".toolbar", ".summary", ".desktop-table", "#cardList", "#emptyState"].forEach(selector => {
      const element = main.querySelector(selector);
      if (element) wikiIndex.appendChild(element);
    });
    wikiView.append(conceptPage, wikiIndex);

    [".focus-strip", ".review-strip"].forEach(selector => {
      const element = main.querySelector(selector);
      if (element) learnView.appendChild(element);
    });

    main.append(wikiView, learnView, eli5View);
    return { nav, wikiView, learnView, eli5View, conceptPage, conceptContent, wikiIndex };
  }

  function readShell() {
    return {
      nav: document.querySelector("#primaryNav"),
      wikiView: document.querySelector("#wikiView"),
      learnView: document.querySelector("#learnView"),
      eli5View: document.querySelector("#eli5View"),
      conceptPage: document.querySelector("#conceptPage"),
      conceptContent: document.querySelector("#conceptContent"),
      wikiIndex: document.querySelector("#wikiIndex")
    };
  }

  function setActivePage(page) {
    const active = PAGES.has(page) ? page : "wiki";
    shell.wikiView.hidden = active !== "wiki";
    shell.learnView.hidden = active !== "learn";
    shell.eli5View.hidden = active !== "eli5";
    shell.nav.querySelectorAll("[data-wiki-page]").forEach(button => {
      const selected = button.dataset.wikiPage === active;
      button.setAttribute("aria-current", selected ? "page" : "false");
      button.classList.toggle("active", selected);
    });
  }

  function relationButtons(terms) {
    const resolved = unique(terms).map(resolveTerm).filter(Boolean);
    if (!resolved.length) return "";
    return `<div class="wiki-chip-row">${resolved.map(entry =>
      `<button type="button" class="wiki-chip" data-wiki-term="${escapeAttr(entry.term)}">${escapeHtml(entry.term)}</button>`
    ).join("")}</div>`;
  }

  function textSection(title, text, className = "") {
    if (!text) return "";
    return `<section class="concept-section ${escapeAttr(className)}"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p></section>`;
  }

  function listSection(title, values, className = "") {
    if (!Array.isArray(values) || !values.length) return "";
    return `<section class="concept-section ${escapeAttr(className)}"><h2>${escapeHtml(title)}</h2><ul>${values.map(value => `<li>${escapeHtml(value)}</li>`).join("")}</ul></section>`;
  }

  function relationSection(title, terms) {
    const content = relationButtons(terms);
    if (!content) return "";
    return `<section class="concept-section concept-relations"><h2>${escapeHtml(title)}</h2>${content}</section>`;
  }

  function backlinksFor(entry) {
    const target = entry.term.toLowerCase();
    return entries().filter(other => other.term !== entry.term && [
      ...(other.related || []), ...(other.confusedWith || [])
    ].some(term => String(term).toLowerCase() === target)).map(other => other.term);
  }

  function sourceSection(entry, wiki) {
    const sources = unique([entry.source, ...(wiki.sources || [])]).filter(source => /^https?:\/\//i.test(source));
    if (!sources.length) return "";
    return `<section class="concept-section"><h2>Sources</h2><ul class="wiki-source-list">${sources.map(source =>
      `<li><a href="${escapeAttr(source)}" target="_blank" rel="noopener">${escapeHtml(source)}</a></li>`
    ).join("")}</ul></section>`;
  }

  function renderConceptPage(entry) {
    const wiki = wikiFor(entry);
    const learning = learningFor(entry);
    const prerequisites = window.__wikiLearningPaths?.[entry.term]?.understandFirst || [];
    const aliases = unique(entry.aliases || []);
    const confused = unique(entry.confusedWith || []);
    const related = unique(entry.related || []);
    const backlinks = backlinksFor(entry);
    const scenario = wiki.scenario || null;
    const check = wiki.checkYourself || null;

    const scenarioHtml = scenario ? `
      <section class="concept-section scenario-section">
        <h2>Engineering scenario</h2>
        <div class="scenario-question"><strong>Situation</strong><p>${escapeHtml(scenario.question || "")}</p></div>
        ${scenario.diagnosis ? `<div><strong>Diagnosis</strong><p>${escapeHtml(scenario.diagnosis)}</p></div>` : ""}
        ${scenario.resolution ? `<div><strong>Resolution</strong><p>${escapeHtml(scenario.resolution)}</p></div>` : ""}
      </section>` : "";

    const checkHtml = check ? `
      <section class="concept-section check-section">
        <h2>Check yourself</h2>
        <details>
          <summary>${escapeHtml(check.question || "Question")}</summary>
          <p>${escapeHtml(check.answer || "")}</p>
        </details>
      </section>` : "";

    shell.conceptContent.innerHTML = `
      <div class="concept-topbar">
        <button type="button" class="text-button wiki-back" data-wiki-back>← Wiki index</button>
        <button type="button" data-wiki-learn="${escapeAttr(entry.term)}">Focus in Learn</button>
      </div>
      <header class="concept-header">
        <p class="eyebrow">${escapeHtml(entry.group || "Concept")}</p>
        <h1>${escapeHtml(entry.term)}</h1>
        <div class="concept-meta">
          <span class="tag">${escapeHtml(entry.kind || "Term")}</span>
          <span class="learning-badge" data-state="${escapeAttr(learning.status)}">${escapeHtml(learning.label)}</span>
          ${aliases.map(alias => `<span class="tag">${escapeHtml(alias)}</span>`).join("")}
        </div>
      </header>
      ${textSection("ELI5", entry.plain || entry.definition, "eli5-section")}
      ${textSection("Definition", entry.definition)}
      ${entry.memoryHook ? textSection("Mental model", entry.memoryHook, "mental-model-section") : ""}
      ${textSection("How it works", wiki.howItWorks)}
      ${entry.example ? textSection("Concrete example", entry.example) : ""}
      ${textSection("When it matters", wiki.whenItMatters)}
      ${listSection("Trade-offs", wiki.tradeoffs)}
      ${listSection("Failure modes", wiki.failureModes, "failure-section")}
      ${scenarioHtml}
      ${listSection("What changes the decision?", wiki.decisionChanges)}
      ${checkHtml}
      ${relationSection("Understand first", prerequisites)}
      ${relationSection("Often confused with", confused)}
      ${relationSection("Related concepts", related)}
      ${relationSection("Referenced by", backlinks)}
      ${sourceSection(entry, wiki)}
    `;
    shell.conceptPage.hidden = false;
    shell.wikiIndex.hidden = true;
    shell.conceptPage.scrollIntoView({ block: "start" });
  }

  function renderWikiIndex() {
    shell.conceptPage.hidden = true;
    shell.wikiIndex.hidden = false;
    shell.conceptContent.replaceChildren();
  }

  function renderEli5Page() {
    const cards = ELI5_TERMS.map(resolveTerm).filter(Boolean);
    const misconceptions = Array.isArray(window.__wikiMisconceptions) ? window.__wikiMisconceptions : [];

    shell.eli5View.innerHTML = `
      <header class="surface-header">
        <p class="eyebrow">Start simple</p>
        <h1>ELI5 &amp; Misconceptions</h1>
        <p class="muted">Simple mental models first, then the claims that are commonly stated too strongly.</p>
      </header>
      <section class="eli5-section-list" aria-labelledby="eli5-heading">
        <div class="section-heading">
          <h2 id="eli5-heading">ELI5 concepts</h2>
          <p class="muted">One-minute explanations from the canonical glossary.</p>
        </div>
        <div class="eli5-grid">
          ${cards.map(entry => `
            <article class="eli5-card">
              <div class="eli5-card-head"><h3>${escapeHtml(entry.term)}</h3><span class="tag">${escapeHtml(entry.kind || "Term")}</span></div>
              <p>${escapeHtml(entry.plain || entry.definition)}</p>
              ${entry.memoryHook ? `<p class="eli5-hook"><strong>Remember:</strong> ${escapeHtml(entry.memoryHook)}</p>` : ""}
              <button type="button" class="text-button" data-wiki-term="${escapeAttr(entry.term)}">Open full concept →</button>
            </article>`).join("")}
        </div>
      </section>
      <section class="misconception-list" aria-labelledby="misconception-heading">
        <div class="section-heading">
          <h2 id="misconception-heading">Common misconceptions</h2>
          <p class="muted">Verdicts use ${VERDICTS.map(escapeHtml).join(", ")} — not every claim is a binary myth/fact question.</p>
        </div>
        <div class="misconception-grid">
          ${misconceptions.map(item => `
            <article class="misconception-card">
              <div class="misconception-head">
                <h3>${escapeHtml(item.claim)}</h3>
                <span class="verdict verdict-${escapeAttr(slug(item.verdict))}">${escapeHtml(item.verdict)}</span>
              </div>
              <p class="misconception-short">${escapeHtml(item.short)}</p>
              <details>
                <summary>Why?</summary>
                <p>${escapeHtml(item.detail)}</p>
              </details>
              ${relationButtons(item.related || [])}
            </article>`).join("")}
        </div>
      </section>
    `;
  }

  function renderState() {
    if (!shell) return;
    const state = parseHash();
    setActivePage(state.page);

    if (state.page === "wiki") {
      if (state.term) {
        const entry = resolveTerm(state.term);
        if (entry) {
          const focusDialog = document.querySelector("#focusDialog");
          if (focusDialog?.open) focusDialog.close();
          renderConceptPage(entry);
          document.title = `${entry.term} · Agentic AI Wiki`;
        } else {
          renderWikiIndex();
          document.title = "Agentic AI Wiki";
        }
      } else {
        renderWikiIndex();
        document.title = "Agentic AI Wiki";
      }
    } else if (state.page === "eli5") {
      renderEli5Page();
      document.title = "ELI5 & Misconceptions · Agentic AI Wiki";
    } else {
      document.title = "Learn · Agentic AI Wiki";
    }
  }

  function handleShellClick(event) {
    const pageButton = event.target.closest("[data-wiki-page]");
    if (pageButton) {
      goToPage(pageButton.dataset.wikiPage);
      return;
    }
    const termButton = event.target.closest("[data-wiki-term]");
    if (termButton) {
      openWikiTerm(termButton.dataset.wikiTerm);
      return;
    }
    if (event.target.closest("[data-wiki-back]")) {
      goToPage("wiki");
      return;
    }
    const learnButton = event.target.closest("[data-wiki-learn]");
    if (learnButton) {
      goToPage("learn");
      setTimeout(() => {
        const search = document.querySelector("#searchInput");
        if (search) {
          search.value = learnButton.dataset.wikiLearn;
          search.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }, 0);
    }
  }

  function interceptBaseEntryOpen(event) {
    if (event.target.closest("[data-no-open]")) return;
    const item = event.target.closest("#tableBody [data-id], #cardList [data-id]");
    if (!item) return;
    const entry = entryByBaseId(item.dataset.id);
    if (!entry) return;
    event.preventDefault();
    event.stopPropagation();
    openWikiTerm(entry.term);
  }

  function interceptBaseEntryKey(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    const item = event.target.closest("#tableBody [data-id], #cardList [data-id]");
    if (!item) return;
    const entry = entryByBaseId(item.dataset.id);
    if (!entry) return;
    event.preventDefault();
    event.stopPropagation();
    openWikiTerm(entry.term);
  }

  function install() {
    if (installed || !entries().length) return;
    shell = installShell();
    if (!shell) return;
    installed = true;
    shell.nav.addEventListener("click", handleShellClick);
    shell.wikiView.addEventListener("click", handleShellClick);
    shell.eli5View.addEventListener("click", handleShellClick);
    document.addEventListener("click", interceptBaseEntryOpen, true);
    document.addEventListener("keydown", interceptBaseEntryKey, true);
    window.addEventListener("hashchange", renderState);
    renderState();
  }

  function boot() {
    if (installed) {
      renderState();
      return;
    }
    if (entries().length) install();
  }

  window.addEventListener("wiki:data-ready", boot);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(boot, 0), { once: true });
  } else {
    setTimeout(boot, 0);
  }
})();
