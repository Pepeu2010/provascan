type CanvasLike = {
  getContext: (contextId: "webgl2") => unknown;
};

type DocumentLike = {
  createElement: (tagName: "canvas") => CanvasLike;
};

export function canUseWebGL2(documentLike: DocumentLike): boolean {
  try {
    return Boolean(documentLike.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}
