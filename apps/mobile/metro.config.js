const { getDefaultConfig } = require("expo/metro-config");
const fs = require("fs");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");
const sharedRoot = path.resolve(monorepoRoot, "packages/shared");
const rootNodeModules = path.resolve(monorepoRoot, "node_modules");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Monorepo: watch workspace packages and prefer app then root node_modules.
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  rootNodeModules,
];

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "@enterprise/shared": sharedRoot,
};

/**
 * @enterprise/shared uses NodeNext-style `.js` import specifiers that map to `.ts` sources.
 * Metro must rewrite those for the package to bundle.
 * Chain to Metro/Expo's default resolver (do not call metro-resolver directly —
 * that bypasses Expo autolinking sticky resolution in workspaces).
 */
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    typeof moduleName === "string" &&
    moduleName.startsWith(".") &&
    moduleName.endsWith(".js") &&
    context.originModulePath &&
    context.originModulePath.replace(/\\/g, "/").includes("/packages/shared/")
  ) {
    const base = path.resolve(
      path.dirname(context.originModulePath),
      moduleName.slice(0, -3),
    );
    for (const ext of [".ts", ".tsx", ".js", ".jsx"]) {
      const candidate = `${base}${ext}`;
      if (fs.existsSync(candidate)) {
        return { type: "sourceFile", filePath: candidate };
      }
    }
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
