"use client";

import { useState } from "react";
import { CookSection } from "@/components/ui/cook-section";
import { CookSprite, type ChefPose } from "@/components/cook-sprite";
import { PixelButton } from "./pixel-button";
import { PixelBadge } from "./pixel-badge";
import { GitHubSection } from "./github-section";
import { GoalsSection, type Goal } from "./goals-section";
import { InlineIntegrationForm, PROVIDER_LABELS, type Provider } from "./integration-forms";

type SourceSystem = Provider | "github";

type GitHubInstallation = {
  _id: string;
  installationId: number;
  accountLogin: string;
  accountType: string;
  enabled: boolean;
  status: string;
  lastScanAt: string | null;
  lastScanOkAt: string | null;
  lastScanError: string | null;
};

type GitHubPropShape = {
  installations: GitHubInstallation[];
  appSlug: string;
};

type IntegrationRow = {
  provider: Provider;
  enabled: boolean;
  lastScanAt: string | null;
  lastScanOkAt: string | null;
  lastScanError: string | null;
};

interface Props {
  github: GitHubPropShape;
  rows: IntegrationRow[] | null;
  goals: Goal[];
  onReload: () => Promise<void> | void;
  onComplete: () => void;
}

type StepKey = "intro" | "github" | "stripe" | "posthog" | "ga4" | "goals" | "done";

interface StepDef {
  key: StepKey;
  index: number;
  title: string;
  pose: ChefPose;
  system: SourceSystem | null;
}

const STEPS: StepDef[] = [
  { key: "intro", index: 0, title: "Meet your Sous-Chef", pose: "wave", system: null },
  { key: "github", index: 1, title: "GitHub — ship from merged PRs", pose: "pot", system: "github" },
  { key: "stripe", index: 2, title: "Stripe — revenue milestones", pose: "plate", system: "stripe" },
  { key: "posthog", index: 3, title: "PostHog — visitor milestones", pose: "salad", system: "posthog" },
  { key: "ga4", index: 4, title: "Google Analytics — visitor milestones", pose: "thinking", system: "ga4" },
  { key: "goals", index: 5, title: "Goals — pick what to celebrate", pose: "pointUp", system: null },
  { key: "done", index: 6, title: "You're set", pose: "thumbsUp", system: null },
];

