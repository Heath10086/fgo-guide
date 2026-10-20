import { japaneseLabel, fillJapaneseNames } from './japanese.js';
import { getServant } from './api.js';

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function abilityIcon(url) {
  if (!url) return element('span', '◇', 'icon-fallback');
  const image = element('img'); image.src = url; image.alt = ''; image.loading = 'lazy';
  image.addEventListener('error', () => image.replaceWith(element('span', '◇', 'icon-fallback')), {once:true});
  return image;
}

// Group alternate versions by skill slot rather than treating them as extra skills.
function renderSkillPreview(servant) {
  const section = element('section', null, 'daily-skills');
  section.append(element('h4', 'Skills'));
  const groups = new Map();
  (servant.skills || []).forEach(skill => {
    if (!groups.has(skill.num)) groups.set(skill.num, []);
    groups.get(skill.num).push(skill);
  });
  if (!groups.size) section.append(element('p', 'No skill data available.', 'small muted'));
  [...groups.entries()].sort(([a],[b]) => a-b).forEach(([slot, variants]) => {
    const details = element('details', null, 'daily-ability');
    const summary = element('summary');
    const text = element('span');
    text.append(element('small', `SKILL ${slot}${variants.length > 1 ? ` · ${variants.length} VERSIONS` : ''}`), element('span', variants[0].name));
    summary.append(abilityIcon(variants[0].icon), text); details.append(summary);
    variants.forEach((skill, index) => {
      const body = element('div', null, 'daily-effect');
      if (variants.length > 1) body.append(element('strong', `${index+1}. ${skill.name}`));
      body.append(element('p', skill.detail || 'Effect description unavailable.'));
      if (skill.coolDown?.length) body.append(element('p', `Cooldown: ${skill.coolDown[0]} → ${skill.coolDown.at(-1)} turns (skill Lv. 1 → ${skill.coolDown.length}).`, 'small muted'));
      details.append(body);
    });
    section.append(details);
  });
  return section;
}

function renderNPPreview(servant) {
  const section = element('section', null, 'daily-np');
  section.append(element('h4', 'Noble Phantasm'), element('p', 'Special ability', 'small muted'));
  const nps = servant.noblePhantasms || [];
  if (!nps.length) section.append(element('p', 'No special ability data available.', 'small muted'));
  nps.forEach((np,index) => {
    const details = element('details', null, 'daily-ability');
    const summary = element('summary'), text = element('span');
    const type = { '1':'Arts', '2':'Buster', '3':'Quick' }[np.card] || 'Special';
    text.append(element('small', `${type}${nps.length > 1 ? ` · ENTRY ${index+1}` : ''}`), element('span',np.name));
    summary.append(abilityIcon(np.icon), text);
    details.append(summary, element('p',np.detail || 'Effect description unavailable.','daily-effect'));
    section.append(details);
  });
  return section;
}

