import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

// 说明：本测试只以纯文本方式读取 App.vue，绝不 import .vue 组件，
// 因此不依赖 vue 插件，可在根 vitest 的 node 环境下直接运行。
const srcDir = path.resolve(__dirname);
const appSource = fs.readFileSync(path.join(srcDir, "App.vue"), "utf-8");
const appScript = appSource.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)?.[1] ?? "";
const capabilities = fs.readFileSync(
  path.resolve(srcDir, "..", "src-tauri", "capabilities", "default.json"),
  "utf-8",
);

describe("原生标题栏主题同步", () => {
  it("监听 resolved theme 并调用原生窗口 setTheme", () => {
    expect(appScript).toContain("watch(theme,");
    expect(appScript).toContain("getCurrentWindow().setTheme(next)");
  });

  it("setTheme 被 isTauriAvailable 守卫，dev:web 不会触发 Tauri IPC", () => {
    expect(appScript).toContain("function isTauriAvailable()");
    expect(appScript).toContain('"__TAURI_INTERNALS__" in window');

    const syncBlock = appScript.match(/async function syncNativeWindowTheme\([\s\S]*?\n\}/)?.[0] ?? "";
    expect(syncBlock).toContain("if (!isTauriAvailable()) return;");
    expect(syncBlock).toContain('await import("@tauri-apps/api/window")');
    expect(syncBlock).toContain("getCurrentWindow().setTheme(next)");
  });

  it("启动时立即同步一次原生标题栏主题", () => {
    expect(appScript).toContain("{ immediate: true }");
  });

  it("capability 声明最小 set-theme 权限", () => {
    expect(capabilities).toContain("core:window:allow-set-theme");
  });
});
