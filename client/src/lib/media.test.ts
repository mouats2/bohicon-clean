import { describe, expect, it } from "vitest";
import { validateMediaFile } from "./media";

describe("media validation", () => {
  it("accepte une image supportée sous la limite", () => {
    expect(validateMediaFile(new File([new Uint8Array([1])], "site.jpg", { type: "image/jpeg" }))).toBeNull();
  });
  it("refuse un type MIME non autorisé", () => {
    expect(validateMediaFile(new File([new Uint8Array([1])], "site.pdf", { type: "application/pdf" }))).toMatch(/Format non autorisé/);
  });
  it("refuse un fichier vide et un fichier trop volumineux", () => {
    expect(validateMediaFile(new File([], "vide.png", { type: "image/png" }))).toMatch(/vide/);
    const huge = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.mp4", { type: "video/mp4" });
    expect(validateMediaFile(huge)).toMatch(/volumineux/);
  });
});
