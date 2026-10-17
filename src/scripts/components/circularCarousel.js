/*!
 * CircularCarousel — vanilla JS port of the React Bits <CircularCarousel /> component.
 * No dependencies. Pair it with circular-carousel.css. title
 *
 * Declarative usage (auto-init, no JS to write):
 *   <link rel="stylesheet" href="circular-carousel.css">
 *   <div data-component="CircularCarousel" data-preset="panorama" data-captions style="height:560px">
 *     <img src="a.jpg" alt="…" data-title="…" data-subtitle="…">
 *     <img src="b.jpg" alt="…" data-title="…" data-subtitle="…">
 *   </div>
 *   <script src="circular-carousel.js"></script>
 *
 *   - Options are data attributes in kebab-case: data-card-width="320", data-aspect-ratio="1.333",
 *     data-pause-on-hover="false", data-fade-color="#000000"… (same names as the JS options).
 *     Boolean options: the bare attribute means true, "false" or "0" means false.
 *   - Items come from the child <img> tags (alt, data-title, data-subtitle), or from
 *     data-items='[{"src":"a.jpg","alt":"…","title":"…","subtitle":"…"}]'.
 *   - The element needs a height; if it has none, 560px is applied.
 *   - The instance is available as element.circularCarousel.
 *   - Events on the element: "circularcarousel:change" (detail.index) and
 *     "circularcarousel:itemclick" (detail.item, detail.index).
 *   - For elements added later: CircularCarousel.init(parentElement).
 *
 * Programmatic usage:
 *   const carousel = new CircularCarousel('#carousel', { items: [...], preset: 'panorama' });
 *   Methods: next(), prev(), goTo(index), getActive(), update(options), destroy()
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * for data to be accessed by the script : around line 976
 * 
 * to modify the captions/tittle : _syncCaption
 * 
 * 
 * to modify the counter : _setDigits
 * 
 * for carouse paramets : line 75
 * 
 * 
 * 
 */
