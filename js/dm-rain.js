(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(pointer: fine)").matches;
  var root = document.documentElement;
  var heroEl = document.querySelector(".about");
  var contactEl = document.getElementById("contact");
  if (!heroEl) return;

  document.body.classList.add("dm-rain-active");

  /* ---- canvas ---- */
  var cvs = document.createElement("canvas");
  cvs.id = "dm-rain";
  cvs.setAttribute("aria-hidden", "true");
  document.body.appendChild(cvs);
  var ctx = cvs.getContext("2d");
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var vw, vh, mobile;

  function resize() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    cvs.width = vw * dpr;
    cvs.height = vh * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mobile = vw < 768;
    dirtyCol = true;
    if (egg.business) buildStrategyNetwork();
  }

  /* ---- colors (cached, refreshed on invert) ---- */
  var cFg = "#f5f5f2", cAccent = "#2bf0b0";
  function refreshColors() {
    var s = getComputedStyle(root);
    cFg = s.getPropertyValue("--dm-fg").trim() || cFg;
    cAccent = s.getPropertyValue("--dm-accent").trim() || cAccent;
  }
  new MutationObserver(refreshColors).observe(root, { attributes: true, attributeFilter: ["class"] });
  refreshColors();

  /* ---- easter egg state (session-scoped) ---- */
  var EGG_KEY = "portfolio-eggs-session-v1";
  var egg = { saves: 0, football: false, anime: false, business: false, personal: false };
  var animeProgress = 0;
  try { localStorage.removeItem("portfolio-eggs-v1"); } catch (e) {}
  try {
    var _d = JSON.parse(sessionStorage.getItem(EGG_KEY));
    if (_d) {
      egg.saves = _d.saves || 0;
      egg.football = !!_d.football;
      egg.anime = !!_d.anime;
      egg.business = !!_d.business;
      egg.personal = !!_d.personal;
    }
  } catch (e) {}
  function saveEgg() {
    try { sessionStorage.setItem(EGG_KEY, JSON.stringify(egg)); } catch (e) {}
  }

  /* ---- particles ---- */
  var MAX_POOL = 250, MAX_BED = 220;
  var pool = [];
  var bed = [];

  /* ---- height field for accumulation ---- */
  var BIN_W = 8;
  var bins = [];
  var binCount = 0;
  function resetBins() {
    binCount = Math.ceil(vw / BIN_W) + 1;
    bins = [];
    for (var i = 0; i < binCount; i++) bins[i] = 0;
  }

  /* ---- contact heading for threat detection ---- */
  var ctHeading = null, ctRect = null;

  function spawn() {
    if (reduce) return;
    var hb = heroEl.getBoundingClientRect().bottom;
    var sy = Math.max(-5, Math.min(vh, hb));
    var r = Math.random();
    var px = Math.random() * vw;
    if (!egg.football && ctRect && cRect.top < vh && Math.random() < 0.3) {
      px = ctRect.left - 30 + Math.random() * (ctRect.width + 60);
    }
    var baseR = egg.football
      ? (mobile ? 4 + Math.random() * 3 : 5 + Math.random() * 4)
      : 1.2 + Math.random() * 1.0;
    pool.push({
      x: px,
      y: sy + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 0.4,
      vy: 0.4 + Math.random() * 0.6,
      r: baseR,
      o: r < 0.06 ? 0.3 + Math.random() * 0.15
        : r < 0.18 ? 0.35 + Math.random() * 0.15
        : 0.15 + Math.random() * 0.2,
      t: r < 0.06 ? 2 : r < 0.18 ? 1 : 0,
      age: 0, docY: 0,
      rot: 0, av: (Math.random() - 0.5) * 0.04
    });
  }

  /* ---- colliders ---- */
  var colEls, colRects = [], dirtyCol = true;
  function findColEls() {
    colEls = document.querySelectorAll(".project-card, .contact-button");
  }
  function refreshCol() {
    colRects = [];
    for (var i = 0; i < colEls.length; i++) {
      var r = colEls[i].getBoundingClientRect();
      if (r.bottom < -20 || r.top > vh + 20) continue;
      colRects.push(r);
    }
    dirtyCol = false;
  }

  /* ---- contact geometry ---- */
  var cFloor = vh, cRect = { top: vh, bottom: vh, left: 0, right: vw };
  function refreshContact() {
    if (!contactEl) return;
    var r = contactEl.getBoundingClientRect();
    cRect = r;
    cFloor = r.bottom - 20;
    if (!ctHeading) ctHeading = document.querySelector(".contact-title");
    if (ctHeading) ctRect = ctHeading.getBoundingClientRect();
  }

  /* ---- pointer ---- */
  var ptr = { x: -9999, y: -9999, vx: 0, vy: 0, active: false };
  var pxPrev = -9999, pyPrev = -9999;
  var inContact = false;
  var curMounted = false, curVisible = false;
  var navH = 60;

  document.addEventListener("pointermove", function (e) {
    if (pxPrev > -999) {
      ptr.vx = e.clientX - pxPrev;
      ptr.vy = e.clientY - pyPrev;
    }
    pxPrev = e.clientX; pyPrev = e.clientY;
    ptr.x = e.clientX; ptr.y = e.clientY;
    ptr.active = true;
    inContact = contactEl && ptr.y >= cRect.top && ptr.y <= cRect.bottom;

    if (fine && umbEl) {
      var hb = heroEl.getBoundingClientRect().bottom;
      var shouldShow = ptr.y > Math.max(hb, navH);
      if (shouldShow && !curVisible) {
        umbEl.style.display = "";
        umbPos.x = ptr.x;
        umbPos.y = ptr.y;
        umbEl.style.transform = "translate3d(" + (ptr.x - 18) + "px," + (ptr.y - 48) + "px,0)";
        curMounted = true;
        requestAnimationFrame(function () {
          var r = umbEl.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            document.body.classList.add("dm-cursor-active");
            curVisible = true;
          }
        });
      } else if (!shouldShow && curVisible) {
        document.body.classList.remove("dm-cursor-active");
        umbEl.style.display = "none";
        curVisible = false;
        curMounted = false;
      }
    }
  }, { passive: true });

  document.addEventListener("pointerleave", function () {
    ptr.active = false;
    if (curVisible) {
      document.body.classList.remove("dm-cursor-active");
      if (umbEl) umbEl.style.display = "none";
      curVisible = false;
      curMounted = false;
    }
  });

  /* ---- click disturbance in contact ---- */
  if (contactEl) {
    contactEl.addEventListener("click", function (e) {
      if (e.target.closest("a, button, input")) return;
      var cx = e.clientX, cy = e.clientY;
      var CLICK_R = 140;
      for (var i = 0; i < pool.length; i++) {
        var p = pool[i], dx = p.x - cx, dy = p.y - cy;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < CLICK_R && d > 0) {
          var f = (1 - d / CLICK_R) * 3.5;
          p.vx += (dx / d) * f; p.vy += (dy / d) * f;
        }
      }
      var scrollY = window.scrollY || 0;
      for (var i = bed.length - 1; i >= 0; i--) {
        var p = bed[i], sy = p.docY - scrollY;
        var dx = p.x - cx, dy = sy - cy;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < CLICK_R && d > 0) {
          var f = (1 - d / CLICK_R) * 3.5;
          p.vx = (dx / d) * f; p.vy = (dy / d) * f;
          p.y = sy; pool.push(p);
          var bi = Math.floor(p.x / BIN_W);
          if (bi >= 0 && bi < binCount && bins[bi] > 0) bins[bi]--;
          bed.splice(i, 1);
        }
      }
    });
  }

  /* ---- umbrella / goalkeeper cursor ---- */
  var umbEl = null, umbPos = { x: -9999, y: -9999, vx: 0, vy: 0 };
  var UMB_R = 16, UMB_OFF = 36;
  var UMB_STIFF = 0.1, UMB_DAMP = 0.72;
  var limbSway = 0, limbSwayV = 0;
  var legSway = 0, legSwayV = 0;
  var umbArms, umbLegL, umbLegR;
  var armPivot = "0 4.5", legPivot = "0 9";

  var UMBRELLA_SVG =
    '<svg width="36" height="52" viewBox="-18 -34 36 52" fill="none">' +
    '<path class="umb-body" d="M-14,-16 C-14,-30 14,-30 14,-16" stroke-width="1.5"/>' +
    '<path class="umb-glow" d="M-14,-16 C-14,-30 14,-30 14,-16" stroke-width="0.8" opacity="0.5"/>' +
    '<line class="umb-body" x1="0" y1="-16" x2="0" y2="-4" stroke-width="1.2"/>' +
    '<circle class="umb-body" cx="0" cy="-1.5" r="2.2" stroke-width="1" fill="none"/>' +
    '<line class="umb-body" x1="0" y1="1" x2="0" y2="9" stroke-width="1"/>' +
    '<g id="umb-arms"><line class="umb-body" x1="-4" y1="4.5" x2="4" y2="4.5" stroke-width="1"/></g>' +
    '<g id="umb-leg-l"><line class="umb-body" x1="0" y1="9" x2="-3" y2="15" stroke-width="1"/></g>' +
    '<g id="umb-leg-r"><line class="umb-body" x1="0" y1="9" x2="3" y2="15" stroke-width="1"/></g>' +
    '</svg>';

  var GOALKEEPER_SVG =
    '<svg width="36" height="52" viewBox="-18 -34 36 52" fill="none">' +
    '<circle class="umb-body" cx="0" cy="-22" r="2.5" stroke-width="1" fill="none"/>' +
    '<line class="umb-body" x1="0" y1="-19.5" x2="0" y2="-4" stroke-width="1.2"/>' +
    '<g id="umb-arms">' +
    '<line class="umb-body" x1="-12" y1="-13" x2="0" y2="-10" stroke-width="1"/>' +
    '<line class="umb-body" x1="0" y1="-10" x2="12" y2="-13" stroke-width="1"/>' +
    '<circle cx="-13" cy="-13" r="1.5" stroke-width="0.7" class="umb-body" fill="none" style="stroke:var(--dm-accent)"/>' +
    '<circle cx="13" cy="-13" r="1.5" stroke-width="0.7" class="umb-body" fill="none" style="stroke:var(--dm-accent)"/>' +
    '</g>' +
    '<g id="umb-leg-l"><line class="umb-body" x1="0" y1="-4" x2="-3.5" y2="8" stroke-width="1"/></g>' +
    '<g id="umb-leg-r"><line class="umb-body" x1="0" y1="-4" x2="3.5" y2="8" stroke-width="1"/></g>' +
    '</svg>';

  function setCursor(isGK) {
    if (!umbEl) return;
    umbEl.innerHTML = isGK ? GOALKEEPER_SVG : UMBRELLA_SVG;
    umbArms = umbEl.querySelector("#umb-arms");
    umbLegL = umbEl.querySelector("#umb-leg-l");
    umbLegR = umbEl.querySelector("#umb-leg-r");
    if (isGK) {
      UMB_R = 18; UMB_OFF = 24;
      armPivot = "0 -10"; legPivot = "0 -4";
    } else {
      UMB_R = 16; UMB_OFF = 36;
      armPivot = "0 4.5"; legPivot = "0 9";
    }
  }

  if (fine && !reduce) {
    umbEl = document.createElement("div");
    umbEl.id = "dm-umbrella";
    umbEl.setAttribute("aria-hidden", "true");
    umbEl.style.display = "none";
    document.body.appendChild(umbEl);
    setCursor(egg.football);
  }

  /* ---- scroll throttle ---- */
  var scrollT = 0;
  window.addEventListener("scroll", function () {
    var now = performance.now();
    if (now - scrollT > 80) { dirtyCol = true; scrollT = now; }
  }, { passive: true });
  window.addEventListener("resize", function () { resize(); resetBins(); });

  /* ---- physics constants ---- */
  var G = 0.014, TV = 2.8, REST = 0.3;
  var REPULSE_R = 120, REPULSE_F = 0.8;

  /* ---- precomputed football pentagon ---- */
  var PENT = [];
  for (var _i = 0; _i < 5; _i++) {
    var _a = -Math.PI / 2 + _i * (Math.PI * 2 / 5);
    PENT.push([Math.cos(_a), Math.sin(_a)]);
  }

  function drawFootball(x, y, r, rot, o) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    var lw = Math.max(0.8, r * 0.15);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, 6.283);
    ctx.strokeStyle = "#9A9F9C";
    ctx.lineWidth = lw;
    ctx.globalAlpha = o * 0.85;
    ctx.stroke();
    if (r >= 5) {
      var ir = r * 0.4;
      ctx.beginPath();
      for (var i = 0; i < 5; i++) {
        if (i === 0) ctx.moveTo(PENT[i][0] * ir, PENT[i][1] * ir);
        else ctx.lineTo(PENT[i][0] * ir, PENT[i][1] * ir);
      }
      ctx.closePath();
      ctx.fillStyle = cAccent;
      ctx.globalAlpha = o * 0.12;
      ctx.fill();
      ctx.strokeStyle = cAccent;
      ctx.lineWidth = Math.max(0.5, r * 0.09);
      ctx.globalAlpha = o * 0.5;
      ctx.stroke();
      ctx.strokeStyle = "#747A77";
      ctx.lineWidth = Math.max(0.4, r * 0.07);
      ctx.globalAlpha = o * 0.4;
      var seamN = r > 6 ? 5 : 3;
      for (var i = 0; i < seamN; i++) {
        ctx.beginPath();
        ctx.moveTo(PENT[i][0] * ir, PENT[i][1] * ir);
        ctx.lineTo(PENT[i][0] * r * 0.9, PENT[i][1] * r * 0.9);
        ctx.stroke();
      }
    } else if (r >= 3) {
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.35, 0, 6.283);
      ctx.fillStyle = cAccent;
      ctx.globalAlpha = o * 0.4;
      ctx.fill();
    }
    ctx.restore();
  }

  /* ---- speed lines (manga motion accents) ---- */
  var speedLines = [];
  function addSpeedLines(x, y, vx, vy) {
    if (!egg.anime) return;
    var angle = Math.atan2(vy, vx);
    for (var i = 0; i < 3; i++) {
      speedLines.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 16,
        angle: angle + Math.PI + (Math.random() - 0.5) * 0.4,
        len: 12 + Math.random() * 20,
        life: 1,
        decay: 0.035 + Math.random() * 0.02
      });
    }
  }

  /* ---- strategy network (business layer, drawn on canvas) ---- */
  var stratNodes = [], stratEdges = [];
  function buildStrategyNetwork() {
    stratNodes = []; stratEdges = [];
    if (!vw) return;
    var scrollY = window.scrollY || 0;
    var sects = [
      document.getElementById("about") || document.querySelector(".about"),
      document.getElementById("project"),
      document.getElementById("resume"),
      document.getElementById("skills"),
      document.getElementById("contact")
    ];
    var mg = Math.min(35, vw * 0.045);
    var ri = vw - mg;
    sects.forEach(function (el, si) {
      if (!el) return;
      var rect = el.getBoundingClientRect();
      var dy = rect.top + scrollY;
      var h = rect.height;
      stratNodes.push({ x: mg, docY: dy + h * 0.18, a: si % 3 === 0, s: si });
      stratNodes.push({ x: ri, docY: dy + h * 0.32, a: false, s: si });
      stratNodes.push({ x: mg + 12, docY: dy + h * 0.6, a: si === 2, s: si });
      stratNodes.push({ x: ri - 10, docY: dy + h * 0.78, a: si === 3, s: si });
    });
    for (var i = 0; i < stratNodes.length; i++) {
      for (var j = i + 1; j < Math.min(i + 5, stratNodes.length); j++) {
        var a = stratNodes[i], b = stratNodes[j];
        if (Math.abs(a.s - b.s) > 1) continue;
        var dy = Math.abs(a.docY - b.docY);
        if (dy > 50 && dy < 700) stratEdges.push([i, j]);
      }
    }
  }

  function renderStrategy() {
    if (!egg.business || root.getAttribute("data-personal-mode") === "off") return;
    var scrollY = window.scrollY || 0;
    ctx.lineWidth = 0.6;
    for (var i = 0; i < stratEdges.length; i++) {
      var a = stratNodes[stratEdges[i][0]];
      var b = stratNodes[stratEdges[i][1]];
      var ay = a.docY - scrollY, by = b.docY - scrollY;
      if ((ay < -100 && by < -100) || (ay > vh + 100 && by > vh + 100)) continue;
      ctx.strokeStyle = cFg;
      ctx.globalAlpha = 0.06;
      ctx.beginPath();
      var mx = (a.x + b.x) / 2 + (a.s !== b.s ? 25 : 0);
      var my = (ay + by) / 2;
      ctx.moveTo(a.x, ay);
      ctx.quadraticCurveTo(mx, my, b.x, by);
      ctx.stroke();
      var angle = Math.atan2(by - my, b.x - mx);
      ctx.globalAlpha = 0.05;
      ctx.beginPath();
      ctx.moveTo(b.x, by);
      ctx.lineTo(b.x - 4 * Math.cos(angle - 0.4), by - 4 * Math.sin(angle - 0.4));
      ctx.moveTo(b.x, by);
      ctx.lineTo(b.x - 4 * Math.cos(angle + 0.4), by - 4 * Math.sin(angle + 0.4));
      ctx.stroke();
    }
    for (var i = 0; i < stratNodes.length; i++) {
      var n = stratNodes[i];
      var ny = n.docY - scrollY;
      if (ny < -20 || ny > vh + 20) continue;
      var nr = n.a ? 3.5 : 2;
      ctx.beginPath();
      ctx.arc(n.x, ny, nr, 0, 6.283);
      ctx.fillStyle = n.a ? cAccent : cFg;
      ctx.globalAlpha = n.a ? 0.2 : 0.1;
      ctx.fill();
      if (n.a) {
        ctx.beginPath();
        ctx.arc(n.x, ny, 6, 0, 6.283);
        ctx.strokeStyle = cAccent;
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.12;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ==== DISCOVERY GUIDE ==== */
  var guideEl = null;
  var guideInner = null;
  var guideMini = null;
  var guideExpanded = true;

  function eggCount() {
    return (egg.football ? 1 : 0) + (egg.anime ? 1 : 0) + (egg.business ? 1 : 0);
  }

  function createGuide() {
    guideEl = document.createElement("div");
    guideEl.className = "egg-guide";
    guideEl.id = "egg-guide";
    guideEl.setAttribute("role", "complementary");
    guideEl.setAttribute("aria-label", "Easter egg discovery guide");

    guideInner = document.createElement("div");
    guideInner.className = "egg-guide-inner";
    guideInner.id = "egg-guide-body";

    guideMini = document.createElement("button");
    guideMini.className = "egg-guide-mini";
    guideMini.style.display = "none";
    guideMini.setAttribute("aria-expanded", "false");
    guideMini.setAttribute("aria-controls", "egg-guide-body");
    guideMini.addEventListener("click", function () { toggleGuide(true); });

    guideEl.appendChild(guideInner);
    guideEl.appendChild(guideMini);
    document.body.appendChild(guideEl);

    updateGuide();
    setTimeout(function () { guideEl.classList.add("is-visible"); }, 800);
  }

  function toggleGuide(expand) {
    guideExpanded = expand;
    guideInner.style.display = expand ? "" : "none";
    guideMini.style.display = expand ? "none" : "";
    guideMini.setAttribute("aria-expanded", expand ? "true" : "false");
  }

  function updateGuide() {
    if (!guideEl) return;
    var count = eggCount();
    guideMini.textContent = "[ PERSONAL // " + count + "/3 + ]";

    var html = '<div class="egg-guide-head">' +
      '<span class="egg-guide-label">┌ PERSONAL SIGNAL</span>' +
      '<button class="egg-guide-collapse" aria-label="Minimize guide" aria-expanded="true" aria-controls="egg-guide-body">−</button>' +
      '</div>' +
      '<div class="egg-guide-progress">' + count + ' / 3</div>';

    if (count === 0) {
      html += '<div class="egg-guide-section">' +
        '<div class="egg-guide-clue-label">EASTER 01</div>' +
        '<div class="egg-guide-clue">Scroll to the bottom and save the &quot;Get In Touch&quot; sign from getting hit by 10 drops.</div>' +
        '<div class="egg-guide-clue-sub">Use the umbrella.</div>' +
        '</div>';
    } else if (count === 1) {
      html += '<div class="egg-guide-section">' +
        '<div class="egg-guide-found">EASTER 01 // FOUND<br>FOOTBALL</div>' +
        '<div class="egg-guide-next">NEXT SIGNAL:</div>' +
        '<div class="egg-guide-clue">Stories hide between frames.</div>' +
        '<div class="egg-guide-clue-sub">Three hidden frame corners have appeared throughout the site. Find them from top to bottom.</div>' +
        '</div>';
    } else if (count === 2) {
      html += '<div class="egg-guide-section">' +
        '<div class="egg-guide-found">ANIME // FOUND</div>' +
        '<div class="egg-guide-clue-sub">Visual storytelling and world-building get me every time.</div>' +
        '<div class="egg-guide-next">NEXT SIGNAL:</div>' +
        '<div class="egg-guide-clue">The build is only half the conversation.</div>' +
        '<div class="egg-guide-clue-sub">A terminal is waiting near the bottom-right.</div>' +
        '</div>';
    } else {
      html += '<div class="egg-guide-section">' +
        '<div class="egg-guide-complete">PROFILE LAYER COMPLETE</div>' +
        '<div class="egg-guide-list">' +
        'FOOTBALL&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;FOUND<br>' +
        'ANIME&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;FOUND<br>' +
        'BUSINESS&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;FOUND</div>' +
        '<div class="egg-guide-mode">PERSONAL MODE // ONLINE</div>' +
        '</div>' +
        '<div class="egg-guide-controls">' +
        '<button class="egg-guide-btn" data-action="replay-anime">[ REPLAY ANIME ]</button>' +
        '<button class="egg-guide-btn" data-action="open-map">[ OPEN BUSINESS MAP ]</button>' +
        '<button class="egg-guide-btn" data-action="toggle-mode">[ ' +
        (root.getAttribute("data-personal-mode") === "on" ? "NORMAL MODE" : "PERSONAL MODE") + ' ]</button>' +
        '</div>';
    }
    html += '<span class="egg-guide-foot">└</span>';
    guideInner.innerHTML = html;

    var collapseBtn = guideInner.querySelector(".egg-guide-collapse");
    if (collapseBtn) {
      collapseBtn.addEventListener("click", function () { toggleGuide(false); });
    }

    var btns = guideInner.querySelectorAll(".egg-guide-btn");
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", handleGuideAction);
    }
  }

  function handleGuideAction(e) {
    var action = e.target.getAttribute("data-action");
    if (action === "replay-anime") {
      triggerAnimeReveal(true);
    } else if (action === "open-map") {
      openWhiteboard();
    } else if (action === "toggle-mode") {
      var on = root.getAttribute("data-personal-mode") === "on";
      root.setAttribute("data-personal-mode", on ? "off" : "on");
      egg.personal = !on;
      saveEgg();
      updateGuide();
    }
  }

  /* ---- notification system ---- */
  var saveCounterEl = null;

  function createEggUI() {
    saveCounterEl = document.createElement("div");
    saveCounterEl.className = "egg-saves";
    saveCounterEl.setAttribute("aria-hidden", "true");
    document.body.appendChild(saveCounterEl);
  }

  function showNotification(opts) {
    var existing = document.querySelector(".egg-notify");
    if (existing) existing.remove();
    var el = document.createElement("div");
    el.className = "egg-notify";
    el.setAttribute("aria-hidden", "true");
    var html =
      '<div class="egg-notify-head">' +
      '<span class="egg-notify-corner">&#x250C; PERSONAL LAYER</span>' +
      '<span class="egg-notify-count">EASTER ' + opts.num + ' / ' + opts.total + ' FOUND</span>' +
      '</div>' +
      '<div class="egg-notify-title">' + opts.title + '</div>';
    if (opts.subtitle) html += '<div class="egg-notify-sub">' + opts.subtitle + '</div>';
    if (opts.hint) html += '<div class="egg-notify-hint">NEXT SIGNAL:<br>' + opts.hint + '</div>';
    if (opts.hintDetail) html += '<div class="egg-notify-detail">' + opts.hintDetail + '</div>';
    if (opts.finalMsg) html += '<div class="egg-notify-final">' + opts.finalMsg + '</div>';
    html += '<span class="egg-notify-corner egg-notify-foot">&#x2514;</span>';
    el.innerHTML = html;
    document.body.appendChild(el);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { el.classList.add("is-visible"); });
    });
    setTimeout(function () {
      el.classList.remove("is-visible");
      setTimeout(function () { el.remove(); }, 600);
    }, opts.duration || 10000);
  }

  function updateSaveCounter() {
    if (!saveCounterEl || egg.football) return;
    var n = egg.saves < 10 ? "0" + egg.saves : "10";
    saveCounterEl.textContent = "[ SAVES " + n + "/10 ]";
    saveCounterEl.classList.add("is-visible");
  }

  function shakeHeading() {
    if (!ctHeading) return;
    ctHeading.classList.remove("egg-shaking");
    void ctHeading.offsetWidth;
    ctHeading.classList.add("egg-shaking");
  }

  /* ---- football unlock ---- */
  var fbTransStart = 0;
  var FB_TRANS_DUR = 700;

  function unlockFootball() {
    egg.football = true;
    saveEgg();
    if (!reduce) {
      fbTransStart = performance.now();
      setCursor(true);
      var targetR = function () { return mobile ? 4 + Math.random() * 3 : 5 + Math.random() * 4; };
      for (var i = 0; i < pool.length; i++) {
        pool[i].startR = pool[i].r;
        pool[i].targetR = targetR();
        pool[i].av = pool[i].av || (Math.random() - 0.5) * 0.04;
      }
      for (var i = 0; i < bed.length; i++) {
        bed[i].startR = bed[i].r;
        bed[i].targetR = targetR();
        bed[i].av = bed[i].av || (Math.random() - 0.5) * 0.04;
      }
    }
    if (saveCounterEl) {
      saveCounterEl.textContent = "[ SAVES 10/10 ]";
      setTimeout(function () { saveCounterEl.classList.remove("is-visible"); }, 2000);
    }
    showNotification({
      num: "01", total: "03",
      title: "THE SAVE // COMPLETE",
      subtitle: "I like football (soccer)."
    });
    updateGuide();
    applyFootballLayer();
    setTimeout(setupAnime, 2500);
  }

  function applyFootballLayer() {
    if (!contactEl || contactEl.querySelector(".egg-tactical-arc")) return;
    var arc = document.createElement("div");
    arc.className = "egg-tactical-arc";
    arc.setAttribute("aria-hidden", "true");
    contactEl.appendChild(arc);
  }

  /* ==== ANIME SYSTEM ==== */
  var animeMarkers = [];

  function setupAnime() {
    if (egg.anime) { applyAnimeLayer(); setupBusiness(); return; }
    if (!egg.football) return;
    window.dispatchEvent(new CustomEvent("dm:anime:preload"));
    var sects = [
      { el: document.getElementById("about") || document.querySelector(".about"), char: "┌", pos: "tl" },
      { el: document.getElementById("project"), char: "┐", pos: "tr" },
      { el: document.getElementById("skills"), char: "┘", pos: "br" }
    ];
    sects.forEach(function (s, idx) {
      if (!s.el || s.el.querySelector(".egg-frame")) return;
      s.el.style.position = "relative";
      var m = document.createElement("button");
      m.className = "egg-frame";
      m.setAttribute("aria-label", "Frame " + (idx + 1));
      m.textContent = s.char;
      if (s.pos === "tl") { m.style.top = "12px"; m.style.left = "12px"; }
      else if (s.pos === "tr") { m.style.top = "12px"; m.style.right = "12px"; }
      else { m.style.bottom = "12px"; m.style.right = "12px"; }
      s.el.appendChild(m);

      var label = document.createElement("span");
      label.className = "egg-frame-label";
      label.textContent = "FRAME // 0" + (idx + 1);
      label.setAttribute("aria-hidden", "true");
      m.appendChild(label);

      setTimeout(function () { m.classList.add("is-visible"); }, 600 + idx * 250);

      m.addEventListener("click", function () {
        if (egg.anime) return;
        if (animeProgress === idx) {
          animeProgress++;
          m.classList.add("is-found");
          showFrameFeedback(m, idx + 1);
          if (animeProgress >= 3) unlockAnime();
        } else if (idx < animeProgress) {
          /* already found, ignore */
        } else {
          showFrameError(m);
        }
      });
      animeMarkers.push(m);
    });
  }

  function showFrameFeedback(marker, num) {
    var fb = document.createElement("span");
    fb.className = "egg-frame-fb";
    fb.textContent = "FRAME 0" + num + " // FOUND";
    fb.setAttribute("aria-hidden", "true");
    var parent = marker.parentNode;
    parent.appendChild(fb);
    var mRect = marker.getBoundingClientRect();
    var pRect = parent.getBoundingClientRect();
    fb.style.position = "absolute";
    fb.style.top = (mRect.top - pRect.top + mRect.height + 4) + "px";
    if (marker.style.right) fb.style.right = "8px";
    else fb.style.left = "8px";
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { fb.classList.add("is-visible"); });
    });
    setTimeout(function () { fb.remove(); }, 2500);
  }

  function showFrameError(marker) {
    var fb = document.createElement("span");
    fb.className = "egg-frame-fb egg-frame-err";
    fb.textContent = "SIGNAL OUT OF ORDER — SEARCH ABOVE";
    fb.setAttribute("aria-hidden", "true");
    var parent = marker.parentNode;
    parent.appendChild(fb);
    var mRect = marker.getBoundingClientRect();
    var pRect = parent.getBoundingClientRect();
    fb.style.position = "absolute";
    fb.style.top = (mRect.top - pRect.top + mRect.height + 4) + "px";
    if (marker.style.right) fb.style.right = "8px";
    else fb.style.left = "8px";
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { fb.classList.add("is-visible"); });
    });
    setTimeout(function () { fb.remove(); }, 2000);
  }

  function unlockAnime() {
    egg.anime = true;
    saveEgg();
    triggerAnimeReveal(false);
  }

  /* ==== ANIME REVEAL (delegated to js/dm-anime-reveal.js via events) ==== */
  var animeOverlayOpen = false;

  function triggerAnimeReveal(isReplay) {
    window.dispatchEvent(new CustomEvent("dm:anime:reveal", { detail: { isReplay: isReplay } }));
  }

  window.addEventListener("dm:anime:reveal:start", function () {
    animeOverlayOpen = true;
    if (umbEl) umbEl.style.display = "none";
    curVisible = false;
    curMounted = false;
    document.body.classList.remove("dm-cursor-active");
  });

  window.addEventListener("dm:anime:reveal:end", function (e) {
    animeOverlayOpen = false;
    var isReplay = !!(e.detail && e.detail.isReplay);
    if (!isReplay) {
      applyAnimeLayer();
      updateGuide();
      setTimeout(setupBusiness, 900);
    }
  });

  function applyAnimeLayer() {
    var frameSects = document.querySelectorAll("#project, #resume, #skills, #contact");
    for (var i = 0; i < frameSects.length; i++) {
      var sec = frameSects[i];
      sec.style.position = "relative";
      if (sec.querySelector(".egg-corners")) continue;
      var corners = document.createElement("div");
      corners.className = "egg-corners";
      corners.setAttribute("aria-hidden", "true");
      corners.innerHTML = "<span></span><span></span><span></span><span></span>";
      sec.appendChild(corners);
      setTimeout(function (el) { el.classList.add("is-framed"); }.bind(null, corners), 200 + i * 150);
    }

    var htSects = document.querySelectorAll("#about, #project, #skills");
    for (var i = 0; i < htSects.length; i++) {
      var sec = htSects[i];
      if (sec.querySelector(".egg-halftone")) continue;
      sec.style.position = "relative";
      var ht = document.createElement("div");
      ht.className = "egg-halftone";
      ht.setAttribute("aria-hidden", "true");
      sec.appendChild(ht);
      setTimeout(function (el) { el.classList.add("is-active"); }.bind(null, ht), 400 + i * 200);
    }

    var diagSects = document.querySelectorAll("#project, #resume");
    for (var i = 0; i < diagSects.length; i++) {
      var sec = diagSects[i];
      if (sec.querySelector(".egg-diag")) continue;
      sec.style.position = "relative";
      var d = document.createElement("div");
      d.className = "egg-diag";
      d.setAttribute("aria-hidden", "true");
      sec.appendChild(d);
      setTimeout(function (el) { el.classList.add("is-active"); }.bind(null, d), 600 + i * 200);
    }
  }

  /* ==== BUSINESS SYSTEM ==== */
  var bizTerminalEl = null;

  function setupBusiness() {
    if (egg.business) { applyBusinessLayer(); finalCheck(); return; }
    if (!egg.anime) return;

    /* create fixed bottom-right terminal */
    if (document.querySelector(".egg-terminal")) return;
    bizTerminalEl = document.createElement("div");
    bizTerminalEl.className = "egg-terminal";
    bizTerminalEl.setAttribute("role", "complementary");
    bizTerminalEl.setAttribute("aria-label", "Business terminal");

    var termInner = document.createElement("div");
    termInner.className = "egg-terminal-inner";
    termInner.id = "egg-terminal-body";

    var termHead = document.createElement("div");
    termHead.className = "egg-terminal-head";
    termHead.innerHTML = '<span>┌ PRIVATE CHANNEL</span>' +
      '<button class="egg-terminal-collapse" aria-label="Minimize terminal" aria-expanded="true" aria-controls="egg-terminal-body">−</button>';
    termInner.appendChild(termHead);

    var termPrompt = document.createElement("div");
    termPrompt.className = "egg-terminal-prompt";
    termPrompt.innerHTML = '<span class="egg-terminal-gt">&gt; </span>';
    var input = document.createElement("input");
    input.type = "text";
    input.setAttribute("aria-label", "Enter a keyword to unlock");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("placeholder", "business");
    termPrompt.appendChild(input);
    termInner.appendChild(termPrompt);

    termInner.innerHTML += '<span class="egg-terminal-foot">└</span>';

    bizTerminalEl.appendChild(termInner);

    var termMini = document.createElement("button");
    termMini.className = "egg-terminal-mini";
    termMini.textContent = "[ >_ ]";
    termMini.style.display = "none";
    termMini.setAttribute("aria-expanded", "false");
    termMini.setAttribute("aria-controls", "egg-terminal-body");
    bizTerminalEl.appendChild(termMini);

    document.body.appendChild(bizTerminalEl);

    setTimeout(function () { bizTerminalEl.classList.add("is-visible"); }, 600);

    /* re-query elements after innerHTML */
    var collapseBtn = bizTerminalEl.querySelector(".egg-terminal-collapse");
    input = bizTerminalEl.querySelector("input");

    collapseBtn.addEventListener("click", function () {
      termInner.style.display = "none";
      termMini.style.display = "";
      termMini.setAttribute("aria-expanded", "false");
    });

    termMini.addEventListener("click", function () {
      termInner.style.display = "";
      termMini.style.display = "none";
      termMini.setAttribute("aria-expanded", "true");
      input.focus();
    });

    var cmds = ["strategy", "business", "startup", "entrepreneurship", "why"];
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        var v = input.value.trim().toLowerCase();
        if (cmds.indexOf(v) >= 0) {
          input.disabled = true;
          input.value = v + " // ACCESS GRANTED";
          input.style.color = cAccent;
          setTimeout(function () {
            bizTerminalEl.classList.remove("is-visible");
            setTimeout(function () { bizTerminalEl.remove(); }, 400);
            unlockBusiness();
          }, 800);
        } else {
          input.value = "";
          input.style.borderColor = "rgba(245,80,80,0.5)";
          setTimeout(function () { input.style.borderColor = ""; }, 500);
        }
      }
    });
  }

  function unlockBusiness() {
    egg.business = true;
    egg.personal = true;
    saveEgg();
    applyBusinessLayer();
    root.setAttribute("data-personal-mode", "on");
    showNotification({
      num: "03", total: "03",
      title: "THE WHY BEHIND THE BUILD // COMPLETE",
      subtitle: "I love deep conversations about business, strategy, and entrepreneurship.",
      finalMsg: "PROFILE LAYER COMPLETE &#x2014; PERSONAL MODE // ONLINE",
      duration: 12000
    });
    updateGuide();
    openWhiteboard();
  }

  function applyBusinessLayer() {
    root.classList.add("egg-business");
    buildStrategyNetwork();
  }

  /* ==== BUSINESS WHITEBOARD ==== */
  var whiteboardEl = null;
  var wbSvg = null;
  var wbFont = "var(--dm-mono), monospace";
  var wbData = buildMindMapData();
  var wbViewport = { x: 0, y: 0, zoom: 1 };
  var wbPanning = false;
  var wbDragging = null;
  var wbPanStart = null;

  function buildMindMapData() {
    var branches = [
      { label: "PRODUCT", children: ["Customer job", "Value proposition", "Wedge", "Product-market fit", "Expansion"] },
      { label: "MARKET", children: ["Urgency", "Market structure", "Timing", "Segmentation", "Competition"] },
      { label: "DISTRIBUTION", children: ["Acquisition channels", "Organic loops", "Sales motion", "CAC", "Payback"] },
      { label: "STRATEGY", children: ["Where to play", "How to win", "Trade-offs", "What NOT to do", "Sequencing"] },
      { label: "ECONOMICS", children: ["Gross margin", "Contribution margin", "LTV", "CAC", "Cash conversion"] },
      { label: "CUSTOMER PSYCH", children: ["Motivation", "Trust", "Status", "Habit", "Switching behavior"] },
      { label: "MOAT", children: ["Network effects", "Switching costs", "Brand", "Data", "Scale"] },
      { label: "OPERATIONS", children: ["Execution", "Systems", "Constraints", "Quality", "Speed"] },
      { label: "CAPITAL", children: ["Runway", "Capital efficiency", "Risk", "Optionality", "Investment"] },
      { label: "TEAM", children: ["Incentives", "Culture", "Hiring", "Ownership", "Decision speed"] }
    ];

    var nodes = [{ id: "center", label: "BUSINESS", x: 0, y: 0, level: 0, parent: null, expanded: true, children: [] }];
    var edges = [];
    var R1 = 230;
    var R2 = 175;
    var MIN_GAP = 56; /* min center-to-center px between sibling child nodes */

    branches.forEach(function (b, bi) {
      var angle = (bi / branches.length) * Math.PI * 2 - Math.PI / 2;
      var bx = Math.cos(angle) * R1;
      var by = Math.sin(angle) * R1;
      var bid = "b" + bi;
      nodes[0].children.push(bid);
      nodes.push({ id: bid, label: b.label, x: bx, y: by, level: 1, parent: "center", expanded: false, children: [], angle: angle });
      edges.push(["center", bid]);

      var n = b.children.length;
      var stepRad = Math.min(0.34, MIN_GAP / R2);
      var spread = stepRad * (n - 1);

      b.children.forEach(function (ch, ci) {
        var ca = n > 1 ? angle + (ci - (n - 1) / 2) * stepRad : angle;
        var cx = bx + Math.cos(ca) * R2;
        var cy = by + Math.sin(ca) * R2;
        var cid = bid + "c" + ci;
        nodes[nodes.length - 1].children.push(cid);
        nodes.push({ id: cid, label: ch, x: cx, y: cy, level: 2, parent: bid, expanded: false, children: [] });
        edges.push([bid, cid]);
      });
    });

    return { nodes: nodes, edges: edges };
  }

  function findNode(id) {
    for (var i = 0; i < wbData.nodes.length; i++) {
      if (wbData.nodes[i].id === id) return wbData.nodes[i];
    }
    return null;
  }

  function isNodeVisible(n) {
    if (n.level === 0) return true;
    if (n.level === 1) return true;
    var parent = findNode(n.parent);
    return parent && parent.expanded;
  }

  function openWhiteboard() {
    if (whiteboardEl) { whiteboardEl.classList.add("is-open"); return; }

    whiteboardEl = document.createElement("div");
    whiteboardEl.className = "wb-overlay is-open";
    whiteboardEl.setAttribute("role", "dialog");
    whiteboardEl.setAttribute("aria-modal", "true");
    whiteboardEl.setAttribute("aria-label", "Business mind map");

    /* Datamatics bridge label */
    var corner = document.createElement("div");
    corner.className = "wb-corner";
    corner.textContent = "[ WHITEBOARD // PERSONAL LAYER 03 ]";
    whiteboardEl.appendChild(corner);

    /* header */
    var header = document.createElement("div");
    header.className = "wb-header";
    header.innerHTML =
      '<div class="wb-title">THINGS I CAN TALK ABOUT FOR HOURS</div>' +
      '<div class="wb-subtitle">BUSINESS / STRATEGY / ENTREPRENEURSHIP</div>' +
      '<p class="wb-message">' +
      '<span class="wb-signal"><span class="wb-signal-dot"></span>PERSONAL SIGNAL // 03 OF 03</span>' +
      'I love deep conversations about business, strategy, and entrepreneurship.' +
      '</p>';
    whiteboardEl.appendChild(header);

    /* SVG */
    wbSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    wbSvg.setAttribute("class", "wb-svg");
    wbSvg.setAttribute("aria-label", "Business mind map");
    whiteboardEl.appendChild(wbSvg);

    /* controls */
    var controls = document.createElement("div");
    controls.className = "wb-controls";
    controls.innerHTML =
      '<button class="wb-btn" data-action="zoom-in" aria-label="Zoom in">+</button>' +
      '<button class="wb-btn" data-action="zoom-out" aria-label="Zoom out">−</button>' +
      '<button class="wb-btn" data-action="reset">RESET VIEW</button>' +
      '<button class="wb-btn wb-close" data-action="close">[ CLOSE ]</button>';
    whiteboardEl.appendChild(controls);

    document.body.appendChild(whiteboardEl);

    /* render initial SVG */
    wbViewport = { x: 0, y: 0, zoom: 1 };
    renderWhiteboard();

    /* event handlers */
    controls.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-action]");
      if (!btn) return;
      var action = btn.getAttribute("data-action");
      if (action === "zoom-in") { wbViewport.zoom = Math.min(2, wbViewport.zoom * 1.2); renderWhiteboard(); }
      else if (action === "zoom-out") { wbViewport.zoom = Math.max(0.3, wbViewport.zoom / 1.2); renderWhiteboard(); }
      else if (action === "reset") { wbViewport = { x: 0, y: 0, zoom: 1 }; renderWhiteboard(); }
      else if (action === "close") { closeWhiteboard(); }
    });

    /* pan & drag */
    wbSvg.addEventListener("pointerdown", function (e) {
      var nodeEl = e.target.closest("[data-node-id]");
      if (nodeEl) {
        var nid = nodeEl.getAttribute("data-node-id");
        var node = findNode(nid);
        if (node) {
          wbDragging = { id: nid, startX: e.clientX, startY: e.clientY, origX: node.x, origY: node.y };
        }
        e.preventDefault();
        return;
      }
      wbPanning = true;
      wbPanStart = { x: e.clientX - wbViewport.x, y: e.clientY - wbViewport.y };
      e.preventDefault();
    });

    wbSvg.addEventListener("pointermove", function (e) {
      if (wbDragging) {
        var node = findNode(wbDragging.id);
        if (node) {
          node.x = wbDragging.origX + (e.clientX - wbDragging.startX) / wbViewport.zoom;
          node.y = wbDragging.origY + (e.clientY - wbDragging.startY) / wbViewport.zoom;
          renderWhiteboard();
        }
      } else if (wbPanning && wbPanStart) {
        wbViewport.x = e.clientX - wbPanStart.x;
        wbViewport.y = e.clientY - wbPanStart.y;
        renderWhiteboard();
      }
    });

    wbSvg.addEventListener("pointerup", function () {
      if (wbDragging) wbDragging = null;
      wbPanning = false;
      wbPanStart = null;
    });

    /* click to expand/collapse */
    wbSvg.addEventListener("click", function (e) {
      if (wbDragging) return;
      var nodeEl = e.target.closest("[data-node-id]");
      if (!nodeEl) return;
      var nid = nodeEl.getAttribute("data-node-id");
      var node = findNode(nid);
      if (node && node.children.length > 0) {
        var willExpand = !node.expanded;
        if (willExpand && node.level === 1) {
          wbData.nodes.forEach(function (other) {
            if (other.level === 1 && other.id !== node.id) other.expanded = false;
          });
        }
        node.expanded = willExpand;
        renderWhiteboard();
      }
    });

    /* wheel zoom */
    wbSvg.addEventListener("wheel", function (e) {
      e.preventDefault();
      var factor = e.deltaY > 0 ? 0.9 : 1.1;
      wbViewport.zoom = Math.max(0.3, Math.min(2, wbViewport.zoom * factor));
      renderWhiteboard();
    }, { passive: false });

    /* keyboard */
    whiteboardEl.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeWhiteboard();
    });
  }

  /* deterministic small curve offset so edges don't jitter between re-renders */
  function edgeSeed(idA, idB) {
    var s = idA + idB, h2 = 0;
    for (var i = 0; i < s.length; i++) h2 = (h2 * 31 + s.charCodeAt(i)) | 0;
    return ((h2 % 200) / 200) - 0.5; /* -0.5..0.5 */
  }

  function wrapLabel(label, maxCharsPerLine) {
    var words = label.split(" ");
    if (words.length === 1) return [label];
    var lines = [], cur = "";
    words.forEach(function (w) {
      var next = cur ? cur + " " + w : w;
      if (next.length > maxCharsPerLine && cur) { lines.push(cur); cur = w; }
      else cur = next;
    });
    if (cur) lines.push(cur);
    return lines;
  }

  function renderWhiteboard() {
    if (!wbSvg) return;
    var w = wbSvg.clientWidth || window.innerWidth;
    var h = wbSvg.clientHeight || window.innerHeight;
    var cx = w / 2 + wbViewport.x;
    var cy = h / 2 + wbViewport.y + 16;
    var z = wbViewport.zoom;

    var html = '<g transform="translate(' + cx + ',' + cy + ') scale(' + z + ')">';

    /* edges */
    for (var i = 0; i < wbData.edges.length; i++) {
      var edge = wbData.edges[i];
      var nA = findNode(edge[0]);
      var nB = findNode(edge[1]);
      if (!nA || !nB || !isNodeVisible(nA) || !isNodeVisible(nB)) continue;
      var seed = edgeSeed(nA.id, nB.id);
      var mx = (nA.x + nB.x) / 2 + seed * 14;
      var my = (nA.y + nB.y) / 2 + 10 + seed * 8;
      html += '<path d="M' + nA.x + ' ' + nA.y + ' Q' + mx + ' ' + my + ' ' + nB.x + ' ' + nB.y +
        '" fill="none" stroke="#2a2a2a" stroke-width="1.1" opacity="0.32"/>';
    }

    /* nodes */
    for (var i = 0; i < wbData.nodes.length; i++) {
      var n = wbData.nodes[i];
      if (!isNodeVisible(n)) continue;
      var expandable = n.children.length > 0;

      if (n.level === 0) {
        html += '<g data-node-id="' + n.id + '" class="wb-node wb-node--0">' +
          '<circle cx="0" cy="0" r="46" fill="#0d0d0d" stroke="' + cAccent + '" stroke-width="2"/>' +
          '<text x="0" y="4" fill="#fff" font-size="12" font-weight="700" font-family="' + wbFont + '" text-anchor="middle" letter-spacing="0.04em" pointer-events="none">' + n.label + '</text>' +
          '</g>';
        continue;
      }

      if (n.level === 1) {
        var r1 = 33;
        var lines = wrapLabel(n.label, 9);
        var fs1 = lines.length > 1 ? 8.6 : Math.max(6.5, Math.min(9, (r1 * 2 - 12) / (n.label.length * 0.62)));
        var lh1 = fs1 * 1.25;
        var startY1 = -((lines.length - 1) * lh1) / 2;

        html += '<g data-node-id="' + n.id + '" class="wb-node wb-node--1' + (n.expanded ? ' is-expanded' : '') + '" ' +
          'tabindex="0" role="button" aria-label="' + n.label + (expandable ? (n.expanded ? ', expanded' : ', collapsed') : '') + '">';
        html += '<circle cx="' + n.x + '" cy="' + n.y + '" r="' + r1 + '" fill="#161616" stroke="' + (n.expanded ? cAccent : "#555") + '" stroke-width="' + (n.expanded ? 1.6 : 1.1) + '"/>';
        lines.forEach(function (line, li) {
          html += '<text x="' + n.x + '" y="' + (n.y + startY1 + li * lh1 + fs1 * 0.32) +
            '" fill="#e8e8e8" font-size="' + fs1 + '" font-family="' + wbFont + '" text-anchor="middle" letter-spacing="0.02em" pointer-events="none">' + line + '</text>';
        });
        if (expandable) {
          html += '<text x="' + (n.x + r1 - 4) + '" y="' + (n.y - r1 + 12) +
            '" fill="' + (n.expanded ? cAccent : "#777") + '" font-size="10" font-family="' + wbFont + '" text-anchor="middle" pointer-events="none">' +
            (n.expanded ? "−" : "+") + "</text>";
        }
        html += '</g>';
        continue;
      }

      /* level 2: small dot, external label */
      var parent1 = findNode(n.parent);
      var toRight = parent1 ? n.x >= parent1.x : n.x >= 0;
      var lx = n.x + (toRight ? 11 : -11);
      var anchor = toRight ? "start" : "end";
      html += '<g data-node-id="' + n.id + '" class="wb-node wb-node--2">';
      html += '<line x1="' + n.x + '" y1="' + n.y + '" x2="' + lx + '" y2="' + n.y + '" stroke="#999" stroke-width="0.8" opacity="0.5"/>';
      html += '<circle cx="' + n.x + '" cy="' + n.y + '" r="4.5" fill="#1a1a1a" stroke="#888" stroke-width="0.8"/>';
      html += '<text x="' + (lx + (toRight ? 4 : -4)) + '" y="' + (n.y + 3) +
        '" fill="#3a3a3a" font-size="8.5" font-family="' + wbFont + '" text-anchor="' + anchor + '" pointer-events="none">' + n.label + '</text>';
      html += '</g>';
    }

    html += '</g>';
    wbSvg.innerHTML = html;
  }

  function closeWhiteboard() {
    if (whiteboardEl) whiteboardEl.classList.remove("is-open");
  }

  /* ---- personal mode ---- */
  function finalCheck() {
    if (!(egg.football && egg.anime && egg.business)) return;
    root.setAttribute("data-personal-mode", egg.personal ? "on" : "off");
    updateGuide();
  }

  /* ---- mobile tap-save ---- */
  if (!fine && contactEl && !reduce) {
    document.addEventListener("touchstart", function (e) {
      if (egg.football || !ctRect) return;
      var t = e.touches[0];
      if (!t || t.clientY < cRect.top || t.clientY > cRect.bottom) return;
      for (var i = 0; i < pool.length; i++) {
        var p = pool[i];
        if (p.isThreat && !p.saved && !p.missed) {
          var dx = p.x - t.clientX, dy = p.y - t.clientY;
          if (Math.sqrt(dx * dx + dy * dy) < 40) {
            p.saved = true;
            p.vx += (Math.random() - 0.5) * 3;
            p.vy = -Math.abs(p.vy) * 1.5;
            egg.saves++;
            saveEgg();
            updateSaveCounter();
            if (egg.saves >= 10) unlockFootball();
            break;
          }
        }
      }
    }, { passive: true });
  }

  function tick() {
    if (reduce) return;
    if (dirtyCol) { refreshCol(); refreshContact(); }

    var scrollY = window.scrollY || 0;
    var docH = root.scrollHeight;
    var sf = docH > vh ? scrollY / (docH - vh) : 0;
    var density = 0.5 + 0.5 * sf;
    var rate = (mobile ? 1.2 : 3.5) * density;
    var maxP = mobile ? 80 : MAX_POOL;
    var maxB = mobile ? 80 : MAX_BED;

    if (scrollY > 10 && pool.length + bed.length < maxP + maxB) {
      var n = Math.floor(rate);
      if (Math.random() < rate - n) n++;
      while (pool.length >= maxP && n > 0) { n--; }
      for (var s = 0; s < n && pool.length < maxP; s++) spawn();
    }

    var pActive = ptr.active && curVisible;
    var umbCx = umbPos.x, umbCy = umbPos.y - UMB_OFF;

    for (var i = pool.length - 1; i >= 0; i--) {
      var p = pool[i];
      p.vy = Math.min(p.vy + G, TV);
      p.vx += Math.sin(p.age * 0.02) * 0.004;
      p.vx *= 0.997;
      p.x += p.vx;
      p.y += p.vy;
      p.age++;
      if (egg.football) p.rot += p.av;

      /* threat classification */
      if (!egg.football && ctRect && !p.isThreat && !p.saved && !p.missed &&
          p.vy > 0 && p.x > ctRect.left - 30 && p.x < ctRect.right + 30 &&
          p.y < ctRect.top && p.y > ctRect.top - 200) {
        p.isThreat = true;
      }

      /* pointer repulsion in contact */
      if (inContact && ptr.active) {
        var dx = p.x - ptr.x, dy = p.y - ptr.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < REPULSE_R && d > 0) {
          var f = (1 - d / REPULSE_R) * REPULSE_F;
          p.vx += (dx / d) * f; p.vy += (dy / d) * f;
          var spd = Math.sqrt(ptr.vx * ptr.vx + ptr.vy * ptr.vy);
          if (spd > 2) {
            var boost = Math.min(spd * 0.08, 1.5);
            p.vx += (ptr.vx / spd) * boost * f;
            p.vy += (ptr.vy / spd) * boost * f;
          }
        }
      }

      /* umbrella collision */
      if (pActive && umbEl) {
        var dx = p.x - umbCx, dy = p.y - umbCy;
        var d = Math.sqrt(dx * dx + dy * dy);
        var minD = UMB_R + p.r;
        if (d < minD && p.y < umbCy + 5) {
          if (d > 0) { p.x = umbCx + (dx / d) * minD; p.y = umbCy + (dy / d) * minD; }
          var nx = dx / (d || 1), ny = dy / (d || 1);
          var dot = p.vx * nx + p.vy * ny;
          if (dot < 0) {
            p.vx -= (1 + REST) * dot * nx;
            p.vy -= (1 + REST) * dot * ny;
            p.vy *= 0.8;
            if (!egg.football && p.isThreat && !p.saved) {
              p.saved = true;
              egg.saves++;
              saveEgg();
              updateSaveCounter();
              if (egg.saves >= 10) unlockFootball();
            }
            if (egg.football) {
              p.av += (Math.random() - 0.5) * 0.04;
              if (p.av > 0.08) p.av = 0.08;
              if (p.av < -0.08) p.av = -0.08;
              var hitSpd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
              if (hitSpd > 2) addSpeedLines(p.x, p.y, p.vx, p.vy);
            }
          }
        }
      }

      /* card collisions (desktop only) */
      if (!mobile) {
        for (var c = 0; c < colRects.length; c++) {
          var cr = colRects[c];
          if (p.x > cr.left - p.r && p.x < cr.right + p.r &&
              p.y > cr.top - p.r && p.y < cr.bottom + p.r) {
            var oT = p.y + p.r - cr.top, oB = cr.bottom - (p.y - p.r);
            var oL = p.x + p.r - cr.left, oR = cr.right - (p.x - p.r);
            var mn = Math.min(oT, oB, oL, oR);
            if (mn === oT && p.vy > 0) { p.y = cr.top - p.r; p.vy *= -REST; p.vx += (Math.random() - 0.5) * 0.4; }
            else if (mn === oB && p.vy < 0) { p.y = cr.bottom + p.r; p.vy *= -REST; }
            else if (mn === oL && p.vx > 0) { p.x = cr.left - p.r; p.vx *= -REST; }
            else if (mn === oR && p.vx < 0) { p.x = cr.right + p.r; p.vx *= -REST; }
            if (egg.football) {
              p.av += (Math.random() - 0.5) * 0.03;
              if (p.av > 0.08) p.av = 0.08;
              if (p.av < -0.08) p.av = -0.08;
            }
          }
        }
      }

      /* miss detection */
      if (!egg.football && p.isThreat && !p.saved && !p.missed && ctRect && p.y > ctRect.bottom + 10) {
        p.missed = true;
        shakeHeading();
      }

      /* contact floor settling with height-field accumulation */
      if (contactEl && p.y > cFloor && p.x > cRect.left && p.x < cRect.right) {
        var bi = Math.floor(p.x / BIN_W);
        var localH = (bi >= 0 && bi < binCount) ? bins[bi] : 0;
        var settleY = cFloor - localH * 3.2;
        if (p.y > settleY) {
          p.y = settleY;
          p.vy = -Math.abs(p.vy) * 0.12;
          p.vx *= 0.7;
          if (Math.abs(p.vy) < 0.2 && bed.length < maxB) {
            p.docY = scrollY + settleY + (Math.random() - 0.5) * 3;
            p.x += (Math.random() - 0.5) * 4;
            bed.push(p); pool.splice(i, 1);
            if (bi >= 0 && bi < binCount) bins[bi]++;
            continue;
          }
        }
      }

      if (p.y > vh + 50 || p.x < -50 || p.x > vw + 50) {
        pool.splice(i, 1);
      }
    }

    /* pointer repulsion on settled bed */
    if (inContact && ptr.active) {
      var scrollY2 = window.scrollY || 0;
      for (var i = bed.length - 1; i >= 0; i--) {
        var p = bed[i], sy = p.docY - scrollY2;
        var dx = p.x - ptr.x, dy = sy - ptr.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < REPULSE_R && d > 0) {
          var f = (1 - d / REPULSE_R) * 0.7;
          var spd = Math.sqrt(ptr.vx * ptr.vx + ptr.vy * ptr.vy);
          p.vx = (dx / d) * f;
          p.vy = (dy / d) * f;
          if (spd > 3) {
            p.vx += (ptr.vx / spd) * Math.min(spd * 0.1, 2) * f;
            p.vy += (ptr.vy / spd) * Math.min(spd * 0.1, 2) * f;
          }
          p.y = sy; pool.push(p);
          var bi = Math.floor(p.x / BIN_W);
          if (bi >= 0 && bi < binCount && bins[bi] > 0) bins[bi]--;
          bed.splice(i, 1);
        }
      }
    }

    /* umbrella pushes settled particles too */
    if (pActive && umbEl) {
      var scrollY3 = window.scrollY || 0;
      for (var i = bed.length - 1; i >= 0; i--) {
        var p = bed[i], sy = p.docY - scrollY3;
        var dx = p.x - umbCx, dy = sy - umbCy;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < UMB_R + 20 && d > 0) {
          p.vx = (dx / d) * 1.5;
          p.vy = (dy / d) * 1.2;
          p.y = sy; pool.push(p);
          var bi = Math.floor(p.x / BIN_W);
          if (bi >= 0 && bi < binCount && bins[bi] > 0) bins[bi]--;
          bed.splice(i, 1);
        }
      }
    }

    /* speed line decay */
    for (var i = speedLines.length - 1; i >= 0; i--) {
      speedLines[i].life -= speedLines[i].decay;
      if (speedLines[i].life <= 0) speedLines.splice(i, 1);
    }
  }

  /* ---- render ---- */
  function render() {
    if (reduce) return;
    ctx.clearRect(0, 0, vw, vh);
    var scrollY = window.scrollY || 0;
    var hb = heroEl.getBoundingClientRect().bottom;
    var colors = [cFg, cFg, cAccent];
    var pm = root.getAttribute("data-personal-mode");
    var fb = egg.football && pm !== "off";

    /* football transition interpolation */
    if (fbTransStart) {
      var elapsed = performance.now() - fbTransStart;
      var t = Math.min(1, elapsed / FB_TRANS_DUR);
      t = t * t * (3 - 2 * t);
      var allP = pool.concat(bed);
      for (var i = 0; i < allP.length; i++) {
        var p = allP[i];
        if (p.targetR !== undefined) {
          p.r = p.startR + (p.targetR - p.startR) * t;
          if (t >= 1) { delete p.startR; delete p.targetR; }
        }
      }
      if (t >= 1) fbTransStart = 0;
    }

    /* strategy network (behind particles) */
    renderStrategy();

    for (var i = 0; i < bed.length; i++) {
      var p = bed[i], sy = p.docY - scrollY;
      if (sy < -10 || sy > vh + 10) continue;
      if (fb) {
        drawFootball(p.x, sy, p.r, p.rot || 0, p.o * 0.8);
      } else {
        ctx.globalAlpha = p.o * 0.8;
        ctx.fillStyle = colors[p.t];
        ctx.beginPath(); ctx.arc(p.x, sy, Math.min(p.r, 2.2), 0, 6.283); ctx.fill();
      }
    }

    for (var i = 0; i < pool.length; i++) {
      var p = pool[i];
      if (p.y < hb) continue;
      if (fb) {
        drawFootball(p.x, p.y, p.r, p.rot || 0, p.o);
      } else {
        ctx.globalAlpha = p.o;
        ctx.fillStyle = colors[p.t];
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.min(p.r, 2.2), 0, 6.283); ctx.fill();
      }
    }

    /* speed lines */
    for (var i = 0; i < speedLines.length; i++) {
      var sl = speedLines[i];
      ctx.strokeStyle = cFg;
      ctx.lineWidth = 1;
      ctx.globalAlpha = sl.life * 0.3;
      ctx.beginPath();
      ctx.moveTo(sl.x, sl.y);
      ctx.lineTo(sl.x + Math.cos(sl.angle) * sl.len, sl.y + Math.sin(sl.angle) * sl.len);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  /* ---- umbrella position (damped spring with inertia) ---- */
  function updateUmb() {
    if (!umbEl || !curVisible) return;
    var ax = (ptr.x - umbPos.x) * UMB_STIFF;
    var ay = (ptr.y - umbPos.y) * UMB_STIFF;
    umbPos.vx = (umbPos.vx + ax) * UMB_DAMP;
    umbPos.vy = (umbPos.vy + ay) * UMB_DAMP;
    umbPos.x += umbPos.vx;
    umbPos.y += umbPos.vy;
    umbEl.style.transform = "translate3d(" + (umbPos.x - 18) + "px," + (umbPos.y - 48) + "px,0)";

    var hVel = Math.max(-12, Math.min(12, umbPos.vx));
    limbSwayV += (-hVel * 1.8 - limbSway * 0.14);
    limbSwayV *= 0.82;
    limbSway += limbSwayV;
    legSwayV += (-hVel * 2.2 - legSway * 0.12);
    legSwayV *= 0.78;
    legSway += legSwayV;
    var armDeg = Math.max(-25, Math.min(25, limbSway));
    var legDeg = Math.max(-30, Math.min(30, legSway));
    if (umbArms) umbArms.setAttribute("transform", "rotate(" + armDeg + " " + armPivot + ")");
    if (umbLegL) umbLegL.setAttribute("transform", "rotate(" + (legDeg * 0.8) + " " + legPivot + ")");
    if (umbLegR) umbLegR.setAttribute("transform", "rotate(" + (-legDeg * 0.6) + " " + legPivot + ")");
  }

  /* ---- visibility ---- */
  var hidden = false;
  document.addEventListener("visibilitychange", function () { hidden = document.hidden; });

  /* ---- init & loop ---- */
  resize();
  resetBins();
  findColEls();
  navH = (document.querySelector(".navbar") || {}).offsetHeight || 60;
  createEggUI();
  createGuide();

  if (egg.saves > 0 && !egg.football) updateSaveCounter();

  if (egg.football) {
    if (!reduce) setCursor(true);
    applyFootballLayer();
    if (egg.anime) {
      applyAnimeLayer();
      if (egg.business) {
        applyBusinessLayer();
        finalCheck();
      } else {
        setupBusiness();
      }
    } else {
      setupAnime();
    }
  }

  (function loop() {
    if (!hidden && !animeOverlayOpen) { tick(); render(); updateUmb(); }
    requestAnimationFrame(loop);
  })();
})();
