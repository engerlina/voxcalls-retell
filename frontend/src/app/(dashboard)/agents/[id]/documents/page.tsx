"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthStore, Agent } from "@/lib/store";
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

export default function AgentDocumentsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const agentId = params.id as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddUrlModal, setShowAddUrlModal] = useState(false);
  const [showAddTextModal, setShowAddTextModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [agentId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [agentData, docsData] = await Promise.all([
        api.getAgentDetails(agentId),
        api.getKnowledgeDocuments(agentId),
      ]);
      setAgent(agentData);
      setDocuments(docsData.documents || []);
    } catch {
      // If knowledge endpoint fails, just set empty docs
      try {
        const agentData = await api.getAgentDetails(agentId);
        setAgent(agentData);
        setDocuments([]);
      } catch {
        alert("Failed to load agent");
        router.push("/agents");
      }
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

  const filteredDocuments = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Agent not found</p>
        <Button className="mt-4" onClick={() => router.push("/agents")}>
          Back to Agents
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/agents" className="hover:text-foreground">
            Agents
          </Link>
          <ChevronRightIcon className="h-4 w-4" />
          <Link href={`/agents/${agentId}`} className="hover:text-foreground">
            {agent.name}
          </Link>
          <ChevronRightIcon className="h-4 w-4" />
          <span>Knowledge Base</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Knowledge Base</h1>
            <p className="text-muted-foreground">
              Documents for {agent.name}
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href={`/agents/${agentId}`}>
              <SettingsIcon className="mr-2 h-4 w-4" />
              Configuration
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-4 border-b">
        <Link
          href={`/agents/${agentId}`}
          className="border-b-2 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Configuration
        </Link>
        <Link
          href={`/agents/${agentId}/documents`}
          className="border-b-2 border-primary px-4 py-2 text-sm font-medium"
        >
          Knowledge Base
        </Link>
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
          onClick={() => document.getElementById("agent-file-upload")?.click()}
        >
          <FileIcon className="h-4 w-4" />
          Add Files
        </Button>
        <input
          id="agent-file-upload"
          type="file"
          multiple
          accept=".pdf,.txt,.docx,.html,.htm,.epub,.md,.markdown"
          className="hidden"
          onChange={async (e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
              for (const file of Array.from(files)) {
                try {
                  await api.uploadKnowledgeFile(file, agentId);
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : "Unknown error";
                  alert(`Failed to upload ${file.name}: ${message}`);
                }
              }
              loadData();
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
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Documents Table */}
      {filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 rounded-full bg-secondary p-4">
              <BookIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">No documents yet</h3>
            <p className="mb-4 text-center text-muted-foreground">
              Add documents to give your agent knowledge about your business
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
                  <DocIcon className="h-4 w-4 text-muted-foreground" />
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => handleDeleteDocument(doc.id)}
                  disabled={!isAdmin}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add URL Modal */}
      {showAddUrlModal && (
        <AddUrlModal
          agentId={agentId}
          onClose={() => setShowAddUrlModal(false)}
          onSuccess={() => {
            setShowAddUrlModal(false);
            loadData();
          }}
        />
      )}

      {/* Add Text Modal */}
      {showAddTextModal && (
        <AddTextModal
          agentId={agentId}
          onClose={() => setShowAddTextModal(false)}
          onSuccess={() => {
            setShowAddTextModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function AddUrlModal({
  agentId,
  onClose,
  onSuccess,
}: {
  agentId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.addKnowledgeUrl(name || url, url, agentId);
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
            Add a webpage to this agent's knowledge base
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

function AddTextModal({
  agentId,
  onClose,
  onSuccess,
}: {
  agentId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.addKnowledgeText(name, content, agentId);
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
            Add text content to this agent's knowledge base
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
                className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

// Icons
function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

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

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
