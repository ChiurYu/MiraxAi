import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

// 说明：本测试只以纯文本方式读取 App.vue，绝不 import .vue 组件，
// 因此不依赖 vue 插件，可在根 vitest 的 node 环境下直接运行。
const srcDir = path.resolve(__dirname);
const appSource = fs.readFileSync(path.join(srcDir, "App.vue"), "utf-8");
const appScript = appSource.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)?.[1] ?? "";
const topBarSource = fs.readFileSync(path.join(srcDir, "components", "app", "TopBar.vue"), "utf-8");
const capabilities = fs.readFileSync(
  path.resolve(srcDir, "..", "src-tauri", "capabilities", "default.json"),
  "utf-8",
);
const tauriConf = fs.readFileSync(
  path.resolve(srcDir, "..", "src-tauri", "tauri.conf.json"),
  "utf-8",
);
const stylesSource = fs.readFileSync(path.join(srcDir, "styles.css"), "utf-8");

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
    expect(appScript).toContain('import { getCurrentWindow } from "@tauri-apps/api/window";');
    expect(syncBlock).not.toContain('await import("@tauri-apps/api/window")');
    expect(syncBlock).toContain("getCurrentWindow().setTheme(next)");
  });

  it("启动时立即同步一次原生标题栏主题", () => {
    expect(appScript).toContain("{ immediate: true }");
  });

  it("capability 声明最小 set-theme 权限", () => {
    expect(capabilities).toContain("core:window:allow-set-theme");
  });

  it("capability 声明最小 start-dragging 权限", () => {
    expect(capabilities).toContain("core:window:allow-start-dragging");
  });
});

describe("macOS 原生标题栏 Overlay 主修复", () => {
  it("窗口配置启用 Overlay 标题栏并隐藏标题文字", () => {
    const parsed = JSON.parse(tauriConf) as {
      app?: {
        windows?: Array<{
          titleBarStyle?: string;
          trafficLightPosition?: { x?: number; y?: number };
          hiddenTitle?: boolean;
        }>;
      };
    };
    const primaryWindow = parsed.app?.windows?.[0];
    expect(primaryWindow?.titleBarStyle).toBe("Overlay");
    expect(primaryWindow?.hiddenTitle).toBe(true);
  });

  it("Overlay 标题栏下将 macOS traffic lights 放进预留区域", () => {
    const parsed = JSON.parse(tauriConf) as {
      app?: { windows?: Array<{ trafficLightPosition?: { x?: number; y?: number } }> };
    };
    expect(parsed.app?.windows?.[0]?.trafficLightPosition).toEqual({ x: 12, y: 16 });
  });

  it("Tauri 环境挂载时标记 is-tauri 以启用标题栏内边距", () => {
    expect(appScript).toContain('document.documentElement.classList.add("is-tauri")');
    expect(appScript).toContain("if (isTauriAvailable())");
  });

  it("CSS 提供标题栏安全内边距，且仅在 is-tauri 下生效（dev:web 保持 0）", () => {
    expect(stylesSource).toContain("--mx-titlebar-inset: 0px;");
    expect(stylesSource).toContain("--mx-rail-width: 80px;");
    expect(stylesSource).toMatch(/html\.is-tauri\s*\{[\s\S]*--mx-titlebar-inset:\s*28px;/);
    expect(stylesSource).toContain("var(--mx-titlebar-inset)");
  });

  it("拖拽区覆盖标题栏与顶栏非交互区域", () => {
    expect(topBarSource).toContain('<span class="window-drag-strip" data-tauri-drag-region');
    expect(topBarSource).toContain('<div class="project-overview" data-tauri-drag-region>');
    expect(topBarSource).not.toContain('@pointerdown="startDragging"');
    expect(stylesSource).toMatch(/html\.is-tauri \.window-drag-strip\s*\{[\s\S]*height:\s*var\(--mx-titlebar-inset\);/);
  });

  it("Overlay 标题栏下通过 data-tauri-drag-region 原生拖拽", () => {
    expect(topBarSource).toContain("data-tauri-drag-region");
    expect(topBarSource).not.toContain("getCurrentWindow().startDragging()");
    expect(topBarSource).not.toContain("function startDragging");
  });

  it("顶栏交互按钮通过 data-tauri-drag-region=\"false\" 排除在拖拽区外", () => {
    expect(topBarSource).toContain('data-tauri-drag-region="false"');
    expect(topBarSource).toContain('class="toolbar-actions" data-tauri-drag-region="false"');
  });

  it("系统外观变化时显式通知 Tauri 窗口，确保 WKWebView prefers-color-scheme 同步", () => {
    const syncBlock = appScript.match(/function syncSystemTheme\([\s\S]*?\n\}/)?.[0] ?? "";
    expect(syncBlock).toContain("systemThemeQuery?.matches");
    expect(syncBlock).toContain('appSettings.theme === "system"');
    expect(syncBlock).toContain("syncNativeWindowTheme(systemTheme.value)");
  });

  it("dev 模式下支持 URL hash #theme=light|dark 预设主题以辅助验收", () => {
    expect(appScript).toContain("import.meta.env.DEV");
    expect(appScript).toContain('window.location.hash.match(/theme=(light|dark)/)');
    expect(appScript).toContain("appSettings.theme = hashTheme");
  });
});
