import { getServantList } from "./api.js";
import { findMatches, setupAutocomplete } from "./search.js";
import { japaneseLabel, fillJapaneseNames } from "./japanese.js";
import { setupDaily, setupDailyDisclosure } from "./daily.js";
import { setupSelect } from "./select.js";

const $ = selector => document.querySelector(selector);
const input = $("#search-input");
const filters = [$("#class-filter"), $("#rarity-filter")].map(setupSelect);
setupDailyDisclosure();
let servants = [], filtered = [], visibleCount = 24;
const goToServant = s => { location.href = `./servant.html?id=${encodeURIComponent(s.collectionNo)}`; };
function eligible() {
  return servants.filter(s => (!$("#class-filter").value || s.className === $("#class-filter").value)
    && (!$("#rarity-filter").value || String(s.rarity) === $("#rarity-filter").value));
}
const autocomplete = setupAutocomplete({ input, list:$("#suggestions"), container:$("#autocomplete"), announcement:$("#suggestion-status"), getMatches:q => findMatches(eligible(), q), onSelect:goToServant });

function render() {
  $("#results").replaceChildren();
  filtered.slice(0, visibleCount).forEach(s => {
    const card = document.createElement("article"); card.className = "card";
    if (s.face) {
      const image = document.createElement("img"); image.src = s.face; image.alt = ""; image.loading = "lazy";
      image.addEventListener("error", () => { image.hidden = true; }, {once:true}); card.append(image);
    }
    const stars = document.createElement("span"); stars.className = "stars"; stars.textContent = s.rarity ? "★".repeat(s.rarity) : "0 ★"; stars.setAttribute("aria-label", `${s.rarity} stars`);
    const title = document.createElement("h3"); title.textContent = s.name;
    const meta = document.createElement("p"); meta.textContent = `${s.className} · No. ${s.collectionNo}`;
    const link = document.createElement("a"); link.href = `./servant.html?id=${s.collectionNo}`; link.textContent = "View profile ↗"; link.setAttribute("aria-label", `View ${s.name}, ${s.className}, No. ${s.collectionNo}`);
    card.append(stars, title, japaneseLabel(s), meta, link); $("#results").append(card);
  });
  $("#status").textContent = filtered.length ? `${filtered.length} characters · Showing ${Math.min(visibleCount, filtered.length)}` : "No matches. Try another name or clear the filters.";
  $("#load-more").hidden = visibleCount >= filtered.length;
  fillJapaneseNames($("#results"));
}
function search() { autocomplete.close(); filtered = findMatches(eligible(), input.value); visibleCount = 24; render(); }
$("#search-form").addEventListener("submit", e => { e.preventDefault(); search(); });
$("#class-filter").addEventListener("change", search);
$("#rarity-filter").addEventListener("change", search);
$("#reset").addEventListener("click", () => { input.value = ""; $("#class-filter").value = ""; $("#rarity-filter").value = ""; filters.forEach(filter => { filter.sync(); filter.close(); }); if (servants.length) search(); input.focus(); });
$("#load-more").addEventListener("click", () => { visibleCount += 24; render(); });
input.addEventListener("input", () => { if (!input.value.trim() && servants.length) search(); });

async function init() {
  $("#retry").hidden = true; $("#status").textContent = "Loading character list…";
  try {
    servants = await getServantList();
    [...new Set(servants.map(s => s.className))].sort().forEach(name => {
      const option = document.createElement("option"); option.value = name; option.textContent = name; $("#class-filter").append(option);
    });
    [input,$("#search-button"),$("#class-filter"),$("#rarity-filter")].forEach(el => { el.disabled = false; });
    search();
    setupDaily(servants);
  } catch (error) {
    $("#status").textContent = error.code === 'LOCAL_API_MISSING' ? error.message : "Could not load the character list. Check your connection, then retry.";
    $("#retry").hidden = false; console.error(error);
  }
}
$("#retry").addEventListener("click", init);
init();
