const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Remove SVG transformer requirement
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

// Block backend and android directories from asset resolution
config.resolver.blockList = [
  /backend[\\\/].*/,
  /android[\\\/].*/,
];

module.exports = config;