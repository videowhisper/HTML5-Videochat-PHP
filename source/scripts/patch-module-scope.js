const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const pluginCandidates = [
  path.join(projectRoot, 'node_modules', 'react-dev-utils', 'ModuleScopePlugin.js'),
  path.join(projectRoot, 'node_modules.nosync', 'react-dev-utils', 'ModuleScopePlugin.js'),
];

const marker = "request.descriptionFileRoot.indexOf('/node_modules.nosync/') !== -1";
const original = [
  "          request.descriptionFileRoot.indexOf('/node_modules/') !== -1 ||",
  "          request.descriptionFileRoot.indexOf('\\\\node_modules\\\\') !== -1 ||",
].join('\n');
const replacement = [
  "          request.descriptionFileRoot.indexOf('/node_modules/') !== -1 ||",
  "          request.descriptionFileRoot.indexOf('/node_modules.nosync/') !== -1 ||",
  "          request.descriptionFileRoot.indexOf('\\\\node_modules\\\\') !== -1 ||",
  "          request.descriptionFileRoot.indexOf('\\\\node_modules.nosync\\\\') !== -1 ||",
].join('\n');

let patchedAny = false;

pluginCandidates.forEach((pluginPath) => {
  if (!fs.existsSync(pluginPath)) return;

  const source = fs.readFileSync(pluginPath, 'utf8');
  if (source.includes(marker)) {
    patchedAny = true;
    return;
  }

  if (!source.includes(original)) {
    throw new Error(`Unexpected ModuleScopePlugin format: ${pluginPath}`);
  }

  fs.writeFileSync(pluginPath, source.replace(original, replacement));
  patchedAny = true;
  console.log(`Patched ${pluginPath}`);
});

if (!patchedAny) {
  console.warn('No ModuleScopePlugin.js file found to patch.');
}