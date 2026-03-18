import { Button, Text, Section } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/layout";

interface WelcomeEmailProps {
  name: string;
  dashboardUrl: string;
}

export function WelcomeEmail({ name, dashboardUrl }: WelcomeEmailProps) {
  return (
    <EmailLayout preview="Welcome to brag.fast!">
      <Text style={heading}>Welcome to brag.fast!</Text>
      <Text style={paragraph}>
        Hey {name}, you&apos;re in. Start sharing your wins with the world.
      </Text>
      <Section style={buttonContainer}>
        <Button style={button} href={dashboardUrl}>
          Go to dashboard
        </Button>
      </Section>
    </EmailLayout>
  );
}

export default WelcomeEmail;

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
