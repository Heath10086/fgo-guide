// Progressive enhancement: keep the native select as the data source, but render
// the trigger and popup ourselves so the OS/browser does not choose their style.
export function setupSelect(select) {
  const label = document.querySelector(`label[for="${select.id}"]`);
  const wrap = document.createElement('div'); wrap.className = 'custom-select';
  const trigger = document.createElement('button'); trigger.type = 'button';
  trigger.id = `${select.id}-trigger`; trigger.className = 'select-trigger';
  trigger.setAttribute('role', 'combobox');
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-labelledby', label.id);
  const value = document.createElement('span'); value.className = 'select-value';
  const arrow = document.createElement('span'); arrow.className = 'select-chevron'; arrow.setAttribute('aria-hidden', 'true');
  trigger.append(value, arrow);
  const list = document.createElement('ul'); list.id = `${select.id}-list`;
  list.className = 'select-options'; list.hidden = true;
  list.setAttribute('role', 'listbox'); list.setAttribute('aria-labelledby', label.id);
  trigger.setAttribute('aria-controls', list.id);
  wrap.append(trigger, list); select.after(wrap);
  select.hidden = true; label.htmlFor = trigger.id;
  let active = 0, buffer = '', lastTyped = 0;

  function close() {
    list.hidden = true; trigger.setAttribute('aria-expanded', 'false');
    trigger.removeAttribute('aria-activedescendant'); buffer = '';
  }
  function highlight(index) {
    active = Math.max(0, Math.min(index, select.options.length - 1));
    [...list.children].forEach((option, i) => option.classList.toggle('is-active', i === active));
    const option = list.children[active];
    if (option && !list.hidden) {
      trigger.setAttribute('aria-activedescendant', option.id);
      option.scrollIntoView({ block: 'nearest' });
    }
  }
  function open() {
    if (select.disabled || !select.options.length) return;
    list.hidden = false; trigger.setAttribute('aria-expanded', 'true');
    highlight(Math.max(0, select.selectedIndex));
  }
  function choose(index) {
    if (select.options[index]?.disabled) return;
    select.selectedIndex = index; sync(); close();
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function sync() {
    trigger.disabled = select.disabled;
    value.textContent = select.selectedOptions[0]?.textContent || 'Choose…';
    list.replaceChildren(...[...select.options].map((option, i) => {
      const item = document.createElement('li'); item.id = `${list.id}-${i}`;
      item.setAttribute('role', 'option'); item.setAttribute('aria-selected', String(option.selected));
      item.setAttribute('aria-disabled', String(option.disabled)); item.textContent = option.textContent;
      item.addEventListener('pointerdown', e => e.preventDefault());
      item.addEventListener('click', () => { choose(i); trigger.focus(); });
      return item;
    }));
    if (select.disabled) close();
    else if (!list.hidden) highlight(select.selectedIndex);
  }
  trigger.addEventListener('click', () => list.hidden ? open() : close());
  trigger.addEventListener('keydown', e => {
    if (e.key === 'Tab') { close(); return; }
    if (e.key === 'Escape') { if (!list.hidden) { e.preventDefault(); close(); } return; }
    if (['Enter', ' '].includes(e.key)) {
      e.preventDefault(); list.hidden ? open() : choose(active); return;
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
      const wasClosed = list.hidden; if (wasClosed) open();
      if (e.key === 'Home') highlight(0);
      else if (e.key === 'End') highlight(select.options.length - 1);
      else if (!wasClosed) highlight(active + (e.key === 'ArrowDown' ? 1 : -1));
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault(); if (list.hidden) open();
      const now = Date.now(); buffer = now - lastTyped > 700 ? e.key : buffer + e.key; lastTyped = now;
      const index = [...select.options].findIndex(o => o.textContent.toLowerCase().startsWith(buffer.toLowerCase()));
      if (index >= 0) highlight(index);
    }
  });
  document.addEventListener('pointerdown', e => { if (!wrap.contains(e.target)) close(); });
  wrap.addEventListener('focusout', e => { if (!wrap.contains(e.relatedTarget)) close(); });
  select.addEventListener('change', sync);
  // Class options and disabled state arrive asynchronously with the API list.
  new MutationObserver(sync).observe(select, { childList: true, subtree: true, attributes: true });
  sync();
  return { sync, close };
}
