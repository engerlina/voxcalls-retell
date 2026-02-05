"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

type CallStatus = "all" | "successful" | "error" | "in_progress";
type DurationFilter = "all" | "under_1m" | "1_5m" | "5_10m" | "over_10m";

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
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [dateAfter, setDateAfter] = useState<Date | undefined>(undefined);
  const [dateBefore, setDateBefore] = useState<Date | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<CallStatus>("all");
  const [durationFilter, setDurationFilter] = useState<DurationFilter>("all");

  // Filtered calls
  const filteredCalls = useMemo(() => {
    return calls.filter((call) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!call.agent_name.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Date after filter
      if (dateAfter && call.start_time) {
        const callDate = new Date(call.start_time * 1000);
        if (callDate < dateAfter) {
          return false;
        }
      }

      // Date before filter
      if (dateBefore && call.start_time) {
        const callDate = new Date(call.start_time * 1000);
        if (callDate > dateBefore) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "successful") {
          if (call.call_successful !== true && call.status !== "done") {
            return false;
          }
        } else if (statusFilter === "error") {
          if (call.call_successful !== false && call.status !== "failed") {
            return false;
          }
        } else if (statusFilter === "in_progress") {
          if (call.status !== "processing" && call.status !== "in_progress") {
            return false;
          }
        }
      }

      // Duration filter
      if (durationFilter !== "all" && call.duration_seconds !== null) {
        const duration = call.duration_seconds;
        if (durationFilter === "under_1m" && duration >= 60) {
          return false;
        } else if (durationFilter === "1_5m" && (duration < 60 || duration >= 300)) {
          return false;
        } else if (durationFilter === "5_10m" && (duration < 300 || duration >= 600)) {
          return false;
        } else if (durationFilter === "over_10m" && duration < 600) {
          return false;
        }
      }

      return true;
    });
  }, [calls, searchQuery, dateAfter, dateBefore, statusFilter, durationFilter]);

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
    setAudioUrl(null);
    setIsLoadingDetails(true);
    setActiveTab("overview");

    try {
      // Fetch conversation details and audio in parallel
      const [details, audioBlobUrl] = await Promise.all([
        api.getConversationDetails(call.conversation_id),
        api.getConversationAudioBlob(call.conversation_id),
      ]);
      setConversationDetails(details);
      setAudioUrl(audioBlobUrl);
    } catch (error) {
      console.error("Failed to load conversation details:", error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleSheetClose = () => {
    // Revoke blob URL to prevent memory leaks
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setSelectedCall(null);
    setConversationDetails(null);
    setAudioUrl(null);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setDateAfter(undefined);
    setDateBefore(undefined);
    setStatusFilter("all");
    setDurationFilter("all");
  };

  const hasActiveFilters = searchQuery || dateAfter || dateBefore || statusFilter !== "all" || durationFilter !== "all";

  return (
    <div>
      {/* Header */}
      <h1 className="mb-6 text-2xl font-semibold">Conversation history</h1>

      {/* Search */}
      <div className="relative mb-4">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search conversations..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Filter buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        {/* Date After Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 gap-1 text-xs font-normal",
                dateAfter && "border-primary bg-primary/10"
              )}
            >
              {dateAfter ? (
                <>
                  <CalendarIcon className="h-3 w-3" />
                  After {format(dateAfter, "MMM d, yyyy")}
                  <XIcon
                    className="ml-1 h-3 w-3 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDateAfter(undefined);
                    }}
                  />
                </>
              ) : (
                <>
                  <PlusIcon className="h-3 w-3" />
                  Date After
                </>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateAfter}
              onSelect={setDateAfter}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Date Before Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 gap-1 text-xs font-normal",
                dateBefore && "border-primary bg-primary/10"
              )}
            >
              {dateBefore ? (
                <>
                  <CalendarIcon className="h-3 w-3" />
                  Before {format(dateBefore, "MMM d, yyyy")}
                  <XIcon
                    className="ml-1 h-3 w-3 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDateBefore(undefined);
                    }}
                  />
                </>
              ) : (
                <>
                  <PlusIcon className="h-3 w-3" />
                  Date Before
                </>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateBefore}
              onSelect={setDateBefore}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Call Status Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 gap-1 text-xs font-normal",
                statusFilter !== "all" && "border-primary bg-primary/10"
              )}
            >
              {statusFilter !== "all" ? (
                <>
                  <FilterIcon className="h-3 w-3" />
                  {statusFilter === "successful" && "Successful"}
                  {statusFilter === "error" && "Error"}
                  {statusFilter === "in_progress" && "In Progress"}
                  <XIcon
                    className="ml-1 h-3 w-3 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStatusFilter("all");
                    }}
                  />
                </>
              ) : (
                <>
                  <PlusIcon className="h-3 w-3" />
                  Call status
                </>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            <div className="space-y-1">
              {[
                { value: "all", label: "All statuses" },
                { value: "successful", label: "Successful" },
                { value: "error", label: "Error" },
                { value: "in_progress", label: "In Progress" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setStatusFilter(option.value as CallStatus)}
                  className={cn(
                    "flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors hover:bg-secondary",
                    statusFilter === option.value && "bg-secondary font-medium"
                  )}
                >
                  {statusFilter === option.value && (
                    <CheckIcon className="mr-2 h-4 w-4" />
                  )}
                  <span className={statusFilter !== option.value ? "ml-6" : ""}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Duration Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 gap-1 text-xs font-normal",
                durationFilter !== "all" && "border-primary bg-primary/10"
              )}
            >
              {durationFilter !== "all" ? (
                <>
                  <ClockIcon className="h-3 w-3" />
                  {durationFilter === "under_1m" && "Under 1 min"}
                  {durationFilter === "1_5m" && "1-5 min"}
                  {durationFilter === "5_10m" && "5-10 min"}
                  {durationFilter === "over_10m" && "Over 10 min"}
                  <XIcon
                    className="ml-1 h-3 w-3 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDurationFilter("all");
                    }}
                  />
                </>
              ) : (
                <>
                  <PlusIcon className="h-3 w-3" />
                  Duration
                </>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            <div className="space-y-1">
              {[
                { value: "all", label: "All durations" },
                { value: "under_1m", label: "Under 1 min" },
                { value: "1_5m", label: "1-5 min" },
                { value: "5_10m", label: "5-10 min" },
                { value: "over_10m", label: "Over 10 min" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDurationFilter(option.value as DurationFilter)}
                  className={cn(
                    "flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors hover:bg-secondary",
                    durationFilter === option.value && "bg-secondary font-medium"
                  )}
                >
                  {durationFilter === option.value && (
                    <CheckIcon className="mr-2 h-4 w-4" />
                  )}
                  <span className={durationFilter !== option.value ? "ml-6" : ""}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear all filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs font-normal text-muted-foreground hover:text-foreground"
            onClick={clearFilters}
          >
            <XIcon className="h-3 w-3" />
            Clear filters
          </Button>
        )}
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
            {filteredCalls.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No conversations match your filters
              </div>
            ) : (
              filteredCalls.map((call) => (
                <CallRow
                  key={call.conversation_id}
                  call={call}
                  onClick={() => handleCallClick(call)}
                />
              ))
            )}
          </div>
        </div>
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
              <AudioPlayer src={audioUrl} />

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
    <button
      onClick={onClick}
      className="w-full border-b px-4 py-4 text-left transition-colors hover:bg-secondary/30"
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
    </button>
  );
}

function AudioPlayer({ src }: { src: string | null }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const togglePlay = () => {
    if (audioRef.current && src) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch((e) => {
          setError("Failed to play audio");
          console.error("Audio play error:", e);
        });
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
      setIsLoading(false);
      setError(null);
    }
  };

  const handleError = () => {
    setError("Audio unavailable");
    setIsLoading(false);
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

  if (!src) {
    return (
      <div className="rounded-lg border bg-secondary/30 p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
            <PhoneIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <span className="text-sm text-muted-foreground">No recording available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-secondary/30 p-4">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        onError={handleError}
        onCanPlay={() => setIsLoading(false)}
      />
      {error ? (
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
            <PhoneIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <span className="text-sm text-muted-foreground">{error}</span>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={togglePlay}
            disabled={isLoading}
            className="h-10 w-10 rounded-full"
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : isPlaying ? (
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
              disabled={isLoading}
              className="w-full accent-primary"
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{isLoading ? "--:--" : formatTime(duration)}</span>
            </div>
          </div>
        </div>
      )}
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

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function XIcon({ className, onClick }: { className?: string; onClick?: (e: React.MouseEvent) => void }) {
  return (
    <svg className={className} onClick={onClick} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
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

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
