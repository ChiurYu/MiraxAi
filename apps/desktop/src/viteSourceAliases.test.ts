import { describe, expect, it } from "vitest";
import config from "../vite.config";

describe("desktop Vite source aliases", () => {
  it("loads local-store migrations from workspace source during dev", () => {
    expect(config.resolve?.alias).toMatchObject({
      "@mirax/local-store": expect.stringMatching(/packages\/local-store\/src\/index\.ts$/),
    });
  });
});
