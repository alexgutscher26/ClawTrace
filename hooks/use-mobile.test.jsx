import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";

// Internal state for the React mock
const listeners = new Set();
let hooksState = [];
let hookIndex = 0;
/** Renders the application. */
let renderApp = () => {};
let lastResult;

// Mock React module
mock.module("react", () => {
  /**
   * Custom hook that manages state in a functional component.
   */
  const useState = (initialValue) => {
    const currentIndex = hookIndex;
    if (hooksState[currentIndex] === undefined) {
      hooksState[currentIndex] = initialValue;
    }
    /**
     * Updates the state and schedules a re-render if the new value is different.
     */
    const setState = (newValue) => {
      const value = typeof newValue === 'function' ? newValue(hooksState[currentIndex]) : newValue;
      if (hooksState[currentIndex] !== value) {
        hooksState[currentIndex] = value;
        // Schedule re-render
        setTimeout(() => renderApp(), 0);
      }
    };
    hookIndex++;
    return [hooksState[currentIndex], setState];
  };

  /**
   * Executes a side effect based on dependency changes.
   *
   * This function checks if the dependencies have changed since the last render. If they have, it runs the provided callback asynchronously to avoid synchronous recursion issues. The current dependencies are then stored in the hooks state for future comparisons. The function also manages the hook index to ensure proper tracking of effects.
   *
   * @param {Function} callback - The effect callback to be executed.
   * @param {Array} deps - The dependencies array that determines when the effect should run.
   */
  const useEffect = (callback, deps) => {
    const currentIndex = hookIndex;
    const prevDeps = hooksState[currentIndex];

    const hasChanged = !prevDeps || !deps ||
      (deps.length !== prevDeps.length) ||
      deps.some((dep, i) => dep !== prevDeps[i]);

    if (hasChanged) {
      // Run effect asynchronously to mimic React and avoid sync recursion issues
      setTimeout(() => {
        // We might want to pass deps to cleanup?
        const cleanup = callback();
        // We ignore cleanup for now, as we focus on logic
        hooksState[currentIndex] = deps;
      }, 0);
    }
    hookIndex++;
  };

  return {
    useState,
    useEffect,
    default: { useState, useEffect }
  };
});

const originalWindow = global.window;

// Helper to trigger resize events
const triggerResize = (width) => {
  global.window.innerWidth = width;
  listeners.forEach(({ listener, maxWidth }) => {
    const matches = width <= maxWidth;
    // Pass event object as expected by standard addEventListener
    listener({ matches, media: '' });
  });
};

describe("useIsMobile Hook", () => {
  let useIsMobile;

  beforeEach(async () => {
    hooksState = [];
    hookIndex = 0;
    listeners.clear();
    lastResult = undefined;

    global.window = {
      innerWidth: 1024, // Default to desktop
      matchMedia: (query) => {
        // Parse query strictly for test purposes
        // Example: (max-width: 767px)
        const match = query.match(/\(max-width:\s*(\d+)px\)/);
        const maxWidth = match ? parseInt(match[1], 10) : 0;

        return {
          matches: global.window.innerWidth <= maxWidth,
          media: query,
          addEventListener: (type, listener) => {
            if (type === 'change') {
              listeners.add({ listener, maxWidth });
            }
          },
          removeEventListener: (type, listener) => {
            if (type === 'change') {
               for (const l of listeners) {
                  if (l.listener === listener) {
                      listeners.delete(l);
                      break;
                  }
               }
            }
          },
        };
      },
    };

    const module = await import("./use-mobile.jsx");
    useIsMobile = module.useIsMobile;

    renderApp = () => {
      hookIndex = 0;
      lastResult = useIsMobile();
    };
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  test("should return false when width is greater than breakpoint (768px)", async () => {
    global.window.innerWidth = 1024;

    renderApp();
    await new Promise(r => setTimeout(r, 10));

    expect(lastResult).toBe(false);
  });

  test("should return true when width is less than breakpoint (768px)", async () => {
    global.window.innerWidth = 500;

    renderApp();
    await new Promise(r => setTimeout(r, 10));

    expect(lastResult).toBe(true);
  });

  test("should update when window resizes from desktop to mobile", async () => {
    global.window.innerWidth = 1024;
    renderApp();
    await new Promise(r => setTimeout(r, 10));
    expect(lastResult).toBe(false);

    // Resize
    triggerResize(500);

    // Wait for update
    await new Promise(r => setTimeout(r, 10));

    expect(lastResult).toBe(true);
  });

  test("should update when window resizes from mobile to desktop", async () => {
    global.window.innerWidth = 500;
    renderApp();
    await new Promise(r => setTimeout(r, 10));
    expect(lastResult).toBe(true);

    // Resize
    triggerResize(1024);

    // Wait for update
    await new Promise(r => setTimeout(r, 10));

    expect(lastResult).toBe(false);
  });
});
