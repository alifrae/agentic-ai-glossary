(() => {
  "use strict";

  let installed = false;
  let scheduled = false;
  let cardObserver = null;
  let conceptObserver = null;

  function entries() {
    return Array.isArray(window.__wikiGlossaryEntries) ? window.__wikiGlossaryEntries : [];
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

  function decorate() {
    scheduled = false;
    document.querySelectorAll("#cardList .card[data-id]").forEach(decorateCard);
    decorateConceptPage(document.querySelector("#conceptContent"));
  }

  function scheduleDecorate() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(decorate);
  }

  function installObservers() {
    const cardList = document.querySelector("#cardList");
    const conceptContent = document.querySelector("#conceptContent");

    if (cardList && !cardObserver) {
      cardObserver = new MutationObserver(scheduleDecorate);
      cardObserver.observe(cardList, { childList: true, subtree: true });
    }
    if (conceptContent && !conceptObserver) {
      conceptObserver = new MutationObserver(scheduleDecorate);
      conceptObserver.observe(conceptContent, { childList: true, subtree: true });
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
