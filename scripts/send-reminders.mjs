// Scheduled job (GitHub Actions, every 15 minutes): emails reminders for Branches tasks.
// A task with notify = {to:[emails], days:[days before due]} gets one email per entry, sent on that day at the
// task's due time (or 09:00 if it has no time). A late or missed send still goes out, until the end of the due day.
// The job records what it sent in notify.sent so nothing goes out twice.
//
// Secrets (repo Settings → Secrets and variables → Actions):
//   FIREBASE_SERVICE_ACCOUNT  the service-account JSON from Firebase (Project settings → Service accounts)
//   GMAIL_USER                the Gmail address emails are sent from
//   GMAIL_APP_PASSWORD        a Gmail app password (myaccount.google.com/apppasswords)
// Optional: TZ_NAME (default Asia/Dubai), DRY_RUN=1 to only print what would be sent.

const TZ = process.env.TZ_NAME || 'Asia/Dubai';
const APP_URL = 'https://pauloenglerorg.github.io/branches/';

// wall-clock time in `tz` as 'YYYY-MM-DDTHH:MM', so it compares directly with due dates (which are local times)
export function nowKey(tz, now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
const dayNum = k => { const [y, m, d] = k.slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
const keyOfDay = n => { const d = new Date(n * 864e5); return d.toISOString().slice(0, 10); };
// when the email for `days` before `due` should go out, as 'YYYY-MM-DDTHH:MM'
export const sendAt = (due, days) => `${keyOfDay(dayNum(due) - days)}T${due.includes('T') ? due.split('T')[1].slice(0, 5) : '09:00'}`;
const isTask = n => n.task === true || (n.task === undefined && n.done === true);

// Which emails should go out now. nodes: {id: node}, now: 'YYYY-MM-DDTHH:MM'; returns [{node, keys, diff}]
export function pickEmails(nodes, now) {
  const out = [];
  for (const n of Object.values(nodes)) {
    const f = n.notify;
    if (!f || !isTask(n) || n.done || !n.due || !(f.to || []).length || !(f.days || []).length) continue;
    if (now > `${n.due.slice(0, 10)}T23:59`) continue;      // the due day is over
    const sent = f.sent || {};
    const pending = f.days.filter(d => sendAt(n.due, d) <= now && !sent[`${n.due}|${d}`]);
    if (pending.length) out.push({ node: n, keys: pending.map(d => `${n.due}|${d}`), diff: dayNum(n.due) - dayNum(now) });
  }
  return out;
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function pathOf(n, nodes) {
  const p = []; let c = n.parent && nodes[n.parent], g = 0;
  while (c && g++ < 50) { p.unshift(c.title || 'Untitled'); c = c.parent && nodes[c.parent]; }
  return p.join(' › ');
}
function dueText(due) {
  const [ds, ts] = due.split('T'); const [y, m, d] = ds.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  return ts ? `${date} at ${ts}` : date;
}
export function buildEmail(n, nodes, diff) {
  const title = n.title || 'Untitled';
  const when = diff === 0 ? 'today' : diff === 1 ? 'tomorrow' : `in ${diff} days`;
  const subject = diff === 0 ? `Today: ${title}` : `Reminder: ${title} (due ${when})`;
  const path = pathOf(n, nodes), items = n.items || [], links = n.links || [];
  const lines = [title, '', `Due ${when}: ${dueText(n.due)}`];
  if (path) lines.push(`In: ${path}`);
  if (items.length) lines.push('', 'Checklist:', ...items.map(i => `${i.done ? '[x]' : '[ ]'} ${i.text}`));
  if (links.length) lines.push('', 'Links:', ...links.map(l => (l.label ? `${l.label}: ` : '') + l.url));
  lines.push('', `Sent by Branches · ${APP_URL}`);
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.5;color:#1B2025">
<h2 style="margin:0 0 6px;font-size:20px">${esc(title)}</h2>
<p style="margin:0 0 4px"><b>Due ${esc(when)}:</b> ${esc(dueText(n.due))}</p>
${path ? `<p style="margin:0 0 4px;color:#66707A">In: ${esc(path)}</p>` : ''}
${items.length ? `<p style="margin:14px 0 4px"><b>Checklist</b></p><ul style="margin:0;padding-left:20px">${items.map(i => `<li${i.done ? ' style="text-decoration:line-through;color:#66707A"' : ''}>${esc(i.text)}</li>`).join('')}</ul>` : ''}
${links.length ? `<p style="margin:14px 0 4px"><b>Links</b></p><ul style="margin:0;padding-left:20px">${links.map(l => `<li><a href="${esc(l.url)}">${esc(l.label || l.url)}</a></li>`).join('')}</ul>` : ''}
<p style="margin:18px 0 0;font-size:12px;color:#66707A">Sent by <a href="${APP_URL}" style="color:#66707A">Branches</a></p></div>`;
  return { subject, text: lines.join('\n'), html };
}

async function main() {
  const dry = !!process.env.DRY_RUN;
  if (!process.env.FIREBASE_SERVICE_ACCOUNT && !process.env.GMAIL_APP_PASSWORD) {
    console.log('Email reminders are not set up yet (no secrets), so nothing to do.'); return;
  }
  for (const k of ['FIREBASE_SERVICE_ACCOUNT', ...(dry ? [] : ['GMAIL_USER', 'GMAIL_APP_PASSWORD'])])
    if (!process.env[k]) throw new Error(`Missing secret ${k}. Add it in the repo's Settings → Secrets and variables → Actions.`);
  const { default: admin } = await import('firebase-admin');
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  const db = admin.firestore();
  const mailer = dry ? null : (await import('nodemailer')).default.createTransport({
    service: 'gmail', auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, '') },
  });

  const now = nowKey(TZ);
  const users = await db.collection('users').listDocuments();
  let sent = 0;
  let reads = 0;
  for (const u of users) {
    // read only boxes with an email reminder (keeps Firestore reads tiny however big the board is)
    const snap = await u.collection('nodes').where('notify', '!=', null).get();
    reads += Math.max(1, snap.size);
    const nodes = Object.fromEntries(snap.docs.map(d => [d.id, { ...d.data(), id: d.id }]));
    const due = pickEmails(nodes, now);
    // fetch the boxes above the ones being emailed, for the "In: A › B" line
    for (let pass = 0, need; pass < 20 && (need = [...new Set(due.flatMap(({ node }) => {
      const ids = []; let c = node.parent;
      while (c && nodes[c]) c = nodes[c].parent;
      if (c) ids.push(c); return ids;
    }))]).length; pass++) {
      const docs = await db.getAll(...need.map(id => u.collection('nodes').doc(id)));
      reads += docs.length;
      for (const d of docs) nodes[d.id] = d.exists ? { ...d.data(), id: d.id } : { id: d.id, title: '' };
    }
    for (const { node, keys, diff } of due) {
      const mail = buildEmail(node, nodes, diff);
      const to = node.notify.to.filter(e => /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(e));
      if (!to.length) continue;
      if (dry) { console.log(`[dry run] would email ${to.join(', ')}: ${mail.subject}`); continue; }
      await mailer.sendMail({ from: `Branches <${process.env.GMAIL_USER}>`, to: to.join(', '), subject: mail.subject, text: mail.text, html: mail.html });
      const ref = u.collection('nodes').doc(node.id), stamp = new Date().toISOString();
      await ref.update(...keys.flatMap(k => [new admin.firestore.FieldPath('notify', 'sent', k), stamp]));
      console.log(`Emailed ${to.length} recipient(s): ${mail.subject}`);
      sent++;
    }
  }
  console.log(`${now} (${TZ}): ${sent} email(s) sent, ${reads} Firestore read(s).`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch(e => { console.error(e.message || e); process.exit(1); });
}
