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
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { CountryDisplay } from "@/components/ui/country-display";

interface PhoneNumber {
  id: string;
  phone_number: string;
  country_code: string | null;
  number_type: string;
  status: string;
  agent_id: string | null;
  agent_name?: string;
}

export default function PhoneNumbersPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [availableNumbers, setAvailableNumbers] = useState<PhoneNumber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showClaimModal, setShowClaimModal] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [claimed, available] = await Promise.all([
          api.getPhoneNumbers(),
          api.getAvailablePhoneNumbers(),
        ]);
        setPhoneNumbers(claimed);
        setAvailableNumbers(available);
      } catch {
        // Handle error
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const handleClaimNumber = async (phoneNumberId: string) => {
    try {
      const claimed = await api.claimPhoneNumber(phoneNumberId);
      setPhoneNumbers([...phoneNumbers, claimed]);
      setAvailableNumbers(availableNumbers.filter((n) => n.id !== phoneNumberId));
      setShowClaimModal(false);
    } catch {
      // Handle error
    }
  };

  const handleReleaseNumber = async (phoneNumberId: string) => {
    if (confirm("Are you sure you want to release this phone number?")) {
      try {
        await api.releasePhoneNumber(phoneNumberId);
        const released = phoneNumbers.find((n) => n.id === phoneNumberId);
        if (released) {
          setPhoneNumbers(phoneNumbers.filter((n) => n.id !== phoneNumberId));
          setAvailableNumbers([
            ...availableNumbers,
            { ...released, status: "available", agent_id: null },
          ]);
        }
      } catch {
        // Handle error
      }
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Phone Numbers</h1>
          <p className="text-muted-foreground">
            Manage your voice-enabled phone numbers
          </p>
        </div>
        <Button
          onClick={() => setShowClaimModal(true)}
          disabled={!isAdmin}
          title={!isAdmin ? "Only admins can claim numbers" : undefined}
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          Claim Number
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
      ) : phoneNumbers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 rounded-full bg-secondary p-4">
              <HashIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">No phone numbers</h3>
            <p className="mb-4 text-center text-muted-foreground">
              Claim a phone number to enable voice calls
            </p>
            <Button
              onClick={() => setShowClaimModal(true)}
              disabled={!isAdmin}
              title={!isAdmin ? "Only admins can claim numbers" : undefined}
            >
              Claim Number
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {phoneNumbers.map((number) => (
            <PhoneNumberCard
              key={number.id}
              phoneNumber={number}
              onRelease={() => handleReleaseNumber(number.id)}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {/* Claim Number Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Claim Phone Number</CardTitle>
              <CardDescription>
                Select an available phone number to claim
              </CardDescription>
            </CardHeader>
            <CardContent>
              {availableNumbers.length === 0 ? (
                <p className="text-center text-muted-foreground">
                  No phone numbers available. Contact your administrator.
                </p>
              ) : (
                <div className="max-h-64 divide-y overflow-y-auto">
                  {availableNumbers.map((number) => (
                    <div
                      key={number.id}
                      className="flex items-center justify-between py-3"
                    >
                      <div>
                        <div className="font-mono">{number.phone_number}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          {number.number_type}
                          <span className="mx-1">•</span>
                          <CountryDisplay
                            countryCode={number.country_code}
                            phoneNumber={number.phone_number}
                            size="sm"
                          />
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleClaimNumber(number.id)}
                      >
                        Claim
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <div className="flex justify-end border-t p-4">
              <Button variant="outline" onClick={() => setShowClaimModal(false)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function PhoneNumberCard({
  phoneNumber,
  onRelease,
  isAdmin,
}: {
  phoneNumber: PhoneNumber;
  onRelease: () => void;
  isAdmin: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="font-mono text-lg">
              {phoneNumber.phone_number}
            </CardTitle>
            <CardDescription className="flex items-center gap-1">
              {phoneNumber.number_type}
              <span className="mx-1">•</span>
              <CountryDisplay
                countryCode={phoneNumber.country_code}
                phoneNumber={phoneNumber.phone_number}
                size="sm"
              />
            </CardDescription>
          </div>
          <span
            className={`rounded-full px-2 py-1 text-xs ${
              phoneNumber.status === "assigned"
                ? "bg-green-100 text-green-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {phoneNumber.status}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Assigned Agent</span>
            <span>{phoneNumber.agent_name || "Not assigned"}</span>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <a href={`/phone-numbers/${phoneNumber.id}`}>Configure</a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={onRelease}
            disabled={!isAdmin}
            title={!isAdmin ? "Only admins can release numbers" : undefined}
          >
            Release
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

function HashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
    </svg>
  );
}
