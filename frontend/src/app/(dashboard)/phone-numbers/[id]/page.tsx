"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuthStore, Agent } from "@/lib/store";
import { CountryDisplay } from "@/components/ui/country-display";

interface PhoneNumber {
  id: string;
  phone_number: string;
  country_code: string | null;
  number_type: string | null;
  twilio_sid: string;
  elevenlabs_phone_id: string | null;
  tenant_id: string | null;
  assigned_user_id: string | null;
  assigned_agent_id: string | null;
  supports_inbound: boolean;
  supports_outbound: boolean;
  supports_sms: boolean;
  status: string;
  assigned_at: string | null;
  created_at: string;
}

export default function PhoneNumberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const [phoneNumber, setPhoneNumber] = useState<PhoneNumber | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [numberData, agentsData] = await Promise.all([
          api.getPhoneNumber(params.id as string),
          api.getAgents(),
        ]);
        setPhoneNumber(numberData);
        setAgents(agentsData);
        setSelectedAgentId(numberData.assigned_agent_id);
      } catch (err) {
        setError("Failed to load phone number");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [params.id]);

  const handleSaveAgent = async () => {
    if (!phoneNumber) return;

    setIsSaving(true);
    setError(null);

    try {
      const updated = await api.assignAgentToPhoneNumber(
        phoneNumber.id,
        selectedAgentId
      );
      setPhoneNumber(updated);
    } catch (err) {
      setError("Failed to update agent assignment");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-secondary" />
        <Card>
          <CardHeader>
            <div className="h-6 w-32 animate-pulse rounded bg-secondary" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-4 w-full animate-pulse rounded bg-secondary" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-secondary" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!phoneNumber) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold">Phone number not found</h2>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const hasChanges = selectedAgentId !== phoneNumber.assigned_agent_id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-mono">{phoneNumber.phone_number}</h1>
          <p className="text-muted-foreground flex items-center gap-1">
            {phoneNumber.number_type}
            {phoneNumber.country_code && (
              <>
                <span className="mx-1">•</span>
                <CountryDisplay countryCode={phoneNumber.country_code} size="sm" />
              </>
            )}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Phone Number Details */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>Phone number information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  phoneNumber.status === "assigned"
                    ? "bg-green-100 text-green-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {phoneNumber.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span>{phoneNumber.number_type || "Unknown"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Country</span>
              <CountryDisplay countryCode={phoneNumber.country_code} size="md" />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Claimed</span>
              <span>
                {phoneNumber.assigned_at
                  ? new Date(phoneNumber.assigned_at).toLocaleDateString()
                  : "N/A"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Capabilities */}
        <Card>
          <CardHeader>
            <CardTitle>Capabilities</CardTitle>
            <CardDescription>What this number supports</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Inbound Calls</span>
              <CapabilityBadge enabled={phoneNumber.supports_inbound} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Outbound Calls</span>
              <CapabilityBadge enabled={phoneNumber.supports_outbound} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">SMS</span>
              <CapabilityBadge enabled={phoneNumber.supports_sms} />
            </div>
          </CardContent>
        </Card>

        {/* Agent Assignment */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Agent Assignment</CardTitle>
            <CardDescription>
              Assign an AI agent to handle calls on this number
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div className="flex-1 max-w-md">
                <label className="block text-sm font-medium mb-2">
                  Assigned Agent
                </label>
                <select
                  value={selectedAgentId || ""}
                  onChange={(e) => setSelectedAgentId(e.target.value || null)}
                  disabled={!isAdmin}
                  className="w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">No agent assigned</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.status})
                    </option>
                  ))}
                </select>
                {!isAdmin && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Only admins can change agent assignments
                  </p>
                )}
              </div>
              <Button
                onClick={handleSaveAgent}
                disabled={!isAdmin || !hasChanges || isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
            {agents.length === 0 && (
              <p className="mt-4 text-sm text-muted-foreground">
                No agents available.{" "}
                <a href="/agents" className="text-primary hover:underline">
                  Create an agent
                </a>{" "}
                first.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Technical Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Technical Details</CardTitle>
            <CardDescription>Integration identifiers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm text-muted-foreground">Twilio SID</label>
                <p className="font-mono text-sm break-all">{phoneNumber.twilio_sid}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">ElevenLabs Phone ID</label>
                <p className="font-mono text-sm break-all">
                  {phoneNumber.elevenlabs_phone_id || "Not linked"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CapabilityBadge({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <span className="flex items-center gap-1 text-green-600">
      <CheckIcon className="h-4 w-4" />
      Yes
    </span>
  ) : (
    <span className="flex items-center gap-1 text-muted-foreground">
      <XIcon className="h-4 w-4" />
      No
    </span>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
