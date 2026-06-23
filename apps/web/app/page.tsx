import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  GitBranch,
  LucideIcon,
  MousePointer2,
  Terminal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Atlas | Builder reports for agent work",
  description:
    "Atlas turns AI coding agent runs into a private builder report, workgraph insights, and opt-in benchmarks.",
};

const navItems = [
  { label: "Report", href: "#report" },
  { label: "Signals", href: "#signals" },
  { label: "Sharing", href: "#sharing" },
];

const habits = [
  ["Steering", "92", "intervenes early", "bg-[#08251c]"],
  ["Planning", "84", "constraints first", "bg-[#6f9f45]"],
  ["Verification", "71", "tests arrive late", "bg-[#94b963]"],
];

const timeline = [
  ["09:12", "Codex", "Plan-first auth patch", "merged"],
  ["10:03", "Cursor", "Route tests", "reviewed"],
  ["13:44", "Claude Code", "Queue backend compare", "reused"],
  ["16:20", "Aider", "Billing flake trace", "blocked"],
];

const insightCards = [
  {
    title: "You rescue runs early.",
    body: "Your best interventions happen before the second failed patch, when context is still cheap to steer.",
    icon: MousePointer2,
  },
  {
    title: "Plan, patch, verify.",
    body: "Bug-fix runs land more often when the first prompt includes constraints, expected files, and tests.",
    icon: GitBranch,
  },
  {
    title: "Different agents, different lanes.",
    body: "Atlas separates UI edits, architecture reviews, and tight patch loops so tool choice becomes concrete.",
    icon: Bot,
  },
];

const benchmarkRows = [
  ["Private report", "You", "habits, costs, outcomes, steering"],
  ["Team rollup", "Workspace", "velocity, review quality, workflow patterns"],
  ["Public benchmark", "Opt-in", "anonymous tool and workflow rankings"],
];

type IconCardProps = {
  icon: LucideIcon;
  title: string;
  body: string;
};

function AtlasWordmark({ light = false }: { light?: boolean }) {
  return (
    <div className="group flex items-center gap-2.5" aria-label="Atlas">
      <div className="flex h-12 w-12 items-center justify-center bg-transparent">
        <Image
          src="/atlas-logo-minimal-mark.png"
          alt="Atlas logo"
          width={796}
          height={796}
          className="h-12 w-12 object-contain"
          priority
        />
      </div>
      <span
        className={cn(
          "font-display text-[26px] font-semibold leading-none tracking-[-0.035em] transition-colors duration-200",
          light ? "text-[#f6f8f1] group-hover:text-white" : "text-[#08251c] ",
        )}
      >
        Atlas
      </span>
    </div>
  );
}

function TextureGrid() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 bg-[#f6f8f1]" />
  );
}

function SectionPill({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5f8d3c]">
      {children}
    </p>
  );
}

function MetricBar({
  label,
  value,
  detail,
  color,
}: {
  label: string;
  value: string;
  detail: string;
  color: string;
}) {
  return (
    <div className="group min-w-0 border border-[#08251c] bg-[#fbfdf7] p-5 transition-colors duration-200">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#08251c]">{label}</p>
        <p className="font-code text-sm text-[#566b5f]">{value}</p>
      </div>
      <div className="mt-4 h-3 overflow-hidden border border-[#08251c] bg-[#d9e6ce]">
        <div
          className={cn(
            "h-full transition-[width,transform] duration-500 group-hover:translate-x-1",
            color,
          )}
          style={{ width: `${value}%` }}
        />
      </div>
      <p className="mt-4 text-xs uppercase tracking-[0.14em] text-[#6b7a70]">
        {detail}
      </p>
    </div>
  );
}

