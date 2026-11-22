const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// The marketing site in site/ is a separate Next.js app with its own
// node_modules; keep Metro from crawling it.
config.resolver.blockList = [
  ...[].concat(config.resolver.blockList ?? []),
  new RegExp(`^${path.join(__dirname, 'site').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[/\\\\]`),
];

module.exports = withNativeWind(config, { input: './global.css' });
