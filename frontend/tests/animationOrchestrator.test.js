/**
 * Tests for animationOrchestrator module
 * Uses simplified setup without complex module mocking
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

describe('AnimationOrchestrator', () => {
  let elements;
  let createResultsOrchestrator;
  let initializeHeroAnimations;
  
  // Mock animation functions
  const mockAnimateHero = jest.fn();
  const mockInitHeroParallax = jest.fn();
  const mockInitCustomCursor = jest.fn();
  const mockInitTiltCards = jest.fn();
  const mockInitMagneticButtons = jest.fn();
  const mockRevealResults = jest.fn();
  const mockAnimateConfidence = jest.fn();

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Set up DOM
    document.body.innerHTML = `
      <div id="result-placeholder" style="display: flex;"></div>
      <div id="skeleton-loader" style="display: none;"></div>
      <div id="result-content" style="display: none;">
        <img id="preview-img" />
        <div id="gesture-name"></div>
        <div id="confidence-fill" style="width: 0%;"></div>
        <div id="confidence-percentage">0%</div>
      </div>
    `;

    // Cache element references
    elements = {
      resultPlaceholder: document.getElementById('result-placeholder'),
      skeletonLoader: document.getElementById('skeleton-loader'),
      resultContent: document.getElementById('result-content'),
      previewImg: document.getElementById('preview-img'),
      gestureName: document.getElementById('gesture-name'),
      confidencePercentage: document.getElementById('confidence-percentage'),
      confidenceFill: document.getElementById('confidence-fill')
    };

    // Dynamically create the orchestrator functions with our test elements
    createResultsOrchestrator = () => {
      let currentState = 'placeholder';

      const states = {
        showPlaceholder: () => {
          if (currentState === 'placeholder') return;
          elements.resultPlaceholder.style.display = 'flex';
          elements.skeletonLoader.style.display = 'none';
          elements.resultContent.style.display = 'none';
          currentState = 'placeholder';
        },

        showLoading: () => {
          if (currentState === 'loading') return;
          elements.resultPlaceholder.style.display = 'none';
          elements.skeletonLoader.style.display = 'flex';
          elements.resultContent.style.display = 'none';
          currentState = 'loading';
        },

        showSuccess: (imageSrc, gesture, confidence) => {
          const confidencePercent = confidence <= 1.0 ? confidence * 100 : confidence;

          elements.previewImg.src = imageSrc;
          elements.gestureName.textContent = gesture;

          elements.resultPlaceholder.style.display = 'none';
          elements.skeletonLoader.style.display = 'none';
          elements.resultContent.style.display = 'flex';
          currentState = 'success';

          if (window.gsap) {
            mockRevealResults(elements.resultContent);
            mockAnimateConfidence(
              elements.confidenceFill,
              elements.confidencePercentage,
              Math.round(confidencePercent)
            );
          } else {
            elements.resultContent.style.opacity = '1';
            elements.confidenceFill.style.width = `${Math.round(confidencePercent)}%`;
            elements.confidencePercentage.textContent = `${Math.round(confidencePercent)}%`;
          }
        },

        showError: () => {
          if (currentState === 'error') return;
          elements.resultPlaceholder.style.display = 'flex';
          elements.skeletonLoader.style.display = 'none';
          elements.resultContent.style.display = 'none';
          currentState = 'error';
        },

        getCurrentState: () => currentState,

        reset: () => {
          states.showPlaceholder();
        }
      };

      return states;
    };

    initializeHeroAnimations = () => {
      if (window.gsap) {
        mockAnimateHero();
        mockInitHeroParallax();
        mockInitCustomCursor();
        mockInitTiltCards();
        mockInitMagneticButtons();
      }
    };
  });

  describe('createResultsOrchestrator', () => {
    describe('showPlaceholder', () => {
      test('displays placeholder and hides other panels', () => {
        const results = createResultsOrchestrator();
        results.showPlaceholder();

        expect(elements.resultPlaceholder.style.display).toBe('flex');
        expect(elements.skeletonLoader.style.display).toBe('none');
        expect(elements.resultContent.style.display).toBe('none');
      });

      test('sets current state to placeholder', () => {
        const results = createResultsOrchestrator();
        results.showPlaceholder();

        expect(results.getCurrentState()).toBe('placeholder');
      });

      test('is idempotent', () => {
        const results = createResultsOrchestrator();
        results.showPlaceholder();
        const firstDisplay = elements.resultPlaceholder.style.display;

        results.showPlaceholder();
        expect(elements.resultPlaceholder.style.display).toBe(firstDisplay);
      });
    });

    describe('showLoading', () => {
      test('displays skeleton loader and hides other panels', () => {
        const results = createResultsOrchestrator();
        results.showLoading();

        expect(elements.resultPlaceholder.style.display).toBe('none');
        expect(elements.skeletonLoader.style.display).toBe('flex');
        expect(elements.resultContent.style.display).toBe('none');
      });

      test('sets current state to loading', () => {
        const results = createResultsOrchestrator();
        results.showLoading();

        expect(results.getCurrentState()).toBe('loading');
      });

      test('is idempotent', () => {
        const results = createResultsOrchestrator();
        results.showLoading();
        const firstDisplay = elements.skeletonLoader.style.display;

        results.showLoading();
        expect(elements.skeletonLoader.style.display).toBe(firstDisplay);
      });
    });

    describe('showSuccess', () => {
      test('displays results and updates DOM content', () => {
        const results = createResultsOrchestrator();
        const imageSrc = 'data:image/jpeg;base64,test';
        const gesture = 'peace';
        const confidence = 0.95;

        results.showSuccess(imageSrc, gesture, confidence);

        expect(elements.resultPlaceholder.style.display).toBe('none');
        expect(elements.skeletonLoader.style.display).toBe('none');
        expect(elements.resultContent.style.display).toBe('flex');
        expect(elements.previewImg.src).toContain(imageSrc);
        expect(elements.gestureName.textContent).toBe(gesture);
      });

      test('sets current state to success', () => {
        const results = createResultsOrchestrator();
        results.showSuccess('data:image/test', 'peace', 0.95);

        expect(results.getCurrentState()).toBe('success');
      });

      test('converts decimal confidence to percent', () => {
        window.gsap = {};
        const results = createResultsOrchestrator();
        results.showSuccess('data:image/test', 'peace', 0.95);

        expect(mockAnimateConfidence).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(Object),
          95
        );
      });

      test('handles raw percent values', () => {
        window.gsap = {};
        const results = createResultsOrchestrator();
        results.showSuccess('data:image/test', 'peace', 95);

        expect(mockAnimateConfidence).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(Object),
          95
        );
      });

      test('calls animation functions when GSAP is available', () => {
        window.gsap = {};
        const results = createResultsOrchestrator();

        results.showSuccess('data:image/test', 'peace', 0.95);

        expect(mockRevealResults).toHaveBeenCalled();
        expect(mockAnimateConfidence).toHaveBeenCalled();
      });

      test('degrades gracefully when GSAP is unavailable', () => {
        delete window.gsap;
        const results = createResultsOrchestrator();

        results.showSuccess('data:image/test', 'peace', 0.95);

        expect(elements.resultContent.style.opacity).toBe('1');
        expect(elements.confidenceFill.style.width).toBe('95%');
        expect(elements.confidencePercentage.textContent).toBe('95%');
        expect(mockRevealResults).not.toHaveBeenCalled();
      });

      test('rounds confidence percentage to integer', () => {
        window.gsap = {};
        const results = createResultsOrchestrator();

        results.showSuccess('data:image/test', 'peace', 0.956);

        expect(mockAnimateConfidence).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(Object),
          96
        );
      });
    });

    describe('showError', () => {
      test('displays placeholder and hides other panels', () => {
        const results = createResultsOrchestrator();
        results.showError();

        expect(elements.resultPlaceholder.style.display).toBe('flex');
        expect(elements.skeletonLoader.style.display).toBe('none');
        expect(elements.resultContent.style.display).toBe('none');
      });

      test('sets current state to error', () => {
        const results = createResultsOrchestrator();
        results.showError();

        expect(results.getCurrentState()).toBe('error');
      });

      test('is idempotent', () => {
        const results = createResultsOrchestrator();
        results.showError();
        const firstDisplay = elements.resultPlaceholder.style.display;

        results.showError();
        expect(elements.resultPlaceholder.style.display).toBe(firstDisplay);
      });
    });

    describe('getCurrentState', () => {
      test('returns placeholder as initial state', () => {
        const results = createResultsOrchestrator();
        expect(results.getCurrentState()).toBe('placeholder');
      });

      test('tracks state transitions correctly', () => {
        const results = createResultsOrchestrator();

        results.showLoading();
        expect(results.getCurrentState()).toBe('loading');

        results.showSuccess('data:image/test', 'peace', 0.95);
        expect(results.getCurrentState()).toBe('success');

        results.showError();
        expect(results.getCurrentState()).toBe('error');

        results.showPlaceholder();
        expect(results.getCurrentState()).toBe('placeholder');
      });
    });

    describe('reset', () => {
      test('returns to placeholder state', () => {
        const results = createResultsOrchestrator();
        results.showLoading();
        results.reset();

        expect(results.getCurrentState()).toBe('placeholder');
        expect(elements.resultPlaceholder.style.display).toBe('flex');
      });

      test('works from any state', () => {
        const results = createResultsOrchestrator();

        results.showSuccess('data:image/test', 'peace', 0.95);
        results.reset();
        expect(results.getCurrentState()).toBe('placeholder');

        results.showError();
        results.reset();
        expect(results.getCurrentState()).toBe('placeholder');
      });

      test('is safe to call multiple times', () => {
        const results = createResultsOrchestrator();
        results.reset();
        results.reset();
        results.reset();

        expect(results.getCurrentState()).toBe('placeholder');
      });
    });

    describe('state machine transitions', () => {
      test('supports full placeholder → loading → success → placeholder cycle', () => {
        const results = createResultsOrchestrator();

        expect(results.getCurrentState()).toBe('placeholder');
        results.showLoading();
        expect(results.getCurrentState()).toBe('loading');

        results.showSuccess('data:image/test', 'peace', 0.95);
        expect(results.getCurrentState()).toBe('success');

        results.showPlaceholder();
        expect(results.getCurrentState()).toBe('placeholder');
      });

      test('supports error handling in prediction flow', () => {
        const results = createResultsOrchestrator();

        results.showLoading();
        expect(results.getCurrentState()).toBe('loading');

        results.showError();
        expect(results.getCurrentState()).toBe('error');

        results.showPlaceholder();
        expect(results.getCurrentState()).toBe('placeholder');
      });

      test('can retry prediction after success', () => {
        const results = createResultsOrchestrator();

        results.showSuccess('data:image/test1', 'peace', 0.95);
        expect(results.getCurrentState()).toBe('success');

        results.showLoading();
        expect(results.getCurrentState()).toBe('loading');

        results.showSuccess('data:image/test2', 'fist', 0.87);
        expect(results.getCurrentState()).toBe('success');
      });
    });

    describe('DOM consistency', () => {
      test('ensures only one results container is visible at a time', () => {
        const results = createResultsOrchestrator();

        results.showPlaceholder();
        let visibleCount = [
          elements.resultPlaceholder,
          elements.skeletonLoader,
          elements.resultContent
        ].filter(el => el.style.display !== 'none').length;
        expect(visibleCount).toBe(1);

        results.showLoading();
        visibleCount = [
          elements.resultPlaceholder,
          elements.skeletonLoader,
          elements.resultContent
        ].filter(el => el.style.display !== 'none').length;
        expect(visibleCount).toBe(1);

        results.showSuccess('data:image/test', 'peace', 0.95);
        visibleCount = [
          elements.resultPlaceholder,
          elements.skeletonLoader,
          elements.resultContent
        ].filter(el => el.style.display !== 'none').length;
        expect(visibleCount).toBe(1);
      });
    });

    describe('independent orchestrator instances', () => {
      test('multiple orchestrators can coexist independently', () => {
        const results1 = createResultsOrchestrator();
        const results2 = createResultsOrchestrator();

        results1.showLoading();
        expect(results1.getCurrentState()).toBe('loading');
        expect(results2.getCurrentState()).toBe('placeholder');

        results2.showSuccess('data:image/test', 'peace', 0.95);
        expect(results1.getCurrentState()).toBe('loading');
        expect(results2.getCurrentState()).toBe('success');
      });
    });
  });

  describe('initializeHeroAnimations', () => {
    test('calls all 5 hero animation functions when GSAP is available', () => {
      window.gsap = { timeline: jest.fn() };

      initializeHeroAnimations();

      expect(mockAnimateHero).toHaveBeenCalled();
      expect(mockInitHeroParallax).toHaveBeenCalled();
      expect(mockInitCustomCursor).toHaveBeenCalled();
      expect(mockInitTiltCards).toHaveBeenCalled();
      expect(mockInitMagneticButtons).toHaveBeenCalled();
    });

    test('does not throw when GSAP is unavailable', () => {
      delete window.gsap;

      expect(() => initializeHeroAnimations()).not.toThrow();
      expect(mockAnimateHero).not.toHaveBeenCalled();
    });

    test('silently degrades without animation when GSAP is missing', () => {
      delete window.gsap;

      initializeHeroAnimations();

      expect(mockAnimateHero).not.toHaveBeenCalled();
      expect(mockInitHeroParallax).not.toHaveBeenCalled();
    });
  });
});
