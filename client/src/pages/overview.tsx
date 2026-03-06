import { useServices } from "@/hooks/use-services";
import { useDocuments } from "@/hooks/use-documents";
import { useOtpSecrets } from "@/hooks/use-otp-secrets";
import { Server, FileText, KeyRound, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

function CircleProgress({ label, value, color, suffix = "%" }: { label: string; value: number | null; color: string; suffix?: string }) {
  const safe = Math.max(0, Math.min(100, value ?? 0));
  const radius = 34;
  const c = 2 * Math.PI * radius;
  const offset = c - (safe / 100) * c;
  return (
    <div className="rounded-xl border border-border/40 p-4 flex items-center gap-4">
      <svg width="88" height="88" viewBox="0 0 88 88" className="shrink-0">
        <circle cx="44" cy="44" r={radius} stroke="currentColor" className="text-muted/30" strokeWidth="8" fill="none" />
        <circle
          cx="44"
          cy="44"
          r={radius}
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 44 44)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold mt-1">{value == null ? "-" : `${value}${suffix}`}</div>
      </div>
    </div>
  );
}

export default function Overview() {
  const { data: services } = useServices();
  const { data: documents } = useDocuments();
  const { data: otpSecrets } = useOtpSecrets();
  const { data: usage, isLoading: usageLoading, isFetching: usageFetching } = useQuery<{
    contextUsedK: number | null;
    contextTotalK: number | null;
    contextPercent: number | null;
    cachePercent: number | null;
    weekLeftPercent: number | null;
    weekUsageTokens: number | null;
    totalUsageTokens: number | null;
    raw: string;
  }>({
    queryKey: ["/api/openclaw/usage"],
    queryFn: async () => {
      const res = await fetch("/api/openclaw/usage", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load usage");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: serverStatus } = useQuery<{
    updatedAt: string;
    servers: Array<{ name: string; host: string; port: number; os: string; online: boolean }>;
  }>({
    queryKey: ["/api/server-status"],
    queryFn: async () => {
      const res = await fetch("/api/server-status", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load server status");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const metrics = [
    { label: "Active Services", value: services?.length || 0, icon: Server, url: "/services", color: "text-blue-500" },
    { label: "Documents", value: documents?.length || 0, icon: FileText, url: "/documents", color: "text-amber-500" },
    { label: "Authenticators", value: otpSecrets?.length || 0, icon: KeyRound, url: "/otp-codes", color: "text-emerald-500" },
  ];

  const recentDocs = documents?.slice(0, 4).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-12 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Overview</h1>
        <p className="text-muted-foreground mt-2 text-lg">Your personal management center at a glance.</p>
      </header>

      <section className="bg-card rounded-2xl p-6 border border-border/40 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">OpenClaw Usage</h2>
          <span className="text-xs text-muted-foreground">auto refresh: 30s</span>
        </div>
        <div className="mt-4 rounded-xl border border-border/40 p-4">
          <div className="text-xs text-muted-foreground">Context</div>
          <div className="text-2xl font-bold mt-1">
            {usageLoading ? "加载中..." : `${usage?.contextUsedK ?? "-"}k / ${usage?.contextTotalK ?? "-"}k`}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <CircleProgress label="Context usage" value={usage?.contextPercent ?? null} color="#3b82f6" />
          <CircleProgress label="Cache hit" value={usage?.cachePercent ?? null} color="#10b981" />
          <CircleProgress
            label="Week left"
            value={usage?.weekLeftPercent ?? null}
            color="#f59e0b"
          />
        </div>
        <div className="mt-2 text-xs text-muted-foreground">Total usage tokens: {usage?.totalUsageTokens?.toLocaleString?.() ?? "-"}</div>
        <div className="mt-1 text-xs text-muted-foreground flex items-center gap-2">
          <span>Week usage tokens: {usage?.weekUsageTokens?.toLocaleString?.() ?? "-"}</span>
          {(usageLoading || usageFetching) && <span className="animate-pulse">加载中...</span>}
        </div>
      </section>

      <section className="bg-card rounded-2xl p-6 border border-border/40 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Server Status</h2>
          <span className="text-xs text-muted-foreground">auto refresh: 10s</span>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {serverStatus?.servers?.map((s) => (
            <div key={s.name} className="rounded-xl border border-border/40 p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{s.name}</div>
                <div className="text-xs text-muted-foreground">{s.host}:{s.port}</div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${s.online ? "bg-emerald-500/15 text-emerald-600" : "bg-rose-500/15 text-rose-600"}`}>
                {s.online ? "Online" : "Offline"}
              </span>
            </div>
          )) || <div className="text-sm text-muted-foreground">No server status data.</div>}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.map((metric) => (
          <Link key={metric.label} href={metric.url}>
            <div className="bg-card rounded-2xl p-6 border border-border/40 shadow-sm hover-elevate cursor-pointer flex flex-col justify-between h-full group">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-xl bg-muted group-hover:bg-background transition-colors ${metric.color}`}>
                  <metric.icon className="w-6 h-6" />
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
              </div>
              <div className="mt-8">
                <h3 className="text-3xl font-bold text-foreground">{metric.value}</h3>
                <p className="text-sm font-medium text-muted-foreground mt-1">{metric.label}</p>
              </div>
            </div>
          </Link>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Recent Documents</h2>
            <Link href="/documents" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">View all</Link>
          </div>
          <div className="bg-card rounded-2xl border border-border/40 shadow-sm overflow-hidden">
            {recentDocs?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No documents yet</div>
            ) : (
              <ul className="divide-y divide-border/40">
                {recentDocs?.map((doc) => (
                  <li key={doc.id}>
                    <Link href={`/documents?id=${doc.id}`} className="block p-5 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{doc.title}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                          {format(new Date(doc.updatedAt), "MMM d, yyyy")}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Services Snapshot</h2>
          </div>
          <div className="bg-card rounded-2xl p-6 border border-border/40 shadow-sm">
            <div className="flex flex-wrap gap-3">
              {services?.slice(0, 8).map((srv) => (
                <a 
                  key={srv.id} 
                  href={srv.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-4 py-2 rounded-lg bg-muted text-sm font-medium hover:bg-foreground hover:text-background transition-colors border border-border/50"
                >
                  {srv.title}
                </a>
              ))}
              {(!services || services.length === 0) && (
                <span className="text-muted-foreground text-sm">No services added yet.</span>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
