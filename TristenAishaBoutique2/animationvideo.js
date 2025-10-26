/*
  Midnight Bloom — animationvideo.js (Full Interactions)
  Save as: /js/animationvideo.js
  Include in HTML: <script src="/js/animationvideo.js" defer></script>

  Features
  • Accessible mobile menu: aria-expanded, Escape to close, focus trap, close-on-link
  • Header: hide on scroll down, reveal on scroll up, subtle shadow
  • Smooth anchor scrolling with header offset
  • Active nav link highlighting based on visible sections
  • Reveal-on-scroll animations via IntersectionObserver (uses [data-reveal])
  • Parallax: hero + editorial slice images (disabled when prefers-reduced-motion)
  • Gentle hover lift for teaser items (disabled when prefers-reduced-motion)
  • Lazy-load fallback: set loading="lazy" on imgs without it
*/
(function(){
  const doc = document;
  const win = window;
  const $ = (s, root = doc) => root.querySelector(s);
  const $$ = (s, root = doc) => Array.from(root.querySelectorAll(s));
  const reduce = win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------
  // 1) MOBILE MENU (ARIA + FOCUS TRAP)
  // ---------------------------------
  const header = $('[data-nav]') || $('.site-header');
  const toggleBtn = $('.nav-toggle');
  const primaryNav = $('#primary-nav') || $('.nav-links');
  let isOpen = false; let lastFocused = null;

  const focusables = root => $$('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])', root)
    .filter(el => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');

  function openMenu(){
    if(!header || !toggleBtn || !primaryNav) return;
    isOpen = true; header.classList.add('is-open');
    toggleBtn.setAttribute('aria-expanded','true');
    lastFocused = doc.activeElement;
    const f = focusables(primaryNav)[0] || toggleBtn;
    setTimeout(()=> f && f.focus(), 10);
  }
  function closeMenu(){
    if(!header || !toggleBtn || !primaryNav) return;
    isOpen = false; header.classList.remove('is-open');
    toggleBtn.setAttribute('aria-expanded','false');
    lastFocused && lastFocused.focus && lastFocused.focus();
  }

  if(toggleBtn){
    toggleBtn.addEventListener('click', ()=> isOpen ? closeMenu() : openMenu());
    // Close on Escape + focus trap
    doc.addEventListener('keydown', e => {
      if(e.key === 'Escape' && isOpen){ e.preventDefault(); closeMenu(); }
      if(e.key === 'Tab' && isOpen){
        const fEls = focusables(primaryNav);
        if(!fEls.length) return;
        const first = fEls[0], last = fEls[fEls.length-1];
        if(e.shiftKey && doc.activeElement === first){ e.preventDefault(); last.focus(); }
        else if(!e.shiftKey && doc.activeElement === last){ e.preventDefault(); first.focus(); }
      }
    });
    // Close after clicking an in-page link
    primaryNav && primaryNav.addEventListener('click', e => {
      const a = e.target.closest('a');
      if(a && a.getAttribute('href')?.startsWith('#')) closeMenu();
    });
    // Close on outside click (mobile)
    doc.addEventListener('click', e => {
      if(!isOpen) return;
      const withinHeader = e.target.closest('[data-nav]');
      if(!withinHeader) closeMenu();
    });
  }

  // ---------------------------------
  // 2) HEADER HIDE-ON-SCROLL + SHADOW
  // ---------------------------------
  let lastY = win.scrollY; let ticking = false; const SHADOW_Y = 4;
  function onScroll(){
    const y = win.scrollY; const goingDown = y > lastY; const past = y > 120;
    if(header && !isOpen){
      if(goingDown && past) header.classList.add('header--hide');
      else header.classList.remove('header--hide');
      header.style.boxShadow = y > SHADOW_Y ? '0 10px 30px rgba(0,0,0,.25)' : 'none';
    }
    lastY = y;
  }
  win.addEventListener('scroll', () => { if(!ticking){ requestAnimationFrame(()=>{ onScroll(); ticking=false; }); ticking=true; } }, { passive:true });
  onScroll();

  // ---------------------------------
  // 3) SMOOTH SCROLL WITH OFFSET
  // ---------------------------------
  const headerOffset = () => (header?.offsetHeight || 64) + 8;
  function smoothTo(hash){
    const id = hash.replace('#',''); const target = doc.getElementById(id);
    if(!target) return;
    const top = target.getBoundingClientRect().top + win.scrollY - headerOffset();
    if(reduce) win.scrollTo(0, top);
    else win.scrollTo({ top, behavior:'smooth' });
  }
  $$('.nav-links a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const href = a.getAttribute('href'); if(!href) return;
    e.preventDefault(); smoothTo(href);
  }));

  // Handle deep-link on load
  if(location.hash){ setTimeout(()=> smoothTo(location.hash), 50); }

  // ---------------------------------
  // 4) ACTIVE LINK HIGHLIGHT
  // ---------------------------------
  const ids = ['products','gallery','about','contact'];
  const sections = ids.map(id => ({ id, el: doc.getElementById(id) })).filter(s => s.el);
  const navMap = new Map(ids.map(id => [id, $(`.nav-links a[href="#${id}"]`)]));
  if('IntersectionObserver' in win && sections.length){
    const ob = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const id = entry.target.id; const link = navMap.get(id);
        if(!link) return;
        if(entry.isIntersecting){ navMap.forEach(l => l && l.classList.remove('is-active')); link.classList.add('is-active'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0.01 });
    sections.forEach(s => ob.observe(s.el));
  }

  // ---------------------------------
  // 5) REVEAL-ON-SCROLL
  // ---------------------------------
  const revealSelectors = ['.reel-card', '.work-block', '.svc', '.cta-card', '.pillars .pillar', '.slice-block', '.teaser-item'];
  revealSelectors.forEach(sel => $$(sel).forEach(el => el.setAttribute('data-reveal','')));
  if(!reduce && 'IntersectionObserver' in win){
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if(entry.isIntersecting){ entry.target.classList.add('is-revealed'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.1 });
    $$('[data-reveal]').forEach(el => io.observe(el));
  }

  // ---------------------------------
  // 6) PARALLAX (HERO + SLICES)
  // ---------------------------------
  if(!reduce){
    const parallaxEls = [];
    const heroImg = $('.hero-media img'); if(heroImg) parallaxEls.push({ el: heroImg, speed: 0.12, scale: 1.04 });
    $$('.slice-image img').forEach(img => parallaxEls.push({ el: img, speed: 0.08, scale: 1.03 }));

    let rafId = null;
    function tick(){
      const vh = win.innerHeight;
      parallaxEls.forEach(({ el, speed, scale }) => {
        const r = el.getBoundingClientRect();
        const inView = r.bottom > 0 && r.top < vh;
        if(!inView) return;
        const center = (r.top + r.height/2) - vh/2; // negative if above center
        const y = -center * speed;
        el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0) scale(${scale})`;
      });
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    win.addEventListener('beforeunload', () => cancelAnimationFrame(rafId));
  }

  // ---------------------------------
  // 7) HOVER LIFT (TEASER ITEMS)
  // ---------------------------------
  if(!reduce){
    $$('.teaser-item').forEach(item => {
      item.addEventListener('pointerenter', ()=>{ item.style.transform = 'translateY(-2px)'; item.style.transition = 'transform .2s ease'; });
      item.addEventListener('pointerleave', ()=>{ item.style.transform = 'none'; });
    });
  }

  // ---------------------------------
  // 8) LAZY-LOAD FALLBACK
  // ---------------------------------
  $$('img:not([loading])').forEach(img => img.loading = 'lazy');
})();