(function (global, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else global.CircularCarousel = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const photo = id => 'https://images.unsplash.com/' + id + '?w=900&q=80&auto=format&fit=max&sat=-100';

  const DEFAULT_ITEMS = [
    { src: photo('photo-1506744038136-46273834b3fb'), alt: 'Mist drifting through a mountain valley', title: 'Valley', subtitle: 'Landscape', link: '#'},
    { src: photo('photo-1524504388940-b1c1722653e1'), alt: 'A woman with long hair in soft studio light', title: 'Portrait', subtitle: 'Studio', link: '#' },
    { src: photo('photo-1486406146926-c627a92ad1ab'), alt: 'Glass towers seen from street level', title: 'Towers', subtitle: 'Architecture', link: '#' },
    { src: photo('photo-1502680390469-be75c86b636f'), alt: 'A surfer carving inside a breaking wave', title: 'Swell', subtitle: 'Ocean', link: '#' },
    { src: photo('photo-1487958449943-2429e8be8625'), alt: 'An angular white building against the sky', title: 'Facade', subtitle: 'Architecture', link: '#' },
    { src: photo('photo-1509631179647-0177331693ae'), alt: 'A model in striped trousers leaning on a wall', title: 'Pose', subtitle: 'Editorial', link: '#' },
    { src: photo('photo-1519681393784-d120267933ba'), alt: 'The Milky Way above snowy peaks', title: 'Night', subtitle: 'Sky', link: '#' },
    { src: photo('photo-1485968579580-b6d095142e6e'), alt: 'A woman in a long coat on a city street', title: 'Street', subtitle: 'Editorial', link: '#' },
    { src: photo('photo-1493246507139-91e8fad9978e'), alt: 'Mountains mirrored in a still lake', title: 'Mirror', subtitle: 'Landscape', link: '#' },
    { src: photo('photo-1511818966892-d7d671e672a2'), alt: 'A glass skyscraper under a cloudy sky', title: 'Glass', subtitle: 'Architecture', link: '#' }
  ];

  const PRESETS = {
    cylinder: { axis: 'y', tilt: -5, perspective: 2500, curve: 1, spread: 1, inward: false, billboard: false, backfaces: true, window: 0 },
    orbit: { axis: 'y', tilt: -16, perspective: 1500, curve: 0, spread: 1.45, inward: false, billboard: true, backfaces: false, window: 0 },
    wheel: { axis: 'x', tilt: 0, perspective: 1800, curve: 0, spread: 1, inward: false, billboard: false, backfaces: true, window: 1.7 },
    panorama: { axis: 'y', tilt: 0, perspective: 0, curve: 1, spread: 1, inward: true, billboard: false, backfaces: false, window: 0 }
  };

  const DEFAULTS = {
    items: null,
    preset: 'panorama',
    intro: 'rise', // 'rise' | 'assemble' | 'spin' | 'none'
    cardWidth: 300,
    aspectRatio: 1.33,
    gap: 25,
    curve: 1,
    tilt: 0,
    perspective: 1800,
    autoplay: 'step', // 'drift' | 'step' | 'off'
    speed: 6,
    interval: 3,
    direction: 'right',
    draggable: true,
    momentum: 0.6,
    snap: true,
    pauseOnHover: true,
    focusOnClick: true,
    parallax: 0.3,
    stretch: 0.49,
    depthFade: 0.55,
    fadeColor: '#000000',
    innerShade: 0.54,
    cornerRadius: 9,
    captions: false,
    className: '',
    onChange: null, // (index) => void
    onItemClick: null // (item, index) => void
  };

  const INTRO_LENGTH = { assemble: 1500, rise: 1400, spin: 1800, none: 0 };
  const TILES = 8;
  const OVERLAP = 2.5;
  const DRAG_THRESHOLD = 5;
  const SPRING = 118;
  const SETTLE_SPEED = 9;
  const CAPTION_SPACE = 76;
  const TO_RAD = Math.PI / 180;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const wrap = degrees => ((((degrees + 180) % 360) + 360) % 360) - 180;
  const easeOut = t => 1 - Math.pow(1 - t, 4);
  const easeOutQuint = t => 1 - Math.pow(1 - t, 5);

  const rotateX = (p, degrees) => {
    const r = degrees * TO_RAD;
    const c = Math.cos(r);
    const s = Math.sin(r);
    return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
  };

  const rotateY = (p, degrees) => {
    const r = degrees * TO_RAD;
    const c = Math.cos(r);
    const s = Math.sin(r);
    return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
  };

  const el = (tag, className, attrs) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (attrs) for (const key in attrs) node.setAttribute(key, attrs[key]);
    return node;
  };

  class CircularCarousel {
    constructor(container, options) {
      const target = typeof container === 'string' ? document.querySelector(container) : container;
      if (!target) throw new Error('CircularCarousel: container not found');
      this.container = target;
      this.options = Object.assign({}, DEFAULTS, options || {});
      this.destroyed = false;
      this.ready = false;
      this.active = 0;
      this._loadToken = 0;
      this._itemsKey = '';
      this._dirSign = null;
      this.cardEls = [];

      this.state = {
        angle: 0, velocity: 0, target: null, dir: 0, press: null, drag: false, hover: false,
        pointer: { inside: false, x: 0, y: 0 }, yaw: 0, pitch: 0, intro: null, introDone: false,
        holdUntil: 0, stepAt: 0, suppressClick: false, wheelTimer: 0, fit: 1, shift: 0, drop: 0, last: 0
      };

      const query = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
      this._motionQuery = query;
      this.reduced = query ? query.matches : false;
      this._onMotionChange = () => {
        this.reduced = this._motionQuery.matches;
        this._settings();
        this._wake();
      };
      if (query && query.addEventListener) query.addEventListener('change', this._onMotionChange);

      this._buildRoot();
      this._configure();
      this._applyRootAttrs();
      this._buildCards();
      this._syncCaption(true);
      this._engine();
      this._bind();
      this._load();
    }

    /* ---------- public API ---------- */

    next() { this._stepBy(1); }
    prev() { this._stepBy(-1); }
    goTo(index) { this._focusIndex(clamp(index, 0, this.g.count - 1)); }
    getActive() { return this.active; }

    update(options) {
      const prevKey = this._itemsKey;
      const prevCount = this.g.count;
      Object.assign(this.options, options || {});
      this._configure();
      this._applyRootAttrs();
      this._buildCards();
      if (this.g.count !== prevCount) {
        this.state.angle = 0;
        this.state.target = null;
        this.state.velocity = 0;
        this.active = 0;
      }
      this._syncCaption(true);
      this._measure();
      if (this._itemsKey !== prevKey) this._load();
      this._wake();
    }

    destroy() {
      if (this.destroyed) return;
      this.destroyed = true;
      this._loadToken++;
      cancelAnimationFrame(this._raf);
      clearTimeout(this.state.wheelTimer);
      if (this._resizeObs) this._resizeObs.disconnect();
      if (this._intersectObs) this._intersectObs.disconnect();
      document.removeEventListener('visibilitychange', this._onVisibility);
      if (this._motionQuery && this._motionQuery.removeEventListener) {
        this._motionQuery.removeEventListener('change', this._onMotionChange);
      }
      if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
    }

    /* ---------- configuration ---------- */

    _configure() {
      const o = this.options;
      const list = o.items && o.items.length ? o.items : DEFAULT_ITEMS;
      this.list = list;
      this._itemsKey = list.map(item => item.src).join('|');

      const count = list.length;
      const shape = PRESETS[o.preset] ? o.preset : 'cylinder';
      const layout = PRESETS[shape];
      const axis = layout.axis;
      const tiltValue = o.tilt != null ? o.tilt : layout.tilt;
      const curveValue = layout.billboard ? 0 : clamp(o.curve != null ? o.curve : layout.curve, 0, 1);
      const cardW = Math.max(40, o.cardWidth);
      const cardH = cardW / clamp(o.aspectRatio, 0.2, 5);
      const along = axis === 'x' ? cardH : cardW;
      const step = 360 / count;

      const n = Math.max(count, 3);
      const pitch = (along + o.gap) * layout.spread;
      const chord = pitch / (2 * Math.sin(Math.PI / n));
      const arc = (n * pitch) / (2 * Math.PI);
      const radius = Math.max(chord + (arc - chord) * curveValue, along * 0.6);

      const total = curveValue > 0.001 ? TILES : 1;
      const length = along / total;
      const bend = curveValue > 0.001 ? radius / curveValue : 0;
      const tiles = [];
      for (let index = 0; index < total; index++) {
        const start = index * length - (index > 0 ? OVERLAP / 2 : 0);
        const end = (index + 1) * length + (index < total - 1 ? OVERLAP / 2 : 0);
        const center = (start + end) / 2 - along / 2;
        const alpha = bend ? center / bend : 0;
        const shift = bend ? bend * Math.sin(alpha) : center;
        const sink = bend ? bend * (1 - Math.cos(alpha)) : 0;
        const depth = layout.inward ? sink : -sink;
        const turn = ((layout.inward ? -alpha : alpha) * 180) / Math.PI;
        const move = axis === 'x'
          ? 'translate3d(0px, ' + shift + 'px, ' + depth + 'px) rotateX(' + -turn + 'deg)'
          : 'translate3d(' + shift + 'px, 0px, ' + depth + 'px) rotateY(' + turn + 'deg)';
        tiles.push({ index, total, start, end, size: end - start, move });
      }

      this.g = { count, shape, layout, axis, tiltValue, curveValue, cardW, cardH, along, step, radius, tiles };
      this._settings();

      const dragSign = layout.inward ? -1 : 1;
      const directionSign = (o.direction === 'right' ? 1 : -1) * dragSign;
      if (directionSign !== this._dirSign) {
        this._dirSign = directionSign;
        this.state.dir = directionSign;
      }
    }

    _settings() {
      const o = this.options;
      const g = this.g;
      const r = this.reduced;
      this.s = {
        count: g.count,
        step: g.step,
        radius: g.radius,
        layout: g.layout,
        axis: g.axis,
        tilt: g.tiltValue,
        perspective: g.layout.inward ? g.radius : (o.perspective != null ? o.perspective : g.layout.perspective),
        cardW: g.cardW,
        cardH: g.cardH,
        intro: r ? 'none' : (o.intro in INTRO_LENGTH ? o.intro : 'rise'),
        autoplay: r ? 'off' : o.autoplay,
        speed: o.speed,
        interval: Math.max(0.5, o.interval),
        draggable: o.draggable,
        momentum: clamp(o.momentum, 0, 1),
        snap: o.snap,
        pauseOnHover: o.pauseOnHover,
        parallax: r ? 0 : clamp(o.parallax, 0, 1),
        stretch: r ? 0 : clamp(o.stretch, 0, 1),
        depthFade: clamp(o.depthFade, 0, 1),
        captions: o.captions,
        reduced: r
      };
    }

    /* ---------- DOM ---------- */

    _buildRoot() {
      const root = el('div', 'circular-carousel', {
        role: 'region',
        'aria-roledescription': 'carousel',
        'aria-label': 'Image carousel',
        tabindex: '0'
      });
      const view = el('div', 'circular-carousel__view');
      this.stage = el('div', 'circular-carousel__stage');
      this.camera = el('div', 'circular-carousel__camera');
      this.ring = el('div', 'circular-carousel__ring');
      this.camera.appendChild(this.ring);
      this.stage.appendChild(this.camera);
      view.appendChild(this.stage);
      root.appendChild(view);

      this.live = el('div', 'circular-carousel__live', { 'aria-live': 'polite', 'aria-atomic': 'true' });
      root.appendChild(this.live);

      this.root = root;
      this.container.appendChild(root);
    }

    _applyRootAttrs() {
      const o = this.options;
      const root = this.root;
      root.className = ('circular-carousel ' + (o.className || '')).trim();
      root.setAttribute('data-axis', this.g.axis);
      root.setAttribute('data-shape', this.g.shape);
      if (o.draggable) root.setAttribute('data-draggable', '');
      else root.removeAttribute('data-draggable');
      if (this.ready) root.setAttribute('data-ready', '');
      root.style.setProperty('--cc-fade', o.fadeColor);
      root.style.setProperty('--cc-radius', Math.max(0, o.cornerRadius) + 'px');
      root.style.setProperty('--cc-inner', (1 - clamp(o.innerShade, 0, 1)).toFixed(3));
    }

    _buildCards() {
      const g = this.g;
      while (this.ring.firstChild) this.ring.removeChild(this.ring.firstChild);
      this.cardEls = [];
      this.list.forEach((item, index) => {
        const card = el('div', 'circular-carousel__card', {
          'data-cc-index': String(index),
          role: 'group',
          'aria-roledescription': 'slide',
          'aria-label': (item.title || item.alt || 'Image ' + (index + 1)) + ', ' + (index + 1) + ' of ' + g.count
        });
        g.tiles.forEach(tile => card.appendChild(this._tile(item, tile, false)));
        if (g.layout.backfaces) g.tiles.forEach(tile => card.appendChild(this._tile(item, tile, true)));
        this.ring.appendChild(card);
        this.cardEls.push(card);
      });
    }

    _tile(item, tile, back) {
      const g = this.g;
      const axis = g.axis;
      const strip = back ? tile.total - 1 - tile.index : tile.index;
      const first = strip === 0;
      const last = strip === tile.total - 1;
      const r = 'var(--cc-radius)';
      const frameRadius = axis === 'x'
        ? [first ? r : '0', first ? r : '0', last ? r : '0', last ? r : '0'].join(' ')
        : [first ? r : '0', last ? r : '0', last ? r : '0', first ? r : '0'].join(' ');
      const offset = back ? g.along - tile.end : tile.start;
      const size = tile.size;

      const node = el('div', 'circular-carousel__tile', { 'aria-hidden': 'true' });
      if (axis === 'x') {
        node.style.left = -g.cardW / 2 + 'px';
        node.style.top = -size / 2 + 'px';
        node.style.width = g.cardW + 'px';
        node.style.height = size + 'px';
      } else {
        node.style.left = -size / 2 + 'px';
        node.style.top = -g.cardH / 2 + 'px';
        node.style.width = size + 'px';
        node.style.height = g.cardH + 'px';
      }
      node.style.transform = tile.move + (back ? (axis === 'x' ? ' rotateX(180deg)' : ' rotateY(180deg)') : '');

      const frame = el('div', 'circular-carousel__frame');
      frame.style.height = (axis === 'x' ? size : g.cardH) + 'px';
      frame.style.borderRadius = frameRadius;

      const img = el('img', 'circular-carousel__photo', { alt: '', decoding: 'async', draggable: 'false' });
      img.src = item.src;
      if (axis === 'x') {
        img.style.left = '0px';
        img.style.top = -offset + 'px';
      } else {
        img.style.left = -offset + 'px';
        img.style.top = '0px';
      }
      img.style.width = g.cardW + 'px';
      img.style.height = g.cardH + 'px';
      frame.appendChild(img);

      if (back) frame.appendChild(el('div', 'circular-carousel__inner'));
      frame.appendChild(el('div', 'circular-carousel__shade'));
      node.appendChild(frame);
      return node;
    }

    _syncCaption(rebuild) {
      const count = this.g.count;
      const current = this.list[this.active] || this.list[0];
      const label = current ? current.title || current.alt || 'Image ' + (this.active + 1) : '';
      this.live.textContent = label + ', ' + (this.active + 1) + ' of ' + count;

      if (!this.options.captions || !current) {
        if (this.caption) {
          this.root.removeChild(this.caption);
          this.caption = null;
        }
        return;
      }

      if (rebuild && this.caption) {
        this.root.removeChild(this.caption);
        this.caption = null;
      }
      if (!this.caption) {
        const caption = el('div', 'circular-carousel__caption', { 'aria-hidden': 'true' });
        this._titleEl = null;
        const counter = el('span', 'circular-carousel__count');
        this._digits = el('span', 'circular-carousel__digits');
        this._digitReels = [];
        const slash = el('span', 'circular-carousel__slash');
        slash.textContent = '/';
        const total = el('span');
        total.textContent = String(count).padStart(2, '0');
        counter.appendChild(this._digits);
        counter.appendChild(slash);
        counter.appendChild(total);
        caption.appendChild(counter);
        this.root.insertBefore(caption, this.live);
        this.caption = caption;
        this._counter = counter;
      }

      const title = el('span', 'circular-carousel__title');
      const name = el('span', 'circular-carousel__name');

      name.textContent = current.title || current.alt || '';
      title.appendChild(name);
      if (current.subtitle) {
        const subtitle = el('span', 'circular-carousel__subtitle light');
        subtitle.textContent = current.subtitle;
        title.appendChild(subtitle);
      }
      if (this._titleEl) this.caption.replaceChild(title, this._titleEl);
      else this.caption.insertBefore(title, this._counter);
      this._titleEl = title;

      const section = this.container.parentElement;
      const bouton = section.querySelector(".bouton")
      console.log(current);
      bouton.href = current.link;

      this._setDigits(this.active + 1);


    }

    _setDigits(value) {
      const str = String(value).padStart(2, '0');
      if (this._digitReels.length !== str.length) {
        while (this._digits.firstChild) this._digits.removeChild(this._digits.firstChild);
        this._digitReels = [];
        for (let i = 0; i < str.length; i++) {
          const digit = el('span', 'circular-carousel__digit');
          const reel = el('span', 'circular-carousel__reel');
          for (let n = 0; n < 10; n++) {
            const cell = el('span');
            cell.textContent = String(n);
            reel.appendChild(cell);
          }
          digit.appendChild(reel);
          this._digits.appendChild(digit);
          this._digitReels.push(reel);
        }
      }
      str.split('').forEach((d, i) => {
        this._digitReels[i].style.transform = 'translateY(' + -Number(d) * 10 + '%)';
      });
    }

    /* ---------- image loading ---------- */

    _load() {
      const token = ++this._loadToken;
      this.ready = false;
      this.root.removeAttribute('data-ready');
      const sources = this.list.slice(0, 16).map(item => item.src);
      const load = src =>
        new Promise(resolve => {
          const image = new Image();
          image.decoding = 'async';
          image.onload = () => (image.decode ? image.decode().then(resolve, resolve) : resolve());
          image.onerror = resolve;
          image.src = src;
        });
      const timeout = new Promise(resolve => setTimeout(resolve, 2400));
      Promise.race([Promise.all(sources.map(load)), timeout]).then(() => {
        if (this.destroyed || token !== this._loadToken) return;
        this.state.introDone = false;
        this.state.intro = null;
        this.ready = true;
        this.root.setAttribute('data-ready', '');
        this._wake();
      });
    }

    /* ---------- animation engine ---------- */

    _engine() {
      const self = this;
      const state = this.state;
      const root = this.root;
      const stage = this.stage;
      const camera = this.camera;
      const ring = this.ring;
      let raf = 0;
      let visible = true;

      const nearest = angle => Math.round(angle / self.s.step) * self.s.step;

      const measure = () => {
        const s = self.s;
        const rect = root.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const room = s.captions ? CAPTION_SPACE : 0;
        const width = rect.width * 0.94;
        const height = (rect.height - room) * 0.92;
        const P = s.perspective;
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        if (s.layout.inward) {
          minX = -width / 2;
          maxX = width / 2;
          minY = -s.cardH / 2;
          maxY = s.cardH / 2;
        } else {
          const corners = [
            [-s.cardW / 2, -s.cardH / 2],
            [s.cardW / 2, -s.cardH / 2],
            [-s.cardW / 2, s.cardH / 2],
            [s.cardW / 2, s.cardH / 2]
          ];
          const limit = s.layout.window ? s.layout.window * s.step : 180;
          for (let a = -limit; a <= limit; a += limit / 24) {
            for (let k = 0; k < corners.length; k++) {
              const cx = corners[k][0];
              const cy = corners[k][1];
              let p;
              if (s.axis === 'x') {
                p = rotateY(rotateX([cx, cy, s.radius], -a), s.tilt);
              } else if (s.layout.billboard) {
                const c = rotateY([0, 0, s.radius], a);
                p = rotateX([c[0] + cx, cy, c[2]], s.tilt);
              } else {
                p = rotateX(rotateY([cx, cy, s.radius], a), s.tilt);
              }
              p = [p[0], p[1], p[2] - s.radius];
              if (p[2] >= P * 0.95) continue;
              const scale = P / (P - p[2]);
              minX = Math.min(minX, p[0] * scale);
              maxX = Math.max(maxX, p[0] * scale);
              minY = Math.min(minY, p[1] * scale);
              maxY = Math.max(maxY, p[1] * scale);
            }
          }
        }
        const spanX = Math.max(maxX - minX, 1);
        const spanY = Math.max(maxY - minY, 1);
        const fit = Math.min(1, width / spanX, height / spanY);
        state.fit = fit;
        state.shift = -((minY + maxY) / 2) * fit - room / 2;
        state.drop = s.axis === 'x' ? (rect.width / fit) * 0.55 + s.cardW : (rect.height / fit) * 0.55 + s.cardH;
        stage.style.perspective = P + 'px';
        stage.style.transform = 'translate3d(0, ' + state.shift + 'px, 0) scale(' + fit + ')';
      };
      this._measure = measure;

      const introCard = (elapsed, landing) => {
        if (!state.intro) return { radius: 1, lift: 0 };
        const type = state.intro.type;
        const reach = Math.abs(wrap(landing + state.angle));
        if (type === 'assemble') {
          const delay = (reach / 180) * 420;
          const p = easeOut(clamp((elapsed - delay) / 1080, 0, 1));
          return { radius: 1 + 0.6 * (1 - p), lift: 0 };
        }
        if (type === 'rise') {
          const delay = (reach / 180) * 480;
          const p = easeOutQuint(clamp((elapsed - delay) / 900, 0, 1));
          return { radius: 1, lift: (1 - p) * state.drop };
        }
        if (type === 'spin') {
          const p = easeOut(clamp(elapsed / INTRO_LENGTH.spin, 0, 1));
          return { radius: 1 + 0.28 * (1 - p), lift: 0 };
        }
        return { radius: 1, lift: 0 };
      };

      const advance = (s, dt, now) => {
        if (!state.introDone && self.ready) {
          if (!state.intro) {
            if (s.intro === 'none') state.introDone = true;
            else state.intro = { type: s.intro, start: now };
          }
          if (state.intro && now - state.intro.start >= INTRO_LENGTH[state.intro.type]) {
            state.intro = null;
            state.introDone = true;
          }
        }

        const paused = (s.pauseOnHover && state.hover) || state.drag || now < state.holdUntil;
        const cruise = s.autoplay === 'drift' && !paused && !state.intro ? s.speed * state.dir : 0;
        let busy = Boolean(state.intro) || state.drag;

        if (state.drag || state.intro) {
          state.velocity = state.drag ? state.velocity : 0;
        } else if (state.target !== null) {
          let remaining = dt;
          const damping = 2 * Math.sqrt(SPRING);
          while (remaining > 0) {
            const h = Math.min(remaining, 1 / 240);
            const accel = SPRING * (state.target - state.angle) - damping * state.velocity;
            state.velocity += accel * h;
            state.angle += state.velocity * h;
            remaining -= h;
          }
          if (Math.abs(state.target - state.angle) < 0.004 && Math.abs(state.velocity) < 0.03) {
            state.angle = state.target;
            state.velocity = 0;
            state.target = null;
          }
          busy = true;
        } else {
          const tau = 0.18 + s.momentum * 1.5;
          state.velocity += (cruise - state.velocity) * (1 - Math.exp(-dt / tau));
          state.angle += state.velocity * dt;
          if (cruise === 0 && s.snap && Math.abs(state.velocity) < SETTLE_SPEED) {
            state.target = nearest(state.angle);
          }
          busy = busy || cruise !== 0 || Math.abs(state.velocity) > 0.01 || state.target !== null;
        }

        if (s.autoplay === 'step' && !paused && !state.intro && state.introDone) {
          if (!state.stepAt) state.stepAt = now + s.interval * 1000;
          if (now >= state.stepAt) {
            state.target = (state.target !== null ? state.target : nearest(state.angle)) + s.step * state.dir;
            state.stepAt = now + s.interval * 1000;
          }
          busy = true;
        } else {
          state.stepAt = 0;
        }

        if (now < state.holdUntil) busy = true;

        const ease = 1 - Math.exp(-dt / 0.35);
        const aimYaw = state.pointer.inside ? state.pointer.x * s.parallax * 9 : 0;
        const aimPitch = state.pointer.inside ? -state.pointer.y * s.parallax * 6 : 0;
        state.yaw += (aimYaw - state.yaw) * ease;
        state.pitch += (aimPitch - state.pitch) * ease;
        if (Math.abs(aimYaw - state.yaw) > 0.01 || Math.abs(aimPitch - state.pitch) > 0.01) busy = true;

        return busy;
      };

      const render = (s, now) => {
        const elapsed = state.intro ? now - state.intro.start : 0;
        const swell = 1 + s.stretch * 0.12 * Math.min(1, Math.abs(state.velocity) / 420);
        let spinOffset = 0;
        if (state.intro && state.intro.type === 'spin') {
          const p = easeOut(clamp(elapsed / INTRO_LENGTH.spin, 0, 1));
          spinOffset = -300 * state.dir * (1 - p);
        } else if (state.intro && state.intro.type === 'assemble') {
          const p = easeOut(clamp(elapsed / INTRO_LENGTH.assemble, 0, 1));
          spinOffset = -32 * state.dir * (1 - p);
        }
        const angle = state.angle + spinOffset;
        const R = s.radius * swell;

        if (s.axis === 'x') {
          camera.style.transform = 'translate3d(0, 0, ' + -R + 'px) rotateY(' + (s.tilt + state.yaw) + 'deg) rotateX(' + state.pitch + 'deg)';
          ring.style.transform = 'rotateX(' + -angle + 'deg)';
        } else if (s.layout.inward) {
          camera.style.transform = 'translate3d(0, 0, ' + (s.perspective - 1) + 'px) rotateX(' + (s.tilt + state.pitch) + 'deg) rotateY(' + state.yaw + 'deg)';
          ring.style.transform = 'rotateY(' + angle + 'deg)';
        } else {
          camera.style.transform = 'translate3d(0, 0, ' + -R + 'px) rotateX(' + (s.tilt + state.pitch) + 'deg) rotateY(' + state.yaw + 'deg)';
          ring.style.transform = 'rotateY(' + angle + 'deg)';
        }

        for (let index = 0; index < s.count; index++) {
          const card = self.cardEls[index];
          if (!card) continue;
          const base = index * s.step;
          const mod = introCard(elapsed, base);
          const r = R * mod.radius;
          let transform;
          if (s.axis === 'x') {
            transform = 'rotateX(' + -base + 'deg) translateZ(' + r + 'px)';
          } else if (s.layout.inward) {
            transform = 'rotateY(' + base + 'deg) translateZ(' + -r + 'px)';
          } else {
            transform = 'rotateY(' + base + 'deg) translateZ(' + r + 'px)';
            if (s.layout.billboard) transform += ' rotateY(' + -(base + angle) + 'deg)';
          }
          if (mod.lift) transform += s.axis === 'x' ? ' translateX(' + mod.lift + 'px)' : ' translateY(' + mod.lift + 'px)';
          card.style.transform = transform;

          const world = wrap(base + angle);
          const facing = Math.cos(world * TO_RAD);
          if (s.layout.inward) card.style.visibility = Math.abs(world) > 86 ? 'hidden' : '';
          const fade = s.depthFade * Math.pow((1 - facing) / 2, 1.25);
          card.style.setProperty('--cc-depth', fade.toFixed(3));
        }

        const index = ((Math.round(-state.angle / s.step) % s.count) + s.count) % s.count || 0;
        if (index !== self.active) {
          self.active = index;
          self._syncCaption(false);
          if (typeof self.options.onChange === 'function') self.options.onChange(index);
        }
      };

      const frame = now => {
        raf = 0;
        self._raf = 0;
        const dt = state.last ? Math.min((now - state.last) / 1000, 0.05) : 1 / 60;
        state.last = now;
        const busy = advance(self.s, dt, now);
        render(self.s, now);
        if (busy && visible && !document.hidden) {
          raf = requestAnimationFrame(frame);
          self._raf = raf;
        } else state.last = 0;
      };

      const wake = () => {
        if (self.destroyed) return;
        if (!raf && visible && !document.hidden) {
          raf = requestAnimationFrame(frame);
          self._raf = raf;
        }
      };
      this._wake = wake;

      this._onVisibility = () => {
        if (document.hidden) {
          cancelAnimationFrame(raf);
          raf = 0;
          state.last = 0;
        } else wake();
      };
      document.addEventListener('visibilitychange', this._onVisibility);

      this._resizeObs = new ResizeObserver(() => {
        measure();
        wake();
      });
      this._resizeObs.observe(root);

      this._intersectObs = new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        if (visible) wake();
        else {
          cancelAnimationFrame(raf);
          raf = 0;
          state.last = 0;
        }
      });
      this._intersectObs.observe(root);

      this._onWheel = event => {
        const s = self.s;
        if (!s.draggable) return;
        const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : 0;
        if (!delta) return;
        event.preventDefault();
        const sign = s.layout.inward ? -1 : 1;
        const perPixel = 180 / (Math.PI * s.radius * state.fit);
        state.target = null;
        state.angle -= delta * perPixel * sign;
        state.velocity = -delta * perPixel * sign * 30;
        state.holdUntil = performance.now() + 1600;
        clearTimeout(state.wheelTimer);
        state.wheelTimer = setTimeout(() => {
          if (self.s.snap) state.target = nearest(state.angle + state.velocity * 0.12);
          wake();
        }, 140);
        wake();
      };
      root.addEventListener('wheel', this._onWheel, { passive: false });

      measure();
      render(this.s, performance.now());
      wake();
    }

    /* ---------- interaction ---------- */

    _focusIndex(index) {
      const state = this.state;
      let target = -index * this.s.step;
      target += 360 * Math.round((state.angle - target) / 360);
      state.target = target;
      state.holdUntil = performance.now() + 2800;
      this._wake();
    }

    _stepBy(delta) {
      const state = this.state;
      const s = this.s;
      const base = state.target !== null ? state.target : Math.round(state.angle / s.step) * s.step;
      state.target = base - delta * s.step * (s.layout.inward ? -1 : 1);
      state.holdUntil = performance.now() + 2800;
      this._wake();
    }

    _bind() {
      const self = this;
      const root = this.root;
      const state = this.state;

      const updatePointer = event => {
        const rect = root.getBoundingClientRect();
        state.pointer.x = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
        state.pointer.y = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
      };

      root.addEventListener('pointerdown', event => {
        state.suppressClick = false;
        if (!self.s.draggable || event.button !== 0) return;
        state.press = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          angle: state.angle,
          moved: false,
          origin: 0,
          samples: [{ time: performance.now(), angle: state.angle }]
        };
      });

      root.addEventListener('pointermove', event => {
        if (event.pointerType === 'mouse') {
          state.pointer.inside = true;
          updatePointer(event);
        }
        const press = state.press;
        if (!press || press.id !== event.pointerId) {
          self._wake();
          return;
        }
        const s = self.s;
        const delta = s.axis === 'x' ? event.clientY - press.y : event.clientX - press.x;
        const cross = s.axis === 'x' ? event.clientX - press.x : event.clientY - press.y;
        if (!press.moved) {
          if (Math.abs(delta) < DRAG_THRESHOLD) return;
          if (Math.abs(cross) > Math.abs(delta) * 1.2 && event.pointerType !== 'mouse') {
            state.press = null;
            return;
          }
          press.moved = true;
          press.origin = delta;
          state.drag = true;
          state.target = null;
          state.velocity = 0;
          root.setAttribute('data-dragging', '');
          try {
            root.setPointerCapture(event.pointerId);
          } catch (e) {}
        }
        const perPixel = 180 / (Math.PI * s.radius * state.fit);
        state.angle = press.angle + (delta - press.origin) * perPixel * (s.layout.inward ? -1 : 1);
        const now = performance.now();
        press.samples.push({ time: now, angle: state.angle });
        while (press.samples.length > 2 && now - press.samples[0].time > 110) press.samples.shift();
        self._wake();
      });

      const release = event => {
        const press = state.press;
        if (!press || press.id !== event.pointerId) return;
        state.press = null;
        if (!press.moved) return;
        state.drag = false;
        root.removeAttribute('data-dragging');
        state.suppressClick = true;
        const s = self.s;
        const first = press.samples[0];
        const last = press.samples[press.samples.length - 1];
        const span = (last.time - first.time) / 1000;
        const velocity = span > 0.008 ? clamp((last.angle - first.angle) / span, -1400, 1400) : 0;
        state.velocity = velocity;
        if (Math.abs(velocity) > 60) state.dir = Math.sign(velocity);
        const coasting = s.autoplay === 'drift' && !(s.pauseOnHover && state.hover && event.pointerType === 'mouse');
        if (s.snap && !coasting) {
          const tau = 0.18 + s.momentum * 1.5;
          state.target = Math.round((state.angle + velocity * tau * 0.55) / s.step) * s.step;
        }
        self._wake();
      };
      root.addEventListener('pointerup', release);
      root.addEventListener('pointercancel', release);

      root.addEventListener('pointerenter', event => {
        if (event.pointerType !== 'mouse') return;
        state.hover = true;
        self._wake();
      });

      root.addEventListener('pointerleave', event => {
        if (event.pointerType === 'mouse') {
          state.hover = false;
          state.pointer.inside = false;
        }
        self._wake();
      });

      root.addEventListener('click', event => {
        if (state.suppressClick) {
          state.suppressClick = false;
          return;
        }
        const card = event.target.closest ? event.target.closest('[data-cc-index]') : null;
        if (!card) return;
        const index = Number(card.getAttribute('data-cc-index'));
        if (self.options.focusOnClick) self._focusIndex(index);
        if (typeof self.options.onItemClick === 'function') self.options.onItemClick(self.list[index], index);
      });

      root.addEventListener('keydown', event => {
        const axis = self.g.axis;
        const forward = axis === 'x' ? 'ArrowDown' : 'ArrowRight';
        const backward = axis === 'x' ? 'ArrowUp' : 'ArrowLeft';
        if (event.key === forward) self._stepBy(1);
        else if (event.key === backward) self._stepBy(-1);
        else if (event.key === 'Home') self._focusIndex(0);
        else if (event.key === 'End') self._focusIndex(self.g.count - 1);
        else if (event.key === 'Enter' || event.key === ' ') {
          if (typeof self.options.onItemClick === 'function') self.options.onItemClick(self.list[self.active], self.active);
        } else return;
        event.preventDefault();
      });
    }
  }

  CircularCarousel.DEFAULT_ITEMS = DEFAULT_ITEMS;

  /* ---------- declarative auto-init: <div data-component="CircularCarousel"> ---------- */

  const BOOLEAN_OPTIONS = ['captions', 'draggable', 'snap', 'pauseOnHover', 'focusOnClick'];

  const parseValue = (key, raw) => {
    if (BOOLEAN_OPTIONS.indexOf(key) !== -1) return !(raw === 'false' || raw === '0');
    if (raw.trim() !== '' && !isNaN(Number(raw))) return Number(raw);
    return raw;
  };

  const readItems = node => {
    const json = node.getAttribute('data-items');
    if (json) {
      try {
        const parsed = JSON.parse(json);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      } catch (e) {
        console.warn('CircularCarousel: invalid JSON in data-items', e);
      }
    }
    const imgs = node.querySelectorAll('img');
    if (imgs.length) {
      return Array.prototype.map.call(imgs, img => ({
        src: img.getAttribute('src'),
        alt: img.getAttribute('alt') || '',
        title: img.getAttribute('data-title') || undefined,
        subtitle: img.getAttribute('data-subtitle') || undefined,
        link: img.getAttribute('data-link') || undefined
      }));
    }
    return null;
  };

  // Creates a carousel for every [data-component="CircularCarousel"] inside `scope`
  // (default: document). Already initialised elements are skipped.
  CircularCarousel.init = function (scope) {
    const nodes = (scope || document).querySelectorAll('[data-component="CircularCarousel"]');
    const created = [];
    Array.prototype.forEach.call(nodes, node => {
      if (node.circularCarousel) return;

      const options = {};
      console.log(node.dataset);
      for (const key in node.dataset) {
        if (key === 'component' || key === 'items') continue;
        options[key] = parseValue(key, node.dataset[key]);
      }
      const items = readItems(node);
      if (items) options.items = items;

      while (node.firstChild) node.removeChild(node.firstChild);
      if (!node.getBoundingClientRect().height) node.style.height = '560px';

      options.onChange = index => {
        node.dispatchEvent(new CustomEvent('circularcarousel:change', { detail: { index: index } }));
      };
      options.onItemClick = (item, index) => {
        node.dispatchEvent(new CustomEvent('circularcarousel:itemclick', { detail: { item: item, index: index } }));
      };

      node.circularCarousel = new CircularCarousel(node, options);
      created.push(node.circularCarousel);
    });
    return created;
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => CircularCarousel.init());
    else CircularCarousel.init();
  }

  return CircularCarousel;
});