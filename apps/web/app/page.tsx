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
  ["Steering", "92", "intervenes early", "bg-[#201915]"],
  ["Planning", "84", "constraints first", "bg-[#d9672e]"],
  ["Verification", "71", "tests arrive late", "bg-[#e7a251]"],
];

const timeline = [
  ["09:12", "Codex", "Plan-first auth patch", "merged"],
  ["10:03", "Cursor", "Route tests", "reviewed"],
  ["13:44", "Claude Code", "Queue backend compare", "reused"],
  ["16:20", "Aider", "Billing flake trace", "blocked"],
];

const insightCards = [
  {
    label: "Strongest habit",
    title: "You rescue runs early.",
    body: "Your best interventions happen before the second failed patch, when context is still cheap to steer.",
    icon: MousePointer2,
    rotate: "lg:-rotate-1",
  },
  {
    label: "Best workflow",
    title: "Plan, patch, verify.",
    body: "Bug-fix runs land more often when the first prompt includes constraints, expected files, and tests.",
    icon: GitBranch,
    rotate: "lg:rotate-1",
  },
  {
    label: "Model fit",
    title: "Different agents, different lanes.",
    body: "Atlas separates UI edits, architecture reviews, and tight patch loops so tool choice becomes concrete.",
    icon: Bot,
    rotate: "lg:-rotate-1",
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
    <div className="group flex items-center gap-3" aria-label="Atlas">
      <div className="flex h-10 w-10 items-center justify-center border border-[#f0b45f] bg-[#fffaf2] shadow-[3px_3px_0_#d9672e] transition-all duration-200 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 group-hover:shadow-[4px_4px_0_#d9672e]">
        <Image
          src="/atlas-logo-minimal-mark.png"
          alt="Atlas logo"
          width={796}
          height={796}
          className="h-8 w-8 object-contain"
          priority
        />
      </div>
      <span
        className={cn(
          "font-display text-[19px] font-semibold leading-none tracking-[0.08em] transition-colors duration-200",
          light ? "text-[#fff7eb] group-hover:text-white" : "text-[#201915] ",
        )}
      >
        Atlas
      </span>
    </div>
  );
}

function TextureGrid() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 bg-[#f7efe3]" />
  );
}

