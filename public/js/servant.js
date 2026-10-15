import { getServant } from "./api.js";
import { japaneseLabel, fillJapaneseNames } from "./japanese.js";
const $ = selector => document.querySelector(selector);
function el(tag, text, className) {
  const node = document.createElement(tag); if (text != null) node.textContent = text;
  if (className) node.className = className; return node;
}
function renderOverview(s) {
  const root = $("#overview"); root.replaceChildren();
  const art = s.extraAssets?.charaGraph?.ascension?.["1"];
  if (art) { const image = el("img", null, "portrait"); image.src = art; image.alt = s.name; image.addEventListener("error", () => { image.hidden = true; }, {once:true}); root.append(image); }
  const body = el("div"); body.append(el("p", `NO. ${s.collectionNo} / ${s.className.toUpperCase()} / ${s.rarity}★`, "eyebrow"), el("h1", s.name));
  body.append(japaneseLabel(s));
  const stats = el("dl", null, "stats");
  [["Max ATK", s.atkMax], ["Max HP", s.hpMax], ["Max level", s.lvMax]].forEach(([name,value]) => { const cell=el("div"); cell.append(el("dt", name), el("dd", value ?? "—")); stats.append(cell); });
  body.append(stats, el("p", "API maximum stats for this entry; these are not a simulated build or overall strength ranking.", "small muted"));
  body.append(el("p", "ATK: attack stat · HP: health points", "small muted")); root.append(body);
  fillJapaneseNames(root);
}
function renderAbilities(items, target, isSkill) {
  target.replaceChildren();
  if (!items?.length) { target.append(el("p","No ability data available.","muted")); return; }
  items.forEach((ability,index) => {
    const details=el("details",null,"ability"), summary=el("summary");
    if (ability.icon) { const img=el("img"); img.src=ability.icon; img.alt=""; img.loading="lazy"; img.addEventListener("error",()=>{img.hidden=true;},{once:true}); summary.append(img); }
    summary.append(document.createTextNode(`${isSkill ? `Skill slot ${ability.num}` : `API entry ${index+1}`} · ${ability.name}`));
    details.append(summary,el("p",ability.detail || "No text description available."));
    if (isSkill && ability.coolDown?.length) details.append(el("p",`Cooldown: ${ability.coolDown[0]} turns at skill level 1 → ${ability.coolDown.at(-1)} turns at level ${ability.coolDown.length}.`,"small muted"));
    target.append(details);
  });
}
async function init() {
  const id=new URLSearchParams(location.search).get("id");
  $("#retry").hidden=true;
  if (!id || !/^\d+$/.test(id) || Number(id)<1) { $("#status").textContent="Choose a character from the archive to open a profile."; return; }
  $("#status").textContent="Loading character profile…";
  try {
    const s = await getServant(id);
    document.title=`${s.name} · Chaldea Field Guide`;
    renderOverview(s);
    renderAbilities(s.skills,$("#skill-content"),true); renderAbilities(s.noblePhantasms,$("#np-content"),false);
    $("#profile").hidden=false; $("#status").textContent="";
  } catch(error) { $("#status").textContent="Unable to load this character. Try again or return to the archive."; $("#retry").hidden=false; console.error(error); }
}
$("#retry").addEventListener("click",init); init();
