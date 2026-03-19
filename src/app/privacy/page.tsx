import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/landing-nav";

export const metadata: Metadata = {
  title: "Privacy Policy — brag.fast",
  description: "Privacy policy for the brag.fast service.",
  alternates: { canonical: "/privacy" },
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
            Last updated: March 13, 2026
          </p>

          <div className="space-y-8 font-[family-name:var(--font-geist-sans)] text-sm text-brand/80 leading-relaxed">
            <Section title="1. Introduction">
              <p>
                This Privacy Policy describes how Rob van Baaren
                (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, or
                &quot;our&quot;), operating brag.fast from Oldenzaal,
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
              <p>When you create an account, we collect:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Email address</li>
                <li>Name (if provided)</li>
                <li>Authentication provider information (e.g. Google account)</li>
                <li>Hashed password (if using email/password authentication)</li>
              </ul>

              <h3 className="font-semibold text-brand mt-4">
                Usage Data
              </h3>
              <p>We automatically collect:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>IP address (used for signup rate limiting)</li>
                <li>Browser type and version</li>
                <li>Pages visited and time spent</li>
                <li>Device identifiers</li>
                <li>API usage data (requests, credits consumed, timestamps)</li>
              </ul>

              <h3 className="font-semibold text-brand mt-4">
                Content You Provide
              </h3>
              <p>
                When using the Service, you may submit:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Brand assets (logos, colors, website URL, font preferences)</li>
                <li>Template configurations (layout, styling, image references)</li>
                <li>Release content (text, image URLs, metadata strings)</li>
                <li>Webhook URLs for delivery notifications</li>
              </ul>
              <p>
                This content is processed solely to generate your images and
                operate the Service.
              </p>
            </Section>

            <Section title="3. Legal Basis for Processing (GDPR Art. 6)">
              <p>We process your personal data on the following legal bases:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Contract performance</strong> — to provide the Service,
                  manage your account, process payments, and generate images
                  (Art. 6(1)(b))
                </li>
                <li>
                  <strong>Legitimate interest</strong> — to prevent abuse, enforce
                  rate limits, maintain security, and improve the Service
                  (Art. 6(1)(f))
                </li>
                <li>
                  <strong>Legal obligation</strong> — to retain billing records and
                  comply with tax and accounting requirements (Art. 6(1)(c))
                </li>
              </ul>
            </Section>

            <Section title="4. How We Use Your Data">
              <p>We use your personal data to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Provide, maintain, and improve the Service</li>
                <li>Manage your account and subscription</li>
                <li>Process payments via Stripe</li>
                <li>Authenticate your identity and API requests</li>
                <li>
                  Send service-related communications (billing, usage alerts,
                  outages)
                </li>
                <li>
                  Enforce rate limits and prevent abuse (including IP-based
                  signup rate limiting)
                </li>
                <li>Deliver webhook notifications to URLs you provide</li>
                <li>Comply with legal obligations</li>
              </ul>
              <p>
                We do not sell your personal data. We do not use your data for
                advertising purposes.
              </p>
            </Section>

            <Section title="5. Cookies and Tracking">
              <p>
                We use essential cookies only, to maintain your session and
                authentication state. These cookies are strictly necessary for
                the Service to function and do not require consent under the
                ePrivacy Directive.
              </p>
              <p>
                We do not currently use analytics cookies or third-party
                tracking. If this changes, we will update this policy and
                obtain your consent where required.
              </p>
            </Section>

            <Section title="6. Third-Party Service Providers">
              <p>
                We share data with the following third-party processors to
                operate the Service:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Convex</strong> — database and backend services. Stores
                  your account data, brands, templates, releases, and API key
                  hashes.
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
                  . We share your email and user ID with Stripe to manage your
                  subscription.
                </li>
                <li>
                  <strong>Cloudflare</strong> — CDN and image hosting (R2
                  storage). Generated images and uploaded logos are stored on
                  Cloudflare R2.
                </li>
                <li>
                  <strong>Vercel</strong> — application hosting and
                  infrastructure.
                </li>
              </ul>
              <p>
                These providers process your data only as necessary to perform
                their services and are contractually obligated to protect it.
              </p>
            </Section>

            <Section title="7. Webhooks and External Delivery">
              <p>
                If you provide a webhook URL when creating a release, we will
                send a notification to that URL upon completion. The data
                delivered includes the release ID and status. You are
                responsible for the security of your webhook endpoints.
              </p>
            </Section>

            <Section title="8. API Key Security">
              <p>
                API keys are stored as SHA-256 hashes. We never store your API
                key in plaintext after initial generation. The full key is shown
                to you only once at creation time.
              </p>
            </Section>

            <Section title="9. Data Retention">
              <p>
                We retain your personal data for as long as your account is
                active or as needed to provide the Service.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Account data</strong> — deleted within 30 days of
                  account deletion, except where retention is required by law.
                </li>
                <li>
                  <strong>Generated images</strong> — stored on Cloudflare R2 and
                  deleted when your account is deleted. CDN caches may persist
                  briefly after deletion.
                </li>
                <li>
                  <strong>Uploaded logos</strong> — stored on Cloudflare R2 and
                  deleted when the brand is updated or your account is deleted.
                </li>
                <li>
                  <strong>Billing records</strong> — retained for up to 24 months
                  for accounting and compliance purposes.
                </li>
                <li>
                  <strong>Rate limit data</strong> — transient; deleted upon
                  account deletion.
                </li>
              </ul>
            </Section>

            <Section title="10. International Data Transfers">
              <p>
                Your data may be processed on servers located outside the
                European Economic Area, including in the United States (Convex,
                Cloudflare, Vercel, Stripe). These transfers are protected by:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  EU-U.S. Data Privacy Framework certifications where applicable
                </li>
                <li>
                  Standard Contractual Clauses (SCCs) approved by the European
                  Commission
                </li>
              </ul>
            </Section>

            <Section title="11. Your Rights (GDPR)">
              <p>
                If you are in the European Economic Area, you have the following
                rights:
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
                  <strong>Object</strong> — object to processing based on
                  legitimate interest
                </li>
                <li>
                  <strong>Withdraw consent</strong> — where processing is based
                  on consent, withdraw it at any time
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
              <p>
                You also have the right to lodge a complaint with the Dutch Data
                Protection Authority (Autoriteit Persoonsgegevens) at{" "}
                <a
                  href="https://autoriteitpersoonsgegevens.nl"
                  className="underline hover:text-brand"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  autoriteitpersoonsgegevens.nl
                </a>
                .
              </p>
            </Section>

            <Section title="12. Account Deletion">
              <p>
                You may delete your account at any time through the Service.
                Upon deletion, we will:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Cancel any active Stripe subscriptions immediately</li>
                <li>Delete all releases, templates, brands, and API keys from our database</li>
                <li>Remove all generated images and uploaded logos from Cloudflare R2</li>
                <li>Delete your user profile and rate limit records</li>
              </ul>
              <p>
                Billing records may be retained as described in the Data
                Retention section.
              </p>
            </Section>

            <Section title="13. Data Security">
              <p>
                We implement appropriate technical and organizational measures
                to protect your personal data, including:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Encryption in transit (TLS)</li>
                <li>Secure authentication via session tokens</li>
                <li>SHA-256 hashing of API keys</li>
                <li>Access controls and data isolation per user</li>
                <li>Ownership verification on all data queries</li>
              </ul>
              <p>
                However, no method of transmission over the Internet or
                electronic storage is 100% secure. We cannot guarantee absolute
                security.
              </p>
            </Section>

            <Section title="14. Data Breach Notification">
              <p>
                In the event of a personal data breach that poses a risk to your
                rights and freedoms, we will notify the Dutch Data Protection
                Authority within 72 hours of becoming aware. If the breach is
                likely to result in a high risk to you, we will also notify you
                directly without undue delay.
              </p>
            </Section>

            <Section title="15. Children&apos;s Privacy">
              <p>
                The Service is not intended for users under 18 years of age. We
                do not knowingly collect personal data from children. If we
                become aware that we have collected data from a child, we will
                delete it promptly.
              </p>
            </Section>

            <Section title="16. Third-Party Links">
              <p>
                The Service may contain links to third-party websites. We are
                not responsible for the privacy practices of these sites. We
                encourage you to review their privacy policies.
              </p>
            </Section>

            <Section title="17. Changes to This Policy">
              <p>
                We may update this Privacy Policy from time to time. We will
                notify you of material changes by posting the updated policy on
                this page and updating the &quot;Last updated&quot; date. For
                significant changes that affect your rights, we will make
                reasonable efforts to notify you by email.
              </p>
              <p>
                Your continued use of the Service after changes take effect
                constitutes acceptance of the revised policy.
              </p>
            </Section>

            <Section title="18. Contact">
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
