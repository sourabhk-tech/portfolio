// ===== INTRO SPLASH =====
window.__portfolioReady = true;

(function () {
  const pre = document.getElementById('preloader');
  if (!pre) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  // Data-saver or a very slow link: keep the intro short and cheap instead of
  // making people wait through the full choreography.
  const slowNet = !!(conn && (conn.saveData || /^(slow-2g|2g)$/.test(conn.effectiveType || '')));
  const heroPhoto = document.getElementById('hero-photo');
  const prePhoto = document.getElementById('pre-photo');

  if (heroPhoto) heroPhoto.classList.add('waiting');

  // Dissolve the intro photo in the moment it has actually loaded, so the
  // reveal never plays on an empty frame (a broken image simply stays hidden
  // inside its ring instead of flashing a broken icon).
  function dissolvePrePhoto() {
    if (prePhoto) prePhoto.classList.add('loaded');
  }
  if (prePhoto) {
    if (prePhoto.complete) {
      if (prePhoto.naturalWidth > 0) dissolvePrePhoto();
    } else {
      prePhoto.addEventListener('load', dissolvePrePhoto, { once: true });
    }
  }

  function revealHero() {
    document.querySelectorAll('.hero .reveal').forEach(function (el) {
      el.classList.add('in-view');
      el.classList.add('in');
    });
  }

  function hide() { pre.classList.add('hidden'); }
  function destroy() {
    clearInterval(barTimer);
    if (pre.parentNode) pre.remove();
    // The page is visible now — let the typewriter start.
    document.dispatchEvent(new CustomEvent('intro:done'));
  }
  // Mark the hero photo ready (blur-up in) as the splash clears.
  function settleHeroPhoto() {
    if (!heroPhoto) return;
    heroPhoto.classList.remove('waiting');
    heroPhoto.classList.add('loaded');
    const frame = document.getElementById('photo-frame');
    if (frame) frame.classList.add('done');
  }
  // Tracked timers so the intro can be cancelled cleanly when skipped.
  let timers = [];
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function clearTimers() {
    timers.forEach(function (id) { clearTimeout(id); });
    timers = [];
  }

  // ----- Intro progress bar: driven by REAL loading ------------------------
  // The bar climbs as actual assets land (stylesheet, the hero photo, fonts)
  // and only reaches 100% once the page is genuinely ready. It is never a
  // fixed fake timer, so it can't sit "stuck" while the site enters.
  const barFill = document.querySelector('.pre-bar-fill');
  const introStart = Date.now();
  const MIN_INTRO = slowNet ? 700 : 1400;   // let the wordmark entrance be seen
  const MAX_INTRO = slowNet ? 1100 : 1700;  // never hold a slow link for long
  const CAP_UNTIL_READY = 0.9;

  const checkpoints = [];
  function isLoaded(el) {
    if (el.tagName === 'IMG') return el.complete && el.naturalWidth > 0;
    if (el.tagName === 'LINK') return !!el.sheet;
    return false;
  }
  function track(el, weight) {
    if (!el) return;
    const cp = { weight: weight, done: isLoaded(el) };
    checkpoints.push(cp);
    if (cp.done) return;
    const mark = function () { cp.done = true; };
    el.addEventListener('load', mark, { once: true });
    // A broken asset must never hold the bar hostage.
    el.addEventListener('error', mark, { once: true });
  }

  // 1) the document itself — this script only runs once parsing is past…
  checkpoints.push({ weight: 1, done: document.readyState !== 'loading' });
  // 2) the stylesheet, 3) this script (it is running right now)…
  track(document.querySelector('link[href$="style.css"]'), 2);
  checkpoints.push({ weight: 1, done: true });
  // 4) the photo that both the intro and the hero show…
  track(document.getElementById('pre-photo') || document.getElementById('hero-photo'), 2);
  // 5) the webfont stylesheet, 6) the fonts themselves.
  track(document.querySelector('link[href*="fonts.googleapis.com"]'), 1);
  const fontCp = { weight: 2, done: false };
  checkpoints.push(fontCp);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { fontCp.done = true; });
    setTimeout(function () { fontCp.done = true; }, 2500); // never hang the bar
  } else {
    fontCp.done = true;
  }
  const totalWeight = checkpoints.reduce(function (n, c) { return n + c.weight; }, 0);
  function realProgress() {
    let done = 0;
    checkpoints.forEach(function (c) { if (c.done) done += c.weight; });
    return totalWeight ? done / totalWeight : 1;
  }

  let loadFired = document.readyState === 'complete';
  window.addEventListener('load', function () { loadFired = true; });

  let shown = 0, finished = false, exited = false, barTimer = 0;
  let finishAt = 0;

  function finish() {
    if (finished) return;
    finished = true;
    finishAt = Date.now();
  }

  let started = false;

  // The splash just fades out (its own .6s CSS transition) to reveal the page,
  // which revealHero() has already put in place underneath.
  function runSequence() {
    if (started) return;
    started = true;
    revealHero();
    settleHeroPhoto();
    hide();
    later(destroy, reduceMotion ? 80 : 650);
  }

  // Paints the bar and decides when the page is genuinely ready. Deliberately a
  // timer rather than requestAnimationFrame: frame production can be starved
  // while a page is still loading, and the intro must never stall behind that.
  function stepBar() {
    const goal = finished ? 1 : Math.min(CAP_UNTIL_READY, realProgress() * 0.9 + 0.08);
    shown += (goal - shown) * (finished ? 0.5 : 0.3);
    if (goal - shown < 0.004) shown = goal;
    if (barFill) barFill.style.transform = 'scaleX(' + shown.toFixed(4) + ')';

    if (finished) {
      // Let the completed bar sit for a beat, then leave.
      if (!exited && Date.now() - finishAt >= 240) {
        exited = true;
        shown = 1;
        if (barFill) barFill.style.transform = 'scaleX(1)';
        clearInterval(barTimer);
        runSequence();
      }
      return;
    }
    const elapsed = Date.now() - introStart;
    if (elapsed >= MAX_INTRO) finish();                    // slow link: bail out
    else if (loadFired && elapsed >= MIN_INTRO) finish();  // genuinely ready
  }

  // Tap, click or any key skips the intro — matters most on slow connections,
  // where the intro would otherwise hold the page for a few seconds.
  function skipIntro() {
    if (pre.classList.contains('hidden')) return;
    clearTimers();
    started = true;
    exited = true;
    finished = true;
    shown = 1;
    if (barFill) barFill.style.transform = 'scaleX(1)';
    revealHero();
    settleHeroPhoto();
    hide();
    later(destroy, 250);
  }
  window.addEventListener('pointerdown', skipIntro, { once: true, passive: true });
  window.addEventListener('keydown', skipIntro, { once: true });

  if (reduceMotion) {
    // No animation wanted: complete the bar and get out of the way at once.
    finished = true;
    exited = true;
    shown = 1;
    if (barFill) barFill.style.transform = 'scaleX(1)';
    runSequence();
  } else {
    stepBar();
    barTimer = setInterval(stepBar, 110);
  }
})();

