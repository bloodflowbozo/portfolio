import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText.js';

export default class TextAnim {
  constructor(element) {
    gsap.registerPlugin(SplitText);
    this.element = element;
    this.options = {
      repeat: false,
    };
    document.fonts.ready.then(this.init.bind(this));

    //gsap.from(this.element, {
    // duration: 1,
    //  y: '100',
    // alpha: 0,
    // delay: 0.25,
    //ease: 'expo.out',
    // });
  }

  init() {
    this.setOption();
    this.split = SplitText.create(this.element, {
      type: 'chars, words',
      mask: 'chars',
      autosplit: true,
    });

    this.initanim();
    this.initObserver();
  }

  initObserver() {
    const Observer = new IntersectionObserver(this.watch.bind(this), {
      rootMargin: '0px 0px 0px 0px',
    });
    Observer.observe(this.element);
  }

  watch(entries, observer) {
    //fire quand on scroll
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const target = entry.target;

      if (entry.isIntersecting) {
        this.anim(true);
        if (!this.options.repeat) {
          observer.unobserve(target);
        }
      } else {
        this.anim(false);
      }
    }
  }

  initanim() {
    gsap.set(this.split.chars, {
      yPercent: 'random([-100,100])',
      autoAlpha: 0,
    });
  }

  anim(isAnimIn) {
    const alpha = isAnimIn ? 1 : 0;
    const y = isAnimIn ? 0 : 'random([-100,100])';
    gsap.to(this.split.chars, {
      duration: 1,
      yPercent: y,
      autoAlpha: alpha,
      delay: 0.25,
      stagger: 0.05,
      ease: 'expo.out',
    });
  }

  setOption() {
    if ('repeat' in this.element.dataset) {
      this.options.repeat = true;
    }
  }
}