export function SousChefWizard({ github, rows, goals, onReload, onComplete }: Props) {
  const [activeStep, setActiveStep] = useState(0);

  const githubConnected = github.installations.some(
    (i) => i.status === "active" && i.enabled,
  );
  const byProvider = new Map<Provider, IntegrationRow>(
    (rows ?? []).map((r) => [r.provider, r]),
  );

  function goTo(n: number) {
    setActiveStep(Math.max(0, Math.min(STEPS.length - 1, n)));
  }

  async function handleProviderDone(provider: Provider, nextStep: number) {
    await onReload();
    goTo(nextStep);
  }

  function isConnected(system: SourceSystem | null): boolean {
    if (system === null) return false;
    if (system === "github") return githubConnected;
    return !!byProvider.get(system)?.enabled;
  }

  const activePose = STEPS[activeStep].pose;

  return (
    <div className="border-2 border-brand bg-white shadow-[8px_8px_0_var(--color-brand)]">
      <div className="flex flex-col md:flex-row">
        <div className="md:w-[200px] shrink-0 border-b-2 md:border-b-0 md:border-r-2 border-brand/10 bg-surface flex items-center justify-center p-4">
          <CookSprite pose={activePose} width={160} />
        </div>

        <div className="flex-1 p-4 md:p-6">
          <div className="mb-4">
            <h2 className="font-[family-name:var(--font-press-start)] text-sm text-brand mb-1">
              Get started
            </h2>
            <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/60">
              Step {activeStep + 1} of {STEPS.length}
            </p>
          </div>

          <div>
            {STEPS.map((step) => (
              <StepRow
                key={step.key}
                step={step}
                isOpen={activeStep === step.index}
                onToggle={(open) => {
                  if (open) goTo(step.index);
                  else if (activeStep === step.index) goTo(step.index + 1);
                }}
                connected={isConnected(step.system)}
              >
                {step.key === "intro" && (
                  <IntroBody onStart={() => goTo(1)} />
                )}
                {step.key === "github" && (
                  <GithubBody
                    github={github}
                    connected={githubConnected}
                    onNext={() => goTo(2)}
                  />
                )}
                {step.key === "stripe" && (
                  <ProviderBody
                    provider="stripe"
                    connected={!!byProvider.get("stripe")?.enabled}
                    onDone={() => handleProviderDone("stripe", 3)}
                    onNext={() => goTo(3)}
                  />
                )}
                {step.key === "posthog" && (
                  <ProviderBody
                    provider="posthog"
                    connected={!!byProvider.get("posthog")?.enabled}
                    onDone={() => handleProviderDone("posthog", 4)}
                    onNext={() => goTo(4)}
                  />
                )}
                {step.key === "ga4" && (
                  <ProviderBody
                    provider="ga4"
                    connected={!!byProvider.get("ga4")?.enabled}
                    onDone={() => handleProviderDone("ga4", 5)}
                    onNext={() => goTo(5)}
                  />
                )}
                {step.key === "goals" && (
                  <GoalsBody
                    github={githubConnected}
                    byProvider={byProvider}
                    goals={goals}
                    onReload={onReload}
                    onNext={() => goTo(6)}
                  />
                )}
                {step.key === "done" && <DoneBody onFinish={onComplete} />}
              </StepRow>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepRow({
  step,
  isOpen,
  onToggle,
  connected,
  children,
}: {
  step: StepDef;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  connected: boolean;
  children: React.ReactNode;
}) {
  const title = step.system ? (
    <span className="flex items-center gap-3">
      <span>{step.title}</span>
      <span
        className={`font-[family-name:var(--font-press-start)] text-[9px] px-2 py-0.5 border-2 border-brand uppercase tracking-wider ${
          connected ? "bg-gold text-brand" : "bg-surface text-brand/60"
        }`}
      >
        {connected ? "Connected" : "Off"}
      </span>
    </span>
  ) : (
    step.title
  );

  return (
    <CookSection title={title} isOpen={isOpen} onToggle={onToggle}>
      {children}
    </CookSection>
  );
}

function IntroBody({ onStart }: { onStart: () => void }) {
  return (
    <div className="space-y-4 px-1">
      <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/80">
        Sous-Chef watches your connected apps for milestones and drafts brag posts automatically.
        You still approve every post — Sous-Chef just catches the moments you&apos;d otherwise miss.
      </p>
      <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/60">
        Connect GitHub, Stripe, PostHog, or GA4 — or skip ahead to any one you care about.
      </p>
      <div className="pt-2">
        <PixelButton variant="primary" onClick={onStart}>
          Start tour
        </PixelButton>
      </div>
    </div>
  );
}

function GithubBody({
  github,
  connected,
  onNext,
}: {
  github: GitHubPropShape;
  connected: boolean;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4 px-1">
      <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/80">
        When a pull request merges into <code>main</code>, Sous-Chef drafts a brag post from the PR title and body.
      </p>
      <GitHubSection installations={github.installations} appSlug={github.appSlug} />
      <div className="pt-2 flex gap-2">
        <PixelButton onClick={onNext}>{connected ? "Next" : "Skip for now"}</PixelButton>
      </div>
    </div>
  );
}

function ProviderBody({
  provider,
  connected,
  onDone,
  onNext,
}: {
  provider: Provider;
  connected: boolean;
  onDone: () => void;
  onNext: () => void;
}) {
  if (connected) {
    return (
      <div className="space-y-3 px-1">
        <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/80">
          {PROVIDER_LABELS[provider]} is connected. Sous-Chef will watch for milestones on the next scan.
        </p>
        <PixelButton onClick={onNext}>Next</PixelButton>
      </div>
    );
  }
  return (
    <div className="space-y-4 px-1">
      <InlineIntegrationForm provider={provider} onDone={onDone} />
      <div className="pt-2">
        <PixelButton variant="ghost" onClick={onNext}>
          Skip for now
        </PixelButton>
      </div>
    </div>
  );
}

function GoalsBody({
  github,
  byProvider,
  goals,
  onReload,
  onNext,
}: {
  github: boolean;
  byProvider: Map<Provider, IntegrationRow>;
  goals: Goal[];
  onReload: () => Promise<void> | void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-6 px-1">
      <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/80">
        Pick milestones worth celebrating. Sous-Chef drafts a post when you hit one.
      </p>

      <GoalsSection
        provider="github"
        connected={github}
        goals={goals.filter((g) => g.provider === "github")}
        onReload={() => onReload()}
      />
      <GoalsSection
        provider="stripe"
        connected={!!byProvider.get("stripe")?.enabled}
        goals={goals.filter((g) => g.provider === "stripe")}
        onReload={() => onReload()}
      />
      <GoalsSection
        provider="posthog"
        connected={!!byProvider.get("posthog")?.enabled}
        goals={goals.filter((g) => g.provider === "posthog")}
        onReload={() => onReload()}
      />
      <GoalsSection
        provider="ga4"
        connected={!!byProvider.get("ga4")?.enabled}
        goals={goals.filter((g) => g.provider === "ga4")}
        onReload={() => onReload()}
      />

      <div className="pt-2">
        <PixelButton onClick={onNext}>Next</PixelButton>
      </div>
    </div>
  );
}

function DoneBody({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="space-y-4 px-1">
      <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/80">
        You&apos;re set. Sous-Chef will draft posts automatically as milestones land. You&apos;ll find them in
        <PixelBadge label="Drafts" /> — approve, cook, post.
      </p>
      <PixelButton variant="primary" onClick={onFinish}>
        You&apos;re set — take me to Sous-Chef
      </PixelButton>
    </div>
  );
}
