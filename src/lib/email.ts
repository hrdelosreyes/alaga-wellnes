// ============================================================
//  Alaga Wellness — transactional email (Resend)
// ============================================================
// Sends branded customer emails via the Resend API. Uses the
// verified domain alagawellness.care. Requires RESEND_API_KEY.

const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const FROM = 'Alaga Wellness <bookings@alagawellness.care>'

const BRAND = {
  terracotta: '#C4714A',
  cream:      '#FBF6F0',
  charcoal:   '#2C2420',
  stone:      '#8C7B70',
  sage:       '#6B8C6E',
  gold:       '#C9A84C',
  border:     '#EDE5DF',
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://alagawellness.care'

/**
 * Send an email via Resend. Never throws — logs and returns false on
 * failure so callers (webhooks) don't break their main flow.
 */
export async function sendEmail(opts: {
  to: string
  subject: string
  html: string
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('sendEmail: RESEND_API_KEY not set — skipping')
    return false
  }
  if (!opts.to) {
    console.error('sendEmail: no recipient — skipping')
    return false
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    FROM,
        to:      [opts.to],
        subject: opts.subject,
        html:    opts.html,
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error('Resend send failed:', res.status, body)
      return false
    }
    return true
  } catch (err) {
    console.error('Resend send error:', err)
    return false
  }
}

// ── Branded HTML shell ─────────────────────────────────────────
function shell(heading: string, bodyHtml: string, ctaLabel?: string, ctaHref?: string): string {
  const cta = ctaLabel && ctaHref
    ? `<tr><td style="padding:8px 0 28px;">
         <a href="${ctaHref}" style="display:inline-block;background:${BRAND.terracotta};color:#fff;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 28px;border-radius:14px;">${ctaLabel}</a>
       </td></tr>`
    : ''

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:${BRAND.cream};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.cream};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border:1px solid ${BRAND.border};border-radius:24px;overflow:hidden;">
        <tr><td style="background:${BRAND.charcoal};padding:24px 32px;">
          <span style="color:#fff;font-size:20px;font-weight:bold;letter-spacing:0.5px;">alaga <span style="color:${BRAND.terracotta};">wellness</span></span>
        </td></tr>
        <tr><td style="padding:32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding-bottom:16px;">
              <h1 style="margin:0;color:${BRAND.charcoal};font-size:22px;font-weight:bold;">${heading}</h1>
            </td></tr>
            <tr><td style="color:${BRAND.stone};font-size:15px;line-height:1.6;">
              ${bodyHtml}
            </td></tr>
            ${cta}
          </table>
        </td></tr>
        <tr><td style="background:${BRAND.cream};padding:20px 32px;border-top:1px solid ${BRAND.border};">
          <p style="margin:0;color:${BRAND.stone};font-size:12px;line-height:1.5;">
            Alaga Wellness — Wellness, delivered with care.<br>
            Need help? Reply to this email or reach us at hello@alagawellness.care
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// Reusable booking-detail block
function detailRows(rows: Array<[string, string]>): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.cream};border-radius:16px;padding:8px 0;margin:8px 0 20px;">
    ${rows.map(([label, value]) => `
    <tr>
      <td style="padding:8px 20px;color:${BRAND.stone};font-size:13px;">${label}</td>
      <td style="padding:8px 20px;color:${BRAND.charcoal};font-size:14px;font-weight:600;text-align:right;">${value}</td>
    </tr>`).join('')}
  </table>`
}

// ── Templates ───────────────────────────────────────────────────

export function emailBookingConfirmed(d: {
  firstName: string
  bookingId: string
  serviceName: string
  date: string
  time: string
  address: string
  total: string
}): { subject: string; html: string } {
  const ref = d.bookingId.slice(0, 8).toUpperCase()
  return {
    subject: `Booking confirmed — ${d.serviceName} on ${d.date}`,
    html: shell(
      `You're booked, ${d.firstName}! 🎉`,
      `<p style="margin:0 0 4px;">Your payment was received and your booking is confirmed. We're now matching you with a verified Alaga therapist — you'll get another email once they accept.</p>
       ${detailRows([
         ['Reference', `#${ref}`],
         ['Service', d.serviceName],
         ['Date', d.date],
         ['Time', d.time],
         ['Address', d.address],
         ['Total paid', d.total],
       ])}`,
      'View booking',
      `${APP_URL}/booking/${d.bookingId}`,
    ),
  }
}

export function emailTherapistAssigned(d: {
  firstName: string
  bookingId: string
  therapistName: string
  serviceName: string
  date: string
  time: string
}): { subject: string; html: string } {
  return {
    subject: `${d.therapistName} is confirmed for your ${d.date} session`,
    html: shell(
      `Your therapist is confirmed ✓`,
      `<p style="margin:0 0 4px;">Good news, ${d.firstName}! <strong style="color:${BRAND.charcoal};">${d.therapistName}</strong> has accepted your booking and will arrive at your scheduled time.</p>
       ${detailRows([
         ['Therapist', d.therapistName],
         ['Service', d.serviceName],
         ['Date', d.date],
         ['Time', d.time],
       ])}
       <p style="margin:0;">You can message your therapist and track their arrival from your booking page.</p>`,
      'Track your session',
      `${APP_URL}/booking/${d.bookingId}`,
    ),
  }
}

export function emailBookingReminder(d: {
  firstName: string
  bookingId: string
  therapistName: string | null
  serviceName: string
  date: string
  time: string
  address: string
}): { subject: string; html: string } {
  return {
    subject: `Reminder: your Alaga session is tomorrow at ${d.time}`,
    html: shell(
      `See you soon, ${d.firstName}! 🌿`,
      `<p style="margin:0 0 4px;">This is a friendly reminder of your upcoming Alaga Wellness session.</p>
       ${detailRows([
         ['Service', d.serviceName],
         ...(d.therapistName ? [['Therapist', d.therapistName] as [string, string]] : []),
         ['Date', d.date],
         ['Time', d.time],
         ['Address', d.address],
       ])}
       <p style="margin:0;">Please make sure there's a quiet, comfortable space ready. Your therapist will bring everything else.</p>`,
      'View booking',
      `${APP_URL}/booking/${d.bookingId}`,
    ),
  }
}