// ===== MOBILE HAMBURGER MENU =====
(function () {
  const btn = document.getElementById('hamburgerBtn');
  const menu = document.getElementById('mobileMenu');
  const backdrop = document.getElementById('mobileMenuBackdrop');
  const closeBtn = document.getElementById('mobileMenuClose');
  const links = document.querySelectorAll('.mobile-navlink');
  if (!btn || !menu) return;

  function openMenu() {
    menu.classList.add('open');
    btn.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    menu.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.dispatchEvent(new CustomEvent('menu:toggle', { detail: { open: true } }));
  }
  function closeMenu() {
    menu.classList.remove('open');
    btn.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    document.dispatchEvent(new CustomEvent('menu:toggle', { detail: { open: false } }));
  }

  btn.addEventListener('click', () => {
    menu.classList.contains('open') ? closeMenu() : openMenu();
  });
  closeBtn && closeBtn.addEventListener('click', closeMenu);
  backdrop && backdrop.addEventListener('click', closeMenu);
  links.forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });
})();

// ===== LOCK PHOTOS AGAINST DRAG / SAVE =====
(function () {
  document.querySelectorAll('#pre-photo, #hero-photo').forEach(function (img) {
    img.addEventListener('dragstart', function (e) { e.preventDefault(); });
    img.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  });
})();


