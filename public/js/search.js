export function normalize(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function searchableNames(servant) {
  const names = [servant.name, servant.originalName, ...(servant.aliases || [])].map(normalize);
  // The NA localization uses Altria; accept the familiar Artoria spelling too.
  return [...names, ...names.filter(n => n.includes("altria")).map(n => n.replaceAll("altria", "artoria"))];
}

export function findMatches(servants, query) {
  const needle = normalize(query);
  const score = s => searchableNames(s).some(n => n.startsWith(needle)) ? 0 : 1;
  return servants.filter(s => !needle || searchableNames(s).some(n => n.includes(needle)))
    .sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name) || a.collectionNo - b.collectionNo);
}

export function setupAutocomplete({ input, list, container, announcement, getMatches, onSelect }) {
  let matches = [];
  let active = -1;
  function close() {
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    active = -1;
  }
  function highlight(index) {
    active = index;
    [...list.querySelectorAll('[role="option"]')].forEach((el, i) => el.setAttribute("aria-selected", String(i === active)));
    if (active >= 0) {
      const option = list.querySelectorAll('[role="option"]')[active];
      input.setAttribute("aria-activedescendant", option.id);
      option.scrollIntoView({ block: "nearest" });
    } else input.removeAttribute("aria-activedescendant");
  }
  function refresh() {
    if (!input.value.trim()) { close(); return; }
    const all = getMatches(input.value);
    matches = all.slice(0, 8);
    list.replaceChildren(); active = -1;
    input.removeAttribute("aria-activedescendant");
    matches.forEach((servant, index) => {
      const option = document.createElement("li");
      option.className = "suggestion";
      option.id = `suggestion-${index}`;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");
      if (servant.face) {
        const img = document.createElement("img"); img.src = servant.face; img.alt = "";
        img.addEventListener("error", () => { img.hidden = true; }, { once:true });
        option.append(img);
      }
      const text = document.createElement("div");
      const name = document.createElement("strong"); name.textContent = servant.name;
      const info = document.createElement("small"); info.textContent = `${servant.className} · ${servant.rarity}★ · No. ${servant.collectionNo}`;
      text.append(name, info); option.append(text);
      option.addEventListener("pointerdown", e => e.preventDefault());
      option.addEventListener("click", () => { close(); input.value = servant.name; onSelect(servant); });
      list.append(option);
    });
    if (!matches.length || all.length > 8) {
      const item = document.createElement("li"); item.className = "empty-option"; item.setAttribute("role", "presentation");
      item.textContent = matches.length ? `${all.length} matches. Press Search to see all.` : "No matching characters found.";
      list.append(item);
    }
    announcement.textContent = `${all.length} matching characters. ${matches.length} suggestions shown.`;
    list.hidden = false; input.setAttribute("aria-expanded", "true");
  }
  input.addEventListener("input", e => { if (!e.isComposing) refresh(); });
  input.addEventListener("compositionend", refresh);
  input.addEventListener("focus", refresh);
  input.addEventListener("keydown", e => {
    if (e.isComposing) return;
    if (e.key === "Escape") { close(); return; }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); if (list.hidden) refresh(); if (!matches.length) return;
      const next = e.key === "ArrowDown" ? (active + 1) % matches.length : (active <= 0 ? matches.length - 1 : active - 1);
      highlight(next);
    } else if (e.key === "Enter" && !list.hidden && active >= 0) {
      e.preventDefault(); const chosen = matches[active]; close(); input.value = chosen.name; onSelect(chosen);
    } else if (e.key === "Tab") close();
  });
  document.addEventListener("pointerdown", e => { if (!container.contains(e.target)) close(); });
  container.addEventListener("focusout", e => { if (!container.contains(e.relatedTarget)) close(); });
  return { close, refresh };
}
