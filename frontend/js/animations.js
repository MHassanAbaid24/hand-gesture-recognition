/**
 * Animations module using GSAP CDN
 */

// Ensure gsap is globally accessible
const gsap = window.gsap;

/**
 * Perform initial hero section entrance animations using split text slide reveals
 */
export function animateHero() {
  if (!gsap) return;

  const tl = gsap.timeline();

  // Reset initial opacity visibility
  gsap.set('#hero-subtitle', { opacity: 0 });
  gsap.set('#hero-cta-group', { opacity: 0, scale: 0.95 });
  gsap.set('.gesture-guide-cards', { opacity: 0, y: 40 });
  gsap.set(['.hologram-hand', '.hologram-human'], { opacity: 0, scale: 0.8 });

  // 1. Split Text Slide Up
  tl.fromTo('.split-child', 
    { translateY: '110%' }, 
    { translateY: '0%', duration: 1.2, stagger: 0.1, ease: 'expo.out' }
  )
  // 2. Subtitle Fade In
  .fromTo('#hero-subtitle', 
    { opacity: 0, y: 15 }, 
    { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' },
    '-=0.6'
  )
  // 3. CTA Magnetic Button pop
  .fromTo('#hero-cta-group', 
    { opacity: 0, scale: 0.9 }, 
    { opacity: 1, scale: 1, duration: 0.6, ease: 'power4.out' },
    '-=0.4'
  )
  // 4. Staggered card guide reveals with float waves
  .fromTo('.gesture-card', 
    { opacity: 0, y: 30, rotationX: -15 }, 
    { 
      opacity: 1, 
      y: 0, 
      rotationX: 0, 
      duration: 0.8, 
      stagger: 0.1, 
      ease: 'power3.out',
      onComplete: () => {
        // Set up the gentle wave floating loop
        animateFloatingCards();
      }
    },
    '-=0.3'
  )
  // 5. Hologram Entrance
  .to(['.hologram-hand', '.hologram-human'], {
    opacity: 1, scale: 1, duration: 2, ease: 'power3.out', stagger: 0.2
  });
}

/**
 * Gentle floating vertical loop wave for the gesture guides
 */
function animateFloatingCards() {
  if (!gsap) return;

  document.querySelectorAll('.gesture-card').forEach((card, index) => {
    gsap.to(card, {
      y: '+=10',
      duration: 1.8 + (index * 0.2),
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut'
    });
  });
}

/**
 * 3D-Tilt hover micro-interaction on the gesture guide cards
 */
export function initTiltCards() {
  const cards = document.querySelectorAll('.gesture-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const { left, top, width, height } = card.getBoundingClientRect();
      const x = (e.clientX - left) / width - 0.5; // -0.5 to 0.5
      const y = (e.clientY - top) / height - 0.5; // -0.5 to 0.5

      // Tilts card 15 degrees max
      gsap.to(card, {
        rotationY: x * 15,
        rotationX: -y * 15,
        transformPerspective: 1000,
        duration: 0.3,
        ease: 'power2.out'
      });
    });

    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        rotationY: 0,
        rotationX: 0,
        duration: 0.6,
        ease: 'power3.out'
      });
    });
  });
}

/**
 * Inertia-lerping custom mouse cursor follower
 */
export function initCustomCursor() {
  const cursor = document.getElementById('custom-cursor');
  const dot = document.getElementById('custom-cursor-dot');
  if (!cursor || !dot || !gsap) return;

  // Reveal cursors once active
  gsap.set([cursor, dot], { opacity: 1 });

  // Store coordinates
  const mouse = { x: 0, y: 0 };
  const cursorCoordinates = { x: 0, y: 0 };

  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;

    // Direct tracking for center dot
    gsap.to(dot, {
      x: mouse.x,
      y: mouse.y,
      duration: 0.05,
      ease: 'none'
    });
  });

  // Inertial LERP (Linear Interpolation) loop for the outer circle
  gsap.ticker.add(() => {
    const dt = 0.15; // interpolation ratio (0.15 feels extremely soft and responsive)
    cursorCoordinates.x += (mouse.x - cursorCoordinates.x) * dt;
    cursorCoordinates.y += (mouse.y - cursorCoordinates.y) * dt;

    gsap.set(cursor, {
      x: cursorCoordinates.x,
      y: cursorCoordinates.y
    });
  });

  // Add Hover Scaling Hooks on Interactive Elements
  const hoverables = 'a, button, .btn, .drop-zone, .gesture-card, .toggle-btn';
  document.querySelectorAll(hoverables).forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.add('hovering');
    });
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('hovering');
    });
  });
}

