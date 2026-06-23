import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Alaga Wellness',
  description: 'How Alaga Wellness collects, uses, and protects your personal data under the Philippine Data Privacy Act.',
}

const UPDATED = 'June 23, 2026'

export default function PrivacyPage() {
  return (
    <div className="container-alaga py-16 max-w-3xl">
      <h1 className="text-3xl md:text-4xl font-bold text-[#2C2420] mb-2">Privacy Policy</h1>
      <p className="text-sm text-[#8C7B70] mb-10">Last updated: {UPDATED}</p>

      <div className="flex flex-col gap-8 text-[#5C5048] text-[15px] leading-relaxed">

        <section>
          <p>
            Alaga Wellness (&ldquo;Alaga,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) respects your privacy and is
            committed to protecting your personal data in accordance with the Philippine Data Privacy
            Act of 2012 (RA 10173), its Implementing Rules and Regulations, and issuances of the
            National Privacy Commission (NPC). This Policy explains what data we collect, why, and how
            we handle it.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#2C2420] mb-3">1. Information We Collect</h2>
          <ul className="list-disc pl-5 flex flex-col gap-2">
            <li><strong className="text-[#2C2420]">Customer details:</strong> name, mobile number, email address, service address, and booking notes you provide.</li>
            <li><strong className="text-[#2C2420]">Therapist details:</strong> name, contact information, gender, city, experience, specialties, and verification documents (e.g. NBI clearance, TESDA certificate).</li>
            <li><strong className="text-[#2C2420]">Booking &amp; payment data:</strong> service selected, schedule, price, and payment status. Card and e-wallet details are processed by our payment provider and are not stored by Alaga.</li>
            <li><strong className="text-[#2C2420]">Technical data:</strong> approximate location (for city detection), device and usage information.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#2C2420] mb-3">2. How We Use Your Data</h2>
          <ul className="list-disc pl-5 flex flex-col gap-2">
            <li>To create and manage bookings and accounts.</li>
            <li>To match customers with appropriate Therapists and share necessary contact and location details with the assigned Therapist to deliver the service.</li>
            <li>To process payments and send confirmations, updates, and reminders by email and SMS.</li>
            <li>To verify Therapist eligibility and maintain safety and quality on the Platform.</li>
            <li>To improve our services and comply with legal obligations.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#2C2420] mb-3">3. Sharing of Information</h2>
          <p>
            We share your data only as needed to provide the service: with your assigned Therapist (to
            fulfill the booking), and with trusted third-party processors such as our payment provider
            (HitPay), email provider (Resend), and hosting/database providers
            (Vercel, Supabase). We do not sell your personal data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#2C2420] mb-3">4. Data Retention</h2>
          <p>
            We retain personal data only for as long as necessary to fulfill the purposes described in
            this Policy, including legal, accounting, and reporting requirements. When data is no longer
            needed, we securely delete or anonymize it.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#2C2420] mb-3">5. Your Rights</h2>
          <p>
            Under the Data Privacy Act, you have the right to be informed, to access, to object, to
            rectify, to erasure or blocking, to data portability, and to lodge a complaint with the
            National Privacy Commission. To exercise any of these rights, contact us using the details
            below.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#2C2420] mb-3">6. Security</h2>
          <p>
            We implement reasonable organizational, physical, and technical security measures to protect
            your personal data against unauthorized access, alteration, disclosure, or destruction. No
            method of transmission or storage is completely secure, but we continually work to safeguard
            your information.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#2C2420] mb-3">7. Children&rsquo;s Privacy</h2>
          <p>
            The Platform is intended for users 18 years and older. We do not knowingly collect personal
            data from minors without appropriate consent from a parent or guardian.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#2C2420] mb-3">8. Changes to This Policy</h2>
          <p>
            We may update this Policy from time to time. Material changes will be communicated through
            the Platform or by email, and the &ldquo;Last updated&rdquo; date above will be revised.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#2C2420] mb-3">9. Contact Us</h2>
          <p>
            For privacy questions or to exercise your rights, contact our Data Protection Officer at{' '}
            <a href="mailto:hello@alagawellness.care" className="text-[#C4714A] font-medium hover:underline">hello@alagawellness.care</a>.
          </p>
        </section>

      </div>
    </div>
  )
}
