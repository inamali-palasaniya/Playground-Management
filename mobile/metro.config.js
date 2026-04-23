const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix for react-native-pager-view on web
if (config.resolver) {
  config.resolver.sourceExts.push('mjs');
  
  // Stub out native-only internals for web
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === 'web' && moduleName.includes('codegenNative')) {
      return {
        type: 'empty',
      };
    }
    return context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = config;
