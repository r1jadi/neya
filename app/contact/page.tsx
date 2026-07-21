import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ContactForm } from "@/components/neya/contact-form";
import { Mail, MapPin } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="text-center">
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-white sm:text-5xl">
              Get in touch
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-white/60">
              Have a question about a reservation, interested in partnering your venue, or just want to say hi? Send us a message.
            </p>
          </div>

          <div className="mt-16 grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="space-y-8">
              <ContactForm />
            </div>

            <div className="flex flex-col justify-center space-y-8 lg:pl-8">
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">Prishtina based.</h3>
                <p className="mt-2 text-white/60">
                  NEYA is currently exclusive to Prishtina, Kosovo, with plans to expand across the Balkans.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="mt-1 rounded-full bg-white/5 p-2 text-white/60">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Headquarters</h4>
                    <p className="mt-1 text-sm text-white/60">Prishtina, Kosovo</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="mt-1 rounded-full bg-white/5 p-2 text-white/60">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Email</h4>
                    <a href="mailto:hello@neya.live" className="mt-1 inline-block text-sm text-sky-400 hover:underline">
                      hello@neya.live
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
