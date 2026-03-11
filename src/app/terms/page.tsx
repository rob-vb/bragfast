import Link from "next/link";
import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/landing-nav";

export const metadata: Metadata = {
  title: "Terms and Conditions — Bragfast",
  description: "Terms and conditions for using the Bragfast service.",
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
            Last updated: March 11, 2026
          </p>

          <div className="space-y-8 font-[family-name:var(--font-geist-sans)] text-sm text-brand/80 leading-relaxed">
            <Section title="1. Introduction">
              <p>
                These Terms and Conditions govern your use of the Bragfast
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
                  <strong>Service</strong> — the Bragfast website, API, and
                  image generation platform.
                </li>
                <li>
                  <strong>Content</strong> — images, text, data, or other
                  materials you submit to or generate through the Service.
                </li>
                <li>
                  <strong>Subscription</strong> — a paid plan granting access to
                  the Service with a monthly credit allocation.
                </li>
                <li>
                  <strong>Credits</strong> — units of usage. 1 credit = 1 image
                  generated in 1 format.
                </li>
              </ul>
            </Section>

            <Section title="3. Subscriptions and Billing">
              <p>
                The Service offers paid subscription plans billed on a monthly
                basis. By subscribing, you authorize us to charge your payment
                method on a recurring basis.
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
                Credits are consumed when images are generated through the API.
                Unused credits do not roll over to the next billing cycle.
              </p>
              <p>
                Credits are reserved at the time of a release request and
                refunded automatically if the render fails. Once images are
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
                until the end of the current billing period.
              </p>
            </Section>

            <Section title="7. Your Content">
              <p>
                You retain all rights to the content you submit to the Service
                (brand assets, logos, text, images). By submitting content, you
                grant us a limited license to process it solely for the purpose
                of generating your images.
              </p>
              <p>
                You are solely responsible for the content you submit. You agree
                not to submit content that:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Is unlawful, harmful, threatening, or defamatory</li>
                <li>Infringes on intellectual property rights of others</li>
                <li>Contains malware or malicious code</li>
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
                Generated images are hosted on our CDN. While we aim to provide
                reliable hosting, we do not guarantee indefinite availability.
                We recommend downloading and storing copies of your generated
                images.
              </p>
            </Section>

            <Section title="9. API Usage">
              <p>
                Access to the API is subject to rate limits based on your
                subscription plan. You agree not to circumvent rate limits,
                abuse the API, or use the Service in a way that disrupts it for
                other users.
              </p>
              <p>
                We may suspend or terminate your access if we detect abusive
                usage patterns.
              </p>
            </Section>

            <Section title="10. Account Termination">
              <p>
                We may terminate or suspend your account immediately, without
                prior notice, if you breach these Terms. Upon termination, your
                right to use the Service ceases immediately.
              </p>
              <p>
                You may delete your account at any time. Upon deletion, your
                data will be removed in accordance with our{" "}
                <Link href="/privacy" className="underline hover:text-brand">
                  Privacy Policy
                </Link>
                .
              </p>
            </Section>

            <Section title="11. Limitation of Liability">
              <p>
                To the maximum extent permitted by law, the Company shall not be
                liable for any indirect, incidental, special, consequential, or
                punitive damages, including but not limited to loss of profits,
                data, or business opportunities.
              </p>
              <p>
                The Service is provided &quot;as is&quot; and &quot;as
                available&quot; without warranties of any kind, whether express
                or implied. We do not warrant that the Service will be
                uninterrupted, error-free, or secure.
              </p>
              <p>
                Our total liability for any claim arising from or related to the
                Service shall not exceed the amount you paid us in the 12 months
                preceding the claim.
              </p>
            </Section>

            <Section title="12. Governing Law">
              <p>
                These Terms are governed by and construed in accordance with the
                laws of the Netherlands. Any disputes shall be resolved in the
                courts of the Netherlands.
              </p>
            </Section>

            <Section title="13. Changes to These Terms">
              <p>
                We reserve the right to modify these Terms at any time. We will
                provide at least 30 days&apos; notice of material changes by
                posting the updated Terms on this page and updating the
                &quot;Last updated&quot; date.
              </p>
              <p>
                Your continued use of the Service after changes take effect
                constitutes acceptance of the revised Terms.
              </p>
            </Section>

            <Section title="14. Severability">
              <p>
                If any provision of these Terms is found to be unenforceable,
                the remaining provisions shall continue in full force and
                effect.
              </p>
            </Section>

            <Section title="15. Contact">
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
