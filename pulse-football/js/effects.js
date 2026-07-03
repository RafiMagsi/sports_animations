/* =========================================================
   PULSE — effects.js
   Canvas-driven extras: video-to-frame scrubbing, a galaxy
   starfield, and a glitter/sparkle burst — all tied to scroll.
   Depends on gsap + ScrollTrigger already being loaded (main.js
   registers the plugin), and runs after DOM is parsed.
   ========================================================= */

(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  function sizeCanvasToParent(canvas, dprOverride) {
    const dpr = dprOverride || DPR;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    return { w: canvas.width, h: canvas.height };
  }

  /* ---------------------------------------------------------
     1. FIXED BACKGROUND VIDEO -> PRE-RENDERED FRAME CACHE, WITH A
     RESPONSIVE FALLBACK WHILE IT BUILDS

     Two things were wrong before:
     - Priming built its cache by sequentially seeking the SAME
       <video> the page could also scrub live. Building the cache
       takes real time (each seek is a real network+decode round
       trip); while it ran, scroll updates were flat-out ignored
       ("if (!framesReady) return"), so the page felt frozen/slow
       for however long priming took.
     - The very first priming seek asks for t=0, but the video's
       currentTime is usually already ~0 right after load — some
       browsers never fire "seeked" for a no-op seek, which hung
       the entire priming loop forever on frame 1.

     Fixed by splitting the job across TWO <video> elements:
     - `video` (the visible one in the DOM) handles live, on-demand
       scrubbing from the very first scroll, same technique as
       before — so the background is ALWAYS responsive, even before
       priming finishes.
     - `primer` is a second, invisible video element built purely in
       memory, used only to sweep through timestamps and cache
       decoded stills. It never touches the one the user is
       scrubbing, so there's no contention between the two.
     Once the cache finishes, scrubbing switches over to instant
     cache look-ups automatically. Every seek (live or priming) now
     has a timeout safety net so a stalled network request can never
     hang anything indefinitely.
     --------------------------------------------------------- */
  function setupBackgroundVideo() {
    const video = document.querySelector(".bg-video__src");
    const canvas = document.querySelector(".bg-video__canvas");
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    video.pause();
    video.removeAttribute("autoplay");

    // Scroll-scrubbing should show every real frame of the source video, not
    // a sparse sample of it (a fixed low count skips visible motion between
    // cached stills). Instead of a flat constant, the cache is sized to the
    // video's own duration at its typical frame rate once that's known, so
    // scrubbing tracks 1:1 with the footage instead of stepping between a
    // handful of samples. Capped so a long clip can't blow the memory/
    // priming budget on what's still just a backdrop layer.
    const TARGET_FPS = 60; // bumped from 30 — matches higher-fps source footage 1:1 instead of sub-sampling it
    const MIN_FRAMES = 90;
    const MAX_FRAMES = 420;
    function resolveFrameCount(duration) {
      if (!duration || isNaN(duration)) return MIN_FRAMES;
      return Math.min(MAX_FRAMES, Math.max(MIN_FRAMES, Math.round(duration * TARGET_FPS)));
    }
    let FRAME_COUNT = MIN_FRAMES; // recomputed for real once video.duration is known, in start()
    const CAPTURE_MAX_DIM = 560; // trimmed further vs. before — a much higher frame count needs a smaller per-frame footprint to stay memory-safe
    const CANVAS_DPR = Math.min(window.devicePixelRatio || 1, 1.5); // the biggest draw surface on the page — cap it harder than DPR=2
    const frames = [];
    let framesReady = false;
    let dims = sizeCanvasToParent(canvas, CANVAS_DPR);
    let lastDrawnIndex = -1;

    function drawFromCache(index) {
      const frame = frames[index];
      if (!frame) return;
      const cw = dims.w;
      const ch = dims.h;
      const scale = Math.max(cw / frame.width, ch / frame.height);
      const dw = frame.width * scale;
      const dh = frame.height * scale;
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(frame, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    }

    function drawLiveFrame(source) {
      if (!source.videoWidth || !source.videoHeight) return;
      const cw = dims.w;
      const ch = dims.h;
      const scale = Math.max(cw / source.videoWidth, ch / source.videoHeight);
      const dw = source.videoWidth * scale;
      const dh = source.videoHeight * scale;
      ctx.clearRect(0, 0, cw, ch);
      ctx.filter = "saturate(1.1) contrast(1.05) brightness(0.92)";
      ctx.drawImage(source, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
      ctx.filter = "none";
    }

    window.addEventListener("resize", () => {
      dims = sizeCanvasToParent(canvas, CANVAS_DPR);
      if (framesReady && lastDrawnIndex >= 0) drawFromCache(lastDrawnIndex);
      else drawLiveFrame(video);
    });

    // seek-and-wait with a hard timeout — some browsers never fire
    // "seeked" for a no-op seek (target ~= current time), which would
    // otherwise hang whichever loop is awaiting it forever
    function seekTo(el, t, timeoutMs) {
      return new Promise((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          el.removeEventListener("seeked", onSeeked);
          clearTimeout(timer);
          resolve();
        };
        const onSeeked = finish;
        const timer = setTimeout(finish, timeoutMs || 350);
        el.addEventListener("seeked", onSeeked);
        try {
          el.currentTime = t;
        } catch (e) {
          finish();
        }
      });
    }

    /* -- live, on-demand scrubbing: always available, works the
       instant the page loads, throttled to one in-flight seek at a
       time so a burst of scroll events can't pile up requests -- */
    let liveSeeking = false;
    let livePendingTime = null;
    function requestLiveSeek(t) {
      livePendingTime = t;
      if (!liveSeeking) doLiveSeek();
    }
    function doLiveSeek() {
      if (livePendingTime === null) return;
      const t = livePendingTime;
      livePendingTime = null;
      liveSeeking = true;
      seekTo(video, t).then(() => {
        drawLiveFrame(video);
        liveSeeking = false;
        if (livePendingTime !== null) doLiveSeek();
      });
    }

    /* -- background priming on a second, invisible video element -- */
    async function primeFrames(duration) {
      const primer = document.createElement("video");
      primer.muted = true;
      primer.playsInline = true;
      primer.preload = "auto";
      primer.src = video.currentSrc || video.src;

      await new Promise((resolve) => {
        if (primer.readyState >= 1) return resolve();
        primer.addEventListener("loadedmetadata", resolve, { once: true });
        setTimeout(resolve, 2000); // don't block forever if metadata is slow
      });

      const vw = primer.videoWidth || video.videoWidth;
      const vh = primer.videoHeight || video.videoHeight;
      if (!vw || !vh) return;
      const captureScale = Math.min(1, CAPTURE_MAX_DIM / Math.max(vw, vh));
      const cw = Math.max(1, Math.round(vw * captureScale));
      const ch = Math.max(1, Math.round(vh * captureScale));

      for (let i = 0; i < FRAME_COUNT; i++) {
        const t = (i / (FRAME_COUNT - 1)) * duration;
        await seekTo(primer, t, 600);
        const off = document.createElement("canvas");
        off.width = cw;
        off.height = ch;
        const octx = off.getContext("2d");
        octx.filter = "saturate(1.1) contrast(1.05) brightness(0.92)";
        octx.drawImage(primer, 0, 0, cw, ch);
        frames[i] = off;
      }
      framesReady = true;
      // snap straight to whatever the correct frame is for the
      // current scroll position now that the cache is ready
      if (lastScrollProgress !== null) {
        const index = Math.round(lastScrollProgress * (FRAME_COUNT - 1));
        lastDrawnIndex = index;
        drawFromCache(index);
      }
      primer.src = ""; // release it, its job is done
    }

    let lastScrollProgress = null;

    function bindScroll(duration) {
      if (reduceMotion) {
        requestLiveSeek(Math.min(1.2, duration || 0));
        return;
      }

      ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => {
          lastScrollProgress = self.progress;
          if (framesReady) {
            const index = Math.round(self.progress * (FRAME_COUNT - 1));
            if (index === lastDrawnIndex) return;
            lastDrawnIndex = index;
            drawFromCache(index);
          } else {
            requestLiveSeek(self.progress * duration);
          }
        },
      });
    }

    video.addEventListener("loadeddata", () => drawLiveFrame(video), { once: true });

    function start() {
      const duration = video.duration;
      FRAME_COUNT = resolveFrameCount(duration); // size the cache to this specific clip's length before anything reads it
      bindScroll(duration);
      if (!reduceMotion && duration && !isNaN(duration)) primeFrames(duration);
    }

    if (video.readyState >= 1) {
      start();
    } else {
      video.addEventListener("loadedmetadata", start, { once: true });
    }
  }

  /* ---------------------------------------------------------
     SHARED: "gather field" math
     A particle starts somewhere OUTSIDE the visible canvas (in a
     random direction, far enough out that it's never on-screen at
     rest) and eases toward a target point near the center as
     `gatherProgress` runs 0 -> 1. Used by both the galaxy and the
     CTA sparkle burst so the whole site shares one visual verb:
     things arrive from off-screen and resolve into a shape.
     --------------------------------------------------------- */
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }
  function clamp01(v) {
    return Math.min(1, Math.max(0, v));
  }
  function makeIncomingParticle() {
    return {
      inAngle: Math.random() * Math.PI * 2,
      inDist: 1.15 + Math.random() * 0.95, // multiplier of half-diagonal — safely off-canvas
    };
  }
  function incomingPos(p, cw, ch) {
    const halfDiag = Math.hypot(cw, ch) / 2;
    const d = p.inDist * halfDiag;
    return {
      x: cw / 2 + Math.cos(p.inAngle) * d,
      y: ch / 2 + Math.sin(p.inAngle) * d,
    };
  }

  /* ---------------------------------------------------------
     2. GALAXY — a real WebGL 3D particle system (Three.js), not a
     flat canvas trick. Thousands of points start scattered through
     3D space around the scene and fly inward along an eased path
     into a spiral-disc galaxy at the origin, while the camera
     dollies in and tilts. A pinned ScrollTrigger drives the gather;
     past 75% it's pure payoff — the formed disc keeps spinning and
     the camera keeps easing in before the section unpins.
     --------------------------------------------------------- */
  function setupGalaxy() {
    const section = document.querySelector(".galaxy");
    const canvas = document.querySelector(".galaxy__canvas");
    if (!section || !canvas || !window.THREE) return;

    const THREE = window.THREE;
    const isSmall = window.innerWidth < 700;
    const PARTICLE_COUNT = isSmall ? 2000 : 4200;
    const DISC_RADIUS = 34; // was 26 — bigger disc fills the frame instead of reading as sparse dots
    const SPIRAL_TWIST = 3.1;
    const CAM_FAR_Z = 78; // was 100 — closer start so the scene isn't mostly empty black
    const CAM_NEAR_Z = 30; // was 46 — closer finish, disc reads big by the time it's gathered

    let renderer, scene, camera, group, points, core;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch (e) {
      return; // no WebGL — leave the section's CSS background as-is
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmall ? 1.5 : 2));

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(58, 1, 0.1, 500);
    camera.position.set(0, 20, CAM_FAR_Z);
    camera.lookAt(0, 0, 0);

    group = new THREE.Group();
    scene.add(group);

    // -- soft round sprite texture, shared by all points/glow sprites --
    function makeGlowTexture() {
      const s = 128;
      const c = document.createElement("canvas");
      c.width = c.height = s;
      const tctx = c.getContext("2d");
      const g = tctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.4, "rgba(255,255,255,0.6)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      tctx.fillStyle = g;
      tctx.fillRect(0, 0, s, s);
      return new THREE.CanvasTexture(c);
    }
    const glowTex = makeGlowTexture();

    // -- particle field: each particle has a start point somewhere out in
    // 3D space, and a target point on the spiral disc --
    const starts = new Float32Array(PARTICLE_COUNT * 3);
    const targets = new Float32Array(PARTICLE_COUNT * 3);
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    const coreColor = new THREE.Color("#fdfff2");
    const rimColor = new THREE.Color("#f472b6");
    const midColor = new THREE.Color("#8b5cf6");

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const radiusFrac = Math.sqrt(Math.random());
      const angle = Math.random() * Math.PI * 2;
      const r = radiusFrac * DISC_RADIUS;
      const spiralAngle = angle + radiusFrac * SPIRAL_TWIST;
      const thickness = (1 - radiusFrac * 0.7) * 2.2;
      const ty = (Math.random() - 0.5) * thickness;
      const tx = Math.cos(spiralAngle) * r;
      const tz = Math.sin(spiralAngle) * r;
      targets[i * 3] = tx;
      targets[i * 3 + 1] = ty;
      targets[i * 3 + 2] = tz;

      // start point: random direction, well outside the disc
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const dist = DISC_RADIUS * (2.4 + Math.random() * 2.4);
      starts[i * 3] = Math.sin(phi) * Math.cos(theta) * dist;
      starts[i * 3 + 1] = Math.cos(phi) * dist * 0.6;
      starts[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * dist;

      positions[i * 3] = starts[i * 3];
      positions[i * 3 + 1] = starts[i * 3 + 1];
      positions[i * 3 + 2] = starts[i * 3 + 2];

      const mixed =
        radiusFrac < 0.4
          ? coreColor.clone().lerp(midColor, radiusFrac / 0.4)
          : midColor.clone().lerp(rimColor, (radiusFrac - 0.4) / 0.6);
      colors[i * 3] = mixed.r;
      colors[i * 3 + 1] = mixed.g;
      colors[i * 3 + 2] = mixed.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: isSmall ? 0.55 : 0.7,
      map: glowTex,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      opacity: 0.9,
    });

    points = new THREE.Points(geometry, material);
    group.add(points);

    // -- glowing core sprite, blooms in once mostly gathered --
    const coreMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0x22d3ee,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0,
    });
    core = new THREE.Sprite(coreMat);
    core.scale.set(6, 6, 1);
    group.add(core);

    let gatherProgress = reduceMotion ? 1 : 0;
    let idleRotation = 0;
    let lastTime = null;
    const posAttr = geometry.attributes.position;

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      renderer.setSize(rect.width, rect.height, false);
    }
    resize();

    function tick(time) {
      if (lastTime === null) lastTime = time;
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;

      idleRotation += dt * 0.09;
      group.rotation.y = idleRotation;

      const eased = easeOutCubic(gatherProgress);
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const ix = i * 3;
        posAttr.array[ix] = starts[ix] + (targets[ix] - starts[ix]) * eased;
        posAttr.array[ix + 1] = starts[ix + 1] + (targets[ix + 1] - starts[ix + 1]) * eased;
        posAttr.array[ix + 2] = starts[ix + 2] + (targets[ix + 2] - starts[ix + 2]) * eased;
      }
      posAttr.needsUpdate = true;
      material.opacity = 0.35 + gatherProgress * 0.55;

      coreMat.opacity = clamp01((gatherProgress - 0.35) / 0.4) * 0.85;
      const coreScale = 3 + gatherProgress * 5;
      core.scale.set(coreScale, coreScale, 1);

      camera.position.z = CAM_FAR_Z + (CAM_NEAR_Z - CAM_FAR_Z) * eased;
      camera.position.y = 20 - eased * 12;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);

    // gather in, hold, then leave the same way they came — particles
    // fly back out toward their original off-screen start points as
    // the section scrolls past, mirroring the arrival instead of just
    // snapping to "gathered" and staying there. Matches the same
    // gather/hold/leave shape the vignette fade already uses.
    function galaxyEnvelope(p) {
      const gatherEnd = 0.35;
      const holdEnd = 0.65;
      if (p <= gatherEnd) return p / gatherEnd;
      if (p <= holdEnd) return 1;
      return 1 - (p - holdEnd) / (1 - holdEnd);
    }

    if (!reduceMotion) {
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "+=130%",
        pin: true,
        anticipatePin: 1,
        scrub: 1,
        onUpdate: (self) => {
          gatherProgress = clamp01(galaxyEnvelope(self.progress));
        },
      });
    }

    window.addEventListener("resize", resize);
  }


  /* ---------------------------------------------------------
     3. CTA GLITTER — small glints gather from off-screen into a
     ring behind the closing headline as that section scrolls
     into view, then keep a gentle twinkle. Same "arrive from
     outside, resolve into a shape" language as the galaxy.
     --------------------------------------------------------- */
  /* ---------------------------------------------------------
     2c. FEATURE AMBIENT — soft holo glow orbs drifting behind the
     feature sections' text. Plain 2D canvas (not another WebGL
     context — two is already plenty for one page), so it's cheap:
     a handful of blurred radial-gradient blobs drifting on their
     own slow sine paths, with a light scroll-linked parallax so
     they're not purely decorative-static.
     --------------------------------------------------------- */
  function setupFeatureAmbient() {
    document.querySelectorAll(".feature__ambient").forEach((canvas) => {
      const ctx = canvas.getContext("2d");
      let dims = sizeCanvasToParent(canvas);
      const COLORS = ["#22d3ee", "#8b5cf6", "#f472b6"];
      const ORB_COUNT = 6;
      const orbs = [];
      for (let i = 0; i < ORB_COUNT; i++) {
        orbs.push({
          baseX: Math.random(),
          baseY: Math.random(),
          r: 0.16 + Math.random() * 0.16,
          speed: 0.15 + Math.random() * 0.2,
          phase: Math.random() * Math.PI * 2,
          color: COLORS[i % COLORS.length],
        });
      }

      let parallax = 0;
      let lastTime = null;

      function draw(time) {
        if (lastTime === null) lastTime = time;
        lastTime = time;
        const cw = dims.w;
        const ch = dims.h;
        ctx.clearRect(0, 0, cw, ch);
        ctx.globalCompositeOperation = "lighter";
        orbs.forEach((o) => {
          const t = time * 0.0002 * o.speed + o.phase;
          const x = (o.baseX + Math.sin(t) * 0.06) * cw;
          const y = (o.baseY + Math.cos(t * 0.8) * 0.05) * ch + parallax * 40;
          const r = o.r * Math.min(cw, ch);
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, o.color + "26"); // ~15% alpha
          g.addColorStop(1, o.color + "00");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalCompositeOperation = "source-over";
      }

      function loop(time) {
        draw(time);
        requestAnimationFrame(loop);
      }

      if (reduceMotion) {
        draw(0);
      } else {
        requestAnimationFrame(loop);
        ScrollTrigger.create({
          trigger: canvas.parentElement,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
          onUpdate: (self) => {
            parallax = self.progress - 0.5;
          },
        });
      }

      window.addEventListener("resize", () => {
        dims = sizeCanvasToParent(canvas);
      });
    });
  }

  function setupCtaSparkles() {
    const section = document.querySelector(".cta");
    const canvas = document.querySelector(".cta__sparkles");
    if (!section || !canvas) return;

    const ctx = canvas.getContext("2d");
    let dims = sizeCanvasToParent(canvas);

    const HOLO_COLORS = ["#22d3ee", "#8b5cf6", "#f472b6", "#f4f6f2"];
    const COUNT = window.innerWidth < 700 ? 30 : 54;
    const bits = [];
    for (let i = 0; i < COUNT; i++) {
      bits.push({
        ...makeIncomingParticle(),
        angle: (i / COUNT) * Math.PI * 2 + Math.random() * 0.15,
        radiusFrac: 0.72 + Math.random() * 0.24,
        size: Math.random() * 5 + 2,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 1.4 + 0.6,
        color: HOLO_COLORS[(Math.random() * HOLO_COLORS.length) | 0],
      });
    }

    let gatherProgress = reduceMotion ? 1 : 0;

    function drawSpark(cx, cy, size, alpha, color) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color || "#f4f6f2";
      ctx.beginPath();
      ctx.moveTo(cx, cy - size);
      ctx.quadraticCurveTo(cx + size * 0.15, cy - size * 0.15, cx + size, cy);
      ctx.quadraticCurveTo(cx + size * 0.15, cy + size * 0.15, cx, cy + size);
      ctx.quadraticCurveTo(cx - size * 0.15, cy + size * 0.15, cx - size, cy);
      ctx.quadraticCurveTo(cx - size * 0.15, cy - size * 0.15, cx, cy - size);
      ctx.closePath();
      ctx.fill();
    }

    function draw(time) {
      const cw = dims.w;
      const ch = dims.h;
      ctx.clearRect(0, 0, cw, ch);
      if (gatherProgress <= 0.01) return;

      const eased = easeOutCubic(gatherProgress);
      const baseR = Math.min(cw, ch) * 0.4;

      for (const b of bits) {
        const start = incomingPos(b, cw, ch);
        const target = {
          x: cw / 2 + Math.cos(b.angle) * baseR * b.radiusFrac,
          y: ch / 2 + Math.sin(b.angle) * baseR * b.radiusFrac * 0.5,
        };
        const x = start.x + (target.x - start.x) * eased;
        const y = start.y + (target.y - start.y) * eased;

        const twinkle = 0.4 + 0.6 * Math.sin(time * 0.002 * b.speed + b.phase);
        const alpha = Math.max(0, twinkle) * gatherProgress;
        if (alpha <= 0.02) continue;
        drawSpark(x, y, b.size * DPR, alpha, b.color);
      }
      ctx.globalAlpha = 1;
    }

    function loop(time) {
      draw(time);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    if (!reduceMotion) {
      ScrollTrigger.create({
        trigger: section,
        start: "top 95%",
        end: "top 25%",
        scrub: true,
        onUpdate: (self) => {
          gatherProgress = self.progress;
        },
      });
    }

    window.addEventListener("resize", () => {
      dims = sizeCanvasToParent(canvas);
    });
  }

  /* ---------------------------------------------------------
     4. SOUND — procedurally synthesized via Web Audio, no audio
     files (same download restriction as video/images, and honestly
     synths are a better fit here anyway — tiny, no asset to manage,
     easy to retune). Starts muted: browsers block audio-with-sound
     until a user gesture unlocks it, and starting silent is simply
     more polite.
     --------------------------------------------------------- */
  function setupSound() {
    const btn = document.querySelector(".nav__sound");
    if (!btn) return;

    let ctx = null;
    let enabled = false;
    let masterGain = null;

    function ensureContext() {
      if (ctx) return ctx;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ctx = new AudioCtx();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.35;
      masterGain.connect(ctx.destination);
      return ctx;
    }

    function playArrivalChime() {
      if (!enabled || !ctx) return;
      const now = ctx.currentTime;
      // two soft sine tones (root + fifth) with a quick pluck envelope
      // and a gentle lowpass so it reads as a soft "arrival" cue, not
      // a harsh beep
      [523.25, 784.0].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 2200;
        osc.type = "sine";
        osc.frequency.value = freq;
        const start = now + i * 0.03;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.22, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.55);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        osc.start(start);
        osc.stop(start + 0.6);
      });
    }

    window.PULSE_playArrivalChime = playArrivalChime;

    btn.addEventListener("click", () => {
      enabled = !enabled;
      btn.setAttribute("aria-pressed", String(enabled));
      if (enabled) {
        const c = ensureContext();
        if (c && c.state === "suspended") c.resume();
      }
    });
  }

  function boot() {
    setupBackgroundVideo();
    setupGalaxy();
    setupFeatureAmbient();
    setupCtaSparkles();
    setupSound();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
