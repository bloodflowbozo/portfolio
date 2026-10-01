// ton code ici (ps, efface cette ligne stp)
export default class Header {
  constructor(element) {
    this.element = element;
    this.options = {
      treshold: 0.2,
    };
    this.lastPos = null;
    this.html = document.documentElement;

    this.init();
    this.initNavMobile();
  }

  init() {
    this.setOptions();

    window.addEventListener('scroll', this.onScroll.bind(this));
  }

  setOptions() {}

  initNavMobile() {
    const toggle = this.element.querySelector('.js-toggle');
    toggle.addEventListener('click', this.onToggleNav.bind(this));
  }

  onToggleNav() {
    document.documentElement.classList.toggle('nav-is-active');
  }

  onScroll() {
    const scrollPos = document.scrollingElement.scrollTop;

    this.setHeaderState(scrollPos);

    this.setDirection(scrollPos);

    this.lastPos = scrollPos;
  }

  setHeaderState(scrollPos) {
    if ('alwayshow' in this.html.dataset) {
      this.html.classList.remove('header-is-hidden');
      return;
    }

    if (
      scrollPos >
      document.scrollingElement.scrollHeight * this.options.treshold
    ) {
      this.html.classList.add('header-is-hidden');
    } else if (scrollPos < this.lastPos) {
      this.html.classList.remove('header-is-hidden');
    }
  }

  setDirection(scrollPos) {
    if (scrollPos > this.lastPos) {
      this.html.classList.add('is-scrolling-down');
      this.html.classList.remove('is-scrolling-up');
    } else if (scrollPos < this.lastPos) {
      this.html.classList.remove('is-scrolling-down');
      this.html.classList.add('is-scrolling-up');
    }
  }
}
