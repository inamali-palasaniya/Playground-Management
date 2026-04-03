/**
 * Global type declarations for React Native/Expo environment.
 * This resolves "Cannot find name 'global'" errors in libraries.
 */
declare global {
  var global: typeof globalThis;
}

export {};
