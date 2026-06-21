import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  Bot,
  CircleDollarSign,
  GitBranch,
  Globe2,
  LayoutDashboard,
  LineChart,
  Search,
  Settings,
  Sparkles,
  Trophy,
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

const stats = [
  {
    label: "Agent runs",
    value: "248",
    change: "+18.4%",
    icon: Bot,
  },
  {
    label: "Success rate",
    value: "74.2%",
    change: "+6.1%",
    icon: BadgeCheck,
  },
  {
    label: "Avg cost/run",
    value: "$0.38",
    change: "-12.7%",
    icon: CircleDollarSign,
  },
  {
    label: "Global rank",
    value: "#412",
    change: "+53",
    icon: Trophy,
  },
];

const navigationItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Activity, label: "Runs", active: false },
  { icon: LineChart, label: "Benchmarks", active: false },
  { icon: Globe2, label: "Global", active: false },
  { icon: GitBranch, label: "Workflows", active: false },
  { icon: Settings, label: "Settings", active: false },
];

const recentRuns = [
  {
    task: "Fix checkout retry bug",
    agent: "Codex",
    model: "GPT-5",
    outcome: "Completed",
    cost: "$0.42",
  },
  {
    task: "Refactor billing settings",
    agent: "Claude Code",
    model: "Sonnet",
    outcome: "Reviewed",
    cost: "$0.31",
  },
  {
    task: "Generate seed data",
    agent: "Cursor",
    model: "Auto",
    outcome: "Completed",
    cost: "$0.09",
  },
  {
    task: "Investigate flaky CI",
    agent: "Codex",
    model: "GPT-5",
    outcome: "Blocked",
    cost: "$0.57",
  },
];

const benchmarks = [
  ["Bug fixing", "GPT-5", "82%", "$0.44"],
  ["Test writing", "Claude Sonnet", "78%", "$0.29"],
  ["Repo exploration", "Gemini CLI", "71%", "$0.18"],
  ["Frontend polish", "Cursor", "69%", "$0.36"],
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-[240px_1fr]">
        <aside className="hidden border-r bg-card lg:block">
          <div className="flex h-16 items-center gap-2 border-b px-5">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </div>
            <span className="text-lg font-semibold">Atlas</span>
          </div>
          <nav className="space-y-1 p-3">
            {navigationItems.map(({ icon: Icon, label, active }) => (
              <Button
                key={label}
                variant={active ? "secondary" : "ghost"}
                className="w-full justify-start gap-2"
              >
                <Icon className="size-4" />
                {label}
              </Button>
            ))}
          </nav>
        </aside>

        <section className="min-w-0">
          <header className="flex h-16 items-center justify-between border-b px-4 sm:px-6">
            <div>
              <p className="text-sm text-muted-foreground">Personal workspace</p>
              <h1 className="text-xl font-semibold">Agent activity</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" aria-label="Search">
                <Search className="size-4" />
              </Button>
              <Button>
                Connect agent
                <ArrowUpRight className="size-4" />
              </Button>
            </div>
          </header>

          <div className="space-y-6 p-4 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <Card key={stat.label}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardDescription>{stat.label}</CardDescription>
                    <stat.icon className="size-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">{stat.value}</div>
                    <p className="mt-1 text-sm text-secondary">{stat.change}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle>Recent runs</CardTitle>
                      <CardDescription>
                        Agent work captured across local tools and IDEs.
                      </CardDescription>
                    </div>
                    <Badge variant="outline">Live soon</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Outcome</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentRuns.map((run) => (
                        <TableRow key={run.task}>
                          <TableCell className="font-medium">{run.task}</TableCell>
                          <TableCell>{run.agent}</TableCell>
                          <TableCell>{run.model}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                run.outcome === "Blocked" ? "destructive" : "secondary"
                              }
                            >
                              {run.outcome}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{run.cost}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Global signals</CardTitle>
                  <CardDescription>
                    Early benchmark categories for the opt-in data layer.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {benchmarks.map(([workflow, leader, success, cost]) => (
                    <div key={workflow} className="rounded-md border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{workflow}</p>
                        <Badge variant="outline">{success}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {leader} leads at {cost} avg cost.
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}