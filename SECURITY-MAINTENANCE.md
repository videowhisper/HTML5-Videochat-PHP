# Dependency security maintenance (2026-11-17)

The source app locks node-forge to 1.4.3, used by selfsigned in the CRA development server. [GHSA-6qrw-m8cv-hcxf / CVE-2026-119192](https://github.com/advisories/GHSA-6qrw-m8cv-hcxf) affects noncanonical RSA signature verification before the fixed release; later Forge fixes are included in 1.4.3. The browser app does not use this certificate library. Source, static imports and the unchanged 22-file rebuild were checked. No running streaming server or PHP authentication/billing behavior changes.

Reinstall with `npm ci` inside `source/`. Run `npm run test:security-dependencies`, `npm run test:socket-auth`, and the documented production build. Synthetic tests exercise canonical/malformed DigestInfo, the existing selfsigned API and an actual loopback HTTPS request that validates its generated CA. Existing PHP smoke tests remain required for host changes.

The compatible dependency changes are node-forge 1.4.3, create-ecdh 4.0.5, shell-quote 1.9.0 and loader-utils 2.0.4 within the existing 2.x consumers. Overrides avoid replacing the whole React/CRA stack during this maintenance patch.

## Remaining toolchain work

Full npm audit: 173 affected dependency/metavulnerability records (9 low, 118 moderate, 39 high, 7 critical). `npm audit --omit=dev`: zero. GitHub alerts count advisory/manifest pairs, so its totals differ from npm's totals. These figures are dated observations, not a permanent security guarantee.

Remaining findings include EJS, Immer, tar, old loaders, development middleware and the older CRA/Workbox/Gulp chain. They require reviewed dependency/build-system migration; a clean production audit does not clear developer or CI exposure. Keep build environments isolated and process trusted project inputs. Do not expose the development server as a production endpoint.

The next slice replaces CRA 4 with a maintained reproducible build, preserving public source/license history and keeping the newer proprietary mixed client separate. Remove obsolete theme-generation dependencies only after checking their theme/source workflow. Acceptance: full clean-install audit, unchanged authentication/media/recording behavior, testable source and browser/asset parity, plus explicit migration/rollback instructions. The current patch does not suppress or dismiss remaining alerts.
