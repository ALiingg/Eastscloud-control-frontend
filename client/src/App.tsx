import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

// Pages
import Overview from "./pages/overview";
import Services from "./pages/services";
import Documents from "./pages/documents";
import OtpCodes from "./pages/otp-codes";
import NotFound from "./pages/not-found";

function Router() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background selection:bg-primary selection:text-primary-foreground">
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative">
        <header className="h-14 lg:hidden flex items-center px-4 border-b border-border/50 bg-background/80 backdrop-blur-md z-20">
          <SidebarTrigger />
          <span className="ml-3 font-semibold font-display">Management</span>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Switch>
            <Route path="/" component={Overview} />
            <Route path="/services" component={Services} />
            <Route path="/documents" component={Documents} />
            <Route path="/otp-codes" component={OtpCodes} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <Router />
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
