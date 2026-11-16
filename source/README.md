# Bundled HTML5 Videochat source — 2026.11.17

This is the human-readable source for this PHP edition's generated assets. Existing VideoWhisper application/demo licensing and modeVersion license checks are unchanged. This build-tool migration does not relicense the app or introduce Free/Pro gates.

Use Node 22.12+ and npm. Run `npm ci`, `npm run build`, `npm test`, and `npm audit`. Vite 7.3 replaces Create React App/Webpack and the obsolete Gulp/TypeScript build dependencies. The complete dependency audit, including development tools, has zero known findings on 2026-11-17. Audit results are time-dependent; rerun before releases. No OpenSSL legacy flags are needed.

The build emits one classic IIFE script and one CSS entry in `build/static/`, compatible with the existing PHP/WordPress loaders, plus referenced fonts/images and a matching LICENSE.txt. The SHA-256 manifest is `build/asset-manifest.json`. Output is ASCII-safe for old embedding pages, and does not contain source maps, a service worker, private environment files or the development page. `npm start` serves the development scaffold on loopback only; it requires a host-provided window.VideoWhisper bootstrap to use the app. Never expose development tools publicly. `npm run preview` is not a PHP integration server.

Replace the generated static directory as one release, keeping the adjacent third-party notices and a rollback copy; never mix old and new main scripts. THIRD-PARTY-NOTICES.txt preserves vendored CSS/font notices and the build gathers runtime dependency licenses. Do not publish node_modules, local configuration, logs or recording data. Use the PHP session and socket_auth callback; account tokens stay server-side. Run the PHP smoke tests and browser media/recording checks before deployment.
