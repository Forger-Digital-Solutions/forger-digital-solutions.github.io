# Website V2 deployment checklist

## Before merge

- [ ] Review the complete V2 diff and confirm no unrelated or secret-bearing changes.
- [ ] Confirm `npm ci`, `npm test`, and `npm run validate` pass on the pull request head.
- [ ] Confirm Playwright browser certification passes or document and fix every migration-related failure.
- [ ] Confirm the built artifact contains `dist/index.html`, current project pages, sitemap, and expected static assets.
- [ ] Review the GitHub Pages Actions run and artifact; do not infer public availability from a successful build alone.
- [ ] Obtain owner approval before merging to `main`. Do not deploy from the feature branch or change DNS, Pages settings, Cloudflare services, credentials, or paid infrastructure.

## After an approved merge

- [ ] Verify the Pages deployment completed from the merged `main` commit and the deployment artifact is the expected build.
- [ ] Check `https://forgerdigitalsolutions.com` and `https://www.forgerdigitalsolutions.com` for successful HTTPS responses and expected redirects.
- [ ] Check navigation, all seven current project pages, downloads, static assets, footer/support/legal links, and the Notes index.
- [ ] Verify legacy GEMS/Training Grounds/KyraBlox project routes are not generated or linked from the current public catalog.
- [ ] Test desktop and narrow mobile layouts, keyboard navigation, focus, and reduced-motion behavior.
- [ ] Review browser console/network output for unexpected errors and check internal links for 404s.
- [ ] Record the deployed commit, Pages run, observed domain behavior, and any owner-controlled DNS or repository-setting actions that remain.

## Rollback

Use a reviewed revert pull request or restore a known-good deployment through the repository's normal protected workflow. Do not force-push `main`, rewrite history, or change DNS records to compensate for a source issue.
