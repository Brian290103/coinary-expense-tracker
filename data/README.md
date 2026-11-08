# Sample backup fixture

`sample-profile-backup.json` is a deterministic KES demo ledger for testing import.

## Regenerate

Run manually (no install needed, uses only node builtins):

```
node scripts/make-sample-backup.mjs
```

Output is byte-identical on every run (seeded PRNG). Edit the script to tweak
the distribution, then re-run.

## Contents

- ~150 transactions, 2026-07-01 → 2026-11-07, currency `KES`
- 5 monthly salaries, rent, savings, subscriptions, KPLC, water, bank charges
- Weekly Saturday groceries, weekday matatu fares, Monday airtime top-ups
- Discretionary spread across food/shopping/health/education/entertainment/travel/gifts/fees
- 1 freelance income + 1 M-Pesa reversal
- 2 soft-deleted records (Trash screen test data)
- 4 November 2026 budgets (groceries, transport, food, entertainment)
- 3 goals: Emergency fund (achieved), New phone (~60%), December holiday (~10%)
- 4 recurring rules: rent + salary + weekly groceries (active), gym (paused)
- Default categories + Cash / Mobile Money / Bank accounts
- `app-settings` (KES, `en-KE`, system theme, onboarded)

## Test flow

1. Create a profile named **Demo** (currency KES).
2. Switch to it → Import JSON backup → **Replace**.
3. Verify: Insights forecast card appears (3 full months history), Budgets
   screen is pre-filled, search/filters work, export round-trips.
4. Delete the Demo profile when done.
