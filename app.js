(() => {
  "use strict";

  const STORAGE_KEY = "agentic-ai-glossary.local.v1";
  const BASE_COLUMNS = [
    { key: "term", label: "Term", default: true },
    { key: "group", label: "Group", default: true },
    { key: "kind", label: "Kind", default: false },
    { key: "definition", label: "Definition", default: true },
    { key: "plain", label: "Plain English", default: false },
    { key: "memoryHook", label: "Memory hook", default: false },
    { key: "confusedWith", label: "Confused with", default: false },
    { key: "example", label: "Example", default: false },
    { key: "aliases", label: "Aliases", default: false },
    { key: "related", label: "Related", default: false },
    { key: "source", label: "Source", default: false },
    { key: "notes", label: "My note", default: true },
    { key: "learning", label: "Learning", default: true },
    { key: "review", label: "Review", default: false }
  ];

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const els = {
    search: $("#searchInput"), group: $("#groupFilter"), kind: $("#kindFilter"), review: $("#reviewFilter"),
    head: $("#tableHead"), body: $("#tableBody"), cards: $("#cardList"), empty: $("#emptyState"),
    resultCount: $("#resultCount"), totalCount: $("#totalCount"), reviewCount: $("#reviewCount"), dueCount: $("#dueCount"),
    focusNowTerm: $("#focusNowTerm"), focusNowHint: $("#focusNowHint"), focusNowBtn: $("#focusNowBtn"),
    parkingInput: $("#parkingInput"), parkingCount: $("#parkingCount"), parkingList: $("#parkingList"),
    focusDialog: $("#focusDialog"), focusTerm: $("#focusTerm"), focusMeta: $("#focusMeta"), focusPlain: $("#focusPlain"),
    recallInput: $("#recallInput"), focusAnswer: $("#focusAnswer"), focusDefinition: $("#focusDefinition"),
    focusExample: $("#focusExample"), focusExampleWrap: $("#focusExampleWrap"), memoryHookInput: $("#memoryHookInput"),
    confusedWrap: $("#confusedWrap"), confusedLinks: $("#confusedLinks"), relatedWrap: $("#relatedWrap"), relatedLinks: $("#relatedLinks"),
    backlinksWrap: $("#backlinksWrap"), backlinks: $("#backlinks"), focusSchedule: $("#focusSchedule"),
    parkingDialog: $("#parkingDialog"), entryDialog: $("#entryDialog"), entryForm: $("#entryForm"), entryTitle: $("#entryDialogTitle"),
    deleteEntry: $("#deleteEntryBtn"), columnsDialog: $("#columnsDialog"), columnChecklist: $("#columnChecklist"),
    dataDialog: $("#dataDialog"), customFieldsEditor: $("#customFieldsEditor")
  };

  let baseEntries = [];
  let local = loadLocal();
  let sort = { key: "term", dir: 1 };
  let currentFocusId = "";

  function defaultLocal() {
    return {
      overrides: {}, added: [], deletedBase: [], customColumns: [],
      hiddenColumns: BASE_COLUMNS.filter(c => !c.default).map(c => c.key),
      learning: {}, parking: [], lastFocusId: "", schemaVersion: 2
    };
  }

  function loadLocal() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      const merged = { ...defaultLocal(), ...parsed };
      merged.overrides ||= {}; merged.added ||= []; merged.deletedBase ||= []; merged.customColumns ||= [];
      merged.hiddenColumns ||= []; merged.learning ||= {}; merged.parking ||= []; merged.lastFocusId ||= "";
      if (parsed.schemaVersion !== 2) {
        merged.hiddenColumns = [...new Set([...merged.hiddenColumns, "memoryHook", "confusedWith"])];
      }
      merged.schemaVersion = 2;
      return merged;
    } catch {
      return defaultLocal();
    }
  }

  function saveLocal() { localStorage.setItem(STORAGE_KEY, JSON.stringify(local)); }
  function uid() { return "local-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8); }
  function slug(value) { return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60); }
  function splitList(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(String).map(v => v.trim()).filter(Boolean);
    return String(value).split(",").map(v => v.trim()).filter(Boolean);
  }
  function localeSort(a, b) { return String(a).localeCompare(String(b), undefined, { sensitivity: "base", numeric: true }); }
  function calendarKey(date = new Date()) {
    const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, "0"), d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  function addDays(days) { const d = new Date(); d.setDate(d.getDate() + days); return calendarKey(d); }
  function formatDay(key) {
    if (!key) return "";
    const [y, m, d] = key.split("-").map(Number);
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(y, m - 1, d));
  }

  function normalize(entry, index = 0) {
    return {
      id: entry.id || `base-${index}-${slug(entry.term || "entry")}`,
      term: entry.term || "", group: entry.group || "Ungrouped", kind: entry.kind || "Term",
      definition: entry.definition || "", plain: entry.plain ?? entry.plainEnglish ?? "", example: entry.example || "",
      memoryHook: entry.memoryHook || "", confusedWith: splitList(entry.confusedWith),
      aliases: splitList(entry.aliases), related: splitList(entry.related), source: entry.source || "", notes: entry.notes || "",
      review: Boolean(entry.review), custom: entry.custom && typeof entry.custom === "object" ? entry.custom : {},
      localOnly: Boolean(entry.localOnly)
    };
  }

  function allEntries() {
    const deleted = new Set(local.deletedBase || []);
    const mergedBase = baseEntries.filter(e => !deleted.has(e.id)).map(e => normalize({ ...e, ...(local.overrides[e.id] || {}) }));
    const added = (local.added || []).map((e, i) => normalize({ ...e, localOnly: true }, i));
    return [...mergedBase, ...added];
  }

  function entryById(id) { return allEntries().find(e => e.id === id); }
  function resolveByTerm(term) {
    const needle = String(term || "").trim().toLowerCase();
    if (!needle) return null;
    return allEntries().find(e => e.term.toLowerCase() === needle || e.aliases.some(a => a.toLowerCase() === needle)) || null;
  }

  function learningFor(id) {
    return { status: "new", due: "", lastReviewed: "", reviewCount: 0, recall: "", lastOpened: "", ...(local.learning[id] || {}) };
  }
  function learningLabel(status) {
    return ({ new: "Not reviewed", learning: "Learning", familiar: "Familiar", mastered: "Solid" })[status] || "Not reviewed";
  }
  function isDue(entry) {
    const learning = learningFor(entry.id);
    return Boolean(entry.review || (learning.due && learning.due <= calendarKey()));
  }
  function dueEntries() {
    return allEntries().filter(isDue).sort((a, b) => {
      const ad = learningFor(a.id).due || "0000-00-00", bd = learningFor(b.id).due || "0000-00-00";
      return ad.localeCompare(bd) || localeSort(a.term, b.term);
    });
  }

  function patchEntry(id, patch) {
    const addedIndex = local.added.findIndex(e => e.id === id);
    if (addedIndex >= 0) local.added[addedIndex] = { ...local.added[addedIndex], ...patch, id };
    else local.overrides[id] = { ...(local.overrides[id] || {}), ...patch, id };
    saveLocal();
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
    if (key === "learning") return learningLabel(learningFor(entry.id).status);
    if (key === "review") return isDue(entry) ? "Due / fuzzy" : "";
    const value = entry[key];
    if (Array.isArray(value)) return value.join(", ");
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
    const q = els.search.value.trim().toLowerCase(), group = els.group.value, kind = els.kind.value, learningFilter = els.review.value;
    const entries = allEntries().filter(entry => {
      const learning = learningFor(entry.id);
      if (group && entry.group !== group) return false;
      if (kind && entry.kind !== kind) return false;
      if (learningFilter === "due" && !isDue(entry)) return false;
      if (["new", "learning", "familiar", "mastered"].includes(learningFilter) && learning.status !== learningFilter) return false;
      if (!q) return true;
      const haystack = [entry.term, entry.group, entry.kind, entry.definition, entry.plain, entry.example, entry.memoryHook,
        entry.confusedWith.join(" "), entry.aliases.join(" "), entry.related.join(" "), entry.source, entry.notes,
        learning.recall, ...Object.values(entry.custom || {})].join(" ").toLowerCase();
      return haystack.includes(q);
    });
    entries.sort((a, b) => String(valueFor(a, sort.key)).toLowerCase().localeCompare(String(valueFor(b, sort.key)).toLowerCase(), undefined, { numeric: true }) * sort.dir);
    return entries;
  }

  function render() {
    refreshFilters();
    const entries = filteredEntries();
    renderTable(entries); renderCards(entries); renderFocusSummary(); renderParkingSummary();
    const all = allEntries(), due = dueEntries();
    els.resultCount.textContent = entries.length; els.totalCount.textContent = all.length;
    els.reviewCount.textContent = due.length; els.dueCount.textContent = due.length;
    els.empty.hidden = entries.length > 0;
    $("#reviewBtn").disabled = due.length === 0;
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
      html = `${isDue(entry) ? '<span class="review-dot" title="Due / fuzzy"></span>' : ""}${html}${entry.localOnly ? ' <span class="tag">local</span>' : ""}`;
    } else if (col.key === "definition") cls = "definition-cell";
    else if (col.key === "group" || col.key === "kind") html = raw ? `<span class="tag">${escapeHtml(String(raw))}</span>` : "";
    else if (col.key === "learning") {
      const state = learningFor(entry.id).status;
      html = `<span class="learning-badge" data-state="${escapeAttr(state)}">${escapeHtml(learningLabel(state))}</span>`;
    } else if (col.key === "source" && /^https?:\/\//i.test(raw)) {
      html = `<a href="${escapeAttr(raw)}" target="_blank" rel="noopener" data-no-open="true">link</a>`;
    }
    return `<td class="${cls}">${html}</td>`;
  }

  function renderCards(entries) {
    els.cards.innerHTML = entries.map(entry => {
      const state = learningFor(entry.id).status;
      return `<article class="card" data-id="${escapeAttr(entry.id)}" tabindex="0">
        <div class="card-head"><h3>${isDue(entry) ? '<span class="review-dot" title="Due / fuzzy"></span>' : ""}${escapeHtml(entry.term)}</h3><span class="learning-badge" data-state="${escapeAttr(state)}">${escapeHtml(learningLabel(state))}</span></div>
        <p>${escapeHtml(entry.definition)}</p>${entry.plain ? `<p class="plain">${escapeHtml(entry.plain)}</p>` : ""}
        <div class="card-meta"><span class="tag">${escapeHtml(entry.group)}</span><span class="tag">${escapeHtml(entry.kind)}</span>${entry.memoryHook ? '<span class="tag">memory hook</span>' : ""}${entry.localOnly ? '<span class="tag">local</span>' : ""}</div>
      </article>`;
    }).join("");
  }

  function renderFocusSummary() {
    const active = entryById(local.lastFocusId);
    if (active) {
      const state = learningFor(active.id).status;
      els.focusNowTerm.textContent = active.term;
      els.focusNowHint.textContent = `${learningLabel(state)} · resume before starting another topic.`;
      els.focusNowBtn.textContent = "Resume";
      $("#resumeFocusBtn").textContent = "Resume focus";
    } else {
      els.focusNowTerm.textContent = "No active concept";
      els.focusNowHint.textContent = "Pick one concept and stay with it until you can explain it simply.";
      els.focusNowBtn.textContent = "Choose concept";
      $("#resumeFocusBtn").textContent = "Focus";
    }
  }

  function renderParkingSummary() {
    const count = local.parking.length;
    els.parkingCount.textContent = `${count} parked`;
  }

  function chooseOrResumeFocus() {
    const active = entryById(local.lastFocusId);
    if (active) return openFocus(active.id);
    const due = dueEntries()[0];
    if (due) return openFocus(due.id);
    els.search.scrollIntoView({ behavior: "smooth", block: "center" });
    els.search.focus();
  }

  function openFocus(id, reveal = false, updateHash = true) {
    const entry = entryById(id);
    if (!entry) return;
    currentFocusId = entry.id;
    local.lastFocusId = entry.id;
    local.learning[entry.id] = { ...learningFor(entry.id), lastOpened: new Date().toISOString() };
    saveLocal();

    const learning = learningFor(entry.id);
    els.focusTerm.textContent = entry.term;
    els.focusMeta.innerHTML = `<span class="tag">${escapeHtml(entry.group)}</span><span class="tag">${escapeHtml(entry.kind)}</span><span class="learning-badge" data-state="${escapeAttr(learning.status)}">${escapeHtml(learningLabel(learning.status))}</span>`;
    els.focusPlain.textContent = entry.plain || "Try to explain the concept from memory before revealing the definition.";
    els.recallInput.value = learning.recall || "";
    els.focusDefinition.textContent = entry.definition;
    els.focusExample.textContent = entry.example || "";
    els.focusExampleWrap.hidden = !entry.example;
    els.memoryHookInput.value = entry.memoryHook || "";
    els.focusAnswer.hidden = !reveal;
    $("#revealBtn").hidden = reveal;
    renderRelationChips(entry);
    renderFocusSchedule(entry);

    if (updateHash) history.replaceState(null, "", `#term=${encodeURIComponent(entry.term)}`);
    if (!els.focusDialog.open) els.focusDialog.showModal();
    renderFocusSummary();
  }

  function renderRelationChips(entry) {
    const confused = entry.confusedWith.map(resolveByTerm).filter(Boolean);
    const related = entry.related.map(resolveByTerm).filter(Boolean);
    const target = entry.term.toLowerCase();
    const backlinks = allEntries().filter(other => other.id !== entry.id && [...other.related, ...other.confusedWith].some(v => v.toLowerCase() === target));
    els.confusedLinks.innerHTML = chips(confused); els.confusedWrap.hidden = confused.length === 0;
    els.relatedLinks.innerHTML = chips(related); els.relatedWrap.hidden = related.length === 0;
    els.backlinks.innerHTML = chips(backlinks.slice(0, 8)); els.backlinksWrap.hidden = backlinks.length === 0;
  }

  function chips(entries) {
    const seen = new Set();
    return entries.filter(entry => !seen.has(entry.id) && seen.add(entry.id)).map(entry => `<button type="button" data-focus-id="${escapeAttr(entry.id)}">${escapeHtml(entry.term)}</button>`).join("");
  }

  function revealFocus() {
    if (!currentFocusId) return;
    saveRecall();
    els.focusAnswer.hidden = false;
    $("#revealBtn").hidden = true;
    els.memoryHookInput.focus();
  }

  function saveRecall() {
    if (!currentFocusId) return;
    local.learning[currentFocusId] = { ...learningFor(currentFocusId), recall: els.recallInput.value.trim() };
    saveLocal();
  }

  function saveMemoryHook() {
    if (!currentFocusId) return;
    patchEntry(currentFocusId, { memoryHook: els.memoryHookInput.value.trim() });
  }

  function markLearning(status) {
    const entry = entryById(currentFocusId);
    if (!entry) return;
    saveRecall(); saveMemoryHook();
    const days = status === "learning" ? 1 : status === "familiar" ? 7 : 30;
    local.learning[entry.id] = {
      ...learningFor(entry.id), status, due: addDays(days), lastReviewed: calendarKey(),
      reviewCount: (learningFor(entry.id).reviewCount || 0) + 1, recall: els.recallInput.value.trim()
    };
    patchEntry(entry.id, { review: false, memoryHook: els.memoryHookInput.value.trim() });
    saveLocal();
    renderFocusSchedule(entryById(entry.id));
    render();
    if (status === "learning") {
      els.focusSchedule.textContent = `Review ${formatDay(addDays(1))}. Keep this as your current concept if it is not clear yet.`;
      return;
    }
    local.lastFocusId = ""; saveLocal(); currentFocusId = "";
    els.focusDialog.close();
    history.replaceState(null, "", location.pathname + location.search);
    render();
  }

  function renderFocusSchedule(entry) {
    const learning = learningFor(entry.id);
    if (learning.due) els.focusSchedule.textContent = `Next review ${formatDay(learning.due)}.`;
    else els.focusSchedule.textContent = "No review scheduled yet.";
  }

  function openEntry(id = "") {
    const entry = id ? entryById(id) : null;
    els.entryForm.reset();
    $("#entryId").value = entry?.id || "";
    els.entryTitle.textContent = entry ? "Edit entry" : "Add entry";
    $("#termField").value = entry?.term || ""; $("#groupField").value = entry?.group || ""; $("#kindField").value = entry?.kind || "Term";
    $("#definitionField").value = entry?.definition || ""; $("#plainField").value = entry?.plain || ""; $("#exampleField").value = entry?.example || "";
    $("#memoryHookField").value = entry?.memoryHook || ""; $("#confusedField").value = entry?.confusedWith.join(", ") || "";
    $("#aliasesField").value = entry?.aliases.join(", ") || ""; $("#relatedField").value = entry?.related.join(", ") || "";
    $("#sourceField").value = entry?.source || ""; $("#notesField").value = entry?.notes || ""; $("#reviewField").checked = Boolean(entry?.review);
    els.deleteEntry.hidden = !entry; els.deleteEntry.textContent = entry?.localOnly ? "Delete entry" : "Hide base entry";
    renderCustomFieldEditor(entry);
    if (els.focusDialog.open) els.focusDialog.close();
    els.entryDialog.showModal();
  }

  function renderCustomFieldEditor(entry) {
    els.customFieldsEditor.innerHTML = (local.customColumns || []).map(c => `<label>${escapeHtml(c.label)}<input data-custom-field="${escapeAttr(c.id)}" value="${escapeAttr(entry?.custom?.[c.id] || "")}" maxlength="500"></label>`).join("");
  }

  function saveEntryFromForm() {
    const id = $("#entryId").value, custom = {};
    $$('[data-custom-field]').forEach(input => custom[input.dataset.customField] = input.value.trim());
    const payload = normalize({
      id: id || uid(), term: $("#termField").value.trim(), group: $("#groupField").value.trim() || "Ungrouped",
      kind: $("#kindField").value.trim() || "Term", definition: $("#definitionField").value.trim(), plain: $("#plainField").value.trim(),
      example: $("#exampleField").value.trim(), memoryHook: $("#memoryHookField").value.trim(), confusedWith: splitList($("#confusedField").value),
      aliases: splitList($("#aliasesField").value), related: splitList($("#relatedField").value), source: $("#sourceField").value.trim(),
      notes: $("#notesField").value.trim(), review: $("#reviewField").checked, custom
    });
    if (!payload.term || !payload.definition) return false;
    const localIndex = local.added.findIndex(e => e.id === id);
    if (localIndex >= 0) local.added[localIndex] = { ...payload, localOnly: true };
    else if (id) local.overrides[id] = payload;
    else local.added.push({ ...payload, localOnly: true });
    saveLocal(); return true;
  }

  function deleteCurrentEntry() {
    const id = $("#entryId").value; if (!id) return;
    const index = local.added.findIndex(e => e.id === id);
    if (index >= 0) local.added.splice(index, 1);
    else { if (!local.deletedBase.includes(id)) local.deletedBase.push(id); delete local.overrides[id]; }
    delete local.learning[id];
    if (local.lastFocusId === id) local.lastFocusId = "";
    saveLocal(); els.entryDialog.close(); render();
  }

  function park(text) {
    const trimmed = text.trim(); if (!trimmed) return;
    local.parking.unshift({ id: uid(), text: trimmed, createdAt: new Date().toISOString() });
    saveLocal(); els.parkingInput.value = ""; renderParkingSummary();
  }

  function renderParkingList() {
    if (!local.parking.length) {
      els.parkingList.innerHTML = `<div class="empty-state"><strong>Parking lot is empty.</strong><p>Good. There is nothing pulling you away from the current concept.</p></div>`;
      return;
    }
    els.parkingList.innerHTML = local.parking.map(item => `<div class="parking-item" data-parking-id="${escapeAttr(item.id)}">
      <div><p>${escapeHtml(item.text)}</p><small>${escapeHtml(new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(item.createdAt)))}</small></div>
      <div class="parking-item-actions"><button type="button" data-convert-parking="${escapeAttr(item.id)}">Make entry</button><button type="button" data-remove-parking="${escapeAttr(item.id)}" aria-label="Remove">×</button></div>
    </div>`).join("");
  }

  function convertParking(id) {
    const item = local.parking.find(p => p.id === id); if (!item) return;
    const entryId = uid();
    local.added.push(normalize({ id: entryId, term: item.text, group: "Inbox", kind: "Inbox", definition: "Captured for later. Replace this with a clear definition when you intentionally return to it.", review: true, localOnly: true }));
    local.parking = local.parking.filter(p => p.id !== id); saveLocal(); render(); renderParkingList();
    els.parkingDialog.close(); openEntry(entryId);
  }

  function removeParking(id) {
    local.parking = local.parking.filter(p => p.id !== id); saveLocal(); renderParkingSummary(); renderParkingList();
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
    const key = `custom:${id}`;
    local.customColumns = local.customColumns.filter(c => c.id !== id); local.hiddenColumns = local.hiddenColumns.filter(k => k !== key);
    local.added.forEach(e => { if (e.custom) delete e.custom[id]; }); Object.values(local.overrides).forEach(e => { if (e.custom) delete e.custom[id]; });
    saveLocal(); renderColumns(); render();
  }

  function download(name, text, type) {
    const blob = new Blob([text], { type }), url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function snapshot() {
    return {
      exportedAt: new Date().toISOString(), app: "agentic-ai-glossary", version: 2,
      entries: allEntries().map(({ localOnly, ...e }) => e),
      localState: local
    };
  }
  function exportJson() { download("agentic-ai-wiki.json", JSON.stringify(snapshot(), null, 2), "application/json"); }
  function csvEscape(value) { const s = String(value ?? ""); return `"${s.replaceAll('"', '""')}"`; }
  function exportCsv() {
    const cols = allColumns(), rows = [cols.map(c => csvEscape(c.label)).join(",")];
    allEntries().forEach(e => rows.push(cols.map(c => csvEscape(valueFor(e, c.key))).join(",")));
    download("agentic-ai-wiki.csv", rows.join("\n"), "text/csv;charset=utf-8");
  }
  function exportMarkdown() {
    const byGroup = new Map();
    allEntries().sort((a, b) => localeSort(a.term, b.term)).forEach(e => { if (!byGroup.has(e.group)) byGroup.set(e.group, []); byGroup.get(e.group).push(e); });
    let md = "# Agentic AI Wiki\n\n";
    for (const [group, items] of [...byGroup.entries()].sort((a, b) => localeSort(a[0], b[0]))) {
      md += `## ${group}\n\n`;
      for (const e of items) {
        md += `### ${e.term}\n\n${e.definition}\n\n`;
        if (e.plain) md += `**Plain English:** ${e.plain}\n\n`;
        if (e.memoryHook) md += `**Memory hook:** ${e.memoryHook}\n\n`;
        if (e.example) md += `**Example:** ${e.example}\n\n`;
        if (e.confusedWith.length) md += `**Often confused with:** ${e.confusedWith.join(", ")}\n\n`;
        if (e.related.length) md += `**Related:** ${e.related.join(", ")}\n\n`;
        if (e.notes) md += `**My note:** ${e.notes}\n\n`;
      }
    }
    download("agentic-ai-wiki.md", md, "text/markdown;charset=utf-8");
  }

  async function importJson(file) {
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed.localState && typeof parsed.localState === "object") {
        local = { ...defaultLocal(), ...parsed.localState };
      } else if (Array.isArray(parsed.entries)) {
        local = defaultLocal();
        local.deletedBase = baseEntries.map(e => e.id);
        local.added = parsed.entries.map((e, i) => ({ ...normalize(e, i), id: e.id || uid(), localOnly: true }));
        local.customColumns = Array.isArray(parsed.customColumns) ? parsed.customColumns : [];
        local.hiddenColumns = Array.isArray(parsed.hiddenColumns) ? parsed.hiddenColumns : local.hiddenColumns;
      } else throw new Error("Unsupported file");
      saveLocal(); render();
    } catch (error) {
      alert(`Could not import this JSON file: ${error.message}`);
    }
  }

  function resetLocal() {
    if (!confirm("Reset all local edits, learning state, memory hooks and parking-lot items on this device?")) return;
    localStorage.removeItem(STORAGE_KEY); local = defaultLocal(); currentFocusId = ""; render();
  }

  function openDeepLink() {
    const match = location.hash.match(/^#term=(.+)$/);
    if (!match) return false;
    const entry = resolveByTerm(decodeURIComponent(match[1]));
    if (!entry) return false;
    openFocus(entry.id, false, false); return true;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);
  }
  function escapeAttr(value) { return escapeHtml(value); }

  function bindEvents() {
    [els.search, els.group, els.kind, els.review].forEach(el => el.addEventListener(el === els.search ? "input" : "change", render));
    $("#clearFiltersBtn").addEventListener("click", () => { els.search.value = ""; els.group.value = ""; els.kind.value = ""; els.review.value = ""; render(); });
    $("#addEntryBtn").addEventListener("click", () => openEntry());
    $("#columnsBtn").addEventListener("click", () => { renderColumns(); els.columnsDialog.showModal(); });
    $("#dataBtn").addEventListener("click", () => els.dataDialog.showModal());
    $("#resumeFocusBtn").addEventListener("click", chooseOrResumeFocus);
    els.focusNowBtn.addEventListener("click", chooseOrResumeFocus);
    $("#reviewBtn").addEventListener("click", () => { const entry = dueEntries()[0]; if (entry) openFocus(entry.id); });

    $("#parkingForm").addEventListener("submit", event => { event.preventDefault(); park(els.parkingInput.value); });
    $("#openParkingBtn").addEventListener("click", () => { renderParkingList(); els.parkingDialog.showModal(); });
    els.parkingList.addEventListener("click", event => {
      const convert = event.target.closest("[data-convert-parking]"), remove = event.target.closest("[data-remove-parking]");
      if (convert) convertParking(convert.dataset.convertParking);
      if (remove) removeParking(remove.dataset.removeParking);
    });

    els.head.addEventListener("click", event => {
      const btn = event.target.closest("[data-sort]"); if (!btn) return;
      if (sort.key === btn.dataset.sort) sort.dir *= -1; else sort = { key: btn.dataset.sort, dir: 1 };
      render();
    });
    [els.body, els.cards].forEach(container => {
      container.addEventListener("click", event => {
        if (event.target.closest("[data-no-open]")) return;
        const item = event.target.closest("[data-id]"); if (item) openFocus(item.dataset.id);
      });
      container.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== " ") return;
        const item = event.target.closest("[data-id]"); if (item) { event.preventDefault(); openFocus(item.dataset.id); }
      });
    });

    $("#revealBtn").addEventListener("click", revealFocus);
    els.recallInput.addEventListener("change", saveRecall);
    els.memoryHookInput.addEventListener("change", saveMemoryHook);
    $("#fuzzyBtn").addEventListener("click", () => markLearning("learning"));
    $("#gotItBtn").addEventListener("click", () => markLearning("familiar"));
    $("#solidBtn").addEventListener("click", () => markLearning("mastered"));
    $("#editFromFocusBtn").addEventListener("click", () => currentFocusId && openEntry(currentFocusId));
    [els.confusedLinks, els.relatedLinks, els.backlinks].forEach(container => container.addEventListener("click", event => {
      const btn = event.target.closest("[data-focus-id]"); if (btn) openFocus(btn.dataset.focusId, false);
    }));

    els.entryForm.addEventListener("submit", event => {
      event.preventDefault();
      if (saveEntryFromForm()) { els.entryDialog.close(); render(); }
    });
    els.deleteEntry.addEventListener("click", deleteCurrentEntry);

    $("#customColumnForm").addEventListener("submit", event => {
      event.preventDefault(); addCustomColumn($("#customColumnName").value); $("#customColumnName").value = "";
    });
    els.columnChecklist.addEventListener("change", event => {
      const checkbox = event.target.closest("[data-column-key]"); if (!checkbox) return;
      const key = checkbox.dataset.columnKey;
      local.hiddenColumns = checkbox.checked ? local.hiddenColumns.filter(k => k !== key) : [...new Set([...local.hiddenColumns, key])];
      saveLocal(); render();
    });
    els.columnChecklist.addEventListener("click", event => {
      const remove = event.target.closest("[data-remove-column]"); if (remove) { event.preventDefault(); removeCustomColumn(remove.dataset.removeColumn); }
    });

    $("#exportJsonBtn").addEventListener("click", exportJson); $("#exportCsvBtn").addEventListener("click", exportCsv); $("#exportMdBtn").addEventListener("click", exportMarkdown);
    $("#importInput").addEventListener("change", event => { const file = event.target.files?.[0]; if (file) importJson(file); event.target.value = ""; });
    $("#resetBtn").addEventListener("click", resetLocal);

    $$('[data-close]').forEach(btn => btn.addEventListener("click", () => $("#" + btn.dataset.close)?.close()));
    els.focusDialog.addEventListener("close", () => { saveRecall(); saveMemoryHook(); currentFocusId = ""; render(); });

    document.addEventListener("keydown", event => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const editable = event.target.matches("input, textarea, select, [contenteditable='true']");
      if (editable) return;
      if (event.key === "/") { event.preventDefault(); els.search.focus(); }
      if (event.key.toLowerCase() === "f") { event.preventDefault(); chooseOrResumeFocus(); }
      if (event.key.toLowerCase() === "p") { event.preventDefault(); els.parkingInput.focus(); }
    });

    window.addEventListener("hashchange", openDeepLink);
  }

  async function init() {
    bindEvents();
    try {
      const response = await fetch("glossary.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      baseEntries = (payload.entries || []).map((e, i) => normalize({ ...e, id: e.id || `base-${i}-${slug(e.term)}` }, i));
      render();
      openDeepLink();
    } catch (error) {
      els.empty.hidden = false;
      els.empty.innerHTML = `<strong>Could not load glossary data.</strong><p>${escapeHtml(error.message)}</p>`;
    }
  }

  init();
})();
