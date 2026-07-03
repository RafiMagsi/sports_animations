/* =========================================================
   ZEN FOOTBALL — main.js
   Lenis smooth scroll + GSAP ScrollTrigger driven animations
   ========================================================= */

(function () {
  "use strict";

  // HARD FAILSAFE — completely independent of GSAP/ScrollTrigger/
  // SplitText or anything below. If any of those fail to load, or if
  // any script error happens anywhere during setup, this plain
  // setTimeout still fires and forces the preloader out of the way so
  // a visitor is never permanently stuck looking at "00%". This is the
  // one thing on the page that cannot be broken by a bug elsewhere.
  window.setTimeout(function () {
    var p = document.querySelector(".preloader");
    if (p && p.style.display !== "none") {
      p.style.display = "none";
      document.body.classList.add("is-ready");
    }
  }, 4000);

  try {

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;

  gsap.registerPlugin(ScrollTrigger, SplitText);

  // PER-FEATURE SAFETY NET — same pattern as effects.js's safeRun. Before
  // this, a SINGLE error anywhere in this file (a bad selector, a
  // section that's missing on the page, a plugin edge case) would throw
  // out of the one giant try/catch below and silently cancel every
  // animation that hadn't registered yet — which reads exactly like
  // "nothing is animating" even though most of the code is fine. Each
  // independent feature below now runs in its own try/catch so one
  // broken section can't take the rest down with it.
  function safeRun(name, fn) {
    try {
      fn();
    } catch (err) {
      console.error("main.js: " + name + " failed to initialize:", err);
    }
  }

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
    // three visibly different "modern" recipes instead of one flat
    // fade+rise everywhere — tilt (a 3D tip-up out of the video, like
    // the text has real thickness), punch (scales in from small with a
    // springy overshoot), swing (rotates in off-axis then settles) —
    // picked per call so nearby sections don't all move identically
    const variant = opts.variant || "tilt";

    gsap.utils.toArray(targets).forEach((el, i) => {
      let fromVars, toVars, exitVars, entranceEase;

      if (variant === "punch") {
        fromVars = { opacity: 0, y: rise * 0.4, scale: 0.62, filter: "blur(9px)" };
        toVars = { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" };
        exitVars = { opacity: 0, scale: 1.22, filter: "blur(10px)" };
        entranceEase = "back.out(1.6)";
      } else if (variant === "swing") {
        gsap.set(el, { transformPerspective: 700, transformOrigin: "50% 100%" });
        fromVars = { opacity: 0, y: rise, rotate: i % 2 === 0 ? -9 : 9, filter: "blur(9px)" };
        toVars = { opacity: 1, y: 0, rotate: 0, filter: "blur(0px)" };
        exitVars = { opacity: 0, y: -rise * 0.8, rotate: i % 2 === 0 ? 7 : -7, filter: "blur(10px)" };
        entranceEase = "power3.out";
      } else {
        // "tilt" — a real 3D tip: the element rotates up out of a
        // backward lean into flat-on, like it has physical thickness
        gsap.set(el, { transformPerspective: 800, transformOrigin: "50% 100%" });
        fromVars = { opacity: 0, y: rise * 1.4, rotateX: -28, scale: 0.94, filter: "blur(10px)" };
        toVars = { opacity: 1, y: 0, rotateX: 0, scale: 1, filter: "blur(0px)" };
        exitVars = { opacity: 0, y: -rise * 0.9, rotateX: 20, scale: 1.04, filter: "blur(10px)" };
        entranceEase = "power2.out";
      }

      gsap.fromTo(el, fromVars, {
        ...toVars,
        ease: entranceEase,
        scrollTrigger: {
          trigger: el,
          start: `top ${95 - stagger * i * 40}%`,
          end: "top 55%",
          scrub: true,
        },
      });
      if (reduceMotion) return;
      gsap.to(el, {
        ...exitVars,
        ease: "power1.in",
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
    gsap.set(split.chars, { display: "inline-block", transformPerspective: 500 });
    gsap.fromTo(
      split.chars,
      { opacity: 0, yPercent: 70, rotateX: -70, rotateZ: 6, filter: "blur(11px)" },
      {
        opacity: 1,
        yPercent: 0,
        rotateX: 0,
        rotateZ: 0,
        filter: "blur(0px)",
        stagger: 0.015,
        ease: "power2.out",
        scrollTrigger: {
          trigger: el,
          start: "top 90%",
          end: "top 45%",
          scrub: true,
        },
      }
    );
    // disappear too, not just reveal — floats back out of focus as it
    // scrolls past, same blur+fade language as everything else on the
    // site instead of just sitting there once revealed
    gsap.set(el, { transformPerspective: 700 });
    gsap.to(el, {
      opacity: 0,
      y: -24,
      rotateX: 16,
      scale: 1.03,
      filter: "blur(10px)",
      ease: "power1.in",
      scrollTrigger: {
        trigger: el,
        start: "top 8%",
        end: "top -25%",
        scrub: true,
      },
    });
  }

  /* ---------------------------------------------------------
     1. LENIS SMOOTH SCROLL <> GSAP TICKER SYNC
     --------------------------------------------------------- */
  let lenis;
  safeRun("lenisSync", function () {
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
  });

  /* ---------------------------------------------------------
     2. PRELOADER — the reveal calls at the end are each wrapped
     individually so a failure in the hero flash/intro sequence can't
     prevent the preloader from finishing its own job of getting out
     of the way.
     --------------------------------------------------------- */
  const preloader = document.querySelector(".preloader");
  const fill = document.querySelector(".preloader__fill");
  const pct = document.querySelector(".preloader__pct");

  function revealHero() {
    safeRun("heroIntro", runHeroIntro);
    safeRun("heroFlash", runHeroFlash);
  }

  function killPreloader() {
    const tl = gsap.timeline({
      onComplete: () => {
        preloader.style.display = "none";
        document.body.classList.add("is-ready");
        revealHero();
      },
    });
    tl.to(fill, { width: "100%", duration: 0.4, ease: "power2.out" })
      .to(preloader, { yPercent: -100, duration: 0.9, ease: "power4.inOut" }, "+=0.15");
  }

  if (reduceMotion) {
    preloader.style.display = "none";
    document.body.classList.add("is-ready");
    revealHero();
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
  safeRun("customCursor", function () {
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
  }); // end safeRun("customCursor")

  /* ---------------------------------------------------------
     4. NAV — always stays visible/pinned at the top while scrolling
     (previously hid on scroll-down; that's removed per feedback —
     the nav should keep appearing no matter which way the page
     scrolls). Only the progress bar reacts to scroll now.
     --------------------------------------------------------- */
  safeRun("nav", function () {
    const nav = document.querySelector(".nav");
    const navProgressFill = document.querySelector(".nav__progress-fill");
    gsap.set(nav, { yPercent: 0 });
    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        if (navProgressFill) {
          gsap.set(navProgressFill, { width: self.progress * 100 + "%" });
        }
      },
    });
  });

  /* ---------------------------------------------------------
     4b. INTRO COVER — the site's opening beat, in the same four beats
     effects.js's setupIntro drives: (1) ZEN FOOTBALL reveals over the
     gathering galaxy, holds, fades out; (2) [color-shift happens
     silently in the canvas, nothing in this timeline]; (3) [the
     galaxy-to-football morph, also silent here]; (4) at
     INTRO_VIDEO_START_FRAC (0.84 — MUST match the same constant in
     effects.js) the football glitters start dispersing AND the whole
     cover dissolves away at once, revealing the real video background
     right as it starts scrolling. Pin range ("+=220%") also must match
     effects.js's setupIntro.
     --------------------------------------------------------- */
  safeRun("introCover", function () {
  if (document.querySelector(".intro")) {
    const introWord = document.querySelector(".intro__word");
    const introHint = document.querySelector(".intro__hint");
    const INTRO_VIDEO_START_FRAC = 0.84;

    gsap.set(introWord, { opacity: 0, y: 18 });
    gsap.set(introHint, { opacity: reduceMotion ? 0 : 1 }); // visible at rest, like "scroll to enter"

    if (reduceMotion) {
      gsap.set(introWord, { opacity: 1, y: 0 });
    } else {
      gsap.timeline({
        scrollTrigger: {
          trigger: ".intro",
          start: "top top",
          end: "+=220%",
          scrub: true,
        },
      })
        // the hint disappears the moment scrolling actually starts
        .to(introHint, { opacity: 0, duration: 0.04, ease: "power2.out" }, 0)
        // ZEN FOOTBALL reveals right as the galaxy finishes gathering
        .to(introWord, { opacity: 1, y: 0, duration: 0.06, ease: "power2.out" }, 0.16)
        .to(introWord, { opacity: 1, y: 0, duration: 0.08 }, 0.22) // hold, fully readable
        // clears the stage well before the color-shift + football morph
        .to(introWord, { opacity: 0, y: -22, duration: 0.06, ease: "power2.in" }, 0.3)
        // the whole cover dissolves away in exact sync with the
        // football glitters dispersing and the video starting to
        // scroll — one unified "handoff" beat, not three separate ones
        .to(".intro", { opacity: 0, duration: 1 - INTRO_VIDEO_START_FRAC, ease: "power2.in" }, INTRO_VIDEO_START_FRAC);
    }
  }
  }); // end safeRun("introCover")

  /* ---------------------------------------------------------
     5. HERO INTRO — fully scroll-bound: reveal, hold, disappear,
     all as ONE scrubbed timeline against the hero's own natural
     scroll position (it's normal, unpinned content — the video
     lives fixed in the background instead of inside this section).
     --------------------------------------------------------- */
  function runHeroIntro() {
    const lines = document.querySelectorAll(".hero__title .line span");
    const foot = document.querySelector(".hero__foot");

    gsap.set(lines, { yPercent: 120 });
    gsap.set(foot, { opacity: 0, y: 20, filter: "blur(8px)" });

    if (reduceMotion) {
      gsap.set(lines, { yPercent: 0 });
      gsap.set(foot, { opacity: 1, y: 0, filter: "blur(0px)" });
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
      // reveal: 0 -> 12% — lands right as the flash sequence (see
      // runHeroFlash) finishes its last line
      .to(lines, { yPercent: 0, stagger: 0.03, ease: "power2.out", duration: 0.1 }, 0.02)
      .to(foot, { opacity: 1, y: 0, filter: "blur(0px)", ease: "power2.out", duration: 0.08 }, 0.1)
      // hold, fully readable: 12% -> 32%
      .to(".hero__content", { opacity: 1, duration: 0.2 }, 0.12)
      // disappear as the next section (galaxy) rises into view: 32% -> 62%
      .to(".hero__content", { opacity: 0, y: -40, scale: 0.96, filter: "blur(8px)", ease: "power2.in", duration: 0.3 }, 0.32);
  }

  /* ---------------------------------------------------------
     5a. HERO FLASH SEQUENCE — the floating title cards that play as
     the hero rises into view, landing exactly as runHeroIntro's own
     title reveal takes over. Uses the hero's APPROACH scroll (its top
     travelling from the bottom of the viewport up to the top), not
     the hold/exit range runHeroIntro uses — no overlap between the
     two timelines. Each line: blur into focus, hold, blur back out,
     same floating language as the page-wide word reveals, just
     centered and sequenced like trailer title cards.
     --------------------------------------------------------- */
  function runHeroFlash() {
    const lines = gsap.utils.toArray(".hero__flash-line");
    if (!lines.length) return;
    gsap.set(lines, { opacity: 0, scale: 0.75, filter: "blur(16px)" });
    if (reduceMotion) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".hero",
        start: "top bottom",
        end: "top top",
        scrub: true,
        // HARD KILL-SWITCH: whatever the per-line scrub tweens are doing,
        // the instant this window is exited (either direction) every
        // flash line is forced to opacity:0. Without this, a stale
        // ScrollTrigger measurement (section heights can shift after
        // fonts/video load) could leave this timeline's progress from
        // ever quite reaching 1, letting a line like "Compete with
        // confidence." stay visible long after scrolling into a much
        // later section — exactly the cross-section overlap reported.
        onLeave: () => gsap.set(".hero__flash", { opacity: 0 }),
        onLeaveBack: () => gsap.set(".hero__flash", { opacity: 0 }),
        onEnter: () => gsap.set(".hero__flash", { opacity: 1 }),
        onEnterBack: () => gsap.set(".hero__flash", { opacity: 1 }),
      },
    });
    const step = 1 / lines.length;
    lines.forEach((line, i) => {
      const t0 = i * step;
      tl.to(line, { opacity: 1, scale: 1, filter: "blur(0px)", duration: step * 0.4, ease: "power2.out" }, t0)
        .to(line, { opacity: 1, scale: 1, filter: "blur(0px)", duration: step * 0.25 }, t0 + step * 0.4)
        .to(line, { opacity: 0, scale: 1.15, filter: "blur(12px)", duration: step * 0.35, ease: "power2.in" }, t0 + step * 0.65);
    });
  }

  /* ---------------------------------------------------------
     5b. GALAXY TEXT — reveal, hold, disappear, all as ONE scrubbed
     timeline tied to the galaxy's own pin.
     --------------------------------------------------------- */
  safeRun("galaxyText", function () {
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
      .to(".galaxy__content", { opacity: 0, y: -30, filter: "blur(8px)", duration: 0.16, ease: "power2.in" }, 0.3);

    charReveal(document.querySelector(".galaxy__title"));
  }
  }); // end safeRun("galaxyText")

  /* ---------------------------------------------------------
     5c. GALAXY VIGNETTE — blurred, darkened corners that fade in as
     the section arrives and back out as it leaves, tied to the same
     scroll range as the gather. Boosts contrast for the particles
     (that's the point of it — not decoration) without ever touching
     the clear center where the disc and text actually sit.
     --------------------------------------------------------- */
  safeRun("galaxyVignette", function () {
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
  }); // end safeRun("galaxyVignette")

  /* ---------------------------------------------------------
     6a. FLOATWORDS MASTER GATE — the floating word/phrase overlay is
     fixed and page-wide (z-index above the hero content), so without
     this, an early-anchored word (e.g. one tied to a section right
     after the hero) can start fading in WHILE the hero title is still
     on screen, visually colliding with it. This ties the whole
     `.floatwords` layer's opacity to the hero's own exit — it stays
     fully hidden until the hero has scrolled out of the way, then
     individual words/phrases take over their own fade in/out as
     before. A hard gate, not a per-word timing tweak, so it can't
     drift out of sync again as sections get added/reordered.
     --------------------------------------------------------- */
  safeRun("floatwordsGate", function () {
    const layer = document.querySelector(".floatwords");
    if (!layer || !document.querySelector(".hero")) return;
    gsap.set(layer, { opacity: reduceMotion ? 1 : 0 });
    if (reduceMotion) return;
    gsap.to(layer, {
      opacity: 1,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero",
        start: "bottom 85%",
        end: "bottom 35%",
        scrub: true,
      },
    });
  });

  /* ---------------------------------------------------------
     6b. FLOATING WORD REVEALS — not normal scrolling text. Each word
     lives in the fixed `.floatwords` overlay (outside every section,
     see index.html), invisible at rest. As its associated section
     scrolls near, the word blurs into focus, scales up, and glows
     (the glow itself is a constant text-shadow in CSS — fading
     opacity in and out against a constant glow is what reads as
     "glows for a moment, then disappears"), holds briefly, then blurs
     and scales back out. Every word is tied to a different section so
     they read as floating around the football, the gear shots, the
     stadium — not stuck to one spot on the page.
     --------------------------------------------------------- */
  safeRun("floatingWords", function setupFloatingWords() {
    const words = gsap.utils.toArray(".floatword");
    if (!words.length) return;

    // word text -> which section anchor triggers it. Falls back to
    // skipping a word gracefully if a section id ever goes missing.
    const ANCHORS = {
      Speed: "#promo",
      Power: "#gear",
      Control: "#numbers",
      Precision: "#training",
      Teamwork: "#match",
      Passion: "#fan",
      Discipline: "#news",
      Performance: "#community",
      Confidence: ".statement",
      Victory: "#join",
    };

    // Three visibly different reveal recipes, cycled by index so
    // adjacent words never move identically: "glow" (blur+scale, the
    // original), "rise" (drifts up out of a soft blur, no scale pop),
    // "spin" (rotates in off-axis while scaling, more physical/tumbling).
    const WORD_VARIANTS = ["glow", "rise", "spin"];

    words.forEach((word, i) => {
      const anchorSel = ANCHORS[word.textContent.trim()];
      const anchor = anchorSel && document.querySelector(anchorSel);
      const variant = WORD_VARIANTS[i % WORD_VARIANTS.length];

      let fromVars, holdVars, exitVars;
      if (variant === "rise") {
        gsap.set(word, { transformPerspective: 600 });
        fromVars = { opacity: 0, y: 46, filter: "blur(18px)" };
        holdVars = { opacity: 1, y: 0, filter: "blur(0px)" };
        exitVars = { opacity: 0, y: -46, filter: "blur(16px)" };
      } else if (variant === "spin") {
        gsap.set(word, { transformPerspective: 600 });
        fromVars = { opacity: 0, scale: 0.6, rotate: -12, filter: "blur(14px)" };
        holdVars = { opacity: 1, scale: 1, rotate: 0, filter: "blur(0px)" };
        exitVars = { opacity: 0, scale: 1.25, rotate: 10, filter: "blur(14px)" };
      } else {
        fromVars = { opacity: 0, scale: 0.72, filter: "blur(16px)" };
        holdVars = { opacity: 1, scale: 1, filter: "blur(0px)" };
        exitVars = { opacity: 0, scale: 1.18, filter: "blur(14px)" };
      }

      gsap.set(word, fromVars);
      if (reduceMotion || !anchor) return;

      gsap
        .timeline({
          scrollTrigger: {
            trigger: anchor,
            // Non-overlapping with this same anchor's floatphrase below:
            // the word owns the FIRST half of the section's transit
            // (92%->54%), the phrase owns the SECOND half (46%->6%),
            // with an 8-point gap between them so exactly one of the two
            // is ever visible at a time, never both.
            start: "top 92%",
            end: "top 54%",
            scrub: true,
            // hard kill-switch — see runHeroFlash's identical comment.
            // Guarantees this word can never linger visible once its
            // window has genuinely ended, independent of the scrub
            // tween's own progress value.
            onLeave: () => gsap.set(word, { opacity: 0 }),
            onLeaveBack: () => gsap.set(word, { opacity: 0 }),
          },
        })
        // entrance — the "cinematic" reveal, recipe depends on variant
        .to(word, { ...holdVars, duration: 0.35, ease: "power2.out" }, 0)
        // hold, fully in focus and glowing
        .to(word, { ...holdVars, duration: 0.3 }, 0.35)
        // dissolve back out — recipe-specific exit
        .to(word, { ...exitVars, duration: 0.35, ease: "power2.in" }, 0.65);
    });
  });

  /* ---------------------------------------------------------
     6c. FLOATING PHRASES — a second layer of longer sport/product
     copy, tied to the SAME section anchors as the words above but a
     slightly later window of that section's transit (so the word
     leads, the phrase follows — a staggered cascade rather than two
     things landing at once). Two different animation recipes instead
     of reusing the words' blur+scale, per data-style:
       "drift" — rises up out of a skew into place, then drifts further
                 up and skews the other way on exit (a tilt-settle feel)
       "slide" — slides in from the side (data-side: left/right) with a
                 slight rotation, then continues off the same direction
                 on exit (a horizontal sweep feel)
     --------------------------------------------------------- */
  safeRun("floatPhrases", function setupFloatPhrases() {
    const phrases = gsap.utils.toArray(".floatphrase");
    if (!phrases.length) return;

    phrases.forEach((phrase) => {
      const anchor = document.querySelector(phrase.dataset.anchor);
      const style = phrase.dataset.style;
      const side = phrase.dataset.side === "right" ? 1 : -1;

      if (style === "slide") {
        gsap.set(phrase, { opacity: 0, x: 90 * side, rotation: 5 * side, filter: "blur(12px)" });
      } else {
        gsap.set(phrase, { opacity: 0, y: 26, skewY: 5, scale: 0.92, filter: "blur(14px)" });
      }
      if (reduceMotion || !anchor) return;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: anchor,
          // Non-overlapping with this same anchor's floatword above: the
          // word owns 92%->54%, this phrase owns 46%->6%, an 8-point
          // gap between them so only one of the pair is ever visible.
          start: "top 46%",
          end: "top 6%",
          scrub: true,
          // hard kill-switch — see runHeroFlash's identical comment.
          onLeave: () => gsap.set(phrase, { opacity: 0 }),
          onLeaveBack: () => gsap.set(phrase, { opacity: 0 }),
        },
      });

      if (style === "slide") {
        tl.to(phrase, { opacity: 1, x: 0, rotation: 0, filter: "blur(0px)", duration: 0.4, ease: "power2.out" }, 0)
          .to(phrase, { opacity: 1, duration: 0.22 }, 0.4)
          .to(phrase, { opacity: 0, x: 130 * side, rotation: 7 * side, filter: "blur(12px)", duration: 0.38, ease: "power2.in" }, 0.62);
      } else {
        tl.to(phrase, { opacity: 1, y: 0, skewY: 0, scale: 1, filter: "blur(0px)", duration: 0.4, ease: "power2.out" }, 0)
          .to(phrase, { opacity: 1, duration: 0.22 }, 0.4)
          .to(phrase, { opacity: 0, y: -26, skewY: -5, scale: 0.94, filter: "blur(12px)", duration: 0.38, ease: "power2.in" }, 0.62);
      }
    });
  });

  /* ---------------------------------------------------------
     7. FEATURE SECTIONS — text-only "product reveal" moments.
     Big display title gets the character-stagger materialize;
     body/list get the standard reveal-and-fade.
     --------------------------------------------------------- */
  safeRun("featureSections", function () {
    document.querySelectorAll(".feature__title").forEach(charReveal);
    revealAndFade(".feature__body, .feature__list", { variant: "tilt" });
    revealAndFade(".feature .eyebrow", { variant: "swing" });
  });

  /* ---------------------------------------------------------
     8. STATS — count up, driven directly by scroll position (not
     a timer). Scrub the count from 0 to its target across the
     card's transit through the lower half of the viewport; scroll
     up and it counts back down, since it's just reading progress.
     --------------------------------------------------------- */
  safeRun("stats", function () {
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
    revealAndFade(".stats__intro .eyebrow", { variant: "swing" });
    revealAndFade(".stat", { y: 24, stagger: 0.05, variant: "punch" });
  });

  /* ---------------------------------------------------------
     9. STATEMENT — word by word scroll reveal, PLUS the whole block
     floats into and back out of focus (blur+fade) the same way every
     other text block on the site does — the word-lighting is layered
     on top of that, not a replacement for it.
     --------------------------------------------------------- */
  safeRun("statement", function () {
    revealAndFade(".statement .wrap", { variant: "tilt" });
    document.querySelectorAll(".statement__text").forEach((el) => {
      const split = new SplitText(el, { type: "words", wordsClass: "word" });
      // words are gradient-filled by CSS now (.statement__text .word), so
      // animating "color" would do nothing — opacity is what makes each
      // word "light up" dim-to-bright as it's read, same effect
      gsap.set(split.words, { opacity: 0.32 });
      gsap.to(split.words, {
        opacity: 1,
        stagger: 0.5,
        scrollTrigger: {
          trigger: el,
          start: "top 75%",
          end: "bottom 40%",
          scrub: true,
        },
      });
    });
  });

  /* ---------------------------------------------------------
     10. CTA fade-ins — the CTA's backdrop is the site's one fixed
     video; only the sparkle canvas + text sit on top of it. Content
     also floats back out of focus as the footer arrives, same
     blur+fade language as everything above it.
     --------------------------------------------------------- */
  safeRun("cta", function () {
    gsap.utils.toArray(".cta__content > *").forEach((el, i) => {
      gsap.set(el, { transformPerspective: 700, transformOrigin: "50% 100%" });
      gsap.fromTo(
        el,
        { opacity: 0, y: 46, scale: 0.94, rotateX: -18, filter: "blur(9px)" },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          rotateX: 0,
          filter: "blur(0px)",
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".cta",
            start: `top ${80 - i * 12}%`,
            end: `top ${30 - i * 12}%`,
            scrub: true,
          },
        }
      );
      if (reduceMotion) return;
      gsap.to(el, {
        opacity: 0,
        y: -30,
        rotateX: 14,
        filter: "blur(8px)",
        ease: "power1.in",
        scrollTrigger: {
          trigger: ".cta",
          start: `top ${10 - i * 8}%`,
          end: `top ${-35 - i * 8}%`,
          scrub: true,
        },
      });
    });
    charReveal(document.querySelector(".cta__title"));
  });

  /* ---------------------------------------------------------
     10b. FOOTER — floats/fades in on a staggered cascade like
     everything above it. IMPORTANT: this is entrance-only, and NOT
     built on the shared revealAndFade() helper. revealAndFade's exit
     window ends at "top 55%" of the viewport — for most elements that
     works, but the footer is the LAST thing on the page: at max
     scroll, the page can't scroll any further, so the footer's top
     can physically never reach 55% down the viewport unless the
     footer itself is taller than ~45% of the viewport. The trigger's
     "end" was an unreachable scroll position, so the tween never
     finished and the footer sat stuck at opacity 0 — invisible. Fixed
     by anchoring the end to "bottom bottom" (the footer's own bottom
     edge hitting the viewport's bottom edge), which is exactly what
     happens at max scroll, guaranteed reachable regardless of height.
     No exit tween either — there's nothing below the footer to
     justify hiding it again once you've scrolled all the way down.
     --------------------------------------------------------- */
  safeRun("footer", function () {
    gsap.utils.toArray(".footer__logo, .footer__links, .footer__meta, .footer__credit").forEach((el, i) => {
      gsap.set(el, { transformPerspective: 600, transformOrigin: "50% 100%" });
      gsap.fromTo(
        el,
        { opacity: 0, y: 26, rotateX: -16, filter: "blur(6px)" },
        {
          opacity: 1,
          y: 0,
          rotateX: 0,
          filter: "blur(0px)",
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".footer",
            start: `top ${95 - i * 10}%`,
            end: "bottom bottom",
            scrub: true,
          },
        }
      );
    });
  });

  /* ---------------------------------------------------------
     11. SMOOTH ANCHOR LINKS
     --------------------------------------------------------- */
  safeRun("anchorLinks", function () {
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
  safeRun("refreshScheduling", function () {
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
  });

  } catch (err) {
    // Something in setup threw — most likely a vendored library failed
    // to load (check the browser console for the real error). Don't
    // leave the visitor stuck on the preloader because of it.
    console.error("Site init error — falling back to a static page:", err);
    var preloaderEl = document.querySelector(".preloader");
    if (preloaderEl) preloaderEl.style.display = "none";
    document.body.classList.add("is-ready");
  }
})();