function SectionPill({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-3 border border-[#201915] bg-[#fffaf2] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6f5849]">
      <span className="h-2 w-2 bg-[#d9672e]" />
      {children}
    </div>
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
    <div className="group min-w-0 border border-[#201915] bg-[#fffaf2] p-5 transition-transform duration-300 hover:-translate-y-1">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#201915]">{label}</p>
        <p className="font-code text-sm text-[#8a6048]">{value}</p>
      </div>
      <div className="mt-4 h-3 overflow-hidden border border-[#201915] bg-[#f0e2d3]">
        <div
          className={cn(
            "h-full transition-[width,transform] duration-500 group-hover:translate-x-1",
            color,
          )}
          style={{ width: `${value}%` }}
        />
      </div>
      <p className="mt-4 text-xs uppercase tracking-[0.14em] text-[#77695f]">
        {detail}
      </p>
    </div>
  );
}

function BuilderReport() {
  return (
    <Card
      id="report"
      className="relative overflow-hidden rounded-none border-[1.5px] border-[#201915] bg-[#fffaf2]"
    >
      <div className="relative border-b border-[#201915] bg-[#fff3df] px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 bg-[#d9672e]" />
            <span className="h-3 w-3 bg-[#f0b45f]" />
            <span className="h-3 w-3 bg-[#201915]" />
          </div>
          <div className="font-code text-[10px] uppercase tracking-[0.22em] text-[#8f6f58]">
            private builder report
          </div>
        </div>
      </div>

      <CardContent className="relative p-0">
        <div className="relative grid min-h-[540px] lg:grid-cols-[1fr_320px]">
          <div className="min-w-0 p-6 sm:p-8 lg:p-10">
            <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-start">
              <div className="min-w-0">
                <p className="font-code text-xs uppercase tracking-[0.22em] text-[#88766b]">
                  atlas.dev/naman
                </p>
                <h2 className="font-display mt-4 text-3xl font-semibold leading-tight tracking-normal text-[#201915] sm:text-4xl">
                  Builder habits report
                </h2>
              </div>
              <Badge className="w-fit rounded-none border border-[#201915] bg-[#201915] px-3 py-1 text-[#fffaf2] hover:bg-[#201915]">
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

            <div className="mt-8 overflow-hidden border border-[#201915] bg-white">
              {timeline.map(([time, tool, task, result], index) => (
                <div
                  key={task}
                  className={cn(
                    "grid grid-cols-[54px_82px_minmax(0,1fr)] items-center gap-4 px-5 py-4 text-sm sm:grid-cols-[64px_104px_minmax(0,1fr)_78px]",
                    index !== timeline.length - 1 &&
                      "border-b border-[#f0e1cf]",
                  )}
                >
                  <span className="font-code text-xs text-[#9b8879]">
                    {time}
                  </span>
                  <span className="font-semibold text-[#201915]">{tool}</span>
                  <span className="min-w-0 truncate text-[#65574f]">
                    {task}
                  </span>
                  <span className="hidden text-right text-xs font-semibold uppercase tracking-[0.12em] text-[#9f603c] sm:block">
                    {result}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <aside className="border-t border-[#201915] bg-[#201915] p-6 text-[#fffaf2] sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
            <div className="font-code text-xs uppercase tracking-[0.22em] text-[#f0b45f]">
              next best habit
            </div>
            <h3 className="font-display mt-6 text-3xl font-semibold leading-tight tracking-normal">
              Move verification earlier.
            </h3>
            <p className="mt-5 text-sm leading-7 text-[#dbcbbb]">
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
                  className="border border-white/20 bg-white/[0.04] p-5 transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm uppercase tracking-[0.12em] text-[#d8c8b8]">
                      {label}
                    </p>
                    <p className="font-display text-2xl font-semibold leading-none text-[#fffaf2]">
                      {value}
                    </p>
                  </div>
                  <p className="mt-2 text-xs text-[#bca997]">{detail}</p>
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
    <Card className="group h-full rounded-none border-[#201915] bg-[#fffaf2] transition-all duration-300 hover:-translate-y-1">
      <CardHeader className="p-6">
        <Icon className="mb-8 size-5 text-[#d9672e]" aria-hidden="true" />
        <CardTitle className="font-display text-lg font-semibold tracking-normal text-[#201915]">
          {title}
        </CardTitle>
        <CardDescription className="leading-6 text-[#65574f]">
          {body}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export default function LandingPage() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden text-[#201915]">
      <TextureGrid />

      <header className="sticky top-0 z-40 border-b border-[#ead8c2]/80 bg-[#f7efe3]/96">
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
                className="border-b border-transparent pb-1 text-sm font-medium tracking-normal text-[#705d51] transition-colors hover:border-[#d9672e] hover:text-[#201915]"
              >
                {item.label}
              </a>
            ))}
          </div>
          <Button
            asChild
            size="sm"
            className="justify-self-end rounded-none border border-[#201915] bg-[#201915] px-4 text-xs font-semibold tracking-normal text-[#fffaf2] transition-all duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#2c211b]"
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
          <h1 className="font-display mx-auto mt-8 max-w-[860px] text-4xl font-semibold leading-[1.02] tracking-normal text-[#201915] sm:text-6xl lg:text-[70px]">
            Understand how you build with agents.
          </h1>
          <p className="mx-auto mt-8 max-w-[720px] text-lg leading-8 text-[#65574f]">
            Atlas turns Codex, Claude Code, Cursor, Aider, and Gemini CLI runs
            into one private report of your habits, outcomes, costs, and model
            choices.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row sm:items-center">
            <Button
              asChild
              size="lg"
              className="rounded-none border border-[#201915] bg-[#201915] px-8 text-[#fffaf2] transition-all duration-200 hover:-translate-x-1 hover:-translate-y-1 hover:bg-[#2c211b]"
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
              className="rounded-none border-[#201915] bg-[#fffaf2] px-8 transition-all duration-200 hover:-translate-x-1 hover:-translate-y-1 hover:bg-white"
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
        className="border-y border-[#201915] bg-[#fff7eb]/78 px-4 py-20 sm:px-6 sm:py-24"
      >
        <div className="mx-auto max-w-[1160px]">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <div className="max-w-[560px]">
              <SectionPill>What Atlas notices</SectionPill>
              <h2 className="font-display mt-6 text-3xl font-semibold leading-tight tracking-normal sm:text-5xl">
                The report is the product.
              </h2>
              <p className="mt-5 text-base leading-7 text-[#65574f]">
                Fewer generic dashboard boxes. More concrete artifacts you can
                read, share, and use to steer the next run.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {insightCards.map(
                ({ label, rotate, icon: Icon, title, body }) => (
                  <div
                    key={title}
                    className={cn(
                      "transition-transform duration-300 hover:rotate-0",
                      rotate,
                    )}
                  >
                    <div className="mb-3 font-code text-xs uppercase tracking-[0.2em] text-[#9a6543]">
                      {label}
                    </div>
                    <InsightCard icon={Icon} title={title} body={body} />
                  </div>
                ),
              )}
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
          <p className="mt-5 text-base leading-7 text-[#65574f]">
            Personal, team, and public views stay separate.
          </p>
        </div>
        <Card className="rounded-none border-[#201915] bg-[#fffaf2]">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#201915] hover:bg-transparent">
                  <TableHead>Layer</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead className="hidden sm:table-cell">Signal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {benchmarkRows.map(([layer, scope, signal]) => (
                  <TableRow key={layer}>
                    <TableCell className="font-semibold text-[#201915]">
                      {layer}
                    </TableCell>
                    <TableCell className="text-[#65574f]">{scope}</TableCell>
                    <TableCell className="hidden text-[#65574f] sm:table-cell">
                      {signal}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section className="relative h-[280px] overflow-hidden border-t border-[#201915] bg-[#201915] text-[#fff7eb] sm:h-[320px]">
        <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none text-center font-display text-[clamp(6rem,24vw,21rem)] font-semibold leading-none text-[#fff7eb]/10">
          Atlas.
        </div>
        <div className="relative z-10 flex h-full items-center justify-center">
          <Link href="/" className="group">
            <div className="flex h-36 w-36 items-center justify-center border border-[#f0b45f] bg-[#fffaf2] shadow-[10px_10px_0_#d9672e] transition-all duration-200 group-hover:-translate-x-1.5 group-hover:-translate-y-1.5 group-hover:shadow-[14px_14px_0_#d9672e] sm:h-44 sm:w-44">
              <Image
                src="/atlas-logo-minimal-mark.png"
                alt="Atlas logo"
                width={746}
                height={746}
                className="h-24 w-24 object-contain sm:h-28 sm:w-28"
              />
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}
