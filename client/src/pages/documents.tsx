import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Plus, Trash2, Save, File, RefreshCw } from "lucide-react";
import { useDocuments, useCreateDocument, useUpdateDocument, useDeleteDocument } from "@/hooks/use-documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Documents() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const activeId = searchParams.get("id") ? parseInt(searchParams.get("id")!) : null;

  const { data: documents, isLoading } = useDocuments();
  const createMutation = useCreateDocument();
  const updateMutation = useUpdateDocument();
  const deleteMutation = useDeleteDocument();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPreview, setIsPreview] = useState(false);
  
  const activeDocument = documents?.find(d => d.id === activeId);

  useEffect(() => {
    if (activeDocument) {
      setTitle(activeDocument.title);
      setContent(activeDocument.content);
    } else {
      setTitle("");
      setContent("");
    }
  }, [activeDocument]);

  const handleCreate = () => {
    createMutation.mutate(
      { title: "Untitled Document", content: "# New Document\nStart typing here..." },
      { onSuccess: (data) => setLocation(`/documents?id=${data.id}`) }
    );
  };

  const handleSave = () => {
    if (!activeId) return;
    updateMutation.mutate({ id: activeId, title, content });
  };

  const handleDelete = () => {
    if (!activeId || !confirm("Delete this document?")) return;
    deleteMutation.mutate(activeId, {
      onSuccess: () => setLocation("/documents")
    });
  };

  return (
    <div className="flex h-full animate-in fade-in duration-300">
      {/* Sidebar List */}
      <div className="w-72 border-r border-border/50 bg-muted/10 flex flex-col hidden md:flex">
        <div className="p-4 border-b border-border/50 flex justify-between items-center glass-panel">
          <h2 className="font-semibold">Documents</h2>
          <Button variant="ghost" size="icon" onClick={handleCreate} disabled={createMutation.isPending}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading && <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>}
          {documents?.map(doc => (
            <button
              key={doc.id}
              onClick={() => setLocation(`/documents?id=${doc.id}`)}
              className={`w-full text-left px-3 py-3 rounded-xl transition-colors flex items-center gap-3
                ${activeId === doc.id ? "bg-foreground text-background shadow-md" : "hover:bg-muted text-foreground"}
              `}
            >
              <File className={`w-4 h-4 ${activeId === doc.id ? "text-background/80" : "text-muted-foreground"}`} />
              <div className="overflow-hidden">
                <div className="text-sm font-medium truncate">{doc.title}</div>
                <div className={`text-[10px] truncate ${activeId === doc.id ? "text-background/60" : "text-muted-foreground"}`}>
                  {new Date(doc.updatedAt).toLocaleDateString()}
                </div>
              </div>
            </button>
          ))}
          {documents?.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">No documents</div>
          )}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
        {activeId ? (
          <>
            <header className="h-16 border-b border-border/50 px-6 flex items-center justify-between glass-panel sticky top-0 z-10">
              <Input 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xl font-bold border-none bg-transparent shadow-none focus-visible:ring-0 px-0 max-w-sm"
                placeholder="Document Title"
              />
              <div className="flex items-center gap-2">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => setIsPreview(!isPreview)}>
                  {isPreview ? "Edit" : "Preview"}
                </Button>
                <div className="w-px h-6 bg-border/50 mx-1"></div>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={handleDelete}>
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button onClick={handleSave} disabled={updateMutation.isPending} className="rounded-xl ml-1">
                  {updateMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save
                </Button>
              </div>
            </header>
            
            <div className="flex-1 overflow-hidden relative flex">
              {isPreview ? (
                <div className="flex-1 overflow-y-auto p-8 lg:p-12 bg-muted/5">
                  <div className="max-w-3xl mx-auto markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {content}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : (
                <Textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="flex-1 h-full resize-none border-none p-8 lg:p-12 text-base leading-relaxed bg-transparent focus-visible:ring-0 rounded-none shadow-none font-mono"
                  placeholder="Type markdown here..."
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <File className="w-16 h-16 mb-4 opacity-20" />
            <h3 className="text-lg font-medium text-foreground">No Document Selected</h3>
            <p className="mt-1 mb-6">Choose a document from the sidebar or create a new one.</p>
            <Button onClick={handleCreate} className="rounded-xl shadow-lg">
              <Plus className="w-4 h-4 mr-2" /> Create Document
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
