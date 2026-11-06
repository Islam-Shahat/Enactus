/**
 * QR Scanner Configuration & Viewfinder Sizing Helpers
 * Enlarges the active scanning region and increases fps for faster detection.
 */

export const DEFAULT_SCANNER_FPS = 20;
export const DEFAULT_VIEWFINDER_RATIO = 0.85;

/**
 * Calculates adaptive QR box dimensions based on the live viewfinder size.
 * Uses 85% of the viewfinder dimensions for a significantly larger scanning area.
 *
 * @param {number} viewfinderWidth - Width of the active camera container/feed
 * @param {number} viewfinderHeight - Height of the active camera container/feed
 * @param {number} [ratio=0.85] - Percentage of min edge to allocate to the QR box
 * @returns {{ width: number, height: number }}
 */
export function calculateAdaptiveQrBox(viewfinderWidth, viewfinderHeight, ratio = DEFAULT_VIEWFINDER_RATIO) {
  if (!viewfinderWidth || !viewfinderHeight || typeof viewfinderWidth !== 'number' || typeof viewfinderHeight !== 'number') {
    return { width: 300, height: 300 };
  }

  const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
  const size = Math.max(50, Math.floor(minEdge * ratio));

  return {
    width: size,
    height: size,
  };
}

/**
 * Generates standard camera scanner configuration for Html5Qrcode.
 *
 * @param {Object} [overrides={}]
 * @returns {Object}
 */
export function getScannerConfig(overrides = {}) {
  return {
    fps: DEFAULT_SCANNER_FPS,
    qrbox: calculateAdaptiveQrBox,
    aspectRatio: 1.0,
    ...overrides,
  };
}

