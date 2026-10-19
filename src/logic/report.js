// The trip's PDF summary as HTML (SPEC §13 "PDF export"). Pure, so it can
// be tested; the app turns it into an A4 PDF and shares it.

import { findCategory } from './categories';
import { formatDate, formatTripDates, toIsoDate } from './dates';
import { formatRupees } from './format';
import { wholePercentages } from './insights';
import { activeExpenses, computeBalances, totalSpent, totalsByCategory } from './money';
import { netsAfterPayments } from './settlements';
import { isSettling, peopleLabel } from './trips';

// Text from users must never be read as HTML.
export function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const STATUS_LABELS = { active: 'Active', reopened: 'Reopened', closed: 'Closed', final: 'Final' };

// "Goa trip – summary.pdf" without characters that file systems dislike.
export function reportFileName(tripName) {
  const safe = String(tripName ?? 'Trip')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
  return `${safe || 'Trip'} – summary.pdf`;
}

const STYLES = `
  @page { margin: 28px; }
  * { box-sizing: border-box; }
  body { font-family: sans-serif; color: #0F172A; font-size: 11px; line-height: 1.45; margin: 0; }
  h1 { font-size: 22px; margin: 0 0 2px; color: #0F766E; font-weight: 600; }
  h2 { font-size: 13px; margin: 18px 0 6px; color: #0F766E; font-weight: 600;
       border-bottom: 1px solid #E2E8F0; padding-bottom: 3px; }
  .muted { color: #64748B; }
  .note { background: #FEF3C7; color: #92400E; padding: 6px 10px; border-radius: 6px; margin-top: 10px; }
  .cards { display: flex; gap: 10px; margin-top: 12px; }
  .card { flex: 1; background: #E6F6F4; border-radius: 8px; padding: 8px 10px; }
  .card b { display: block; font-size: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-weight: 600; color: #64748B; font-size: 10px;
       border-bottom: 1px solid #E2E8F0; padding: 4px 6px; }
  td { padding: 4px 6px; border-bottom: 1px solid #F1F5F9; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; }
  .pos { color: #15803D; } .neg { color: #B91C1C; }
  .day td { background: #F8FAFC; font-weight: 600; color: #475569; }
  .bar { height: 8px; border-radius: 4px; }
  .paid { color: #15803D; font-weight: 600; } .unpaid { color: #B91C1C; }
  tr { page-break-inside: avoid; }
  .footer { margin-top: 18px; font-size: 9px; color: #94A3B8; text-align: center; }
`;

function settleUpSection(settlements, nameOf) {
  const current = settlements.filter((s) => !s.isRecordedPayment);
  const earlier = settlements.filter((s) => s.isRecordedPayment);
  const rows = (list) =>
    list
      .map(
        (s) => `<tr>
          <td>${escapeHtml(nameOf(s.fromPid))} pays ${escapeHtml(nameOf(s.toPid))}</td>
          <td class="num">${formatRupees(s.amount)}</td>
          <td class="num ${s.isPaid ? 'paid' : 'unpaid'}">${s.isPaid ? 'Paid' : 'Not paid'}</td>
        </tr>`,
      )
      .join('');

  let html = '<h2>Settle up</h2>';
  html += current.length
    ? `<table><tr><th>Payment</th><th class="num">Amount</th><th class="num">Status</th></tr>${rows(current)}</table>`
    : '<p class="muted">Everyone’s settled up. Nothing to pay.</p>';
  if (earlier.length) {
    html += `<p class="muted" style="margin:10px 0 4px">Earlier payments</p>
      <table>${rows(earlier)}</table>`;
  }
  return html;
}

/**
 * Builds the report. `data` has trip, participants, expenses (may include
 * deleted ones), customCategories, settlements; `now` is the generation date.
 */
