# Forger Digital Solutions — Publication Governance & Truthfulness Standard

**Effective Date:** 2026-11-26  
**Governing Companion Docs:** `DESIGN.md`, `BRAND_GUIDELINES.md`, `docs/FDS_MODEL_STATUS_SCHEMA.json`

---

## 1. Core Publication Axioms

Every public claim published on `forgerdigitalsolutions.com` is bound by four non-conflation axioms enforced across Project Forge, model cards, evaluations, and release pages:

1. **Research ≠ Training:** Studying a discipline or maintaining internal research notes does not mean data is legally cleared for model training or that a model has been trained.
2. **Training ≠ Evaluation:** Completing a fine-tuning run does not prove capability improvement or generalization.
3. **Evaluation ≠ Certification:** Passing internal experiments or single-suite checks does not certify production reliability or comparative frontier performance.
4. **Certification ≠ Public Availability:** Internal capability milestones remain private until weights, installers, or endpoints are explicitly approved, packaged, checksummed, and published.

---

## 2. Publication Approval Checklist

Before promoting any technology status in `content/public-status/registry.json` or adding numerical benchmark scores to `content/evaluations/evaluations.json`, the maintainer must verify:

- [ ] **Owner Approval:** Explicit owner sign-off for any public release, benchmark export, pricing, platform commitment, or production deployment.
- [ ] **Exact Versioning:** Exact model lineage/checkpoint ID or software semantic version + Git commit SHA recorded.
- [ ] **Evaluation Completeness (if publishing scores):** All 10 required fields populated — model version, benchmark version, test count (`n`), evaluation conditions, raw result, guarded result, comparison baseline, uncertainty interval, known limitations, and date.
- [ ] **Binary Integrity (if publishing downloads):** Exact byte size, OS/architecture, signing posture (explicitly noting unsigned prereleases / SmartScreen warnings), and verified 64-character SHA-256 digest.
- [ ] **Media Honesty Labeling:** Concept art explicitly labeled `Concept Art — Work in Progress (Not Gameplay)`; illustrative diagrams labeled as architecture schematics, never disguised as live application screenshots or gameplay captures.
- [ ] **Zero Private Leakage:** Verified zero internal paths, local hostnames, API secrets, private cloud folder structures, or unreleased plot spoilers.
- [ ] **Automated Gate Pass:** `npm test && npm run validate && npm run kayla:deploy:check && npm run kayla:secret-scan && npm run worker:build` passes with zero errors.

---

## 3. Prohibited Claims & Patterns

- Never fabricate benchmark leaderboards, aggregate unrelated scores into synthetic indices, or claim to outperform named frontier models without valid owner-approved comparative evidence.
- Never claim open-weight foundation availability (`Qwen/Qwen3.8-27B`, `openai/gpt-oss-120b`) as completed FDS fine-tuning.
- Never present Cinnabar Oracle text models as native video/animation generators or display unauthorized copyrighted anime/manga franchise artwork.
- Never present Forge BattleVerse probabilistic simulation outputs as objective canonical truth.
- Never publish fake API key generators, fake hosted inference playgrounds, fake commercial checkout flows, or unverified `SOC 2` / `ISO 27001` / `HIPAA` badges.
- Never use obsolete mode names for Jaspilite — only owner-approved **`Auto`**, **`Meld`**, and **`Solo`**.

---

## 4. Correction & Retraction Policy

When an error, outdated status, broken checksum, or inaccurate technical framing is identified (internally or via `forgerdigisolsupport@gmail.com`):

1. Reproduce and verify against canonical source evidence.
2. Update `content/public-status/registry.json` (and any affected page/model card) with the updated `last_verified` date.
3. Record material public corrections transparently in `/changelog/`.
