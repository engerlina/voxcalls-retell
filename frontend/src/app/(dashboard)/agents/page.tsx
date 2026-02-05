"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAgentStore, useAuthStore, Agent } from "@/lib/store";

export default function AgentsPage() {
  const { agents, isLoading, fetchAgents, createAgent, deleteAgent } =
    useAgentStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentPrompt, setNewAgentPrompt] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      await createAgent({
        name: newAgentName,
        system_prompt: newAgentPrompt || undefined,
      });
      setShowCreateModal(false);
      setNewAgentName("");
      setNewAgentPrompt("");
    } catch {
      // Handle error
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteAgent = async (id: string) => {
    if (confirm("Are you sure you want to delete this agent?")) {
      await deleteAgent(id);
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agents</h1>
          <p className="text-muted-foreground">
            Manage your AI voice agents
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          disabled={!isAdmin}
          title={!isAdmin ? "Only admins can create agents" : undefined}
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          Create Agent
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 w-32 animate-pulse rounded bg-secondary" />
                <div className="h-4 w-24 animate-pulse rounded bg-secondary" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 rounded-full bg-secondary p-4">
              <BotIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">No agents yet</h3>
            <p className="mb-4 text-center text-muted-foreground">
              Create your first AI voice agent to get started
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              disabled={!isAdmin}
              title={!isAdmin ? "Only admins can create agents" : undefined}
            >
              Create Agent
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onDelete={() => handleDeleteAgent(agent.id)}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {/* Create Agent Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create New Agent</CardTitle>
              <CardDescription>
                Set up a new AI voice agent for your calls
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateAgent}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Agent Name
                  </label>
                  <Input
                    id="name"
                    placeholder="e.g., Customer Support Agent"
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="prompt" className="text-sm font-medium">
                    System Prompt (optional)
                  </label>
                  <textarea
                    id="prompt"
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Describe how the agent should behave..."
                    value={newAgentPrompt}
                    onChange={(e) => setNewAgentPrompt(e.target.value)}
                  />
                </div>
              </CardContent>
              <div className="flex justify-end gap-2 border-t p-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create Agent"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

function AgentCard({
  agent,
  onDelete,
  isAdmin,
}: {
  agent: Agent;
  onDelete: () => void;
  isAdmin: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{agent.name}</CardTitle>
            <CardDescription>
              {agent.status === "active" ? (
                <span className="flex items-center gap-1 text-green-600">
                  <span className="h-2 w-2 rounded-full bg-green-600" />
                  Active
                </span>
              ) : (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-gray-400" />
                  {agent.status}
                </span>
              )}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            disabled={!isAdmin}
            title={!isAdmin ? "Only admins can delete agents" : undefined}
          >
            <TrashIcon className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Model</span>
            <span>{agent.llm_model}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Language</span>
            <span>{agent.language.toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span>{new Date(agent.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <a href={`/agents/${agent.id}`}>Configure</a>
          </Button>
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <a href={`/agents/${agent.id}/documents`}>Knowledge</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function BotIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
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
