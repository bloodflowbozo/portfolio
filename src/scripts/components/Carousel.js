import Swiper from 'swiper/bundle';

let wordBannerCount = 1

export default class Carousel {
  constructor(element) {
    this.element = element;
    this.options = {
      slidesPerView: 1,
      spaceBetween: 50,
      pagination: {
        el: this.element.querySelector('.swiper-pagination'),
      },
      scrollbar: {
        el: this.element.querySelector('.swiper-scrollbar'),
        draggable: true,
    },
      navigation: {
        nextEl: this.element.querySelector('.swiper-button-next'),
        prevEl: this.element.querySelector('.swiper-button-prev'),
      },
    };

    this.init();
  }

  setOptions() {
    if ('split' in this.element.dataset) {
      this.options.breakpoints = {
        768: {
          slidesPerView: 2.5,
        },
      };
    }

    if ('autoplay' in this.element.dataset) {
      this.options.autoplay = {
        delay: 3000,
        disableOnInteraction: false,
        allowTouchMove: false,
        
      };

      console.log('Autoplay');
    }

    if ('loop' in this.element.dataset) {
      this.options.loop = true;
    }

    if ('slides' in this.element.dataset) {
      if (this.element.dataset.slides == 'auto') {
        this.options.slidesPerView = 'auto';
      } else if (parseFloat(this.element.dataset.slides) > 0) {
        this.options.slidesPerView = parseFloat(this.element.dataset.slides);
      }
    }

        if ('banner' in this.element.dataset) {
      this.options = {
        slidesPerView: '5',
        spaceBetween: 50,
        loop: true,
        speed: 5000,
        allowTouchMove: false,

        autoplay: {
            delay: 0,
            disableOnInteraction: false,
        },
        
      };

      
    }

     if ('wordbanner' in this.element.dataset) {
      this.options = {
        slidesPerView: 'auto',
        spaceBetween: 100,
        loop: true,
        speed: 5000 * (wordBannerCount * 0.4),
        allowTouchMove: false,

        autoplay: {
            delay: 0,
            disableOnInteraction: false,
            
        },
        
      };

      
      wordBannerCount += 1
    }
  }

  init() {
    console.log('Initialisation de ma composante Carousel');
    this.setOptions();

    const swiper = new Swiper(this.element, this.options);
  }
}
