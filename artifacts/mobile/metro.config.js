const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Replace fontfaceobserver with a no-op patch.
// fontfaceobserver throws "6000ms timeout exceeded" in the Replit preview
// environment when fonts are slow to load. Our patch resolves immediately.
config.resolver = config.resolver || {};
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  fontfaceobserver: path.resolve(__dirname, "patches/fontfaceobserver.js"),
};

module.exports = config;
