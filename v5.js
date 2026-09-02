(() => {
  "use strict";

  let installed = false;
  let scheduled = false;
  let cardObserver = null;
  let conceptObserver = null;
  let topicObserver = null;

  function entries() {
    return Array.isArray(window.__wikiGlossaryEntries) ? window.__wikiGlossaryEntries : [];
  }

  function topics() {
    return Array.isArray(window.__wikiTopics) ? window.__wikiTopics : [];
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[character]);
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function slug(value) {
    return String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  }

  function canonicalId(entry, index) {
    return entry.id || `base-${index}-${slug(entry.term || "entry")}`;
  }

  function entryByCardId(id) {
    const source = entries();
    const index = source.findIndex((entry, position) => canonicalId(entry, position) === id);
    return index >= 0 ? source[index] : null;
  }

  function entryByTerm(term) {
    const needle = String(term || "").trim().toLowerCase();
    if (!needle) return null;
    return entries().find(entry =>
      String(entry.term || "").toLowerCase() === needle ||
      (entry.aliases || []).some(alias => String(alias).toLowerCase() === needle)
    ) || null;
  }

  function linked(text, currentTerm) {
    if (!window.WikiTermLinks?.render) return escapeHtml(text);
    return window.WikiTermLinks.render(text, { currentTerm, entries: entries() });
  }

  function safeReferences(entry) {
    return (entry.references || []).filter(reference =>
      reference && typeof reference === "object" &&
      String(reference.title || "").trim() && /^https:\/\//i.test(String(reference.url || "").trim())
    );
  }

  function termAnchor(term, className = "wiki-chip") {
    const resolved = entryByTerm(term);
    if (!resolved) return "";
    return `<a class="${escapeAttr(className)}" href="#term=${encodeURIComponent(resolved.term)}" data-term-link data-no-open="true">${escapeHtml(resolved.term)}</a>`;
  }

  function decorateCard(card) {
    if (!card || card.dataset.v5Decorated === "true") return;
    const entry = entryByCardId(card.dataset.id);
    if (!entry) {
      if (String(card.dataset.id || "").startsWith("local-")) {
        const meta = card.querySelector(".card-meta");
        if (meta && !meta.querySelector(".level-badge")) {
          meta.insertAdjacentHTML("afterbegin", '<span class="tag level-badge">Local</span>');
        }
      }
      card.dataset.v5Decorated = "true";
      return;
    }

    const directParagraphs = [...card.children].filter(element => element.tagName === "P");
    if (directParagraphs[0]) directParagraphs[0].innerHTML = linked(directParagraphs[0].textContent, entry.term);
    if (directParagraphs[1]?.classList.contains("plain")) directParagraphs[1].innerHTML = linked(directParagraphs[1].textContent, entry.term);

    const meta = card.querySelector(".card-meta");
    if (meta && entry.level && !meta.querySelector(".level-badge")) {
      meta.insertAdjacentHTML("afterbegin", `<span class="tag level-badge" data-level="${escapeAttr(entry.level)}">${escapeHtml(entry.level)}</span>`);
    }

    const prerequisites = (entry.prerequisites || []).map(term => termAnchor(term, "v5-prereq-chip")).filter(Boolean);
    if (prerequisites.length) {
      card.insertAdjacentHTML("beforeend", `
        <section class="v5-card-block v5-card-prerequisites" data-no-open="true">
          <strong>Understand first</strong>
          <div class="v5-chip-row">${prerequisites.join("")}</div>
        </section>`);
    }

    const references = safeReferences(entry);
    if (references.length) {
      const visible = references.slice(0, 2);
      card.insertAdjacentHTML("beforeend", `
        <section class="v5-card-block v5-card-reading" data-no-open="true">
          <strong>Further reading</strong>
          <ul>${visible.map(reference => `<li><a href="${escapeAttr(reference.url)}" target="_blank" rel="noopener noreferrer" data-no-open="true">${escapeHtml(reference.title)}</a></li>`).join("")}</ul>
          ${references.length > visible.length ? `<small>+${references.length - visible.length} more on the concept page</small>` : ""}
        </section>`);
    }

    card.dataset.v5Decorated = "true";
  }

  function findConceptSection(content, headingText) {
    return [...content.querySelectorAll(".concept-section")].find(section =>
      section.querySelector("h2")?.textContent.trim() === headingText
    ) || null;
  }

  function decorateConceptPage(content) {
    if (!content) return;
    const term = content.querySelector(".concept-header h1")?.textContent.trim();
    if (!term) return;
    const entry = entryByTerm(term);
    if (!entry) return;

    const meta = content.querySelector(".concept-meta");
    if (meta && entry.level && !meta.querySelector(".level-badge")) {
      meta.insertAdjacentHTML("afterbegin", `<span class="tag level-badge" data-level="${escapeAttr(entry.level)}">${escapeHtml(entry.level)}</span>`);
    }

    for (const [heading, source] of [
      ["ELI5", entry.plain || entry.definition],
      ["Definition", entry.definition],
      ["Concrete example", entry.example]
    ]) {
      const section = findConceptSection(content, heading);
      const paragraph = section?.querySelector("p");
      if (paragraph && source) paragraph.innerHTML = linked(source, entry.term);
    }

    const oldReading = content.querySelector("[data-v5-concept-reading]");
    if (oldReading) oldReading.remove();
    const references = safeReferences(entry);
    if (references.length) {
      const html = `
        <section class="concept-section v5-concept-reading" data-v5-concept-reading>
          <h2>Further reading</h2>
          <ul class="wiki-source-list">${references.map(reference =>
            `<li><a href="${escapeAttr(reference.url)}" target="_blank" rel="noopener noreferrer" data-no-open="true">${escapeHtml(reference.title)}</a></li>`
          ).join("")}</ul>
        </section>`;
      const sourceSection = [...content.querySelectorAll(".concept-section")].find(section => section.querySelector("h2")?.textContent.trim() === "Sources");
      if (sourceSection) sourceSection.insertAdjacentHTML("beforebegin", html);
      else content.insertAdjacentHTML("beforeend", html);
    }
  }

  function mathTopic() {
    return topics().find(topic => topic.id === "llm-mathematics" && Array.isArray(topic.graphStages)) || null;
  }

  function graphNodes(topic) {
    const nodes = [];
    (topic.graphStages || []).forEach((stage, stageIndex) => {
      (stage || []).forEach((term, nodeIndex) => {
        const entry = entryByTerm(term);
        if (entry) nodes.push({ entry, stageIndex, nodeIndex, stageSize: stage.length });
      });
    });
    return nodes;
  }

  function graphEdges(nodes) {
    const canonical = new Map(nodes.map(node => [node.entry.term.toLowerCase(), node]));
    const seen = new Set();
    const edges = [];
    for (const node of nodes) {
      for (const relatedTerm of node.entry.related || []) {
        const target = canonical.get(String(relatedTerm).toLowerCase());
        if (!target || target.entry.term === node.entry.term) continue;
        const pair = [node.entry.term, target.entry.term].sort((a, b) => a.localeCompare(b));
        const key = pair.join("\u0000");
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push([node, target]);
      }
    }
    return edges;
  }

  function graphPosition(node, stageCount) {
    const width = 960;
    const height = 430;
    const xPad = 92;
    const yPad = 72;
    const usableWidth = width - xPad * 2;
    const usableHeight = height - yPad * 2;
    const x = stageCount <= 1 ? width / 2 : xPad + (usableWidth * node.stageIndex) / (stageCount - 1);
    const y = node.stageSize <= 1 ? height / 2 : yPad + (usableHeight * node.nodeIndex) / (node.stageSize - 1);
    return { x, y };
  }

  function renderMathGraph(topic) {
    const nodes = graphNodes(topic);
    if (!nodes.length) return "";
    const stageCount = topic.graphStages.length;
    const positioned = new Map(nodes.map(node => [node.entry.term, graphPosition(node, stageCount)]));
    const edges = graphEdges(nodes);
    const lines = edges.map(([source, target]) => {
      const a = positioned.get(source.entry.term);
      const b = positioned.get(target.entry.term);
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" />`;
    }).join("");
    const nodeMarkup = nodes.map(node => {
      const position = positioned.get(node.entry.term);
      const label = escapeHtml(node.entry.term);
      const href = `#term=${encodeURIComponent(node.entry.term)}`;
      return `<a href="${href}" data-v5-graph-term="${escapeAttr(node.entry.term)}" aria-label="Open ${escapeAttr(node.entry.term)}">
        <g class="v5-graph-node" transform="translate(${position.x} ${position.y})">
          <rect x="-68" y="-24" width="136" height="48" rx="12"></rect>
          <text text-anchor="middle" dominant-baseline="middle">${label}</text>
        </g>
      </a>`;
    }).join("");
    return `<section class="v4-section v5-math-graph" data-v5-math-graph>
      <div class="v4-section-head"><div><p class="eyebrow">Concept graph</p><h2>From representations to generation</h2></div></div>
      <p class="muted">Stages follow the learning sequence; connections come from canonical related-concept relationships.</p>
      <div class="v5-graph-scroll" role="region" aria-label="LLM Mathematics concept graph" tabindex="0">
        <svg viewBox="0 0 960 430" role="img" aria-labelledby="v5GraphTitle v5GraphDesc" preserveAspectRatio="xMidYMid meet">
          <title id="v5GraphTitle">LLM Mathematics concept graph</title>
          <desc id="v5GraphDesc">Clickable concepts arranged by teaching stage, with lines for related-concept relationships.</desc>
          <g class="v5-graph-edges">${lines}</g>
          <g class="v5-graph-nodes">${nodeMarkup}</g>
        </svg>
      </div>
    </section>`;
  }

  function decorateMathTopic() {
    if (!location.hash.startsWith("#topic=llm-mathematics")) return;
    const topicView = document.querySelector("#v4TopicView");
    const topic = mathTopic();
    if (!topicView || !topic || topicView.hidden || topicView.querySelector("[data-v5-math-graph]")) return;
    const header = topicView.querySelector(".v4-surface-header");
    const graph = renderMathGraph(topic);
    if (graph && header) header.insertAdjacentHTML("afterend", graph);
  }

  function decorate() {
    scheduled = false;
    document.querySelectorAll("#cardList .card[data-id]").forEach(decorateCard);
    decorateConceptPage(document.querySelector("#conceptContent"));
    decorateMathTopic();
  }

  function scheduleDecorate() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(decorate);
  }

  function installObservers() {
    const cardList = document.querySelector("#cardList");
    const conceptContent = document.querySelector("#conceptContent");
    const main = document.querySelector("main");

    if (cardList && !cardObserver) {
      cardObserver = new MutationObserver(scheduleDecorate);
      cardObserver.observe(cardList, { childList: true, subtree: true });
    }
    if (conceptContent && !conceptObserver) {
      conceptObserver = new MutationObserver(scheduleDecorate);
      conceptObserver.observe(conceptContent, { childList: true, subtree: true });
    }
    if (main && !topicObserver) {
      topicObserver = new MutationObserver(scheduleDecorate);
      topicObserver.observe(main, { childList: true, subtree: true });
    }
  }

  function guardNestedInteractiveKeys(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target.closest("[data-no-open]")) event.stopPropagation();
  }

  function boot() {
    if (!entries().length) return;
    if (!installed) {
      installed = true;
      document.addEventListener("keydown", guardNestedInteractiveKeys, true);
    }
    installObservers();
    decorate();
  }

  window.addEventListener("wiki:data-ready", () => setTimeout(boot, 0));
  window.addEventListener("hashchange", () => setTimeout(scheduleDecorate, 0));
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(boot, 0), { once: true });
  } else {
    setTimeout(boot, 0);
  }
})();
