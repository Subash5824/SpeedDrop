/**
 * Lightweight, zero-dependency UTF-8 TextEncoder & TextDecoder polyfills
 * for React Native 0.72 / Expo SDK 49 Hermes engine.
 *
 * Fixes: Render Error: Property 'TextEncoder' doesn't exist (from react-native-qrcode-svg)
 */

if (typeof (global as any).TextEncoder === 'undefined') {
  class TextEncoderPolyfill {
    readonly encoding = 'utf-8';

    encode(input: string = ''): Uint8Array {
      const str = String(input ?? '');
      const bin: number[] = [];

      for (let i = 0; i < str.length; i++) {
        let codePoint = str.charCodeAt(i);

        // Handle UTF-16 surrogate pairs
        if (codePoint >= 0xd800 && codePoint <= 0xdbff) {
          if (i + 1 < str.length) {
            const next = str.charCodeAt(i + 1);
            if (next >= 0xdc00 && next <= 0xdfff) {
              codePoint = (codePoint - 0xd800) * 0x400 + (next - 0xdc00) + 0x10000;
              i++;
            }
          }
        }

        if (codePoint < 0x80) {
          bin.push(codePoint);
        } else if (codePoint < 0x800) {
          bin.push(0xc0 | (codePoint >> 6));
          bin.push(0x80 | (codePoint & 0x3f));
        } else if (codePoint < 0x10000) {
          bin.push(0xe0 | (codePoint >> 12));
          bin.push(0x80 | ((codePoint >> 6) & 0x3f));
          bin.push(0x80 | (codePoint & 0x3f));
        } else {
          bin.push(0xf0 | (codePoint >> 18));
          bin.push(0x80 | ((codePoint >> 12) & 0x3f));
          bin.push(0x80 | ((codePoint >> 6) & 0x3f));
          bin.push(0x80 | (codePoint & 0x3f));
        }
      }

      return new Uint8Array(bin);
    }
  }

  (global as any).TextEncoder = TextEncoderPolyfill;
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).TextEncoder = TextEncoderPolyfill;
  }
}

if (typeof (global as any).TextDecoder === 'undefined') {
  class TextDecoderPolyfill {
    readonly encoding = 'utf-8';

    decode(input?: ArrayBuffer | ArrayBufferView): string {
      if (!input) return '';

      let bytes: Uint8Array;
      if (input instanceof Uint8Array) {
        bytes = input;
      } else if (input instanceof ArrayBuffer) {
        bytes = new Uint8Array(input);
      } else if (ArrayBuffer.isView(input)) {
        bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
      } else {
        return '';
      }

      let out = '';
      let i = 0;
      while (i < bytes.length) {
        const b1 = bytes[i++];
        if (b1 < 0x80) {
          out += String.fromCharCode(b1);
        } else if ((b1 & 0xe0) === 0xc0) {
          const b2 = bytes[i++];
          out += String.fromCharCode(((b1 & 0x1f) << 6) | (b2 & 0x3f));
        } else if ((b1 & 0xf0) === 0xe0) {
          const b2 = bytes[i++];
          const b3 = bytes[i++];
          out += String.fromCharCode(
            ((b1 & 0x0f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f)
          );
        } else if ((b1 & 0xf8) === 0xf0) {
          const b2 = bytes[i++];
          const b3 = bytes[i++];
          const b4 = bytes[i++];
          let cp =
            ((b1 & 0x07) << 18) |
            ((b2 & 0x3f) << 12) |
            ((b3 & 0x3f) << 6) |
            (b4 & 0x3f);
          cp -= 0x10000;
          out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
        }
      }

      return out;
    }
  }

  (global as any).TextDecoder = TextDecoderPolyfill;
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).TextDecoder = TextDecoderPolyfill;
  }
}

