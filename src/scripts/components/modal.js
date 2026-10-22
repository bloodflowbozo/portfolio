/*!
 * TiltedCard — vanilla JS version (no dependencies)
 *
 * Usage (JS):
 *   const card = new TiltedCard('#my-card', { imageSrc: '...', rotateAmplitude: 22 });
 *
 * Usage (HTML only, auto-init):
 *   <div data-tilted-card data-image-src="..." data-rotate-amplitude="22">
 *     <div data-depth="30">…front layer…</div>
 *     <div data-tc-back>…back content…</div>
 *     <div data-tc-overlay>…overlay…</div>
 *   </div>
 *
 * Children of the host element:
 *   [data-depth]      -> parallax layer (like <TiltedCardLayer depth>)
 *   [data-tc-back]    -> back face content (enables flipping)
 *   [data-tc-overlay] -> floating overlay (shown when displayOverlayContent is true)
 *   anything else     -> placed on the front face as-is
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TiltedCard = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var FLIP_THRESHOLD = 6;

  var DEFAULTS = {
    imageSrc: '',
    altText: 'Tilted card image',
    captionText: '',
    containerHeight: '300px',
    containerWidth: '100%',
    imageHeight: '300px',
    imageWidth: '300px',
    scaleOnHover: 1.05,
    rotateAmplitude: 12,
    showTooltip: true,
    displayOverlayContent: false,
    overlayDepth: 30,
    flipOnClick: false,
    radius: 15,
    perspective: 800,
    smoothness: 0.6,
    glare: 0.5,
    glareColor: '#ffffff',
    shadow: 0.5,
    parallax: 1,
    axis: 'both',
    reverse: false,
    trackWindow: false,
    floating: false,
    gyroscope: true,
    intro: true,
    introDelay: 0,
  };

  // Options that can't come from data-* attributes (or are not simple values)
  var EXTRA_KEYS = [
    'backContent',
    'overlayContent',
    'flipped',
    'onFlip',
    'onClick',
    'className',
    'style',
  ];

  var clamp = function (v, min, max) {
    return Math.min(max, Math.max(min, v));
  };

  var parseColor = function (value) {
    var text = String(value || '').trim();
    var hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text);
    if (hex) {
      var full =
        hex[1].length === 3
          ? hex[1].replace(/./g, function (d) {
              return d + d;
            })
          : hex[1];
      return [0, 2, 4].map(function (i) {
        return parseInt(full.slice(i, i + 2), 16);
      });
    }
    var rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(text);
    if (rgb)
      return [rgb[1], rgb[2], rgb[3]].map(function (c) {
        return clamp(Math.round(parseFloat(c)), 0, 255);
      });
    return null;
  };

  var toLength = function (v) {
    return typeof v === 'number' ? v + 'px' : v;
  };

  var smoother = function (t) {
    var x = clamp(t, 0, 1);
    return x * x * x * (x * (x * 6 - 15) + 10);
  };

  // Damped spring step. Returns true while still moving.
  var step = function (state, key, target, omega, zeta, dt) {
    var velocity = 'v' + key;
    var steps = Math.max(1, Math.ceil(dt / (1 / 240)));
    var h = dt / steps;
    for (var i = 0; i < steps; i++) {
      state[velocity] +=
        (omega * omega * (target - state[key]) -
          2 * zeta * omega * state[velocity]) *
        h;
      state[key] += state[velocity] * h;
    }
    var settled =
      Math.abs(target - state[key]) < 0.001 && Math.abs(state[velocity]) < 0.01;
    if (settled) {
      state[key] = target;
      state[velocity] = 0;
    }
    return !settled;
  };

  var kebab = function (s) {
    return s.replace(/[A-Z]/g, function (m) {
      return '-' + m.toLowerCase();
    });
  };

  // Read options from data-* attributes, coercing by the default's type
  var readData = function (el) {
    var out = {};
    Object.keys(DEFAULTS).forEach(function (key) {
      var raw = el.getAttribute('data-' + kebab(key));
      if (raw == null) return;
      var def = DEFAULTS[key];
      if (typeof def === 'boolean') out[key] = raw !== 'false' && raw !== '0';
      else if (typeof def === 'number') {
        var n = parseFloat(raw);
        if (!isNaN(n)) out[key] = n;
      } else out[key] = raw;
    });
    if (el.hasAttribute('data-flipped')) {
      var f = el.getAttribute('data-flipped');
      out.flipped = f !== 'false' && f !== '0';
    }
    return out;
  };

  var asNode = function (content) {
    if (content == null || content === false) return null;
    if (content instanceof Node) return content;
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;inset:0;';
    wrap.innerHTML = String(content);
    return wrap;
  };

  function TiltedCard(target, options) {
    if (!(this instanceof TiltedCard)) return new TiltedCard(target, options);

    var host =
      typeof target === 'string' ? document.querySelector(target) : target;
    if (!host) throw new Error('TiltedCard: target element not found');
    if (host.__tiltedCard) host.__tiltedCard.destroy();

    var self = this;
    var opts = Object.assign({}, DEFAULTS, readData(host), options || {});
    var innerFlipped = false;

    // ---- collect existing children --------------------------------------
    var frontChildren = [];
    var backNode = null;
    var overlayNode = null;
    Array.prototype.slice.call(host.childNodes).forEach(function (node) {
      if (node.nodeType === 1) {
        if (node.hasAttribute('data-tc-back')) {
          backNode = node;
          return;
        }
        if (node.hasAttribute('data-tc-overlay')) {
          overlayNode = node;
          return;
        }
        if (node.hasAttribute('data-depth')) {
          node.classList.add('tilted-card__layer');
          node.style.setProperty('--tc-depth', node.getAttribute('data-depth'));
        }
        frontChildren.push(node);
      } else if (node.nodeType === 3 && node.textContent.trim()) {
        frontChildren.push(node);
      }
    });
    host.textContent = '';
    if (opts.backContent != null)
      backNode = asNode(opts.backContent) || backNode;
    if (opts.overlayContent != null)
      overlayNode = asNode(opts.overlayContent) || overlayNode;
    if (backNode) {
      backNode.removeAttribute('data-tc-back');
    }
    if (overlayNode) {
      overlayNode.removeAttribute('data-tc-overlay');
    }

    // ---- build DOM -------------------------------------------------------
    var addDecor = function (face) {
      ['glare', 'rim', 'edge'].forEach(function (name) {
        var s = document.createElement('span');
        s.className = 'tilted-card__' + name;
        s.setAttribute('aria-hidden', 'true');
        face.appendChild(s);
      });
    };

    var shadowEl = document.createElement('div');
    shadowEl.className = 'tilted-card__shadow';
    shadowEl.setAttribute('aria-hidden', 'true');

    var body = document.createElement('div');
    body.className = 'tilted-card__body';

    var front = document.createElement('div');
    front.className = 'tilted-card__face tilted-card__front';

    var img = null;
    if (opts.imageSrc) {
      img = document.createElement('img');
      img.className = 'tilted-card__img';
      img.src = opts.imageSrc;
      img.alt = opts.altText;
      img.draggable = false;
      img.style.setProperty('--tc-depth', '-24');
      front.appendChild(img);
    }
    frontChildren.forEach(function (n) {
      front.appendChild(n);
    });
    addDecor(front);
    body.appendChild(front);

    var back = null;
    if (backNode) {
      back = document.createElement('div');
      back.className = 'tilted-card__face tilted-card__back';
      back.appendChild(backNode);
      addDecor(back);
      body.appendChild(back);
    }

    var overlay = null;
    if (overlayNode) {
      overlay = document.createElement('div');
      overlay.className = 'tilted-card__overlay';
      overlay.appendChild(overlayNode);
      body.appendChild(overlay);
    }

    var caption = null;
    if (opts.captionText) {
      caption = document.createElement('div');
      caption.className = 'tilted-card__caption';
      caption.textContent = opts.captionText;
    }

    host.classList.add('tilted-card');
    if (opts.className)
      opts.className.split(/\s+/).forEach(function (c) {
        if (c) host.classList.add(c);
      });
    host.appendChild(shadowEl);
    host.appendChild(body);
    if (caption) host.appendChild(caption);

    // ---- settings --------------------------------------------------------
    var controlled = function () {
      return typeof opts.flipped === 'boolean';
    };
    var isFlipped = function () {
      return Boolean(back) && (controlled() ? opts.flipped : innerFlipped);
    };

    var s = {};
    var computeSettings = function () {
      var flippable = Boolean(back) && opts.flipOnClick;
      s = {
        amplitude: clamp(opts.rotateAmplitude, 0, 60),
        scale: Math.max(0.5, opts.scaleOnHover),
        smoothness: clamp(opts.smoothness, 0, 1),
        glare: clamp(opts.glare, 0, 1),
        shadow: clamp(opts.shadow, 0, 1),
        parallax: Math.max(0, opts.parallax),
        axis: opts.axis,
        reverse: opts.reverse,
        trackWindow: opts.trackWindow,
        floating: opts.floating,
        gyroscope: opts.gyroscope,
        intro: opts.intro,
        introDelay: Math.max(0, opts.introDelay),
        flippable: flippable,
        interactive: flippable || Boolean(opts.onClick),
        flipped: isFlipped(),
        tooltip: opts.showTooltip && Boolean(opts.captionText),
      };
    };

    var applyStatic = function () {
      computeSettings();
      var corner = toLength(opts.radius);
      var glareRgb = (parseColor(opts.glareColor) || [255, 255, 255]).join(
        ', ',
      );
      var bleed =
        Math.ceil(
          Math.sin((clamp(opts.rotateAmplitude, 0, 60) * Math.PI) / 180) *
            24 *
            Math.max(0, opts.parallax),
        ) + 1;

      host.style.width = toLength(opts.containerWidth);
      host.style.height = toLength(opts.containerHeight);
      host.style.perspective = toLength(opts.perspective);
      if (opts.style && typeof opts.style === 'object')
        Object.assign(host.style, opts.style);

      shadowEl.style.width = toLength(opts.imageWidth);
      shadowEl.style.height = toLength(opts.imageHeight);
      shadowEl.style.borderRadius = corner;

      body.style.width = toLength(opts.imageWidth);
      body.style.height = toLength(opts.imageHeight);
      body.style.setProperty('--tc-radius', corner);
      body.style.setProperty('--tc-glare-rgb', glareRgb);

      if (img) {
        img.style.top = '-' + bleed + 'px';
        img.style.left = '-' + bleed + 'px';
        img.style.width = 'calc(100% + ' + bleed * 2 + 'px)';
        img.style.height = 'calc(100% + ' + bleed * 2 + 'px)';
      }
      if (overlay)
        overlay.style.setProperty('--tc-lift', opts.overlayDepth + 'px');
      overlay &&
        (overlay.style.display = opts.displayOverlayContent ? '' : 'none');
      if (caption) caption.style.display = opts.showTooltip ? '' : 'none';

      if (s.interactive) {
        host.setAttribute('data-interactive', '');
        host.tabIndex = 0;
        host.setAttribute('role', 'button');
        host.setAttribute('aria-label', opts.captionText || opts.altText);
      } else {
        host.removeAttribute('data-interactive');
        host.removeAttribute('tabindex');
        host.removeAttribute('role');
        host.removeAttribute('aria-label');
      }
      if (s.flippable) host.setAttribute('aria-pressed', String(isFlipped()));
      else host.removeAttribute('aria-pressed');
      if (isFlipped()) host.setAttribute('data-flipped', '');
      else host.removeAttribute('data-flipped');
      if (back) back.setAttribute('aria-hidden', String(!isFlipped()));
    };
    applyStatic();

    // ---- animation engine -----------------------------------------------
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var coarse = window.matchMedia(
      '(hover: none) and (pointer: coarse)',
    ).matches;
    var state = {
      rx: 0,
      vrx: 0,
      ry: 0,
      vry: 0,
      lift: 0,
      vlift: 0,
      ty: 0,
      vty: 0,
      flip: 0,
      vflip: 0,
      press: 0,
      vpress: 0,
      tip: 0,
      vtip: 0,
      shown: 0,
      vshown: 0,
      tx: 0,
      tyy: 0,
    };
    var pointer = {
      nx: 0,
      ny: 0,
      x: 0,
      y: 0,
      inside: false,
      mouse: false,
      seen: false,
      vx: 0,
      last: 0,
    };
    var press = { active: false, x: 0, y: 0, moved: false };
    var tilt = {
      gamma: 0,
      beta: 0,
      baseGamma: 0,
      baseBeta: 0,
      calibrated: false,
      live: false,
      asked: false,
    };
    var opacity = 1;
    var entered = true;
    var introAt = -1;
    var time = Math.random() * 10;
    var focused = false;
    var raf = 0;
    var last = 0;
    var visible = true;

    if (s.intro && !reduced) {
      entered = false;
      opacity = 0;
      state.rx = 16;
      state.ty = 22;
      body.style.opacity = '0';
    }

    var frame = function (now) {
      raf = 0;
      var dt = clamp((now - last) / 1000 || 0, 0, 0.05);
      last = Math.max(last, now);
      time += dt;
      var busy = false;

      var amplitude = s.amplitude * (reduced ? 0.3 : 1);
      var hovering = pointer.inside && pointer.mouse;
      var touching = press.active && !pointer.mouse;
      var following =
        hovering || touching || (s.trackWindow && pointer.seen && !coarse);
      var inputX = 0;
      var inputY = 0;
      if (following) {
        inputX = pointer.nx;
        inputY = pointer.ny;
      } else if (tilt.live && s.gyroscope) {
        inputX = clamp((tilt.gamma - tilt.baseGamma) / 22, -1, 1);
        inputY = clamp((tilt.beta - tilt.baseBeta) / 22, -1, 1);
        tilt.baseGamma +=
          (tilt.gamma - tilt.baseGamma) * (1 - Math.exp(-dt / 4));
        tilt.baseBeta += (tilt.beta - tilt.baseBeta) * (1 - Math.exp(-dt / 4));
        busy = true;
      } else if (s.floating && !reduced && visible) {
        inputX =
          0.32 * Math.sin(time * 0.62) + 0.12 * Math.sin(time * 1.31 + 0.7);
        inputY =
          0.26 * Math.sin(time * 0.83 + 1.9) + 0.1 * Math.sin(time * 1.57);
        busy = true;
      }
      if (s.axis === 'horizontal') inputY = 0;
      if (s.axis === 'vertical') inputX = 0;
      var sign = s.reverse ? -1 : 1;

      var omega = 20 * Math.pow(0.2, s.smoothness);
      var zeta = 1 - 0.3 * s.smoothness;
      var lifted = hovering || touching || focused ? 1 : 0;

      if (!entered && introAt >= 0 && now >= introAt) entered = true;
      var settle = entered || !s.intro || reduced;
      busy =
        step(
          state,
          'rx',
          settle ? -inputY * amplitude * sign : state.rx,
          omega,
          zeta,
          dt,
        ) || busy;
      busy =
        step(
          state,
          'ry',
          settle ? inputX * amplitude * sign : state.ry,
          omega,
          zeta,
          dt,
        ) || busy;
      busy =
        step(
          state,
          'ty',
          settle
            ? s.floating && !following && !reduced
              ? -4 * Math.sin(time * 0.9)
              : 0
            : state.ty,
          omega * 0.8,
          0.9,
          dt,
        ) || busy;
      busy =
        step(state, 'lift', lifted, omega, Math.max(zeta, 0.85), dt) || busy;
      busy =
        step(
          state,
          'flip',
          s.flipped ? 180 : 0,
          reduced ? 18 : 9.5,
          0.72,
          dt,
        ) || busy;
      busy =
        step(
          state,
          'press',
          press.active && !press.moved && s.interactive ? 1 : 0,
          26,
          0.8,
          dt,
        ) || busy;
      if (settle && opacity < 1) {
        opacity = Math.min(1, opacity + dt / 0.45);
        busy = true;
      }

      var active = lifted > 0 || state.lift > 0.01;
      if (active !== host.hasAttribute('data-active'))
        host.toggleAttribute('data-active', active);
      var scale = 1 + (s.scale - 1) * state.lift - 0.02 * state.press;
      var rx = state.rx;
      var ry = state.ry;
      var radiansX = (rx * Math.PI) / 180;
      var radiansY = (ry * Math.PI) / 180;
      body.style.transform =
        'translate3d(0, ' +
        state.ty.toFixed(2) +
        'px, 0) rotateX(' +
        rx.toFixed(3) +
        'deg) rotateY(' +
        (ry + state.flip).toFixed(3) +
        'deg) scale(' +
        scale.toFixed(4) +
        ')';
      body.style.opacity = opacity < 1 ? smoother(opacity).toFixed(3) : '';
      body.style.setProperty(
        '--tc-px',
        (Math.sin(radiansY) * s.parallax).toFixed(4),
      );
      body.style.setProperty(
        '--tc-py',
        (-Math.sin(radiansX) * s.parallax).toFixed(4),
      );
      var reach = Math.max(amplitude, 1);
      body.style.setProperty(
        '--tc-gx',
        (50 + (ry / reach) * 46).toFixed(2) + '%',
      );
      body.style.setProperty(
        '--tc-gy',
        (50 - (rx / reach) * 46).toFixed(2) + '%',
      );
      var energy = Math.min(1, Math.hypot(rx, ry) / reach);
      body.style.setProperty(
        '--tc-glare',
        (
          s.glare *
          Math.max(state.lift, energy) *
          (opacity < 1 ? smoother(opacity) : 1)
        ).toFixed(3),
      );

      var strength = s.shadow * (opacity < 1 ? smoother(opacity) : 1);
      var offsetX = -Math.sin(radiansY) * 22;
      var offsetY =
        12 + 16 * state.lift + Math.sin(radiansX) * 18 - state.ty * 0.6;
      var turn = Math.abs(Math.cos((state.flip * Math.PI) / 180));
      var spread = scale * (0.86 + 0.04 * state.lift);
      shadowEl.style.transform =
        'translate3d(' +
        offsetX.toFixed(2) +
        'px, ' +
        offsetY.toFixed(2) +
        'px, 0) scale(' +
        (spread * (0.2 + 0.8 * turn)).toFixed(4) +
        ', ' +
        spread.toFixed(4) +
        ')';
      shadowEl.style.opacity = (strength * (0.6 + 0.4 * state.lift)).toFixed(3);

      if (caption) {
        var show = s.tooltip && hovering ? 1 : 0;
        busy = step(state, 'shown', show, 16, 1, dt) || busy;
        var follow = 1 - Math.exp(-dt / 0.035);
        state.tx += (pointer.x - state.tx) * follow;
        state.tyy += (pointer.y - state.tyy) * follow;
        if (
          Math.abs(pointer.x - state.tx) + Math.abs(pointer.y - state.tyy) >
          0.2
        )
          busy = true;
        pointer.vx *= Math.exp(-dt / 0.08);
        busy =
          step(
            state,
            'tip',
            reduced ? 0 : clamp(-pointer.vx * 0.012, -14, 14),
            18,
            0.62,
            dt,
          ) || busy;
        caption.style.transform =
          'translate3d(' +
          state.tx.toFixed(1) +
          'px, ' +
          state.tyy.toFixed(1) +
          'px, 0) rotate(' +
          state.tip.toFixed(2) +
          'deg)';
        caption.style.opacity = Math.max(0, state.shown).toFixed(3);
      }

      if ((busy || (!settle && s.intro)) && visible)
        raf = requestAnimationFrame(frame);
    };

    var wake = function () {
      if (raf || !visible) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    // ---- pointer handling ------------------------------------------------
    var locate = function (event) {
      var rect = host.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height),
      };
    };

    var track = function (event) {
      var spot = locate(event);
      var now = performance.now();
      var elapsed = Math.max(8, now - (pointer.last || now - 16)) / 1000;
      var dx = spot.x - pointer.x;
      pointer.vx += (dx / elapsed - pointer.vx) * 0.5;
      pointer.last = now;
      pointer.x = spot.x;
      pointer.y = spot.y;
      pointer.nx = clamp((spot.x - spot.width / 2) / (spot.width / 2), -1, 1);
      pointer.ny = clamp((spot.y - spot.height / 2) / (spot.height / 2), -1, 1);
    };

    var isMouse = function (e) {
      return e.pointerType === 'mouse' || e.pointerType === 'pen';
    };

    var onEnter = function (event) {
      pointer.inside = true;
      pointer.mouse = isMouse(event);
      var spot = locate(event);
      pointer.x = spot.x;
      pointer.y = spot.y;
      state.tx = spot.x;
      state.tyy = spot.y;
      pointer.vx = 0;
      track(event);
      wake();
    };
    var onMove = function (event) {
      pointer.mouse = isMouse(event);
      if (!pointer.inside && pointer.mouse) {
        pointer.inside = true;
        var spot = locate(event);
        pointer.x = spot.x;
        pointer.y = spot.y;
        state.tx = spot.x;
        state.tyy = spot.y;
        pointer.vx = 0;
      }
      track(event);
      if (
        press.active &&
        Math.hypot(event.clientX - press.x, event.clientY - press.y) >
          FLIP_THRESHOLD
      )
        press.moved = true;
      wake();
    };
    var onLeave = function () {
      pointer.inside = false;
      pointer.vx = 0;
      wake();
    };
    var onWindowMove = function (event) {
      if (pointer.inside && pointer.mouse && !host.contains(event.target))
        onLeave();
      if (!s.trackWindow || pointer.inside) return;
      var rect = host.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      pointer.seen = true;
      pointer.nx = clamp(
        (event.clientX - cx) / Math.max(1, window.innerWidth / 2),
        -1,
        1,
      );
      pointer.ny = clamp(
        (event.clientY - cy) / Math.max(1, window.innerHeight / 2),
        -1,
        1,
      );
      wake();
    };
    var onWindowLeave = function () {
      pointer.seen = false;
      wake();
    };

    var askMotion = function () {
      if (!s.gyroscope || !coarse || tilt.asked) return;
      tilt.asked = true;
      var request =
        window.DeviceOrientationEvent &&
        window.DeviceOrientationEvent.requestPermission;
      if (typeof request === 'function') {
        try {
          var p = request.call(window.DeviceOrientationEvent);
          if (p && p.catch) p.catch(function () {});
        } catch (e) {}
      }
    };

    var onDown = function (event) {
      press.active = true;
      press.moved = false;
      press.x = event.clientX;
      press.y = event.clientY;
      pointer.mouse = isMouse(event);
      if (!pointer.mouse) {
        pointer.inside = true;
        track(event);
      }
      askMotion();
      wake();
    };
    var onUp = function (event) {
      if (!press.active) return;
      press.active = false;
      if (!isMouse(event)) pointer.inside = false;
      wake();
    };
    var onCancel = function () {
      press.active = false;
      press.moved = true;
      pointer.inside = false;
      wake();
    };

    var onOrientation = function (event) {
      if (event.gamma == null || event.beta == null) return;
      tilt.gamma = event.gamma;
      tilt.beta = event.beta;
      if (!tilt.calibrated) {
        tilt.baseGamma = event.gamma;
        tilt.baseBeta = event.beta;
        tilt.calibrated = true;
      }
      tilt.live = coarse;
      wake();
    };

    var onFocus = function () {
      focused = host.matches(':focus-visible');
      wake();
    };
    var onBlur = function () {
      focused = false;
      wake();
    };

    // ---- click / keyboard ------------------------------------------------
    var toggle = function () {
      self.flip(!isFlipped());
    };
    var onClick = function (event) {
      if (!s.interactive) return;
      if (press.moved) return;
      if (s.flippable) toggle();
      if (opts.onClick) opts.onClick(event, self);
    };
    var onKeyDown = function (event) {
      if (
        !s.interactive ||
        event.target !== event.currentTarget ||
        (event.key !== 'Enter' && event.key !== ' ')
      )
        return;
      event.preventDefault();
      if (s.flippable) toggle();
      if (opts.onClick) opts.onClick(event, self);
    };

    host.addEventListener('pointerenter', onEnter);
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerleave', onLeave);
    host.addEventListener('pointerdown', onDown);
    host.addEventListener('focus', onFocus);
    host.addEventListener('blur', onBlur);
    host.addEventListener('click', onClick);
    host.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onCancel, { passive: true });
    window.addEventListener('pointermove', onWindowMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onWindowLeave);
    window.addEventListener('deviceorientation', onOrientation);

    var observer = new IntersectionObserver(function (entries) {
      visible = entries.some(function (e) {
        return e.isIntersecting;
      });
      if (visible && !entered && introAt < 0)
        introAt = performance.now() + s.introDelay;
      wake();
    });
    observer.observe(host);

    wake();

    // ---- public API ------------------------------------------------------
    this.element = host;

    /** Flip to the back (true), front (false), or toggle (undefined). */
    this.flip = function (next) {
      if (!back) return;
      if (typeof next !== 'boolean') next = !isFlipped();
      if (!controlled()) innerFlipped = next;
      else opts.flipped = next;
      applyStatic();
      host.dispatchEvent(
        new CustomEvent('tiltedcard:flip', {
          detail: { flipped: next },
          bubbles: true,
        }),
      );
      if (opts.onFlip) opts.onFlip(next, self);
      wake();
    };

    this.isFlipped = isFlipped;

    /** Replay the entrance animation (call it each time your modal opens). */
    this.replayIntro = function () {
      if (!s.intro || reduced) return;
      entered = false;
      opacity = 0;
      state.rx = 16;
      state.vrx = 0;
      state.ty = 22;
      state.vty = 0;
      introAt = performance.now() + s.introDelay;
      body.style.opacity = '0';
      wake();
    };

    /** Change options at runtime, e.g. card.update({ glare: 1, rotateAmplitude: 30 }) */
    this.update = function (next) {
      next = next || {};
      Object.assign(opts, next);

      if ('imageSrc' in next || 'altText' in next) {
        if (opts.imageSrc && !img) {
          img = document.createElement('img');
          img.className = 'tilted-card__img';
          img.draggable = false;
          img.style.setProperty('--tc-depth', '-24');
          front.insertBefore(img, front.firstChild);
        }
        if (img) {
          if (opts.imageSrc) {
            if (img.getAttribute('src') !== opts.imageSrc)
              img.src = opts.imageSrc;
            img.alt = opts.altText;
            img.style.display = '';
          } else {
            img.style.display = 'none';
          }
        }
      }

      if ('captionText' in next) {
        if (opts.captionText && !caption) {
          caption = document.createElement('div');
          caption.className = 'tilted-card__caption';
          host.appendChild(caption);
        }
        if (caption) caption.textContent = opts.captionText;
      }

      if ('backContent' in next) {
        var node = asNode(opts.backContent);
        if (node && !back) {
          back = document.createElement('div');
          back.className = 'tilted-card__face tilted-card__back';
          back.appendChild(node);
          addDecor(back);
          body.insertBefore(back, overlay || null);
          backNode = node;
        } else if (node && back) {
          back.replaceChild(node, backNode);
          backNode = node;
        } else if (!node && back) {
          // Remove the back face entirely
          innerFlipped = false;
          if (controlled()) opts.flipped = false;
          back.parentNode.removeChild(back);
          back = null;
          backNode = null;
        }
      }

      if ('overlayContent' in next) {
        var onode = asNode(opts.overlayContent);
        if (onode && !overlay) {
          overlay = document.createElement('div');
          overlay.className = 'tilted-card__overlay';
          overlay.appendChild(onode);
          body.appendChild(overlay);
          overlayNode = onode;
        } else if (onode && overlay) {
          overlay.replaceChild(onode, overlayNode);
          overlayNode = onode;
        } else if (!onode && overlay) {
          overlay.parentNode.removeChild(overlay);
          overlay = null;
          overlayNode = null;
        }
      }

      applyStatic();
      wake();
    };

    /**
     * Swap the card's content in one call (handy for a modal reused with many items).
     * Preloads the image first so there is no blank flash, and flips back to the front.
     *   card.setContent({ imageSrc, altText, captionText, backContent })
     * Returns a Promise that resolves once the new image is showing.
     */
    this.setContent = function (content) {
      content = content || {};
      var rest = Object.assign({}, content);
      var src = rest.imageSrc;
      delete rest.imageSrc;
      if (isFlipped()) self.flip(false);
      self.update(rest);
      if (!src) return Promise.resolve();
      return new Promise(function (resolve) {
        var loader = new Image();
        var done = function () {
          self.update({
            imageSrc: src,
            altText: rest.altText != null ? rest.altText : opts.altText,
          });
          resolve();
        };
        loader.onload = done;
        loader.onerror = done;
        loader.src = src;
      });
    };

    this.destroy = function () {
      cancelAnimationFrame(raf);
      observer.disconnect();
      host.removeEventListener('pointerenter', onEnter);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      host.removeEventListener('pointerdown', onDown);
      host.removeEventListener('focus', onFocus);
      host.removeEventListener('blur', onBlur);
      host.removeEventListener('click', onClick);
      host.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('pointermove', onWindowMove);
      document.documentElement.removeEventListener(
        'pointerleave',
        onWindowLeave,
      );
      window.removeEventListener('deviceorientation', onOrientation);
      delete host.__tiltedCard;
    };

    host.__tiltedCard = this;
  }

  /** Initialise every [data-tilted-card] element in the page (or inside `scope`). */
  TiltedCard.init = function (scope) {
    var list = (scope || document).querySelectorAll('[data-tilted-card]');
    return Array.prototype.map.call(list, function (el) {
      return el.__tiltedCard || new TiltedCard(el);
    });
  };

  TiltedCard.defaults = DEFAULTS;

  if (typeof document !== 'undefined') {
    var auto = function () {
      TiltedCard.init();
    };
    if (document.readyState === 'loading')
      document.addEventListener('DOMContentLoaded', auto);
    else auto();
  }

  return TiltedCard;
});

