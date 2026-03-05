import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Plus, ShieldCheck, Copy } from "lucide-react";
import { useOtpSecrets, useCreateOtpSecret } from "@/hooks/use-otp-secrets";
import { useQueryClient } from "@tanstack/react-query";
import { insertOtpSecretSchema, type InsertOtpSecret } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { TotpCard } from "@/components/totp-card";

type RuntimeOtpItem = {
  id: number;
  issuer: string;
  account: string;
  secret: string;
  runtimeCode?: string;
  ttl?: number;
  source?: string;
};

function RuntimeOtpCard({ item, onExpire }: { item: RuntimeOtpItem; onExpire?: () => void }) {
  const code = (item.runtimeCode || "------").toString();
  const [ttl, setTtl] = useState(Math.max(0, Number(item.ttl || 0)));

  useEffect(() => {
    setTtl(Math.max(0, Number(item.ttl || 0)));
  }, [item.ttl, item.runtimeCode]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTtl((prev) => {
        if (prev <= 1) {
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onExpire]);

  const formatted = code.length >= 6 ? `${code.slice(0, 3)} ${code.slice(3, 6)}` : code;
  const progress = Math.max(0, Math.min(100, (ttl / 30) * 100));

  return (
    <div className="bg-card rounded-2xl p-6 border border-border/40 shadow-sm relative overflow-hidden">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{item.issuer}</h3>
          <p className="text-sm text-muted-foreground">{item.account}</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full shadow-sm"
          onClick={() => navigator.clipboard.writeText(code)}
        >
          <Copy className="w-4 h-4 text-muted-foreground" />
        </Button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <span className="text-4xl font-mono tracking-widest font-bold text-foreground">{formatted}</span>
        <span className="text-sm text-muted-foreground">{ttl}s</span>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-border/30">
        <div
          className="h-full bg-primary transition-[width] duration-500"
          style={{ width: `${progress}%`, transitionTimingFunction: "linear" }}
        />
      </div>
    </div>
  );
}

export default function OtpCodes() {
  const { data: secrets, isLoading } = useOtpSecrets();
  const createMutation = useCreateOtpSecret();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const runtimeMode = useMemo(() => {
    return (secrets || []).some((s: any) => s?.source === "eastscloud");
  }, [secrets]);

  const refreshOtp = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/otp-secrets"] });
  };

  const form = useForm<InsertOtpSecret>({
    resolver: zodResolver(insertOtpSecretSchema),
    defaultValues: { issuer: "", account: "", secret: "" },
  });

  const onSubmit = (data: InsertOtpSecret) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            Authenticator
          </h1>
          <p className="text-muted-foreground mt-1">Securely generate two-factor authentication codes.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              className="rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
              disabled={runtimeMode}
            >
              <Plus className="w-4 h-4 mr-2" /> {runtimeMode ? "Managed by EastsCloud" : "Add Token"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" /> Setup Authenticator
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                <FormField control={form.control} name="issuer" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service/Issuer</FormLabel>
                    <FormControl><Input placeholder="GitHub, Google, etc." className="rounded-xl bg-muted/50" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="account" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account/Email</FormLabel>
                    <FormControl><Input placeholder="user@example.com" className="rounded-xl bg-muted/50" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="secret" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Setup Key (Base32 Secret)</FormLabel>
                    <FormControl><Input placeholder="JBSWY3DPEHPK3PXP" className="rounded-xl bg-muted/50 font-mono uppercase" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="pt-4 flex justify-end">
                  <Button type="submit" disabled={createMutation.isPending} className="rounded-xl px-8">
                    {createMutation.isPending ? "Adding..." : "Add Authenticator"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-40 rounded-2xl bg-muted/50 animate-pulse border border-border/40" />)}
        </div>
      ) : secrets?.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-border rounded-3xl bg-muted/20">
          <KeyRound className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium">No authenticators</h3>
          <p className="text-muted-foreground mt-1 mb-6">Add a 2FA token to start generating codes.</p>
          <Button onClick={() => setOpen(true)} variant="outline" className="rounded-xl shadow-sm">Add Token</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {secrets?.map((secret: any) => (
            secret?.source === "eastscloud"
              ? <RuntimeOtpCard key={secret.id} item={secret} onExpire={refreshOtp} />
              : <TotpCard key={secret.id} secret={secret} />
          ))}
        </div>
      )}
    </div>
  );
}
