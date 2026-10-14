const canvas = document.getElementById('stars');
const ctx = canvas.getContext('2d');

let stars = [];
let width;
let height;

let particles = [];

const EXPLOSION_DISTANCE = 18;
const EXPLOSION_COUNT = 12;
const CURSOR_RADIUS = 200;

const STAR_COUNT = 180;
// Attraction radius
const radius = 200;

const mouse = {
  x: -1000,
  y: -1000,
};

window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

window.addEventListener('mouseleave', () => {
  mouse.x = -1000;
  mouse.y = -1000;
});

function resize() {
  console.log('resize');
  const dpr = window.devicePixelRatio || 1;

  width = window.innerWidth;
  height = window.innerHeight;

  canvas.width = width * dpr;
  canvas.height = height * dpr;

  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  createStars();
}

function createStars() {
  /////multiple stars

  stars = [];

  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push(createStar());
  }
}

function createStar() {
  //singular star
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 1.4 + 0.5,
    speedX: (Math.random() - 0.5) * 0.12,
    speedY: Math.random() * 0.35 + 0.05,
    opacity: Math.random() * 0.55 + 0.15,
    pulse: Math.random() * Math.PI * 2,
    pulseSpeed: Math.random() * 0.015 + 0.005,
  };
}

function animate() {
  ctx.clearRect(0, 0, width, height);

  for (let i = stars.length - 1; i >= 0; i--) {
    const star = stars[i];

    // Distance to cursor
    const dx = mouse.x - star.x;
    const dy = mouse.y - star.y;
    const distance = Math.hypot(dx, dy);

    // Normal movement
    star.x += star.speedX;
    star.y += star.speedY;

    // Calculate proximity: 0 = far, 1 = close
    const proximity = Math.max(0, Math.min(1, 1 - distance / CURSOR_RADIUS));

    // Move toward cursor
    if (distance < CURSOR_RADIUS && distance > 0) {
      const force = proximity * 0.025;

      star.x += dx * force;
      star.y += dy * force;

      star.size += 0.1;
    }

    // Explode when close enough
    if (distance < EXPLOSION_DISTANCE) {
      explode(star.x, star.y,star.size);
      stars.splice(i, 1);
      stars.push(createStar());
      console.log(stars.length);
      continue;
    }

    // White -> electric blue
    const red = Math.round(255 - proximity * 180);
    const green = Math.round(255 - proximity * 105);
    const blue = 255;

    // Brighter as the star approaches
    const alpha = Math.min(1, star.opacity + proximity * 0.5);

    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);

    ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    ctx.shadowBlur = proximity * 12;
    ctx.shadowColor = `rgb(40, 120, 255)`;

    ctx.fill();
  }

  // Draw explosion particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    p.x += p.vx;
    p.y += p.vy;

    // Gradually slow down
    p.vx *= 0.98;
    p.vy *= 0.98;

    p.alpha -= p.decay;

    if (p.alpha <= 0) {
      particles.splice(i, 1);
      continue;
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);

    ctx.fillStyle = `rgba(70, 150, 255, ${p.alpha})`;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#168BFF';

    ctx.fill();
  }

  // Reset shadow so it doesn't affect unrelated drawing
  ctx.shadowBlur = 0;

  requestAnimationFrame(animate);
}

function explode(x, y,start_size) {
  for (let i = 0; i < EXPLOSION_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2.5 + 0.5;

    particles.push({
      x,
      y,

      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,

      size: Math.random() * 1.5 + start_size/5,
      alpha: 1,

      decay: Math.random() * 0.025 + 0.015,
    });
  }
}

window.addEventListener('resize', resize);

resize();
animate();
