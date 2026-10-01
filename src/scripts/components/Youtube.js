export default class Youtube {
  constructor(element) {
    this.element = element;

    this.youtubeContainer = element.querySelector('.js-video');
    this.poster = this.youtubeContainer.querySelector('.js-poster');
    this.autoplay = this.poster ? 1 : 0;
    this.videoId = this.element.dataset.videoId;
    this.controls = 1;

    Youtube.instances.push(this);

    console.log('constructor');

    if (this.videoId) {
      Youtube.loadScript();
    } else {
      console.error('Pas de ID');
    }
  }

  static loadScript() {
    console.log('loadscript');
    if (!Youtube.scriptIsLoading) {
      Youtube.scriptIsLoading = true;

      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(script);
    }
  }

  init() {
    console.log('init');
    this.initPlayer = this.initPlayer.bind(this);
    if (this.poster) {
      this.element.addEventListener('click', this.initPlayer);
    } else {
      this.initPlayer().bind(this);
    }
  }

  initPlayer(event) {
    console.log('initplayer');
    if (event) {
      this.element.removeEventListener('click', this.initPlayer);
    }

    if ('noControls' in this.element.dataset) {
      this.controls = 0;
    }
    this.player = new YT.Player(this.youtubeContainer, {
      height: '100%',
      width: '100%',
      videoId: this.videoId,
      playerVars: { rel: 0, autoplay: this.autoplay, controls: this.controls },
      events: {
        onReady: () => {
          const observer = new IntersectionObserver(this.watch.bind(this), {
            rootMargin: '0px 0px 0px 0px',
          });
          observer.observe(this.element);
        },
        onStateChange: (event) => {
          console.log(YT.PlayerState);
          if (event.data == YT.PlayerState.PLAYING) {
            Youtube.pauseAll(this);
          }
        },
      },
    });
  }

  watch(entries) {
    if (this.player && entries[0].isIntersecting == false) {
      this.player.pauseVideo();
    }
  }

  static initAll() {
    document.documentElement.classList.add('is-video-ready');
    for (let i = 0; i < Youtube.instances.length; i++) {
      const instance = Youtube.instances[i];
      instance.init();
    }
  }

  static pauseAll(currentInstance) {
    console.log('PauseAll');
    for (let i = 0; i < Youtube.instances.length; i++) {
      const instance = Youtube.instances[i];
      if (instance.player && instance !== currentInstance) {
        instance.player.pauseVideo();
      }
    }
  }
}

Youtube.instances = [];
window.onYouTubeIframeAPIReady = Youtube.initAll;
