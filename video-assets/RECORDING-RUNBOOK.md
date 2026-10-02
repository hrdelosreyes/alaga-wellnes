# Recording Runbook — "Paano Kumita sa Alaga"

Everything you need to record the 6 episodes. Pair with:
- `../therapist-tutorial-video-scripts.md` — shot tables (what the viewer sees/hears)
- `voiceover-scripts.md` — clean read-through per episode
- `subtitles/EP*.srt` — timed captions (import into CapCut / Canva / Premiere)
- `graphics/*.png` — 1080×1920 cards (hooks, 75/25 split, referral chain, bonus bar, disclaimer, end card)
- `../therapist-tutorial-captions.md` — captions + hashtags per platform

## 0. Setup (do once)

**Phone:** portrait, Do Not Disturb on, battery/clock hidden if possible, brightness up. Use the built-in screen recorder (record with mic off — add voiceover later).

**Demo data (obviously fake — do not use real people):**
| Field | Use |
|---|---|
| Name | "Demo Therapist" / "Test Therapist" |
| Email | an inbox you control, e.g. `yourname+demo1@gmail.com` |
| Mobile | a number you control |
| GCash/Maya/Bank | `09XX XXX XXXX` style dummy; bank "Demo Bank" |
| Documents | blank sample images/PDFs named `SAMPLE-NBI.pdf`, `SAMPLE-TESDA.pdf`, a stock photo |

**City:** Parañaque must be live (it is, as of Oct 2, 2026) and the demo therapist's city must be Parañaque, so My Rates shows the band and Service Area lists 16 barangays. Turn Parañaque off at `/admin/cities` when you're done.

**Cleanup after recording:** the registration form creates a real application row. Delete the demo applicant/therapist in the admin site (or ask me to) so it doesn't show in your applicant list.

**Rates to expect on My Rates (Parañaque / NCR):**
| Service | Min | Base | Max |
|---|---|---|---|
| Relax-60 | ₱420 | ₱505 | ₱840 |
| Hilot-75 | ₱475 | ₱560 | ₱910 |
| Recovery-90 | ₱590 | ₱725 | ₱1,190 |

## 1. Record order (fewest account switches)

1. **Logged-out screens** — homepage, benefits page, registration, login (EP 1, 2)
2. **Demo therapist account** — set-password, onboarding, settings pages (EP 3)
3. **Demo test booking** — dashboard, accept, chat, check in/out (EP 4)
4. **Earnings and payout** — dashboard cards, Payout tab (EP 5)
5. **Referral card + bonus card** — dashboard (EP 6)
6. **On-camera presenter lines** — hooks and outros (all episodes)
7. **B-roll** — packing kit, arriving, preparing oils/towels

## 2. Click-by-click, per episode

### EP 2 — Mag-apply (record logged out)
1. alagawellness.care → top menu **"Join as Therapist"**.
2. Benefits landing (scroll slowly: "Keep 75%", "Quarterly Alaga Bonus", "Who can apply?") → tap to start the application.
3. **Personal information** — fill with demo data → Next.
4. **Professional background** — fill → Next.
5. **Upload documents** — NBI Clearance, TESDA Certificate, photo (sample files) → Submit.
6. **"Application submitted!"** screen — hold 2 seconds. Review window shown: 3–5 business days.

### EP 3 — Setup (record logged in as demo therapist)
1. Invite email → open link → **Set password** screen (use a throwaway password; blur the field when editing).
2. Onboarding (3 slides): earnings → referral → bonus → "Almost there!" — swipe quickly.
3. Tap through to **My rates** (shows Min / Base / Max sliders) — drag a slider within the band.
4. **My service area** — search "Baclaran" (or any barangay), tick 3–4 → **Save service area**. Capture the yellow "pending admin approval" banner.
5. Menu → **Settings → Availability** — tap a day to toggle **Day off**, then tap back to Available.

### EP 4 — Ang Unang Booking Mo (needs a test booking assigned to the demo therapist)
1. Dashboard: a booking with **Accept / Decline** buttons.
2. Tap **Accept**. Open the **chat** toggle on the booking card.
3. Tap **Check in** (arrival), then **Check out** (after session).
4. Show the dashboard earnings update.

> If creating a test booking is blocked by payment (cashless), tell me and I'll check the cleanest way to seed one on the demo account.

### EP 5 — Kita at Payout
1. Dashboard earnings card: **Total earned · Paid out · Pending payout**.
2. Menu → **Business → Payout** → choose **GCash** → enter dummy number + account name → **Save payout details** (show "Saved!").
3. Scroll to **Payout history** (empty is fine; mention weekly + reference number in voiceover).
4. Insert graphic `split-75-25.png` and `disclaimer.png`.

### EP 6 — Referral & Bonus
1. Dashboard: **referral card** (code + shareable link) — blur/blank the code if it ever looks like a real one.
2. **Alaga Bonus — current quarter** card (progress toward 15 bookings).
3. Insert graphics `referral-chain.png`, `bonus-progress.png`, `disclaimer.png`.

### EP 1 — Overview
Cut from the clips above (≈2–3 seconds each): benefits page → registration → rates/service area → accept/check-in/check-out → earnings → Payout tab. Open with `hook-1.png` or an on-camera line; close with `end-card.png`.

## 3. Editing checklist

- [ ] Import voiceover + clip; align to the shot-table timings
- [ ] Add subtitles from `subtitles/EP*.srt` (burn in; font ≥ 48px, keep above the bottom 350px)
- [ ] First 2 seconds: matching `hook-N.png` or an on-camera hook
- [ ] EP 5 and EP 6: `disclaimer.png` for ≥ 3 seconds + caption disclaimer
- [ ] Last 3 seconds: `end-card.png`
- [ ] Blur anything real: emails, numbers, QR codes, other users' names
- [ ] Export 1080×1920, ≤ 90 seconds (≤ 60 for TikTok/IG feed best-fit)
- [ ] Check no "instant" / "agad" payout wording crept into voiceover

## 4. Assets map

| Episode | Hook | Graphics | Subtitles |
|---|---|---|---|
| 1 Overview | hook-1 | split-75-25, end-card | EP1-overview.srt |
| 2 Mag-apply | hook-2 | end-card | EP2-mag-apply.srt |
| 3 Setup | hook-3 | end-card | EP3-setup.srt |
| 4 Unang Booking | hook-4 | end-card | EP4-unang-booking.srt |
| 5 Kita at Payout | hook-5 | split-75-25, disclaimer, end-card | EP5-kita-at-payout.srt |
| 6 Referral & Bonus | hook-6 | referral-chain, bonus-progress, disclaimer, end-card | EP6-referral-bonus.srt |

## 5. Regenerating assets

If prices, percentages, or wording change, edit the scripts file / the card text and re-run from the repo root:

```bash
node video-assets/build-graphics.js
node video-assets/build-subtitles.js
```

(Graphics use headless Chrome; allow a few minutes.)
