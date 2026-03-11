import Link from "next/link";
import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/landing-nav";

export const metadata: Metadata = {
  title: "Privacy Policy — Bragfast",
  description: "Privacy policy for the Bragfast service.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-surface text-brand">
      <LandingNav />

      <article className="px-4 py-16 md:py-20 md:px-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-[family-name:var(--font-press-start)] text-sm md:text-lg mb-2">
            Privacy Policy
          </h1>
          <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/50 mb-10">
            Last updated: March 11, 2026
          </p>

          <div className="space-y-8 font-[family-name:var(--font-geist-sans)] text-sm text-brand/80 leading-relaxed">
            <Section title="1. Introduction">
              <p>
                This Privacy Policy describes how Rob van Baaren
                (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, or
                &quot;our&quot;), operating Bragfast from Oldenzaal,
                Netherlands, collects, uses, and protects your personal data
                when you use our Service.
              </p>
              <p>
                By using the Service, you agree to the collection and use of
                information in accordance with this policy.
              </p>
            </Section>

            <Section title="2. Data We Collect">
              <h3 className="font-semibold text-brand">
                Personal Data
              </h3>
              <p>When you create an account, we may collect:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Email address</li>
                <li>Name</li>
                <li>Authentication provider information (e.g. Google account)</li>
              </ul>

              <h3 className="font-semibold text-brand mt-4">
                Usage Data
              </h3>
              <p>We automatically collect:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>IP address</li>
                <li>Browser type and version</li>
                <li>Pages visited and time spent</li>
                <li>Device identifiers</li>
                <li>API usage data (requests, credits consumed, timestamps)</li>
              </ul>

              <h3 className="font-semibold text-brand mt-4">
                Content You Provide
              </h3>
              <p>
                When using the Service, you may submit brand assets (logos,
                colors), text content, and image URLs. This content is processed
                to generate your images and is not used for any other purpose.
              </p>
            </Section>

            <Section title="3. How We Use Your Data">
              <p>We use your personal data to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Provide, maintain, and improve the Service</li>
                <li>Manage your account and subscription</li>
                <li>Process payments</li>
                <li>
                  Send service-related communications (billing, usage alerts,
                  outages)
                </li>
                <li>Monitor usage patterns to prevent abuse</li>
                <li>Comply with legal obligations</li>
              </ul>
              <p>
                We do not sell your personal data. We do not use your data for
                advertising purposes.
              </p>
            </Section>

            <Section title="4. Cookies and Tracking">
              <p>
                We use essential cookies to maintain your session and
                authentication state. We may use analytics cookies to understand
                how the Service is used.
              </p>
              <p>
                You can configure your browser to refuse cookies, but this may
                limit your ability to use certain features of the Service.
              </p>
            </Section>

            <Section title="5. Third-Party Service Providers">
              <p>
                We use the following third-party services to operate the
                Service:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Clerk</strong> — authentication and user management
                </li>
                <li>
                  <strong>Stripe</strong> — payment processing. Stripe collects
                  and processes payment information under their own{" "}
                  <a
                    href="https://stripe.com/privacy"
                    className="underline hover:text-brand"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    privacy policy
                  </a>
                </li>
                <li>
                  <strong>Convex</strong> — database and backend services
                </li>
                <li>
                  <strong>Cloudflare</strong> — CDN and image hosting (R2
                  storage)
                </li>
                <li>
                  <strong>Vercel</strong> — application hosting
                </li>
              </ul>
              <p>
                These providers only have access to your data as necessary to
                perform their services and are obligated to protect it.
              </p>
            </Section>

            <Section title="6. Data Retention">
              <p>
                We retain your personal data for as long as your account is
                active or as needed to provide the Service. If you delete your
                account, we will delete your personal data within 30 days,
                except where retention is required by law.
              </p>
              <p>
                Generated images are stored on our CDN. Images associated with
                deleted accounts may be retained for a limited period before
                removal.
              </p>
              <p>
                API usage logs and billing records may be retained for up to 24
                months for accounting and compliance purposes.
              </p>
            </Section>

            <Section title="7. Data Transfer">
              <p>
                Your data may be processed on servers located outside the
                Netherlands, including in the United States. We ensure that
                appropriate safeguards are in place for international transfers
                in compliance with the GDPR.
              </p>
            </Section>

            <Section title="8. Your Rights (GDPR)">
              <p>
                As a resident of the European Economic Area, you have the right
                to:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Access</strong> — request a copy of the personal data
                  we hold about you
                </li>
                <li>
                  <strong>Rectification</strong> — request correction of
                  inaccurate data
                </li>
                <li>
                  <strong>Erasure</strong> — request deletion of your personal
                  data
                </li>
                <li>
                  <strong>Restriction</strong> — request restriction of
                  processing
                </li>
                <li>
                  <strong>Portability</strong> — request your data in a
                  machine-readable format
                </li>
                <li>
                  <strong>Object</strong> — object to processing of your
                  personal data
                </li>
              </ul>
              <p>
                To exercise any of these rights, contact us at{" "}
                <a
                  href="mailto:privacy@brag.fast"
                  className="underline hover:text-brand"
                >
                  privacy@brag.fast
                </a>
                . We will respond within 30 days.
              </p>
            </Section>

            <Section title="9. Data Security">
              <p>
                We implement appropriate technical and organizational measures
                to protect your personal data, including encryption in transit
                (TLS), secure authentication, and access controls.
              </p>
              <p>
                However, no method of transmission over the Internet or
                electronic storage is 100% secure. We cannot guarantee absolute
                security.
              </p>
            </Section>

            <Section title="10. Children&apos;s Privacy">
              <p>
                The Service is not intended for users under 18 years of age. We
                do not knowingly collect personal data from children. If we
                become aware that we have collected data from a child, we will
                delete it promptly.
              </p>
            </Section>

            <Section title="11. Third-Party Links">
              <p>
                The Service may contain links to third-party websites. We are
                not responsible for the privacy practices of these sites. We
                encourage you to review their privacy policies.
              </p>
            </Section>

            <Section title="12. Changes to This Policy">
              <p>
                We may update this Privacy Policy from time to time. We will
                notify you of material changes by posting the updated policy on
                this page and updating the &quot;Last updated&quot; date.
              </p>
              <p>
                Your continued use of the Service after changes take effect
                constitutes acceptance of the revised policy.
              </p>
            </Section>

            <Section title="13. Contact">
              <p>
                For privacy-related questions or to exercise your data rights,
                contact us at:
              </p>
              <p>
                <a
                  href="mailto:privacy@brag.fast"
                  className="underline hover:text-brand"
                >
                  privacy@brag.fast
                </a>
              </p>
              <p>
                Rob van Baaren
                <br />
                Oldenzaal, Netherlands
              </p>
            </Section>
          </div>
        </div>
      </article>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-[family-name:var(--font-press-start)] text-[10px] md:text-xs">
        {title}
      </h2>
      {children}
    </section>
  );
}
