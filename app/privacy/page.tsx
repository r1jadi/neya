"use client";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24">
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-white sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-white/50">Last updated: {new Date().toLocaleDateString()}</p>
          
          <div className="mt-12 space-y-10 text-white/80 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">1. Introduction</h2>
              <p>
                Welcome to NEYA. We respect your privacy and are committed to protecting your personal data. 
                This privacy policy will inform you as to how we look after your personal data when you visit our website (regardless of where you visit it from) and tell you about your privacy rights and how the law protects you.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">2. The Data We Collect About You</h2>
              <p>
                Personal data, or personal information, means any information about an individual from which that person can be identified. We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
              </p>
              <ul className="list-disc pl-5 mt-3 space-y-2 text-white/70">
                <li><strong className="text-white">Identity Data</strong> includes first name, last name, username or similar identifier.</li>
                <li><strong className="text-white">Contact Data</strong> includes email address and telephone numbers.</li>
                <li><strong className="text-white">Transaction Data</strong> includes details about payments to and from you and other details of products and services you have purchased from us (e.g. event tickets, reservations).</li>
                <li><strong className="text-white">Technical Data</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform, and other technology on the devices you use to access this website.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">3. How We Use Your Personal Data</h2>
              <p>
                We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
              </p>
              <ul className="list-disc pl-5 mt-3 space-y-2 text-white/70">
                <li>Where we need to perform the contract we are about to enter into or have entered into with you (e.g. processing a reservation or ticket purchase).</li>
                <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
                <li>Where we need to comply with a legal obligation.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">4. Data Security</h2>
              <p>
                We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorised way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know. They will only process your personal data on our instructions and they are subject to a duty of confidentiality.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">5. Contact Us</h2>
              <p>
                If you have any questions about this privacy policy or our privacy practices, please contact us at:
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