function BuilderReport() {
  return (
    <Card
      id="report"
      className="relative overflow-hidden rounded-lg border border-[#08251c] bg-[#fbfdf7]"
    >
      <div className="relative border-b border-[#d9e6ce] bg-[#eef4e4] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#6f9f45]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#b7d77a]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#08251c]" />
        </div>
      </div>

      <CardContent className="relative p-0">
        <div className="relative grid min-h-[540px] lg:grid-cols-[1fr_320px]">
          <div className="min-w-0 p-6 sm:p-8 lg:p-10">
            <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-start">
              <div className="min-w-0">
                <p className="font-code text-xs uppercase tracking-[0.22em] text-[#6b7a70]">
                  atlas.dev/naman
                </p>
                <h2 className="font-display mt-4 text-3xl font-semibold leading-tight tracking-normal text-[#08251c] sm:text-4xl">
                  Builder habits report
                </h2>
              </div>
              <Badge className="w-fit rounded-lg border border-[#08251c] bg-[#08251c] px-3 py-1 text-[#fbfdf7] hover:bg-[#08251c]">
                top 4% planner
              </Badge>
            </div>

            <div className="mt-16 grid gap-4 sm:mt-20 sm:grid-cols-3">
              {habits.map(([label, value, detail, color]) => (
                <MetricBar
                  key={label}
                  label={label}
                  value={value}
                  detail={detail}
                  color={color}
                />
              ))}
            </div>

            <div className="mt-8 overflow-hidden border border-[#08251c] bg-white">
              {timeline.map(([time, tool, task, result], index) => (
                <div
                  key={task}
                  className={cn(
                    "grid grid-cols-[54px_82px_minmax(0,1fr)] items-center gap-4 px-5 py-4 text-sm sm:grid-cols-[64px_104px_minmax(0,1fr)_78px]",
                    index !== timeline.length - 1 &&
                      "border-b border-[#d9e6ce]",
                  )}
                >
                  <span className="font-code text-xs text-[#7b8a80]">
                    {time}
                  </span>
                  <span className="font-semibold text-[#08251c]">{tool}</span>
                  <span className="min-w-0 truncate text-[#4f6259]">
                    {task}
                  </span>
                  <span className="hidden text-right text-xs font-semibold uppercase tracking-[0.12em] text-[#5f8d3c] sm:block">
                    {result}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <aside className="border-t border-[#08251c] bg-[#08251c] p-6 text-[#fbfdf7] sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
            <h3 className="font-display text-3xl font-semibold leading-tight tracking-normal">
              Move verification earlier.
            </h3>
            <p className="mt-5 text-sm leading-7 text-[#dce9d1]">
              Refactor runs land faster when tests arrive before the second
              patch. Add that constraint to future Codex tasks.
            </p>
            <div className="mt-9 grid gap-4">
              {[
                ["Plan-first runs", "42", "+31% completion"],
                ["Median cost", "$0.27", "per merged task"],
                ["Rescue moments", "18", "human steering wins"],
              ].map(([label, value, detail]) => (
                <div
                  key={label}
                  className="border border-white/20 bg-white/[0.04] p-5 transition-colors duration-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm uppercase tracking-[0.12em] text-[#dce9d1]">
                      {label}
                    </p>
                    <p className="font-display text-2xl font-semibold leading-none text-[#fbfdf7]">
                      {value}
                    </p>
                  </div>
                  <p className="mt-2 text-xs text-[#b7c8b0]">{detail}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </CardContent>
    </Card>
  );
}

function InsightCard({ icon: Icon, title, body }: IconCardProps) {
  return (
    <Card className="group h-full rounded-lg border-[#08251c] bg-[#fbfdf7] transition-colors duration-200">
      <CardHeader className="p-6">
        <Icon className="mb-8 size-5 text-[#6f9f45]" aria-hidden="true" />
        <CardTitle className="font-display text-lg font-semibold tracking-normal text-[#08251c]">
          {title}
        </CardTitle>
        <CardDescription className="leading-6 text-[#4f6259]">
          {body}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export default function LandingPage() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden text-[#08251c]">
      <TextureGrid />

      <header className="sticky top-0 z-40 border-b border-[#d9e6ce]/80 bg-[#f6f8f1]/96">
        <nav
          className="mx-auto grid max-w-[1160px] grid-cols-[1fr_auto] items-center gap-4 px-4 py-4 sm:px-6 md:grid-cols-[1fr_auto_1fr]"
          aria-label="Main navigation"
        >
          <Link href="/" className="justify-self-start">
            <AtlasWordmark />
          </Link>
          <div className="hidden items-center gap-7 justify-self-center md:flex">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="border-b border-transparent pb-1 text-sm font-medium tracking-normal text-[#5b6f63] transition-colors hover:border-[#6f9f45] hover:text-[#08251c]"
              >
                {item.label}
              </a>
            ))}
          </div>
          <Button
            asChild
            size="sm"
            className="justify-self-end rounded-lg border border-[#08251c] bg-[#08251c] px-4 text-xs font-semibold tracking-normal text-[#fbfdf7] transition-colors duration-200 hover:bg-[#123b2d]"
          >
            <a href="#start">
              Start
              <Terminal className="size-3.5" aria-hidden="true" />
            </a>
          </Button>
        </nav>
      </header>

      <section className="mx-auto max-w-[1160px] px-4 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-24">
        <div className="mx-auto max-w-[880px] text-center">
          <SectionPill>Agent work, turned into a builder report</SectionPill>
          <h1 className="font-display mx-auto mt-8 max-w-[860px] text-4xl font-semibold leading-[1.02] tracking-normal text-[#08251c] sm:text-6xl lg:text-[70px]">
            Understand how you build with agents.
          </h1>
          <p className="mx-auto mt-8 max-w-[720px] text-lg leading-8 text-[#4f6259]">
            Atlas turns Codex, Claude Code, Cursor, Aider, and Gemini CLI runs
            into one private report of your habits, outcomes, costs, and model
            choices.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row sm:items-center">
            <Button
              asChild
              size="lg"
              className="rounded-lg border border-[#08251c] bg-[#08251c] px-8 text-[#fbfdf7] transition-colors duration-200 hover:bg-[#123b2d]"
            >
              <a href="#start">
                Start tracking
                <Terminal className="size-4" aria-hidden="true" />
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-lg border-[#08251c] bg-[#fbfdf7] px-8 transition-colors duration-200 hover:bg-white"
            >
              <a href="#signals">
                See example report
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            </Button>
          </div>
        </div>

        <div className="relative mx-auto mt-16 max-w-[1100px] sm:mt-20">
          <BuilderReport />
        </div>
      </section>

      <section
        id="signals"
        className="border-y border-[#08251c] bg-[#f6f8f1]/78 px-4 py-20 sm:px-6 sm:py-24"
      >
        <div className="mx-auto max-w-[1160px]">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <div className="max-w-[560px]">
              <SectionPill>What Atlas notices</SectionPill>
              <h2 className="font-display mt-6 text-3xl font-semibold leading-tight tracking-normal sm:text-5xl">
                The report is the product.
              </h2>
              <p className="mt-5 text-base leading-7 text-[#4f6259]">
                Fewer generic dashboard boxes. More concrete artifacts you can
                read, share, and use to steer the next run.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {insightCards.map(({ icon: Icon, title, body }) => (
                <InsightCard key={title} icon={Icon} title={title} body={body} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="sharing"
        className="mx-auto grid max-w-[1160px] gap-10 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:items-center"
      >
        <div className="max-w-[560px]">
          <SectionPill>Sharing modes</SectionPill>
          <h2 className="font-display mt-6 text-3xl font-semibold leading-tight tracking-normal sm:text-5xl">
            Keep it private by default.
          </h2>
          <p className="mt-5 text-base leading-7 text-[#4f6259]">
            Personal, team, and public views stay separate.
          </p>
        </div>
        <Card className="rounded-lg border border-[#d9e6ce] bg-[#fbfdf7] shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#d9e6ce] hover:bg-transparent">
                  <TableHead>Layer</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead className="hidden sm:table-cell">Signal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {benchmarkRows.map(([layer, scope, signal]) => (
                  <TableRow key={layer}>
                    <TableCell className="font-semibold text-[#08251c]">
                      {layer}
                    </TableCell>
                    <TableCell className="text-[#4f6259]">{scope}</TableCell>
                    <TableCell className="hidden text-[#4f6259] sm:table-cell">
                      {signal}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section className="relative flex min-h-[280px] items-center justify-center overflow-hidden border-t border-[#08251c] bg-[#08251c] px-4 py-20 text-[#f6f8f1]">
        <Link
          href="/"
          className="font-display text-[clamp(5rem,18vw,15rem)] font-semibold leading-none tracking-[-0.07em]"
        >
          Atlas.
        </Link>
      </section>
    </main>
  );
}
