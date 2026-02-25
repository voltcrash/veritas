/* ═══════════════════════════════════════════════
   scroll-anim.js — Veritas landing animations
═══════════════════════════════════════════════ */

/* ── 1. Particle field ── */
(function initParticles() {
  const canvas = document.getElementById("particleCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const COLORS = ["#1E5128", "#4E9F3D", "#D8E9A8"];
  const COUNT = 55;
  let W, H, particles;

  function resize() {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
  }

  function mkParticle() {
      return {
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 1.6 + 0.4,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          alpha: Math.random() * 0.5 + 0.1,
      };
  }

  function init() {
      resize();
      particles = Array.from({ length: COUNT }, mkParticle);
  }

  function draw() {
      ctx.clearRect(0, 0, W, H);

      // Connection lines
      for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
              const dx = particles[i].x - particles[j].x;
              const dy = particles[i].y - particles[j].y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 110) {
                  ctx.beginPath();
                  ctx.strokeStyle = `rgba(78,159,61,${
                      (1 - dist / 110) * 0.12
                  })`;
                  ctx.lineWidth = 0.8;
                  ctx.moveTo(particles[i].x, particles[i].y);
                  ctx.lineTo(particles[j].x, particles[j].y);
                  ctx.stroke();
              }
          }
      }

      // Dots
      particles.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle =
              p.color +
              Math.round(p.alpha * 255)
                  .toString(16)
                  .padStart(2, "0");
          ctx.fill();

          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > W) p.vx *= -1;
          if (p.y < 0 || p.y > H) p.vy *= -1;
      });

      requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  init();
  draw();
})();

/* ── 2. Typewriter for mock URL ── */
(function initTypewriter() {
  const el = document.getElementById("mockUrl");
  if (!el) return;
  const text = "veritas.app/detect";
  let i = 0;

  function type() {
      if (i <= text.length) {
          el.textContent = text.slice(0, i);
          i++;
          setTimeout(type, 75);
      }
  }

  setTimeout(type, 600);
})();

/* ── 3. Mock card scan + bar animation ── */
(function initMockCard() {
  const scanLine = document.getElementById("scanLine");
  const result = document.getElementById("mockResult");
  const bars = document.querySelectorAll(".lp-bar-fill[data-width]");

  if (!scanLine || !result) return;

  function runDemo() {
      // Start scan
      scanLine.classList.add("scanning");

      // Show result after scan
      setTimeout(() => {
          scanLine.style.opacity = "0";
          result.style.opacity = "1";

          // Animate bars
          bars.forEach((bar, idx) => {
              setTimeout(() => {
                  bar.style.width = bar.dataset.width + "%";
              }, idx * 180);
          });
      }, 1300);

      // Animate ring if visible
      const ring = document.querySelector(".lp-ring-progress");
      if (ring) {
          setTimeout(() => {
              ring.style.strokeDashoffset = "53.4"; // 75% fill
          }, 200);
      }
  }

  // Run once on load
  setTimeout(runDemo, 1200);
})();

/* ── 4. Counter animation ── */
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const duration = 1200;
  const start = performance.now();

  function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(ease * target);
      if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

/* ── 5. Card 3-D tilt ── */
function initTilt(card) {
  card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      card.style.transform = `
          perspective(600px)
          rotateY(${dx * 7}deg)
          rotateX(${-dy * 7}deg)
          translateY(-3px)
      `;
  });

  card.addEventListener("mouseleave", () => {
      card.style.transform = "";
  });
}

document
  .querySelectorAll(".tilt-card")
  .forEach(initTilt);

/* ── 6. SVG chart gradient defs ── */
(function injectGradients() {
  const svg = document.getElementById("misChart");
  if (!svg) return;

  const defs = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "defs"
  );

  defs.innerHTML = `
      <linearGradient id="viralGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#ef4444" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="#ef4444" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="manualGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#60a5fa" stop-opacity="0.14"/>
          <stop offset="100%" stop-color="#60a5fa" stop-opacity="0"/>
      </linearGradient>
  `;

  svg.prepend(defs);
})();

