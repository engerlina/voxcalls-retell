"use client";

import { useEffect, useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

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

interface TranscriptMessage {
  role: string;
  message: string;
  time_in_call_secs?: number;
}

interface ConversationDetails {
  conversation_id: string;
  agent_id: string;
  voxcalls_agent_name: string;
  status: string;
  start_time_unix_secs: number | null;
  end_time_unix_secs: number | null;
  transcript: TranscriptMessage[];
  metadata?: {
    call_duration_secs?: number;
    cost?: number;
    phone_number?: string;
  };
  analysis?: {
    call_successful?: boolean;
    transcript_summary?: string;
    evaluation_criteria_results?: Record<string, { result: string; rationale: string }>;
  };
  audio_url?: string | null;
}

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [conversationDetails, setConversationDetails] = useState<ConversationDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "transcript">("overview");

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

  const handleCallClick = async (call: Call) => {
    setSelectedCall(call);
    setConversationDetails(null);
    setIsLoadingDetails(true);
    setActiveTab("overview");

    try {
      const details = await api.getConversationDetails(call.conversation_id);
      setConversationDetails(details);
    } catch (error) {
      console.error("Failed to load conversation details:", error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleSheetClose = () => {
    setSelectedCall(null);
    setConversationDetails(null);
  };

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
                <CallRow
                  key={call.conversation_id}
                  call={call}
                  onClick={() => handleCallClick(call)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Call Details Drawer */}
      <Sheet open={!!selectedCall} onOpenChange={(open) => !open && handleSheetClose()}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              {selectedCall?.agent_name || "Call Details"}
            </SheetTitle>
            <SheetDescription>
              {selectedCall?.conversation_id}
            </SheetDescription>
          </SheetHeader>

          {isLoadingDetails ? (
            <div className="mt-6 space-y-4">
              <div className="h-20 animate-pulse rounded bg-secondary" />
              <div className="h-40 animate-pulse rounded bg-secondary" />
            </div>
          ) : conversationDetails ? (
            <div className="mt-6">
              {/* Audio Player */}
              {conversationDetails.audio_url && (
                <AudioPlayer src={conversationDetails.audio_url} />
              )}

              {/* Tabs */}
              <div className="mt-6 flex gap-2 border-b">
                <button
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === "overview"
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setActiveTab("overview")}
                >
                  Overview
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === "transcript"
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setActiveTab("transcript")}
                >
                  Transcript
                </button>
              </div>

              {/* Tab Content */}
              <div className="mt-4">
                {activeTab === "overview" ? (
                  <OverviewTab details={conversationDetails} />
                ) : (
                  <TranscriptTab transcript={conversationDetails.transcript} />
                )}
              </div>
            </div>
          ) : (
            <div className="mt-6 text-center text-muted-foreground">
              Failed to load conversation details
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CallRow({ call, onClick }: { call: Call; onClick: () => void }) {
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
    if (call.call_successful === false) return "Failed";
    if (call.status === "done") return "Completed";
    return call.status.charAt(0).toUpperCase() + call.status.slice(1);
  };

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 py-4 text-left transition-colors hover:bg-secondary/50"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
        <PhoneIcon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{call.agent_name}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs ${getStatusStyle()}`}>
            {getStatusText()}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          {startDate ? startDate.toLocaleString() : "Unknown time"}
          {call.message_count !== null && ` • ${call.message_count} messages`}
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono">{duration}</div>
      </div>
    </button>
  );
}

function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="rounded-lg border bg-secondary/30 p-4">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={togglePlay}
          className="h-10 w-10 rounded-full"
        >
          {isPlaying ? (
            <PauseIcon className="h-5 w-5" />
          ) : (
            <PlayIcon className="h-5 w-5" />
          )}
        </Button>
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full accent-primary"
          />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ details }: { details: ConversationDetails }) {
  const startDate = details.start_time_unix_secs
    ? new Date(details.start_time_unix_secs * 1000)
    : null;

  const duration = details.metadata?.call_duration_secs
    ? `${Math.floor(details.metadata.call_duration_secs / 60)}:${String(
        Math.floor(details.metadata.call_duration_secs % 60)
      ).padStart(2, "0")}`
    : details.start_time_unix_secs && details.end_time_unix_secs
    ? `${Math.floor((details.end_time_unix_secs - details.start_time_unix_secs) / 60)}:${String(
        Math.floor((details.end_time_unix_secs - details.start_time_unix_secs) % 60)
      ).padStart(2, "0")}`
    : "--:--";

  const getStatusBadge = () => {
    if (details.analysis?.call_successful === true) {
      return <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">Successful</span>;
    }
    if (details.analysis?.call_successful === false) {
      return <span className="rounded-full bg-red-100 px-3 py-1 text-sm text-red-700">Failed</span>;
    }
    if (details.status === "done") {
      return <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">Completed</span>;
    }
    return <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm text-yellow-700">{details.status}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      {details.analysis?.transcript_summary && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">Summary</h4>
          <p className="text-sm text-muted-foreground">
            {details.analysis.transcript_summary}
          </p>
        </div>
      )}

      {/* Metadata */}
      <div className="space-y-3">
        <div className="flex justify-between border-b pb-2">
          <span className="text-sm text-muted-foreground">Call status</span>
          {getStatusBadge()}
        </div>

        <div className="flex justify-between border-b pb-2">
          <span className="text-sm text-muted-foreground">Date</span>
          <span className="text-sm">
            {startDate ? startDate.toLocaleString() : "Unknown"}
          </span>
        </div>

        <div className="flex justify-between border-b pb-2">
          <span className="text-sm text-muted-foreground">Duration</span>
          <span className="text-sm font-mono">{duration}</span>
        </div>

        {details.metadata?.phone_number && (
          <div className="flex justify-between border-b pb-2">
            <span className="text-sm text-muted-foreground">Phone number</span>
            <span className="text-sm">{details.metadata.phone_number}</span>
          </div>
        )}

        <div className="flex justify-between border-b pb-2">
          <span className="text-sm text-muted-foreground">Messages</span>
          <span className="text-sm">{details.transcript?.length || 0}</span>
        </div>

        {details.metadata?.cost !== undefined && (
          <div className="flex justify-between border-b pb-2">
            <span className="text-sm text-muted-foreground">Cost</span>
            <span className="text-sm">{details.metadata.cost} credits</span>
          </div>
        )}
      </div>

      {/* Evaluation Criteria */}
      {details.analysis?.evaluation_criteria_results && (
        <div>
          <h4 className="mb-3 text-sm font-semibold">Evaluation</h4>
          <div className="space-y-2">
            {Object.entries(details.analysis.evaluation_criteria_results).map(([key, value]) => (
              <div key={key} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{key}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    value.result === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {value.result}
                  </span>
                </div>
                {value.rationale && (
                  <p className="mt-1 text-xs text-muted-foreground">{value.rationale}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TranscriptTab({ transcript }: { transcript: TranscriptMessage[] }) {
  if (!transcript || transcript.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No transcript available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {transcript.map((message, index) => (
        <div
          key={index}
          className={`flex gap-3 ${
            message.role === "agent" ? "" : "flex-row-reverse"
          }`}
        >
          <div
            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium ${
              message.role === "agent"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            {message.role === "agent" ? "AI" : "U"}
          </div>
          <div
            className={`max-w-[80%] rounded-lg px-4 py-2 ${
              message.role === "agent"
                ? "bg-secondary"
                : "bg-primary text-primary-foreground"
            }`}
          >
            <p className="text-sm">{message.message}</p>
            {message.time_in_call_secs !== undefined && (
              <p className={`mt-1 text-xs ${
                message.role === "agent" ? "text-muted-foreground" : "opacity-70"
              }`}>
                {Math.floor(message.time_in_call_secs / 60)}:
                {String(Math.floor(message.time_in_call_secs % 60)).padStart(2, "0")}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
    </svg>
  );
}
