import { useState, useEffect } from "react";
import * as OTPAuth from "otpauth";
import { Copy, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useDeleteOtpSecret } from "@/hooks/use-otp-secrets";
import type { OtpSecret } from "@shared/schema";

export function TotpCard({ secret }: { secret: OtpSecret }) {
  const [token, setToken] = useState("------");
  const [progress, setProgress] = useState(100);
  const [copied, setCopied] = useState(false);
  const deleteMutation = useDeleteOtpSecret();

  useEffect(() => {
    let totp: OTPAuth.TOTP;
    try {
      // Remove spaces from secret if any
      const cleanSecret = secret.secret.replace(/\s+/g, "");
      totp = new OTPAuth.TOTP({
        issuer: secret.issuer,
        label: secret.account,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: cleanSecret,
      });
    } catch (e) {
      console.error("Invalid TOTP Secret", e);
    }

    const updateToken = () => {
      if (!totp) {
        setToken("ERROR ");
        setProgress(0);
        return;
      }
      try {
        setToken(totp.generate());
        const epoch = Math.floor(Date.now() / 1000);
        const remaining = 30 - (epoch % 30);
        setProgress((remaining / 30) * 100);
      } catch (e) {
        setToken("ERROR ");
        setProgress(0);
      }
    };

    updateToken();
    const interval = setInterval(updateToken, 1000);
    return () => clearInterval(interval);
  }, [secret]);

  const handleCopy = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedToken = `${token.slice(0, 3)} ${token.slice(3)}`;

  return (
    <div className="bg-card rounded-2xl p-6 border border-border/40 shadow-sm hover-elevate relative overflow-hidden group">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{secret.issuer}</h3>
          <p className="text-sm text-muted-foreground">{secret.account}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive hover:bg-destructive/10 -mr-2 -mt-2"
          onClick={() => {
            if (confirm("Remove this authenticator code?")) {
              deleteMutation.mutate(secret.id);
            }
          }}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <span className="text-4xl font-mono tracking-widest font-bold text-foreground">
          {formattedToken}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full shadow-sm"
          onClick={handleCopy}
        >
          {copied ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4 text-muted-foreground" />
          )}
        </Button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1">
        <Progress 
          value={progress} 
          className="h-full rounded-none bg-border/30" 
          indicatorClassName={progress < 20 ? "bg-destructive" : "bg-primary"}
        />
      </div>
    </div>
  );
}
