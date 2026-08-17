import type { Metadata } from "next";
import { LegalDocument, type LegalSection } from "@/components/legal/legal-document";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Privacy Policy · ${SITE.name}`,
  description: "How NEYA collects, uses, and protects personal information.",
};

const sections: LegalSection[] = [
  {
    title: "1. Information we collect",
    body: <><p>We collect information you provide when you create an account, submit a venue or event, request a guestlist place or table, buy a ticket or guide, contact us, or otherwise use NEYA. This may include your name, email address, phone number, profile details, city, music preferences, event interests, and the content you submit.</p><p>We also collect technical and usage information such as device and browser details, IP-address-derived general location, pages viewed, referral information, session identifiers, and interactions with events, venues, guides, and features.</p></>,
  },
  {
    title: "2. Account information",
    body: <p>Account credentials and profile data are processed through Supabase authentication and database services. We use account information to authenticate you, personalise the service, show your bookings and saved items, prevent misuse, and communicate about transactions or important service changes. Do not share your account credentials; you are responsible for activity carried out through your account.</p>,
  },
  {
    title: "3. Cookies, local storage, and analytics",
    body: <><p>NEYA uses essential cookies to maintain sign-in sessions and protect account features. We may use browser local storage for user-requested features, such as saving guides for offline access.</p><p>We use Vercel Analytics and, where enabled, PostHog to understand aggregate product use, performance, and feature adoption. These services may set or read identifiers and process technical usage data. You can control many cookies through your browser settings; blocking essential cookies may prevent sign-in or other core functions from working.</p></>,
  },
  {
    title: "4. Event and venue submissions",
    body: <p>When you submit an event or venue, we process the listing details, images, location, ownership information, and contact details needed to review, publish, administer, and promote that listing. Public information you submit for an approved listing, including event details and venue details, may be displayed to NEYA visitors and indexed by search engines. Please only submit content you have the right to use and do not include personal information that is not necessary for the listing.</p>,
  },
  {
    title: "5. Payments and bookings",
    body: <p>For paid tickets and online reservation deposits, payments are processed by RaiAccept. NEYA does not store full payment-card numbers. We receive and retain transaction information needed to confirm a purchase, prevent fraud, provide support, maintain accounting records, and handle refunds or disputes. Venues may receive booking details needed to honour table reservations and guestlist requests, including your name, contact details, party size, and notes you provide.</p>,
  },
  {
    title: "6. How we use and share information",
    body: <><p>We use information to operate and improve NEYA, deliver bookings and purchases, personalise discovery, moderate content, secure our services, respond to requests, enforce our terms, and comply with legal obligations.</p><p>We share data with service providers acting on our behalf, including Supabase (authentication, database, and storage), RaiAccept (payments), Resend (transactional email), Vercel and PostHog (analytics and hosting), Mapbox and Google Maps (maps), and Cloudinary where venue or event media is hosted. We may also disclose information where required by law, to protect rights and safety, or in connection with a merger, financing, acquisition, or sale of assets.</p><p>We do not sell personal information for money.</p></>,
  },
  {
    title: "7. Your rights and choices",
    body: <p>Subject to applicable law, you may request access to, correction of, deletion of, or restriction of processing of your personal information, and you may object to certain processing or request a portable copy of data you provided. You may also update profile information in your account and unsubscribe from non-essential emails using the link in those messages. To make a request, email <a className="text-sky-300 hover:underline" href="mailto:neyakosova@gmail.com">neyakosova@gmail.com</a>. We may need to verify your identity before acting on a request.</p>,
  },
  {
    title: "8. Data retention and security",
    body: <p>We retain account, submission, booking, and transaction records for as long as needed to provide the service, resolve disputes, enforce agreements, and meet legal, tax, and accounting obligations. When data is no longer needed, we delete it or de-identify it where practicable. We use reasonable technical and organisational safeguards, including access controls and encrypted service connections, but no online system can guarantee absolute security.</p>,
  },
  {
    title: "9. International processing and complaints",
    body: <p>Our service providers may process information outside Kosovo. Where this occurs, we use providers and safeguards appropriate to the service and applicable law. NEYA operates for users in Kosovo and processes personal data in accordance with applicable privacy law, including Kosovo Law No. 06/L-082 on Protection of Personal Data. You may also contact the <a className="text-sky-300 hover:underline" href="https://aip.rks-gov.net/en/about-us/" target="_blank" rel="noopener noreferrer">Information and Privacy Agency of Kosovo</a> if you have an unresolved privacy concern.</p>,
  },
  {
    title: "10. Contact and changes",
    body: <p>For privacy questions or requests, contact us at <a className="text-sky-300 hover:underline" href="mailto:neyakosova@gmail.com">neyakosova@gmail.com</a>. We may update this policy when our practices or legal requirements change. We will publish the revised policy here and update the date above.</p>,
  },
];

export default function PrivacyPage() {
  return <LegalDocument title="Privacy Policy" updated="28 July 2026" intro={<p>This Privacy Policy explains how NEYA collects, uses, shares, and protects information when you use neya.live, our related services, and our event, venue, booking, ticket, and guide features.</p>} sections={sections} />;
}
