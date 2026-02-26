import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Server, Plus, Globe, HardDrive, Database, Monitor, Github, Trash2, ExternalLink } from "lucide-react";
import { useServices, useCreateService, useDeleteService } from "@/hooks/use-services";
import { insertServiceSchema, type InsertService } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ICONS = {
  Server: Server,
  Globe: Globe,
  HardDrive: HardDrive,
  Database: Database,
  Monitor: Monitor,
  Github: Github,
} as const;

export default function Services() {
  const { data: services, isLoading } = useServices();
  const createMutation = useCreateService();
  const deleteMutation = useDeleteService();
  const [open, setOpen] = useState(false);

  const form = useForm<InsertService>({
    resolver: zodResolver(insertServiceSchema),
    defaultValues: { title: "", url: "", category: "Infrastructure", icon: "Server", description: "" },
  });

  const onSubmit = (data: InsertService) => {
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Services</h1>
          <p className="text-muted-foreground mt-1">Manage your self-hosted infrastructure and links.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
              <Plus className="w-4 h-4 mr-2" /> Add Service
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl">Add New Service</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl><Input placeholder="Synology NAS" className="rounded-xl bg-muted/50" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="url" render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL</FormLabel>
                    <FormControl><Input placeholder="https://192.168.1.100:5000" className="rounded-xl bg-muted/50" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger className="rounded-xl bg-muted/50"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Infrastructure">Infrastructure</SelectItem>
                            <SelectItem value="Media">Media</SelectItem>
                            <SelectItem value="Development">Development</SelectItem>
                            <SelectItem value="Networking">Networking</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="icon" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value || "Server"}>
                          <SelectTrigger className="rounded-xl bg-muted/50"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.keys(ICONS).map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="Main storage array" className="rounded-xl bg-muted/50 resize-none" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="pt-4 flex justify-end">
                  <Button type="submit" disabled={createMutation.isPending} className="rounded-xl px-8">
                    {createMutation.isPending ? "Saving..." : "Save Service"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-48 rounded-2xl bg-muted/50 animate-pulse border border-border/40" />)}
        </div>
      ) : services?.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-border rounded-3xl bg-muted/20">
          <Server className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium">No services configured</h3>
          <p className="text-muted-foreground mt-1 mb-6">Add your first server or dashboard link.</p>
          <Button onClick={() => setOpen(true)} variant="outline" className="rounded-xl shadow-sm">Add Service</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services?.map((service) => {
            const IconComponent = ICONS[(service.icon as keyof typeof ICONS)] || ICONS.Globe;
            return (
              <a 
                key={service.id} 
                href={service.url}
                target="_blank"
                rel="noreferrer"
                className="group block bg-card rounded-2xl p-6 border border-border/50 shadow-sm hover-elevate transition-all overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="p-3 bg-muted rounded-xl text-foreground group-hover:bg-foreground group-hover:text-background transition-colors">
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 z-20"
                      onClick={(e) => {
                        e.preventDefault();
                        if (confirm(`Delete ${service.title}?`)) deleteMutation.mutate(service.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <div className="p-2 text-muted-foreground/50 group-hover:text-foreground transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </div>
                </div>
                <div className="relative z-10">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground mb-2 block">
                    {service.category}
                  </span>
                  <h3 className="text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {service.description || service.url}
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
