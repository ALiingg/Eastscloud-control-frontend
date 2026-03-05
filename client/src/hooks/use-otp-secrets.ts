import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertOtpSecret, OtpSecret, UpdateOtpSecretRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useOtpSecrets() {
  return useQuery({
    queryKey: [api.otpSecrets.list.path],
    queryFn: async () => {
      const res = await fetch(api.otpSecrets.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch OTP secrets");
      return api.otpSecrets.list.responses[200].parse(await res.json());
    },
    refetchInterval: 5000,
  });
}

export function useCreateOtpSecret() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: InsertOtpSecret) => {
      const res = await fetch(api.otpSecrets.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create OTP secret");
      return api.otpSecrets.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.otpSecrets.list.path] });
      toast({ title: "Authenticator added", description: "OTP codes are now generating." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}

export function useDeleteOtpSecret() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.otpSecrets.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete OTP secret");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.otpSecrets.list.path] });
      toast({ title: "Authenticator removed", description: "The 2FA token was deleted." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}
