import Icons from './utils/Icons.js';

import ComponentFactory from './ComponentFactory.js';
import './components/stars.js';
import './components/circularCarousel.js';
import './components/3d.js';
import './components/modal.js';

class Main {
  constructor() {
    this.init();
  }

  init() {
    // On ajoute une classe sur le html
    // pour qu'on puisse savoir si le JavaScript est
    // supporté dans notre css
    document.documentElement.classList.add('has-js');

    // Pssst, ton ComponentFactory va ici
    new ComponentFactory();

    //Icons.load();
    Icons.load();
  }
}
new Main();
