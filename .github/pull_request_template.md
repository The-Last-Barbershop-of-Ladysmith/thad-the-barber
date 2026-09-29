## Summary

<!-- What changed and why, in a few bullets. -->

-

## Issues

<!--
Closes #   (use one line per issue)
Closing keywords only fire when the change reaches `main`. For a PR into `dev/*`,
close the issue by hand after merging, with a comment linking this PR.
-->

Closes #

## Tests added

- [ ] Component specs (Vitest), including an `expectNoAxeViolations` check for each new state
- [ ] Unit specs (reducers, selectors, effects, services, utils)
- [ ] API tests (xUnit), if the API changed
- [ ] Playwright scenarios (mocked API), including axe
- [ ] Not applicable (docs or config only)

## Screenshots

<!-- UI changes: before/after at 390px (mobile) and 1280px (desktop). Delete this section if nothing visual changed. -->

| | Before | After |
| --- | --- | --- |
| 390px | | |
| 1280px | | |

## Checklist

- [ ] Branch is `Topic/<issue#>-<slug>` off the active `dev/*` branch, and this PR targets it
- [ ] `npm run lint`, `npm test` and `npm run build` pass locally
- [ ] No business fact is hardcoded; business rules changed in `docs/business-rules.md` with their `BR-` ID
- [ ] Docs updated if behavior changed (README, `docs/`, wireframe audit)
- [ ] Merge as **squash** (topic → dev). Long-lived branches (dev → release → main) use a **merge commit**
