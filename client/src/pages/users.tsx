import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Shield, ShieldOff, Loader2 } from "lucide-react";

interface User {
  id: number;
  username: string;
  role: string;
  createdAt: string;
}

export default function UsersPage() {
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load users");
      return res.json();
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: number; role: string }) => {
      const res = await fetch(`/api/users/${id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Failed to update role");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-12 space-y-8">
      <header>
        <h1 className="text-4xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground mt-2 text-lg">Manage users and permissions</p>
      </header>

      <div className="bg-card rounded-2xl border border-border/40 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border/40">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">User List</h2>
          </div>
        </div>

        <div className="divide-y divide-border/40">
          {users?.map((user) => (
            <div key={user.id} className="p-6 flex items-center justify-between">
              <div>
                <div className="font-medium">{user.username}</div>
                <div className="text-sm text-muted-foreground">
                  Created {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateRoleMutation.mutate({ id: user.id, role: "normal" })}
                  disabled={updateRoleMutation.isPending || user.role === "normal"}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    user.role === "normal"
                      ? "bg-green-500/15 text-green-600 cursor-default"
                      : "bg-muted hover:bg-green-500/15 hover:text-green-600 disabled:opacity-50"
                  }`}
                >
                  <Shield className="w-4 h-4 inline mr-1" />
                  正常
                </button>
                <button
                  onClick={() => updateRoleMutation.mutate({ id: user.id, role: "otp-only" })}
                  disabled={updateRoleMutation.isPending || user.role === "otp-only"}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    user.role === "otp-only"
                      ? "bg-amber-500/15 text-amber-600 cursor-default"
                      : "bg-muted hover:bg-amber-500/15 hover:text-amber-600 disabled:opacity-50"
                  }`}
                >
                  <ShieldOff className="w-4 h-4 inline mr-1" />
                  OTP仅查看
                </button>
              </div>
            </div>
          ))}
          {(!users || users.length === 0) && (
            <div className="p-8 text-center text-muted-foreground">
              暂无用户
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
