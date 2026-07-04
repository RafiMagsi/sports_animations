(function () {
  const root = document.querySelector(".ball-gallery");
  const stage = document.querySelector(".ball-gallery__stage");
  const items = Array.from(document.querySelectorAll(".ball-gallery__item"));
  const copy = document.querySelector(".ball-gallery__copy");
  const hud = document.querySelector(".ball-gallery__hud");
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;

  if (!root || !stage || !items.length || !gsap || !ScrollTrigger) return;

  items.forEach((item, index) => {
    const viewer = item.querySelector("model-viewer");
    if (viewer) {
      viewer.cameraOrbit = "0deg 75deg 115%";
      viewer.fieldOfView = "28deg";
      viewer.disableZoom = true;
      viewer.setAttribute("min-camera-orbit", "auto auto 105%");
      viewer.setAttribute("max-camera-orbit", "auto auto 125%");
    }
    item.dataset.offset = String(index / items.length);
  });

  function wrap01(value) {
    return ((value % 1) + 1) % 1;
  }

  function render(progress) {
    const width = stage.clientWidth || window.innerWidth;
    const height = window.innerHeight;
    const startX = width * 0.74;
    const endX = -width * 0.76;

    items.forEach((item, index) => {
      const offset = Number(item.dataset.offset || 0);
      const local = wrap01(progress * 1.04 + offset);
      const pathX = gsap.utils.interpolate(startX, endX, local);
      const arc = Math.sin(local * Math.PI);
      const y = height * (0.02 + (0.18 * (1 - arc)) + (local - 0.5) * 0.09);
      const centerPull = 1 - Math.min(1, Math.abs(local - 0.5) / 0.5);
      const scale = 0.62 + centerPull * 0.62;
      const rotateY = 34 - local * 68;
      const rotateX = 14 - centerPull * 12;
      const rotateZ = local < 0.5
        ? -10 + (local / 0.5) * 10
        : ((local - 0.5) / 0.5) * 10;
      const opacity = 0.18 + centerPull * 0.9;
      const blur = (1 - centerPull) * 2.8;
      const zIndex = String(10 + Math.round(centerPull * 20));

      item.style.zIndex = zIndex;
      item.style.transform =
        "translate3d(" + pathX.toFixed(2) + "px," + y.toFixed(2) + "px,0) " +
        "translate(-50%, -50%) " +
        "scale(" + scale.toFixed(3) + ") " +
        "perspective(1600px) rotateY(" + rotateY.toFixed(2) + "deg) rotateX(" + rotateX.toFixed(2) + "deg) rotateZ(" + rotateZ.toFixed(2) + "deg)";
      item.style.opacity = opacity.toFixed(3);
      item.style.filter = "blur(" + blur.toFixed(2) + "px)";
    });

    if (copy) {
      gsap.set(copy, {
        x: -progress * 64,
        y: Math.sin(progress * Math.PI) * -12,
        opacity: 0.7 + Math.sin(progress * Math.PI) * 0.3
      });
    }

    if (hud) {
      gsap.set(hud, {
        x: progress * 32,
        y: Math.sin(progress * Math.PI) * 8,
        opacity: 0.55 + Math.sin(progress * Math.PI) * 0.45
      });
    }
  }

  const trigger = ScrollTrigger.create({
    trigger: root,
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    onUpdate(self) {
      render(self.progress);
    }
  });

  render(0);
  window.addEventListener("resize", function () {
    render(trigger.progress || 0);
  });
})();
