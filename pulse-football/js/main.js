/* =========================================================
   PULSE — main.js
   Lenis smooth scroll + GSAP ScrollTrigger driven animations
   ========================================================= */

(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;

  gsap.registerPlugin(ScrollTrigger, SplitText);

  /* ---------------------------------------------------------
     REUSABLE: reveal-in-then-fade-out-on-exit — fully scroll-bound.
     Every normal text block on the site uses this. Both halves are
     `scrub: true`, so the animation's progress IS scroll position,
     not a timer: scroll a little, it moves a little; stop
     scrolling, it stops too. The entrance and exit windows sit on
     opposite ends of the element's transit through the viewport
     (bottom -> mid for reveal, mid -> top for the exit), so they
     never overlap or fight over the same scroll pixels.
     --------------------------------------------------------- */
  function revealAndFade(targets, opts) {
    opts = opts || {};
    const rise = opts.y != null ? opts.y : 30;
    const stagger = opts.stagger || 0;
    gsap.utils.toArray(targets).forEach((el, i) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: rise, filter: "blur(6px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: `top ${95 - stagger * i * 40}%`,
            end: "top 55%",
            scrub: true,
          },
        }
      );
      if (reduceMotion) return;
      gsap.to(el, {
        opacity: 0,
        y: -rise * 0.7,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top 12%",
          end: "top -30%",
          scrub: true,
        },
      });
    });
  }

  /* ---------------------------------------------------------
     REUSABLE: character-stagger reveal for big display headlines.
     Splits into characters, each one blurs/rises into place with a
     tiny per-character delay, scrubbed by scroll — a much more
     "amazing" materialize feel than a flat fade for the few large
     headlines on the page (feature titles, galaxy title).
     --------------------------------------------------------- */
  function charReveal(el) {
    if (!el || reduceMotion) return;
    const split = new SplitText(el, { type: "chars", charsClass: "ch" });
    gsap.set(split.chars, { display: "inline-block" });
    gsap.fromTo(
      split.chars,
      { opacity: 0, yPercent: 60, filter: "blur(10px)", rotateZ: 4 },
      {
        opacity: 1,
        yPercent: 0,
        filter: "blur(0px)",
        rotateZ: 0,
        stagger: 0.015,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top 90%",
          end: "top 45%",
          scrub: true,
        },
      }
    );
  }

  /* ---------------------------------------------------------
     1. LENIS SMOOTH SCROLL <> GSAP TICKER SYNC
     --------------------------------------------------------- */
  let lenis;
  if (!reduceMotion) {
    lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.2,
    });

    lenis.on("scroll", ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------------------------------------------------------
     2. PRELOADER
     --------------------------------------------------------- */
  const preloader = document.querySelector(".preloader");
  const fill = document.querySelector(".preloader__fill");
  const pct = document.querySelector(".preloader__pct");

  function killPreloader() {
    const tl = gsap.timeline({
      onComplete: () => {
        preloader.style.display = "none";
        document.body.classList.add("is-ready");
        runHeroIntro();
      },
    });
    tl.to(fill, { width: "100%", duration: 0.4, ease: "power2.out" })
      .to(preloader, { yPercent: -100, duration: 0.9, ease: "power4.inOut" }, "+=0.15");
  }

  if (reduceMotion) {
    preloader.style.display = "none";
    document.body.classList.add("is-ready");
    runHeroIntro();
  } else {
    let progress = { v: 0 };
    const counter = gsap.to(progress, {
      v: 100,
      duration: 1.6,
      ease: "power1.inOut",
      onUpdate: () => {
        const val = Math.floor(progress.v);
        fill.style.width = val + "%";
        pct.textContent = String(val).padStart(2, "0") + "%";
      },
      onComplete: killPreloader,
    });
  }

  /* ---------------------------------------------------------
     3. CUSTOM CURSOR
     --------------------------------------------------------- */
  if (!isTouch) {
    const dot = document.querySelector(".cursor-dot");
    const ring = document.querySelector(".cursor-ring");
    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ringPos = { x: pos.x, y: pos.y };

    window.addEventListener("mousemove", (e) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      gsap.to(dot, { x: pos.x, y: pos.y, duration: 0.12, ease: "power2.out" });
    });

    gsap.ticker.add(() => {
      ringPos.x += (pos.x - ringPos.x) * 0.15;
      ringPos.y += (pos.y - ringPos.y) * 0.15;
      gsap.set(ring, { x: ringPos.x, y: ringPos.y });
    });

    document.querySelectorAll("a, button").forEach((el) => {
      el.addEventListener("mouseenter", () => document.body.classList.add("cursor-hover"));
      el.addEventListener("mouseleave", () => document.body.classList.remove("cursor-hover"));
    });

    /* -------------------------------------------------------
       3b. GLITTER TRAIL — small holo-colored sparks spawn as the
       cursor moves and drift off, fading out. Pure canvas, no DOM
       node per particle, so it stays cheap even trailing fast
       mouse movement.
       ------------------------------------------------------- */
    if (!reduceMotion) {
      const glitterCanvas = document.querySelector(".cursor-glitter");
      const gctx = glitterCanvas && glitterCanvas.getContext("2d");
      if (glitterCanvas && gctx) {
        const DPR = Math.min(window.devicePixelRatio || 1, 2);
        const COLORS = ["#22d3ee", "#8b5cf6", "#f472b6", "#b6ff3a"];
        let particles = [];
        let lastSpawn = { x: pos.x, y: pos.y };

        function sizeGlitter() {
          glitterCanvas.width = window.innerWidth * DPR;
          glitterCanvas.height = window.innerHeight * DPR;
        }
        sizeGlitter();
        window.addEventListener("resize", sizeGlitter);

        function spawn(x, y) {
          const count = 2 + Math.floor(Math.random() * 3);
          for (let i = 0; i < count; i++) {
            particles.push({
              x,
              y,
              vx: (Math.random() - 0.5) * 2,
              vy: (Math.random() - 0.5) * 2 - 0.4,
              size: (Math.random() * 4 + 1.5) * DPR,
              life: 0,
              maxLife: 0.6 + Math.random() * 0.7,
              spin: Math.random() * Math.PI * 2,
              twinkle: Math.random() * Math.PI * 2,
              color: COLORS[(Math.random() * COLORS.length) | 0],
            });
          }
          if (particles.length > 420) particles.splice(0, particles.length - 420);
        }

        window.addEventListener("mousemove", (e) => {
          // spawn based on distance travelled, not every pixel event —
          // keeps the trail density consistent regardless of mouse speed
          const dx = e.clientX - lastSpawn.x;
          const dy = e.clientY - lastSpawn.y;
          if (dx * dx + dy * dy > 70) {
            spawn(e.clientX, e.clientY);
            lastSpawn = { x: e.clientX, y: e.clientY };
          }
        });

        function drawSpark(cx, cy, size, alpha, color) {
          gctx.globalAlpha = alpha;
          gctx.fillStyle = color;
          gctx.beginPath();
          gctx.moveTo(cx, cy - size);
          gctx.quadraticCurveTo(cx + size * 0.15, cy - size * 0.15, cx + size, cy);
          gctx.quadraticCurveTo(cx + size * 0.15, cy + size * 0.15, cx, cy + size);
          gctx.quadraticCurveTo(cx - size * 0.15, cy + size * 0.15, cx - size, cy);
          gctx.quadraticCurveTo(cx - size * 0.15, cy - size * 0.15, cx, cy - size);
          gctx.closePath();
          gctx.fill();
        }

        gsap.ticker.add((time, deltaMs) => {
          const dt = Math.min(0.05, deltaMs / 1000);
          gctx.clearRect(0, 0, glitterCanvas.width, glitterCanvas.height);
          for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life += dt;
            if (p.life >= p.maxLife) {
              particles.splice(i, 1);
              continue;
            }
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.015; // gentle gravity drift
            const t = p.life / p.maxLife;
            const twinkle = 0.75 + 0.25 * Math.sin(p.twinkle + t * 14);
            const alpha = (1 - t) * twinkle;
            const size = p.size * (1 - t * 0.4);
            drawSpark(p.x * DPR, p.y * DPR, size, alpha, p.color);
          }
          gctx.globalAlpha = 1;
        });
      }
    }
  }

  /* ---------------------------------------------------------
     4. NAV — hide on scroll down, show on scroll up
     --------------------------------------------------------- */
  const nav = document.querySelector(".nav");
  const navProgressFill = document.querySelector(".nav__progress-fill");
  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => {
      if (self.direction === 1 && self.scroll() > 200) {
        gsap.to(nav, { yPercent: -120, duration: 0.4, ease: "power2.out" });
      } else {
        gsap.to(nav, { yPercent: 0, duration: 0.4, ease: "power2.out" });
      }
      if (navProgressFill) {
        gsap.set(navProgressFill, { width: self.progress * 100 + "%" });
      }
    },
  });

  /* ---------------------------------------------------------
     5. HERO INTRO — fully scroll-bound: reveal, hold, disappear,
     all as ONE scrubbed timeline against the hero's own natural
     scroll position (it's normal, unpinned content — the video
     lives fixed in the background instead of inside this section).
     --------------------------------------------------------- */
  function runHeroIntro() {
    const lines = document.querySelectorAll(".hero__title .line span");
    const eyebrow = document.querySelector(".hero__eyebrow");
    const foot = document.querySelector(".hero__foot");

    gsap.set(lines, { yPercent: 120 });
    gsap.set(eyebrow, { opacity: 0, y: 14 });
    gsap.set(foot, { opacity: 0, y: 20 });

    if (reduceMotion) {
      gsap.set(lines, { yPercent: 0 });
      gsap.set(eyebrow, { opacity: 1, y: 0 });
      gsap.set(foot, { opacity: 1, y: 0 });
      return;
    }

    gsap
      .timeline({
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "+=50%",
          scrub: true,
        },
      })
      // reveal: 0 -> 12%
      .to(eyebrow, { opacity: 1, y: 0, ease: "power2.out", duration: 0.06 }, 0)
      .to(lines, { yPercent: 0, stagger: 0.03, ease: "power2.out", duration: 0.1 }, 0.02)
      .to(foot, { opacity: 1, y: 0, ease: "power2.out", duration: 0.06 }, 0.08)
      // hold, fully readable: 12% -> 32%
      .to(".hero__content", { opacity: 1, duration: 0.2 }, 0.12)
      // disappear as the next section (galaxy) rises into view: 32% -> 62%
      .to(".hero__content", { opacity: 0, y: -40, scale: 0.96, ease: "power2.in", duration: 0.3 }, 0.32);
  }

  /* ---------------------------------------------------------
     5b. GALAXY TEXT — reveal, hold, disappear, all as ONE scrubbed
     timeline tied to the galaxy's own pin.
     --------------------------------------------------------- */
  if (document.querySelector(".galaxy__content")) {
    gsap.set(".galaxy__content", { opacity: 0, y: 36 });

    gsap.timeline({
      scrollTrigger: {
        trigger: ".galaxy",
        start: "top top",
        end: "+=130%",
        scrub: true,
      },
    })
      .to(".galaxy__content", { opacity: 1, y: 0, duration: 0.14, ease: "power2.out" }, 0)
      .to(".galaxy__content", { opacity: 1, y: 0, duration: 0.16 }, 0.14) // hold, fully readable
      .to(".galaxy__content", { opacity: 0, y: -30, duration: 0.16, ease: "power2.in" }, 0.3);

    charReveal(document.querySelector(".galaxy__title"));
  }

  /* ---------------------------------------------------------
     5c. GALAXY VIGNETTE — blurred, darkened corners that fade in as
     the section arrives and back out as it leaves, tied to the same
     scroll range as the gather. Boosts contrast for the particles
     (that's the point of it — not decoration) without ever touching
     the clear center where the disc and text actually sit.
     --------------------------------------------------------- */
  if (document.querySelector(".galaxy__vignette")) {
    gsap.timeline({
      scrollTrigger: {
        trigger: ".galaxy",
        start: "top top",
        end: "+=130%",
        scrub: true,
      },
    })
      .to(".galaxy__vignette", { opacity: 1, duration: 0.15, ease: "power2.out" }, 0)
      .to(".galaxy__vignette", { opacity: 1, duration: 0.6 }, 0.15) // hold through the whole gather + idle spin
      .to(".galaxy__vignette", { opacity: 0, duration: 0.25, ease: "power2.in" }, 0.75);
  }

  /* ---------------------------------------------------------
     6. MARQUEE — driven directly by scroll position, not an
     independent timer. Two cloned tracks sit side by side and
     their combined offset is read straight off how far the page
     has scrolled — scroll down, the ticker moves one way; scroll
     up, it reverses. It never moves on its own.
     --------------------------------------------------------- */
  document.querySelectorAll(".marquee__track").forEach((track) => {
    const clone = track.cloneNode(true);
    track.parentElement.appendChild(clone);
    const tracks = track.parentElement.querySelectorAll(".marquee__track");

    if (reduceMotion) return;

    ScrollTrigger.create({
      trigger: track.parentElement,
      start: "top bottom",
      end: "bottom top",
      onUpdate: (self) => {
        const raw = (self.scroll() * 0.05) % 100;
        gsap.set(tracks, { xPercent: -raw });
      },
    });
  });

  /* ---------------------------------------------------------
     7. FEATURE SECTIONS — text-only "product reveal" moments.
     Big display title gets the character-stagger materialize;
     body/list get the standard reveal-and-fade.
     --------------------------------------------------------- */
  document.querySelectorAll(".feature__title").forEach(charReveal);
  revealAndFade(".feature__body, .feature__list");
  revealAndFade(".feature .eyebrow");

  /* ---------------------------------------------------------
     8. STATS — count up, driven directly by scroll position (not
     a timer). Scrub the count from 0 to its target across the
     card's transit through the lower half of the viewport; scroll
     up and it counts back down, since it's just reading progress.
     --------------------------------------------------------- */
  document.querySelectorAll(".stat__num").forEach((el) => {
    const target = parseFloat(el.dataset.value);
    const suffix = el.dataset.suffix || "";
    const counter = { v: 0 };
    const numSpan = el.querySelector(".num-value");

    function render() {
      const val = target % 1 === 0 ? Math.floor(counter.v) : counter.v.toFixed(1);
      numSpan.textContent = val + suffix;
    }

    if (reduceMotion) {
      counter.v = target;
      render();
      return;
    }

    gsap.to(counter, {
      v: target,
      ease: "none",
      onUpdate: render,
      scrollTrigger: {
        trigger: el,
        start: "top 92%",
        end: "top 45%",
        scrub: true,
      },
    });
  });

  charReveal(document.querySelector(".stats__intro .feature__title"));
  revealAndFade(".stats__intro .eyebrow");
  revealAndFade(".stat", { y: 24, duration: 0.7, stagger: 0.05 });

  /* ---------------------------------------------------------
     9. STATEMENT — word by word scroll reveal
     --------------------------------------------------------- */
  document.querySelectorAll(".statement__text").forEach((el) => {
    const split = new SplitText(el, { type: "words", wordsClass: "word" });
    gsap.to(split.words, {
      color: "var(--ink)",
      textShadow: "var(--text-shadow)",
      stagger: 0.5,
      scrollTrigger: {
        trigger: el,
        start: "top 75%",
        end: "bottom 40%",
        scrub: true,
      },
    });
  });

  /* ---------------------------------------------------------
     10. CTA fade-ins — the CTA's backdrop is the site's one fixed
     video; only the sparkle canvas + text sit on top of it.
     --------------------------------------------------------- */
  gsap.utils.toArray(".cta__content > *").forEach((el, i) => {
    gsap.fromTo(
      el,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        ease: "none",
        scrollTrigger: {
          trigger: ".cta",
          start: `top ${80 - i * 12}%`,
          end: `top ${30 - i * 12}%`,
          scrub: true,
        },
      }
    );
  });
  charReveal(document.querySelector(".cta__title"));

  /* ---------------------------------------------------------
     11. SMOOTH ANCHOR LINKS
     --------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) {
        lenis.scrollTo(target, { offset: -20, duration: 1.4 });
      } else {
        target.scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  /* ---------------------------------------------------------
     12. RE-MEASURE AFTER LATE-ARRIVING CONTENT — debounced.
     All the triggers above are registered synchronously as soon as
     this script runs — before web fonts finish swapping in (which
     can reflow text height) and before the video's metadata loads.
     Either can shift section heights *after* ScrollTrigger already
     did its math. Debouncing collapses the resulting burst of
     refresh() calls into one quiet recalculation instead of several
     back-to-back ones (which can nudge an active pin and read as
     jitter).
     --------------------------------------------------------- */
  let refreshTimer = null;
  function scheduleRefresh(delay) {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      ScrollTrigger.refresh();
    }, delay || 120);
  }

  window.addEventListener("resize", () => scheduleRefresh(200));

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => scheduleRefresh(80));
  }
  window.addEventListener("load", () => scheduleRefresh(80));

  const imgs = Array.from(document.images || []);
  Promise.all(
    imgs.map((img) => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()))
  ).then(() => scheduleRefresh(80));

  // one more safety net for anything slow to settle (e.g. video metadata)
  scheduleRefresh(1400);
})();
