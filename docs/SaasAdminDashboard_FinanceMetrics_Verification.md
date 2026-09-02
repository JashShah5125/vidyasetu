# SaaS Admin Dashboard — Finance Metrics Verification

This document explains the **logic and full calculation** behind every finance value shown on the SaaS Admin Dashboard. All values are derived **only** from the `saas_invoices` table (no mock data).

- Source table: `saas_invoices` (unified invoice/payment table)
- Reference date for "current period" checks: **2026-09-02**
- Currency: INR

---

## Underlying Data (all `saas_invoices` rows)

| Invoice | Tenant | Plan | Cycle | Period Start → End | Subtotal | Tax | Total | Status | Paid Date | Tenant Sub Status |
|---|---|---|---|---|---|---|---|---|---|---|
| INV-2026-0001 | Allen | Pro | yearly | 2026-01-01 → 2027-01-01 | 179,991.00 | 32,398.38 | 212,389.38 | paid | 2026-01-02 | active |
| INV-2026-0002 | Aakash | Growth | monthly | 2026-08-15 → 2026-09-15 | 4,999.00 | 899.82 | 5,898.82 | paid | 2026-08-16 | active |
| INV-2026-0003 | Resonance | Starter | monthly | 2026-08-25 → 2026-09-08 | 0.00 | 0.00 | 0.00 | draft | — | trialing |
| INV-2026-0004 | Vibrant | Growth | yearly | 2026-02-01 → 2027-02-01 | 47,490.50 | 8,548.29 | 56,038.79 | paid | 2026-02-02 | active |
| INV-2026-0005 | Bansal | Pro | lifetime | 2026-03-01 → 2099-12-31 | 99,995.00 | 17,999.10 | 117,994.10 | paid | 2026-03-01 | active |
| INV-2026-0006 | Physics Wallah | Pro | monthly | 2026-09-01 → 2026-10-01 | 19,999.00 | 3,599.82 | 23,598.82 | paid | 2026-09-01 | active |
| INV-2026-0007 | Unacademy | Pro | yearly | 2026-04-01 → 2027-04-01 | 159,992.00 | 28,798.56 | 188,790.56 | paid | 2026-04-01 | active |
| INV-2026-0008 | Vedantu | Growth | monthly | 2026-06-01 → 2026-07-01 | 4,999.00 | 899.82 | 5,898.82 | paid | 2026-06-02 | past_due |
| INV-2026-0009 | Vedantu | Growth | monthly | 2026-07-01 → 2026-08-01 | 4,999.00 | 899.82 | 5,898.82 | overdue | — | past_due |
| INV-2025-0001 | FIITJEE | Pro | yearly | 2025-01-01 → 2026-01-01 | 199,990.00 | 35,998.20 | 235,988.20 | overdue | — | canceled |

---

## 1. Total Revenue (Inc. Tax) — ₹6,10,609.29

**Logic:** `SUM(total_amount)` of all invoices where `status = 'paid'`.

```
INV-0001 Allen     212,389.38
INV-0002 Aakash      5,898.82
INV-0004 Vibrant    56,038.79
INV-0005 Bansal    117,994.10
INV-0006 PW         23,598.82
INV-0007 Unacademy 188,790.56
INV-0008 Vedantu     5,898.82
────────────────────────────
TOTAL              610,609.29
```

*Excluded:* INV-0003 (draft), INV-0009 & INV-2025-0001 (overdue).

---

## 2. Net Revenue (Ex-GST) — ₹5,17,465.50

**Logic:** `SUM(subtotal)` (the pre-GST amount) for the same paid invoices.

```
179,991 + 4,999 + 47,490.50 + 99,995 + 19,999 + 159,992 + 4,999 = 517,465.50
```

---

## 3. GST Collected — ₹93,143.79

**Logic:** `SUM(tax_amount)` for paid invoices. Also equals Total Revenue − Net Revenue.

```
32,398.38 + 899.82 + 8,548.29 + 17,999.10 + 3,599.82 + 28,798.56 + 899.82 = 93,143.79
```