function createDailyCard(basic, index) {
  const card = element('article', null, 'card daily-card');
  const number = element('span', `PICK / 0${index+1}`, 'eyebrow');
  const art = element('div', null, 'daily-art'); art.append(element('span','Loading illustration…','small muted'));
  const title = element('h3',basic.name);
  const meta = element('div',null,'daily-meta');
  meta.append(element('span',basic.className,'class-chip'));
  const stars = element('span',basic.rarity ? '★'.repeat(basic.rarity) : '0 ★','stars'); stars.setAttribute('aria-label',`${basic.rarity} stars`); meta.append(stars);
  const stats = element('dl',null,'daily-stats');
  const statValue = {};
  for (const [key,label] of [['atkMax','ATK'],['hpMax','HP']]) {
    const cell = element('div'), value = element('dd',basic[key]?.toLocaleString('en-US') ?? '—');
    cell.append(element('dt',label),value); stats.append(cell); statValue[key] = value;
  }
  const level = element('p','Natural maximum stats','small muted');
  const abilities = element('div',null,'daily-abilities');
  const info = element('div', null, 'daily-info');
  const npName = element('p', 'Noble Phantasm loading…', 'daily-np-name');
  const disclosure = element('details', null, 'daily-disclosure');
  const disclosureSummary = element('summary');
  const icons = element('span', null, 'daily-skill-icons');
  icons.setAttribute('aria-hidden', 'true');
  disclosureSummary.append(icons, element('span', 'Skills & Noble Phantasm'));
  disclosure.append(disclosureSummary, abilities);
  const status = element('p','Loading skills and special ability…','small muted'); status.setAttribute('role','status');
  const retry = element('button','Retry details','secondary'); retry.type='button'; retry.hidden=true;
  const link = element('a','Open full profile ↗'); link.href=`./servant.html?id=${basic.collectionNo}`;
  status.classList.add('daily-load');
  info.append(number,title,japaneseLabel(basic),meta,stats,level);
  card.append(art,info,npName,disclosure,status,retry,link);
  async function load() {
    retry.hidden=true; status.textContent='Loading skills and special ability…';
    try {
      const s = await getServant(basic.collectionNo);
      art.replaceChildren();
      // Full first-ascension illustration, never a portrait thumbnail.
      const picture = s.extraAssets?.charaGraph?.ascension?.['1'];
      if (picture) {
        const image = element('img'); image.src=picture; image.alt=`${s.name}, first ascension illustration`; image.loading='lazy';
        image.addEventListener('error',()=>art.replaceChildren(element('span','Illustration unavailable','small muted')),{once:true}); art.append(image);
      } else art.append(element('span','Illustration unavailable','small muted'));
      Object.entries(statValue).forEach(([key,node])=>{ node.textContent=s[key]?.toLocaleString('en-US') ?? '—'; });
      level.textContent=`Natural max · Lv. ${s.lvMax ?? '—'}`;
      const skillsBySlot = new Map();
      (s.skills || []).forEach(skill => { if (!skillsBySlot.has(skill.num)) skillsBySlot.set(skill.num, skill); });
      icons.replaceChildren(...[...skillsBySlot.values()].sort((a,b) => a.num-b.num).map(skill => abilityIcon(skill.icon)));
      const np = s.noblePhantasms?.[0];
      npName.textContent = np ? `NP · ${np.name}` : 'NP · No data available';
      abilities.replaceChildren(renderSkillPreview(s),renderNPPreview(s));
      abilities.append(element('p','Multiple entries are alternate versions. Open a row to read its effect.','small muted'));
      status.textContent='';
    } catch(error) {
      art.replaceChildren(element('span','Illustration unavailable','small muted'));
      status.textContent='Details could not load. Basic stats are still available.'; retry.hidden=false;
      npName.textContent='NP · Details unavailable';
      console.warn('Daily character detail unavailable',basic.collectionNo,error);
    }
  }
  retry.addEventListener('click',load);
  load();
  return card;
}

