/**
 * Veritas Scroll Animation Engine
 * - Content emerges from the lotus (clip-path reveal)
 * - Lotus scales as you scroll into the section
 * - Feature rows slide in on scroll
 * - Stats counter, testimonials, parallax
 */

(function () {
  'use strict';

  function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function scrollProgress(el, startOffset, endOffset) {
    const rect = el.getBoundingClientRect();
    const wh = window.innerHeight;
    const top = rect.top - wh * (1 - startOffset);
    const range = rect.height + wh * (endOffset - startOffset + 1);
    return clamp(-top / range, 0, 1);
  }

  /* ─── Lotus bloom: content emerges from lotus ─────── */
  function initLotusReveal() {
    const section = document.querySelector('.lp-bloom-section');
    const lotusWrap = document.querySelector('.lp-bloom-lotus');
    const reveal = document.querySelector('.lp-bloom-reveal');
    if (!section || !lotusWrap || !reveal) return;

    function tick() {
      const p = scrollProgress(section, 0, 0.6);

      // Phase 0→0.25: lotus grows from small
      // Phase 0.25→0.5: lotus holds, content starts to emerge (clip-path expands)
      // Phase 0.5→1: content fully revealed, lotus fades slightly

      let lotusScale, lotusOpacity, clipRadius;

      if (p < 0.25) {
        const t = p / 0.25;
        lotusScale = lerp(0.3, 1, easeOutCubic(t));
        lotusOpacity = lerp(0, 1, t);
        clipRadius = 0;
      } else if (p < 0.5) {
        lotusScale = 1;
        lotusOpacity = 1;
        const t = (p - 0.25) / 0.25;
        clipRadius = lerp(0, 80, easeOutCubic(t));
      } else {
        const t = (p - 0.5) / 0.5;
        lotusScale = lerp(1, 0.9, t * 0.3);
        lotusOpacity = lerp(1, 0.85, t * 0.2);
        clipRadius = lerp(80, 150, easeOutCubic(t));
      }

      lotusWrap.style.transform = `scale(${lotusScale})`;
      lotusWrap.style.opacity = lotusOpacity;
      reveal.style.clipPath = `circle(${clipRadius}% at 50% 0%)`;
    }

    window.addEventListener('scroll', tick, { passive: true });
    tick();
  }

  /* ─── Hero text parallax ───────────────────────── */
  function initHeroText() {
    const inner = document.querySelector('.lp-hero-inner');
    const hero = document.querySelector('.lp-hero');
    if (!inner || !hero) return;

    function tick() {
      const p = clamp(window.scrollY / hero.offsetHeight, 0, 1);
      const ty = lerp(0, -40, easeOutCubic(p));
      const op = lerp(1, 0, easeInOutQuad(clamp(p * 1.5, 0, 1)));
      inner.style.transform = `translateY(${ty}px)`;
      inner.style.opacity = op;
    }
    window.addEventListener('scroll', tick, { passive: true });
    tick();
  }

  /* ─── Slide-in on scroll ──────────────────────── */
  function initSlideIn() {
    const items = document.querySelectorAll(
      '.lp-feature-row, .lp-testimonial-card, .lp-stat, .lp-privacy-banner-inner'
    );
    if (!items.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    items.forEach((el, i) => {
      el.style.transitionDelay = `${(i % 3) * 80}ms`;
      observer.observe(el);
    });
  }

  /* ─── Animated stat counters ──────────────────── */
  function initCounters() {
    const nums = document.querySelectorAll('.lp-stat-num');
    if (!nums.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const raw = el.textContent.trim();
        const match = raw.match(/([\d.]+)/);
        if (!match) return;
        const target = parseFloat(match[1]);
        const suffix = raw.replace(match[1], '');
        let start = null;
        const duration = 1200;

        function step(ts) {
          if (!start) start = ts;
          const elapsed = ts - start;
          const t = clamp(elapsed / duration, 0, 1);
          const val = lerp(0, target, easeOutCubic(t));
          el.textContent = (Number.isInteger(target) ? Math.round(val) : val.toFixed(1)) + suffix;
          if (t < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        observer.unobserve(el);
      });
    }, { threshold: 0.5 });

    nums.forEach(el => observer.observe(el));
  }

  /* ─── Feature card parallax ───────────────────── */
  function initFeatureParallax() {
    const cards = document.querySelectorAll('.lp-vis-card');
    if (!cards.length) return;

    function tick() {
      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const wh = window.innerHeight;
        const center = rect.top + rect.height / 2 - wh / 2;
        const p = clamp(center / wh, -1, 1);
        card.style.transform = `translateY(${p * 18}px)`;
      });
    }
    window.addEventListener('scroll', tick, { passive: true });
    tick();
  }

  /* ─── Navbar on scroll ────────────────────────── */
  function initNavbar() {
    const navbar = document.querySelector('.top-navbar');
    if (!navbar) return;
    function tick() {
      navbar.classList.toggle('navbar-scrolled', window.scrollY > 40);
    }
    window.addEventListener('scroll', tick, { passive: true });
    tick();
  }

  function init() {
    initLotusReveal();
    initHeroText();
    initSlideIn();
    initCounters();
    initFeatureParallax();
    initNavbar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  document.addEventListener('enhancedload', init);
})();