//////////////////////////////////////////////

//modal

//////////////////////////////////////////////

const images = document.querySelectorAll('.modal-img');
const Modal = document.querySelector('.modal');
const image = Modal.querySelector('.tilted-card');

const card = new TiltedCard('#card', {
  imageSrc: '',
  altText: 'Tilted card image',
  captionText: '',
  containerHeight: '100%',
  containerWidth: '100%',
  imageHeight: '100%',
  imageWidth: 'auto',
  scaleOnHover: 1.2,
  rotateAmplitude: 12,
  showTooltip: true,
  displayOverlayContent: false,
  overlayDepth: 30,
  flipOnClick: false,
  radius: 15,
  perspective: 800,
  smoothness: 0.6,
  glare: 0.5,
  glareColor: '#ffffff',
  shadow: 0.5,
  parallax: 1,
  axis: 'both',
  reverse: false,
  trackWindow: false,
  floating: false,
  gyroscope: true,
  intro: true,
  introDelay: 5,
});

for (let i = 0; i < images.length; i++) {
  const image = images[i];

  image.addEventListener('click', function () {
    OpenModal(this);
  });
}
Modal.addEventListener('click', function () {
  Modal.classList.remove('visible');
});

function OpenModal(img) {
  card.setContent({
    imageSrc: img.src,
    altText: img.alt,
  });
  card.replayIntro(); // optional: replays the entrance animation
  Modal.classList.add('visible');
}

function closeModal() {
  Modal.classList.remove('visible');
  card = null;
}
