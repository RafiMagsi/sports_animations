/* =========================================================
   ZEN FOOTBALL — effects.js
   Canvas-driven extras: video-to-frame scrubbing, a galaxy
   starfield, and a glitter/sparkle burst — all tied to scroll.
   Depends on gsap + ScrollTrigger already being loaded (main.js
   registers the plugin), and runs after DOM is parsed.
   ========================================================= */

(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  // Shared between setupIntro() and setupBackgroundVideo(): the intro's
  // own pinned ScrollTrigger instance, plus the fraction of its progress
  // at which the football-shaped glitters start disappearing — the video
  // needs to start advancing its frames at that exact same instant, not
  // only once the whole cover has fully faded away.
  let introScrollTriggerRef = null;
  const INTRO_VIDEO_START_FRAC = 0.84;

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

    // drawImage calls below are guarded with try/catch: opening the site
    // straight from disk (file://, e.g. double-clicking index.html
    // instead of serving it) makes some browsers treat every local file
    // as its own unique, opaque origin — painting a local <video> frame
    // onto a canvas in that context can throw a SecurityError even
    // though nothing is actually cross-origin. Without this guard, that
    // exception fires inside a rAF/ScrollTrigger callback and can look
    // like the whole page has "frozen" or stopped animating, when only
    // this one background-video layer is affected.
    function drawFromCache(index) {
      const frame = frames[index];
      if (!frame) return;
      const cw = dims.w;
      const ch = dims.h;
      const scale = Math.max(cw / frame.width, ch / frame.height);
      const dw = frame.width * scale;
      const dh = frame.height * scale;
      try {
        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(frame, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
      } catch (err) {
        /* file:// canvas restriction or similar — safe to ignore */
      }
    }

    function drawLiveFrame(source) {
      if (!source.videoWidth || !source.videoHeight) return;
      const cw = dims.w;
      const ch = dims.h;
      const scale = Math.max(cw / source.videoWidth, ch / source.videoHeight);
      const dw = source.videoWidth * scale;
      const dh = source.videoHeight * scale;
      try {
        ctx.clearRect(0, 0, cw, ch);
        ctx.filter = "saturate(1.1) contrast(1.05) brightness(0.92)";
        ctx.drawImage(source, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
        ctx.filter = "none";
      } catch (err) {
        /* file:// canvas restriction or similar — safe to ignore */
      }
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
        try {
          octx.filter = "saturate(1.1) contrast(1.05) brightness(0.92)";
          octx.drawImage(primer, 0, 0, cw, ch);
        } catch (err) {
          /* file:// canvas restriction or similar — skip this frame,
             live scrubbing still works as the fallback */
          continue;
        }
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

    // The intro cover sits on top of the video and hides it completely.
    // Mapping frame-progress against the WHOLE document would mean the
    // intro's own pinned scroll distance silently eats into the video's
    // timeline before anyone can see it. Instead, frame 0 is anchored to
    // the EXACT scroll position where the intro's football-shaped
    // glitters start disappearing (INTRO_VIDEO_START_FRAC, shared with
    // setupIntro above) — that's the same instant the cover starts its
    // own fade-out in main.js, so the video visibly "starts scrolling"
    // right as the glitters go, not some arbitrary point before or
    // after. Falls back to the plain document-wide mapping if the intro
    // section isn't present for some reason.
    function bindScroll(duration) {
      if (reduceMotion) {
        requestLiveSeek(Math.min(1.2, duration || 0));
        return;
      }

      ScrollTrigger.create({
        // numeric start/end are absolute scroll-pixel positions, not
        // relative to any trigger element — a function is re-evaluated
        // on every ScrollTrigger.refresh(), so this stays correct even
        // if layout shifts (fonts loading, resize, etc.) recompute the
        // intro's own pinned start/end afterward
        start: introScrollTriggerRef
          ? () => introScrollTriggerRef.start + (introScrollTriggerRef.end - introScrollTriggerRef.start) * INTRO_VIDEO_START_FRAC
          : 0,
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
    if ("outputColorSpace" in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;

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
      g.addColorStop(0.18, "rgba(232,244,255,0.96)");
      g.addColorStop(0.42, "rgba(184,214,255,0.52)");
      g.addColorStop(0.72, "rgba(88,132,255,0.08)");
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
      size: isSmall ? 0.42 : 0.56,
      map: glowTex,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      opacity: 0.72,
    });

    points = new THREE.Points(geometry, material);
    group.add(points);

    // -- glowing core sprite, blooms in once mostly gathered --
    const coreMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0x8b5cf6,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0,
    });
    core = new THREE.Sprite(coreMat);
    core.scale.set(1, 1, 1);
    group.add(core);

    let gatherProgress = reduceMotion ? 1 : 0;
    let idleRotation = 0;
    let lastTime = null;
    const posAttr = geometry.attributes.position;
    const hover = { active: false, x: 0, y: 0, radius: isSmall ? 32 : 64 };
    const hoverVec = new THREE.Vector3();

    section.addEventListener("mousemove", (event) => {
      const rect = canvas.getBoundingClientRect();
      hover.x = event.clientX - rect.left;
      hover.y = event.clientY - rect.top;
      hover.active = hover.x >= 0 && hover.y >= 0 && hover.x <= rect.width && hover.y <= rect.height;
    });
    section.addEventListener("mouseleave", () => {
      hover.active = false;
    });

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      renderer.setSize(rect.width, rect.height, false);
    }
    resize();

    function tick(time) {
      if (lastTime === null) lastTime = time;
      const dt = Math.min(0.5, (time - lastTime) / 1000);
      lastTime = time;

      idleRotation += dt * 0.42; // faster idle spin
      group.rotation.y = idleRotation;
      group.rotation.x = Math.sin(time * 0.00018) * 0.05;
      group.updateMatrixWorld();

      const eased = easeOutCubic(gatherProgress);
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const ix = i * 3;
        const px = starts[ix] + (targets[ix] - starts[ix]) * eased;
        let py = starts[ix + 1] + (targets[ix + 1] - starts[ix + 1]) * eased;
        const pz = starts[ix + 2] + (targets[ix + 2] - starts[ix + 2]) * eased;

        if (hover.active) {
          hoverVec.set(px, py, pz).applyMatrix4(group.matrixWorld).project(camera);
          const sx = (hoverVec.x * 0.5 + 0.5) * canvas.clientWidth;
          const sy = (-hoverVec.y * 0.5 + 0.5) * canvas.clientHeight;
          const dx = sx - hover.x;
          const dy = sy - hover.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < hover.radius) {
            const influence = 1 - dist / hover.radius;
            py += influence * influence * 3.2;
          }
        }

        posAttr.array[ix] = px;
        posAttr.array[ix + 1] = py;
        posAttr.array[ix + 2] = pz;
      }
      posAttr.needsUpdate = true;
      material.opacity = 0.28 + gatherProgress * 0.44;

      coreMat.opacity = clamp01((gatherProgress - 0.35) / 0.4) * 0.7;
      const coreScale = 2.6 + gatherProgress * 4.1;
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
     1b. INTRO — the site's opening cover, in four beats:
     1) scattered particles gather into a dense, clearly-lined
        swirling spiral galaxy (never stops spinning — idle rotation
        runs every frame regardless of scroll) while ZEN FOOTBALL reveals,
        holds, and fades out over it;
     2) the particle colors drift from a cool neutral tone into the
        site's brand holo palette — the "football glitters";
     3) those same particles rearrange from the spiral into the
        shape of a football (a point-cloud sphere with a few seam
        rings), holds briefly;
     4) the football shape disperses outward and fades, and that
        exact instant is also when the real scroll-scrubbed video
        starts advancing its frames (see INTRO_VIDEO_START_FRAC and
        setupBackgroundVideo's bindScroll below) — the cover itself
        fades away in main.js's timeline over the same window.
     Particles render across three size tiers (small/medium/large,
     all smaller than the old single size) for a denser, more varied
     "real photo of a galaxy" look instead of uniform dots.
     --------------------------------------------------------- */
  function setupIntro() {
    const section = document.querySelector(".intro");
    const canvas = document.querySelector(".intro__canvas");
    if (!section || !canvas || !window.THREE) return;

    const THREE = window.THREE;
    const isSmall = window.innerWidth < 700;
    const PARTICLE_COUNT = isSmall ? 4600 : 9000; // denser still — more glitters
    const DISC_RADIUS = 27;
    const SPIRAL_TWIST = 5.2; // moderate curve per arm — many arms do the "many lines" work instead of one arm over-wound
    const ARM_COUNT = 16; // many distinct lines converging toward the center, matching the reference
    const CORE_DUST_FRAC = 0.09; // extra particles clustered tight around the very center — fills the core with glitters
    const NEAR_DUST_FRAC = 0.13; // ambient dust confined to the disc, filling the gaps between arm-lines
    const FAR_DUST_FRAC = 0.12; // a second, sparser layer well beyond the disc's edge and out of its plane — background depth
    const BALL_RADIUS = 9; // the football shape particles morph into — deliberately smaller/denser than the disc

    // Camera distance changes as the gather completes (dolly in), but the
    // ELEVATION ANGLE stays fixed the whole time — a moderate side-on
    // view (~30deg above the disc's own plane) rather than the earlier
    // near-top-down angle, and rather than a fully flat edge-on view —
    // enough tilt to still read the spiral, but clearly "from the side."
    const CAM_Y_RATIO = 0.5; // sin(30deg)
    const CAM_Z_RATIO = 0.87; // cos(30deg)
    const CAM_FAR_DIST = 62;
    const CAM_NEAR_DIST = 34;

    let renderer, scene, camera, group, core;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch (e) {
      return; // no WebGL — the section's solid dark CSS background still reads fine on its own
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmall ? 1.5 : 2));

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(52, 1, 0.1, 500);
    camera.position.set(0, CAM_FAR_DIST * CAM_Y_RATIO, CAM_FAR_DIST * CAM_Z_RATIO);
    camera.lookAt(0, 0, 0);

    group = new THREE.Group();
    scene.add(group);

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

    // the galaxy's own palette (glitters, dust, and arm-lines all draw
    // from this): a warm golden-white blaze at the core, cooling
    // through green at mid-radius, out to purple at the rim — blended
    // the same 3-stop way the brand palette below is
    const neutralCore = new THREE.Color("#fff2b8");
    const neutralMid = new THREE.Color("#8fe08a");
    const neutralRim = new THREE.Color("#b98bf0");
    // the brand "football glitters" palette everything shifts INTO
    // partway through the sequence
    const brandCore = new THREE.Color("#fdfff2");
    const brandMid = new THREE.Color("#8b5cf6");
    const brandRim = new THREE.Color("#22d3ee");

    // three size tiers — small/medium/large, ALL smaller than the old
    // single fixed size — shuffled across the field so any given patch
    // of sky has a natural mix rather than reading as uniform dots
    const TIERS = isSmall
      ? [
          { frac: 0.55, size: 0.11 },
          { frac: 0.32, size: 0.19 },
          { frac: 0.13, size: 0.29 },
        ]
      : [
          { frac: 0.55, size: 0.15 },
          { frac: 0.32, size: 0.25 },
          { frac: 0.13, size: 0.38 },
        ];
    const tierCounts = TIERS.map((t) => Math.round(t.frac * PARTICLE_COUNT));
    tierCounts[tierCounts.length - 1] += PARTICLE_COUNT - tierCounts.reduce((a, b) => a + b, 0);

    const tierAssignment = new Uint8Array(PARTICLE_COUNT);
    {
      let idx = 0;
      for (let t = 0; t < TIERS.length; t++) {
        for (let k = 0; k < tierCounts[t]; k++) tierAssignment[idx++] = t;
      }
      // Fisher-Yates shuffle so sizes are mixed through the field, not
      // laid down in one contiguous block per tier
      for (let i = PARTICLE_COUNT - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        const tmp = tierAssignment[i];
        tierAssignment[i] = tierAssignment[j];
        tierAssignment[j] = tmp;
      }
    }

    const tierData = tierCounts.map((count) => ({
      count,
      starts: new Float32Array(count * 3),
      galaxyTargets: new Float32Array(count * 3),
      ballTargets: new Float32Array(count * 3),
      positions: new Float32Array(count * 3),
      colorA: new Float32Array(count * 3),
      colorB: new Float32Array(count * 3),
      colors: new Float32Array(count * 3),
    }));
    const tierCursor = [0, 0, 0];

    const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

    // Each arm gets its OWN width multiplier, picked once up front — a
    // mild per-arm variation (some slightly thicker/thinner than others
    // overall) layered on TOP of the main thick-center -> thin-edge
    // taper computed per-particle below, matching a real spiral
    // galaxy's uneven arms instead of every line reading identically.
    const armWidthFactor = new Float32Array(ARM_COUNT);
    for (let a = 0; a < ARM_COUNT; a++) {
      armWidthFactor[a] = 0.75 + Math.random() * 0.7; // ~0.75x to ~1.45x, mild per-arm variation
    }
    // The dominant taper: every arm-line is thick right at the core and
    // narrows smoothly out to a thin thread by the rim — a fixed,
    // deliberate ratio (about 6:1, core spread vs rim spread) rather
    // than random per-particle noise, so the "thick near the center,
    // thin toward the edge" read is consistent across the whole disc.
    const ARM_CORE_SPREAD = 0.21;
    const ARM_RIM_SPREAD = 0.035;

    // Reference photos read as MANY lines of varying thickness, all
    // converging toward a bright, densely-packed center, with dust
    // scattered in the gaps between them AND a second, sparser haze of
    // background stars well outside the disc — not one or two arms and
    // not an evenly-scattered disc. So each particle falls into one of
    // four categories: a tight core cluster (extra density right at the
    // center), an arm-line (most of them, jittered only a small amount
    // off that arm's own-width ideal curve, brighter right on the
    // centerline), near dust (confined to the disc but at any angle,
    // dimmer), or far dust (extends beyond the disc's edge and spreads
    // well out of its plane too, dimmest of all — background depth).
    // The same loop also computes each particle's ball-shape target (a
    // Fibonacci sphere lattice, with every 8th particle instead placed
    // on one of three seam rings) so the morph later has no per-frame
    // recomputation to do.
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const roll = Math.random();
      const isCoreDust = roll < CORE_DUST_FRAC;
      const isNearDust = !isCoreDust && roll < CORE_DUST_FRAC + NEAR_DUST_FRAC;
      const isFarDust = !isCoreDust && !isNearDust && roll < CORE_DUST_FRAC + NEAR_DUST_FRAC + FAR_DUST_FRAC;

      let radiusFrac, r, spiralAngle, centerlineCloseness, ty;

      if (isFarDust) {
        radiusFrac = 1; // colored as fully "rim" — dim, background-toned
        r = DISC_RADIUS * (1.05 + Math.random() * 0.55); // beyond the disc's edge
        spiralAngle = Math.random() * Math.PI * 2;
        centerlineCloseness = 0.05;
        ty = (Math.random() - 0.5) * 9; // scattered well out of the disc's plane — real depth, not a flat ring
      } else if (isCoreDust) {
        // clustered tight around the very center, at any angle —
        // this is what actually fills the middle with extra glitters
        radiusFrac = Math.pow(Math.random(), 2.2) * 0.3;
        r = radiusFrac * DISC_RADIUS;
        spiralAngle = Math.random() * Math.PI * 2;
        centerlineCloseness = 0.75; // bright — reads as part of the core blaze
        ty = (Math.random() - 0.5) * 1.1;
      } else {
        radiusFrac = Math.pow(Math.random(), 0.6);
        r = radiusFrac * DISC_RADIUS;
        if (isNearDust) {
          spiralAngle = Math.random() * Math.PI * 2;
          centerlineCloseness = 0.14;
        } else {
          const armIndex = i % ARM_COUNT;
          const armBase = (armIndex / ARM_COUNT) * Math.PI * 2;
          const windAngle = armBase + radiusFrac * SPIRAL_TWIST;
          // thick near the center (radiusFrac -> 0), thin toward the rim
          // (radiusFrac -> 1), at a fixed ~6:1 ratio, with the per-arm
          // factor as a secondary, milder multiplier on top
          const taperSpread = ARM_CORE_SPREAD - radiusFrac * (ARM_CORE_SPREAD - ARM_RIM_SPREAD);
          const spread = taperSpread * armWidthFactor[armIndex];
          const jitter = (Math.random() * 2 - 1) * spread;
          spiralAngle = windAngle + jitter;
          centerlineCloseness = 1 - Math.min(1, Math.abs(jitter) / spread);
        }
        const thickness = (1 - radiusFrac * 0.7) * 1.4;
        ty = (Math.random() - 0.5) * thickness;
      }

      const gx = Math.cos(spiralAngle) * r;
      const gz = Math.sin(spiralAngle) * r;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const dist = DISC_RADIUS * (2.2 + Math.random() * 2.2);
      const sx = Math.sin(phi) * Math.cos(theta) * dist;
      const sy = Math.cos(phi) * dist * 0.6;
      const sz = Math.sin(phi) * Math.sin(theta) * dist;

      // ball-shape target: Fibonacci lattice for even sphere coverage,
      // with a thin slice of particles redirected onto one of three
      // orthogonal "seam" rings to hint at a panelled football surface
      let bx, by, bz;
      if (i % 8 === 0) {
        const ang = (i * 2.399963) % (Math.PI * 2);
        const ring = Math.floor(i / 8) % 3;
        if (ring === 0) { bx = Math.cos(ang); by = Math.sin(ang); bz = 0; }
        else if (ring === 1) { bx = Math.cos(ang); by = 0; bz = Math.sin(ang); }
        else { bx = 0; by = Math.cos(ang); bz = Math.sin(ang); }
      } else {
        const yFrac = 1 - (i / Math.max(1, PARTICLE_COUNT - 1)) * 2;
        const radiusAtY = Math.sqrt(Math.max(0, 1 - yFrac * yFrac));
        const bTheta = GOLDEN_ANGLE * i;
        bx = Math.cos(bTheta) * radiusAtY;
        by = yFrac;
        bz = Math.sin(bTheta) * radiusAtY;
      }

      const lineBrightness = 0.4 + centerlineCloseness * 0.6;
      const neutralMix = (
        radiusFrac < 0.4
          ? neutralCore.clone().lerp(neutralMid, radiusFrac / 0.4)
          : neutralMid.clone().lerp(neutralRim, (radiusFrac - 0.4) / 0.6)
      ).multiplyScalar(lineBrightness);
      const brandMix = (
        radiusFrac < 0.4
          ? brandCore.clone().lerp(brandMid, radiusFrac / 0.4)
          : brandMid.clone().lerp(brandRim, (radiusFrac - 0.4) / 0.6)
      ).multiplyScalar(lineBrightness);

      const tier = tierAssignment[i];
      const li = tierCursor[tier]++;
      const td = tierData[tier];
      const lx = li * 3;

      td.starts[lx] = sx; td.starts[lx + 1] = sy; td.starts[lx + 2] = sz;
      td.galaxyTargets[lx] = gx; td.galaxyTargets[lx + 1] = ty; td.galaxyTargets[lx + 2] = gz;
      td.ballTargets[lx] = bx * BALL_RADIUS; td.ballTargets[lx + 1] = by * BALL_RADIUS; td.ballTargets[lx + 2] = bz * BALL_RADIUS;
      td.positions[lx] = sx; td.positions[lx + 1] = sy; td.positions[lx + 2] = sz;
      td.colorA[lx] = neutralMix.r; td.colorA[lx + 1] = neutralMix.g; td.colorA[lx + 2] = neutralMix.b;
      td.colorB[lx] = brandMix.r; td.colorB[lx + 1] = brandMix.g; td.colorB[lx + 2] = brandMix.b;
      td.colors[lx] = neutralMix.r; td.colors[lx + 1] = neutralMix.g; td.colors[lx + 2] = neutralMix.b;
    }

    const tierPoints = tierData.map((td, t) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(td.positions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(td.colors, 3));
      const material = new THREE.PointsMaterial({
        size: TIERS[t].size,
        map: glowTex,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
        opacity: 0.9,
      });
      const pts = new THREE.Points(geometry, material);
      group.add(pts);
      return { geometry, material, posAttr: geometry.attributes.position, colorAttr: geometry.attributes.color };
    });

    const coreMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xffffff,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0,
    });
    core = new THREE.Sprite(coreMat);
    core.scale.set(5, 5, 1);
    group.add(core);

    let gatherProgress = reduceMotion ? 1 : 0;
    let colorProgress = 0;
    let formProgress = 0; // 0 = galaxy shape, 1 = football shape
    let disappearProgress = 0; // 0 = fully visible, 1 = fully dispersed/faded
    let scrollPhase = reduceMotion ? 1 : 0;
    let idleRotation = 0;
    let lastTime = null;
    const hover = { active: false, x: 0, y: 0, radius: isSmall ? 54 : 82 };
    const hoverVec = new THREE.Vector3();

    section.addEventListener("mousemove", (event) => {
      const rect = canvas.getBoundingClientRect();
      hover.x = event.clientX - rect.left;
      hover.y = event.clientY - rect.top;
      hover.active = hover.x >= 0 && hover.y >= 0 && hover.x <= rect.width && hover.y <= rect.height;
    });
    section.addEventListener("mouseleave", () => {
      hover.active = false;
    });

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

      // the swirl never stops — idle rotation runs every frame
      // regardless of scroll position, gathered or not
      idleRotation += dt * 0.26; // faster idle spin — covers both the galaxy and football-shape phases
      group.rotation.y = idleRotation;
      group.updateMatrixWorld();

      const gatherEased = easeOutCubic(gatherProgress);
      const formEased = easeOutCubic(formProgress);
      const glitterPulse = easeOutCubic(Math.max(0, 1 - Math.abs(scrollPhase - 0.24) / 0.08));
      const explode = 1 + disappearProgress * 1.6;
      const baseOpacity = (0.38 + gatherProgress * 0.55 + glitterPulse * 0.18) * (1 - disappearProgress);

      for (let t = 0; t < tierPoints.length; t++) {
        const td = tierData[t];
        const tp = tierPoints[t];
        const posArr = tp.posAttr.array;
        const colArr = tp.colorAttr.array;
        for (let li = 0; li < td.count; li++) {
          const ix = li * 3;
          // phase 1: scattered start -> galaxy spiral
          const gx = td.starts[ix] + (td.galaxyTargets[ix] - td.starts[ix]) * gatherEased;
          const gy = td.starts[ix + 1] + (td.galaxyTargets[ix + 1] - td.starts[ix + 1]) * gatherEased;
          const gz = td.starts[ix + 2] + (td.galaxyTargets[ix + 2] - td.starts[ix + 2]) * gatherEased;
          // phase 2: galaxy spiral -> football shape
          const fx = gx + (td.ballTargets[ix] - gx) * formEased;
          const fy = gy + (td.ballTargets[ix + 1] - gy) * formEased;
          const fz = gz + (td.ballTargets[ix + 2] - gz) * formEased;
          // phase 3: disperse outward as it fades
          let finalX = fx * explode;
          let finalY = fy * explode;
          const finalZ = fz * explode;

          if (hover.active) {
            hoverVec.set(finalX, finalY, finalZ).applyMatrix4(group.matrixWorld).project(camera);
            const sx = (hoverVec.x * 0.5 + 0.5) * canvas.clientWidth;
            const sy = (-hoverVec.y * 0.5 + 0.5) * canvas.clientHeight;
            const dx = sx - hover.x;
            const dy = sy - hover.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < hover.radius) {
              const influence = 1 - dist / hover.radius;
              finalY += influence * influence * 2.4;
            }
          }

          posArr[ix] = finalX;
          posArr[ix + 1] = finalY;
          posArr[ix + 2] = finalZ;

          colArr[ix] = td.colorA[ix] + (td.colorB[ix] - td.colorA[ix]) * colorProgress;
          colArr[ix + 1] = td.colorA[ix + 1] + (td.colorB[ix + 1] - td.colorA[ix + 1]) * colorProgress;
          colArr[ix + 2] = td.colorA[ix + 2] + (td.colorB[ix + 2] - td.colorA[ix + 2]) * colorProgress;
        }
        tp.posAttr.needsUpdate = true;
        tp.colorAttr.needsUpdate = true;
        tp.material.opacity = baseOpacity;
        tp.material.size = TIERS[t].size * (1 + glitterPulse * 0.4);
      }

      coreMat.opacity = clamp01((gatherProgress - 0.35) / 0.4) * (0.8 + glitterPulse * 0.2) * (1 - disappearProgress);
      coreMat.color
        .setRGB(1, 0.93, 0.68)
        .lerp(new THREE.Color(0x8b5cf6), colorProgress)
        .lerp(new THREE.Color(0x22d3ee), glitterPulse * 0.2); // golden-white base, shifts to brand violet later
      const coreScale = (2.6 + gatherProgress * 4.2 + glitterPulse * 1.3) * (formEased > 0 ? 1 - formEased * 0.5 : 1);
      core.scale.set(coreScale, coreScale, 1);

      // distance dollies in as the gather completes, but Y and Z move
      // together so the ELEVATION ANGLE (and thus the perspective) stays
      // constant throughout — no gradual flattening or steepening
      const camDist = CAM_FAR_DIST + (CAM_NEAR_DIST - CAM_FAR_DIST) * gatherEased;
      camera.position.y = camDist * CAM_Y_RATIO;
      camera.position.z = camDist * CAM_Z_RATIO;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);

    if (!reduceMotion) {
      const GATHER_END = 0.22;
      const COLOR_START = 0.42, COLOR_END = 0.6;
      const FORM_START = 0.55, FORM_END = 0.74;
      const DISAPPEAR_START = INTRO_VIDEO_START_FRAC, DISAPPEAR_END = 1;

      introScrollTriggerRef = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "+=220%",
        pin: true,
        anticipatePin: 1,
        scrub: 1,
        onUpdate: (self) => {
          const p = self.progress;
          scrollPhase = p;
          gatherProgress = clamp01(p / GATHER_END);
          colorProgress = clamp01((p - COLOR_START) / (COLOR_END - COLOR_START));
          formProgress = clamp01((p - FORM_START) / (FORM_END - FORM_START));
          disappearProgress = clamp01((p - DISAPPEAR_START) / (DISAPPEAR_END - DISAPPEAR_START));
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
          const t = time * 0.00045 * o.speed + o.phase; // faster drift
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

  /* ---------------------------------------------------------
     2b. HERO STAGE — transparent Three.js layer over the fixed video,
     built to feel closer to Peachweb-style premium holographic motion
     without changing the site's architecture. Uses the existing plain
     JS + vendored Three.js stack:
       - glossy football core
       - holographic seam rings / orbit bands
       - floating spark field
       - scroll-bound gather into center, hold, then drift away
       - mouse parallax stays additive on top of scroll motion
     --------------------------------------------------------- */
  function setupHeroStage() {
    const section = document.querySelector(".hero");
    const canvas = document.querySelector(".hero__stage");
    if (!section || !canvas || !window.THREE) return;

    const THREE = window.THREE;
    const isSmall = window.innerWidth < 720;
    const SPARK_COUNT = isSmall ? 360 : 620;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch (e) {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmall ? 1.5 : 2));
    if ("outputColorSpace" in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.16;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 220);
    camera.position.set(0, 0, 54);

    const stage = new THREE.Group();
    const ballRig = new THREE.Group();
    const haloRig = new THREE.Group();
    scene.add(stage);
    stage.add(ballRig);
    stage.add(haloRig);

    const ambient = new THREE.AmbientLight(0x9ab8ff, 1.15);
    const hemi = new THREE.HemisphereLight(0xaee8ff, 0x0b1020, 1.2);
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(10, 14, 18);
    const rim = new THREE.DirectionalLight(0xe879f9, 1.5);
    rim.position.set(-14, -6, 10);
    scene.add(ambient, hemi, key, rim);

    function makeGlowTexture() {
      const s = 128;
      const c = document.createElement("canvas");
      c.width = c.height = s;
      const ctx = c.getContext("2d");
      const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.25, "rgba(214,238,255,0.9)");
      g.addColorStop(0.55, "rgba(134,115,255,0.34)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
      return new THREE.CanvasTexture(c);
    }

    const glowTex = makeGlowTexture();
    function makeFootballTextures() {
      const size = 1024;
      const colorCanvas = document.createElement("canvas");
      const bumpCanvas = document.createElement("canvas");
      const roughCanvas = document.createElement("canvas");
      colorCanvas.width = colorCanvas.height = size;
      bumpCanvas.width = bumpCanvas.height = size;
      roughCanvas.width = roughCanvas.height = size;

      const ctx = colorCanvas.getContext("2d");
      const bctx = bumpCanvas.getContext("2d");
      const rctx = roughCanvas.getContext("2d");

      ctx.fillStyle = "#f3f5f8";
      ctx.fillRect(0, 0, size, size);
      bctx.fillStyle = "#8e8e8e";
      bctx.fillRect(0, 0, size, size);
      rctx.fillStyle = "#848484";
      rctx.fillRect(0, 0, size, size);

      for (let y = 0; y < size; y += 3) {
        for (let x = 0; x < size; x += 3) {
          const grain = Math.random();
          const bright = 228 + Math.floor(grain * 18);
          ctx.fillStyle = "rgba(" + bright + "," + (bright + 2) + "," + (bright + 5) + "," + (0.035 + grain * 0.045).toFixed(3) + ")";
          ctx.fillRect(x, y, 3, 3);
          const bumpTone = 126 + Math.floor(grain * 22);
          bctx.fillStyle = "rgba(" + bumpTone + "," + bumpTone + "," + bumpTone + "," + (0.05 + grain * 0.03).toFixed(3) + ")";
          bctx.fillRect(x, y, 3, 3);
          const roughTone = 114 + Math.floor(grain * 40);
          rctx.fillStyle = "rgba(" + roughTone + "," + roughTone + "," + roughTone + "," + (0.08 + grain * 0.04).toFixed(3) + ")";
          rctx.fillRect(x, y, 3, 3);
        }
      }

      const leatherShade = ctx.createLinearGradient(0, 0, size, size);
      leatherShade.addColorStop(0, "rgba(255,255,255,0.22)");
      leatherShade.addColorStop(0.32, "rgba(255,255,255,0.06)");
      leatherShade.addColorStop(0.68, "rgba(140,148,168,0.04)");
      leatherShade.addColorStop(1, "rgba(80,90,108,0.12)");
      ctx.fillStyle = leatherShade;
      ctx.fillRect(0, 0, size, size);

      function polygonPath(targetCtx, cx, cy, radius, sides, rotation) {
        targetCtx.beginPath();
        for (let i = 0; i < sides; i++) {
          const a = rotation + (i / sides) * Math.PI * 2;
          const px = cx + Math.cos(a) * radius;
          const py = cy + Math.sin(a) * radius;
          if (i === 0) targetCtx.moveTo(px, py);
          else targetCtx.lineTo(px, py);
        }
        targetCtx.closePath();
      }

      function drawSeamShadow(pathCtx, cx, cy, radius, sides, rotation) {
        pathCtx.save();
        polygonPath(pathCtx, cx, cy, radius, sides, rotation);
        pathCtx.clip();
        const seamGrad = pathCtx.createRadialGradient(cx - radius * 0.24, cy - radius * 0.24, radius * 0.1, cx, cy, radius * 1.06);
        seamGrad.addColorStop(0, "rgba(255,255,255,0.2)");
        seamGrad.addColorStop(0.58, "rgba(255,255,255,0)");
        seamGrad.addColorStop(1, "rgba(36,44,58,0.2)");
        pathCtx.fillStyle = seamGrad;
        pathCtx.fillRect(cx - radius * 1.2, cy - radius * 1.2, radius * 2.4, radius * 2.4);
        pathCtx.restore();
      }

      function drawPanel(cx, cy, radius, sides, rotation, fill, seam, panelType) {
        polygonPath(ctx, cx, cy, radius, sides, rotation);
        ctx.fillStyle = fill;
        ctx.fill();
        drawSeamShadow(ctx, cx, cy, radius, sides, rotation);
        ctx.lineWidth = Math.max(2.2, radius * 0.13);
        ctx.strokeStyle = seam;
        ctx.stroke();

        ctx.save();
        polygonPath(ctx, cx, cy, radius * 0.92, sides, rotation);
        ctx.clip();
        const panelGrad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
        if (panelType === "dark") {
          panelGrad.addColorStop(0, "rgba(52,58,72,0.88)");
          panelGrad.addColorStop(0.5, "rgba(20,24,31,0.98)");
          panelGrad.addColorStop(1, "rgba(72,80,96,0.74)");
        } else {
          panelGrad.addColorStop(0, "rgba(255,255,255,0.52)");
          panelGrad.addColorStop(0.48, "rgba(255,255,255,0.16)");
          panelGrad.addColorStop(1, "rgba(180,188,204,0.16)");
        }
        ctx.fillStyle = panelGrad;
        ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
        ctx.restore();

        polygonPath(bctx, cx, cy, radius, sides, rotation);
        bctx.fillStyle = panelType === "dark" ? "#585858" : "#c8c8c8";
        bctx.fill();
        bctx.lineWidth = Math.max(4, radius * 0.2);
        bctx.strokeStyle = panelType === "dark" ? "#dadada" : "#5c5c5c";
        bctx.stroke();

        polygonPath(rctx, cx, cy, radius, sides, rotation);
        rctx.fillStyle = panelType === "dark" ? "#2a2a2a" : "#b8b8b8";
        rctx.fill();
        rctx.lineWidth = Math.max(3, radius * 0.16);
        rctx.strokeStyle = panelType === "dark" ? "#6a6a6a" : "#4a4a4a";
        rctx.stroke();
      }

      const rows = [
        { y: 0.14, count: 5, offset: 0.0, radius: 0.058 },
        { y: 0.28, count: 6, offset: 0.06, radius: 0.068 },
        { y: 0.42, count: 7, offset: 0.02, radius: 0.076 },
        { y: 0.58, count: 7, offset: 0.09, radius: 0.076 },
        { y: 0.72, count: 6, offset: 0.04, radius: 0.068 },
        { y: 0.86, count: 5, offset: 0.0, radius: 0.058 }
      ];

      rows.forEach((row, rowIndex) => {
        for (let i = 0; i < row.count; i++) {
          const xFrac = (i + 0.5) / row.count + row.offset / row.count;
          const cx = ((xFrac % 1) + 1) % 1 * size;
          const cy = row.y * size;
          const radius = row.radius * size;
          const isDark = (rowIndex * 2 + i) % 4 === 0;
          const sides = isDark ? 5 : 6;
          const rotation = isDark ? -Math.PI / 2 : Math.PI / 6;
          drawPanel(
            cx,
            cy,
            radius,
            sides,
            rotation,
            isDark ? "#1a1e27" : "#f3f5f8",
            isDark ? "rgba(236,240,247,0.92)" : "rgba(72,78,94,0.44)",
            isDark ? "dark" : "light"
          );
        }
      });

      ctx.save();
      ctx.globalAlpha = 0.12;
      for (let i = 0; i < 26; i++) {
        const arcR = size * (0.14 + i * 0.03);
        ctx.strokeStyle = i % 2 === 0 ? "rgba(255,255,255,0.06)" : "rgba(123,136,164,0.05)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(size * 0.34, size * 0.28, arcR, -0.42, 0.78);
        ctx.stroke();
      }
      ctx.restore();

      bctx.save();
      bctx.globalAlpha = 0.24;
      for (let i = 0; i < 20; i++) {
        const y = (i / 19) * size;
        bctx.strokeStyle = "rgba(150,150,150,0.08)";
        bctx.beginPath();
        bctx.moveTo(0, y);
        bctx.lineTo(size, y + Math.sin(i) * 10);
        bctx.stroke();
      }
      bctx.restore();

      rctx.save();
      rctx.globalAlpha = 0.18;
      for (let i = 0; i < 18; i++) {
        const x = (i / 17) * size;
        rctx.strokeStyle = "rgba(95,95,95,0.12)";
        rctx.beginPath();
        rctx.moveTo(x, 0);
        rctx.lineTo(x + Math.cos(i) * 10, size);
        rctx.stroke();
      }
      rctx.restore();

      const colorTexture = new THREE.CanvasTexture(colorCanvas);
      colorTexture.wrapS = colorTexture.wrapT = THREE.RepeatWrapping;
      colorTexture.repeat.set(1, 1);
      colorTexture.anisotropy = 8;

      const bumpTexture = new THREE.CanvasTexture(bumpCanvas);
      bumpTexture.wrapS = bumpTexture.wrapT = THREE.RepeatWrapping;
      bumpTexture.repeat.set(1, 1);
      bumpTexture.anisotropy = 8;

      const roughTexture = new THREE.CanvasTexture(roughCanvas);
      roughTexture.wrapS = roughTexture.wrapT = THREE.RepeatWrapping;
      roughTexture.repeat.set(1, 1);
      roughTexture.anisotropy = 8;

      return { colorTexture, bumpTexture, roughTexture };
    }

    const footballTextures = makeFootballTextures();

    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(8.2, isSmall ? 34 : 54, isSmall ? 34 : 54),
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        map: footballTextures.colorTexture,
        bumpMap: footballTextures.bumpTexture,
        roughnessMap: footballTextures.roughTexture,
        bumpScale: 0.42,
        roughness: 0.74,
        metalness: 0.02,
        clearcoat: 1,
        clearcoatRoughness: 0.42,
        transmission: 0.02,
        thickness: 1.1,
        emissive: new THREE.Color("#0f1220"),
        emissiveIntensity: 0.05,
      })
    );
    ballRig.add(ball);

    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(8.75, isSmall ? 24 : 32, isSmall ? 24 : 32),
      new THREE.MeshStandardMaterial({
        color: 0xa78bfa,
        wireframe: true,
        transparent: true,
        opacity: 0.16
      })
    );
    ballRig.add(shell);

    function createOrbitBand(cfg) {
      const positions = new Float32Array(cfg.count * 3);
      for (let i = 0; i < cfg.count; i++) {
        const a = (i / cfg.count) * Math.PI * 2;
        positions[i * 3] = Math.cos(a) * cfg.rx;
        positions[i * 3 + 1] = Math.sin(a * cfg.yFreq) * cfg.ampY;
        positions[i * 3 + 2] = Math.sin(a) * cfg.rz;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const material = new THREE.PointsMaterial({
        size: cfg.size,
        map: glowTex,
        color: cfg.color,
        transparent: true,
        depthWrite: false,
        opacity: cfg.opacity,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
      });
      const points = new THREE.Points(geometry, material);
      points.rotation.x = cfg.rotX || 0;
      points.rotation.y = cfg.rotY || 0;
      points.rotation.z = cfg.rotZ || 0;
      return points;
    }

    const orbitA = createOrbitBand({
      count: 180, rx: 11.8, rz: 11.8, ampY: 0.34, yFreq: 2,
      size: isSmall ? 0.32 : 0.38, color: 0x7dd3fc, opacity: 0.72, rotX: Math.PI * 0.24
    });
    const orbitB = createOrbitBand({
      count: 160, rx: 12.6, rz: 9.6, ampY: 0.24, yFreq: 3,
      size: isSmall ? 0.28 : 0.34, color: 0xe879f9, opacity: 0.6, rotZ: Math.PI * 0.34, rotX: -Math.PI * 0.18
    });
    const orbitC = createOrbitBand({
      count: 140, rx: 10.6, rz: 13.2, ampY: 0.28, yFreq: 2,
      size: isSmall ? 0.22 : 0.3, color: 0xffffff, opacity: 0.42, rotY: Math.PI * 0.16
    });
    haloRig.add(orbitA, orbitB, orbitC);

    const sparkPositions = new Float32Array(SPARK_COUNT * 3);
    const sparkColors = new Float32Array(SPARK_COUNT * 3);
    const sparkMeta = new Array(SPARK_COUNT);
    const cyan = new THREE.Color("#67e8f9");
    const violet = new THREE.Color("#8b5cf6");
    const pink = new THREE.Color("#f472b6");
    const white = new THREE.Color("#f8fbff");

    for (let i = 0; i < SPARK_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spread = 13 + Math.random() * 16;
      const height = (Math.random() - 0.5) * 16;
      sparkPositions[i * 3] = Math.cos(angle) * spread;
      sparkPositions[i * 3 + 1] = height;
      sparkPositions[i * 3 + 2] = Math.sin(angle) * spread;

      const mix = Math.random();
      const col = mix < 0.33 ? cyan.clone().lerp(violet, Math.random()) : mix < 0.66 ? violet.clone().lerp(pink, Math.random()) : white.clone().lerp(cyan, Math.random());
      sparkColors[i * 3] = col.r;
      sparkColors[i * 3 + 1] = col.g;
      sparkColors[i * 3 + 2] = col.b;

      sparkMeta[i] = {
        baseX: sparkPositions[i * 3],
        baseY: sparkPositions[i * 3 + 1],
        baseZ: sparkPositions[i * 3 + 2],
        speed: 0.4 + Math.random() * 0.9,
        phase: Math.random() * Math.PI * 2
      };
    }

    const sparkGeometry = new THREE.BufferGeometry();
    sparkGeometry.setAttribute("position", new THREE.BufferAttribute(sparkPositions, 3));
    sparkGeometry.setAttribute("color", new THREE.BufferAttribute(sparkColors, 3));
    const sparkMaterial = new THREE.PointsMaterial({
      size: isSmall ? 0.28 : 0.38,
      map: glowTex,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    const sparks = new THREE.Points(sparkGeometry, sparkMaterial);
    stage.add(sparks);

    const coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex,
      color: 0x8b5cf6,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.72
    }));
    coreGlow.scale.set(20, 20, 1);
    ballRig.add(coreGlow);

    const flareGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex,
      color: 0x67e8f9,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.34
    }));
    flareGlow.position.set(6, 4, 2);
    flareGlow.scale.set(14, 14, 1);
    stage.add(flareGlow);

    let scrollProgress = reduceMotion ? 1 : 0.5;
    let mouseTargetX = 0;
    let mouseTargetY = 0;
    let mouseX = 0;
    let mouseY = 0;
    let lastTime = 0;

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      renderer.setSize(rect.width, rect.height, false);
    }
    resize();

    section.addEventListener("mousemove", (event) => {
      const rect = section.getBoundingClientRect();
      mouseTargetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      mouseTargetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    });
    section.addEventListener("mouseleave", () => {
      mouseTargetX = 0;
      mouseTargetY = 0;
    });

    function heroStageEnvelope(progress) {
      if (progress < 0.34) {
        return { phase: "enter", t: easeOutCubic(progress / 0.34) };
      }
      if (progress < 0.78) {
        return { phase: "hold", t: (progress - 0.34) / 0.44 };
      }
      return { phase: "leave", t: (progress - 0.78) / 0.22 };
    }

    function tick(time) {
      const dt = Math.min(0.05, (time - lastTime) / 1000 || 0.016);
      lastTime = time;

      mouseX += (mouseTargetX - mouseX) * Math.min(1, dt * 5.4);
      mouseY += (mouseTargetY - mouseY) * Math.min(1, dt * 5.4);

      const envelope = heroStageEnvelope(scrollProgress);
      const idle = time * 0.00055;

      let posX = 0;
      let posY = 0;
      let posZ = 0;
      let scale = 1;
      let opacity = 1;

      if (envelope.phase === "enter") {
        posX = 20 * (1 - envelope.t);
        posY = -7 * (1 - envelope.t);
        posZ = -12 * (1 - envelope.t);
        scale = 0.54 + envelope.t * 0.46;
        opacity = 0.1 + envelope.t * 0.9;
      } else if (envelope.phase === "hold") {
        posX = Math.sin(envelope.t * Math.PI * 2) * 1.8;
        posY = Math.cos(envelope.t * Math.PI * 1.6) * 1.2;
        posZ = 0;
        scale = 1 + Math.sin(envelope.t * Math.PI) * 0.04;
        opacity = 1;
      } else {
        const eased = gsap.parseEase("power2.inOut")(clamp01(envelope.t));
        posX = -7 * eased;
        posY = 3 * eased;
        posZ = 6 * eased;
        scale = 1 - eased * 0.1;
        opacity = 1 - eased * 0.28;
      }

      stage.position.x = posX + mouseX * 2.2;
      stage.position.y = posY - mouseY * 1.8;
      stage.position.z = posZ;
      stage.scale.setScalar(scale);

      ballRig.rotation.y = idle + scrollProgress * Math.PI * 0.22 + mouseX * 0.22;
      ballRig.rotation.x = Math.sin(idle * 0.9) * 0.12 - mouseY * 0.12;
      ballRig.rotation.z = Math.cos(idle * 0.7) * 0.08;

      haloRig.rotation.y = -idle * 1.2;
      haloRig.rotation.x = Math.sin(idle * 0.8) * 0.18;
      orbitA.rotation.z += dt * 0.42;
      orbitB.rotation.z -= dt * 0.34;
      orbitC.rotation.y += dt * 0.26;

      const sparkAttr = sparkGeometry.attributes.position;
      for (let i = 0; i < SPARK_COUNT; i++) {
        const meta = sparkMeta[i];
        const wave = idle * meta.speed + meta.phase;
        sparkAttr.array[i * 3] = meta.baseX + Math.cos(wave) * 1.8;
        sparkAttr.array[i * 3 + 1] = meta.baseY + Math.sin(wave * 1.4) * 1.4;
        sparkAttr.array[i * 3 + 2] = meta.baseZ + Math.sin(wave) * 1.8;
      }
      sparkAttr.needsUpdate = true;

      sparkMaterial.opacity = 0.24 + opacity * 0.56;
      coreGlow.material.opacity = 0.34 + opacity * 0.44;
      flareGlow.material.opacity = 0.18 + opacity * 0.24;
      shell.material.opacity = 0.08 + opacity * 0.1;
      orbitA.material.opacity = 0.32 + opacity * 0.4;
      orbitB.material.opacity = 0.24 + opacity * 0.32;
      orbitC.material.opacity = 0.12 + opacity * 0.2;

      camera.position.z = 58 - scrollProgress * 9;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);

    if (!reduceMotion) {
      ScrollTrigger.create({
        trigger: section,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
        onUpdate: (self) => {
          scrollProgress = self.progress;
        }
      });
    }

    window.addEventListener("resize", resize);
  }

  /* ---------------------------------------------------------
     2d. FLOATING-WORD SMOKE — a soft, slow-drifting haze behind the
     floating word reveals (see main.js). Same technique as the
     feature-section ambient orbs, but muted to a near-white smoke
     tone and sized to the whole viewport (the `.floatwords` overlay
     is fixed, page-wide) instead of one section. Parallax is read off
     total page scroll, not a single section's transit.
     --------------------------------------------------------- */
  function setupFloatingSmoke() {
    const canvas = document.querySelector(".floatwords__smoke");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let dims = sizeCanvasToParent(canvas);

    // soft colorful "gradient fog" puffs — drifting brand-colored haze
    // behind wherever the floating words happen to be, instead of a
    // flat neutral smoke tone
    const PUFF_COUNT = 6;
    const FOG_COLORS = ["34,211,238", "139,92,246", "244,114,182"]; // cyan / violet / pink, as rgb triplets
    const puffs = [];
    for (let i = 0; i < PUFF_COUNT; i++) {
      puffs.push({
        baseX: Math.random(),
        baseY: Math.random(),
        r: 0.24 + Math.random() * 0.22,
        speed: 0.08 + Math.random() * 0.12,
        phase: Math.random() * Math.PI * 2,
        color: FOG_COLORS[i % FOG_COLORS.length],
      });
    }

    // tiny colorful glitter points scattered across the whole page,
    // twinkling independently of the word reveals — the "glitters with
    // text" layer, always faintly present so the floating words never
    // sit on a plain empty background
    const GLITTER_COUNT = window.innerWidth < 700 ? 40 : 80;
    const GLITTER_COLORS = ["#22d3ee", "#8b5cf6", "#f472b6", "#fdfff2"];
    const glitters = [];
    for (let i = 0; i < GLITTER_COUNT; i++) {
      glitters.push({
        x: Math.random(),
        y: Math.random(),
        size: 0.6 + Math.random() * 1.8,
        speed: 0.3 + Math.random() * 0.9,
        phase: Math.random() * Math.PI * 2,
        drift: Math.random() * 0.4 + 0.1,
        color: GLITTER_COLORS[(Math.random() * GLITTER_COLORS.length) | 0],
      });
    }

    let parallax = 0;

    function draw(time) {
      const cw = dims.w;
      const ch = dims.h;
      ctx.clearRect(0, 0, cw, ch);
      ctx.globalCompositeOperation = "lighter";
      puffs.forEach((p) => {
        const t = time * 0.00028 * p.speed + p.phase; // faster drift
        const x = (p.baseX + Math.sin(t) * 0.05) * cw;
        const y = (p.baseY + Math.cos(t * 0.7) * 0.04) * ch + parallax * 60;
        const r = p.r * Math.max(cw, ch);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${p.color},0.10)`);
        g.addColorStop(0.5, `rgba(${p.color},0.04)`);
        g.addColorStop(1, `rgba(${p.color},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      });

      glitters.forEach((g) => {
        const t = time * 0.0003 * g.speed + g.phase;
        const x = (g.x + Math.sin(t) * g.drift * 0.06) * cw;
        const y = ((g.y + parallax * 0.35 * g.drift) % 1.05) * ch;
        const twinkle = 0.35 + 0.65 * Math.max(0, Math.sin(time * 0.0022 * g.speed + g.phase));
        if (twinkle <= 0.04) return;
        ctx.globalAlpha = twinkle;
        ctx.fillStyle = g.color;
        ctx.beginPath();
        ctx.arc(x, y, g.size * DPR, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
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
        start: 0,
        end: "max",
        onUpdate: (self) => {
          parallax = self.progress - 0.5;
        },
      });
    }

    window.addEventListener("resize", () => {
      dims = sizeCanvasToParent(canvas);
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
     3b. HOVER GLITTERS — lightweight 2D sparkle overlay for the
     intro football particles and the galaxy section. Glitters only
     spawn within a small cursor radius, rise upward, and fade out.
     This gives the "cursor lifts nearby glitters" effect without
     destabilizing the heavier WebGL particle scenes underneath.
     --------------------------------------------------------- */
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

    window.ZEN_FOOTBALL_playArrivalChime = playArrivalChime;

    btn.addEventListener("click", () => {
      enabled = !enabled;
      btn.setAttribute("aria-pressed", String(enabled));
      if (enabled) {
        const c = ensureContext();
        if (c && c.state === "suspended") c.resume();
      }
    });
  }

  // Each setup function runs in its own try/catch — these are mostly
  // independent visual effects (particle scenes, canvases, sound), so a
  // real-browser-only bug in any ONE of them (WebGL behaves quite
  // differently from this project's jsdom-based tests, which stub
  // WebGL out entirely) shouldn't be able to take down the rest.
  function safeRun(name, fn) {
    try {
      fn();
    } catch (err) {
      console.error("effects.js: " + name + " failed to initialize:", err);
    }
  }

  function boot() {
    // intro's pin (and the scroll-distance spacer GSAP inserts for it)
    // needs to exist BEFORE the video's own ScrollTrigger measures
    // ".intro"'s pinned bottom edge — see bindScroll() below.
    safeRun("setupIntro", setupIntro);
    safeRun("setupBackgroundVideo", setupBackgroundVideo);
    safeRun("setupHeroStage", setupHeroStage);
    safeRun("setupGalaxy", setupGalaxy);
    safeRun("setupFeatureAmbient", setupFeatureAmbient);
    safeRun("setupFloatingSmoke", setupFloatingSmoke);
    safeRun("setupCtaSparkles", setupCtaSparkles);
    safeRun("setupSound", setupSound);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
