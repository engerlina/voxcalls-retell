"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

interface DashboardStats {
  agents: number;
  calls: number;
  phoneNumbers: number;
  totalMinutes: number;
}

interface Call {
  conversation_id: string;
  agent_id: string;
  agent_name: string;
  status: string;
  start_time: number | null;
  end_time: number | null;
  duration_seconds: number | null;
  message_count: number | null;
  call_successful: boolean | null;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    agents: 0,
    calls: 0,
    phoneNumbers: 0,
    totalMinutes: 0,
  });
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [agents, calls, phoneNumbers] = await Promise.all([
          api.getAgents(),
          api.getCalls(),
          api.getPhoneNumbers(),
        ]);

        setStats({
          agents: agents.length,
          calls: calls.length,
          phoneNumbers: phoneNumbers.length,
          totalMinutes: calls.reduce(
            (acc: number, call: { duration_seconds?: number }) =>
              acc + (call.duration_seconds || 0) / 60,
            0
          ),
        });

        // Get the 5 most recent calls
        setRecentCalls(calls.slice(0, 5));
      } catch {
        // Handle error silently for now
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s an overview of your VoxCalls account.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Agents"
          value={stats.agents}
          isLoading={isLoading}
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard
          title="Total Calls"
          value={stats.calls}
          isLoading={isLoading}
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          }
        />
        <StatCard
          title="Phone Numbers"
          value={stats.phoneNumbers}
          isLoading={isLoading}
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
          }
        />
        <StatCard
          title="Total Minutes"
          value={Math.round(stats.totalMinutes)}
          isLoading={isLoading}
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <QuickActionCard
            title="Create Agent"
            description="Set up a new AI voice agent"
            href="/agents?action=create"
          />
          <QuickActionCard
            title="View Calls"
            description="Review recent call history"
            href="/calls"
          />
          <QuickActionCard
            title="Manage Numbers"
            description="Add or configure phone numbers"
            href="/phone-numbers"
          />
        </div>
      </div>

      {/* Recent Conversations */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Conversations</h2>
          <Link
            href="/calls"
            className="text-sm text-primary hover:underline"
          >
            View all
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded bg-secondary" />
            ))}
          </div>
        ) : recentCalls.length === 0 ? (
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
          <div className="rounded-lg border bg-white">
            {/* Table Header - hidden on mobile */}
            <div className="hidden grid-cols-[1fr_1fr_100px_100px_120px] gap-4 border-b px-4 py-3 text-sm font-medium text-muted-foreground md:grid">
              <div className="flex items-center gap-1">
                Date
                <ChevronDownIcon className="h-4 w-4" />
              </div>
              <div>Agent</div>
              <div>Duration</div>
              <div>Messages</div>
              <div>Call status</div>
            </div>

            {/* Table Body */}
            <div>
              {recentCalls.map((call) => (
                <CallRow key={call.conversation_id} call={call} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  isLoading,
  icon,
}: {
  title: string;
  value: number;
  isLoading: boolean;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-8 w-16 animate-pulse rounded bg-secondary" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

function QuickActionCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="block rounded-lg border bg-white p-6 transition-shadow hover:shadow-md"
    >
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </a>
  );
}

function CallRow({ call }: { call: Call }) {
  const duration = call.duration_seconds
    ? `${Math.floor(call.duration_seconds / 60)}:${String(
        call.duration_seconds % 60
      ).padStart(2, "0")}`
    : "--:--";

  const startDate = call.start_time
    ? new Date(call.start_time * 1000)
    : null;

  const getStatusStyle = () => {
    if (call.call_successful === true || call.status === "done") {
      return "bg-green-100 text-green-700";
    }
    if (call.call_successful === false || call.status === "failed") {
      return "bg-red-100 text-red-700";
    }
    return "bg-yellow-100 text-yellow-700";
  };

  const getStatusText = () => {
    if (call.call_successful === true) return "Successful";
    if (call.call_successful === false) return "Error";
    if (call.status === "done") return "Successful";
    return call.status.charAt(0).toUpperCase() + call.status.slice(1);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <Link
      href="/calls"
      className="block w-full border-b px-4 py-4 text-left transition-colors hover:bg-secondary/30 last:border-b-0"
    >
      {/* Mobile Layout */}
      <div className="flex flex-col gap-2 md:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium">{call.agent_name}</span>
            <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
              <MicIcon className="h-3 w-3" />
              Main
            </span>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-xs ${getStatusStyle()}`}>
            {getStatusText()}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{startDate ? formatDate(startDate) : "Unknown"}</span>
          <span>{duration}</span>
          <span>{call.message_count !== null ? `${call.message_count} msgs` : "-"}</span>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden grid-cols-[1fr_1fr_100px_100px_120px] gap-4 md:grid">
        {/* Date */}
        <div className="text-sm">
          {startDate ? formatDate(startDate) : "Unknown"}
        </div>

        {/* Agent */}
        <div className="flex items-center gap-2">
          <span className="text-sm">{call.agent_name}</span>
          <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
            <MicIcon className="h-3 w-3" />
            Main
          </span>
        </div>

        {/* Duration */}
        <div className="text-sm">{duration}</div>

        {/* Messages */}
        <div className="text-sm text-center">
          {call.message_count !== null ? call.message_count : "-"}
        </div>

        {/* Call status */}
        <div>
          <span className={`rounded-full px-3 py-1 text-xs ${getStatusStyle()}`}>
            {getStatusText()}
          </span>
        </div>
      </div>
    </Link>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}
