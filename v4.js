(() => {
  "use strict";

  const LEGACY_PAGES = new Set(["wiki", "learn", "eli5"]);
  const EPISTEMIC_LABELS = {
    "established-technical": "Established technical concept",
    "active-scientific-question": "Active scientific question",
    "philosophical-position": "Philosophical position",
    "forecast-uncertain": "Forecast / uncertain",
    "speculative": "Speculative",
    "mixed": "Mixed evidence / claim types"
  };
  const SECTION_TYPES = new Set([
    "text", "bullets", "equation", "worked-example", "comparison", "callout", "scenario", "self-check"
  ]);
  const RESULT_TYPES = ["Concept", "Article", "Topic", "Misconception"];

  let installed = false;
  let shell = null;

  function glossary() {
    return Array.isArray(window.__wikiGlossaryEntries) ? window.__wikiGlossaryEntries : [];
  }

  function topics() {
    return Array.isArray(window.__wikiTopics) ? window.__wikiTopics : [];
  }

  function articles() {
    return Array.isArray(window.__wikiArticles) ? window.__wikiArticles : [];
  }

  function misconceptions() {
    return Array.isArray(window.__wikiMisconceptions) ? window.__wikiMisconceptions : [];
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

  function byTopicId(id) {
    return topics().find(topic => topic.id === id) || null;
  }

  function byArticleId(id) {
    return articles().find(article => article.id === id) || null;
  }

  function resolveTerm(term) {
    const needle = String(term || "").trim().toLowerCase();
    if (!needle) return null;
    return glossary().find(entry =>
      String(entry.term || "").toLowerCase() === needle ||
      (entry.aliases || []).some(alias => String(alias).toLowerCase() === needle)
    ) || null;
  }

  function parseRoute() {
    const hash = location.hash || "";
    if (!hash) return { kind: "home", nav: "home" };
    if (hash.startsWith("#term=")) return { kind: "legacy", nav: "wiki" };
    if (hash.startsWith("#topic=")) {
      return { kind: "topic", nav: "topics", id: safeDecode(hash.slice("#topic=".length)) };
    }
    if (hash.startsWith("#article=")) {
      return { kind: "article", nav: "topics", id: safeDecode(hash.slice("#article=".length)) };
    }
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const page = params.get("page");
    if (page === "home") return { kind: "home", nav: "home" };
    if (page === "topics") return { kind: "topics", nav: "topics" };
    if (LEGACY_PAGES.has(page)) return { kind: "legacy", nav: page };
    return { kind: "home", nav: "home" };
  }

  function safeDecode(value) {
    try { return decodeURIComponent(value); } catch { return ""; }
  }

  function go(hash) {
    if (location.hash === hash) renderRoute();
    else location.hash = hash;
  }

  function installShell() {
    const nav = document.querySelector("#primaryNav");
    const main = document.querySelector("main");
    if (!nav || !main) return null;

    nav.innerHTML = `
      <button type="button" data-v4-page="home">Home</button>
      <button type="button" data-v4-page="topics">Topics</button>
      <button type="button" data-v4-page="wiki">Wiki</button>
      <button type="button" data-v4-page="learn">Learn</button>
      <button type="button" data-v4-page="eli5">ELI5</button>
    `;

    const root = document.createElement("div");
    root.id = "v4Root";
    root.className = "v4-root";

    const home = document.createElement("section");
    home.id = "v4Home";
    home.className = "v4-surface";

    const topicsView = document.createElement("section");
    topicsView.id = "v4Topics";
    topicsView.className = "v4-surface";

    const topicView = document.createElement("section");
    topicView.id = "v4TopicView";
    topicView.className = "v4-surface";

    const articleView = document.createElement("article");
    articleView.id = "v4ArticleView";
    articleView.className = "v4-surface v4-article";

    root.append(home, topicsView, topicView, articleView);
    main.prepend(root);

    return {
      nav,
      root,
      home,
      topicsView,
      topicView,
      articleView,
      wikiView: document.querySelector("#wikiView"),
      learnView: document.querySelector("#learnView"),
      eli5View: document.querySelector("#eli5View"),
      wikiIndex: document.querySelector("#wikiIndex")
    };
  }

  function setNav(active) {
    shell.nav.querySelectorAll("[data-v4-page]").forEach(button => {
      const selected = button.dataset.v4Page === active;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-current", selected ? "page" : "false");
    });
  }

  function hideV4Surfaces() {
    [shell.home, shell.topicsView, shell.topicView, shell.articleView].forEach(element => element.hidden = true);
  }

  function hideLegacySurfaces() {
    [shell.wikiView, shell.learnView, shell.eli5View, shell.wikiIndex].forEach(element => {
      if (element) element.hidden = true;
    });
  }

  function renderRoute() {
    if (!shell) return;
    const route = parseRoute();
    setNav(route.nav);
    hideV4Surfaces();

    if (route.kind === "legacy") {
      shell.root.hidden = true;
      document.title = document.title.replace("Agentic AI Wiki", "Personal AI & Engineering Wiki");
      return;
    }

    shell.root.hidden = false;
    hideLegacySurfaces();

    if (route.kind === "home") {
      shell.home.hidden = false;
      renderHome();
      document.title = "Personal AI & Engineering Wiki";
      return;
    }
    if (route.kind === "topics") {
      shell.topicsView.hidden = false;
      renderTopics();
      document.title = "Topics · Personal AI & Engineering Wiki";
      return;
    }
    if (route.kind === "topic") {
      shell.topicView.hidden = false;
      renderTopic(route.id);
      return;
    }
    shell.articleView.hidden = false;
    renderArticle(route.id);
  }

  function topicCard(topic) {
    const articleCount = (topic.articleIds || []).length;
    return `
      <article class="v4-card v4-topic-card">
        <div class="v4-card-meta"><span class="tag">Topic</span>${articleCount ? `<span>${articleCount} article${articleCount === 1 ? "" : "s"}</span>` : ""}</div>
        <h3>${escapeHtml(topic.title)}</h3>
        <p>${escapeHtml(topic.summary)}</p>
        <button type="button" class="text-button" data-v4-topic="${escapeAttr(topic.id)}">Open topic →</button>
      </article>`;
  }

  function renderHome() {
    const featured = ["llm-mathematics", "agent-protocols", "future-ai", "ai-humanity"]
      .map(byTopicId).filter(Boolean);
    shell.home.innerHTML = `
      <header class="v4-hero">
        <p class="eyebrow">Personal knowledge system</p>
        <h2>Find the concept. Follow the connections. Go deeper when needed.</h2>
        <p class="muted">Search concepts, long-form articles, topic hubs and misconceptions from one place.</p>
        ${searchBox("homeGlobalSearch", "Search the whole public wiki…")}
        <div id="homeSearchResults" class="v4-search-results" hidden></div>
      </header>
      <section class="v4-section">
        <div class="v4-section-head"><div><p class="eyebrow">Start here</p><h2>Featured topics</h2></div><button type="button" class="text-button" data-v4-page="topics">All topics →</button></div>
        <div class="v4-card-grid">${featured.map(topicCard).join("")}</div>
      </section>
      <section class="v4-section v4-home-shortcuts">
        <div class="v4-section-head"><div><p class="eyebrow">Cross-cutting views</p><h2>Different ways into the same knowledge</h2></div></div>
        <div class="v4-card-grid v4-card-grid-3">
          <article class="v4-card"><h3>Wiki</h3><p>Dense glossary and connected concept pages.</p><button type="button" class="text-button" data-v4-page="wiki">Browse concepts →</button></article>
          <article class="v4-card"><h3>Learn</h3><p>Recall-before-reveal, prerequisites and lightweight review state.</p><button type="button" class="text-button" data-v4-page="learn">Continue learning →</button></article>
          <article class="v4-card"><h3>ELI5</h3><p>Simple mental models and misconceptions stated with nuance.</p><button type="button" class="text-button" data-v4-page="eli5">Open ELI5 →</button></article>
        </div>
      </section>`;
  }

  function renderTopics() {
    shell.topicsView.innerHTML = `
      <header class="v4-surface-header">
        <p class="eyebrow">Knowledge map</p>
        <h1>Topics</h1>
        <p class="muted">Use a topic hub when a subject is bigger than one definition. Each hub connects compact concepts to deeper articles.</p>
        ${searchBox("topicsGlobalSearch", "Search concepts, articles, topics and misconceptions…")}
        <div id="topicsSearchResults" class="v4-search-results" hidden></div>
      </header>
      <div class="v4-card-grid">${topics().map(topicCard).join("")}</div>`;
  }

  function searchBox(id, placeholder) {
    return `<label class="v4-search-box"><span class="sr-only">Global search</span><input id="${id}" type="search" data-v4-search placeholder="${escapeAttr(placeholder)}" autocomplete="off"></label>`;
  }

  function buildSearchIndex() {
    const conceptItems = glossary().map(entry => ({
      type: "Concept",
      title: entry.term,
      summary: entry.plain || entry.definition || "",
      haystack: [entry.term, entry.definition, entry.plain, entry.example, entry.memoryHook, ...(entry.aliases || []), ...(entry.related || [])].join(" "),
      action: { kind: "term", value: entry.term }
    }));
    const articleItems = articles().map(article => ({
      type: "Article",
      title: article.title,
      summary: article.summary || article.eli5 || "",
      haystack: [article.title, article.summary, article.eli5, ...flattenArticleText(article), ...(article.references || []).map(ref => ref.title)].join(" "),
      action: { kind: "article", value: article.id }
    }));
    const topicItems = topics().map(topic => ({
      type: "Topic",
      title: topic.title,
      summary: topic.summary,
      haystack: [topic.title, topic.summary, ...(topic.startHere || [])].join(" "),
      action: { kind: "topic", value: topic.id }
    }));
    const misconceptionItems = misconceptions().map((item, index) => ({
      type: "Misconception",
      title: item.claim,
      summary: item.short || item.detail || "",
      haystack: [item.claim, item.short, item.detail, ...(item.related || [])].join(" "),
      action: { kind: "eli5", value: String(index) }
    }));
    return [...conceptItems, ...articleItems, ...topicItems, ...misconceptionItems];
  }

  function flattenArticleText(article) {
    const values = [];
    for (const section of article.sections || []) {
      values.push(section.heading, section.body, section.explanation, section.expression, section.question, section.answer);
      values.push(...(section.items || []), ...(section.steps || []), ...(section.rows || []).flat?.() || []);
      if (section.diagnosis) values.push(section.diagnosis);
      if (section.resolution) values.push(section.resolution);
    }
    return values.filter(Boolean).map(String);
  }

  function search(query) {
    const terms = String(query || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return buildSearchIndex().map(item => {
      const haystack = String(item.haystack || "").toLowerCase();
      const title = String(item.title || "").toLowerCase();
      if (!terms.every(term => haystack.includes(term))) return null;
      const score = terms.reduce((value, term) => value + (title.includes(term) ? 3 : 1), 0);
      return { ...item, score };
    }).filter(Boolean).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, 20);
  }

  function renderSearchResults(input) {
    const container = input.id === "homeGlobalSearch"
      ? shell.home.querySelector("#homeSearchResults")
      : shell.topicsView.querySelector("#topicsSearchResults");
    if (!container) return;
    const results = search(input.value);
    if (!input.value.trim()) {
      container.hidden = true;
      container.replaceChildren();
      return;
    }
    container.hidden = false;
    if (!results.length) {
      container.innerHTML = `<div class="empty-state"><strong>No global matches.</strong><p>Try a broader term or browse the topic hubs.</p></div>`;
      return;
    }
    container.innerHTML = results.map(item => `
      <button type="button" class="v4-search-result" data-v4-result-kind="${escapeAttr(item.action.kind)}" data-v4-result-value="${escapeAttr(item.action.value)}">
        <span class="tag">${escapeHtml(item.type)}</span>
        <span class="v4-search-copy"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.summary)}</small></span>
      </button>`).join("");
  }

  function renderTopic(topicId) {
    const topic = byTopicId(topicId);
    if (!topic) {
      shell.topicView.innerHTML = `<div class="empty-state"><strong>Topic not found.</strong><p>The topic may have been renamed or removed.</p><button type="button" data-v4-page="topics">Back to Topics</button></div>`;
      document.title = "Topic not found · Personal AI & Engineering Wiki";
      return;
    }
    const topicArticles = (topic.articleIds || []).map(byArticleId).filter(Boolean);
    const related = (topic.relatedTopicIds || []).map(byTopicId).filter(Boolean);
    shell.topicView.innerHTML = `
      <div class="v4-breadcrumb"><button type="button" class="text-button" data-v4-page="topics">← Topics</button></div>
      <header class="v4-surface-header">
        <p class="eyebrow">Topic hub</p>
        <h1>${escapeHtml(topic.title)}</h1>
        <p class="v4-lede">${escapeHtml(topic.summary)}</p>
      </header>
      ${conceptChipSection("Start here", topic.startHere || [])}
      <section class="v4-section">
        <div class="v4-section-head"><div><p class="eyebrow">Deep dives</p><h2>Articles</h2></div></div>
        ${topicArticles.length ? `<div class="v4-card-grid">${topicArticles.map(articleCard).join("")}</div>` : `<div class="v4-note"><strong>Long-form articles are being added progressively.</strong><p>The compact concepts above remain available now.</p></div>`}
      </section>
      ${related.length ? `<section class="v4-section"><div class="v4-section-head"><h2>Related topics</h2></div><div class="v4-card-grid">${related.map(topicCard).join("")}</div></section>` : ""}`;
    document.title = `${topic.title} · Personal AI & Engineering Wiki`;
  }

  function conceptChipSection(title, terms) {
    const resolved = unique(terms).map(resolveTerm).filter(Boolean);
    if (!resolved.length) return "";
    return `<section class="v4-section"><div class="v4-section-head"><h2>${escapeHtml(title)}</h2></div><div class="v4-chip-row">${resolved.map(entry => `<button type="button" class="wiki-chip" data-v4-term="${escapeAttr(entry.term)}">${escapeHtml(entry.term)}</button>`).join("")}</div></section>`;
  }

  function articleCard(article) {
    return `<article class="v4-card v4-article-card"><div class="v4-card-meta"><span class="tag">${escapeHtml(article.level || "Article")}</span>${article.epistemicStatus ? `<span>${escapeHtml(EPISTEMIC_LABELS[article.epistemicStatus] || article.epistemicStatus)}</span>` : ""}</div><h3>${escapeHtml(article.title)}</h3><p>${escapeHtml(article.summary || article.eli5 || "")}</p><button type="button" class="text-button" data-v4-article="${escapeAttr(article.id)}">Read article →</button></article>`;
  }

  function renderArticle(articleId) {
    const article = byArticleId(articleId);
    if (!article) {
      shell.articleView.innerHTML = `<div class="empty-state"><strong>Article not found.</strong><p>The article may have been renamed, or its optional content failed to load.</p><button type="button" data-v4-page="topics">Back to Topics</button></div>`;
      document.title = "Article not found · Personal AI & Engineering Wiki";
      return;
    }
    const primaryTopic = byTopicId((article.topicIds || [])[0]);
    const epistemicLabel = EPISTEMIC_LABELS[article.epistemicStatus] || article.epistemicStatus || "";
    shell.articleView.innerHTML = `
      <div class="v4-breadcrumb">${primaryTopic ? `<button type="button" class="text-button" data-v4-topic="${escapeAttr(primaryTopic.id)}">← ${escapeHtml(primaryTopic.title)}</button>` : `<button type="button" class="text-button" data-v4-page="topics">← Topics</button>`}</div>
      <header class="v4-article-header">
        <div class="v4-card-meta"><span class="tag">${escapeHtml(article.level || "Article")}</span>${article.reviewedAt ? `<span>Reviewed ${escapeHtml(article.reviewedAt)}</span>` : ""}</div>
        <h1>${escapeHtml(article.title)}</h1>
        <p class="v4-lede">${escapeHtml(article.summary || "")}</p>
        ${epistemicLabel ? `<div class="v4-epistemic" data-epistemic="${escapeAttr(article.epistemicStatus)}"><strong>${escapeHtml(epistemicLabel)}</strong><span>${escapeHtml(epistemicExplanation(article.epistemicStatus))}</span></div>` : ""}
      </header>
      ${article.eli5 ? `<section class="v4-article-section v4-eli5"><p class="eyebrow">ELI5</p><p>${escapeHtml(article.eli5)}</p></section>` : ""}
      <div class="v4-article-body">${(article.sections || []).map(renderSection).join("")}</div>
      ${conceptChipSection("Related concepts", article.relatedTerms || [])}
      ${renderReadNext(article.readNext || [])}
      ${renderReferences(article.references || [])}`;
    document.title = `${article.title} · Personal AI & Engineering Wiki`;
  }

  function epistemicExplanation(status) {
    const explanations = {
      "established-technical": "The core mechanism is standard technical material; implementation details can still vary.",
      "active-scientific-question": "Evidence and theories are still developing; the page separates observations from interpretations.",
      "philosophical-position": "This concerns competing conceptual arguments rather than a single settled empirical answer.",
      "forecast-uncertain": "This page discusses future possibilities or timelines with material uncertainty.",
      "speculative": "The claim goes beyond established evidence and is presented as speculation.",
      "mixed": "Different sections have different evidence status; labels and sources should be read locally."
    };
    return explanations[status] || "";
  }

  function renderSection(section) {
    if (!section || !SECTION_TYPES.has(section.type)) return "";
    const heading = section.heading ? `<h2>${escapeHtml(section.heading)}</h2>` : "";
    if (section.type === "text") {
      return `<section class="v4-article-section">${heading}<p>${escapeHtml(section.body || "")}</p></section>`;
    }
    if (section.type === "bullets") {
      return `<section class="v4-article-section">${heading}<ul>${(section.items || []).map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>`;
    }
    if (section.type === "equation") {
      return `<section class="v4-article-section">${heading}<div class="v4-equation" role="math">${escapeHtml(section.expression || "")}</div>${section.explanation ? `<p>${escapeHtml(section.explanation)}</p>` : ""}${section.shapes ? `<p class="v4-note-inline"><strong>Shapes:</strong> ${escapeHtml(section.shapes)}</p>` : ""}</section>`;
    }
    if (section.type === "worked-example") {
      return `<section class="v4-article-section v4-worked-example">${heading}${section.intro ? `<p>${escapeHtml(section.intro)}</p>` : ""}<ol>${(section.steps || []).map(step => `<li>${escapeHtml(step)}</li>`).join("")}</ol>${section.result ? `<p><strong>Result:</strong> ${escapeHtml(section.result)}</p>` : ""}</section>`;
    }
    if (section.type === "comparison") {
      const columns = section.columns || [];
      const rows = section.rows || [];
      return `<section class="v4-article-section">${heading}<div class="v4-table-scroll"><table class="v4-comparison"><thead><tr>${columns.map(column => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div></section>`;
    }
    if (section.type === "callout") {
      return `<aside class="v4-callout" data-kind="${escapeAttr(section.kind || "note")}">${heading}<p>${escapeHtml(section.body || "")}</p></aside>`;
    }
    if (section.type === "scenario") {
      return `<section class="v4-article-section v4-scenario">${heading}${section.question ? `<div><strong>Situation</strong><p>${escapeHtml(section.question)}</p></div>` : ""}${section.diagnosis ? `<div><strong>Diagnosis</strong><p>${escapeHtml(section.diagnosis)}</p></div>` : ""}${section.resolution ? `<div><strong>Resolution</strong><p>${escapeHtml(section.resolution)}</p></div>` : ""}</section>`;
    }
    return `<section class="v4-article-section v4-self-check">${heading}<details><summary>${escapeHtml(section.question || "Check yourself")}</summary><p>${escapeHtml(section.answer || "")}</p></details></section>`;
  }

  function renderReadNext(ids) {
    const next = unique(ids).map(byArticleId).filter(Boolean);
    if (!next.length) return "";
    return `<section class="v4-section"><div class="v4-section-head"><h2>Read next</h2></div><div class="v4-card-grid">${next.map(articleCard).join("")}</div></section>`;
  }

  function renderReferences(references) {
    const groups = [
      { title: "References", items: references.filter(ref => ["primary", "historical", "philosophy"].includes(ref.kind)) },
      { title: "Read more", items: references.filter(ref => ref.kind === "explainer") },
      { title: "Advanced reading", items: references.filter(ref => ref.kind === "advanced") }
    ];
    const rendered = groups.filter(group => group.items.length).map(group => `
      <section class="v4-reference-group"><h2>${group.title}</h2><ul>${group.items.map(reference => `<li><a href="${escapeAttr(reference.url)}" target="_blank" rel="noopener">${escapeHtml(reference.title)}</a><span>${escapeHtml(reference.publisher || "")}${reference.year ? ` · ${escapeHtml(reference.year)}` : ""}</span>${reference.note ? `<p>${escapeHtml(reference.note)}</p>` : ""}</li>`).join("")}</ul></section>`).join("");
    return rendered ? `<section class="v4-references">${rendered}</section>` : "";
  }

  function handleClick(event) {
    const page = event.target.closest("[data-v4-page]");
    if (page) {
      const target = page.dataset.v4Page;
      go(target === "home" ? "#page=home" : target === "topics" ? "#page=topics" : `#page=${target}`);
      return;
    }
    const topic = event.target.closest("[data-v4-topic]");
    if (topic) { go(`#topic=${encodeURIComponent(topic.dataset.v4Topic)}`); return; }
    const article = event.target.closest("[data-v4-article]");
    if (article) { go(`#article=${encodeURIComponent(article.dataset.v4Article)}`); return; }
    const term = event.target.closest("[data-v4-term]");
    if (term) { go(`#term=${encodeURIComponent(term.dataset.v4Term)}`); return; }
    const result = event.target.closest("[data-v4-result-kind]");
    if (result) {
      const kind = result.dataset.v4ResultKind;
      const value = result.dataset.v4ResultValue;
      if (kind === "term") go(`#term=${encodeURIComponent(value)}`);
      else if (kind === "topic") go(`#topic=${encodeURIComponent(value)}`);
      else if (kind === "article") go(`#article=${encodeURIComponent(value)}`);
      else if (kind === "eli5") go("#page=eli5");
    }
  }

  function handleInput(event) {
    const input = event.target.closest("[data-v4-search]");
    if (input) renderSearchResults(input);
  }

  function install() {
    if (installed) return renderRoute();
    shell = installShell();
    if (!shell) return;
    installed = true;
    shell.nav.addEventListener("click", handleClick);
    shell.root.addEventListener("click", handleClick);
    shell.root.addEventListener("input", handleInput);
    window.addEventListener("hashchange", () => setTimeout(renderRoute, 0));
    renderRoute();
  }

  function boot() {
    setTimeout(install, 0);
  }

  window.addEventListener("wiki:data-ready", boot);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(boot, 10), { once: true });
  } else {
    setTimeout(boot, 10);
  }
})();
