import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Server, Monitor, Plus } from "lucide-react";

type ServerItem = { name: string; host: string; port: number; os: string; online: boolean };

type GuacConn = {
  identifier: string;
  name: string;
  protocol: string;
};

export default function Servers() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"manage" | "console">("manage");
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("");
  const [form, setForm] = useState({
    name: "",
    protocol: "ssh",
    hostname: "",
    port: "22",
    username: "",
    password: "",
  });

  const { data: status, isLoading: statusLoading } = useQuery<{ updatedAt: string; servers: ServerItem[] }>({
    queryKey: ["/api/server-status"],
    queryFn: async () => {
      const r = await fetch("/api/server-status", { credentials: "include" });
      if (!r.ok) throw new Error("Failed to fetch server status");
      return r.json();
    },
    refetchInterval: 10000,
  });

  const { data: guacStatus } = useQuery<{ ok: boolean; baseUrl?: string; dataSource?: string; message?: string }>({
    queryKey: ["/api/guac/status"],
    queryFn: async () => {
      const r = await fetch("/api/guac/status", { credentials: "include" });
      if (!r.ok) throw new Error("Failed to fetch guac status");
      return r.json();
    },
    refetchInterval: 30000,
  });

  const { data: guacConnections } = useQuery<Record<string, GuacConn>>({
    queryKey: ["/api/guac/connections"],
    queryFn: async () => {
      const r = await fetch("/api/guac/connections", { credentials: "include" });
      if (!r.ok) throw new Error("Failed to fetch guac connections");
      return r.json();
    },
    refetchInterval: 30000,
  });

  const createConn = useMutation({
    mutationFn: async (payload: any) => {
      const r = await fetch("/api/guac/connections", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/guac/connections"] });
    },
  });

  const existingNames = useMemo(() => {
    const arr = Object.values(guacConnections || {}).map((c) => c.name);
    return new Set(arr);
  }, [guacConnections]);

  const addFromServer = (s: ServerItem) => {
    if (s.os === "linux") {
      createConn.mutate({
        name: s.name,
        protocol: "ssh",
        hostname: s.host,
        port: 22,
      });
    } else {
      createConn.mutate({
        name: s.name,
        protocol: "rdp",
        hostname: s.host,
        port: s.port,
        ignoreCert: true,
      });
    }
  };

  const submitCreate = () => {
    createConn.mutate({
      name: form.name,
      protocol: form.protocol,
      hostname: form.hostname,
      port: Number(form.port),
      username: form.username,
      password: form.password,
      ignoreCert: true,
    });
  };

  const base = (guacStatus?.baseUrl || "http://127.0.0.1:8088/guacamole").replace(/\/$/, "");
  const embedUrl = selectedConnectionId ? `${base}/#/client/${selectedConnectionId}` : `${base}/#/`;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">服务器</h1>
          <p className="text-muted-foreground mt-1">在平台内配置服务器，并在页面内标签页里直接连接 Guacamole。</p>
        </div>
        <div className="flex gap-2">
          <Button variant={activeTab === "manage" ? "default" : "outline"} onClick={() => setActiveTab("manage")}>连接管理</Button>
          <Button variant={activeTab === "console" ? "default" : "outline"} onClick={() => setActiveTab("console")}>远程控制台</Button>
        </div>
      </div>

      {activeTab === "manage" ? (
        <>
          <section className="bg-card rounded-2xl p-6 border border-border/40 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2"><Monitor className="w-5 h-5" /> Server Status</h2>
              <span className="text-xs text-muted-foreground">10s refresh</span>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {statusLoading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : (
                status?.servers?.map((s) => (
                  <div key={s.name} className="rounded-xl border border-border/40 p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.host}:{s.port} · {s.os}</div>
                      <div className={`text-xs mt-1 ${s.online ? "text-emerald-600" : "text-rose-600"}`}>{s.online ? "Online" : "Offline"}</div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={existingNames.has(s.name) || createConn.isPending}
                      onClick={() => addFromServer(s)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {existingNames.has(s.name) ? "已添加" : "加到 Guac"}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="bg-card rounded-2xl p-6 border border-border/40 shadow-sm">
            <h2 className="text-xl font-bold flex items-center gap-2"><Server className="w-5 h-5" /> Guacamole 集成</h2>
            <div className="text-sm text-muted-foreground mt-2">
              状态：{guacStatus?.ok ? "Connected" : "Disconnected"} · 数据源：{guacStatus?.dataSource || "-"}
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-6 gap-2">
              <input className="md:col-span-1 rounded-md border px-3 py-2 bg-background" placeholder="名称" value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} />
              <select className="md:col-span-1 rounded-md border px-3 py-2 bg-background" value={form.protocol} onChange={(e) => setForm((v) => ({ ...v, protocol: e.target.value, port: e.target.value === "rdp" ? "3389" : "22" }))}>
                <option value="ssh">SSH</option>
                <option value="rdp">RDP</option>
              </select>
              <input className="md:col-span-2 rounded-md border px-3 py-2 bg-background" placeholder="主机名/IP" value={form.hostname} onChange={(e) => setForm((v) => ({ ...v, hostname: e.target.value }))} />
              <input className="md:col-span-1 rounded-md border px-3 py-2 bg-background" placeholder="端口" value={form.port} onChange={(e) => setForm((v) => ({ ...v, port: e.target.value }))} />
              <Button className="md:col-span-1" onClick={submitCreate} disabled={createConn.isPending}>创建连接</Button>

              <input className="md:col-span-3 rounded-md border px-3 py-2 bg-background" placeholder="用户名（可选）" value={form.username} onChange={(e) => setForm((v) => ({ ...v, username: e.target.value }))} />
              <input className="md:col-span-3 rounded-md border px-3 py-2 bg-background" placeholder="密码（可选）" type="password" value={form.password} onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))} />
            </div>

            <div className="mt-4 space-y-2">
              {Object.values(guacConnections || {}).length === 0 ? (
                <div className="text-sm text-muted-foreground">暂无连接</div>
              ) : (
                Object.values(guacConnections || {}).map((c) => (
                  <div key={c.identifier} className="rounded-lg border border-border/40 p-3 flex justify-between items-center">
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.protocol} · id: {c.identifier}</div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedConnectionId(c.identifier);
                        setActiveTab("console");
                      }}
                    >
                      在控制台打开
                    </Button>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      ) : (
        <section className="bg-card rounded-2xl p-6 border border-border/40 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">远程控制台（Guacamole）</h2>
            <span className="text-xs text-muted-foreground">当前连接ID：{selectedConnectionId || "未选择"}</span>
          </div>
          <div className="rounded-xl border border-border/40 overflow-hidden bg-black">
            <iframe title="guacamole-console" src={embedUrl} className="w-full h-[78vh]" />
          </div>
        </section>
      )}
    </div>
  );
}
