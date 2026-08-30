(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- scan line: walks the full page height, tied to scroll, trailing a comet tail ---- */
  var scanline = document.getElementById("dm-scanline");
  var scanTrail1 = document.getElementById("dm-scanline-trail-1");
  var scanTrail2 = document.getElementById("dm-scanline-trail-2");
  function positionScanline() {
    var doc = document.documentElement;
    var scrollTop = window.scrollY || doc.scrollTop;
    var max = (doc.scrollHeight || document.body.scrollHeight) - window.innerHeight;
    var progress = max > 0 ? scrollTop / max : 0;
    var y = progress * (doc.scrollHeight - 2);
    var t = "translateY(" + y + "px)";
    scanline.style.transform = t;
    if (scanTrail1) scanTrail1.style.transform = t;
    if (scanTrail2) scanTrail2.style.transform = t;
  }
  window.addEventListener("scroll", positionScanline, { passive: true });
  window.addEventListener("resize", positionScanline);
  positionScanline();

  /* ---- focus rows as the scan line crosses them ---- */
  var focusTargets = document.querySelectorAll(".timeline-wrapper, .project-card");
  if ("IntersectionObserver" in window && focusTargets.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          entry.target.classList.toggle("is-active", entry.isIntersecting);
        });
      },
      { threshold: 0.4, rootMargin: "-10% 0px -10% 0px" }
    );
    focusTargets.forEach(function (el) { io.observe(el); });
  } else {
    focusTargets.forEach(function (el) { el.classList.add("is-active"); });
  }

  /* ---- skills table: one-time terminal-print entrance, then stays fully visible ---- */
  var skillsTable = document.querySelector(".dm-skills-table");
  if (skillsTable && "IntersectionObserver" in window) {
    var printed = false;
    var skillsIo = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !printed) {
            printed = true;
            skillsTable.classList.add("is-printed");
            skillsIo.unobserve(skillsTable);
          }
        });
      },
      { threshold: 0.15 }
    );
    skillsIo.observe(skillsTable);
  } else if (skillsTable) {
    skillsTable.classList.add("is-printed");
  }

  /* ---- interactive dot fields: canvas-based with cursor reactivity ---- */
  var fieldSections = document.querySelectorAll("[data-dm-field]");
  var activeFields = [];
  if (fieldSections.length) {
    fieldSections.forEach(function (section) {
      var density = section.getAttribute("data-dm-field");
      var spacing = density === "dense" ? 48 : density === "sparse" ? 72 : 96;

      var fieldCanvas = document.createElement("canvas");
      fieldCanvas.classList.add("dm-field-bg");
      fieldCanvas.setAttribute("aria-hidden", "true");
      section.insertBefore(fieldCanvas, section.firstChild);

      var fctx = fieldCanvas.getContext("2d");
      var fdpr = Math.min(window.devicePixelRatio || 1, 2);
      var dots = [];
      var fPointer = { x: -9999, y: -9999, active: false };
      var fLerp = { x: -9999, y: -9999, strength: 0 };
      var visible = false;

      section.addEventListener("pointermove", function (e) {
        var rect = fieldCanvas.getBoundingClientRect();
        fPointer.x = e.clientX - rect.left;
        fPointer.y = e.clientY - rect.top;
        fPointer.active = true;
      });
      section.addEventListener("pointerleave", function () { fPointer.active = false; });

      function hashStr(s) { var h = 0; for (var i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return h; }

      function initDots() {
        dots = [];
        var fw = fieldCanvas.clientWidth;
        var fh = fieldCanvas.clientHeight;
        if (!fw || !fh) return;
        fieldCanvas.width = fw * fdpr;
        fieldCanvas.height = fh * fdpr;
        fctx.setTransform(fdpr, 0, 0, fdpr, 0, 0);

        var cx = fw / 2, cy = fh / 2;
        var maxR = Math.sqrt(cx * cx + cy * cy);
        var localRand = mulberry32(hashStr(section.id || "dm"));

        for (var y = spacing / 2; y < fh; y += spacing) {
          for (var x = spacing / 2; x < fw; x += spacing) {
            var sineY = Math.sin(x * 0.008) * 18;
            var jx = (localRand() - 0.5) * spacing * 0.5;
            var jy = (localRand() - 0.5) * spacing * 0.5;
            var px = x + jx, py = y + sineY + jy;

            var d = Math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy));
            if (localRand() > (1 - (d / maxR) * 0.5) * 0.65) continue;

            dots.push({
              x: px, y: py,
              baseR: 3,
              baseOpacity: 0.25 + localRand() * 0.25,
              isAccent: localRand() < 0.1
            });
          }
        }
      }

      var field = { canvas: fieldCanvas, ctx: fctx, dots: dots, pointer: fPointer, lerp: fLerp, visible: visible, initDots: initDots };
      activeFields.push(field);

      if ("IntersectionObserver" in window) {
        var fio = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) { field.visible = entry.isIntersecting; });
        }, { threshold: 0 });
        fio.observe(section);
      } else {
        field.visible = true;
      }

      initDots();
      field.dots = dots;

      function drawDots() {
        if (!field.visible && field.lerp.strength < 0.01) return;
        var fw = fieldCanvas.clientWidth;
        var fh = fieldCanvas.clientHeight;
        fctx.clearRect(0, 0, fw, fh);

        fLerp.strength += ((fPointer.active ? 1 : 0) - fLerp.strength) * 0.06;
        fLerp.x += (fPointer.x - fLerp.x) * 0.12;
        fLerp.y += (fPointer.y - fLerp.y) * 0.12;

        var fg = getComputedStyle(document.documentElement).getPropertyValue("--dm-fg").trim() || "#f5f5f2";
        var accent = getComputedStyle(document.documentElement).getPropertyValue("--dm-accent").trim() || "#2bf0b0";
        var hasPointer = fLerp.strength > 0.01;

        for (var i = 0; i < dots.length; i++) {
          var dot = dots[i];
          var r = dot.baseR;
          var opacity = dot.baseOpacity;

          if (hasPointer) {
            var dx = dot.x - fLerp.x;
            var dy = dot.y - fLerp.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            var falloff = Math.exp(-(dist * dist) / (180 * 180)) * fLerp.strength;
            r += 3.5 * falloff;
            opacity = Math.min(1, opacity + 0.65 * falloff);
          }

          fctx.globalAlpha = opacity;
          fctx.fillStyle = dot.isAccent ? accent : fg;
          fctx.beginPath();
          fctx.arc(dot.x, dot.y, r, 0, 6.283);
          fctx.fill();
        }
        fctx.globalAlpha = 1;
      }

      if (reduceMotion) {
        drawDots();
      }
      field.draw = drawDots;

      window.addEventListener("resize", function () {
        initDots();
        field.dots = dots;
        if (reduceMotion) drawDots();
      });
    });

    if (!reduceMotion) {
      (function tickFields() {
        for (var i = 0; i < activeFields.length; i++) activeFields[i].draw();
        requestAnimationFrame(tickFields);
      })();
    }
  }

  /* ---- contact sine trace ---- */
  var contactEl = document.getElementById("contact");
  if (contactEl) {
    var svgNS2 = "http://www.w3.org/2000/svg";
    var traceSvg = document.createElementNS(svgNS2, "svg");
    traceSvg.setAttribute("viewBox", "0 0 1440 50");
    traceSvg.setAttribute("preserveAspectRatio", "none");
    traceSvg.setAttribute("aria-hidden", "true");
    traceSvg.classList.add("dm-sine-trace");
    var pathD = "M0,25";
    for (var tx = 0; tx <= 1440; tx += 4) {
      pathD += " L" + tx + "," + (25 + Math.sin(tx * 0.01) * 18).toFixed(1);
    }
    var tracePath = document.createElementNS(svgNS2, "path");
    tracePath.setAttribute("d", pathD);
    tracePath.setAttribute("fill", "none");
    tracePath.setAttribute("stroke", "currentColor");
    tracePath.setAttribute("stroke-width", "1.2");
    tracePath.setAttribute("opacity", "0.25");
    traceSvg.appendChild(tracePath);
    contactEl.insertBefore(traceSvg, contactEl.firstChild);
  }

  /* ---- hero data field: barcode columns + one sine curve ---- */
  var canvas = document.getElementById("dm-field");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var w, h, cols, seed;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function resize() {
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var rand = mulberry32(42);
    var colWidth = 6;
    cols = [];
    for (var x = 0; x < w; x += colWidth) {
      cols.push({ x: x, on: rand() > 0.5, height: 0.1 + rand() * 0.9 });
    }
  }

  function drawStill() {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(245,245,242,0.5)";
    cols.forEach(function (c) {
      if (!c.on) return;
      var barH = h * c.height * 0.5;
      ctx.fillRect(c.x, h - barH, 4, barH);
    });
    drawSine(0, 0);
  }

  function drawSine(t, bend) {
    var accent = getComputedStyle(document.documentElement).getPropertyValue("--dm-accent").trim() || "#2bf0b0";
    ctx.beginPath();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    for (var x = 0; x <= w; x += 4) {
      var y = h * 0.5 + Math.sin(x * 0.012 + t) * (h * 0.12);
      if (bend) y += bend.amount * Math.exp(-Math.pow((x - bend.x) / 350, 2));
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  /* ---- cursor reactivity: the field senses the pointer, springs back when it leaves ---- */
  var pointer = { x: -9999, y: -9999, active: false };
  var pointerLerp = { x: -9999, active: false, strength: 0 };
  if (!reduceMotion) {
    canvas.addEventListener("pointermove", function (e) {
      var rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    });
    canvas.addEventListener("pointerleave", function () { pointer.active = false; });
  }

  var t0 = 0;
  function frame() {
    ctx.clearRect(0, 0, w, h);

    /* spring the tracked pointer strength toward 1 when active, 0 when not */
    pointerLerp.strength += ((pointer.active ? 1 : 0) - pointerLerp.strength) * 0.12;
    pointerLerp.x += (pointer.x - pointerLerp.x) * 0.18;

    ctx.fillStyle = "rgba(245,245,242,0.45)";
    cols.forEach(function (c, i) {
      var flicker = Math.sin(t0 * 0.4 + i * 0.6) > 0.85;
      var falloff = 0;
      if (pointerLerp.strength > 0.01) {
        var d = Math.abs(c.x - pointerLerp.x);
        falloff = Math.exp(-(d * d) / (280 * 280)) * pointerLerp.strength;
      }
      if (!(c.on || flicker || falloff > 0.04)) return;
      var barH = h * c.height * 0.5 + h * 0.5 * falloff;
      ctx.fillRect(c.x, h - barH, 4, barH);
    });

    var bend = null;
    if (pointerLerp.strength > 0.01) {
      bend = { x: pointerLerp.x, amount: -h * 0.25 * pointerLerp.strength };
    }
    drawSine(t0, bend);
    t0 += 0.012;
    raf = requestAnimationFrame(frame);
  }

  var raf;
  window.addEventListener("resize", function () {
    resize();
    if (reduceMotion) drawStill();
  });
  resize();
  if (reduceMotion) {
    drawStill();
  } else {
    raf = requestAnimationFrame(frame);
  }
})();
