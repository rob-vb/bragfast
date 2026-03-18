import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from "@react-email/components";
import * as React from "react";

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Logo / brand */}
          <Section style={logoSection}>
            <Text style={logoText}>brag.fast</Text>
          </Section>

          {/* Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              brag.fast — Ship your wins.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: "#f6f6f6",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: "0",
  padding: "0",
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  maxWidth: "560px",
  padding: "0",
};

const logoSection: React.CSSProperties = {
  backgroundColor: "#3E2723",
  padding: "24px 32px",
};

const logoText: React.CSSProperties = {
  color: "#F2C94C",
  fontSize: "20px",
  fontWeight: "700",
  fontFamily: "monospace",
  margin: "0",
  letterSpacing: "1px",
};

const content: React.CSSProperties = {
  padding: "32px",
};

const hr: React.CSSProperties = {
  borderColor: "#e5e5e5",
  margin: "0",
};

const footer: React.CSSProperties = {
  padding: "24px 32px",
};

const footerText: React.CSSProperties = {
  color: "#999999",
  fontSize: "12px",
  margin: "0",
};