/* ── 7. Chart interactive tooltip ── */
(function initChartTooltip() {
  const svg = document.getElementById("misChart");
  const tooltip = document.getElementById("chartTooltip");
  if (!svg || !tooltip) return;

  const ttBg = tooltip.querySelector(".lp-tooltip-bg");
  const ttText1 = document.getElementById("ttText1");
  const ttText2 = document.getElementById("ttText2");
  const ttLine = document.getElementById("ttLine");
  const ttDotV = document.getElementById("ttDotV");
  const ttDotM = document.getElementById("ttDotM");

  const X_LABELS = ["0m","10m","30m","1h","2h","4h","8h","12h","24h"];
  const X_POS =    [ 60,  150,  240, 330, 420, 510, 600,  690,  760];

  // Viral Y values at each x point
  const VIRAL_Y  = [230, 170, 100,  66,  52,  45,  42,   40,   38];
  const MANUAL_Y = [230, 228, 222, 210, 196, 170, 132,   96,   68];

  function lerp(arr, xPos) {
      for (let i = 1; i < X_POS.length; i++) {
          if (xPos <= X_POS[i]) {
              const t = (xPos - X_POS[i - 1]) / (X_POS[i] - X_POS[i - 1]);
              return arr[i - 1] + t * (arr[i] - arr[i - 1]);
          }
      }
      return arr[arr.length - 1];
  }

  function nearestLabel(xPos) {
      let best = 0,
          bestDist = Infinity;
      X_POS.forEach((x, i) => {
          const d = Math.abs(x - xPos);
          if (d < bestDist) {
              bestDist = d;
              best = i;
          }
      });
      return X_LABELS[best];
  }

  svg.addEventListener("mousemove", (e) => {
      const rect = svg.getBoundingClientRect();
      const scaleX = 780 / rect.width;
      const svgX = (e.clientX - rect.left) * scaleX;

      if (svgX < 60 || svgX > 760) {
          tooltip.style.display = "none";
          return;
      }

      tooltip.style.display = "block";
      const vy = lerp(VIRAL_Y, svgX);
      const my = lerp(MANUAL_Y, svgX);
      const label = nearestLabel(svgX);

      // Tooltip box
      const bx = svgX + 10;
      const by = Math.min(vy, my) - 64;
      ttBg.setAttribute("x", bx);
      ttBg.setAttribute("y", by);
      ttText1.setAttribute("x", bx + 8);
      ttText1.setAttribute("y", by + 16);
      ttText1.textContent = `Time: ${label}`;
      ttText2.setAttribute("x", bx + 8);
      ttText2.setAttribute("y", by + 34);
      ttText2.textContent = `Viral ${Math.round(
          ((230 - vy) / 192) * 100
      )}%  Verified ${Math.round(((230 - my) / 192) * 100)}%`;

      // Vertical line
      ttLine.setAttribute("x1", svgX);
      ttLine.setAttribute("y1", 20);
      ttLine.setAttribute("x2", svgX);
      ttLine.setAttribute("y2", 230);

      // Dots
      ttDotV.setAttribute("cx", svgX);
      ttDotV.setAttribute("cy", vy);
      ttDotM.setAttribute("cx", svgX);
      ttDotM.setAttribute("cy", my);
  });

  svg.addEventListener("mouseleave", () => {
      tooltip.style.display = "none";
  });
})();

/* ── 8. IntersectionObserver — all scroll reveals ── */
(function initScrollReveal() {
  const io = new IntersectionObserver(
      (entries) => {
          entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              const el = entry.target;

              // Stagger for feature rows
              const stagger = parseInt(el.dataset.stagger ?? "0", 10);
              setTimeout(() => {
                  el.classList.add("is-visible");

                  // Counter inside this row?
                  el.querySelectorAll(".lp-counter").forEach(
                      animateCounter
                  );

                  // Speed ring inside this row?
                  const ring = el.querySelector(".lp-ring-progress");
                  if (ring) {
                      setTimeout(
                          () => (ring.style.strokeDashoffset = "53.4"),
                          200
                      );
                  }

                  // Bars inside this row?
                  el.querySelectorAll(".lp-bar-fill[data-width]").forEach(
                      (bar, i) => {
                          setTimeout(
                              () => (bar.style.width = bar.dataset.width + "%"),
                              i * 180
                          );
                      }
                  );
              }, stagger * 120);

              io.unobserve(el);
          });
      },
      { threshold: 0.15 }
  );

  document
      .querySelectorAll(
          ".lp-feature-row, .lp-privacy-banner-inner, .reveal-up, .lp-graph-section"
      )
      .forEach((el) => io.observe(el));
})();

/* ── 9. Navbar scroll tint ── */
(function initNavbar() {
  window.addEventListener(
      "scroll",
      () => {
          document
              .querySelector("nav, header")
              ?.classList.toggle("navbar-scrolled", window.scrollY > 40);
      },
      { passive: true }
  );
})();