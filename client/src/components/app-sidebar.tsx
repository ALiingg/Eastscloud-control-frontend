import { Link, useLocation } from "wouter";
import { LayoutDashboard, Server, FileText, KeyRound, Box, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Overview", url: "/", icon: LayoutDashboard },
  { title: "Services", url: "/services", icon: Server },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "OTP Authenticator", url: "/otp-codes", icon: KeyRound },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <Sidebar className="border-r border-border/50 bg-sidebar/30 backdrop-blur-xl">
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground p-2 rounded-xl shadow-md">
            <Box className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <h2 className="font-semibold text-sm leading-none">Management</h2>
            <span className="text-xs text-muted-foreground mt-1">Personal Center</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground px-6 mb-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-3">
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={`
                        mb-1 transition-all duration-200 rounded-xl py-5
                        ${isActive 
                          ? "bg-foreground text-background shadow-md hover:bg-foreground/90 hover:text-background" 
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        }
                      `}
                    >
                      <Link href={item.url} className="flex items-center gap-3 px-3">
                        <item.icon className={`w-5 h-5 ${isActive ? "text-background" : "text-muted-foreground"}`} />
                        <span className="font-medium text-sm">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-border/50">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground truncate" data-testid="text-current-user">
            {user?.username}
          </span>
          <Button
            variant="ghost"
            size="icon"
            data-testid="button-logout"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}