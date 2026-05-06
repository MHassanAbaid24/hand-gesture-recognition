/**
 * Animation Orchestrator - Centralizes hero animations and results display state machine
 * 
 * This module abstracts GSAP and animation logic, providing:
 * - Single entry point for hero animation initialization
 * - State machine for results display (testable without GSAP)
 * - Graceful degradation when GSAP is unavailable
 */

import {
  animateHero,
  initHeroParallax,
  initCustomCursor,
  initTiltCards,
  initMagneticButtons,
  revealResults,
  animateConfidence
} from './animations.js';
import { elements } from './ui.js';

/**
 * Initialize all hero animations as a cohesive unit.
 * Safe to call even if GSAP is unavailable (degrades gracefully).
 */
export function initializeHeroAnimations() {
  if (window.gsap) {
    animateHero();
    initHeroParallax();
    initCustomCursor();
    initTiltCards();
    initMagneticButtons();
  }
  // Silently degrade if GSAP not available
}

/**
 * Factory function that returns a state machine for results display.
 * Manages transitions between placeholder, loading, success, and error states.
 * 
 * @returns {Object} State machine with methods: showPlaceholder, showLoading, showSuccess, showError, getCurrentState, reset
 */
export function createResultsOrchestrator() {
  let currentState = 'placeholder';

  const states = {
    /**
     * Show the initial placeholder (no results yet).
     */
    showPlaceholder: () => {
      if (currentState === 'placeholder') return; // Already there (idempotent)
      elements.resultPlaceholder.style.display = 'flex';
      elements.skeletonLoader.style.display = 'none';
      elements.resultContent.style.display = 'none';
      currentState = 'placeholder';
    },

    /**
     * Show the skeleton loader (prediction in progress).
     */
    showLoading: () => {
      if (currentState === 'loading') return; // Already there (idempotent)
      elements.resultPlaceholder.style.display = 'none';
      elements.skeletonLoader.style.display = 'flex';
      elements.resultContent.style.display = 'none';
      currentState = 'loading';
    },

    /**
     * Display successful prediction with animation.
     * Updates DOM content and animates if GSAP is available, falls back to instant display otherwise.
     * 
     * @param {string} imageSrc - Base64 or object URL of the classified frame
     * @param {string} gesture - The predicted hand gesture label
     * @param {number} confidence - Decimal (0-1) or raw percent (0-100)
     */
    showSuccess: (imageSrc, gesture, confidence) => {
      const confidencePercent = confidence <= 1.0 ? confidence * 100 : confidence;

      // Update DOM content
      elements.previewImg.src = imageSrc;
      elements.gestureName.textContent = gesture;

      // Show results container
      elements.resultPlaceholder.style.display = 'none';
      elements.skeletonLoader.style.display = 'none';
      elements.resultContent.style.display = 'flex';
      currentState = 'success';

      // Animate if GSAP available, otherwise fallback to instant display
      if (window.gsap) {
        revealResults(elements.resultContent);
        animateConfidence(
          elements.confidenceFill,
          elements.confidencePercentage,
          Math.round(confidencePercent)
        );
      } else {
        // Fallback: instant display without animation
        elements.resultContent.style.opacity = '1';
        elements.confidenceFill.style.width = `${Math.round(confidencePercent)}%`;
        elements.confidencePercentage.textContent = `${Math.round(confidencePercent)}%`;
      }
    },

    /**
     * Show error state (no animation needed).
     */
    showError: () => {
      if (currentState === 'error') return; // Already there (idempotent)
      elements.resultPlaceholder.style.display = 'flex';
      elements.skeletonLoader.style.display = 'none';
      elements.resultContent.style.display = 'none';
      currentState = 'error';
    },

    /**
     * Get current state (useful for tests and debugging).
     * 
     * @returns {'placeholder' | 'loading' | 'success' | 'error'}
     */
    getCurrentState: () => currentState,

    /**
     * Reset to initial state (useful for tests and retries).
     */
    reset: () => {
      states.showPlaceholder();
    }
  };

  return states;
}
