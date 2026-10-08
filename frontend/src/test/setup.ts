/** jsdom globals for bun test (bun test has no DOM by default). */
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost:3001/",
});

const g = globalThis as Record<string, unknown>;
g.window = dom.window;
g.document = dom.window.document;
g.navigator = dom.window.navigator;
g.HTMLElement = dom.window.HTMLElement;
g.Element = dom.window.Element;
g.Node = dom.window.Node;
g.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0);
g.cancelAnimationFrame = (id: number) => clearTimeout(id);
g.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
g.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
g.matchMedia =
  dom.window.matchMedia?.bind(dom.window) ??
  (() => ({ matches: false, addListener() {}, removeListener() {} }));
