import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.resolve(__dirname, "main.ts"), "utf-8");

describe("main.ts bootstrap ordering", () => {
  it("does not statically import App.vue", () => {
    expect(source).not.toMatch(/import\s+App\s+from\s+["']\.\/App\.vue["']/);
  });

  it("imports global CSS statically", () => {
    expect(source).toContain('import "./styles.css"');
  });

  it("imports initLocalStore statically", () => {
    expect(source).toContain('import { initLocalStore } from "./localStore/index.js"');
  });

  it("awaits initLocalStore before dynamically importing App.vue", () => {
    const initIndex = source.indexOf("await initLocalStore()");
    const dynamicImportIndex = source.indexOf('await import("./App.vue")');

    expect(initIndex).toBeGreaterThanOrEqual(0);
    expect(dynamicImportIndex).toBeGreaterThanOrEqual(0);
    expect(dynamicImportIndex).toBeGreaterThan(initIndex);
  });

  it("creates and mounts the app after the dynamic import", () => {
    expect(source).toContain("createApp(App)");
    expect(source).toContain('mount("#app")');
  });
});
