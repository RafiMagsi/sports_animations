/* =========================================================
   ZEN FOOTBALL — main.js
   Lenis smooth scroll + GSAP ScrollTrigger driven animations
   ========================================================= */

(function () {
  "use strict";

  try {

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;

  gsap.registerPlugin(ScrollTrigger, SplitText);

  const SPORT_FLOAT_TEXTS = [
    "Every great player starts with a single touch of the ball.",
    "Champions are built through discipline long before they lift trophies.",
    "Football rewards those who keep training when nobody is watching.",
    "The difference between winning and losing is often one decision.",
    "Every pass creates a new opportunity.",
    "Every sprint can change the outcome of a match.",
    "Great teams move together as one.",
    "Control the ball. Control the game.",
    "Confidence is earned through preparation.",
    "The best players see opportunities before others see space.",
    "Success comes from thousands of small improvements.",
    "The crowd celebrates goals. Players remember the sacrifices.",
    "Trust your teammates. Trust the process.",
    "Every training session shapes the player you become.",
    "Football is more than a game. It is a mindset.",
    "The road to greatness begins with consistency.",
    "Play with passion. Compete with purpose.",
    "Every match is a chance to make history.",
    "The world's biggest stage starts with today's training.",
    "Victory belongs to those who prepare for it.",
    "Dream bigger. Train harder. Play smarter.",
    "The future of football belongs to those who never stop improving.",
    "Leave your mark on the game.",
    "The world is watching. Show them what you're made of."
  ];

  const PRODUCT_FLOAT_TEXTS = [
    "Engineered for players who demand more from every match.",
    "Designed to perform when every second matters.",
    "Built for speed. Tested for performance.",
    "Premium football gear inspired by the world's biggest stage.",
    "Every detail crafted to elevate your game.",
    "Trusted by players. Designed for champions.",
    "Innovation meets performance on every touch.",
    "Created for modern football.",
    "The perfect balance of control, comfort, and precision.",
    "Train harder with equipment built for professionals.",
    "Designed to keep up with the fastest game on earth.",
    "Performance starts with the right equipment.",
    "Built to handle every challenge on the pitch.",
    "Inspired by champions. Made for the next generation.",
    "More than football gear. Built for ambition.",
    "Premium quality for players who refuse to settle.",
    "Every product is designed with performance in mind.",
    "Engineered for confidence under pressure.",
    "Prepare for greatness with every training session.",
    "Gear up for FIFA World Cup 2026.",
    "Limited edition collections inspired by football's biggest tournament.",
    "Join millions of fans celebrating the world's game.",
    "Built for match day. Ready for every day.",
    "Your journey starts with the right equipment."
  ];

  const HERO_FLOAT_TEXTS = [
    "World Cup Season 2026",
    "Gear up for the 2026 World Cup season with premium football gear, training programs, and fan collections.",
    "Explore Collection",
    "Scroll"
  ];
  const WINNER_SLOGAN = "Play Like a Champion Today.";
  const PHRASE_VARIANTS = ["drift", "slide", "zoom", "collide", "flip", "bounce", "smoke"];
  const WORD_VARIANTS = ["glow", "rise", "spin", "zoom", "collide", "flip", "bounce", "smoke"];
  const HERO_FLASH_VARIANTS = ["zoom", "flip", "collide", "bounce", "smoke"];
  let pageReady = false;
  let visibilityRefreshTimer = null;
  const SECTION_SCOPE_SELECTOR = ".hero, .hero-copy, .galaxy, .feature, .stats, .quote-carousel, .flags-carousel, .ball-gallery, .statement, .cta";
  const FLOAT_WORD_ANCHORS = {
    Speed: "#promo",
    Power: "#gear",
    Control: "#numbers",
    Precision: "#training",
    Teamwork: "#match",
    Passion: "#fan",
    Discipline: "#news",
    Performance: "#community",
    Confidence: ".statement",
    Victory: "#join"
  };

  function floatBlur(px) {
    return px > 0 ? "blur(" + px + "px)" : "none";
  }

  function refreshVisibilityLifecycle(delay) {
    const run = () => {
      requestAnimationFrame(() => {
        clampFloatingText();
        if (typeof ScrollTrigger !== "undefined") {
          ScrollTrigger.sort();
          ScrollTrigger.refresh();
          requestAnimationFrame(() => ScrollTrigger.update());
        }
      });
    };

    if (!delay) {
      run();
      return;
    }

    clearTimeout(visibilityRefreshTimer);
    visibilityRefreshTimer = setTimeout(() => {
      visibilityRefreshTimer = null;
      run();
    }, delay);
  }

  function finalizePageReady() {
    const preloader = document.querySelector(".preloader");
    if (preloader) {
      preloader.style.pointerEvents = "none";
      preloader.style.visibility = "hidden";
      preloader.style.display = "none";
    }

    document.body.classList.add("is-ready");

    if (pageReady) {
      refreshVisibilityLifecycle(0);
      return;
    }

    pageReady = true;
    refreshVisibilityLifecycle(0);
    refreshVisibilityLifecycle(120);
    refreshVisibilityLifecycle(420);
  }

  // HARD FAILSAFE — independent from the animation boot. If anything
  // stalls, the page still exits the preloader and forces a full
  // ScrollTrigger/layout refresh so later sections don't stay measured
  // against stale preloader-era geometry.
  window.setTimeout(function () {
    const p = document.querySelector(".preloader");
    if (p && p.style.display !== "none") {
      finalizePageReady();
    }
  }, 4000);

  function ensureSectionOverlay(anchorSel) {
    const section = document.querySelector(anchorSel);
    if (!section) return null;

    let overlay = section.querySelector(".section-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "section-overlay";
      overlay.setAttribute("aria-hidden", "true");
      section.appendChild(overlay);
    }
    return overlay;
  }

  function distributeSectionOverlays() {
    const floatRoot = document.querySelector(".floatwords");
    if (!floatRoot) return;

    const smoke = floatRoot.querySelector(".floatwords__smoke");
    const banner = floatRoot.querySelector(".winner-banner");
    const words = Array.from(floatRoot.querySelectorAll(".floatword"));

    words.forEach((word) => {
      const anchorSel = FLOAT_WORD_ANCHORS[word.textContent.trim()];
      const overlay = anchorSel ? ensureSectionOverlay(anchorSel) : null;
      if (overlay) overlay.appendChild(word);
    });

    if (smoke) {
      const promoOverlay = ensureSectionOverlay("#promo") || ensureSectionOverlay("#hero");
      if (promoOverlay) promoOverlay.appendChild(smoke);
    }

    if (banner) {
      const joinOverlay = ensureSectionOverlay("#join");
      if (joinOverlay) joinOverlay.appendChild(banner);
    }
  }

  function buildFloatingNarratives() {
    const distributed = [
      { anchor: "#promo", copy: PRODUCT_FLOAT_TEXTS[0], family: "product", top: "16%", left: "68%" },
      { anchor: "#gear", copy: SPORT_FLOAT_TEXTS[0], family: "sport", top: "24%", left: "72%" },
      { anchor: "#numbers", copy: SPORT_FLOAT_TEXTS[7], family: "sport", top: "76%", left: "27%" },
      { anchor: "#training", copy: PRODUCT_FLOAT_TEXTS[4], family: "product", top: "24%", left: "73%" },
      { anchor: "#match", copy: SPORT_FLOAT_TEXTS[4], family: "sport", top: "72%", left: "60%" },
      { anchor: "#fan", copy: PRODUCT_FLOAT_TEXTS[21], family: "product", top: "24%", left: "72%" },
      { anchor: "#news", copy: PRODUCT_FLOAT_TEXTS[20], family: "product", top: "70%", left: "28%" },
      { anchor: "#community", copy: SPORT_FLOAT_TEXTS[24], family: "sport", top: "22%", left: "73%" },
      { anchor: ".statement", copy: "Build Your Football Legacy.", family: "product", top: "74%", left: "31%" },
      { anchor: "#join", copy: "Join the World Cup 2026 Football Movement.", family: "hero", top: "28%", left: "50%" }
    ];

    distributed.forEach((item, index) => {
      const phrase = document.createElement("p");
      const style = PHRASE_VARIANTS[index % PHRASE_VARIANTS.length];
      const side = index % 2 === 0 ? "left" : "right";

      phrase.className = "floatphrase";
      phrase.dataset.anchor = item.anchor;
      phrase.dataset.style = style;
      phrase.dataset.side = side;
      phrase.dataset.family = item.family;
      if (item.copy === "Explore Collection" || item.copy === "Scroll") {
        phrase.classList.add("floatphrase--ui");
      }
      if (item.family === "hero") {
        phrase.classList.add("floatphrase--hero");
      }
      phrase.style.top = item.top;
      phrase.style.left = item.left;
      phrase.textContent = item.copy;
      const overlay = ensureSectionOverlay(item.anchor);
      if (overlay) overlay.appendChild(phrase);
    });

    const winnerText = document.querySelector(".winner-banner__text");
    if (winnerText) winnerText.textContent = WINNER_SLOGAN;
  }

  distributeSectionOverlays();
  buildFloatingNarratives();

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

  function closestSectionScope(node) {
    return node && node.closest ? node.closest(SECTION_SCOPE_SELECTOR) : null;
  }

  function setupSectionIndices() {
    const sections = Array.from(document.querySelectorAll("main > section"))
      .filter((section) => !section.classList.contains("intro"));
    const total = sections.length;

    sections.forEach((section, index) => {
      let indexEl = null;
      Array.from(section.children).some((child) => {
        if (child.classList && (child.classList.contains("feature__index") || child.classList.contains("galaxy__index") || child.classList.contains("section__index"))) {
          indexEl = child;
          return true;
        }
        return false;
      });

      if (!indexEl) {
        indexEl = document.createElement("div");
        indexEl.className = "section__index";
        section.insertBefore(indexEl, section.firstChild);
      } else if (!indexEl.classList.contains("section__index")) {
        indexEl.classList.add("section__index");
      }

      indexEl.textContent = String(index + 1).padStart(2, "0") + " / " + String(total).padStart(2, "0");
    });
  }

  setupSectionIndices();

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
      const scope = closestSectionScope(el) || el;
      let fromVars, toVars, exitVars, entranceEase;

      if (variant === "punch") {
        fromVars = { opacity: 0, y: rise * 0.4, scale: 0.62, filter: "blur(9px)" };
        toVars = { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" };
        exitVars = { opacity: 0, scale: 1.22, filter: "blur(10px)" };
        entranceEase = "back.out(1.6)";
      } else if (variant === "zoom") {
        gsap.set(el, { transformPerspective: 1100, transformOrigin: "50% 50%" });
        fromVars = { opacity: 0, z: -220, scale: 0.58, filter: "blur(16px)" };
        toVars = { opacity: 1, z: 0, scale: 1, filter: "blur(0px)" };
        exitVars = { opacity: 0, z: 120, y: -rise * 0.45, scale: 1.08, filter: "blur(12px)" };
        entranceEase = "power3.out";
      } else if (variant === "collide") {
        const dir = i % 2 === 0 ? 1 : -1;
        gsap.set(el, { transformPerspective: 1100, transformOrigin: dir > 0 ? "0% 50%" : "100% 50%" });
        fromVars = { opacity: 0, x: 110 * dir, scaleX: 1.14, scaleY: 0.84, rotateZ: 4 * dir, filter: "blur(14px)" };
        toVars = { opacity: 1, x: 0, scaleX: 1, scaleY: 1, rotateZ: 0, filter: "blur(0px)" };
        exitVars = { opacity: 0, x: -82 * dir, scaleX: 0.96, scaleY: 1.05, rotateZ: -3 * dir, filter: "blur(12px)" };
        entranceEase = "power4.out";
      } else if (variant === "flip") {
        const dir = i % 2 === 0 ? 1 : -1;
        gsap.set(el, { transformPerspective: 1300, transformOrigin: "50% 50%" });
        fromVars = { opacity: 0, y: rise * 0.5, rotateY: 84 * dir, rotateX: -10, scale: 0.86, filter: "blur(14px)" };
        toVars = { opacity: 1, y: 0, rotateY: 0, rotateX: 0, scale: 1, filter: "blur(0px)" };
        exitVars = { opacity: 0, y: -rise * 0.5, rotateY: -70 * dir, rotateX: 8, scale: 1.08, filter: "blur(12px)" };
        entranceEase = "power3.out";
      } else if (variant === "bounce") {
        gsap.set(el, { transformPerspective: 1000, transformOrigin: "50% 100%" });
        fromVars = { opacity: 0, y: rise * 1.8, scaleY: 1.24, scaleX: 0.84, filter: "blur(13px)" };
        toVars = { opacity: 1, y: 0, scaleY: 1, scaleX: 1, filter: "blur(0px)" };
        exitVars = { opacity: 0, y: -rise * 0.5, scaleY: 0.92, scaleX: 1.05, filter: "blur(11px)" };
        entranceEase = "back.out(1.55)";
      } else if (variant === "smoke") {
        const dir = i % 2 === 0 ? 1 : -1;
        gsap.set(el, { transformPerspective: 1000, transformOrigin: "50% 50%" });
        fromVars = { opacity: 0, y: rise * 0.65, x: 26 * dir, skewX: -8 * dir, scale: 0.94, filter: "blur(24px)" };
        toVars = { opacity: 1, y: 0, x: 0, skewX: 0, scale: 1, filter: "blur(0px)" };
        exitVars = { opacity: 0, y: -rise * 0.42, x: 20 * dir, skewX: 8 * dir, scale: 1.08, filter: "blur(20px)" };
        entranceEase = "power2.out";
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
          trigger: scope,
          start: `top ${84 - stagger * i * 12}%`,
          end: "top 32%",
          scrub: true,
          invalidateOnRefresh: true
        },
      });
      if (reduceMotion) return;
      gsap.to(el, {
        ...exitVars,
        ease: "power1.in",
        scrollTrigger: {
          trigger: scope,
          start: "bottom 42%",
          end: "bottom top",
          scrub: true,
          invalidateOnRefresh: true
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
  function charReveal(el, opts) {
    if (!el || reduceMotion) return;
    opts = opts || {};
    const scope = closestSectionScope(el) || el;
    const variant = opts.variant || "zoom";
    const split = new SplitText(el, { type: "chars", charsClass: "ch" });
    gsap.set(split.chars, { display: "inline-block", transformPerspective: 500 });

    let fromVars;
    let holdVars;
    let exitVars;
    let enterEase = "power2.out";
    let exitEase = "power1.in";

    if (variant === "flip") {
      gsap.set(split.chars, { transformPerspective: 1400, transformOrigin: "50% 50%" });
      fromVars = { opacity: 0, yPercent: 10, rotateY: -90, rotateX: 12, scale: 0.82, filter: "blur(13px)" };
      holdVars = { opacity: 1, yPercent: 0, rotateY: 0, rotateX: 0, scale: 1, filter: "blur(0px)" };
      exitVars = { opacity: 0, y: -26, rotateY: 68, rotateX: -8, scale: 1.06, filter: "blur(11px)" };
    } else if (variant === "collide") {
      gsap.set(split.chars, { transformPerspective: 1400, transformOrigin: "50% 50%" });
      fromVars = { opacity: 0, xPercent: 34, scaleX: 1.18, scaleY: 0.84, rotateZ: 5, filter: "blur(12px)" };
      holdVars = { opacity: 1, xPercent: 0, scaleX: 1, scaleY: 1, rotateZ: 0, filter: "blur(0px)" };
      exitVars = { opacity: 0, x: -24, scaleX: 0.95, scaleY: 1.06, rotateZ: -4, filter: "blur(10px)" };
      enterEase = "power4.out";
    } else if (variant === "bounce") {
      gsap.set(split.chars, { transformPerspective: 1200, transformOrigin: "50% 100%" });
      fromVars = { opacity: 0, yPercent: 82, scaleY: 1.3, scaleX: 0.82, filter: "blur(12px)" };
      holdVars = { opacity: 1, yPercent: 0, scaleY: 1, scaleX: 1, filter: "blur(0px)" };
      exitVars = { opacity: 0, y: -24, scaleY: 0.9, scaleX: 1.06, filter: "blur(10px)" };
      enterEase = "back.out(1.55)";
    } else if (variant === "smoke") {
      gsap.set(split.chars, { transformPerspective: 1200, transformOrigin: "50% 50%" });
      fromVars = { opacity: 0, yPercent: 24, skewX: -10, scale: 0.92, filter: "blur(26px)" };
      holdVars = { opacity: 1, yPercent: 0, skewX: 0, scale: 1, filter: "blur(0px)" };
      exitVars = { opacity: 0, y: -20, skewX: 10, scale: 1.08, filter: "blur(22px)" };
      exitEase = "power1.in";
    } else {
      gsap.set(split.chars, { transformPerspective: 1400, transformOrigin: "50% 50%" });
      fromVars = { opacity: 0, z: -260, yPercent: 34, rotateX: -62, scale: 0.58, filter: "blur(16px)" };
      holdVars = { opacity: 1, z: 0, yPercent: 0, rotateX: 0, scale: 1, filter: "blur(0px)" };
      exitVars = { opacity: 0, z: 140, y: -26, rotateX: 14, scale: 1.06, filter: "blur(12px)" };
    }

    gsap.fromTo(
      split.chars,
      fromVars,
      {
        ...holdVars,
        stagger: 0.015,
        ease: enterEase,
        scrollTrigger: {
          trigger: scope,
          start: "top 84%",
          end: "top 28%",
          scrub: true,
          invalidateOnRefresh: true
        },
      }
    );
    // disappear too, not just reveal — floats back out of focus as it
    // scrolls past, same blur+fade language as everything else on the
    // site instead of just sitting there once revealed
    gsap.set(el, { transformPerspective: 700 });
    gsap.to(el, {
      ...exitVars,
      ease: exitEase,
      scrollTrigger: {
        trigger: scope,
        start: "bottom 44%",
        end: "bottom top",
        scrub: true,
        invalidateOnRefresh: true
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
  let heroRevealBooted = false;

  function revealHero() {
    if (heroRevealBooted) return;
    heroRevealBooted = true;
    safeRun("heroIntro", runHeroIntro);
    safeRun("heroCopyIntro", runHeroCopyIntro);
    safeRun("heroFlash", runHeroFlash);
    if (typeof ScrollTrigger !== "undefined") {
      ScrollTrigger.refresh();
    }
  }

  function finishPreloader() {
    finalizePageReady();
  }

  function killPreloader() {
    if (!preloader) {
      finishPreloader();
      return;
    }
    const tl = gsap.timeline({
      onComplete: finishPreloader,
    });
    tl.to(fill, { width: "100%", duration: 0.4, ease: "power2.out" })
      .to(preloader, { yPercent: -100, duration: 0.9, ease: "power4.inOut" }, "+=0.15");
  }

  revealHero();

  if (reduceMotion) {
    finishPreloader();
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
    const navPercent = document.querySelector(".nav__percent");
    gsap.set(nav, { yPercent: 0 });
    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        const pct = Math.round(self.progress * 100);
        if (navProgressFill) {
          gsap.set(navProgressFill, { width: pct + "%" });
        }
        if (navPercent) {
          navPercent.textContent = String(pct).padStart(2, "0") + "%";
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
    const orbitals = document.querySelectorAll(".hero__orbital");
    const stage = document.querySelector(".hero__stage");
    const flash = document.querySelector(".hero__flash");

    if (orbitals.length) gsap.set(orbitals, { opacity: 0, y: 18, scale: 0.92, filter: "blur(10px)" });

    if (reduceMotion) {
      if (orbitals.length) gsap.set(orbitals, { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" });
      return;
    }

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "+=42%",
        scrub: true,
        invalidateOnRefresh: true,
        onLeave: () => {
          if (orbitals.length) gsap.set(orbitals, { opacity: 0 });
          if (stage) gsap.set(stage, { opacity: 0 });
          if (flash) gsap.set(flash, { opacity: 0 });
        },
        onLeaveBack: () => {
          if (orbitals.length) gsap.set(orbitals, { opacity: 0 });
          if (stage) gsap.set(stage, { opacity: 0.96 });
          if (flash) gsap.set(flash, { opacity: 1 });
        }
      },
    });
    tl.to(orbitals, { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", ease: "power2.out", duration: 0.14, stagger: 0.03 }, 0.08)
      .to(orbitals, { opacity: 0, y: -16, scale: 0.9, filter: "blur(10px)", ease: "power2.in", duration: 0.16, stagger: 0.02 }, 0.26);

    if (stage) {
      tl.to(stage, { opacity: 0.16, ease: "power1.out", duration: 0.12 }, 0.22)
        .to(stage, { opacity: 0, ease: "power2.in", duration: 0.18 }, 0.3);
    }

    if (flash) {
      tl.to(flash, { opacity: 0, ease: "power1.in", duration: 0.12 }, 0.32);
    }
  }

  function runHeroCopyIntro() {
    const section = document.querySelector(".hero-copy");
    const lines = document.querySelectorAll(".hero-copy .hero__title .line span");
    const foot = document.querySelector(".hero-copy .hero__foot");
    if (!section || !lines.length || !foot) return;

    gsap.set(lines, { yPercent: 120 });
    gsap.set(foot, { opacity: 0, y: 20, filter: "blur(8px)" });

    if (reduceMotion) {
      gsap.set(lines, { yPercent: 0 });
      gsap.set(foot, { opacity: 1, y: 0, filter: "blur(0px)" });
      return;
    }

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top 82%",
        end: "top 36%",
        scrub: true,
        invalidateOnRefresh: true
      }
    });

    tl.to(lines, { yPercent: 0, stagger: 0.03, ease: "power2.out", duration: 0.16 }, 0)
      .to(foot, { opacity: 1, y: 0, filter: "blur(0px)", ease: "power2.out", duration: 0.14 }, 0.08);
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
      const variant = HERO_FLASH_VARIANTS[i % HERO_FLASH_VARIANTS.length];
      let fromVars;
      let holdVars;
      let exitVars;
      let enterEase = "power2.out";
      let leaveEase = "power2.in";

      if (variant === "flip") {
        gsap.set(line, { transformPerspective: 1200, transformOrigin: "50% 50%" });
        fromVars = { opacity: 0, rotateY: i % 2 === 0 ? -88 : 88, rotateX: -12, scale: 0.82, filter: "blur(16px)" };
        holdVars = { opacity: 1, rotateY: 0, rotateX: 0, scale: 1, filter: "blur(0px)" };
        exitVars = { opacity: 0, rotateY: i % 2 === 0 ? 68 : -68, rotateX: 8, scale: 1.08, filter: "blur(12px)" };
      } else if (variant === "collide") {
        gsap.set(line, { transformPerspective: 1200, transformOrigin: i % 2 === 0 ? "50% 50%" : "50% 50%" });
        fromVars = { opacity: 0, x: i % 2 === 0 ? 240 : -240, scaleX: 1.18, scaleY: 0.84, rotateZ: i % 2 === 0 ? -4 : 4, filter: "blur(16px)" };
        holdVars = { opacity: 1, x: 0, scaleX: 1, scaleY: 1, rotateZ: 0, filter: "blur(0px)" };
        exitVars = { opacity: 0, x: i % 2 === 0 ? -180 : 180, scaleX: 0.96, scaleY: 1.06, rotateZ: i % 2 === 0 ? 3 : -3, filter: "blur(12px)" };
        enterEase = "power4.out";
      } else if (variant === "bounce") {
        gsap.set(line, { transformPerspective: 1200, transformOrigin: "50% 100%" });
        fromVars = { opacity: 0, y: 120, scaleY: 1.3, scaleX: 0.82, filter: "blur(16px)" };
        holdVars = { opacity: 1, y: 0, scaleY: 1, scaleX: 1, filter: "blur(0px)" };
        exitVars = { opacity: 0, y: -72, scaleY: 0.9, scaleX: 1.08, filter: "blur(12px)" };
        enterEase = "back.out(1.6)";
      } else if (variant === "smoke") {
        gsap.set(line, { transformPerspective: 1200, transformOrigin: "50% 50%" });
        fromVars = { opacity: 0, y: 32, skewX: i % 2 === 0 ? -8 : 8, scale: 0.94, filter: "blur(30px)" };
        holdVars = { opacity: 1, y: 0, skewX: 0, scale: 1, filter: "blur(0px)" };
        exitVars = { opacity: 0, y: -38, skewX: i % 2 === 0 ? 9 : -9, scale: 1.1, filter: "blur(24px)" };
        leaveEase = "power1.in";
      } else {
        gsap.set(line, { transformPerspective: 1200, transformOrigin: "50% 50%" });
        fromVars = { opacity: 0, z: -260, scale: 0.56, filter: "blur(18px)" };
        holdVars = { opacity: 1, z: 0, scale: 1, filter: "blur(0px)" };
        exitVars = { opacity: 0, z: 180, scale: 1.14, filter: "blur(12px)" };
      }

      gsap.set(line, fromVars);
      tl.to(line, { ...holdVars, duration: step * 0.4, ease: enterEase }, t0)
        .to(line, { ...holdVars, duration: step * 0.25 }, t0 + step * 0.4)
        .to(line, { ...exitVars, duration: step * 0.35, ease: leaveEase }, t0 + step * 0.65);
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

    charReveal(document.querySelector(".galaxy__title"), { variant: "zoom" });
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
    gsap.utils.toArray(".section-overlay").forEach((layer) => {
      gsap.set(layer, { opacity: 1 });
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
    // Three visibly different reveal recipes, cycled by index so
    // adjacent words never move identically: "glow" (blur+scale, the
    // original), "rise" (drifts up out of a soft blur, no scale pop),
    // "spin" (rotates in off-axis while scaling, more physical/tumbling).
    words.forEach((word, i) => {
      const anchorSel = FLOAT_WORD_ANCHORS[word.textContent.trim()];
      const anchor = anchorSel && document.querySelector(anchorSel);
      const variant = WORD_VARIANTS[i % WORD_VARIANTS.length];

      let fromVars, holdVars, exitVars;
      if (variant === "rise") {
        gsap.set(word, { transformPerspective: 600 });
        fromVars = { opacity: 0, y: 46, filter: floatBlur(18) };
        holdVars = { opacity: 1, y: 0, filter: "none" };
        exitVars = { opacity: 0, y: -46, filter: floatBlur(16) };
      } else if (variant === "zoom") {
        gsap.set(word, { transformPerspective: 1100, transformOrigin: "50% 50%" });
        fromVars = { opacity: 0, z: -320, scale: 0.44, filter: floatBlur(22) };
        holdVars = { opacity: 1, z: 0, scale: 1, filter: "none" };
        exitVars = { opacity: 0, z: 180, scale: 1.2, filter: floatBlur(16) };
      } else if (variant === "collide") {
        gsap.set(word, { transformPerspective: 1000, transformOrigin: i % 2 === 0 ? "0% 50%" : "100% 50%" });
        fromVars = { opacity: 0, x: i % 2 === 0 ? 160 : -160, scaleX: 1.18, scaleY: 0.82, rotateZ: i % 2 === 0 ? -5 : 5, filter: floatBlur(18) };
        holdVars = { opacity: 1, x: 0, scaleX: 1, scaleY: 1, rotateZ: 0, filter: "none" };
        exitVars = { opacity: 0, x: i % 2 === 0 ? -120 : 120, scaleX: 0.92, scaleY: 1.08, rotateZ: i % 2 === 0 ? 4 : -4, filter: floatBlur(14) };
      } else if (variant === "flip") {
        gsap.set(word, { transformPerspective: 1200, transformOrigin: "50% 50%" });
        fromVars = { opacity: 0, rotateY: i % 2 === 0 ? -86 : 86, rotateX: 14, scale: 0.82, filter: floatBlur(16) };
        holdVars = { opacity: 1, rotateY: 0, rotateX: 0, scale: 1, filter: "none" };
        exitVars = { opacity: 0, rotateY: i % 2 === 0 ? 74 : -74, rotateX: -10, scale: 1.08, filter: floatBlur(14) };
      } else if (variant === "bounce") {
        gsap.set(word, { transformPerspective: 900, transformOrigin: "50% 100%" });
        fromVars = { opacity: 0, y: 96, scaleY: 1.28, scaleX: 0.82, filter: floatBlur(16) };
        holdVars = { opacity: 1, y: 0, scaleY: 1, scaleX: 1, filter: "none" };
        exitVars = { opacity: 0, y: -58, scaleY: 0.88, scaleX: 1.08, filter: floatBlur(14) };
      } else if (variant === "smoke") {
        gsap.set(word, { transformPerspective: 900, transformOrigin: "50% 50%" });
        fromVars = { opacity: 0, y: 22, scale: 0.9, skewX: i % 2 === 0 ? -8 : 8, filter: floatBlur(28) };
        holdVars = { opacity: 1, y: 0, scale: 1, skewX: 0, filter: "none" };
        exitVars = { opacity: 0, y: -38, scale: 1.12, skewX: i % 2 === 0 ? 10 : -10, filter: floatBlur(24) };
      } else if (variant === "spin") {
        gsap.set(word, { transformPerspective: 600 });
        fromVars = { opacity: 0, scale: 0.6, rotate: -12, filter: floatBlur(14) };
        holdVars = { opacity: 1, scale: 1, rotate: 0, filter: "none" };
        exitVars = { opacity: 0, scale: 1.25, rotate: 10, filter: floatBlur(14) };
      } else {
        fromVars = { opacity: 0, scale: 0.72, filter: floatBlur(16) };
        holdVars = { opacity: 1, scale: 1, filter: "none" };
        exitVars = { opacity: 0, scale: 1.18, filter: floatBlur(14) };
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

    const grouped = new Map();
    phrases.forEach((phrase) => {
      const key = phrase.dataset.anchor;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(phrase);
    });

    grouped.forEach((group, anchorSel) => {
      const anchor = document.querySelector(anchorSel);
      if (!anchor) return;

      group.forEach((phrase, index) => {
        const style = phrase.dataset.style;
        const side = phrase.dataset.side === "right" ? 1 : -1;
        const segment = 1 / group.length;
        const entry = index * segment;
        const revealAt = entry + segment * 0.08;
        const holdAt = entry + segment * 0.34;
        const exitAt = entry + segment * 0.72;

        let revealVars;
        let holdVars;
        let exitVars;

        if (style === "slide") {
          revealVars = { opacity: 0, x: 90 * side, rotation: 5 * side, filter: floatBlur(12) };
          holdVars = { opacity: 1, x: 0, rotation: 0, filter: "none" };
          exitVars = { opacity: 0, x: 130 * side, rotation: 7 * side, filter: floatBlur(12) };
        } else if (style === "zoom") {
          gsap.set(phrase, { transformPerspective: 1200, transformOrigin: "50% 50%" });
          revealVars = { opacity: 0, z: -260, scale: 0.56, filter: floatBlur(18) };
          holdVars = { opacity: 1, z: 0, scale: 1, filter: "none" };
          exitVars = { opacity: 0, z: 180, scale: 1.12, filter: floatBlur(14) };
        } else if (style === "collide") {
          gsap.set(phrase, { transformPerspective: 1200, transformOrigin: side < 0 ? "0% 50%" : "100% 50%" });
          revealVars = { opacity: 0, x: 150 * side, scaleX: 1.14, scaleY: 0.84, rotateZ: 4 * side, filter: floatBlur(16) };
          holdVars = { opacity: 1, x: 0, scaleX: 1, scaleY: 1, rotateZ: 0, filter: "none" };
          exitVars = { opacity: 0, x: -118 * side, scaleX: 0.94, scaleY: 1.06, rotateZ: -4 * side, filter: floatBlur(12) };
        } else if (style === "flip") {
          gsap.set(phrase, { transformPerspective: 1400, transformOrigin: "50% 50%" });
          revealVars = { opacity: 0, rotateY: 84 * side, rotateX: -10, scale: 0.88, filter: floatBlur(15) };
          holdVars = { opacity: 1, rotateY: 0, rotateX: 0, scale: 1, filter: "none" };
          exitVars = { opacity: 0, rotateY: -70 * side, rotateX: 8, scale: 1.08, filter: floatBlur(13) };
        } else if (style === "bounce") {
          gsap.set(phrase, { transformPerspective: 1000, transformOrigin: "50% 100%" });
          revealVars = { opacity: 0, y: 86, scaleY: 1.24, scaleX: 0.84, filter: floatBlur(16) };
          holdVars = { opacity: 1, y: 0, scaleY: 1, scaleX: 1, filter: "none" };
          exitVars = { opacity: 0, y: -42, scaleY: 0.9, scaleX: 1.06, filter: floatBlur(12) };
        } else if (style === "smoke") {
          gsap.set(phrase, { transformPerspective: 1000, transformOrigin: "50% 50%" });
          revealVars = { opacity: 0, y: 18, x: 20 * side, skewX: -7 * side, scale: 0.92, filter: floatBlur(26) };
          holdVars = { opacity: 1, y: 0, x: 0, skewX: 0, scale: 1, filter: "none" };
          exitVars = { opacity: 0, y: -28, x: 28 * side, skewX: 8 * side, scale: 1.1, filter: floatBlur(24) };
        } else {
          revealVars = { opacity: 0, y: 26, skewY: 5, scale: 0.92, filter: floatBlur(14) };
          holdVars = { opacity: 1, y: 0, skewY: 0, scale: 1, filter: "none" };
          exitVars = { opacity: 0, y: -26, skewY: -5, scale: 0.94, filter: floatBlur(12) };
        }

        gsap.set(phrase, revealVars);
        if (reduceMotion) return;

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: anchor,
            start: "top 54%",
            end: "bottom 24%",
            scrub: true,
            onLeave: () => gsap.set(phrase, { opacity: 0 }),
            onLeaveBack: () => gsap.set(phrase, { opacity: 0 }),
          },
        });

        const enterEase = style === "bounce" ? "back.out(1.5)" : style === "collide" ? "power4.out" : "power2.out";
        const exitEase = style === "smoke" ? "power1.in" : "power2.in";

        tl.to(phrase, { ...holdVars, duration: segment * 0.24, ease: enterEase }, revealAt)
          .to(phrase, { ...holdVars, duration: segment * 0.22 }, holdAt)
          .to(phrase, { ...exitVars, duration: segment * 0.24, ease: exitEase }, exitAt);
      });
    });
  });

  safeRun("interactiveObjects", function () {
    const heroOrbitals = gsap.utils.toArray(".hero__orbital");
    const ctaTokens = gsap.utils.toArray(".cta__token");
    if (!heroOrbitals.length && !ctaTokens.length) return;

    ctaTokens.forEach((node, index) => {
      gsap.to(node, {
        yPercent: index % 2 === 0 ? -10 : 10,
        rotate: index % 2 === 0 ? -2 : 2,
        duration: 2.8 + index * 0.2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
    });

    const hero = document.querySelector(".hero");
    if (heroOrbitals.length && hero && !reduceMotion) {
      const clusterOffsets = [
        { x: -210, y: 68, scale: 0.98, rotate: -7 },
        { x: -94, y: -56, scale: 0.94, rotate: -4 },
        { x: 82, y: -76, scale: 0.92, rotate: 3 },
        { x: 206, y: 46, scale: 1, rotate: 7 }
      ];

      function setOrbitalVars(node, values) {
        gsap.set(node, {
          "--orbital-scroll-x": values.x + "px",
          "--orbital-scroll-y": values.y + "px",
          "--orbital-scale": values.scale,
          "--orbital-rotate": values.rotate + "deg",
          opacity: values.opacity
        });
      }

      function computeBaseShift(node, target) {
        const heroRect = hero.getBoundingClientRect();
        const rect = node.getBoundingClientRect();
        const nodeCenterX = rect.left - heroRect.left + rect.width / 2;
        const nodeCenterY = rect.top - heroRect.top + rect.height / 2;
        const targetCenterX = heroRect.width / 2 + target.x;
        const targetCenterY = heroRect.height * 0.5 + target.y;
        return {
          x: targetCenterX - nodeCenterX,
          y: targetCenterY - nodeCenterY
        };
      }

      function renderOrbitals(progress) {
        heroOrbitals.forEach((node, index) => {
          const cluster = clusterOffsets[index] || clusterOffsets[clusterOffsets.length - 1];
          const shift = computeBaseShift(node, cluster);

          let values;
          if (progress < 0.42) {
            const local = progress / 0.42;
            const eased = gsap.parseEase("power3.out")(local);
            values = {
              x: shift.x * eased,
              y: shift.y * eased,
              scale: 0.72 + eased * (cluster.scale - 0.72),
              rotate: cluster.rotate * eased,
              opacity: 0.18 + eased * 0.82
            };
          } else if (progress < 0.76) {
            const local = (progress - 0.42) / 0.34;
            const wave = Math.sin(local * Math.PI * 2);
            const sway = Math.cos(local * Math.PI * 1.5);
            values = {
              x: shift.x + wave * (12 + index * 3),
              y: shift.y + sway * (10 + index * 2),
              scale: cluster.scale + Math.sin(local * Math.PI) * 0.045,
              rotate: cluster.rotate + wave * 5,
              opacity: 1
            };
          } else {
            const local = (progress - 0.76) / 0.24;
            const eased = gsap.parseEase("power2.inOut")(local);
            const exitX = shift.x + (index < 2 ? -82 : 82);
            const exitY = shift.y + (index % 2 === 0 ? -54 : 54);
            values = {
              x: gsap.utils.interpolate(shift.x, exitX, eased),
              y: gsap.utils.interpolate(shift.y, exitY, eased),
              scale: gsap.utils.interpolate(cluster.scale, cluster.scale * 0.94, eased),
              rotate: gsap.utils.interpolate(cluster.rotate, cluster.rotate + (index < 2 ? -6 : 6), eased),
              opacity: gsap.utils.interpolate(1, 0.72, eased)
            };
          }

          setOrbitalVars(node, values);
        });
      }

      heroOrbitals.forEach((node) => {
        gsap.set(node, {
          "--orbital-scroll-x": "0px",
          "--orbital-scroll-y": "0px",
          "--orbital-mouse-x": "0px",
          "--orbital-mouse-y": "0px",
          "--orbital-scale": 0.72,
          "--orbital-rotate": "0deg",
          opacity: 0.18
        });
      });

      const orbitalTrigger = ScrollTrigger.create({
        trigger: hero,
        start: "top 92%",
        end: "bottom top",
        scrub: true,
        onUpdate: (self) => renderOrbitals(self.progress)
      });

      renderOrbitals(orbitalTrigger.progress || 0);
      window.addEventListener("resize", () => renderOrbitals(orbitalTrigger.progress || 0));
    }

    if (isTouch || reduceMotion) return;

    const cta = document.querySelector(".cta");

    function applyParallax(container, selector, event) {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const rx = ((event.clientX - rect.left) / rect.width) - 0.5;
      const ry = ((event.clientY - rect.top) / rect.height) - 0.5;

      container.querySelectorAll(selector).forEach((node) => {
        const depth = parseFloat(node.dataset.depth || "0.18");
        if (selector === ".hero__orbital") {
          gsap.to(node, {
            "--orbital-mouse-x": (rx * 42 * depth).toFixed(2) + "px",
            "--orbital-mouse-y": (ry * 34 * depth).toFixed(2) + "px",
            duration: 0.5,
            ease: "power2.out"
          });
          return;
        }

        gsap.to(node, {
          x: rx * 42 * depth,
          y: ry * 34 * depth,
          duration: 0.5,
          ease: "power2.out"
        });
      });
    }

    if (hero) {
      hero.addEventListener("mousemove", (event) => applyParallax(hero, ".hero__orbital", event));
      hero.addEventListener("mouseleave", () => {
        hero.querySelectorAll(".hero__orbital").forEach((node) => {
          gsap.to(node, {
            "--orbital-mouse-x": "0px",
            "--orbital-mouse-y": "0px",
            duration: 0.5,
            ease: "power2.out"
          });
        });
      });
    }

    if (cta) {
      cta.addEventListener("mousemove", (event) => applyParallax(cta, ".cta__token", event));
      cta.addEventListener("mouseleave", () => {
        cta.querySelectorAll(".cta__token").forEach((node) => {
          gsap.to(node, { x: 0, y: 0, duration: 0.5, ease: "power2.out" });
        });
      });
    }
  });

  function clampFloatingText() {
    const overlays = gsap.utils.toArray(".floatword, .floatphrase");
    if (!overlays.length) return;

    const nav = document.querySelector(".nav");
    const navBottom = nav ? nav.getBoundingClientRect().bottom : 0;
    const safeTop = Math.max(navBottom + 18, window.innerHeight * 0.08);
    const safeSide = Math.max(20, window.innerWidth * 0.035);
    const safeBottom = Math.max(24, window.innerHeight * 0.06);

    overlays.forEach((el) => {
      if (!el.dataset.baseLeft) el.dataset.baseLeft = el.style.left || "50%";
      if (!el.dataset.baseTop) el.dataset.baseTop = el.style.top || "50%";

      el.style.left = el.dataset.baseLeft;
      el.style.top = el.dataset.baseTop;

      const container = el.closest(".section-overlay");
      const containerRect = container ? container.getBoundingClientRect() : {
        left: 0,
        top: 0,
        right: window.innerWidth,
        bottom: window.innerHeight,
        width: window.innerWidth,
        height: window.innerHeight
      };
      const rect = el.getBoundingClientRect();
      let dx = 0;
      let dy = 0;

      const minLeft = Math.max(containerRect.left + safeSide, safeSide);
      const maxRight = Math.min(containerRect.right - safeSide, window.innerWidth - safeSide);
      const minTop = Math.max(containerRect.top + safeTop * 0.15, safeTop);
      const maxBottom = Math.min(containerRect.bottom - safeBottom, window.innerHeight - safeBottom);

      if (rect.left < minLeft) dx = minLeft - rect.left;
      if (rect.right > maxRight) dx = maxRight - rect.right;
      if (rect.top < minTop) dy = minTop - rect.top;
      if (rect.bottom > maxBottom) dy = maxBottom - rect.bottom;

      if (dx || dy) {
        el.style.left = ((rect.left + rect.width / 2 + dx) - containerRect.left) + "px";
        el.style.top = ((rect.top + rect.height / 2 + dy) - containerRect.top) + "px";
      }
    });
  }

  clampFloatingText();

  safeRun("winnerBanner", function () {
    const banner = document.querySelector(".winner-banner");
    if (!banner) return;
    gsap.set(banner, {
      opacity: 0,
      y: 24,
      scale: 0.9,
      filter: "blur(10px)"
    });
    if (reduceMotion) return;

    ScrollTrigger.create({
      trigger: document.documentElement,
      start: "top top",
      end: "max",
      onUpdate: (self) => {
        const local = gsap.utils.clamp(0, 1, (self.progress - 0.9) / 0.1);
        const eased = gsap.parseEase("power3.out")(local);
        gsap.set(banner, {
          opacity: local,
          y: 24 * (1 - eased),
          scale: 0.9 + eased * 0.1,
          filter: "blur(" + ((1 - eased) * 10).toFixed(2) + "px)"
        });
      }
    });
  });

  function setupScrollCarousel(rootSelector, itemSelector, opts) {
    const root = document.querySelector(rootSelector);
    if (!root) return;

    const isQuote = rootSelector.indexOf("quote") !== -1;
    const wrap = root.querySelector(isQuote ? ".quote-carousel__wrap" : ".flags-carousel__wrap");
    const header = root.querySelector(isQuote ? ".quote-carousel__header" : ".flags-carousel__header");
    const track = root.querySelector(isQuote ? ".quote-carousel__track" : ".flags-carousel__track");
    const viewport = root.querySelector(isQuote ? ".quote-carousel__viewport" : ".flags-carousel__viewport");
    const cards = Array.from(root.querySelectorAll(itemSelector));
    if (!track || !cards.length || !viewport || !wrap) return;

    cards.forEach((card) => {
      gsap.set(card, {
        transformPerspective: 1600,
        transformOrigin: "50% 50%"
      });
    });

    function metrics() {
      const viewportWidth = viewport.clientWidth * 0.6;
      const firstCardWidth = cards[0]?.offsetWidth || 0;
      const sidePad = Math.max(24, viewportWidth * 0.08);
      const startX = viewportWidth + sidePad;
      const endX = -(track.scrollWidth + firstCardWidth + sidePad);
      return {
        viewportWidth,
        centerX: viewportWidth / 2,
        startX,
        endX,
        trackYStart: opts.trackYStart,
        trackYEnd: opts.trackYEnd,
        trackRotateStart: opts.trackRotateStart,
        trackRotateEnd: opts.trackRotateEnd
      };
    }

    function renderByProgress(progress) {
      const data = metrics();
      const x = gsap.utils.interpolate(data.startX, data.endX, progress);
      const y = gsap.utils.interpolate(data.trackYStart, data.trackYEnd, progress);
      const rotateZ = gsap.utils.interpolate(data.trackRotateStart, data.trackRotateEnd, progress);

      gsap.set(track, {
        x,
        y,
        rotateZ,
        rotateX: 0
      });

      let activeIndex = 0;
      let closest = Number.POSITIVE_INFINITY;

      cards.forEach((card, cardIndex) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2 + x;
        const delta = cardCenter - data.centerX;
        const absDelta = Math.abs(delta);
        if (absDelta < closest) {
          closest = absDelta;
          activeIndex = cardIndex;
        }

        const normalized = gsap.utils.clamp(-1, 1, delta / (data.viewportWidth * 0.56));
        const centerPull = 1 - Math.min(1, Math.abs(normalized));
        const scale = 0.82 + centerPull * 0.26;
        const opacity = Math.min(1, 0.26 + centerPull * 0.84);
        const blur = (1 - centerPull) * opts.maxBlur*2;

        gsap.set(card, {
          x: normalized * opts.sideDrift,
          y: 0,
          z: centerPull * opts.depthBoost,
          rotateY: -normalized * opts.rotateY,
          rotateX: 0,
          rotateZ: -normalized * opts.cardRotateZ,
          scale,
          opacity,
          filter: "blur(" + blur.toFixed(2) + "px)"
        });
      });

      cards.forEach((card, idx) => card.classList.toggle("is-active", idx === activeIndex));
    }

    if (reduceMotion) {
      renderByProgress(0.5);
      return;
    }

    const triggerRef = ScrollTrigger.create({
      trigger: root,
      start: "top top",
      end: "+=140%",
      pin: root,
      anticipatePin: 1,
      scrub: true,
      onUpdate: (self) => {
        renderByProgress(self.progress); // render the carousel track/cards
        if (header) {
          gsap.set(header, {
            xPercent: 86 - self.progress * 124,
            y: 0,
            opacity: 0.82 + self.progress * 0.58,
            filter: "blur(" + ((1 - self.progress) * 2).toFixed(2) + "px)"
          });
        }
      }
    });

    renderByProgress(0);
    window.addEventListener("resize", () => renderByProgress(triggerRef.progress));
  }

  safeRun("quoteCarousel", function () {
    setupScrollCarousel(".quote-carousel", ".quote-card", {
      entryOffset: 80,
      exitOffset: 120,
      trackYStart: 0,
      trackYEnd: 0,
      trackRotateStart: 0,
      trackRotateEnd: 0,
      sideDrift: -18,
      verticalArc: 0,
      depthBoost: 120,
      rotateY: 30,
      rotateX: 0,
      cardRotateZ: 4,
      maxBlur: 4.6
    });
  });

  safeRun("flagsCarousel", function () {
    setupScrollCarousel(".flags-carousel", ".flag-card", {
      entryOffset: 60,
      exitOffset: 100,
      trackYStart: 0,
      trackYEnd: 0,
      trackRotateStart: 0,
      trackRotateEnd: 0,
      sideDrift: -20,
      verticalArc: 0,
      depthBoost: 108,
      rotateY: 26,
      rotateX: 0,
      cardRotateZ: 3.5,
      maxBlur: 4.2
    });
  });

  safeRun("sectionPins", function () {
    if (reduceMotion) return;
    gsap.utils.toArray(".hero, .hero-copy, .feature, .stats, .statement, .cta").forEach((section) => {
      const holdRatio = section.matches(".hero")
        ? 0.42
        : section.matches(".hero-copy")
          ? 0.32
          : section.matches(".statement, .cta")
            ? 0.22
            : 0.34;
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: () => "+=" + Math.round(window.innerHeight * (window.innerWidth < 900 ? holdRatio * 0.7 : holdRatio)),
        pin: true,
        anticipatePin: 1,
        pinSpacing: true,
        invalidateOnRefresh: true
      });
    });
  });

  safeRun("seasonChipDrift", function () {
    const chip = document.querySelector(".hero__season-chip");
    const hero = document.querySelector(".hero");
    if (!chip || !hero) return;

    if (reduceMotion) {
      gsap.set(chip, { xPercent: 0 });
      return;
    }

    gsap.to(chip, {
      xPercent: -42,
      ease: "none",
      scrollTrigger: {
        trigger: hero,
        start: "top bottom",
        end: "bottom top",
        scrub: true
      }
    });
  });

  /* ---------------------------------------------------------
     7. FEATURE SECTIONS — text-only "product reveal" moments.
     Big display title gets the character-stagger materialize;
     body/list get the standard reveal-and-fade.
     --------------------------------------------------------- */
  safeRun("featureSections", function () {
    document.querySelectorAll(".feature").forEach((section, index) => {
      const title = section.querySelector(".feature__title");
      const body = section.querySelector(".feature__body");
      const list = section.querySelector(".feature__list");
      const eyebrow = section.querySelector(".eyebrow");
      const titleVariant = ["zoom", "flip", "collide", "bounce", "smoke"][index % 5];
      const bodyVariant = ["smoke", "collide", "flip", "bounce", "zoom"][index % 5];
      const eyebrowVariant = ["flip", "collide", "bounce", "smoke", "zoom"][index % 5];

      charReveal(title, { variant: titleVariant });
      if (body) revealAndFade(body, { variant: bodyVariant, y: 42 });
      if (list) revealAndFade(list, { variant: bodyVariant, y: 34, stagger: 0.03 });
      if (eyebrow) revealAndFade(eyebrow, { variant: eyebrowVariant, y: 26 });
    });
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

    charReveal(document.querySelector(".stats__intro .feature__title"), { variant: "collide" });
    revealAndFade(".stats__intro .eyebrow", { variant: "flip", y: 24 });
    revealAndFade(".stat", { y: 32, stagger: 0.05, variant: "bounce" });
  });

  /* ---------------------------------------------------------
     9. STATEMENT — word by word scroll reveal, PLUS the whole block
     floats into and back out of focus (blur+fade) the same way every
     other text block on the site does — the word-lighting is layered
     on top of that, not a replacement for it.
     --------------------------------------------------------- */
  safeRun("statement", function () {
    revealAndFade(".statement .wrap", { variant: "smoke", y: 36 });
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
    charReveal(document.querySelector(".cta__title"), { variant: "flip" });
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
        clampFloatingText();
        ScrollTrigger.refresh();
      }, delay || 120);
    }

    window.addEventListener("resize", () => scheduleRefresh(200));

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => scheduleRefresh(80));
    }
    window.addEventListener("load", () => scheduleRefresh(80));
    window.addEventListener("load", () => refreshVisibilityLifecycle(140));

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
    if (preloaderEl) {
      preloaderEl.style.pointerEvents = "none";
      preloaderEl.style.visibility = "hidden";
      preloaderEl.style.display = "none";
    }
    document.body.classList.add("is-ready");
    if (typeof ScrollTrigger !== "undefined") {
      requestAnimationFrame(() => {
        ScrollTrigger.sort();
        ScrollTrigger.refresh();
        requestAnimationFrame(() => ScrollTrigger.update());
      });
    }
  }
})();