*Check:* 610,609.29 − 517,465.50 = 93,143.79 ✓

---

## 4. Outstanding — ₹2,41,887.02

**Logic:** `SUM(total_amount)` where `status IN ('unpaid','overdue')`.

```
INV-0009 Vedantu   5,898.82   (overdue)
INV-2025 FIITJEE 235,988.20   (overdue)
────────────────────────────
TOTAL            241,887.02
```

---

## 5. MRR (Current Period) — ₹70,876.82

**Logic:** Include only invoices that are **paid**, and whose tenant `subscription_status = 'active'`, **and** where the reference date (2026-09-02) falls within `billing_period_start..billing_period_end`. Then normalize `total_amount` to a monthly value using the billing-cycle divisor.

| Invoice | Cycle | Paid Total | Divisor | Monthly Contribution |
|---|---|---|---|---|
| Allen | yearly | 212,389.38 | 12 | 17,699.12 |
| Aakash | monthly | 5,898.82 | 1 | 5,898.82 |
| Vibrant | yearly | 56,038.79 | 12 | 4,669.90 |
| Bansal | lifetime | 117,994.10 | 36 | 3,277.61 |
| Physics Wallah | monthly | 23,598.82 | 1 | 23,598.82 |
| Unacademy | yearly | 188,790.56 | 12 | 15,732.55 |
| **Total** | | | | **70,876.82** |

**Cycle divisors:** `monthly` = 1, `quarterly` = 3, `half_yearly` = 6, `yearly` = 12, `lifetime` = 36.

**Excluded:**
- Resonance — status `draft`, tenant `trialing`
- Vedantu INV-0008 / INV-0009 — tenant `past_due`, period outside range
- FIITJEE — status `overdue`, tenant `canceled`

---

## 6. ARR (Annual Recurring Revenue) — ₹8,50,521.84

**Logic:** `MRR × 12`

```
70,876.82 × 12 = 850,521.84
```

---

## 7. Revenue Trend Chart (cumulative, 2026)

**Logic:** For every paid invoice, add its `total_amount` to the month of its `payment_date`. Then compute a **running cumulative total** across the current year (2026). Since there are no paid pre-2026 invoices (the 2025 FIITJEE invoice is `overdue`), the running total starts at 0.

| Month | Added this month | Cumulative |
|---|---|---|
| Jan | 212,389.38 | 212,389.38 |
| Feb | 56,038.79 | 268,428.17 |
| Mar | 117,994.10 | 386,422.27 |
| Apr | 188,790.56 | 575,212.83 |
| May | 0 | 575,212.83 |
| Jun | 5,898.82 | 581,111.65 |
| Jul | 0 | 581,111.65 |
| Aug | 5,898.82 | 587,010.47 |
| Sep (current) | 23,598.82 | 610,609.29 |
| Oct–Dec | 0 | 610,609.29 |

Bar heights are scaled by `raw_val / max(610,609.29) × 85%`.

The September (current) cumulative value (₹6.11L) equals Total Revenue, confirming consistency.

---

## Summary of Dashboard Values

| Metric | Value |
|---|---|
| Total Revenue (Inc. Tax) | ₹6,10,609.29 |
| Net Revenue (Ex-GST) | ₹5,17,465.50 |
| GST Collected | ₹93,143.79 |
| Outstanding | ₹2,41,887.02 |
| MRR (Current Period) | ₹70,876.82 |
| ARR | ₹8,50,521.84 |
| Revenue Trend (Sep cumulative) | ₹6,10,609.29 |

---

## Consistency Checks

- Total Revenue = Net Revenue + GST → 610,609.29 = 517,465.50 + 93,143.79 ✓
- Sep cumulative trend = Total Revenue = ₹6.11L ✓
- Each per-tenant total matches the seeded plan arithmetic (e.g. Allen: 199,990 × 0.90 discount = 179,991 subtotal; +18% GST = 212,389.38 total) ✓
