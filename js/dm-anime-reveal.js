(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(pointer: fine)").matches;

  var IMG_SRC = "assets/anime-reveal/source_update.jpg";
  var IMG_ALT = "Original illustration — a personal signal";

  var built = false, active = false, isReplay = false;
  var root, photoEl, editorialEl, skipBtn, ackEl;
  var petalField, petals = [];
  var parallaxEls = []; // [{el, mult}]
  var savedScroll = 0, prevFocus = null;
  var staggerTimer = 0, closeTimer = 0, loadWaitTimer = 0, rafId = 0;
  var ptr = { tx: 0, ty: 0, x: 0, y: 0, cx: -9999, cy: -9999, vx: 0, vy: 0 };
  var lastMoveTime = 0, holdExtended = false, holdStartedAt = 0;

  var PETAL_COLORS = ["#F3A6D4", "#F574C2", "#FFF6FA", "#F9C3DE"];
  var HOLD_BASE = reduce ? 3000 : 4600;
  var HOLD_EXTEND = 1400;
  var REPEL_R = 90;

  var imgState = "idle"; // idle | loading | ready | error
  var preloadImg = null;

  var BRANCH_SVG =
    '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path d="M0,10 C40,20 70,45 90,80 C100,100 95,120 80,110 C65,140 60,165 65,190" ' +
    'stroke="#B5477A" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.55"/>' +
    '<path d="M20,0 C55,15 78,38 92,68" stroke="#B5477A" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.4"/>' +
    '<circle cx="86" cy="78" r="6" fill="#F3A6D4" opacity="0.7"/>' +
    '<circle cx="70" cy="108" r="5" fill="#F574C2" opacity="0.6"/>' +
    '<circle cx="94" cy="66" r="4" fill="#FFF6FA" opacity="0.6"/>' +
    '<circle cx="58" cy="140" r="5" fill="#F3A6D4" opacity="0.5"/>' +
    "</svg>";

  /* ---- preload: start well before frame 03 ---- */
  function preload() {
    if (imgState !== "idle") return;
    imgState = "loading";
    preloadImg = new Image();
    preloadImg.onload = function () { imgState = "ready"; onImageReady(); };
    preloadImg.onerror = function () { imgState = "error"; onImageError(); };
    preloadImg.src = IMG_SRC;
  }
  window.addEventListener("dm:anime:preload", preload);

  function onImageReady() {
    clearTimeout(loadWaitTimer);
    if (!active || !root) return;
    if (photoEl && !photoEl.src) photoEl.src = IMG_SRC;
    root.classList.remove("is-loading", "is-error");
    beginActive();
  }

  function onImageError() {
    clearTimeout(loadWaitTimer);
    if (!active || !root) return;
    root.classList.remove("is-loading");
    root.classList.add("is-error");
    beginActive();
  }

  function build() {
    if (built) return;
    built = true;

    root = document.createElement("div");
    root.className = "dm-anime-reveal";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "Anime reveal — a personal signal");
    root.setAttribute("aria-hidden", "true");
    root.setAttribute("tabindex", "-1");

    var scene = document.createElement("div");
    scene.className = "dm-anime-scene";
    scene.setAttribute("aria-hidden", "true");

    /* z1 atmosphere + light */
    var atmosphere = document.createElement("div");
    atmosphere.className = "dm-anime-atmosphere";
    var lightParallax = document.createElement("div");
    lightParallax.style.position = "absolute";
    lightParallax.style.inset = "0";
    lightParallax.innerHTML = '<div class="dm-anime-light-glow"></div><div class="dm-anime-light-core"></div>';
    atmosphere.appendChild(lightParallax);
    scene.appendChild(atmosphere);
    parallaxEls.push({ el: lightParallax, mult: 5 });

    /* z2 source illustration */
    var imageLayer = document.createElement("div");
    imageLayer.className = "dm-anime-image-layer";
    var camera = document.createElement("div");
    camera.className = "dm-anime-image-camera";
    photoEl = document.createElement("img");
    photoEl.className = "dm-anime-photo";
    photoEl.alt = IMG_ALT;
    photoEl.decoding = "async";
    camera.appendChild(photoEl);
    imageLayer.appendChild(camera);

    var loading = document.createElement("div");
    loading.className = "dm-anime-loading";
    loading.textContent = "LOADING PERSONAL LAYER // 02";
    imageLayer.appendChild(loading);

    var fallback = document.createElement("div");
    fallback.className = "dm-anime-fallback";
    fallback.innerHTML =
      '<div class="dm-anime-fallback-inner">' +
      '<div class="dm-anime-fallback-signal">PERSONAL SIGNAL // 02 OF 03</div>' +
      '<div class="dm-anime-fallback-title">I’m into anime.</div>' +
      '<div class="dm-anime-fallback-sub">Visual storytelling and world-building get me every time.</div>' +
      "</div>";
    imageLayer.appendChild(fallback);

    scene.appendChild(imageLayer);
    parallaxEls.push({ el: camera, mult: 4 });

    /* z3 foreground branches */
    var branches = document.createElement("div");
    branches.className = "dm-anime-branches";
    var branchParallax = document.createElement("div");
    branchParallax.className = "dm-anime-branch-parallax";

    var swayL = document.createElement("div");
    swayL.className = "dm-anime-branch-sway dm-anime-branch-sway--l";
    var bl = document.createElement("div");
    bl.className = "dm-anime-branch dm-anime-branch--l";
    bl.innerHTML = BRANCH_SVG;
    swayL.appendChild(bl);

    var swayR = document.createElement("div");
    swayR.className = "dm-anime-branch-sway dm-anime-branch-sway--r";
    var br = document.createElement("div");
    br.className = "dm-anime-branch dm-anime-branch--r";
    br.innerHTML = BRANCH_SVG;
    swayR.appendChild(br);

    branchParallax.appendChild(swayL);
    branchParallax.appendChild(swayR);
    branches.appendChild(branchParallax);
    scene.appendChild(branches);
    parallaxEls.push({ el: branchParallax, mult: 12 });

    /* z4 petals */
    var petalLayer = document.createElement("div");
    petalLayer.className = "dm-anime-petals";
    petalField = petalLayer;
    scene.appendChild(petalLayer);

    root.appendChild(scene);

    /* z5 editorial */
    editorialEl = document.createElement("div");
    editorialEl.className = "dm-anime-editorial";
    editorialEl.innerHTML =
      '<p class="dm-anime-signal">PERSONAL SIGNAL // 02 OF 03</p>' +
      '<p class="dm-anime-headline">I’m into anime.</p>' +
      '<p class="dm-anime-sub">Visual storytelling and world-building get me every time.</p>';
    root.appendChild(editorialEl);

    /* z6 skip */
    skipBtn = document.createElement("button");
    skipBtn.type = "button";
    skipBtn.className = "dm-anime-skip";
    skipBtn.textContent = "[ SKIP ]";
    skipBtn.setAttribute("aria-label", "Skip anime reveal");
    skipBtn.addEventListener("click", function () { closeReveal(isReplay); });
    root.appendChild(skipBtn);

    document.body.appendChild(root);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && active) closeReveal(isReplay);
    });
  }

  /* ---- petals ---- */
  function spawnPetal() {
    var el = document.createElement("span");
    el.className = "dm-anime-petal";
    var size = 6 + Math.random() * 6;
    el.style.width = size + "px";
    el.style.height = size * 0.75 + "px";
    el.style.background = PETAL_COLORS[(Math.random() * PETAL_COLORS.length) | 0];
    el.style.opacity = 0.4 + Math.random() * 0.35;
    petalField.appendChild(el);
    return {
      el: el,
      x: Math.random() * 100,
      y: -10 - Math.random() * 40,
      rot: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 36,
      vy: 0.12 + Math.random() * 0.16,
      drift: (Math.random() - 0.5) * 0.05,
      phase: Math.random() * Math.PI * 2,
      ox: 0, oy: 0
    };
  }

  function petalCount() {
    var w = window.innerWidth;
    if (w >= 1024) return 20;
    if (w >= 768) return 14;
    return 9;
  }

  function startPetals() {
    var count = petalCount();
    for (var i = 0; i < count; i++) petals.push(spawnPetal());
    runLoop();
  }

  function renderStaticPetals() {
    var count = window.innerWidth >= 768 ? 12 : 7;
    for (var i = 0; i < count; i++) {
      var el = document.createElement("span");
      el.className = "dm-anime-petal";
      var size = 6 + Math.random() * 6;
      el.style.width = size + "px";
      el.style.height = size * 0.75 + "px";
      el.style.background = PETAL_COLORS[(Math.random() * PETAL_COLORS.length) | 0];
      el.style.opacity = 0.35 + Math.random() * 0.3;
      el.style.left = Math.random() * 100 + "%";
      el.style.top = Math.random() * 90 + "%";
      el.style.transform = "rotate(" + (Math.random() * 360) + "deg)";
      petalField.appendChild(el);
    }
  }

  function stopPetals() {
    petals = [];
    if (petalField) petalField.innerHTML = "";
  }

  /* ---- pointer: parallax targets + petal repulsion, one shared rAF loop ---- */
  function onPointerMove(e) {
    var w = window.innerWidth, h = window.innerHeight;
    ptr.tx = (e.clientX / w) * 2 - 1;
    ptr.ty = (e.clientY / h) * 2 - 1;
    ptr.vx = e.clientX - (ptr.cx === -9999 ? e.clientX : ptr.cx);
    ptr.vy = e.clientY - (ptr.cy === -9999 ? e.clientY : ptr.cy);
    ptr.cx = e.clientX;
    ptr.cy = e.clientY;
    lastMoveTime = performance.now();
  }

  function startParallax() {
    if (fine) window.addEventListener("pointermove", onPointerMove, { passive: true });
  }

  function stopParallax() {
    window.removeEventListener("pointermove", onPointerMove);
    rafId && cancelAnimationFrame(rafId);
    rafId = 0;
    ptr.tx = ptr.ty = ptr.x = ptr.y = 0;
    ptr.cx = ptr.cy = -9999;
  }

  function runLoop() {
    if (rafId) return;
    var last = performance.now();
    function frame(now) {
      if (!active) { rafId = 0; return; }
      var dt = Math.min(now - last, 48);
      last = now;

      /* camera + branch + light parallax, plus a slow idle drift */
      ptr.x += (ptr.tx - ptr.x) * 0.06;
      ptr.y += (ptr.ty - ptr.y) * 0.06;
      var driftX = Math.sin(now / 9000) * 0.35;
      var driftY = Math.cos(now / 11000) * 0.3;
      for (var i = 0; i < parallaxEls.length; i++) {
        var p = parallaxEls[i];
        if (!p.el) continue;
        p.el.style.transform =
          "translate3d(" + ((ptr.x + driftX) * p.mult).toFixed(2) + "px," + ((ptr.y + driftY) * p.mult * 0.75).toFixed(2) + "px,0)";
      }

      /* petals: fall + drift + pointer repulsion */
      var w = window.innerWidth, h = window.innerHeight;
      var speed = Math.sqrt(ptr.vx * ptr.vx + ptr.vy * ptr.vy);
      ptr.vx *= 0.85; ptr.vy *= 0.85;
      for (var j = 0; j < petals.length; j++) {
        var pt = petals[j];
        pt.y += pt.vy * (dt / 16);
        pt.x += (pt.drift + Math.sin((now / 1000) + pt.phase) * 0.04) * (dt / 16);
        pt.rot += pt.vRot * (dt / 1000);
        if (pt.y > 112) {
          pt.y = -10 - Math.random() * 30;
          pt.x = Math.random() * 100;
          pt.ox = pt.oy = 0;
        }

        var screenX = w / 2 + ((pt.x - 50) / 100) * w;
        var screenY = (pt.y / 100) * h;

        if (fine && ptr.cx !== -9999) {
          var dx = screenX - ptr.cx, dy = screenY - ptr.cy;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < REPEL_R && dist > 0.01) {
            var force = (1 - dist / REPEL_R) * (10 + Math.min(speed * 0.6, 14));
            pt.ox += (dx / dist) * force * 0.09;
            pt.oy += (dy / dist) * force * 0.09;
          }
        }
        pt.ox *= 0.92;
        pt.oy *= 0.92;

        pt.el.style.transform =
          "translate3d(calc(" + (pt.x - 50).toFixed(2) + "vw + " + pt.ox.toFixed(1) + "px)," +
          (((pt.y / 100) * h) + pt.oy).toFixed(1) + "px,0) rotate(" + pt.rot.toFixed(1) + "deg)";
      }

      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);
  }

  /* ---- acknowledgment toast (frame 03 found, pre-reveal hold) ---- */
  function showAck(cb) {
    ackEl = document.createElement("div");
    ackEl.className = "dm-anime-ack";
    ackEl.setAttribute("aria-hidden", "true");
    ackEl.innerHTML =
      '<div class="dm-anime-ack-line1">FRAME 03 // FOUND</div>' +
      '<div class="dm-anime-ack-line2">BETWEEN THE FRAMES // COMPLETE</div>';
    document.body.appendChild(ackEl);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { ackEl.classList.add("is-visible"); });
    });
    setTimeout(function () {
      ackEl.classList.remove("is-visible");
      setTimeout(function () {
        if (ackEl) { ackEl.remove(); ackEl = null; }
      }, 250);
      cb();
    }, 300);
  }

  /* ---- main sequence ---- */
  function trigger(replay) {
    if (active) return;
    active = true;
    isReplay = replay;
    holdExtended = false;
    build();
    preload();

    function begin() {
      savedScroll = window.scrollY;
      prevFocus = document.activeElement;
      document.body.style.overflow = "hidden";
      root.style.display = "block";
      root.setAttribute("aria-hidden", "false");

      requestAnimationFrame(function () {
        window.dispatchEvent(new CustomEvent("dm:anime:reveal:start", { detail: { isReplay: replay } }));
        root.classList.add("is-veiling");
        root.focus();

        staggerTimer = setTimeout(function () {
          if (imgState === "ready") {
            if (photoEl && !photoEl.src) photoEl.src = IMG_SRC;
            beginActive();
          } else if (imgState === "error") {
            root.classList.add("is-error");
            beginActive();
          } else {
            root.classList.add("is-loading");
            loadWaitTimer = setTimeout(function () {
              if (imgState !== "ready") {
                imgState = "error";
                root.classList.remove("is-loading");
                root.classList.add("is-error");
                beginActive();
              }
            }, 2500);
          }
        }, 300);
      });
    }

    if (replay) begin();
    else showAck(begin);
  }

  function beginActive() {
    if (!active || !root || root.classList.contains("is-active")) return;
    root.classList.remove("is-loading");
    root.classList.add("is-active");
    holdStartedAt = performance.now();

    if (reduce) {
      renderStaticPetals();
      closeTimer = setTimeout(function () { closeReveal(isReplay); }, HOLD_BASE);
      return;
    }

    startPetals();
    startParallax();
    scheduleClose();
  }

  function scheduleClose() {
    closeTimer = setTimeout(function () {
      var recentlyActive = !holdExtended && performance.now() - lastMoveTime < 900;
      if (recentlyActive) {
        holdExtended = true;
        closeTimer = setTimeout(function () { closeReveal(isReplay); }, HOLD_EXTEND);
      } else {
        closeReveal(isReplay);
      }
    }, HOLD_BASE);
  }

  function closeReveal(replay) {
    if (!active) return;
    clearTimeout(staggerTimer);
    clearTimeout(closeTimer);
    clearTimeout(loadWaitTimer);
    root.classList.add("is-leaving");
    root.classList.remove("is-active");
    stopParallax();

    var exitDur = reduce ? 300 : 800;
    setTimeout(function () {
      stopPetals();
      root.classList.remove("is-veiling", "is-leaving", "is-loading", "is-error");
      root.style.display = "none";
      root.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      window.scrollTo(0, savedScroll);
      if (prevFocus && typeof prevFocus.focus === "function") prevFocus.focus();
      active = false;
      window.dispatchEvent(new CustomEvent("dm:anime:reveal:end", { detail: { isReplay: replay } }));
    }, exitDur);
  }

  window.addEventListener("dm:anime:reveal", function (e) {
    trigger(!!(e.detail && e.detail.isReplay));
  });
})();
