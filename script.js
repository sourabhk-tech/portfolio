// ===== PRELOADER + photo dissolve to hero =====
(function () {
  const pre = document.getElementById('preloader');
  if (!pre) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const prePhotoWrap = document.getElementById('pre-photo-wrap');
  const prePhoto = document.getElementById('pre-photo');
  const heroPhoto = document.getElementById('hero-photo');
  const heroBlob = document.getElementById('hero-blob');

  if (heroPhoto) heroPhoto.classList.add('waiting');

  function exitZoom() { pre.classList.add('exit'); }
  function barsOut() { pre.classList.add('bars-out'); }
  function hide() { pre.classList.add('hidden'); }
  function destroy() {
    if (pre.parentNode) pre.remove();
  }

  function flyPhotoToHero() {
    if (reduceMotion || !prePhotoWrap || !heroBlob || !heroPhoto) {
      if (heroPhoto) {
        heroPhoto.classList.remove('waiting');
        heroPhoto.classList.add('loaded');
      }
      return;
    }

    const from = prePhotoWrap.getBoundingClientRect();
    const toInner = heroBlob.querySelector('.blob-inner') || heroBlob;
    const to = toInner.getBoundingClientRect();

    const flyer = document.createElement('div');
    flyer.className = 'photo-flyer';
    flyer.style.width = from.width + 'px';
    flyer.style.height = from.height + 'px';
    flyer.style.left = from.left + 'px';
    flyer.style.top = from.top + 'px';

    const img = document.createElement('img');
    img.src = prePhoto ? prePhoto.src : 'Files/photograph.jpg';
    img.alt = '';
    flyer.appendChild(img);
    document.body.appendChild(flyer);

    flyer.offsetHeight; // reflow

    requestAnimationFrame(function () {
      flyer.style.width = to.width + 'px';
      flyer.style.height = to.height + 'px';
      flyer.style.left = to.left + 'px';
      flyer.style.top = to.top + 'px';
    });

    setTimeout(function () {
      heroPhoto.classList.remove('waiting');
      heroPhoto.classList.add('loaded');
      flyer.classList.add('done');
      setTimeout(function () { flyer.remove(); }, 350);
    }, 850);
  }

  function runSequence() {
    // Reveal hero text under the wipe so the page is ready when bars open
    document.querySelectorAll('.hero .reveal').forEach(function (el) {
      el.classList.add('in-view');
      el.classList.add('in');
    });

    if (reduceMotion) {
      hide();
      setTimeout(destroy, 400);
      if (heroPhoto) {
        heroPhoto.classList.remove('waiting');
        heroPhoto.classList.add('loaded');
      }
      return;
    }

    // zoom → fly photo → bars reveal the real page immediately (transparent
    // background fix) → quick cleanup fade → destroy once the last bar clears
    setTimeout(exitZoom, 1400);
    setTimeout(flyPhotoToHero, 1550);
    setTimeout(barsOut, 1850);
    setTimeout(hide, 2000);
    setTimeout(destroy, 2700);
  }

  if (document.readyState === 'complete') {
    runSequence();
  } else {
    window.addEventListener('load', runSequence);
    // Safety net: never block the site for more than ~4s
    setTimeout(function () {
      if (pre.parentNode && !pre.classList.contains('exit')) {
        exitZoom();
        setTimeout(flyPhotoToHero, 150);
        setTimeout(barsOut, 450);
        setTimeout(hide, 600);
        setTimeout(destroy, 1300);
      }
    }, 3000);
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
  // Start after intro finishes
  setTimeout(tick, 2800);
})();

// ===== BACKGROUND PIXEL ANIMATION (perf-capped, pauses when tab hidden) =====
(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

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
