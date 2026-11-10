# Bundled HTML5 Videochat source — 2026.11.10

This is the human-readable source for the generated static files in this PHP edition. Existing VideoWhisper application/demo licensing and modeVersion behavior are unchanged. Third-party CSS and font notices remain in their source headers; dependency licenses are provided by their npm packages, and generated LICENSE.txt files accompany the chunks.

Use Node 22 and npm. Run npm ci, npm run test:socket-auth, then NODE_OPTIONS=--openssl-legacy-provider DISABLE_ESLINT_PLUGIN=true GENERATE_SOURCEMAP=false npm run build. Never expose the legacy development server on a public network. The legacy CRA build toolchain has known development-only advisories; a maintained-toolchain migration is separate work. The runtime audit is clear as of 2026-11-10.

Copy build/static CSS, JS, license notices and referenced media to the PHP static directory. Do not publish node_modules, local configuration, source maps, logs or recording data. Use the PHP host session and socket_auth callback; account tokens never belong in browser configuration.
