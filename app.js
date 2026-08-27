(() => {
  "use strict";

  const STORAGE_KEY = "agentic-ai-glossary.local.v1";
  const BASE_COLUMNS = [
    { key: "term", label: "Term", default: true },
    { key: "group", label: "Group", default: true },
    { key: "kind", label: "Kind", default: true },
    { key: "definition", label: "Definition", default: true },
    { key: "plain", label: "Plain English", default: false },
    { key: "example", label: "Example", default: false },
    { key: "aliases", label: "Aliases", default: false },
    { key: "related", label: "Related", default: false },
    { key: "source", label: "Source", default: false },
    { key: "notes", label: "My note", default: true },
    { key: "review", label: "Review", default: true }
  ];

  const $ = (selector) => document.querySelector(selector);
  const els = {
    search: $("#searchInput"), group: $("#groupFilter"), kind: $("#kindFilter"), review: $("#reviewFilter"),
    head: $("#tableHead"), body: $("#tableBody"), cards: $("#cardList"), empty: $("#emptyState"),
    resultCount: $("#resultCount"), totalCount: $("#totalCount"), reviewCount: $("#reviewCount"),
    entryDialog: $("#entryDialog"), entryForm: $("#entryForm"), entryTitle: $("#entryDialogTitle"),
    deleteEntry: $("#deleteEntryBtn"), columnsDialog: $("#columnsDialog"), columnChecklist: $("#columnChecklist"),
    dataDialog: $("#dataDialog"), customFieldsEditor: $("#customFieldsEditor")
  };

  let baseEntries = [];
  let local = loadLocal();
  let sort = { key: "term", dir: 1 };

  function defaultLocal() {
    return { overrides: {}, added: [], deletedBase: [], customColumns: [], hiddenColumns: BASE_COLUMNS.filter(c => !c.default).map(c => c.key) };
  }
  function loadLocal() {
    try { return { ...defaultLocal(), ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) }; }
    catch { return defaultLocal(); }
  }
  function saveLocal() { localStorage.setItem(STORAGE_KEY, JSON.stringify(local)); }
  function uid() { return "local-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8); }
  function slug(value) { return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60); }
  function splitList(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return String(value).split(",").map(v => v.trim()).filter(Boolean);
  }
  function normalize(entry, index = 0) {
    return {
      id: entry.id || `base-${index}-${slug(entry.term || "entry")}`,
      term: entry.term || "", group: entry.group || "Ungrouped", kind: entry.kind || "Term",
      definition: entry.definition || "", plain: entry.plain ?? entry.plainEnglish ?? "", example: entry.example || "",
      aliases: Array.isArray(entry.aliases) ? entry.aliases : splitList(entry.aliases),
      related: Array.isArray(entry.related) ? entry.related : splitList(entry.related),
      source: entry.source || "", notes: entry.notes || "", review: Boolean(entry.review),
      custom: entry.custom && typeof entry.custom === "object" ? entry.custom : {}, localOnly: Boolean(entry.localOnly)
    };
  }
  function allEntries() {
    const deleted = new Set(local.deletedBase || []);
    const mergedBase = baseEntries.filter(e => !deleted.has(e.id)).map(e => normalize({ ...e, ...(local.overrides[e.id] || {}) }));
    const added = (local.added || []).map((e, i) => normalize({ ...e, localOnly: true }, i));
    return [...mergedBase, ...added];
  }
  function allColumns() {
    const custom = (local.customColumns || []).map(c => ({ key: `custom:${c.id}`, label: c.label, custom: true, id: c.id }));
    return [...BASE_COLUMNS, ...custom];
  }
  function visibleColumns() {
    const hidden = new Set(local.hiddenColumns || []);
    return allColumns().filter(c => !hidden.has(c.key));
  }
  function valueFor(entry, key) {
    if (key.startsWith("custom:")) return entry.custom?.[key.slice(7)] || "";
    const value = entry[key];
    if (Array.isArray(value)) return value.join(", ");
    if (key === "review") return value ? "Needs review" : "";
    return value ?? "";
  }
  function refreshFilters() {
    const entries = allEntries();
    const currentGroup = els.group.value, currentKind = els.kind.value;
    const groups = [...new Set(entries.map(e => e.group).filter(Boolean))].sort(localeSort);
    const kinds = [...new Set(entries.map(e => e.kind).filter(Boolean))].sort(localeSort);
    els.group.innerHTML = `<option value="">All groups</option>` + groups.map(option).join("");
    els.kind.innerHTML = `<option value="">All kinds</option>` + kinds.map(option).join("");
    els.group.value = groups.includes(currentGroup) ? currentGroup : "";
    els.kind.value = kinds.includes(currentKind) ? currentKind : "";
    $("#groupOptions").innerHTML = groups.map(v => `<option value="${escapeAttr(v)}"></option>`).join("");
    $("#kindOptions").innerHTML = kinds.map(v => `<option value="${escapeAttr(v)}"></option>`).join("");
  }
  function option(v) { return `<option value="${escapeAttr(v)}">${escapeHtml(v)}</option>`; }
  function filteredEntries() {
    const q = els.search.value.trim().toLowerCase(), group = els.group.value, kind = els.kind.value, review = els.review.value;
    const entries = allEntries().filter(entry => {
      if (group && entry.group !== group) return false;
      if (kind && entry.kind !== kind) return false;
      if (review === "review" && !entry.review) return false;
      if (review === "known" && entry.review) return false;
      if (!q) return true;
      const haystack = [entry.term, entry.group, entry.kind, entry.definition, entry.plain, entry.example,
        entry.aliases.join(" "), entry.related.join(" "), entry.source, entry.notes, ...Object.values(entry.custom || {})].join(" ").toLowerCase();
      return haystack.includes(q);
    });
    entries.sort((a, b) => String(valueFor(a, sort.key)).toLowerCase().localeCompare(String(valueFor(b, sort.key)).toLowerCase(), undefined, { numeric: true }) * sort.dir);
    return entries;
  }
  function render() {
    refreshFilters();
    const entries = filteredEntries();
    renderTable(entries); renderCards(entries);
    const all = allEntries();
    els.resultCount.textContent = entries.length; els.totalCount.textContent = all.length; els.reviewCount.textContent = all.filter(e => e.review).length;
    els.empty.hidden = entries.length > 0;
  }
  function renderTable(entries) {
    const cols = visibleColumns();
    els.head.innerHTML = cols.map(c => {
      const arrow = sort.key === c.key ? (sort.dir === 1 ? " ↑" : " ↓") : "";
      return `<th><button type="button" data-sort="${escapeAttr(c.key)}">${escapeHtml(c.label)}${arrow}</button></th>`;
    }).join("");
    els.body.innerHTML = entries.map(entry => `<tr data-id="${escapeAttr(entry.id)}">` + cols.map(c => cell(entry, c)).join("") + `</tr>`).join("");
  }
  function cell(entry, col) {
    const raw = valueFor(entry, col.key);
    let cls = "", html = escapeHtml(String(raw));
    if (col.key === "term") {
      cls = "term-cell";
      html = `${entry.review ? '<span class="review-dot" title="Needs review"></span>' : ""}${html}${entry.localOnly ? ' <span class="tag">local</span>' : ""}`;
    } else if (col.key === "definition") cls = "definition-cell";
    else if (col.key === "group" || col.key === "kind") html = raw ? `<span class="tag">${escapeHtml(String(raw))}</span>` : "";
    else if (col.key === "review") html = entry.review ? "Review" : "";
    else if (col.key === "source" && /^https?:\/\//i.test(raw)) html = `<a href="${escapeAttr(raw)}" target="_blank" rel="noopener" data-no-open="true">link</a>`;
    return `<td class="${cls}">${html}</td>`;
  }
  function renderCards(entries) {
    els.cards.innerHTML = entries.map(entry => `
      <article class="card" data-id="${escapeAttr(entry.id)}" tabindex="0">
        <div class="card-head"><h3>${entry.review ? '<span class="review-dot" title="Needs review"></span>' : ""}${escapeHtml(entry.term)}</h3>${entry.localOnly ? '<span class="tag">local</span>' : ""}</div>
        <p>${escapeHtml(entry.definition)}</p>${entry.plain ? `<p class="plain">${escapeHtml(entry.plain)}</p>` : ""}
        <div class="card-meta"><span class="tag">${escapeHtml(entry.group)}</span><span class="tag">${escapeHtml(entry.kind)}</span>${entry.notes ? '<span class="tag">has note</span>' : ""}</div>
      </article>`).join("");
  }
  function openEntry(id = "") {
    const entry = id ? allEntries().find(e => e.id === id) : null;
    els.entryForm.reset(); $("#entryId").value = entry?.id || ""; els.entryTitle.textContent = entry ? "Edit entry" : "Add entry";
    $("#termField").value = entry?.term || ""; $("#groupField").value = entry?.group || ""; $("#kindField").value = entry?.kind || "Term";
    $("#definitionField").value = entry?.definition || ""; $("#plainField").value = entry?.plain || ""; $("#exampleField").value = entry?.example || "";
    $("#aliasesField").value = entry?.aliases.join(", ") || ""; $("#relatedField").value = entry?.related.join(", ") || "";
    $("#sourceField").value = entry?.source || ""; $("#notesField").value = entry?.notes || ""; $("#reviewField").checked = Boolean(entry?.review);
    els.deleteEntry.hidden = !entry; els.deleteEntry.textContent = entry?.localOnly ? "Delete entry" : "Hide base entry";
    renderCustomFieldEditor(entry); els.entryDialog.showModal();
  }
  function renderCustomFieldEditor(entry) {
    els.customFieldsEditor.innerHTML = (local.customColumns || []).map(c => `<label>${escapeHtml(c.label)}<input data-custom-field="${escapeAttr(c.id)}" value="${escapeAttr(entry?.custom?.[c.id] || "")}" maxlength="500"></label>`).join("");
  }
  function saveEntryFromForm() {
    const id = $("#entryId").value, custom = {};
    document.querySelectorAll("[data-custom-field]").forEach(input => custom[input.dataset.customField] = input.value.trim());
    const payload = normalize({ id: id || uid(), term: $("#termField").value.trim(), group: $("#groupField").value.trim() || "Ungrouped",
      kind: $("#kindField").value.trim() || "Term", definition: $("#definitionField").value.trim(), plain: $("#plainField").value.trim(),
      example: $("#exampleField").value.trim(), aliases: splitList($("#aliasesField").value), related: splitList($("#relatedField").value),
      source: $("#sourceField").value.trim(), notes: $("#notesField").value.trim(), review: $("#reviewField").checked, custom });
    if (!payload.term || !payload.definition) return;
    const localIndex = local.added.findIndex(e => e.id === id);
    if (localIndex >= 0) local.added[localIndex] = { ...payload, localOnly: true };
    else if (id) local.overrides[id] = payload;
    else local.added.push({ ...payload, localOnly: true });
    saveLocal();
  }
  function deleteCurrentEntry() {
    const id = $("#entryId").value; if (!id) return;
    const index = local.added.findIndex(e => e.id === id);
    if (index >= 0) local.added.splice(index, 1);
    else { if (!local.deletedBase.includes(id)) local.deletedBase.push(id); delete local.overrides[id]; }
    saveLocal(); els.entryDialog.close(); render();
  }
  function renderColumns() {
    const hidden = new Set(local.hiddenColumns || []);
    els.columnChecklist.innerHTML = allColumns().map(col => `<label class="column-item"><input type="checkbox" data-column-key="${escapeAttr(col.key)}" ${hidden.has(col.key) ? "" : "checked"}><span>${escapeHtml(col.label)}</span>${col.custom ? `<button type="button" class="remove-column" data-remove-column="${escapeAttr(col.id)}" aria-label="Remove ${escapeAttr(col.label)}">×</button>` : ""}</label>`).join("");
  }
  function addCustomColumn(label) {
    const trimmed = label.trim(); if (!trimmed) return;
    if ((local.customColumns || []).some(c => c.label.toLowerCase() === trimmed.toLowerCase())) return;
    local.customColumns.push({ id: uid(), label: trimmed }); saveLocal(); renderColumns(); render();
  }
  function removeCustomColumn(id) {
    const key = `custom:${id}`; local.customColumns = local.customColumns.filter(c => c.id !== id); local.hiddenColumns = local.hiddenColumns.filter(k => k !== key);
    local.added.forEach(e => { if (e.custom) delete e.custom[id]; }); Object.values(local.overrides).forEach(e => { if (e.custom) delete e.custom[id]; });
    saveLocal(); renderColumns(); render();
  }
  function download(name, text, type) {
    const blob = new Blob([text], { type }), url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  function snapshot() {
    return { exportedAt: new Date().toISOString(), app: "agentic-ai-glossary", version: 1,
      entries: allEntries().map(({ localOnly, ...e }) => e), customColumns: local.customColumns || [], hiddenColumns: local.hiddenColumns || [] };
  }
  function exportJson() { download("agentic-ai-wiki.json", JSON.stringify(snapshot(), null, 2), "application/json"); }
  function csvEscape(value) { const s = String(value ?? ""); return `"${s.replaceAll('"', '""')}"`; }
  function exportCsv() {
    const cols = allColumns(), rows = [cols.map(c => csvEscape(c.label)).join(",")];
    allEntries().forEach(e => rows.push(cols.map(c => csvEscape(valueFor(e, c.key))).join(",")));
    download("agentic-ai-wiki.csv", rows.join("\n"), "text/csv;charset=utf-8");
  }
  function exportMarkdown() {
    const byGroup = new Map(); allEntries().sort((a, b) => localeSort(a.term, b.term)).forEach(e => { if (!byGroup.has(e.group)) byGroup.set(e.group, []); byGroup.get(e.group).push(e); });
    let md = "# Agentic AI Wiki\n\n";
    for (const [group, items] of [...byGroup.entries()].sort((a,b) => localeSort(a[0], b[0]))) {
      md += `## ${group}\n\n`;
      for (const e of items) {
        md += `### ${e.term}\n\n${e.definition}\n\n`; if (e.plain) md += `**Plain English:** ${e.plain}\n\n`; if (e.example) md += `**Example:** ${e.example}\n\n`;
        if (e.aliases.length) md += `**Aliases:** ${e.aliases.join(", ")}\n\n`; if (e.related.length) md += `**Related:** ${e.related.join(", ")}\n\n`;
        if (e.notes) md += `**My note:** ${e.notes}\n\n`; if (e.source) md += `**Source:** ${e.source}\n\n`;
      }
    }
    download("agentic-ai-wiki.md", md, "text/markdown;charset=utf-8");
  }
  async function importJson(file) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()); if (!Array.isArray(parsed.entries)) throw new Error("Missing entries array.");
      const imported = parsed.entries.map((e, i) => normalize({ ...e, id: e.id || uid(), localOnly: true }, i));
      local = defaultLocal(); local.added = imported; local.customColumns = Array.isArray(parsed.customColumns) ? parsed.customColumns : [];
      local.hiddenColumns = Array.isArray(parsed.hiddenColumns) ? parsed.hiddenColumns : local.hiddenColumns; saveLocal(); els.dataDialog.close(); render();
    } catch (error) { alert(`Import failed: ${error.message}`); }
    finally { $("#importInput").value = ""; }
  }
  function resetLocal() {
    if (!confirm("Remove all local edits, notes, added entries and custom columns? The base glossary will remain.")) return;
    localStorage.removeItem(STORAGE_KEY); local = defaultLocal(); els.dataDialog.close(); render();
  }
  function localeSort(a, b) { return String(a).localeCompare(String(b), undefined, { sensitivity: "base" }); }
  function escapeHtml(value) { return String(value).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]); }
  function escapeAttr(value) { return escapeHtml(value).replace(/`/g, "&#96;"); }

  async function init() {
    try {
      const response = await fetch("glossary.json", { cache: "no-store" }); if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json(); baseEntries = (payload.entries || []).map((e, i) => normalize({ ...e, id: `base-${i}-${slug(e.term)}` }, i));
    } catch (error) {
      document.body.innerHTML = `<main class="empty-state"><strong>Could not load glossary data.</strong><p>${escapeHtml(error.message)}</p></main>`; return;
    }
    document.addEventListener("click", event => {
      const closeButton = event.target.closest("[data-close]"); if (closeButton) { document.getElementById(closeButton.dataset.close)?.close(); return; }
      const row = event.target.closest("tr[data-id]"); if (row && !event.target.closest("[data-no-open]")) openEntry(row.dataset.id);
      const card = event.target.closest(".card[data-id]"); if (card) openEntry(card.dataset.id);
      const sortButton = event.target.closest("[data-sort]"); if (sortButton) { const key = sortButton.dataset.sort; sort = sort.key === key ? { key, dir: sort.dir * -1 } : { key, dir: 1 }; render(); }
      const remove = event.target.closest("[data-remove-column]"); if (remove) removeCustomColumn(remove.dataset.removeColumn);
    });
    document.addEventListener("keydown", event => {
      const active = document.activeElement, editing = active && /INPUT|TEXTAREA|SELECT/.test(active.tagName);
      if (event.key === "/" && !editing && !document.querySelector("dialog[open]")) { event.preventDefault(); els.search.focus(); }
      const card = event.target.closest?.(".card[data-id]"); if (card && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); openEntry(card.dataset.id); }
    });
    [els.search, els.group, els.kind, els.review].forEach(el => el.addEventListener(el === els.search ? "input" : "change", render));
    $("#addEntryBtn").addEventListener("click", () => openEntry());
    $("#columnsBtn").addEventListener("click", () => { renderColumns(); els.columnsDialog.showModal(); });
    $("#dataBtn").addEventListener("click", () => els.dataDialog.showModal());
    $("#clearFiltersBtn").addEventListener("click", () => { els.search.value = ""; els.group.value = ""; els.kind.value = ""; els.review.value = ""; render(); });
    els.entryForm.addEventListener("submit", event => { if (event.submitter?.value !== "save") return; event.preventDefault(); if (!els.entryForm.reportValidity()) return; saveEntryFromForm(); els.entryDialog.close(); render(); });
    els.deleteEntry.addEventListener("click", deleteCurrentEntry);
    els.columnChecklist.addEventListener("change", event => {
      const checkbox = event.target.closest("[data-column-key]"); if (!checkbox) return;
      const key = checkbox.dataset.columnKey, hidden = new Set(local.hiddenColumns || []); checkbox.checked ? hidden.delete(key) : hidden.add(key);
      local.hiddenColumns = [...hidden]; saveLocal(); render();
    });
    $("#customColumnForm").addEventListener("submit", event => { event.preventDefault(); const input = $("#customColumnName"); addCustomColumn(input.value); input.value = ""; });
    $("#exportJsonBtn").addEventListener("click", exportJson); $("#exportCsvBtn").addEventListener("click", exportCsv); $("#exportMdBtn").addEventListener("click", exportMarkdown);
    $("#importInput").addEventListener("change", event => importJson(event.target.files?.[0])); $("#resetBtn").addEventListener("click", resetLocal);
    render();
  }
  init();
})();