/**
 * Magnetic button hover effect coupled with inner radial glows
 */
export function initMagneticButtons() {
  const buttons = document.querySelectorAll('.btn-magnetic');
  if (!buttons.length || !gsap) return;

  buttons.forEach(btn => {
    const glow = btn.querySelector('.btn-glow');

    btn.addEventListener('mousemove', (e) => {
      const { left, top, width, height } = btn.getBoundingClientRect();
      const x = e.clientX - left; // cursor relative x inside button
      const y = e.clientY - top;  // cursor relative y inside button

      // 1. Pull the button slightly towards the cursor (magnet effect)
      const pullX = (x / width - 0.5) * 15; // pull 15px max
      const pullY = (y / height - 0.5) * 15;

      gsap.to(btn, {
        x: pullX,
        y: pullY,
        duration: 0.3,
        ease: 'power2.out'
      });

      // 2. Align inner light sweep glow under cursor
      if (glow) {
        gsap.to(glow, {
          x: x,
          y: y,
          duration: 0.1
        });
      }
    });

    btn.addEventListener('mouseleave', () => {
      // Return button back to original origin smoothly
      gsap.to(btn, {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: 'elastic.out(1, 0.5)'
      });
    });
  });
}

/**
 * Subtle parallax movement on hero background shapes
 */
export function initHeroParallax() {
  const container = document.querySelector('.hero-section');
  if (!container || !gsap) return;

  container.addEventListener('mousemove', (e) => {
    const { clientX, clientY } = e;
    const { width, height } = container.getBoundingClientRect();
    
    const moveX = (clientX / width) - 0.5;
    const moveY = (clientY / height) - 0.5;

    gsap.to('.shape-1', {
      x: moveX * 50,
      y: moveY * 50,
      duration: 1.2,
      ease: 'power2.out'
    });

    gsap.to('.shape-2', {
      x: moveX * -70,
      y: moveY * -70,
      duration: 1.2,
      ease: 'power2.out'
    });

    gsap.to('.shape-3', {
      x: moveX * 30,
      y: moveY * -30,
      duration: 1.2,
      ease: 'power2.out'
    });
  });
}

/**
 * Animate the confidence progress bar and its textual percentage count
 */
export function animateConfidence(fillElement, labelElement, targetValue) {
  if (!gsap) {
    fillElement.style.width = `${targetValue}%`;
    labelElement.innerText = `${Math.round(targetValue)}%`;
    return;
  }

  gsap.fromTo(fillElement, 
    { width: '0%' }, 
    { width: `${targetValue}%`, duration: 1.2, ease: 'power2.out' }
  );

  const tracker = { value: 0 };
  gsap.to(tracker, {
    value: targetValue,
    duration: 1.2,
    ease: 'power2.out',
    onUpdate: () => {
      labelElement.innerText = `${Math.round(tracker.value)}%`;
    }
  });
}

/**
 * Animate slide-in & fade-in transition for the results card contents
 */
export function revealResults(element) {
  if (!gsap) {
    element.style.display = 'flex';
    return;
  }
  
  // Trigger Glitch on the gesture name
  const nameEl = element.querySelector('#gesture-name');
  if (nameEl) {
    nameEl.setAttribute('data-text', nameEl.innerText);
    nameEl.classList.add('glitch-active');
    
    setTimeout(() => {
      nameEl.classList.remove('glitch-active');
    }, 600);
  }

  gsap.fromTo(element, 
    { opacity: 0, y: 15 }, 
    { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }
  );
}

/**
 * Slide up and fade in toast element, then fade out on dismiss
 */
export function animateToast(toast, onComplete) {
  if (!gsap) {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    setTimeout(() => {
      onComplete();
    }, 4000);
    return;
  }

  const tl = gsap.timeline();
  
  tl.to(toast, {
    opacity: 1,
    y: 0,
    duration: 0.4,
    ease: 'back.out(1.2)'
  });

  tl.to(toast, {
    opacity: 0,
    x: 50,
    duration: 0.3,
    delay: 4,
    ease: 'power2.in',
    onComplete: onComplete
  });
}
