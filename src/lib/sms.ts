const TWILIO_BASE = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`

export async function sendSms(to: string, body: string): Promise<void> {
  const res = await fetch(TWILIO_BASE, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(
        `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
      ).toString('base64'),
    },
    body: new URLSearchParams({
      To:   to,
      From: process.env.TWILIO_PHONE_NUMBER!,
      Body: body,
    }).toString(),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Twilio error: ${err.message}`)
  }
}

export function smsNewBookingAlert({
  firstName, date, time,
}: {
  firstName: string
  date: string
  time: string
}): string {
  return `Hi ${firstName}! New Alaga booking on ${date} at ${time}. Reply ACCEPT to confirm or DECLINE to pass.`
}

export function smsBookingAccepted({ firstName }: { firstName: string }): string {
  return `Booking confirmed ${firstName}! Log in to your Alaga account at alagawellness.com/therapist/login to view client details and location. Reply IN when you arrive, OUT when done.`
}