export function buildTripReportHtml(data, now = new Date()) {
  const { trip, participants, customCategories = [], settlements = [] } = data;
  const expenses = activeExpenses(data.expenses ?? []);
  const nameOf = (pid) => participants.find((p) => p.id === pid)?.name ?? 'Someone';
  const settling = isSettling(trip, now.getTime());

  // Header and summary
  let html = `<h1>${escapeHtml(trip.name)}</h1>
    <div class="muted">${escapeHtml(formatTripDates(trip.startDate, trip.endDate))} ·
      ${peopleLabel(participants.length)} · ${STATUS_LABELS[trip.status] ?? ''}</div>`;
  if (!settling) {
    html +=
      '<div class="note">Not final: the trip is still open, so these numbers may change.</div>';
  }
  html += `<div class="cards">
      <div class="card"><span class="muted">Total spent</span><b>${formatRupees(totalSpent(expenses))}</b></div>
      <div class="card"><span class="muted">Expenses</span><b>${expenses.length}</b></div>
    </div>`;

  // Settle up (only once closed)
  if (settling) html += settleUpSection(settlements, nameOf);

  // Balances, after any payments recorded before a reopen
  const balances = computeBalances(expenses, participants);
  const nets = netsAfterPayments(
    balances,
    settlements.filter((s) => s.isRecordedPayment),
  );
  html += `<h2>Balances</h2><table>
    <tr><th>Person</th><th class="num">Paid</th><th class="num">Share</th><th class="num">Net</th></tr>
    ${participants
      .map((p) => {
        const b = balances[p.id] ?? { paid: 0, share: 0 };
        const net = nets[p.id] ?? 0;
        const tone = net > 0 ? 'pos' : net < 0 ? 'neg' : '';
        return `<tr><td>${escapeHtml(p.name)}</td>
          <td class="num">${formatRupees(b.paid)}</td>
          <td class="num">${formatRupees(b.share)}</td>
          <td class="num ${tone}">${formatRupees(net, { signed: true })}</td></tr>`;
      })
      .join('')}
  </table>`;

  // Spending by category
  const totals = totalsByCategory(expenses);
  if (totals.length) {
    const percents = wholePercentages(totals.map((t) => t.total));
    html += `<h2>Spending by category</h2><table>
      ${totals
        .map((t, i) => {
          const category = findCategory(t.categoryId, customCategories);
          return `<tr>
            <td style="width:28%">${escapeHtml(category.name)}</td>
            <td style="width:44%"><div class="bar" style="width:${Math.max(percents[i], 1)}%;background:${category.color}"></div></td>
            <td class="num" style="width:10%">${percents[i]}%</td>
            <td class="num">${formatRupees(t.total)}</td>
          </tr>`;
        })
        .join('')}
    </table>`;
  }

  // All expenses, oldest first, grouped by date
  html += '<h2>All expenses</h2>';
  if (!expenses.length) {
    html += '<p class="muted">No expenses.</p>';
  } else {
    const sorted = [...expenses].sort((a, b) => a.date.localeCompare(b.date));
    let lastDate = null;
    let rows = '';
    for (const e of sorted) {
      if (e.date !== lastDate) {
        rows += `<tr class="day"><td colspan="4">${formatDate(e.date)}</td></tr>`;
        lastDate = e.date;
      }
      const category = findCategory(e.categoryId, customCategories);
      rows += `<tr>
        <td>${escapeHtml(e.description || category.name)}</td>
        <td class="muted">${escapeHtml(category.name)}</td>
        <td>${escapeHtml(nameOf(e.paidByPid))} paid</td>
        <td class="num">${formatRupees(e.amount)}</td>
      </tr>`;
    }
    html += `<table><tr><th>Description</th><th>Category</th><th>Paid by</th><th class="num">Amount</th></tr>${rows}</table>`;
  }

  html += `<div class="footer">Generated by Trip Manager on ${formatDate(toIsoDate(now))}</div>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${STYLES}</style></head><body>${html}</body></html>`;
}
