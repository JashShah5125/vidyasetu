# Fee Metrics, Overdue Calculations & Financial Architecture

## 1. Overview & Core Philosophy

This document defines the authoritative financial metrics, formulas, and business rules for the Vidyasetu Educational ERP.

### Core Architectural Principle
The system follows a **pure Two-Table Financial Model**:
1. **`student_fee_assignments`**: Maintains the master aggregate financial agreement for the student (`gross_amount`, `total_concession`, `net_amount`, `paid_amount`, `balance_amount`, `status`).
2. **`student_invoices`**: Records actual collection events. Every payment made creates exactly one invoice row for the collected amount (`amount = paid_amount`, `balance_due = 0.00`, `status = 'paid'`).
3. **No Phantom / Scheduled Invoices**: Future installments are **not** pre-generated as unpaid invoice rows in the database. Instead, installment schedules are derived rules used to compute **Expected Due as of Date $T$**.

---

## 2. Definitive Glossary of Financial Metrics

| Metric | Business Definition | Typical Question Answered |
| :--- | :--- | :--- |
| **Gross Amount** | Base list price of the course / program / subject bundle before concessions. | *"What is the standard price?"* |
| **Total Concession** | Total approved scholarships, discounts, or fee waivers. | *"How much discount was provided?"* |
| **Net Payable Amount** | Total contracted financial obligation for the student over the full tenure. | *"What is the total money the student owes in total?"* |
| **Total Paid Amount** | Cumulative sum of all successful payments collected to date. | *"How much money has the institute actually received?"* |
| **Total Remaining Balance** | Total uncollected balance remaining on the student's contract. | *"How much is left to be collected over the entire year?"* |
| **Expected Due (Till Date $T$)**| Cumulative amount that the student was scheduled to pay up to date $T$. | *"According to the payment plan, how much should have been paid by today?"* |
| **Outstanding / Overdue** | The unpaid shortfall between what was expected by today and what was paid. | *"Is this student late/defaulter right now, and by what exact amount?"* |
| **Advance Paid Amount** | Excess amount paid beyond the scheduled cumulative expectation as of today. | *"Has the parent prepaid future installments in advance?"* |
| **Future Balance (Not Yet Due)** | The portion of the remaining balance whose scheduled due dates are in the future. | *"How much remaining fee is not yet due?"* |

---

## 3. Mathematical Formulas

Let:
- $G$ = Gross Amount
- $C$ = Total Concession ($0 \le C \le G$)
- $N$ = Net Payable Amount ($N = G - C$)
- $P$ = Total Paid Amount ($\sum \text{invoices.paid\_amount}$)
- $D_0$ = Down Payment (due at enrollment date $t_0$)
- $k$ = Total number of installments
- $I_j$ = Scheduled amount for installment $j$ ($1 \le j \le k$)
- $t_j$ = Due date for installment $j$
- $T$ = Current evaluation date (e.g., `CURRENT_DATE`)

### 3.1 Net Payable Amount ($N$)
$$N = \max(0,\; G - C)$$

### 3.2 Total Remaining Balance ($B$)
$$B = \max(0,\; N - P)$$

### 3.3 Expected Cumulative Due as of Date $T$ ($E_T$)
$$E_T = \begin{cases} 
D_0 + \sum_{j=1}^{k} \Big( I_j \cdot \mathbb{I}(t_j \le T) \Big) & \text{if installment schedule is defined} \\
N & \text{if single upfront payment plan}
\end{cases}$$
*(Where $\mathbb{I}(t_j \le T) = 1$ if installment due date $t_j \le T$, else $0$)*

> **Upper Bound Constraint**: $E_T \le N$ (Expected due cannot exceed total net contract).

### 3.4 Outstanding / Overdue Amount as of Date $T$ ($O_T$)
$$O_T = \max\Big(0,\; E_T - P\Big)$$

### 3.5 Advance Paid Amount ($A_T$)
$$A_T = \max\Big(0,\; P - E_T\Big)$$

### 3.6 Future Balance Not Yet Due ($F_T$)
$$F_T = \max\Big(0,\; B - O_T\Big) = \max\Big(0,\; N - \max(P, E_T)\Big)$$

---

## 4. Operational Scenarios & Walkthroughs

### Scenario 1: Strict Schedule Compliance
- **Course**: JEE 1-Year Comprehensive
- **Net Fee ($N$)**: ₹1,00,000
- **Plan**:
  - Down Payment: ₹20,000 (Due: June 1)
  - Installment 1: ₹20,000 (Due: July 1)
  - Installment 2: ₹20,000 (Due: August 1)
  - Installment 3: ₹20,000 (Due: September 1)
  - Installment 4: ₹20,000 (Due: October 1)
- **Status on September 15**:
  - Parent paid ₹20k (June) + ₹20k (July) + ₹20k (Aug) + ₹20k (Sept) = **₹80,000 Paid ($P$)**.

**Calculations**:
1. Expected Due ($E_{\text{Sept 15}}$) = ₹20k + ₹20k + ₹20k + ₹20k = **₹80,000**
2. Total Remaining Balance ($B$) = ₹1,00,000 − ₹80,000 = **₹20,000**
3. Outstanding / Overdue ($O$) = $\max(0, 80,000 - 80,000) =$ **₹0**
4. Future Not Yet Due ($F$) = **₹20,000** (Installment 4 due in October)
- **Resulting UI Badge**: `On Schedule` (Green)

---

