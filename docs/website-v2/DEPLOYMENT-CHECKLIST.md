# Website V2 review and deployment checklist

## Pull request #3 — before merge

- [ ] Review the final source and documentation diff; confirm no unrelated files, secrets, or private assets were added.
- [ ] Confirm the final feature-branch commit is the PR head and GitHub Actions ran against that exact commit.
- [ ] Require the repository's existing security, dependency, unit, content, Astro build, link, and browser checks; investigate failures rather than weakening gates.
- [ ] Confirm the generated Pages artifact contains `dist/index.html`, all current project routes, sitemap, and expected assets.
- [ ] Review V23/integration and game evidence language; keep unverified claims explicitly qualified.
- [ ] Obtain owner review/approval before merging to `main`. This work must not merge or deploy itself.

## After an owner-approved merge

- [ ] Verify the Actions deployment completed from the merged `main` commit and inspect the deployed artifact/run.
- [ ] Verify `https://forgerdigitalsolutions.com` and `https://www.forgerdigitalsolutions.com` by HTTPS request and browser navigation; record actual redirects and certificate status.
- [ ] Verify project navigation, CodeForge and ForgerEMS release links, ForgerEMS video facade, images, footer/support/legal links, and Notes routes.
- [ ] Verify 360px/390px mobile, tablet, desktop, keyboard navigation, and reduced-motion behavior; inspect browser console/network results.
- [ ] Check the exact current portfolio and retired-route expectations, and rerun production-build internal-link validation.
- [ ] Record the deployed commit, GitHub Pages run, observed domain behavior, and any owner-controlled follow-up.

## Owner-controlled GitHub Pages or DNS changes

No Pages setting, registrar, DNS record, domain verification, or certificate setting is changed by this PR. If production verification shows one of these is misconfigured, stop and report the observed evidence. Ask the repository/domain owner to check **Settings → Pages** for the custom domain, Actions publishing source, and HTTPS enforcement, then compare the actual registrar DNS to GitHub Pages' current published instructions for that verified domain. Do not add, delete, or replace A/AAAA/CNAME records by guesswork.

## Rollback

Use a reviewed revert pull request or restore a known-good deployment through the repository's protected workflow. Do not force-push `main`, rewrite Git history, bypass required checks, or use DNS changes as a source rollback.

## Recommended repository safeguards

After recovery, protect `main` against direct pushes and force pushes; require pull requests, an owner/human review, and the security, test, and build checks as required status checks. Retain GitHub Actions artifacts and Pages deployment history, and maintain a private Git mirror or scheduled repository backup that preserves Git history.
