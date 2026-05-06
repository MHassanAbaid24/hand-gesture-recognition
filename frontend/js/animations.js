/**
 * Animations module using GSAP CDN
 */

// Ensure gsap is globally accessible
const gsap = window.gsap;

/**
 * Perform initial hero section entrance animations
 */
export function animateHero() {
  if (!gsap) return;

  const tl = gsap.timeline();
  tl.fromTo('#hero-title', 
    { opacity: 0, y: -30 }, 
    { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
  )
  .fromTo('#hero-subtitle', 
    { opacity: 0, y: 20 }, 
    { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
    '-=0.4'
  )
  .fromTo('#hero-cta-group', 
    { opacity: 0, scale: 0.9 }, 
    { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)' },
    '-=0.3'
  );
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
    
    // Calculate relative offset from center (-0.5 to 0.5)
    const moveX = (clientX / width) - 0.5;
    const moveY = (clientY / height) - 0.5;

    gsap.to('.shape-1', {
      x: moveX * 40,
      y: moveY * 40,
      duration: 1,
      ease: 'power2.out'
    });

    gsap.to('.shape-2', {
      x: moveX * -60,
      y: moveY * -60,
      duration: 1,
      ease: 'power2.out'
    });
  });
}

/**
 * Animate the confidence progress bar and its textual percentage count
 * @param {HTMLElement} fillElement - The progress bar inner element
 * @param {HTMLElement} labelElement - The text percentage label
 * @param {number} targetValue - Confidence score (0 to 100)
 */
export function animateConfidence(fillElement, labelElement, targetValue) {
  if (!gsap) {
    fillElement.style.width = `${targetValue}%`;
    labelElement.innerText = `${Math.round(targetValue)}%`;
    return;
  }

  // Animate width
  gsap.fromTo(fillElement, 
    { width: '0%' }, 
    { width: `${targetValue}%`, duration: 1.2, ease: 'power2.out' }
  );

  // Animate dynamic numeric text counting
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
 * @param {HTMLElement} element - The results card body wrapper
 */
export function revealResults(element) {
  if (!gsap) {
    element.style.display = 'flex';
    return;
  }

  gsap.fromTo(element, 
    { opacity: 0, y: 15 }, 
    { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }
  );
}

/**
 * Slide up and fade in toast element, then fade out on dismiss
 * @param {HTMLElement} toast - The toast element
 * @param {Function} onComplete - Callback after toast is hidden and destroyed
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
  
  // Slide up entrance
  tl.to(toast, {
    opacity: 1,
    y: 0,
    duration: 0.4,
    ease: 'back.out(1.2)'
  });

  // Stay active for 4s, then slide right & fade out
  tl.to(toast, {
    opacity: 0,
    x: 50,
    duration: 0.3,
    delay: 4,
    ease: 'power2.in',
    onComplete: onComplete
  });
}
