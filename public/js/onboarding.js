// A native dialog provides keyboard focus containment and Escape support.
const STORAGE_KEY = 'chaldea-onboarding-v1';
const steps = [
  { title:'Welcome to Chaldea Field Guide', text:'Meet the characters of Fate/Grand Order and learn what they can do. You do not need to know a character’s name or anything about the game: start with today’s discoveries.', label:'A QUICK INTRODUCTION', chips:['Discover someone new','Explore their abilities','Find more characters'] },
  { title:'No names in mind? Start here.', text:'Click “TODAY’S PICKS” in the top bar to reveal three daily discoveries—no dragging needed. Explore their stats and abilities without knowing a name first. These are discovery picks, not a recommended team. Try it below, then continue this introduction. When browsing on your own, “Back to browsing” or Escape brings you back to your place.', label:'01 / DISCOVER', chips:['Click TODAY’S PICKS','Meet a character','Return to your place'] },
  { title:'Find a Servant', text:'Already have someone in mind? Type a name to see matching characters. Choose a suggestion to open a profile, or press Search to see all matches. Class and rarity filters help narrow your search.', label:'02 / FIND', chips:['Type “Artoria”','Choose a suggestion','Open the profile'] },
  { title:'Explore their abilities', text:'Click a skill or Noble Phantasm to read its effect. A Noble Phantasm is a character’s special ability. Multiple versions of the same skill are alternatives, not extra equipped skills.', label:'03 / UNDERSTAND', chips:['Open a skill','Read the effect','Explore the full profile'] }
];

const header = document.querySelector('.header');
if (header) {
  const create = (tag,text,className) => {
    const node=document.createElement(tag); if(text)node.textContent=text; if(className)node.className=className; return node;
  };
  const help=create('button','How to use','secondary help-button'); help.type='button';
  const actions=create('div',null,'header-actions');
  const edition=header.querySelector('.edition'); if(edition)actions.append(edition); actions.append(help); header.append(actions);
  const dialog=create('dialog',null,'onboarding'); dialog.setAttribute('aria-labelledby','tour-title'); dialog.setAttribute('aria-describedby','tour-text');
  const close=create('button','×','tour-close secondary'); close.type='button'; close.setAttribute('aria-label','Close introduction');
  const content=create('div',null,'tour-content');
  const eyebrow=create('p',null,'eyebrow');
  const title=create('h2'); title.id='tour-title'; title.tabIndex=-1;
  const text=create('p',null,'tour-text'); text.id='tour-text';
  const visual=create('ol',null,'tour-chips'); visual.setAttribute('aria-label','Key ideas');
  const progress=create('p',null,'small muted'); progress.setAttribute('role','status');
  const stepNav=create('nav',null,'tour-stepper'); stepNav.setAttribute('aria-label','Introduction steps');
  const stepButtons=['Discover','Find','Abilities'].map((name,index)=>{
    const button=create('button',`${index+1} · ${name}`,'secondary'); button.type='button';
    button.addEventListener('click',()=>{current=index+1;render();}); stepNav.append(button); return button;
  });
  const footer=create('div',null,'tour-actions');
  const tryDaily=create('button','Try today’s picks ↗','secondary'); tryDaily.type='button'; tryDaily.hidden=true;
  const skip=create('button','Explore on my own','secondary'),back=create('button','Back','secondary'),next=create('button','Show me around');
  [skip,back,next].forEach(button=>{button.type='button';});
  footer.append(skip,back,next); content.append(eyebrow,stepNav,title,text,visual,tryDaily,progress,footer); dialog.append(close,content); document.body.append(dialog);
  let current=0,returnFocus,finished=false,launchDaily=false;
  function render() {
    const step=steps[current]; eyebrow.textContent=step.label; title.textContent=step.title; text.textContent=step.text;
    visual.replaceChildren(...step.chips.map(chip=>create('li',chip)));
    progress.textContent=current ? `Step ${current} of 3` : 'A short tour · You can skip at any time';
    back.hidden=current===0; skip.textContent=current===0?'Explore on my own':'Skip introduction';
    next.textContent=current===0?'Show me around':current===3?'Browse Servants':'Next';
    stepNav.hidden=current===0;
    tryDaily.hidden=current!==1 || !document.querySelector('#daily-dialog');
    stepButtons.forEach((button,index)=>{ if(index+1===current)button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current'); });
    if(dialog.open)title.focus();
  }
  function open() {
    if(dialog.open)return;
    current=0;finished=false;launchDaily=false;returnFocus=document.activeElement;render();dialog.showModal();document.body.classList.add('tour-open');title.focus();
  }
  function dismiss(){dialog.close();}
  help.addEventListener('click',open);close.addEventListener('click',dismiss);skip.addEventListener('click',dismiss);
  tryDaily.addEventListener('click',()=>{launchDaily=true;dismiss();});
  back.addEventListener('click',()=>{current=Math.max(0,current-1);render();});
  next.addEventListener('click',()=>{if(current===3){finished=true;dismiss();}else{current++;render();}});
  dialog.addEventListener('close',()=>{
    document.body.classList.remove('tour-open');
    try{localStorage.setItem(STORAGE_KEY,'seen');}catch{/* Tour remains usable without storage. */}
    // Finish closing the tour before opening another focus-contained view.
    if(launchDaily){
      launchDaily=false;
      const daily=document.querySelector('.daily-tag');
      if(daily){document.dispatchEvent(new Event('daily:tour-preview'));return;}
    }
    const search=document.querySelector('#search-input');
    if(finished && search && !search.disabled){search.focus();search.scrollIntoView({block:'center'});}
    else if(returnFocus && returnFocus!==document.body && returnFocus.isConnected)returnFocus.focus();
    else help.focus();
  });
  document.addEventListener('daily:tour-return', event => {
    current=event.detail.advance ? 2 : 1;
    finished=false;
    render();
    dialog.showModal();
    document.body.classList.add('tour-open');
    title.focus({preventScroll:true});
  });
  // Escape closes the native dialog and follows the same persistence/cleanup path.
  let seen=false;try{seen=localStorage.getItem(STORAGE_KEY)==='seen';}catch{}
  if(!seen && document.querySelector('#search-form'))open();
}
