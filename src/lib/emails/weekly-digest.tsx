import { Button, Text, Section } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/layout";

export interface WeeklyDigestEmailProps {
  approved: number;
  drafted: number;
  autoSkipped: number;
  userSkipped: number;
  approvedBySource: Record<string, number>;
  topReferences: Array<{ reference: string; count: number }>;
  dashboardUrl: string;
}

const SOURCE_LABELS: Record<string, string> = {
  github: "GitHub",
  stripe: "Stripe",
  posthog: "PostHog",
  ga4: "GA4",
  manual: "Manual",
};

export function WeeklyDigestEmail({
  approved,
  drafted,
  autoSkipped,
  userSkipped,
  approvedBySource,
  topReferences,
  dashboardUrl,
}: WeeklyDigestEmailProps) {
  const sources = Object.entries(approvedBySource).sort((a, b) => b[1] - a[1]);
  return (
    <EmailLayout preview={`You shipped ${approved} brag${approved === 1 ? "" : "s"} this week`}>
      <Text style={heading}>
        {approved} brag{approved === 1 ? "" : "s"} shipped this week.
      </Text>
      <Text style={paragraph}>
        Here's what your kitchen cooked over the last 7 days.
      </Text>

      <Section style={statsSection}>
        <Text style={statsRow}>
          <strong>{approved}</strong> approved · <strong>{drafted}</strong> drafted ·{" "}
          <strong>{userSkipped}</strong> skipped by you ·{" "}
          <strong>{autoSkipped}</strong> auto-skipped
        </Text>
      </Section>

      {sources.length > 0 ? (
        <Section style={blockSection}>
          <Text style={blockHeading}>Approved by source</Text>
          {sources.map(([src, n]) => (
            <Text key={src} style={blockRow}>
              {SOURCE_LABELS[src] ?? src}: <strong>{n}</strong>
            </Text>
          ))}
        </Section>
      ) : null}

      {topReferences.length > 0 ? (
        <Section style={blockSection}>
          <Text style={blockHeading}>Top references</Text>
          {topReferences.map((r) => (
            <Text key={r.reference} style={blockRow}>
              {r.reference} — <strong>{r.count}</strong>
            </Text>
          ))}
        </Section>
      ) : null}

      <Section style={buttonContainer}>
        <Button style={button} href={dashboardUrl}>
          See full history
        </Button>
      </Section>

      <Text style={muted}>
        You're getting this because you shipped at least one brag this week. No
        wins, no email — we don't spam silent weeks.
      </Text>
    </EmailLayout>
  );
}

export default WeeklyDigestEmail;

const heading: React.CSSProperties = {
  color: "#3E2723",
  fontSize: "24px",
  fontWeight: "700",
  margin: "0 0 16px 0",
};

const paragraph: React.CSSProperties = {
  color: "#3E2723",
  fontSize: "16px",
  lineHeight: "1.5",
  margin: "0 0 24px 0",
};

const statsSection: React.CSSProperties = {
  backgroundColor: "#FFF8E1",
  border: "2px solid #3E2723",
  padding: "16px",
  margin: "0 0 24px 0",
};

const statsRow: React.CSSProperties = {
  color: "#3E2723",
  fontSize: "15px",
  margin: "0",
  lineHeight: "1.6",
};

const blockSection: React.CSSProperties = {
  margin: "0 0 24px 0",
};

const blockHeading: React.CSSProperties = {
  color: "#3E2723",
  fontSize: "14px",
  fontWeight: "700",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
  margin: "0 0 8px 0",
};

const blockRow: React.CSSProperties = {
  color: "#3E2723",
  fontSize: "14px",
  margin: "0 0 4px 0",
};

const buttonContainer: React.CSSProperties = {
  textAlign: "center" as const,
  margin: "8px 0 0 0",
};

const button: React.CSSProperties = {
  backgroundColor: "#F2C94C",
  borderRadius: "0px",
  border: "2px solid #3E2723",
  color: "#3E2723",
  display: "inline-block",
  fontFamily: "monospace",
  fontSize: "14px",
  fontWeight: "700",
  letterSpacing: "1px",
  padding: "12px 24px",
  textDecoration: "none",
  textTransform: "uppercase" as const,
};

const muted: React.CSSProperties = {
  color: "#999999",
  fontSize: "13px",
  lineHeight: "1.5",
  margin: "24px 0 0 0",
};
