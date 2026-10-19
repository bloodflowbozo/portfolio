import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger.js';

export default class Theme {
  constructor(element) {
    gsap.registerPlugin(ScrollTrigger);

    this.element = element;
    this.footer = document.querySelector('.normal-bg');

    this.init();
  }

  init() {
    if (!this.element) return;

    ScrollTrigger.create({
      trigger: this.element,
      start: 'top 50%',
      onEnter: () => document.body.classList.add('theme-light'),
      onLeaveBack: () => document.body.classList.remove('theme-light'),
    });

    /* --- Retrait du thème clair au footer --- */
    if (this.footer) {
      ScrollTrigger.create({
        trigger: this.footer,
        start: 'top 80%',
        onEnter: () => document.body.classList.remove('theme-light'),
        onLeaveBack: () => document.body.classList.add('theme-light'),
      });
    }
  }
}
