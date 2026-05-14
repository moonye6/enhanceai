# TODOS

## P0 — Critical checkpoints

### [ ] 100-page SEO build: GSC checkpoint at 30 days post-launch
**Date trigger**: 30 days after `main` reaches "100 pages live" milestone (target: 2026-06-30 at latest)
**What to check**: Google Search Console — monthly impressions on `enhanceai.online`
**Decision tree**:
- **GSC monthly imp ≥ 100** → trigger existing-page migration (see plan-eng-review D1 C). Run `/design-consultation` audit on `/`, `/pricing`, `/history` and migrate to new DESIGN.md tokens.
- **GSC monthly imp < 100** → re-evaluate kill decision. Document why this run failed vs 2026-05-12 kill ("Reddit didn't ship", "100 pages too thin", "wrong vertical"). Re-decide stay-or-kill.
**Why this is P0**: Default human behavior is to forget 30-day checkpoints. 5/05 fix → 5/12 kill checkpoint took 7 days longer than planned. Calendar reminder + GH milestone (issue tracked) avoids repeat.
**Refs**: plan-eng-review D1, CEO plan 100-page hybrid scope, DESIGN.md migration trigger spec

---

## Phase 2 candidates (from CEO review)

Activate only if GSC checkpoint passes (≥100 imp/month) AND a candidate has clear demand signal.

### [ ] B2B / API tier
Trigger: `/vs/` page conversion data shows users paying $50+/mo
Build: API endpoint + batch upload + team plan

### [ ] Video upscaling
Trigger: GSC shows "upscale video" long-tail queries with traffic
Build: fal.ai video super-res integration

### [ ] UGC gallery / "Upscale of the Week"
Trigger: Reddit community shows organic UGC traction
Build: user submission flow + moderation pipeline

### [ ] Multi-upscaler comparison tool
Trigger: /vs/ pages convert well + budget for API costs
Build: parallel API calls (aura-sr + waifu2x + ESRGAN), side-by-side render

### [ ] Affiliate / referral program
Trigger: PMF confirmed (>50 paying users)
Build: referral code + commission tracking in KV

### [ ] YouTube tutorial channel
Trigger: hub content matures + at least 1 hub ranks top 10
Build: companion videos per hub article

---

## Done

(empty — first run)
