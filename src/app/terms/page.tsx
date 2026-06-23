import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — Alaga Wellness',
  description: 'The terms governing your use of Alaga Wellness home wellness booking services.',
}

const UPDATED = 'June 23, 2026'

export default function TermsPage() {
  return (
    <div className="container-alaga py-16 max-w-3xl">
      <h1 className="text-3xl md:text-4xl font-bold text-[#2C2420] mb-2">Terms of Service</h1>
      <p className="text-sm text-[#8C7B70] mb-10">Last updated: {UPDATED}</p>

      <div className="flex flex-col gap-8 text-[#5C5048] text-[15px] leading-relaxed">

        <section>
          <p>
            These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the Alaga Wellness
            website, mobile experience, and services (collectively, the &ldquo;Platform&rdquo;), operated by
            Alaga Wellness (&ldquo;Alaga,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). By booking a session,
            creating an account, or otherwise using the Platform, you agree to these Terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#2C2420] mb-3">1. What Alaga Is</h2>
          <p>
            Alaga is a marketplace that connects customers with independent, verified wellness
            professionals (&ldquo;Therapists&rdquo;) who provide in-home massage and wellness services. Alaga
            facilitates discovery, booking, and payment. Therapists are independent service providers
            and are not employees of Alaga.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#2C2420] mb-3">2. Eligibility</h2>
          <p>
            You must be at least 18 years old to book a session or create an account. By using the
            Platform, you represent that the information you provide is accurate and that you are
            legally able to enter into these Terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#2C2420] mb-3">3. Bookings &amp; Payments</h2>
          <ul className="list-disc pl-5 flex flex-col gap-2">
            <li>Prices shown at checkout are set within rate bands defined per city and include a transport fee where applicable.</li>
            <li>Payment is processed securely through our third-party payment provider (HitPay), supporting GCash, Maya, and card.</li>
            <li>A booking is confirmed once payment is received. You will receive confirmation by email and/or SMS.</li>
            <li>Your assigned Therapist will be confirmed separately once they accept the booking.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#2C2420] mb-3">4. Cancellations &amp; Refunds</h2>
          <p>
            You may cancel a booking subject to our cancellation policy communicated at the time of
            booking. Refund eligibility depends on how far in advance you cancel and whether a
            Therapist has already been dispatched. Where a session cannot be fulfilled due to Therapist
            unavailability, we will reassign or refund the affected booking.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#2C2420] mb-3">5. Conduct &amp; Safety</h2>
          <p>
            Alaga services are strictly professional therapeutic and wellness services. Any request for
            services of a sexual nature is strictly prohibited and will result in immediate termination
            of the session and your account, without refund, and may be reported to authorities. Both
            customers and Therapists are expected to treat each other with respect and to maintain a
            safe, lawful environment.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#2C2420] mb-3">6. Therapist Verification</h2>
          <p>
            We verify Therapists through documentation such as NBI clearance and TESDA certification.
            While we take reasonable steps to vet professionals on the Platform, you acknowledge that
            Therapists are independent providers and Alaga does not guarantee any particular outcome of
            a session.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#2C2420] mb-3">7. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Alaga is not liable for any indirect, incidental, or
            consequential damages arising from your use of the Platform or services rendered by
            Therapists. Wellness services are not a substitute for professional medical advice,
            diagnosis, or treatment. Consult a physician before booking if you have any medical
            condition.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#2C2420] mb-3">8. Privacy</h2>
          <p>
            Your use of the Platform is also governed by our{' '}
            <a href="/privacy" className="text-[#C4714A] font-medium hover:underline">Privacy Policy</a>,
            which explains how we collect and process your personal data in accordance with the
            Philippine Data Privacy Act of 2012 (RA 10173).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#2C2420] mb-3">9. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. Material changes will be communicated through
            the Platform or by email. Continued use after changes take effect constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#2C2420] mb-3">10. Contact</h2>
          <p>
            Questions about these Terms? Email us at{' '}
            <a href="mailto:hello@alagawellness.care" className="text-[#C4714A] font-medium hover:underline">hello@alagawellness.care</a>.
          </p>
        </section>

      </div>
    </div>
  )
}