export function dailyDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const part = type => parts.find(p => p.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function hash(text) {
  let value = 2166136261;
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return value >>> 0;
}

export function chooseDaily(servants, day) {
  const unique = [...new Map(servants.map(s => [s.collectionNo, s])).values()];
  return unique.sort((a,b) => hash(`${day}:${a.collectionNo}`) - hash(`${day}:${b.collectionNo}`)
    || a.collectionNo - b.collectionNo).slice(0,3);
}

// The native dialog provides focus containment; a curved reveal uncovers a full view.
export function setupDailyDisclosure() {
  const dialog = document.querySelector('#daily-dialog');
  const content = document.querySelector('#daily-content');
  const closeButton = document.querySelector('#daily-close');
  const tourHint = document.querySelector('#daily-tour-hint');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let trigger, animations = [], phase = 'closed', scrollPosition;
  let guided = false, advanceTour = false;
  const setPhase = value => { phase = value; dialog.dataset.phase = value; };
  function clearAnimations() {
    animations.forEach(animation => animation.cancel());
    animations = [];
  }
  function close() {
    if (!dialog.open || phase === 'closing') return;
    setPhase('closing');
    if (motion.matches || !animations.length) { dialog.close(); return; }
    // Reverse the actual progress, including a close during the opening motion.
    animations.forEach(animation => animation.reverse());
    Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
      if (phase === 'closing') dialog.close();
    });
  }
  content.hidden = true;
  function open(button, fromTour = false) {
    if (!button || dialog.open) return;
    trigger = button;
    guided = fromTour;
    advanceTour = false;
    tourHint.hidden = !guided;
    closeButton.textContent = guided ? 'Back to introduction ↑' : 'Back to browsing ↑';
    closeButton.setAttribute('aria-label', guided ? 'Return to the Discover introduction step' : 'Close daily picks and return to browsing');
    scrollPosition = {left:window.scrollX, top:window.scrollY};
    content.hidden = false;
    setPhase('opening');
    dialog.showModal();
    dialog.scrollTop = 0;
    document.body.classList.add('daily-modal-open');
    trigger.setAttribute('aria-expanded', 'true');
    content.dispatchEvent(new Event('daily:open'));
    if (motion.matches || typeof dialog.animate !== 'function') { setPhase('open'); return; }
    const timing = {duration:620, easing:'cubic-bezier(.22,.68,.16,1)', fill:'both'};
    const page = document.querySelectorAll('.home-header, .navigation-dock, #main, body > footer');
    animations = [
      dialog.animate([
        {clipPath:'inset(0 0 100% 0 round 0 0 50% 50%)'},
        {clipPath:'inset(0 0 0% 0 round 0 0 0% 0%)'}
      ], timing),
      ...[...page].map(node => node.animate([
        {transform:'translateY(0)'},
        {transform:`translateY(${window.innerHeight}px)`}
      ], timing))
    ];
    Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
      if (phase === 'opening') setPhase('open');
    });
  }
  // The header button is created by navigation.js after this module initializes.
  document.addEventListener('click', event => {
    const button = event.target.closest('.daily-tag');
    if (button) open(button);
  });
  document.addEventListener('daily:tour-preview', () => open(document.querySelector('.daily-tag'), true));
  document.querySelector('#daily-tour-continue').addEventListener('click', () => {
    if (!guided || phase === 'closing') return;
    advanceTour = true;
    close();
  });
  closeButton.addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('close', () => {
    setPhase('closed');
    clearAnimations();
    content.hidden = true;
    document.body.classList.remove('daily-modal-open');
    trigger?.setAttribute('aria-expanded', 'false');
    if (scrollPosition) window.scrollTo({...scrollPosition, behavior:'instant'});
    if (guided) {
      guided = false;
      tourHint.hidden = true;
      document.dispatchEvent(new CustomEvent('daily:tour-return', {detail:{advance:advanceTour}}));
      return;
    }
    trigger?.focus({ preventScroll: true });
    // Wait for the top layer and animated transforms to finish their browser cleanup.
    requestAnimationFrame(() => {
      if (phase !== 'closed' || document.querySelector('dialog[open]')) return;
      if (scrollPosition) window.scrollTo({...scrollPosition, behavior:'instant'});
      trigger?.focus({ preventScroll: true });
    });
  });
}

export function setupDaily(servants) {
  const root = document.querySelector('#daily-picks');
  const content = document.querySelector('#daily-content');
  let previousDay;
  function render() {
    // No card creation, images or extra detail requests until the user opens it.
    if (content.hidden) return;
    const day = dailyDate();
    if (day === previousDay) return;
    previousDay = day;
    let picks = chooseDaily(servants, day);
    // Preserve today's selection on this browser even if the API list changes.
    try {
      const saved = JSON.parse(localStorage.getItem('chaldea-daily-v1') || 'null');
      if (saved?.day === day && Array.isArray(saved.ids) && saved.ids.length === 3
          && new Set(saved.ids).size === 3) {
        const found = saved.ids.map(id => servants.find(s => s.collectionNo === id));
        if (found.every(Boolean)) picks = found;
      }
      localStorage.setItem('chaldea-daily-v1', JSON.stringify({day,ids:picks.map(s=>s.collectionNo)}));
    } catch { /* Storage is optional, deterministic selection still works. */ }
    root.replaceChildren();
    document.querySelector('#daily-date').textContent = `${day} · Refreshes at midnight, Toronto time`;
    picks.forEach((s,index) => root.append(createDailyCard(s,index)));
    fillJapaneseNames(root);
  }
  render();
  content.addEventListener('daily:open', render);
  const timer = setInterval(render,60000);
  const onVisible = () => { if (!document.hidden) render(); };
  document.addEventListener('visibilitychange',onVisible);
  return () => {
    clearInterval(timer);
    content.removeEventListener('daily:open', render);
    document.removeEventListener('visibilitychange',onVisible);
  };
}
