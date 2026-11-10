// Shared by the English and Italian pages. Every visible string lives in the HTML.
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // Remember the language picked with the switch, so the English page stops redirecting.
  var langLink = $('.lang');
  langLink.addEventListener('click', function () {
    try { localStorage.setItem('lang', langLink.hreflang); } catch (e) {}
  });

  // Runs a callback for whichever element crosses the middle of the screen.
  var middle = { rootMargin: '-45% 0px -50% 0px' };

  // Active nav link. The last section can be too short to reach mid-screen,
  // so it activates early and stays active through the end of the page.
  var navLinks = $$('.nav li a');
  var currentSection = null, contactOn = false;
  function paintNav() {
    var id = contactOn ? 'contact' : currentSection;
    navLinks.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + id); });
  }
  var navIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) currentSection = e.target.id;
      else if (currentSection === e.target.id) currentSection = null;
    });
    paintNav();
  }, middle);
  $$('main section:not(#contact)').forEach(function (s) { navIO.observe(s); });
  new IntersectionObserver(function (entries) {
    contactOn = entries[0].isIntersecting;
    paintNav();
  }, { rootMargin: '0px 0px -35% 0px' }).observe($('#contact'));

  // Project stories (Moveax, CineDev): light the chapter in the middle of the screen.
  $$('.story').forEach(function (story) {
    var chapters = $$('.chapter', story), links = $$('.rail a', story);
    story.classList.add('live');
    var storyIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        chapters.forEach(function (c) { c.classList.toggle('on', c === e.target); });
        links.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, middle);
    chapters.forEach(function (c) { storyIO.observe(c); });

    // Rail links center their chapter, so it is the one that lights up on any screen height.
    links.forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        $(a.getAttribute('href')).scrollIntoView({ block: 'center' });
      });
    });
  });

  // CineDev: a viewfinder frames the chapter in the middle of the screen and
  // blinks as it pulls focus to the next one.
  var shotsBox = $('#film-job .shots'), vf = $('#vf'), shots = $$('.chapter', shotsBox);
  var focused = shots[0];
  function frameShot() {
    var box = shotsBox.getBoundingClientRect();
    var top = focused.firstElementChild.getBoundingClientRect().top - box.top;
    var bottom = focused.lastElementChild.getBoundingClientRect().bottom - box.top;
    vf.style.transform = 'translateY(' + (top - 18).toFixed(1) + 'px)';
    vf.style.height = (bottom - top + 36).toFixed(1) + 'px';
  }
  function focusShot(shot) {
    if (shot !== focused) {
      focused = shot;
      vf.classList.remove('hunt');
      void vf.offsetWidth;  // restart the focus-hunt blink
      vf.classList.add('hunt');
    }
    frameShot();
  }
  vf.hidden = false;
  vf.classList.add('on');
  frameShot();
  var shotIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) focusShot(e.target); });
  }, middle);
  shots.forEach(function (s) { shotIO.observe(s); });
  new ResizeObserver(frameShot).observe(shotsBox);

  // Skills and projects light each other: pick a skill to see where it shipped,
  // or a project to see its stack while every other skill goes dark.
  // On wide screens the lit rows already name the projects, so the line above them
  // stays a plain hint. On phones the rows shrink to bare icons, so the line names them.
  var grid = $('#skills-grid'), used = $('#used'), read = $('#used-read'), say = $('#used-say'), more = $('#used-more');
  var items = $$('li', used), skills = $$('[data-uses]', grid), projs = $$('.proj', used);
  var hint = canHover ? read.dataset.hover : read.dataset.tap;
  var iconsOnly = matchMedia('(max-width: 900px)');
  var pinned = null, showing = null;
  used.hidden = false;
  grid.classList.add('live');
  read.textContent = hint;

  function uses(btn) { return btn.dataset.uses.split(' '); }
  function label(btn) { return ($('.nm', btn) || btn).textContent.trim(); }
  function show(el) {
    showing = el;
    var proj = el && el.dataset.p;
    var ids = !el ? [] : proj ? [proj] : uses(el);
    items.forEach(function (li) { li.classList.toggle('lit', ids.indexOf(li.dataset.p) > -1); });
    grid.classList.toggle('focus', !!proj);
    var stack = [];
    skills.forEach(function (b) {
      var hit = !!proj && uses(b).indexOf(proj) > -1;
      b.classList.toggle('hit', hit);
      if (hit) stack.push(label(b));
    });
    var names = items.filter(function (li) { return li.classList.contains('lit'); }).map(function (li) { return li.textContent; });
    var line = !el ? '' : proj ? label(el) + ': ' + stack.join(', ') : label(el) + ': ' + names.join(', ');
    say.textContent = line;
    read.textContent = el && iconsOnly.matches ? (proj ? label(el) : line) : hint;
    more.hidden = !(proj && el === pinned);
    if (!more.hidden) more.href = el.dataset.at;
  }
  iconsOnly.addEventListener('change', function () { show(showing); });
  skills.concat(projs).forEach(function (btn) {
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', function () {
      if (pinned) pinned.setAttribute('aria-pressed', 'false');
      pinned = pinned === btn ? null : btn;
      if (pinned) pinned.setAttribute('aria-pressed', 'true');
      show(pinned);
    });
    btn.addEventListener('focus', function () { if (!pinned) show(btn); });
    btn.addEventListener('blur', function () { if (!pinned) show(null); });
    if (canHover) {
      btn.addEventListener('pointerenter', function () { btn.classList.add('peek'); show(btn); });
      btn.addEventListener('pointerleave', function () { btn.classList.remove('peek'); show(pinned); });
    }
  });
  // Like the rail links: center the chapter so it is the one that lights up.
  more.addEventListener('click', function (e) {
    e.preventDefault();
    $(more.getAttribute('href')).scrollIntoView({ block: 'center' });
  });

  // The plug runs the whole room: pull it and every light on the page goes out.
  var root = document.documentElement, plugBtn = $('#plug'), gloss = $('#gloss');
  var closingLine = $('#closing-line'), replug = $('#replug');
  var glossOn = gloss.innerHTML, closingOn = closingLine.textContent, switchTimer;
  var pullTitle = plugBtn.dataset.pull, replugTitle = replug.textContent;
  var onPower = function () {};  // the cable below hooks in here
  function powerIsOff() { return root.classList.contains('off'); }
  function setPower(on) {
    onPower(on);
    if (!reduce) {
      root.classList.add('switching');
      clearTimeout(switchTimer);
      switchTimer = setTimeout(function () { root.classList.remove('switching'); }, 400);
    }
    root.classList.toggle('off', !on);
    plugBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    plugBtn.title = on ? pullTitle : replugTitle;
    if (on) gloss.innerHTML = glossOn;
    else gloss.textContent = gloss.dataset.off;
    closingLine.textContent = on ? closingOn : closingLine.dataset.off;
    replug.hidden = on;
  }
  plugBtn.disabled = false;
  plugBtn.title = pullTitle;
  plugBtn.addEventListener('click', function () { setPower(powerIsOff()); });
  replug.addEventListener('click', function () { setPower(true); });

  // One wire carries the sign's power down the page. Socket, plug, "Spina", then out
  // of the S, down the left margin past every section, round a corner, into the bulb.
  // Behind the reader it is lit; the spark marks where they are. Reach the end and the
  // circuit closes: the bulb lights and the whole wire stays live.
  var mainEl = $('#main'), cable = $('#cable'), dark = $('.cable-dark', cable), litPath = $('.cable-lit', cable);
  var bulbBox = $('.cable-bulbs', cable), sLetter = $('h1.sign .tube-fire .ch'), heroWrap = $('.hero .wrap');
  var contactEl = $('#contact'), closing = $('#closing-sign'), bulb = $('.bulb');
  var SVGNS = 'http://www.w3.org/2000/svg', STEP = 4, R = 20, WAVE = 320;
  var pts = [], total = 0, cornerLen = 0, bulbs = [], mainTop = 0;
  var closed = false, flow = null, posLen = 0, shown = -1, litBulbs = -1;
  mainEl.classList.add('wired');

  // Where the wire leaves the S: the lower terminal of the letter, at the baseline.
  function sTerminal(m) {
    var r = sLetter.getBoundingClientRect(), fs = parseFloat(getComputedStyle(sLetter).fontSize);
    var probe = document.createElement('i');
    probe.style.cssText = 'display:inline-block;width:0;height:0';
    sLetter.appendChild(probe);
    var base = probe.getBoundingClientRect().top;
    sLetter.removeChild(probe);
    return { x: r.left - m.left + fs * .065, y: base - m.top - fs * .1 };
  }

  // A loose wave, like a cable hung by hand: whole periods only, so every end meets level.
  function waveDown(x, y0, y1) {
    var len = y1 - y0, n = Math.max(1, Math.round(len / WAVE)), per = len / n, d = '', ys = [];
    for (var k = 0; k < n; k++) {
      var y = y0 + k * per;
      d += 'C' + (x + 8) + ' ' + (y + per * .166) + ' ' + (x + 8) + ' ' + (y + per * .334) + ' ' + x + ' ' + (y + per / 2) +
           'S' + (x - 8) + ' ' + (y + per * .834) + ' ' + x + ' ' + (y + per);
      ys.push(y + per / 2);
    }
    return { d: d, bulbs: ys };
  }
  function waveAcross(x0, x1, y) {
    var len = x1 - x0, n = Math.max(1, Math.round(len / WAVE)), per = len / n, d = '';
    for (var k = 0; k < n; k++) {
      var x = x0 + k * per;
      d += 'C' + (x + per * .166) + ' ' + (y + 8) + ' ' + (x + per * .334) + ' ' + (y + 8) + ' ' + (x + per / 2) + ' ' + y +
           'S' + (x + per * .834) + ' ' + (y - 8) + ' ' + (x + per) + ' ' + y;
    }
    return d;
  }

  function layoutCable() {
    var m = mainEl.getBoundingClientRect(), b = bulb.getBoundingClientRect(), wrapCS = getComputedStyle(heroWrap);
    var cx = Math.max(8, heroWrap.getBoundingClientRect().left + parseFloat(wrapCS.paddingLeft) - m.left - 22);
    var s = sTerminal(m), drop = Math.max(24, (s.x - cx) * 1.4), y1 = s.y + drop;
    var runY = b.top - m.top + b.height * (10 / 150), endX = b.left - m.left;
    mainTop = m.top + scrollY;

    var lead = 'M' + s.x + ' ' + s.y + 'C' + (s.x - (s.x - cx) * .6) + ' ' + s.y + ' ' + (cx - 3) + ' ' + (y1 - drop * .55) + ' ' + cx + ' ' + y1;
    var down = waveDown(cx, y1, runY - R);
    var toCorner = lead + down.d + 'Q' + cx + ' ' + runY + ' ' + (cx + R) + ' ' + runY;
    var d = toCorner + waveAcross(cx + R, Math.max(cx + R + 1, endX), runY);

    cable.setAttribute('width', Math.ceil(Math.max(endX, cx) + 40));
    cable.setAttribute('height', Math.ceil(runY + 40));
    dark.setAttribute('d', toCorner);
    cornerLen = dark.getTotalLength();
    dark.setAttribute('d', d);
    litPath.setAttribute('d', d);
    total = dark.getTotalLength();

    pts = [];
    for (var l = 0; l < total; l += STEP) { var p = dark.getPointAtLength(l); pts.push(p.x, p.y); }
    var last = dark.getPointAtLength(total);
    pts.push(last.x, last.y);

    bulbBox.textContent = '';
    bulbs = down.bulbs.map(function (y) {
      var g = document.createElementNS(SVGNS, 'g');
      g.setAttribute('class', 'cb');
      g.setAttribute('transform', 'translate(' + cx + ' ' + y + ')');
      [16, 10, 5].forEach(function (r, i) {
        var c = document.createElementNS(SVGNS, 'circle');
        c.setAttribute('r', r);
        c.setAttribute('class', i < 2 ? 'cb-halo' : 'cb-glass');
        g.appendChild(c);
      });
      bulbBox.appendChild(g);
      return { el: g, at: lengthAtY(y) };
    });
    shown = litBulbs = -1;
  }

  // The wire only ever runs downward until the corner, so a height maps to one length.
  function lengthAtY(y) {
    var n = Math.min(pts.length / 2 - 1, Math.floor(cornerLen / STEP)), lo = 0, hi = n;
    if (!n || y <= pts[1]) return 0;
    if (y >= pts[n * 2 + 1]) return cornerLen;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (pts[mid * 2 + 1] < y) lo = mid; else hi = mid; }
    var ya = pts[lo * 2 + 1], yb = pts[hi * 2 + 1];
    return Math.min(cornerLen, (lo + (yb > ya ? (y - ya) / (yb - ya) : 0)) * STEP);
  }
  function pointAt(len) {
    var f = Math.max(0, Math.min(len, total)) / STEP, i = Math.min(Math.floor(f), pts.length / 2 - 2), t = f - i;
    return { x: pts[i * 2] + (pts[i * 2 + 2] - pts[i * 2]) * t, y: pts[i * 2 + 1] + (pts[i * 2 + 3] - pts[i * 2 + 1]) * t };
  }

  function paintWire(len) {
    if (Math.abs(len - shown) < 1 && len !== total && len !== 0) return;
    shown = len;
    litPath.style.visibility = len > .5 ? 'visible' : 'hidden';
    litPath.style.strokeDasharray = len.toFixed(1) + ' ' + (total + 10).toFixed(0);
    var on = 0;
    while (on < bulbs.length && bulbs[on].at <= len) on++;
    if (on !== litBulbs) {
      bulbs.forEach(function (bb, i) { bb.el.classList.toggle('on', i < on); });
      litBulbs = on;
    }
  }

  function lightBulb() {
    contactEl.classList.remove('waiting');
    closing.classList.remove('wait');
  }

  layoutCable();

  if (reduce) {
    // No travelling current: the circuit is simply live from the S to the bulb.
    closed = true;
    paintWire(total);
    new ResizeObserver(function () { layoutCable(); paintWire(total); }).observe(mainEl);
    return;
  }

  // The bulb and closing sign wait for the current to arrive.
  closing.classList.add('wait');
  contactEl.classList.add('waiting');

  // The spark at the front of the current. It redraws in steps, like real arcing:
  // a quiet crackle while you read, a flare when you scroll.
  var spark = $('#spark'), sc = spark.getContext('2d');
  var SIZE = 180, MID = SIZE / 2, ratio = Math.min(devicePixelRatio || 1, 2);
  var front = { x: 0, y: 0, on: false }, energy = 0, lastPos = null;
  var embers = [], nextCrackle = 0, lastDraw = 0, sparking = false;
  spark.width = spark.height = SIZE * ratio;
  sc.scale(ratio, ratio);
  sc.lineCap = 'round';
  sc.lineJoin = 'round';
  spark.hidden = false;

  function moveSpark(len, on) {
    var p = pointAt(len);
    front.on = on;
    if (!on) return;
    front.x = p.x;
    front.y = p.y;
    spark.style.transform = 'translate3d(' + (p.x - MID).toFixed(1) + 'px,' + (p.y - MID).toFixed(1) + 'px,0)';
    startSpark();
  }

  // Current on the move: after the S strikes, when the plug goes back in, and when the
  // circuit closes. The front eases toward a goal that can keep moving as you scroll.
  function goal() { return closed ? total : posLen; }
  function startFlow(from, delay, minMs, maxMs, done) {
    flow = { from: from, t0: performance.now() + delay, dur: 0, minMs: minMs, maxMs: maxMs, done: done };
    requestAnimationFrame(runFlow);
  }
  function runFlow(now) {
    if (!flow) return;
    if (now < flow.t0) {
      paintWire(flow.from);
      moveSpark(flow.from, false);
      requestAnimationFrame(runFlow);
      return;
    }
    if (!flow.dur) flow.dur = Math.min(flow.maxMs, Math.max(flow.minMs, Math.abs(goal() - flow.from) / 1.2));
    var p = Math.min(1, (now - flow.t0) / flow.dur), e = 1 - Math.pow(1 - p, 3);
    var len = flow.from + (goal() - flow.from) * e;
    energy = Math.max(energy, .8);
    paintWire(len);
    moveSpark(len, len > 0 && len < total - 1);
    if (p < 1) { requestAnimationFrame(runFlow); return; }
    var done = flow.done;
    flow = null;
    if (done) done();
    frame();
  }

  function closeCircuit() {
    closed = true;
    startFlow(Math.max(0, shown), 0, 400, 900, lightBulb);
  }

  onPower = function (on) {
    if (!on) { flow = null; return; }
    // Plugged back in: the sign strikes again, then the current runs out of the S.
    if (closed) {
      contactEl.classList.add('waiting');
      closing.classList.add('wait');
    }
    startFlow(0, 900, 500, 1400, closed ? lightBulb : null);
  };

  function arc(length) {
    var angle = (Math.random() < .5 ? 0 : Math.PI) + (Math.random() - .5) * 1.7;
    var dx = Math.cos(angle), dy = Math.sin(angle), path = new Path2D();
    var steps = 3 + Math.floor(Math.random() * 3);
    path.moveTo(MID, MID);
    for (var i = 1; i <= steps; i++) {
      var t = i / steps, jitter = (Math.random() - .5) * length * .42;
      var x = MID + dx * length * t - dy * jitter, y = MID + dy * length * t + dx * jitter;
      path.lineTo(x, y);
      if (i < steps && Math.random() < .3) {
        var fork = length * .3, forkAngle = angle + (Math.random() - .5) * 2.2;
        path.lineTo(x + Math.cos(forkAngle) * fork, y + Math.sin(forkAngle) * fork);
        path.moveTo(x, y);
      }
    }
    sc.strokeStyle = 'rgba(255, 170, 60, .25)';
    sc.lineWidth = 3;
    sc.stroke(path);
    sc.strokeStyle = '#ffe7b0';
    sc.lineWidth = 1.2;
    sc.stroke(path);
  }

  // The spark only animates while it is lit and on screen; otherwise the loop stops
  // until the current moves again.
  function startSpark() {
    if (sparking) return;
    sparking = true;
    requestAnimationFrame(drawSpark);
  }
  function sparkInView() {
    var y = mainTop + front.y;
    return y > scrollY - SIZE && y < scrollY + innerHeight + SIZE;
  }
  function drawSpark(now) {
    if (!front.on || powerIsOff() || !sparkInView()) {
      sc.clearRect(0, 0, SIZE, SIZE);
      embers.length = 0;
      sparking = false;
      return;
    }
    requestAnimationFrame(drawSpark);
    var dt = now - lastDraw;
    if (dt < 45) return;
    lastDraw = now;
    dt = Math.min(dt, 90);  // after a pause, don't jump the embers
    sc.clearRect(0, 0, SIZE, SIZE);

    energy *= .82;
    if (now > nextCrackle) {
      energy = Math.max(energy, .4 + Math.random() * .25);
      nextCrackle = now + 700 + Math.random() * 1800;
    }
    var reach = front.x < 40 ? 12 : 40;  // phones: stay in the margin, clear of the text

    var radius = 10 + energy * 18;
    var halo = sc.createRadialGradient(MID, MID, 0, MID, MID, radius);
    halo.addColorStop(0, 'rgba(255, 244, 200, 1)');
    halo.addColorStop(.35, 'rgba(255, 170, 60, .5)');
    halo.addColorStop(1, 'rgba(240, 110, 30, 0)');
    sc.globalAlpha = .7 + Math.random() * .3;
    sc.fillStyle = halo;
    sc.beginPath();
    sc.arc(MID, MID, radius, 0, Math.PI * 2);
    sc.fill();
    sc.globalAlpha = 1;

    if (energy > .12) {
      var arcs = 2 + Math.round(energy * 5);
      for (var i = 0; i < arcs; i++) arc(8 + Math.random() * reach * (.4 + .6 * energy));
    }

    if (energy > .3 && Math.random() < energy && embers.length < 24) {
      embers.push({ x: front.x, y: front.y, vx: (Math.random() - .5) * .22, vy: -.12 - Math.random() * .12, life: 1 });
    }
    sc.strokeStyle = '#ffb347';
    sc.lineWidth = 1.4;
    embers = embers.filter(function (e) {
      e.vy += .0007 * dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.life -= dt / 420;
      if (e.life <= 0) return false;
      var ex = e.x - front.x + MID, ey = e.y - front.y + MID;
      sc.globalAlpha = e.life;
      sc.beginPath();
      sc.moveTo(ex, ey);
      sc.lineTo(ex - e.vx * 20, ey - e.vy * 20);
      sc.stroke();
      return true;
    });
    sc.globalAlpha = 1;
  }

  // Scroll-linked: the viewfinder timecode runs and the reading point moves along the wire.
  // Timecode scrubs with the page: one frame per pixel, from 01:00:00:00 like a camera roll.
  var tc = $('#vf-tc');
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function runTimecode(vh) {
    var f = 86400 + Math.max(0, Math.round(scrollY + vh - (shotsBox.getBoundingClientRect().top + scrollY)));
    tc.textContent = pad(Math.floor(f / 86400)) + ':' + pad(Math.floor(f / 1440) % 60) + ':' + pad(Math.floor(f / 24) % 60) + ':' + pad(f % 24);
  }

  var queued = false;
  function frame() {
    queued = false;
    var vh = innerHeight;
    runTimecode(vh);

    posLen = lengthAtY(scrollY + vh * .6 - mainTop);
    if (lastPos !== null) energy = Math.min(1, energy + Math.abs(posLen - lastPos) / 160);
    lastPos = posLen;
    if (flow) return;  // the travelling current paints itself
    paintWire(goal());
    moveSpark(posLen, posLen > 0 && posLen < cornerLen - 1);
    var atBottom = scrollY + vh >= document.documentElement.scrollHeight - 2;
    if (!closed && !powerIsOff() && (posLen >= cornerLen - 1 || atBottom)) closeCircuit();
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(frame); } }
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue, { passive: true });
  function relayout() { layoutCable(); queue(); }  // a running flow repaints itself
  new ResizeObserver(relayout).observe(mainEl);
  if (document.fonts) document.fonts.ready.then(relayout);

  // First light: the plug goes in, the sign strikes, then the current leaves the S.
  startFlow(0, 900, 500, 1400, null);
  frame();
})();
