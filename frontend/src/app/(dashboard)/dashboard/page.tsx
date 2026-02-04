"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

interface DashboardStats {
  agents: number;
  calls: number;
  phoneNumbers: number;
  totalMinutes: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    agents: 0,
    calls: 0,
    phoneNumbers: 0,
    totalMinutes: 0,
  });
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