// Polyfill crypto and crypto.getRandomValues for uuid and random byte generation on Hermes
if (typeof (global as any).crypto === 'undefined') {
  (global as any).crypto = {};
}
if (typeof (global as any).crypto.getRandomValues === 'undefined') {
  (global as any).crypto.getRandomValues = function <T extends ArrayBufferView | null>(array: T): T {
    if (!array) return array;
    const uint8 = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
    for (let i = 0; i < uint8.length; i++) {
      uint8[i] = Math.floor(Math.random() * 256);
    }
    return array;
  };
}
if (typeof (global as any).crypto.randomUUID === 'undefined') {
  (global as any).crypto.randomUUID = function (): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };
}

if (typeof globalThis !== 'undefined') {
  if (typeof (globalThis as any).crypto === 'undefined') {
    (globalThis as any).crypto = (global as any).crypto;
  } else {
    if (typeof (globalThis as any).crypto.getRandomValues === 'undefined') {
      (globalThis as any).crypto.getRandomValues = (global as any).crypto.getRandomValues;
    }
    if (typeof (globalThis as any).crypto.randomUUID === 'undefined') {
      (globalThis as any).crypto.randomUUID = (global as any).crypto.randomUUID;
    }
  }
}

/**
 * ============================================================================
 * GLOBAL UNHANDLED PROMISE REJECTION & NETWORK ERROR SHIELD
 * ============================================================================
 * Prevents network failures, DNS resolution errors, timeout errors, or aborted
 * fetches from bubbling up as unhandled fatal exceptions that crash the Android app
 * with "SpeedDrop keeps stopping".
 */

// 1. Intercept unhandled rejections via React Native's internal promise rejection tracker
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const rejectionTracking = require('promise/setimmediate/rejection-tracking');
  if (rejectionTracking && typeof rejectionTracking.enable === 'function') {
    rejectionTracking.enable({
      allRejections: true,
      onUnhandled: (id: any, rejection: any) => {
        const msg = String(rejection?.message || rejection || '');
        console.warn(`[SafePromiseShield] Intercepted unhandled rejection (${id}):`, msg);
      },
      onHandled: () => {},
    });
  }
} catch (_) {
  // Fall back silently if module isn't directly exposed
}

// 2. Install global onunhandledrejection listener on global and globalThis
const handleUnhandledRejection = (event: any) => {
  const reason = event?.reason;
  const msg = String(reason?.message || reason || '');
  console.warn('[GlobalPromiseRejection] Suppressed:', msg);
  if (event && typeof event.preventDefault === 'function') {
    event.preventDefault();
  }
};

if (typeof (global as any).onunhandledrejection === 'undefined') {
  (global as any).onunhandledrejection = handleUnhandledRejection;
}
if (typeof globalThis !== 'undefined' && typeof (globalThis as any).onunhandledrejection === 'undefined') {
  (globalThis as any).onunhandledrejection = handleUnhandledRejection;
}

// 3. React Native ErrorUtils Global Handler: prevent network errors from killing the native process
if ((global as any).ErrorUtils && typeof (global as any).ErrorUtils.getGlobalHandler === 'function') {
  const originalGlobalHandler = (global as any).ErrorUtils.getGlobalHandler();
  (global as any).ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
    const errorStr = String(error?.message || error?.stack || error || '').toLowerCase();
    const isNetworkOrAbort =
      errorStr.includes('network request failed') ||
      errorStr.includes('aborted') ||
      errorStr.includes('aborterror') ||
      errorStr.includes('timeout') ||
      errorStr.includes('econnrefused') ||
      errorStr.includes('enotfound') ||
      errorStr.includes('network error') ||
      errorStr.includes('failed to fetch') ||
      errorStr.includes('connection timed out') ||
      errorStr.includes('socket hang up') ||
      errorStr.includes('could not reach') ||
      errorStr.includes('request timed out');

    if (isNetworkOrAbort) {
      console.warn('[GlobalErrorHandler] Suppressed non-fatal network/timeout error:', error?.message || error);
      return; // Do NOT crash Android app
    }

    if (typeof originalGlobalHandler === 'function') {
      originalGlobalHandler(error, isFatal);
    }
  });
}


export {};
