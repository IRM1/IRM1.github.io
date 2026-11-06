// Scroll-reveal animations and project filters. No dependencies.

(function () {
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }

  // Count stat numbers up once when they scroll into view
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nums = document.querySelectorAll('.stat .num');
  if (!reduce && 'IntersectionObserver' in window) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        co.unobserve(e.target);
        var el = e.target, text = el.textContent.trim();
        var target = parseFloat(text), decimals = (text.split('.')[1] || '').length;
        var start = null, dur = 1100;
        function step(t) {
          if (start === null) start = t;
          var k = Math.min((t - start) / dur, 1), eased = 1 - Math.pow(1 - k, 3);
          el.textContent = (target * eased).toFixed(decimals);
          if (k < 1) requestAnimationFrame(step); else el.textContent = text;
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    nums.forEach(function (n) { co.observe(n); });
  }

  var buttons = document.querySelectorAll('.filters button');
  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      buttons.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var f = btn.getAttribute('data-filter');
      document.querySelectorAll('.card').forEach(function (card) {
        var show = f === 'all' || card.getAttribute('data-kind') === f;
        card.classList.toggle('hidden', !show);
        if (show) card.classList.add('in');
      });
    });
  });
})();

// ---------- Ladder logic power flow ----------
// On load the PAGE_LOAD bit closes and SITE_ON energizes. Power then travels down a
// left-hand rail as the visitor scrolls, lighting each section's rung, and energizes
// the CONTACT_ME coil when it reaches the end of the page.
(function () {
  var rung0 = document.getElementById('rung0');
  var coil = document.getElementById('endCoil');
  if (!rung0 || !coil) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(cls) { var d = document.createElement('div'); d.className = cls; return d; }

  // Always open at the top: don't let the browser restore an old scroll position on reload
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  function jumpToTop() {
    var root = document.documentElement, prev = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    root.style.scrollBehavior = prev;
  }

  var layer = el('power');
  layer.setAttribute('aria-hidden', 'true');
  var rail = el('rail'), fill = el('rail-fill'), head = el('head');
  rail.appendChild(fill); rail.appendChild(head);
  var topStub = el('stub'), topNode = el('node'), tail = el('tail'), endNode = el('node');
  [rail, topStub, topNode, tail, endNode].forEach(function (n) { layer.appendChild(n); });

  var kickers = [].slice.call(document.querySelectorAll('main section:not(#contact) .kicker'));
  var endKicker = document.querySelector('#contact .kicker');
  var OTE = '<svg viewBox="0 0 36 16" aria-hidden="true"><path d="M0 8H11M25 8H36"/><path d="M13 1q-5 7 0 14M23 1q5 7 0 14"/><circle cx="18" cy="8" r="4"/></svg>';
  function addOte(k) {
    var o = document.createElement('span');
    o.className = 'ote';
    o.innerHTML = OTE;
    k.insertBefore(o, k.firstChild);
  }
  kickers.forEach(addOte);
  if (endKicker) addOte(endKicker);
  var endSection = document.getElementById('contact');
  if (endSection) endSection.setAttribute('data-rung', '');
  var rungs = kickers.map(function (k) {
    var s = el('stub'), n = el('node');
    layer.appendChild(s); layer.appendChild(n);
    var sec = k.closest('section');
    if (sec) sec.setAttribute('data-rung', '');
    return { kicker: k, section: sec, stub: s, node: n, y: 0 };
  });
  document.body.style.position = 'relative';
  document.body.appendChild(layer);

  // Document position of an element, ignoring the scroll-reveal slide-in offset
  function docRect(e) {
    var r = e.getBoundingClientRect(), ty = 0, a = e.closest ? e.closest('.reveal') : null;
    if (a) {
      var t = getComputedStyle(a).transform;
      if (t && t !== 'none') ty = new DOMMatrix(t).m42;
    }
    return { top: r.top + window.scrollY - ty, left: r.left + window.scrollX, width: r.width, height: r.height };
  }

  function place(n, x, y, w) {
    n.style.left = x + 'px'; n.style.top = y + 'px';
    if (w !== undefined) n.style.width = Math.max(0, w) + 'px';
  }

  var y0 = 0, yEnd = 0, len = 1, powered = false, coilTimer = null;

  function geometry() {
    var wrap = document.querySelector('.hero .wrap');
    var pad = parseFloat(getComputedStyle(wrap).paddingLeft);
    var contentLeft = docRect(wrap).left + pad;
    var railX = Math.round(contentLeft - Math.min(28, pad - 8));

    var r0 = docRect(rung0);
    y0 = Math.round(r0.top + r0.height * (34 / 52));
    var c = docRect(coil.querySelector('svg'));
    yEnd = Math.round(c.top + c.height / 2);
    len = Math.max(1, yEnd - y0);

    rail.style.left = (railX - 1) + 'px';
    rail.style.top = y0 + 'px';
    rail.style.height = len + 'px';
    place(topStub, railX, y0 - 1, r0.left - railX);
    place(topNode, railX, y0);
    place(tail, railX, yEnd - 1, c.left - railX);
    place(endNode, railX, yEnd);

    rungs.forEach(function (r) {
      var k = docRect(r.kicker);
      r.y = Math.round(k.top + k.height / 2);
      place(r.stub, railX, r.y - 1, k.left - railX - 10);
      place(r.node, railX, r.y);
    });
    layer.style.height = document.documentElement.scrollHeight + 'px';
  }

  function update() {
    var p = 0;
    if (powered) {
      var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      var fy = window.scrollY + window.innerHeight * 0.85;
      if (window.scrollY >= maxScroll - 2) fy = yEnd;
      p = Math.min(1, Math.max(0, (fy - y0) / len));
    }
    var reach = y0 + p * len;
    fill.style.transform = 'scaleY(' + p + ')';
    head.style.transform = 'translateY(' + (p * len - 4) + 'px)';
    rungs.forEach(function (r) {
      var lit = powered && reach >= r.y - 1;
      r.stub.classList.toggle('lit', lit);
      r.node.classList.toggle('lit', lit);
      r.kicker.classList.toggle('lit', lit);
      if (r.section) r.section.classList.toggle('energized', lit);
    });
    var done = powered && p >= 0.999;
    layer.classList.toggle('live', powered && p > 0);
    layer.classList.toggle('done', done);
    tail.classList.toggle('lit', done);
    endNode.classList.toggle('lit', done);
    if (done && !coil.classList.contains('on') && !coilTimer) {
      coilTimer = setTimeout(function () {
        coilTimer = null;
        if (tail.classList.contains('lit')) {
          coil.classList.add('on');
          if (endKicker) endKicker.classList.add('lit');
          if (endSection) endSection.classList.add('energized');
          coil.querySelector('.coil-state').textContent = 'ENERGIZED';
        }
      }, reduce ? 0 : 380);
    } else if (!done) {
      if (coilTimer) { clearTimeout(coilTimer); coilTimer = null; }
      coil.classList.remove('on');
      if (endKicker) endKicker.classList.remove('lit');
      if (endSection) endSection.classList.remove('energized');
      coil.querySelector('.coil-state').textContent = 'OFF';
    }
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; update(); });
  }
  function relayout() { geometry(); update(); }

  geometry();
  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', relayout);
  window.addEventListener('load', relayout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(document.body);

  function powerUp() {
    rung0.classList.add('on');
    topStub.classList.add('lit');
    topNode.classList.add('lit');
  }

  // ---- START pushbutton: the site stays de-energized until it is pressed ----
  var started = false, KEY = 'mir-powered';
  var remembered = false;
  try { remembered = sessionStorage.getItem(KEY) === '1'; } catch (e) {}

  function energize(delay) {
    setTimeout(function () {
      document.body.classList.add('powered');   // the page behind switches on
      setTimeout(powerUp, reduce ? 0 : 400);    // then PAGE_LOAD closes
      setTimeout(function () {
        if (!reduce) fill.style.transition = head.style.transition = 'transform 1s ease';
        powered = true; update();
        if (!reduce) setTimeout(function () { fill.style.transition = head.style.transition = 'transform 0.12s linear'; }, 1000);
      }, reduce ? 0 : 850);
    }, delay);
  }

  function start() {
    if (started) return;
    started = true;
    try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
    ['wheel', 'touchmove', 'keydown', 'click'].forEach(function (t) { window.removeEventListener(t, startFromIntent, true); });
    if (gate) {
      gate.classList.add('pressed');
      gate.querySelector('.gate-status-text').textContent = 'SYSTEM RUN';
      setTimeout(function () {
        gate.classList.add('gone');
        document.documentElement.classList.remove('gate-open');
      }, reduce ? 0 : 450);
      setTimeout(function () { if (gate.parentNode) gate.parentNode.removeChild(gate); }, reduce ? 0 : 1300);
    }
    energize(reduce ? 0 : (gate ? 1000 : 250));
  }

  // Any scroll intent or click also starts the system, so nobody is stuck on a dark page
  function startFromIntent(e) {
    if (e.type === 'keydown' && ['ArrowDown', 'PageDown', ' ', 'End', 'Enter'].indexOf(e.key) === -1) return;
    start();
  }

  var gate = null;
  if (remembered) {
    if (!location.hash) jumpToTop();
    else {
      // Returning to a section (e.g. "All projects"): scroll there ourselves once layout is ready
      var goTo = function () {
        var t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (!t) return;
        var root = document.documentElement, prev = root.style.scrollBehavior;
        root.style.scrollBehavior = 'auto';
        t.scrollIntoView();
        root.style.scrollBehavior = prev;
      };
      goTo();
      if (document.readyState === 'complete') setTimeout(goTo, 0);
      else window.addEventListener('load', goTo);
    }
    started = true;
    energize(reduce ? 0 : 1200);
  } else {
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    jumpToTop();
    window.addEventListener('load', function () { if (!started) jumpToTop(); });
    gate = el('power-gate');
    gate.innerHTML =
      '<div class="gate-panel">' +
        '<span class="screw tl"></span><span class="screw tr"></span><span class="screw bl"></span><span class="screw br"></span>' +
        '<div class="gate-status"><span class="gate-led"></span><span class="gate-status-text">SYSTEM OFF</span></div>' +
        '<button type="button" class="start-pb" aria-label="Press start to power on the site"><span class="pb-cap"></span></button>' +
        '<div class="legend">START</div>' +
        '<p class="gate-hint">Press to energize, or just scroll</p>' +
      '</div>';
    document.body.appendChild(gate);
    document.documentElement.classList.add('gate-open');
    gate.querySelector('.start-pb').addEventListener('click', function (e) { e.stopPropagation(); start(); });
    ['wheel', 'touchmove', 'keydown', 'click'].forEach(function (t) { window.addEventListener(t, startFromIntent, { capture: true, passive: true }); });
    setTimeout(function () { gate.classList.add('ready'); }, 30);
    try { gate.querySelector('.start-pb').focus({ preventScroll: true }); } catch (e) {}
  }
})();