// ===== PHOTO BLUR-UP LOAD =====
(function () {
  const img = document.getElementById('hero-photo');
  const frame = document.getElementById('photo-frame');
  if (!img) return;
  function markLoaded() {
    if (!img.classList.contains('waiting')) {
      img.classList.add('loaded');
      if (frame) frame.classList.add('done');
    }
  }
  if (img.complete) markLoaded();
  else img.addEventListener('load', markLoaded);
})();

// ===== NAV ACTIVE STATE + SCROLLED STYLE =====
(function () {
  const nav = document.getElementById('nav') || document.querySelector('nav');
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.navlink, .mobile-navlink, .nav-links a[data-section]');

  if (sections.length && navLinks.length) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach(function (link) {
            const href = link.getAttribute('href') || '';
            const section = link.getAttribute('data-section');
            link.classList.toggle('active', href === '#' + id || section === id);
          });
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach(function (section) { observer.observe(section); });
  }

  if (nav) {
    let ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          nav.classList.toggle('scrolled', window.scrollY > 30);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }
})();

// ===== SCROLL-REVEAL ANIMATIONS =====
(function () {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;
  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
  items.forEach(function (item) { io.observe(item); });
})();

// ===== TYPEWRITER =====
(function () {
  const el = document.getElementById('typewriter-text') || document.getElementById('typewriter');
  if (!el) return;
  const words = ['Sourabh Kumbhar', 'Data Analyst', 'Data Engineer'];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) { el.textContent = words[0]; return; }

  let wordIndex = 0, charIndex = 0, deleting = false;
  function tick() {
    const current = words[wordIndex];
    if (!deleting) {
      charIndex++;
      el.textContent = current.slice(0, charIndex);
      if (charIndex === current.length) { deleting = true; setTimeout(tick, 1200); return; }
    } else {
      charIndex--;
      el.textContent = current.slice(0, charIndex);
      if (charIndex === 0) { deleting = false; wordIndex = (wordIndex + 1) % words.length; }
    }
    setTimeout(tick, deleting ? 40 : 80);
  }
  // Start as soon as the intro is done (falls back to 2.8s if it never fires)
  let startedTyping = false;
  function beginTyping() {
    if (startedTyping) return;
    startedTyping = true;
    tick();
  }
  document.addEventListener('intro:done', beginTyping);
  setTimeout(beginTyping, 2800);
})();

// ===== BACKGROUND PIXEL ANIMATION (perf-capped, pauses when tab hidden) =====
(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  // Skip the decorative canvas entirely on data-saver / very slow connections
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn && (conn.saveData || /^(slow-2g|2g)$/.test(conn.effectiveType || ''))) return;

  const ctx = canvas.getContext('2d');
  let w, h, pixels, rafId;
  const colors = ['#7c6fe0', '#4fb8ab', '#dcd6f0'];

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  function makePixels() {
    const isMobile = w < 700;
    const count = Math.min(isMobile ? 22 : 55, Math.round((w * h) / 32000));
    pixels = Array.from({ length: count }, function () {
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        size: 3 + Math.random() * 4,
        speedY: 0.15 + Math.random() * 0.25,
        speedX: (Math.random() - 0.5) * 0.15,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.18 + Math.random() * 0.22
      };
    });
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    pixels.forEach(function (p) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      p.y -= p.speedY;
      p.x += p.speedX;
      if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
    });
    ctx.globalAlpha = 1;
    rafId = requestAnimationFrame(draw);
  }

  let scrollPauseTimer;
  window.addEventListener('scroll', function () {
    cancelAnimationFrame(rafId);
    clearTimeout(scrollPauseTimer);
    scrollPauseTimer = setTimeout(function () { rafId = requestAnimationFrame(draw); }, 120);
  }, { passive: true });

  document.addEventListener('menu:toggle', function (e) {
    if (e.detail.open) { cancelAnimationFrame(rafId); }
    else { rafId = requestAnimationFrame(draw); }
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { cancelAnimationFrame(rafId); }
    else { rafId = requestAnimationFrame(draw); }
  });

  let resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { resize(); makePixels(); }, 200);
  });

  resize();
  makePixels();
  draw();
})();
