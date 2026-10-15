// Text-only navigation stays open until explicitly dismissed, at every width.
const header = document.querySelector('.header');
const actions = header?.querySelector('.header-actions');
if (header && actions) {
  const entries = [
    ['top', 'TOP', 'Back to the beginning'],
    ['find', 'SEARCH', 'Find a character'],
    ['discover', 'DAILY', 'Reveal today’s three picks'],
    ['archive', 'ARCHIVE', 'Browse the character list']
  ];
  const home = Boolean(document.querySelector('#search-form'));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const nav = document.createElement('nav');
  nav.id = 'site-navigation'; nav.className = 'site-navigation';
  nav.setAttribute('aria-label', 'Main navigation');
  const list = document.createElement('ul');
  const links = entries.map(([id, label, description]) => {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = `./index.html#${id}`; link.dataset.section = id;
    link.setAttribute('aria-label', `${label} — ${description}`);
    const text = document.createElement('span'); text.textContent = label;
    const arrow = document.createElement('span'); arrow.className = 'nav-arrow';
    arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true');
    link.append(text, arrow); item.append(link); list.append(item); return link;
  });
  nav.append(list); header.after(nav);
  const toggle = document.createElement('button');
  toggle.type = 'button'; toggle.className = 'secondary nav-toggle';
  toggle.setAttribute('aria-controls', nav.id);
  const label = document.createElement('span'); label.textContent = 'Menu';
  const icon = document.createElement('span'); icon.className = 'nav-toggle-icon';
  icon.setAttribute('aria-hidden', 'true'); toggle.append(label, icon); actions.append(toggle);

  function setOpen(open, returnFocus = false) {
    nav.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    label.textContent = open ? 'Close' : 'Menu';
    if (returnFocus) toggle.focus();
  }
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setOpen(false, true);
  });
  // Scrolling, selecting a link, changing focus or resizing must not dismiss it.
  setOpen(true);

  function highlight(id) {
    links.forEach(link => {
      if (link.dataset.section === id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function goTo(id, animate = true) {
    const target = document.getElementById(id);
    if (!target) return;
    if (id === 'discover' && document.querySelector('#daily-content').hidden) document.querySelector('#daily-toggle').click();
    highlight(id);
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'start', behavior: animate && !reducedMotion.matches ? 'smooth' : 'instant' });
  }
  links.forEach(link => link.addEventListener('click', event => {
    // Preserve new-tab shortcuts and normal cross-page navigation.
    if (!home || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    const id = link.dataset.section;
    if (location.hash !== `#${id}`) history.pushState(null, '', `#${id}`);
    goTo(id);
  }));
  if (home) {
    let queued = false;
    const updateActive = () => {
      queued = false;
      let current = 'top';
      entries.forEach(([id]) => {
        if (document.getElementById(id).getBoundingClientRect().top <= 130) current = id;
      });
      highlight(current);
    };
    window.addEventListener('scroll', () => {
      if (!queued) { queued = true; requestAnimationFrame(updateActive); }
    }, { passive: true });
    window.addEventListener('hashchange', () => goTo(location.hash.slice(1)));
    if (entries.some(([id]) => location.hash === `#${id}`)) goTo(location.hash.slice(1), false);
    else updateActive();
  }
}
