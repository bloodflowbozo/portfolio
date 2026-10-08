import { gsap } from 'gsap';
import { ScrollSmoother } from 'gsap/ScrollSmoother.js';
import { ScrollTrigger } from 'gsap/ScrollTrigger.js';

export default class Scroller {
  constructor(element) {
    gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

    this.element = element;
    this.options = {
      hasSkew: false,
      hasPinItems: false,
    };
    this.init();
    this.setOption();
  }

  init() {
    const scroller = ScrollSmoother.create({
      smooth: 2,
      effects: true,
      smoothTouch: 0.1,
      onUpdate: this.onUpdateScroll.bind(this),
      onStop: this.onStopScroll.bind(this),
      ease: 'expo.out',
    });
  }

  onUpdateScroll(self) {
    if (this.options.hasSkew) this.updateSkey(self);
  }

  onStopScroll(self) {
    if (this.options.hasSkew) this.skewSetter(0);
  }

  setOption() {
    if ('skew' in this.element.dataset) {
      this.options.hasSkew = true;
      this.initSkew();
    }
    if ('pinItems' in this.element.dataset) {
      this.options.hasPinItems = true;
      this.initPins();
    }

    if (this.element.querySelector('.js-horiz')) {
      this.initHoriz();
    }
  }

  initSkew() {
    this.skewSetter = gsap.quickTo('img', 'skewY');
  }

  updateSkey(self) {
    const force = 5;
    this.skewSetter(
      gsap.utils.mapRange(
        -1000,
        1000,
        -force,
        force,
        gsap.utils.clamp(-1000, 1000, self.getVelocity()),
      ),
    );
  }

  initPins() {
    const pinsItems = this.element.querySelectorAll('.js-pinned');
    for (let i = 0; i < pinsItems.length; i++) {
      const pinItem = pinsItems[i];

      ScrollTrigger.create({
        pin: pinItem,
        trigger: pinItem.parentElement,
        start: 'center center',
        end: '80% center',
      });
    }
  }

  //section horizontale
  initHoriz() {
    const section = this.element; // <section class="projets">
    const track = section.querySelector('.js-horiz');
    const panels = track.querySelectorAll('.js-panel');

    // Calculate exact total distance the track needs to slide
    const getScrollAmount = () => -(track.scrollWidth - window.innerWidth);

    gsap.to(track, {
      x: getScrollAmount,
      ease: 'none',
      scrollTrigger: {
        trigger: section, // Pin the full 100vh section
        pin: true, // Keeps the page vertically locked
        start: 'top top', // Locks when section reaches top of screen
        end: () => '+=' + (track.scrollWidth - window.innerWidth), // Scroll distance matches track width
        scrub: 1,
        snap: panels.length > 1 ? 1 / (panels.length - 1) : false,
        invalidateOnRefresh: true, // Recalculates distances on window resize
      },
    });
  }
}
