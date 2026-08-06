// Highlight the nav link for the section currently in view
const sections = document.querySelectorAll('section[id], nav#top');
const navLinks = document.querySelectorAll('.navlink');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.getAttribute('id');
      navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
      });
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });

sections.forEach(section => observer.observe(section));

// Soft drifting pixel background
(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d');
  let w, h, pixels;
  const colors = ['#7c6fe0', '#4fb8ab', '#dcd6f0'];

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  function makePixels() {
    const count = Math.round((w * h) / 22000); // density scales with screen size
    pixels = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      size: 3 + Math.random() * 4,
      speedY: 0.15 + Math.random() * 0.25,
      speedX: (Math.random() - 0.5) * 0.15,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 0.18 + Math.random() * 0.22
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    pixels.forEach(p => {
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
    if (!reduceMotion) requestAnimationFrame(draw);
  }

  resize();
  makePixels();
  draw();
  window.addEventListener('resize', () => { resize(); makePixels(); });
})();

// Typewriter effect under the photo
(function () {
  const el = document.getElementById('typewriter-text');
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
      if (charIndex === current.length) {
        deleting = true;
        setTimeout(tick, 1200);
        return;
      }
    } else {
      charIndex--;
      el.textContent = current.slice(0, charIndex);
      if (charIndex === 0) {
        deleting = false;
        wordIndex = (wordIndex + 1) % words.length;
      }
    }
    setTimeout(tick, deleting ? 40 : 80);
  }
  tick();
})();