### Scenario 2: Variable / Irregular Payments (Defaulter Detection)
- **Same Plan as Scenario 1** (Expected by Sept 15 = ₹80,000).
- **Actual Collections**:
  - June: ₹15,000
  - July: ₹10,000
  - August: ₹25,000
  - September: ₹0
  - **Total Paid ($P$)**: **₹50,000**

**Calculations**:
1. Total Remaining Balance ($B$) = ₹1,00,000 − ₹50,000 = **₹50,000**
2. Expected Due ($E_{\text{Sept 15}}$) = **₹80,000**
3. Outstanding / Overdue ($O$) = $\max(0, 80,000 - 50,000) =$ **₹30,000 Overdue**
4. Future Not Yet Due ($F$) = ₹50,000 − ₹30,000 = **₹20,000**
- **Resulting UI Badge**: `Overdue (₹30,000)` (Red/Amber Alert)

---

### Scenario 3: Advance Prepayment
- **Date**: July 15 (Expected by July 15 = ₹20k Down Payment + ₹20k Inst 1 = **₹40,000**).
- **Actual Collections**:
  - June: ₹20,000
  - July: ₹50,000
  - **Total Paid ($P$)**: **₹70,000**

**Calculations**:
1. Expected Due ($E_{\text{July 15}}$) = **₹40,000**
2. Total Remaining Balance ($B$) = ₹1,00,000 − ₹70,000 = **₹30,000**
3. Outstanding / Overdue ($O$) = $\max(0, 40,000 - 70,000) =$ **₹0**
4. Advance Paid ($A$) = ₹70,000 − ₹40,000 = **₹30,000 Prepaid** (Covers Inst 2 + partial Inst 3).
- **Resulting UI Badge**: `Prepaid / Compliant` (Emerald Green)

---

## 5. UI Status Classification Matrix

| Condition | Status Code | UI Label | Badge Color | Meaning |
| :--- | :--- | :--- | :--- | :--- |
| $P \ge N$ ($B = 0$) | `paid` | **Fully Paid** | Emerald Green | Student has paid all course fees. No balance. |
| $P < N$ and $O_T = 0$ | `partial` / `on_schedule` | **On Schedule** | Slate / Blue | Student owes future balance, but 0 overdue today. |
| $P < N$ and $O_T > 0$ | `partial` / `overdue` | **Overdue** | Amber / Crimson | Student has missed or underpaid scheduled commitments. |
| $P = 0$ and $E_T > 0$ | `unpaid` | **Unpaid / Overdue** | Red | Zero payments received despite dues passed. |

---

## 6. Implementation Reference (JavaScript / Node.js)

```javascript
/**
 * Computes authoritative fee metrics for a student given their fee assignment and current date.
 * 
 * @param {Object} feeAssignment - Row from student_fee_assignments
 * @param {Date} [asOfDate=new Date()] - Date to evaluate scheduled dues against
 * @returns {Object} Normalized financial metrics
 */
function calculateStudentFeeMetrics(feeAssignment, asOfDate = new Date()) {
    const gross = Number(feeAssignment.gross_amount) || 0;
    const concession = Number(feeAssignment.total_concession) || 0;
    const net = Math.max(0, gross - concession);
    const paid = Number(feeAssignment.paid_amount) || 0;
    const remainingBalance = Math.max(0, net - paid);

    const downPayment = Number(feeAssignment.down_payment) || 0;
    const installmentCount = Math.max(1, Number(feeAssignment.installment_count) || 1);
    const installmentAmount = Number(feeAssignment.installment_amount) || 0;

    // Determine expected due by evaluating installment due dates
    // (If installments table or dynamic monthly schedule is used)
    let expectedDueTillDate = downPayment;
    const startDate = new Date(feeAssignment.created_at || asOfDate);

    for (let i = 1; i <= installmentCount; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i); // 30-day / monthly cadence
        if (dueDate <= asOfDate) {
            expectedDueTillDate += installmentAmount;
        }
    }
    expectedDueTillDate = Math.min(net, expectedDueTillDate);

    const overdueAmount = Math.max(0, expectedDueTillDate - paid);
    const advancePaid = Math.max(0, paid - expectedDueTillDate);
    const futureBalance = Math.max(0, remainingBalance - overdueAmount);

    let complianceStatus = 'on_schedule';
    if (remainingBalance <= 0) {
        complianceStatus = 'paid';
    } else if (overdueAmount > 0) {
        complianceStatus = 'overdue';
    } else if (paid === 0) {
        complianceStatus = 'unpaid';
    }

    return {
        grossAmount: gross,
        totalConcession: concession,
        netAmount: net,
        paidAmount: paid,
        remainingBalance,
        expectedDueTillDate,
        overdueAmount,
        advancePaid,
        futureBalance,
        complianceStatus
    };
}
```

---

## 7. Database Integrity Guarantees

1. **Atomic Fee Write Lock**:
   Payment collection must acquire a transactional lock on the student's assignment:
   ```sql
   SELECT * FROM student_fee_assignments WHERE id = ? FOR UPDATE;
   ```
2. **Strict Non-Negative Balance**:
   ```sql
   ALTER TABLE student_fee_assignments
   ADD CONSTRAINT chk_balance_non_negative CHECK (balance_amount >= 0.00);
   ```
3. **Audit Trail**:
   Every payment creates a single immutable `student_invoices` row capturing `payment_mode`, `transaction_reference`, `created_by`, `amount`, and `payment_date`.
