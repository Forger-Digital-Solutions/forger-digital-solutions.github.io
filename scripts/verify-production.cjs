// R3 production verification: routes, archive integrity, page markers.
// Run after deployment: node scripts/verify-production.cjs [baseUrl]
const { createHash } = require('node:crypto');

const BASE = process.argv[2] || 'https://forgerdigitalsolutions.com';
const EXPECTED_SHA = 'a6e16d0056deebeeb8d8b99f7228f5fed43c380722e97012e45b26d5c6fe3208';
const ARCHIVE_URL = '/downloads/codeforge/CodeForge-source-6b0770b.zip';

const routes = [
  ['/', ['Forger Digital Solutions', 'FDS']],
  ['/projects', ['CodeForge', 'ForgerEMS']],
  ['/projects/codeforge', ['CodeForge']],
  ['/projects/forgerems', ['ForgerEMS']],
  ['/projects/gems-training-grounds', ['GEMS']],
  ['/projects/kyrablox', ['KyraBlox']],
  ['/projects/kayla-ai-publisher', ['Kayla']],
  ['/projects/we-the-people', ['We The People']],
  ['/projects/farmstand-finder', ['FarmStand']],
  ['/forged', ['Archive SHA-256', 'Copy SHA-256', 'Download ZIP', 'Archive status by project', EXPECTED_SHA]],
  ['/lab', []],
  ['/notes', []],
  ['/technology', []],
  ['/about', []],
  ['/faq', ['ForgerEMS']],
  ['/support', []],
  ['/privacy', []],
  ['/terms', []],
  ['/codeforge/sign-in', []],
  ['/codeforge/upgrade', []],
];

let failures = 0;
const fail = (msg) => { failures++; console.log('FAIL', msg); };

(async () => {
  for (const [route, markers] of routes) {
    try {
      const res = await fetch(BASE + route, { redirect: 'follow' });
      if (res.status !== 200) { fail(`${route} -> ${res.status}`); continue; }
      const html = await res.text();
      const missing = markers.filter((m) => !html.includes(m));
      if (missing.length) fail(`${route} missing markers: ${missing.join(' | ')}`);
      else console.log('ok  ', route);
    } catch (e) {
      fail(`${route} -> ${e.message}`);
    }
  }

  // Archive download integrity from production bytes.
  try {
    const res = await fetch(BASE + ARCHIVE_URL, { redirect: 'follow' });
    if (res.status !== 200) {
      fail(`${ARCHIVE_URL} -> ${res.status}`);
    } else {
      const buf = Buffer.from(await res.arrayBuffer());
      const sha = createHash('sha256').update(buf).digest('hex');
      if (sha !== EXPECTED_SHA) fail(`${ARCHIVE_URL} sha256 ${sha} != expected ${EXPECTED_SHA}`);
      else console.log('ok  ', `${ARCHIVE_URL} sha256 verified (${buf.length} bytes)`);
    }
  } catch (e) {
    fail(`${ARCHIVE_URL} -> ${e.message}`);
  }

  console.log(failures === 0 ? 'PRODUCTION VERIFICATION: ALL PASS' : `PRODUCTION VERIFICATION: ${failures} FAILURES`);
  process.exit(failures === 0 ? 0 : 1);
})();
