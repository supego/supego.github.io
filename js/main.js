/* ── Year in footer ─────────────────────────────────────────────────── */
document.getElementById('year').textContent = new Date().getFullYear();

/* ── Hero canvas: layered sine-wave / FFT-style visualiser ──────────── */
(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Wave definitions: amplitude, frequency, phase speed, y-offset, opacity
  const waves = [
    { amp: 38,  freq: 0.014, speed: 0.55, yOff: 0.52, alpha: 0.18 },
    { amp: 22,  freq: 0.022, speed: 0.80, yOff: 0.52, alpha: 0.13 },
    { amp: 55,  freq: 0.009, speed: 0.35, yOff: 0.50, alpha: 0.09 },
    { amp: 14,  freq: 0.036, speed: 1.10, yOff: 0.53, alpha: 0.10 },
    { amp: 28,  freq: 0.018, speed: 0.60, yOff: 0.48, alpha: 0.07 },
  ];

  // Bar (FFT-style) definitions at bottom band
  const BAR_COUNT = 48;
  const barPhases = Array.from({ length: BAR_COUNT }, (_, i) => Math.random() * Math.PI * 2);
  const barSpeeds = Array.from({ length: BAR_COUNT }, (_, i) => 0.4 + Math.random() * 0.6);
  const barAmps   = Array.from({ length: BAR_COUNT }, (_, i) => 0.3 + Math.random() * 0.7);

  let time = 0;
  let raf;
  let W, H;

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  function drawWave(wave) {
    ctx.beginPath();
    const yBase = H * wave.yOff;
    ctx.moveTo(0, yBase + Math.sin(time * wave.speed) * wave.amp);
    for (let x = 1; x <= W; x++) {
      const y = yBase + Math.sin((x * wave.freq) + time * wave.speed) * wave.amp;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(200,169,110,${wave.alpha})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawBars() {
    const BAR_ZONE_H = H * 0.18;
    const BAR_ZONE_Y = H * 0.74;
    const barW = W / BAR_COUNT;
    const gap  = Math.max(1, barW * 0.25);

    for (let i = 0; i < BAR_COUNT; i++) {
      const phase = barPhases[i] + time * barSpeeds[i] * 0.45;
      const height = ((Math.sin(phase) * 0.5 + 0.5) * barAmps[i] * BAR_ZONE_H);
      const x = i * barW + gap * 0.5;
      const w = barW - gap;
      const y = BAR_ZONE_Y + BAR_ZONE_H - height;

      const grad = ctx.createLinearGradient(x, y, x, y + height);
      grad.addColorStop(0, 'rgba(200,169,110,0.22)');
      grad.addColorStop(1, 'rgba(200,169,110,0.04)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, height);
    }
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    waves.forEach(drawWave);
    drawBars();
    time += 0.016;
    raf = requestAnimationFrame(frame);
  }

  // Pause animation when hero is not visible (performance)
  const heroSection = document.getElementById('hero');
  if (heroSection && 'IntersectionObserver' in window) {
    const vis = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          if (!raf) raf = requestAnimationFrame(frame);
        } else {
          cancelAnimationFrame(raf);
          raf = null;
        }
      });
    }, { threshold: 0.01 });
    vis.observe(heroSection);
  } else {
    raf = requestAnimationFrame(frame);
  }

  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
})();

/* ── Mobile navigation toggle ───────────────────────────────────────── */
const toggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');

if (toggle && navLinks) {
  toggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Close nav when a link is clicked
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  // Close nav on outside click
  document.addEventListener('click', (e) => {
    if (!navLinks.contains(e.target) && !toggle.contains(e.target)) {
      navLinks.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  });
}

/* ── Header shadow on scroll ────────────────────────────────────────── */
const header = document.getElementById('site-header');
if (header) {
  window.addEventListener('scroll', () => {
    header.style.boxShadow = window.scrollY > 10
      ? '0 1px 30px rgba(0,0,0,.5)'
      : 'none';
  }, { passive: true });
}

/* ── Scroll-triggered reveal ────────────────────────────────────────── */
const revealElements = document.querySelectorAll('.reveal');

if (revealElements.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  revealElements.forEach(el => observer.observe(el));
}
