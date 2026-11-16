// Guard the replacement toolchain and classic PHP/WordPress asset contract.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json')));
for (const name of ['react-scripts', 'webpack-dev-server', 'webpack-dev-middleware', 'node-forge', 'selfsigned', 'gulp', 'tslint']) {
  assert(!Object.keys(lock.packages).some(p => p.endsWith('/node_modules/' + name) || p === 'node_modules/' + name), 'Removed tool dependency reintroduced: ' + name);
}
const out = path.join(root, 'build');
const manifest = JSON.parse(fs.readFileSync(path.join(out, 'asset-manifest.json')));
assert.equal(manifest.format, 'classic-iife');
const scripts = Object.keys(manifest.files).filter(p => p.endsWith('.js'));
assert.equal(scripts.length, 1, 'Existing loaders require a single classic entry');
assert.match(scripts[0], /^static\/js\/main\.[\w-]+\.chunk\.js$/);
for (const [file, hash] of Object.entries(manifest.files)) {
  assert.match(file, /^static\/(js|css|media)\/[\w.-]+$/);
  assert(!/\.map$|service-worker|\.env/.test(file));
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(out, file))).digest('hex'), hash);
}
const source = fs.readFileSync(path.join(out, scripts[0]), 'utf8');
assert(!/[^\x00-\x7f]/.test(source), 'Classic scripts must work in older hosts without a charset');
new vm.Script(source, { filename: scripts[0] });
const styles = Object.keys(manifest.files).filter(p => p.endsWith('.css'));
assert.equal(styles.length, 1);
for (const match of fs.readFileSync(path.join(out, styles[0]), 'utf8').matchAll(/url\((?:["']?)([^)"']+)/g)) {
  if (/^(data:|https?:|#)/.test(match[1])) continue;
  const asset = path.resolve(path.dirname(path.join(out, styles[0])), match[1].split(/[?#]/)[0]);
  assert(fs.existsSync(asset), 'CSS asset missing: ' + match[1]);
}
const notices = fs.readFileSync(path.join(out, scripts[0] + '.LICENSE.txt'), 'utf8');
assert.match(notices, /React/i);
assert.match(notices, /Fomantic|Semantic UI/i);
assert.match(notices, /MIT/);
assert.deepEqual(fs.readdirSync(out).sort(), ['asset-manifest.json', 'static']);
console.log('Modern toolchain and classic runtime integrity passed: ' + Object.keys(manifest.files).length + ' hashed assets.');
