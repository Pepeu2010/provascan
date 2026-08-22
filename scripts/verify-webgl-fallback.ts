import assert from "node:assert/strict";

type CanvasLike = { getContext: (contextId: string) => unknown };
type DocumentLike = { createElement: (tagName: string) => CanvasLike };

async function verifyWebGlFallback() {
  const support = await import("../lib/webgl-support").catch(() => null);

  assert.ok(support, "A proteção para navegadores sem WebGL precisa existir.");

  const noWebGlDocument: DocumentLike = {
    createElement: () => ({ getContext: () => null }),
  };
  const webGl2Document: DocumentLike = {
    createElement: () => ({ getContext: (contextId) => (contextId === "webgl2" ? {} : null) }),
  };

  assert.equal(support.canUseWebGL2(noWebGlDocument), false, "Sem WebGL2, o frame decorativo não deve montar um canvas.");
  assert.equal(support.canUseWebGL2(webGl2Document), true, "Com WebGL2 disponível, o frame decorativo pode ser usado.");

  console.log("WebGL fallback regression passed: decorative frames stay disabled without WebGL2.");
}

void verifyWebGlFallback();
