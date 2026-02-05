"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";

interface KnowledgeDocument {
  id: string;
  name: string;
  type: "file" | "url" | "text" | "folder";
  size: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  agent_id: string | null;
}

interface KnowledgeStats {
  used_bytes: number;
  total_bytes: number;
}

export default function KnowledgePage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [stats, setStats] = useState<KnowledgeStats>({ used_bytes: 0, total_bytes: 21 * 1024 * 1024 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [showAddUrlModal, setShowAddUrlModal] = useState(false);
  const [showAddTextModal, setShowAddTextModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const data = await api.getKnowledgeDocuments();
      setDocuments(data.documents || []);
      setStats(data.stats || { used_bytes: 0, total_bytes: 21 * 1024 * 1024 });
    } catch {
      // API not implemented yet, use empty state
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (confirm("Are you sure you want to delete this document?")) {
      try {
        await api.deleteKnowledgeDocument(id);
        setDocuments(documents.filter((d) => d.id !== id));
      } catch {
        alert("Failed to delete document");
      }
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "kB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !typeFilter || doc.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Knowledge Base</h1>
          <p className="text-muted-foreground">
            Manage documents for your AI agents
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            RAG Storage: {formatBytes(stats.used_bytes)} / {formatBytes(stats.total_bytes)}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => setShowAddUrlModal(true)}
          disabled={!isAdmin}
          className="gap-2"
        >
          <GlobeIcon className="h-4 w-4" />
          Add URL
        </Button>
        <Button
          variant="outline"
          disabled={!isAdmin}
          className="gap-2"
          onClick={() => document.getElementById("file-upload")?.click()}
        >
          <FileIcon className="h-4 w-4" />
          Add Files
        </Button>
        <input
          id="file-upload"
          type="file"
          multiple
          accept=".pdf,.txt,.docx,.html,.htm,.epub,.md,.markdown"
          className="hidden"
          onChange={async (e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
              for (const file of Array.from(files)) {
                try {
                  await api.uploadKnowledgeFile(file);
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : "Unknown error";
                  alert(`Failed to upload ${file.name}: ${message}`);
                }
              }
              loadDocuments();
            }
            e.target.value = "";
          }}
        />
        <Button
          variant="outline"
          onClick={() => setShowAddTextModal(true)}
          disabled={!isAdmin}
          className="gap-2"
        >
          <TextIcon className="h-4 w-4" />
          Create Text
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowCreateFolderModal(true)}
          disabled={!isAdmin}
          className="gap-2"
        >
          <FolderIcon className="h-4 w-4" />
          Create Folder
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex gap-4">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search Knowledge Base..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={typeFilter === null ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setTypeFilter(null)}
          >
            + Type
          </Button>
          {typeFilter && (
            <span className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm">
              {typeFilter}
              <button onClick={() => setTypeFilter(null)} className="ml-1 hover:text-destructive">
                &times;
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Documents Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-secondary" />
          ))}
        </div>
      ) : filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 rounded-full bg-secondary p-4">
              <BookIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">No documents yet</h3>
            <p className="mb-4 text-center text-muted-foreground">
              Add documents to your knowledge base to enhance your AI agents
            </p>
            <Button onClick={() => setShowAddUrlModal(true)} disabled={!isAdmin}>
              Add Your First Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border bg-white">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 border-b bg-muted/50 px-4 py-3 text-sm font-medium">
            <div className="col-span-5">Name</div>
            <div className="col-span-3">Created by</div>
            <div className="col-span-3">Last updated</div>
            <div className="col-span-1"></div>
          </div>

          {/* Table Body */}
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="grid grid-cols-12 items-center gap-4 border-b px-4 py-3 last:border-0 hover:bg-muted/30"
            >
              <div className="col-span-5 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                  {doc.type === "folder" ? (
                    <FolderIcon className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <DocIcon className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{doc.name}</p>
                  {doc.size !== null && (
                    <p className="text-xs text-muted-foreground">{formatBytes(doc.size)}</p>
                  )}
                </div>
              </div>
              <div className="col-span-3 text-sm text-muted-foreground">
                {doc.created_by}
              </div>
              <div className="col-span-3 text-sm text-muted-foreground">
                {new Date(doc.updated_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
              <div className="col-span-1 flex justify-end">
                <DropdownMenu
                  onDelete={() => handleDeleteDocument(doc.id)}
                  isAdmin={isAdmin}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add URL Modal */}
      {showAddUrlModal && (
        <AddUrlModal
          onClose={() => setShowAddUrlModal(false)}
          onSuccess={() => {
            setShowAddUrlModal(false);
            loadDocuments();
          }}
        />
      )}

      {/* Add Text Modal */}
      {showAddTextModal && (
        <AddTextModal
          onClose={() => setShowAddTextModal(false)}
          onSuccess={() => {
            setShowAddTextModal(false);
            loadDocuments();
          }}
        />
      )}

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <CreateFolderModal
          onClose={() => setShowCreateFolderModal(false)}
          onSuccess={() => {
            setShowCreateFolderModal(false);
            loadDocuments();
          }}
        />
      )}
    </div>
  );
}

function DropdownMenu({ onDelete, isAdmin }: { onDelete: () => void; isAdmin: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 w-8"
      >
        <MoreIcon className="h-4 w-4" />
      </Button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-32 rounded-md border bg-white py-1 shadow-lg">
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
              onClick={() => {
                setIsOpen(false);
                // View action
              }}
            >
              View
            </button>
            <button
              className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-muted disabled:opacity-50"
              onClick={() => {
                setIsOpen(false);
                onDelete();
              }}
              disabled={!isAdmin}
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function AddUrlModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.addKnowledgeUrl(name || url, url);
      onSuccess();
    } catch {
      alert("Failed to add URL");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Add URL</CardTitle>
          <CardDescription>
            Add a webpage to your knowledge base
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="url" className="text-sm font-medium">
                URL
              </label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/page"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name (optional)
              </label>
              <Input
                id="name"
                placeholder="Document name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </CardContent>
          <div className="flex justify-end gap-2 border-t p-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add URL"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function AddTextModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.addKnowledgeText(name, content);
      onSuccess();
    } catch {
      alert("Failed to create text document");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Create Text Document</CardTitle>
          <CardDescription>
            Add text content to your knowledge base
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="text-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="text-name"
                placeholder="Document name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="content" className="text-sm font-medium">
                Content
              </label>
              <textarea
                id="content"
                className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Enter your text content..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <div className="flex justify-end gap-2 border-t p-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function CreateFolderModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createKnowledgeFolder(name);
      onSuccess();
    } catch {
      alert("Failed to create folder");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Folder</CardTitle>
          <CardDescription>
            Organize your documents in folders
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="folder-name" className="text-sm font-medium">
                Folder Name
              </label>
              <Input
                id="folder-name"
                placeholder="My Folder"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <div className="flex justify-end gap-2 border-t p-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Folder"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// Icons
function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function TextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function DocIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
    </svg>
  );
}
