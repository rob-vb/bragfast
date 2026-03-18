import { Button, Text, Section } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/layout";

interface ResetPasswordEmailProps {
  resetUrl: string;
}

export function ResetPasswordEmail({ resetUrl }: ResetPasswordEmailProps) {
  return (
    <EmailLayout preview="Reset your password">
      <Text style={heading}>Reset your password</Text>
      <Text style={paragraph}>
        Hey, we got a request to reset your password. Click the button below to
        choose a new one.
      </Text>
      <Section style={buttonContainer}>
        <Button style={button} href={resetUrl}>
          Reset password
        </Button>
      </Section>
      <Text style={muted}>
        If you didn&apos;t request this, you can safely ignore this email. The
        link will expire shortly.
      </Text>
    </EmailLayout>
  );
}

export default ResetPasswordEmail;

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
