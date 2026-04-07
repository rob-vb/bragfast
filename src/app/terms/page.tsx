import Link from "next/link";
import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/landing-nav";

export const metadata: Metadata = {
  title: "Terms and Conditions — brag.fast",
  description: "Terms and conditions for using the brag.fast service.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-surface text-brand">
      <LandingNav />

      <article className="px-4 py-16 md:py-20 md:px-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-[family-name:var(--font-press-start)] text-sm md:text-lg mb-2">
            Terms and Conditions
          </h1>
          <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/50 mb-10">
            Last updated: March 13, 2026
          </p>

          <div className="space-y-8 font-[family-name:var(--font-geist-sans)] text-sm text-brand/80 leading-relaxed">
            <Section title="1. Introduction">
              <p>
                These Terms and Conditions govern your use of the brag.fast
                service (the &quot;Service&quot;) operated by Rob van Baaren
                (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, or
                &quot;our&quot;), located in Oldenzaal, Netherlands.
              </p>
              <p>
                By accessing or using the Service, you agree to be bound by
                these Terms. If you disagree with any part, you may not access
                the Service.
              </p>
              <p>
                You must be at least 18 years old to use the Service. By using
                the Service, you represent that you are at least 18 years of
                age.
              </p>
            </Section>

            <Section title="2. Definitions">
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Account</strong> — a unique account created for you to
                  access the Service.
                </li>
                <li>
                  <strong>Service</strong> — the brag.fast website, API, and
                  image generation platform.
                </li>
                <li>
                  <strong>Content</strong> — images, text, brand assets, template
                  configurations, or other materials you submit to or generate
                  through the Service.
                </li>
                <li>
                  <strong>Subscription</strong> — a paid plan granting access to
                  the Service with a monthly credit allocation.
                </li>
                <li>
                  <strong>Credits</strong> — units of usage. Images cost 1 credit
                  per slide per format. Videos cost 5 credits per slide per
                  format. For example, a release with 2 slides in 3 formats
                  consumes 6 image credits or 30 video credits.
                </li>
                <li>
                  <strong>API Key</strong> — a secret token used to authenticate
                  programmatic access to the Service.
                </li>
              </ul>
            </Section>

            <Section title="3. Subscriptions and Billing">
              <p>
                The Service offers paid subscription plans billed on a monthly
                basis. By subscribing, you authorize us to charge your payment
                method on a recurring basis via Stripe.
              </p>
              <p>
                Subscriptions automatically renew at the end of each billing
                cycle unless you cancel before the renewal date. You may cancel
                or change your plan at any time through your account dashboard.
              </p>
              <p>
                Downgrades take effect at the end of the current billing cycle.
                Upgrades take effect immediately, and you will be charged the
                prorated difference.
              </p>
            </Section>

            <Section title="4. Credits and Usage">
              <p>
                Each subscription plan includes a monthly credit allocation.
                Credits are consumed when images or videos are generated through
                the API at a rate of 1 credit per slide per format for images
                and 5 credits per slide per format for videos. Unused credits do
                not roll over to the next billing cycle.
              </p>
              <p>
                Credits are atomically reserved at the time of a release request
                and refunded automatically if the render fails. Once images are
                successfully generated, the credits are considered consumed.
              </p>
            </Section>

            <Section title="5. Free Trial">
              <p>
                New accounts receive a one-time allocation of free credits. The
                free trial does not require a payment method. Free trial credits
                do not expire but are non-renewable.
              </p>
            </Section>

            <Section title="6. Refunds">
              <p>
                All subscription payments are non-refundable. You may cancel
                your subscription at any time, and your access will continue
                until the end of the current billing period. This does not
                affect your statutory rights under applicable consumer
                protection laws.
              </p>
            </Section>

            <Section title="7. Your Content">
              <p>
                You retain all rights to the content you submit to the Service
                (brand assets, logos, text, images, template configurations). By
                submitting content, you grant us a limited, non-exclusive
                license to process it solely for the purpose of operating the
                Service and generating your images.
              </p>
              <p>
                You are solely responsible for the content you submit. You
                represent and warrant that you have all necessary rights to the
                content you upload, including any logos, images, and trademarks.
              </p>
              <p>
                You agree not to submit content that:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Is unlawful, harmful, threatening, or defamatory</li>
                <li>Infringes on intellectual property rights of others</li>
                <li>Contains malware or malicious code</li>
                <li>Contains personally identifiable information of third parties without their consent</li>
                <li>Violates any applicable law or regulation</li>
              </ul>
              <p>
                We reserve the right to remove content that violates these Terms
                without notice.
              </p>
            </Section>

            <Section title="8. Generated Images">
              <p>
                Images generated through the Service are yours to use for any
                lawful purpose. We claim no ownership over generated images.
              </p>
              <p>
                Generated images are hosted on our CDN with long-lived cache
                headers. While we aim to provide reliable hosting, we do not
                guarantee indefinite availability. We recommend downloading and
                storing copies of your generated images.
              </p>
            </Section>

            <Section title="9. File Uploads">
              <p>
                The Service accepts image uploads (logos and assets) with the
                following restrictions:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Maximum file size: 5 MB</li>
                <li>Accepted formats: PNG, JPEG, WebP, SVG</li>
              </ul>
              <p>
                We reserve the right to reject uploads that exceed these limits
                or that contain malicious content.
              </p>
            </Section>

            <Section title="10. API Usage and Rate Limits">
              <p>
                Access to the API requires authentication via API key. Rate
                limits apply based on your subscription plan:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Trial: 10 requests per minute</li>
                <li>Starter: 30 requests per minute</li>
                <li>Pro: 60 requests per minute</li>
                <li>Scale: 120 requests per minute</li>
              </ul>
              <p>
                Additional restrictions: maximum 5 slides per format, maximum 3
                formats per release (landscape, square, portrait).
              </p>
              <p>
                You agree not to circumvent rate limits, reverse-engineer the
                API, or use the Service in a way that disrupts it for other
                users. We may suspend or terminate your access if we detect
                abusive usage patterns.
              </p>
            </Section>

            <Section title="11. API Key Security">
              <p>
                You are solely responsible for safeguarding your API keys. API
                keys grant full access to your account&apos;s image generation
                capabilities and credit balance.
              </p>
              <p>
                You must not share, publish, or embed API keys in client-side
                code. If you suspect an API key has been compromised, revoke it
                immediately through the dashboard. We are not liable for
                unauthorized usage resulting from compromised API keys.
              </p>
            </Section>

            <Section title="12. Webhooks">
              <p>
                The Service can deliver completion notifications to webhook URLs
                you provide. You are responsible for the security and
                availability of your webhook endpoints. We make a single
                delivery attempt and are not liable for failed deliveries or for
                data intercepted in transit to your endpoint.
              </p>
            </Section>

            <Section title="13. Acceptable Use">
              <p>You agree not to use the Service to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Generate images that contain illegal, obscene, or harmful content</li>
                <li>Impersonate another person or entity</li>
                <li>Resell, sublicense, or redistribute the Service without authorization</li>
                <li>Scrape, crawl, or harvest data from the Service</li>
                <li>Attempt to gain unauthorized access to other users&apos; accounts or data</li>
                <li>Interfere with or disrupt the Service or its infrastructure</li>
                <li>Use the Service for spam, phishing, or misleading content</li>
              </ul>
            </Section>

            <Section title="14. Account Termination">
              <p>
                We may terminate or suspend your account immediately, without
                prior notice, if you breach these Terms. Upon termination, your
                right to use the Service ceases immediately.
              </p>
              <p>
                You may delete your account at any time. Upon deletion, all your
                data (brands, templates, releases, API keys, and generated
                images) will be permanently removed in accordance with our{" "}
                <Link href="/privacy" className="underline hover:text-brand">
                  Privacy Policy
                </Link>
                . Active Stripe subscriptions will be cancelled immediately.
              </p>
            </Section>

            <Section title="15. Indemnification">
              <p>
                You agree to indemnify, defend, and hold harmless the Company
                from and against any claims, liabilities, damages, losses, and
                expenses (including reasonable legal fees) arising out of or
                related to your use of the Service, your Content, or your
                violation of these Terms.
              </p>
            </Section>

            <Section title="16. Limitation of Liability">
              <p>
                To the maximum extent permitted by law, the Company shall not be
                liable for any indirect, incidental, special, consequential, or
                punitive damages, including but not limited to loss of profits,
                data, or business opportunities.
              </p>
              <p>
                The Service is provided &quot;as is&quot; and &quot;as
                available&quot; without warranties of any kind, whether express
                or implied, including but not limited to implied warranties of
                merchantability, fitness for a particular purpose, and
                non-infringement.
              </p>
              <p>
                Our total liability for any claim arising from or related to the
                Service shall not exceed the amount you paid us in the 12 months
                preceding the claim.
              </p>
              <p>
                Nothing in these Terms excludes or limits liability for death or
                personal injury caused by negligence, fraud, or any liability
                that cannot be excluded by applicable law.
              </p>
            </Section>

            <Section title="17. Force Majeure">
              <p>
                We shall not be liable for any failure or delay in performing
                our obligations under these Terms due to circumstances beyond
                our reasonable control, including but not limited to natural
                disasters, war, terrorism, pandemics, government actions,
                internet outages, third-party service failures, or power
                failures.
              </p>
            </Section>

            <Section title="18. Governing Law and Disputes">
              <p>
                These Terms are governed by and construed in accordance with the
                laws of the Netherlands.
              </p>
              <p>
                In the event of a dispute, the parties shall first attempt to
                resolve it amicably by contacting{" "}
                <a
                  href="mailto:support@brag.fast"
                  className="underline hover:text-brand"
                >
                  support@brag.fast
                </a>
                . If the dispute cannot be resolved within 30 days, it shall be
                submitted to the competent courts in the Netherlands.
              </p>
              <p>
                If you are a consumer in the EU, you may also use the European
                Commission&apos;s Online Dispute Resolution platform at{" "}
                <a
                  href="https://ec.europa.eu/odr"
                  className="underline hover:text-brand"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ec.europa.eu/odr
                </a>
                .
              </p>
            </Section>

            <Section title="19. Changes to These Terms">
              <p>
                We reserve the right to modify these Terms at any time. We will
                provide at least 30 days&apos; notice of material changes by
                posting the updated Terms on this page and updating the
                &quot;Last updated&quot; date.
              </p>
              <p>
                Your continued use of the Service after changes take effect
                constitutes acceptance of the revised Terms. If you do not agree
                to the revised Terms, you must stop using the Service.
              </p>
            </Section>

            <Section title="20. Severability">
              <p>
                If any provision of these Terms is found to be unenforceable,
                the remaining provisions shall continue in full force and
                effect.
              </p>
            </Section>

            <Section title="21. Entire Agreement">
              <p>
                These Terms, together with our{" "}
                <Link href="/privacy" className="underline hover:text-brand">
                  Privacy Policy
                </Link>
                , constitute the entire agreement between you and the Company
                regarding the Service and supersede all prior agreements and
                understandings.
              </p>
            </Section>

            <Section title="22. Contact">
              <p>
                If you have questions about these Terms, contact us at{" "}
                <a
                  href="mailto:support@brag.fast"
                  className="underline hover:text-brand"
                >
                  support@brag.fast
                </a>
                .
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
