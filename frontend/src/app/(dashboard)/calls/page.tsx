"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";

interface Call {
  id: string;
  direction: "inbound" | "outbound";
  status: string;
  caller_number: string | null;
  callee_number: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  agent_name?: string;
}

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCalls() {
      try {
        const data = await api.getCalls();
        setCalls(data);
      } catch {
        // Handle error
      } finally {
        setIsLoading(false);
      }
    }

    loadCalls();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Calls</h1>
        <p className="text-muted-foreground">
          View and manage your call history
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-secondary" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 animate-pulse rounded bg-secondary" />
                    <div className="h-3 w-1/4 animate-pulse rounded bg-secondary" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : calls.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 rounded-full bg-secondary p-4">
              <PhoneIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">No calls yet</h3>
            <p className="text-center text-muted-foreground">
              Calls will appear here once your agents start receiving them
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Calls</CardTitle>
            <CardDescription>
              {calls.length} total calls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {calls.map((call) => (
                <CallRow key={call.id} call={call} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CallRow({ call }: { call: Call }) {
  const duration = call.duration_seconds
    ? `${Math.floor(call.duration_seconds / 60)}:${String(
        call.duration_seconds % 60
      ).padStart(2, "0")}`
    : "--:--";

  return (
    <a
      href={`/calls/${call.id}`}
      className="flex items-center gap-4 py-4 transition-colors hover:bg-secondary/50"
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full ${
          call.direction === "inbound"
            ? "bg-green-100 text-green-600"
            : "bg-blue-100 text-blue-600"
        }`}
      >
        {call.direction === "inbound" ? (
          <InboundIcon className="h-5 w-5" />
        ) : (
          <OutboundIcon className="h-5 w-5" />
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {call.direction === "inbound" ? call.caller_number : call.callee_number}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              call.status === "completed"
                ? "bg-green-100 text-green-700"
                : call.status === "failed"
                ? "bg-red-100 text-red-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {call.status}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          {new Date(call.started_at).toLocaleString()}
          {call.agent_name && ` • ${call.agent_name}`}
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono">{duration}</div>
        <div className="text-sm text-muted-foreground capitalize">
          {call.direction}
        </div>
      </div>
    </a>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function InboundIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function OutboundIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 3h5m0 0v5m0-5l-6 6M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
    </svg>
  );
}
