import { afterEach, describe, expect, it, vi } from "vitest";
import { drawShareCard, encodeShareCard } from "@/browser/sharing/card";
import { createShareModel } from "@/browser/sharing/model";
import { getDictionary } from "@/i18n/dictionaries";
import { sharingFixture } from "./helpers/sharing";
function model(
  locale: "it" | "en" = "en",
  version = sharingFixture.methodologyVersion,
) {
  const d = getDictionary(locale);
  return createShareModel(
    { ...sharingFixture, methodologyVersion: version },
    locale,
    d.analysis,
    d.sharing,
    d.landing.brand,
  );
}
function drawing() {
  const text: string[] = [];
  const context = {
    font: "",
    fillStyle: "",
    textBaseline: "",
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    measureText: (value: string) => ({ width: [...value].length * 14 }),
    fillText: (value: string) => text.push(value),
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  );
  return { text, canvas: document.createElement("canvas") };
}
afterEach(() => vi.useRealTimers());
describe("local card rendering and lifecycle", () => {
  it.each(["it", "en"] as const)("draws experimental disclosure in %s PNG", locale => {
    const { text, canvas } = drawing();
    const data = model(locale, "experimental-contract-fixture");
    drawShareCard(canvas, data);
    expect(text.join("")).toContain(data.experimentalNotice!);
    expect(text.join("")).toContain(data.disclaimer);
  });
  it.each(["it", "en"] as const)(
    "draws version/disclaimer/demo notice and unchanged score/class in %s PNG",
    (locale) => {
      const { text, canvas } = drawing();
      const data = model(locale);
      drawShareCard(canvas, data);
      expect(text).toContain("23/100");
      expect(text).toContain("G");
      const drawn = text.join("");
      for (const required of [
        data.brand,
        data.context,
        data.methodology,
        data.disclaimer,
        data.demoNotice!,
      ])
        expect(drawn).toContain(required);
      expect(canvas.width).toBe(1080);
      expect(canvas.height).toBeLessThanOrEqual(4096);
    },
  );
  it.each(["card", "badge"] as const)("preserves zero disclosure and long version in %s", format => {
    const { text, canvas } = drawing();
    const d = getDictionary("it");
    const data = createShareModel({ ...sharingFixture, score: 0,
      methodologyVersion: "experimental-" + "long-👋".repeat(30) }, "it", d.analysis, d.sharing, d.landing.brand);
    drawShareCard(canvas, data, format);
    expect(text.join("")).toContain(data.methodology);
    expect(text.join("")).toContain(d.analysis.zeroScoreNotice);
    expect(text.join("")).toContain(data.experimentalNotice!);
    expect(canvas.width).toBe(format === "badge" ? 720 : 1080);
    for (const metric of data.metrics) {
      if (format === "card") expect(text.join("")).toContain(metric.range);
      else expect(text.join("")).not.toContain(metric.range);
    }
  });
  it("wraps a long Unicode version completely without dropping disclosure", () => {
    const { text, canvas } = drawing();
    const data = model("en", "version-" + "abcdefgh👋".repeat(20));
    drawShareCard(canvas, data);
    expect(text.join("")).toContain(data.methodology);
    expect(text.join("")).toContain(data.disclaimer);
  });
  it("refuses oversized cards instead of clipping the methodology", () => {
    const { canvas } = drawing();
    expect(() => drawShareCard(canvas, model("en", "v".repeat(9000)))).toThrow(
      "CARD_UNAVAILABLE",
    );
    expect(() => drawShareCard(canvas, model("en", "v\n".repeat(100)))).toThrow(
      "CARD_UNAVAILABLE",
    );
  });
  it("clears the canvas after successful encoding", async () => {
    drawing();
    const rendered: HTMLCanvasElement[] = [];
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      function (this: HTMLCanvasElement, callback) {
        rendered.push(this);
        callback(new Blob(["png"], { type: "image/png" }));
      },
    );
    await expect(
      encodeShareCard(model(), new AbortController().signal),
    ).resolves.toHaveProperty("type", "image/png");
    expect(rendered[0]!.width).toBe(0);
    expect(rendered[0]!.height).toBe(0);
  });
  it.each(["abort", "timeout"])(
    "rejects and clears a pending encode on %s; late callbacks cannot revive it",
    async (reason) => {
      vi.useFakeTimers();
      drawing();
      const rendered: HTMLCanvasElement[] = [];
      let complete!: BlobCallback;
      vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
        function (this: HTMLCanvasElement, callback) {
          rendered.push(this);
          complete = callback;
        },
      );
      const controller = new AbortController();
      const pending = encodeShareCard(model(), controller.signal);
      const rejection = expect(pending).rejects.toThrow("CARD_UNAVAILABLE");
      if (reason === "abort") controller.abort();
      else await vi.advanceTimersByTimeAsync(5001);
      await rejection;
      expect(rendered[0]!.width).toBe(0);
      expect(rendered[0]!.height).toBe(0);
      complete(new Blob(["late"], { type: "image/png" }));
    },
  );
  it("rejects missing canvas support and failed encoding safely", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    await expect(
      encodeShareCard(model(), new AbortController().signal),
    ).rejects.toThrow("CARD_UNAVAILABLE");
    drawing();
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      (callback) => callback(null),
    );
    await expect(
      encodeShareCard(model(), new AbortController().signal),
    ).rejects.toThrow("CARD_UNAVAILABLE");
  });
});
