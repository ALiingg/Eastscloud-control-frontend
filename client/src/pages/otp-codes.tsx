import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Plus, ShieldCheck } from "lucide-react";
import { useOtpSecrets, useCreateOtpSecret } from "@/hooks/use-otp-secrets";
import { insertOtpSecretSchema, type InsertOtpSecret } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { TotpCard } from "@/components/totp-card";

export default function OtpCodes() {
  const { data: secrets, isLoading } = useOtpSecrets();
  const createMutation = useCreateOtpSecret();
  const [open, setOpen] = useState(false);

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
            <Button className="rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
              <Plus className="w-4 h-4 mr-2" /> Add Token
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
          {secrets?.map(secret => (
            <TotpCard key={secret.id} secret={secret} />
          ))}
        </div>
      )}
    </div>
  );
}
