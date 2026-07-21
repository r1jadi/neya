import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24">
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-white sm:text-5xl">
            Terms of Service
          </h1>
          <p className="mt-4 text-white/50">Last updated: {new Date().toLocaleDateString()}</p>
          
          <div className="mt-12 space-y-10 text-white/80 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing and using NEYA ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">2. Description of Service</h2>
              <p>
                NEYA provides users with a platform to discover nightlife events, reserve tables, purchase tickets, and request guestlist access to various venues. You understand and agree that the Service is provided "AS-IS" and that NEYA assumes no responsibility for the timeliness, deletion, mis-delivery or failure to store any user communications or personalization settings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">3. Reservations and Tickets</h2>
              <p>
                When you make a reservation, purchase a ticket, or request guestlist access through NEYA, you agree to the specific terms set by the Venue hosting the event. NEYA acts as an intermediary platform and is not responsible for event cancellations, changes in schedule, or entry denials by the Venue.
              </p>
              <ul className="list-disc pl-5 mt-3 space-y-2 text-white/70">
                <li><strong className="text-white">Entry:</strong> Venues reserve the right of admission. A ticket or reservation does not guarantee entry if you fail to meet the venue's entry requirements (e.g., age, dress code, behavior).</li>
                <li><strong className="text-white">Refunds:</strong> Refund policies are determined by the individual Venues. NEYA's platform fees are generally non-refundable unless an event is cancelled.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">4. User Conduct</h2>
              <p>
                You agree to use the Service only for lawful purposes. You agree not to take any action that might compromise the security of the Service, render the Service inaccessible to others or otherwise cause damage to the Service or the Content. You agree not to add to, subtract from, or otherwise modify the Content, or to attempt to access any Content that is not intended for you.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">5. Modifications to Service</h2>
              <p>
                NEYA reserves the right at any time and from time to time to modify or discontinue, temporarily or permanently, the Service (or any part thereof) with or without notice. You agree that NEYA shall not be liable to you or to any third party for any modification, suspension or discontinuance of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">6. Contact Information</h2>
              <p>
                If you have any questions regarding these Terms, please contact us at:
                <a href="mailto:hello@neya.live" className="text-sky-400 hover:underline ml-2">hello@neya.live</a>
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
