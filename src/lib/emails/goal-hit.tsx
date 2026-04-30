import { Button, Text, Section } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/layout";

interface GoalHitEmailProps {
  goalLabel: string;
  approveUrl: string;
}

export function GoalHitEmail({ goalLabel, approveUrl }: GoalHitEmailProps) {
  return (
    <EmailLayout preview={`You hit "${goalLabel}" — brag.fast drafted a post`}>
      <Text style={heading}>You hit {goalLabel}.</Text>
      <Text style={paragraph}>
        brag.fast already drafted the post. One click and it ships.
      </Text>
      <Section style={buttonContainer}>
        <Button style={button} href={approveUrl}>
          Review and approve
        </Button>
      </Section>
      <Text style={muted}>
        Goal hits also unlock the chance to set the next milestone. Pick what
        ships next from your dashboard.
      </Text>
    </EmailLayout>
  );
}

export default GoalHitEmail;

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

const buttonContainer: React.CSSProperties = {
  textAlign: "center" as const,
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
