/**
 * inject-sw-version.js
 *
 * Runs after `next build`. Replaces the placeholder __SW_VERSION__ in
 * public/sw.js (which gets copied to .next/static & served from /) with
 * a unique build timestamp so the browser always detects a new service
 * worker after each deployment and triggers an automatic update.
 */

const fs   = require('fs');
const path = require('path');

const swPath  = path.join(__dirname, '..', 'public', 'sw.js');
const version = `v13-${Date.now()}`;

let content = fs.readFileSync(swPath, 'utf8');

// Replace the placeholder with the real version
content = content.replace(
  `self.__SW_VERSION__ || 'v13-' + Date.now()`,
  `'${version}'`
);

fs.writeFileSync(swPath, content, 'utf8');

console.log(`✅  SW version injected: ${version}`);
