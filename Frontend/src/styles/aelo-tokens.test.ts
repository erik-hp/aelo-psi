import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolvePath(process.cwd(), "src/styles/aelo-tokens.css"), "utf-8").replace(/\r\n/g, "\n");

const block = (selector: string) => {
  const start = css.search(new RegExp(`^${selector.replace(".", "\\.")} \\{`, "m"));
  expect(start).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf("\n}", start));
};

const declarations = (source: string) =>
  Object.fromEntries([...source.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]));

const primitives: Record<string, string> = { "--color-white": "#ffffff", ...declarations(block("@theme")) };

function resolve(theme: Record<string, string>, name: string): string {
  const value = theme[name] ?? primitives[name];
  expect(value, name).toBeDefined();
  const reference = value.match(/^var\((--[\w-]+)\)$/);
  return reference ? resolve(theme, reference[1]) : value;
}

function luminance(hex: string) {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
  const [red, green, blue] = channels.map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(first: string, second: string) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

const surfaces = ["--color-background-full", "--color-background-primary-default", "--color-background-secondary-default"];
const text = ["--color-text-primary", "--color-text-secondary", "--color-text-tertiary", "--color-text-placeholder", "--color-text-error-primary"];
const signals = ["--color-border-focus-ring", "--aelo-thread", "--aelo-thread-end", "--aelo-field-border"];

describe.each([["light", ":root"], ["dark", ".dark"]])("Contrast of the %s theme", (_name, selector) => {
  const theme = declarations(block(selector));

  it.each(surfaces.flatMap((surface) => text.map((color) => [color, surface])))("%s on %s meets 4.5:1", (color, surface) => {
    expect(contrast(resolve(theme, color), resolve(theme, surface))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(surfaces.flatMap((surface) => signals.map((color) => [color, surface])))("%s on %s meets 3:1", (color, surface) => {
    expect(contrast(resolve(theme, color), resolve(theme, surface))).toBeGreaterThanOrEqual(3);
  });

  it("keeps primary button text readable", () => {
    const gradient = theme["--gradient-button-primary-default"];
    const lightestStop = gradient.match(/var\((--[\w-]+)\) 0%/)?.[1] as string;
    expect(contrast(primitives["--color-white"], resolve(theme, lightestStop))).toBeGreaterThanOrEqual(4.5);
  });
});

describe("Theme parity", () => {
  it("defines in .dark every token overridden in :root, which would otherwise leak into the dark theme", () => {
    const light = Object.keys(declarations(block(":root")));
    const dark = declarations(block(".dark"));
    expect(light.filter((name) => !(name in dark))).toEqual([]);
  });
});
