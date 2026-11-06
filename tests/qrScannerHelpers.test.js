import { describe, it, expect } from 'vitest';
import {
  calculateAdaptiveQrBox,
  getScannerConfig,
  DEFAULT_SCANNER_FPS,
  DEFAULT_VIEWFINDER_RATIO,
} from '../src/lib/qrScannerHelpers';

describe('QR Scanner Viewfinder & Configuration Helpers', () => {
  it('has optimal default fps (20) and ratio (0.85) for fast recognition', () => {
    expect(DEFAULT_SCANNER_FPS).toBe(20);
    expect(DEFAULT_VIEWFINDER_RATIO).toBe(0.85);
  });

  it('calculates generous 85% square scanning area for standard dimensions', () => {
    // 400x400 square feed -> 400 * 0.85 = 340
    const boxSquare = calculateAdaptiveQrBox(400, 400);
    expect(boxSquare).toEqual({ width: 340, height: 340 });

    // 480x360 landscape feed -> min(480, 360) = 360 -> 360 * 0.85 = 306
    const boxLandscape = calculateAdaptiveQrBox(480, 360);
    expect(boxLandscape).toEqual({ width: 306, height: 306 });

    // 360x640 mobile portrait feed -> min(360, 640) = 360 -> 360 * 0.85 = 306
    const boxPortrait = calculateAdaptiveQrBox(360, 640);
    expect(boxPortrait).toEqual({ width: 306, height: 306 });
  });

  it('safely handles fallback when invalid or zero dimensions are provided', () => {
    expect(calculateAdaptiveQrBox(0, 0)).toEqual({ width: 300, height: 300 });
    expect(calculateAdaptiveQrBox(null, null)).toEqual({ width: 300, height: 300 });
    expect(calculateAdaptiveQrBox(undefined, undefined)).toEqual({ width: 300, height: 300 });
  });

  it('produces valid Html5Qrcode configuration object', () => {
    const config = getScannerConfig();
    expect(config.fps).toBe(20);
    expect(config.aspectRatio).toBe(1.0);
    expect(typeof config.qrbox).toBe('function');

    const calculatedBox = config.qrbox(500, 500);
    expect(calculatedBox.width).toBe(425);
    expect(calculatedBox.height).toBe(425);
  });

  it('allows overriding specific scanner parameters', () => {
    const customConfig = getScannerConfig({ fps: 25, aspectRatio: 1.33 });
    expect(customConfig.fps).toBe(25);
    expect(customConfig.aspectRatio).toBe(1.33);
  });
});

