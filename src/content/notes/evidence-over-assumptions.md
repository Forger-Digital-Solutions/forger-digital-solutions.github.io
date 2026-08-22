---
title: "Evidence over assumptions"
description: "Why FDS treats 'it ran' and 'it worked' as two very different claims."
date: 2026-08-20
tags: ["Principles", "Engineering"]
---

A program that finishes without errors has proven one thing: it finished without errors. Whether it did the *right* thing is a separate question — and answering it is where most of the real work lives.

## Execution is not success

It's easy to conflate the two. A training run completes, a script exits cleanly, a build turns green — and it's tempting to call it done. But "it ran" only tells you the machine did *something*. "It worked" requires evidence that it did the thing you intended.

That gap is where quiet failures hide: the model that trained but learned nothing useful, the pipeline that processed every row and corrupted half of them, the feature that shipped and helped no one.

## Designing for evidence

The practical fix is to decide, up front, what evidence would convince you — and then make the system produce it:

- State the intended outcome *before* you run anything.
- Instrument the work so results are measurable, not a matter of vibes.
- Treat surprising results as information, not noise to be smoothed away.

None of this is exotic. It's mostly a discipline: refusing to accept "it ran" as a stand-in for "it worked." Everything else at FDS — evaluation, governance, reusable architecture — is built on top of that one habit.
