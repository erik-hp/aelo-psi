import cssEscape from "css.escape";

// jsdom does not implement these browser APIs used by React Aria.
globalThis.CSS ??= {} as typeof CSS;
globalThis.CSS.escape ??= cssEscape;
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
