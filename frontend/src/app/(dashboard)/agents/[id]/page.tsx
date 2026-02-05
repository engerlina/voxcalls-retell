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

const LLM_MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini (Fastest)" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  { value: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet" },
  { value: "claude-3-haiku", label: "Claude 3 Haiku (Fast)" },
];

const LANGUAGES = [
  { value: "en", label: "English", flagCode: "us" },
  { value: "es", label: "Spanish", flagCode: "es" },
  { value: "fr", label: "French", flagCode: "fr" },
  { value: "de", label: "German", flagCode: "de" },
  { value: "it", label: "Italian", flagCode: "it" },
  { value: "pt", label: "Portuguese", flagCode: "pt" },
  { value: "nl", label: "Dutch", flagCode: "nl" },
  { value: "pl", label: "Polish", flagCode: "pl" },
  { value: "ja", label: "Japanese", flagCode: "jp" },
  { value: "ko", label: "Korean", flagCode: "kr" },
  { value: "zh", label: "Chinese", flagCode: "cn" },
  { value: "ar", label: "Arabic", flagCode: "sa" },
  { value: "hi", label: "Hindi", flagCode: "in" },
  { value: "ru", label: "Russian", flagCode: "ru" },
  { value: "tr", label: "Turkish", flagCode: "tr" },
];

const VOICES = [
  { value: "21m00Tcm4TlvDq8ikWAM", label: "Rachel", gender: "female" },
  { value: "EXAVITQu4vr4xnSDxMaL", label: "Bella", gender: "female" },
  { value: "ErXwobaYiN019PkySvjV", label: "Antoni", gender: "male" },
  { value: "MF3mGyEYCl7XYWbV9V6O", label: "Elli", gender: "female" },
  { value: "TxGEqnHWrfWFTfGW9XjX", label: "Josh", gender: "male" },
  { value: "VR6AewLTigWG4xSOukaG", label: "Arnold", gender: "male" },
  { value: "pNInz6obpgDQGcFmaJgB", label: "Adam", gender: "male" },
  { value: "yoZ06aMxZJJ28mfd3POQ", label: "Sam", gender: "male" },
  { value: "onwK4e9ZLuTAKqWW03F9", label: "Daniel", gender: "male" },
  { value: "XB0fDUnXU5powFXDhCwa", label: "Charlotte", gender: "female" },
  { value: "Xb7hH8MSUJpSbSDYk0k2", label: "Alice", gender: "female" },
  { value: "iP95p4xoKVk53GoZ742B", label: "Chris", gender: "male" },
  { value: "r6qgCCGI7RWKXCagm158", label: "Chinese Voice", gender: "female" },
  { value: "M7ya1YbaeFaPXljg9BpK", label: "Australian Female", gender: "female" },
];

// Map languages to their preferred voices
const LANGUAGE_VOICE_MAP: Record<string, string> = {
  zh: "r6qgCCGI7RWKXCagm158", // Chinese Voice
  en: "21m00Tcm4TlvDq8ikWAM", // Rachel (default English)
};

interface VoiceConfig {
  id: string;
  voiceId: string;
  isPrimary: boolean;
}

interface LanguageConfig {
  id: string;
  code: string;
  isDefault: boolean;
}

export default function AgentConfigPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const agentId = params.id as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [llmModel, setLlmModel] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxConversationTurns, setMaxConversationTurns] = useState(100);
  const [minSilenceDuration, setMinSilenceDuration] = useState(0.4);

  // Multi-voice and multi-language state
  const [voices, setVoices] = useState<VoiceConfig[]>([
    { id: "1", voiceId: "21m00Tcm4TlvDq8ikWAM", isPrimary: true },
  ]);
  const [languages, setLanguages] = useState<LanguageConfig[]>([
    { id: "1", code: "en", isDefault: true },
  ]);
  const [showAddVoiceModal, setShowAddVoiceModal] = useState(false);
  const [showAddLanguageModal, setShowAddLanguageModal] = useState(false);

  useEffect(() => {
    loadAgent();
  }, [agentId]);

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadAgent = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAgentDetails(agentId);
      setAgent(data);
      // Initialize form state
      setName(data.name || "");
      setSystemPrompt(data.system_prompt || "");
      setWelcomeMessage(data.welcome_message || "");
      setLlmModel(data.llm_model || "gpt-4o-mini");
      setTemperature(data.temperature || 0.7);
      setMaxConversationTurns(data.max_conversation_turns || 100);
      setMinSilenceDuration(data.min_silence_duration || 0.4);

      // Initialize voices (primary from voice_id, additional from tools_config if stored there)
      const primaryVoice = data.voice_id || "21m00Tcm4TlvDq8ikWAM";
      const additionalVoices = data.tools_config?.additional_voices || [];
      setVoices([
        { id: "1", voiceId: primaryVoice, isPrimary: true },
        ...additionalVoices.map((v: string, i: number) => ({
          id: String(i + 2),
          voiceId: v,
          isPrimary: false,
        })),
      ]);

      // Initialize languages (default from language, additional from tools_config if stored there)
      const defaultLang = data.language || "en";
      const additionalLangs = data.tools_config?.additional_languages || [];
      setLanguages([
        { id: "1", code: defaultLang, isDefault: true },
        ...additionalLangs.map((l: string, i: number) => ({
          id: String(i + 2),
          code: l,
          isDefault: false,
        })),
      ]);
    } catch {
      setToast({ message: "Failed to load agent", type: "error" });
      router.push("/agents");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const primaryVoice = voices.find((v) => v.isPrimary)?.voiceId || voices[0]?.voiceId;
      const defaultLanguage = languages.find((l) => l.isDefault)?.code || languages[0]?.code;
      const additionalVoices = voices.filter((v) => !v.isPrimary).map((v) => v.voiceId);
      const additionalLanguages = languages.filter((l) => !l.isDefault).map((l) => l.code);

      const updated = await api.updateAgent(agentId, {
        name,
        system_prompt: systemPrompt || undefined,
        welcome_message: welcomeMessage || undefined,
        voice_id: primaryVoice,
        llm_model: llmModel,
        language: defaultLanguage,
        temperature,
        max_conversation_turns: maxConversationTurns,
        min_silence_duration: minSilenceDuration,
        // Store additional voices/languages in tools_config
        tools_config: {
          ...(agent?.tools_config || {}),
          additional_voices: additionalVoices,
          additional_languages: additionalLanguages,
        },
      } as Parameters<typeof api.updateAgent>[1]);
      setAgent(updated);
      setHasChanges(false);
      setToast({ message: "Agent saved successfully!", type: "success" });
    } catch (error: unknown) {
      console.error("Failed to save agent:", error);
      let message = "Failed to save agent";
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as { response?: { data?: { detail?: string } } };
        message = axiosError.response?.data?.detail || message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      setToast({ message, type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const markChanged = () => setHasChanges(true);

  const getVoiceLabel = (voiceId: string) => {
    return VOICES.find((v) => v.value === voiceId)?.label || "Unknown Voice";
  };

  const getLanguageInfo = (code: string) => {
    return LANGUAGES.find((l) => l.value === code) || { label: code, flagCode: "" };
  };

  const addVoice = (voiceId: string) => {
    if (voices.some((v) => v.voiceId === voiceId)) return;
    setVoices([...voices, { id: String(Date.now()), voiceId, isPrimary: false }]);
    markChanged();
    setShowAddVoiceModal(false);
  };

  const removeVoice = (id: string) => {
    const voice = voices.find((v) => v.id === id);
    if (voice?.isPrimary) return; // Can't remove primary
    setVoices(voices.filter((v) => v.id !== id));
    markChanged();
  };

  const setPrimaryVoice = (id: string) => {
    setVoices(voices.map((v) => ({ ...v, isPrimary: v.id === id })));
    markChanged();
  };

  const addLanguage = (code: string) => {
    if (languages.some((l) => l.code === code)) return;
    setLanguages([...languages, { id: String(Date.now()), code, isDefault: false }]);
    markChanged();
    setShowAddLanguageModal(false);
  };

  const removeLanguage = (id: string) => {
    const lang = languages.find((l) => l.id === id);
    if (lang?.isDefault) return; // Can't remove default
    setLanguages(languages.filter((l) => l.id !== id));
    markChanged();
  };

  const setDefaultLanguage = (id: string) => {
    const lang = languages.find((l) => l.id === id);
    setLanguages(languages.map((l) => ({ ...l, isDefault: l.id === id })));

    // Auto-switch voice if there's a preferred voice for this language
    if (lang && LANGUAGE_VOICE_MAP[lang.code]) {
      const preferredVoiceId = LANGUAGE_VOICE_MAP[lang.code];
      // Check if this voice exists in our list
      const voiceExists = VOICES.some((v) => v.value === preferredVoiceId);
      if (voiceExists) {
        // Check if voice is already added
        const existingVoice = voices.find((v) => v.voiceId === preferredVoiceId);
        if (existingVoice) {
          // Set it as primary
          setVoices(voices.map((v) => ({ ...v, isPrimary: v.voiceId === preferredVoiceId })));
        } else {
          // Add the voice and set as primary
          setVoices([
            ...voices.map((v) => ({ ...v, isPrimary: false })),
            { id: String(Date.now()), voiceId: preferredVoiceId, isPrimary: true },
          ]);
        }
      }
    }
    markChanged();
  };

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
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg transition-all ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircleIcon className="h-5 w-5" />
          ) : (
            <XCircleIcon className="h-5 w-5" />
          )}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80">
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/agents" className="hover:text-foreground">
            Agents
          </Link>
          <ChevronRightIcon className="h-4 w-4" />
          <span>{agent.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{agent.name}</h1>
            <p className="text-muted-foreground">
              Configure your AI voice agent
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/agents/${agentId}/documents`}>
                <BookIcon className="mr-2 h-4 w-4" />
                Knowledge Base
              </Link>
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isAdmin || !hasChanges || isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-4 border-b">
        <Link
          href={`/agents/${agentId}`}
          className="border-b-2 border-primary px-4 py-2 text-sm font-medium"
        >
          Configuration
        </Link>
        <Link
          href={`/agents/${agentId}/documents`}
          className="border-b-2 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Knowledge Base
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Basic Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Settings</CardTitle>
            <CardDescription>
              Configure the agent&apos;s name and behavior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Agent Name
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  markChanged();
                }}
                disabled={!isAdmin}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="welcome" className="text-sm font-medium">
                Welcome Message
              </label>
              <textarea
                id="welcome"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                placeholder="Hello! How can I help you today?"
                value={welcomeMessage}
                onChange={(e) => {
                  setWelcomeMessage(e.target.value);
                  markChanged();
                }}
                disabled={!isAdmin}
              />
              <p className="text-xs text-muted-foreground">
                The first message the agent will say when a call starts
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="prompt" className="text-sm font-medium">
                System Prompt
              </label>
              <textarea
                id="prompt"
                className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                placeholder="You are a helpful voice assistant..."
                value={systemPrompt}
                onChange={(e) => {
                  setSystemPrompt(e.target.value);
                  markChanged();
                }}
                disabled={!isAdmin}
              />
              <p className="text-xs text-muted-foreground">
                Instructions that define the agent&apos;s personality and behavior
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Voice & Language - New Design */}
        <Card>
          <CardHeader>
            <CardTitle>Voice & Language</CardTitle>
            <CardDescription>
              Configure the agent&apos;s voice and language settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Voices Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Voices</h4>
                  <p className="text-xs text-muted-foreground">
                    Select the ElevenLabs voices you want to use for the agent.
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <SettingsIcon className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {voices.map((voice) => (
                  <div
                    key={voice.id}
                    className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <SpeakerIcon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium">{getVoiceLabel(voice.voiceId)}</span>
                      {voice.isPrimary && (
                        <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {!voice.isPrimary && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setPrimaryVoice(voice.id)}
                            disabled={!isAdmin}
                          >
                            Set Primary
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => removeVoice(voice.id)}
                            disabled={!isAdmin}
                          >
                            <XIcon className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}

                <button
                  className="flex w-full items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 disabled:opacity-50"
                  onClick={() => setShowAddVoiceModal(true)}
                  disabled={!isAdmin}
                >
                  <PlusCircleIcon className="h-4 w-4" />
                  Add additional voice
                </button>
              </div>
            </div>

            {/* Languages Section */}
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium">Language</h4>
                <p className="text-xs text-muted-foreground">
                  Choose the default and additional languages the agent will communicate in.
                </p>
              </div>

              <div className="space-y-2">
                {languages.map((lang) => {
                  const langInfo = getLanguageInfo(lang.code);
                  return (
                    <div
                      key={lang.id}
                      className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`fi fi-${langInfo.flagCode} text-base rounded-sm`} />
                        <span className="font-medium">{langInfo.label}</span>
                        {lang.isDefault && (
                          <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {!lang.isDefault && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => setDefaultLanguage(lang.id)}
                              disabled={!isAdmin}
                            >
                              Set Default
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => removeLanguage(lang.id)}
                              disabled={!isAdmin}
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}

                <button
                  className="flex w-full items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 disabled:opacity-50"
                  onClick={() => setShowAddLanguageModal(true)}
                  disabled={!isAdmin}
                >
                  <PlusCircleIcon className="h-4 w-4" />
                  Add additional languages
                </button>
              </div>
            </div>

            {/* LLM Model */}
            <div className="space-y-2">
              <label htmlFor="llm" className="text-sm font-medium">
                LLM Model
              </label>
              <select
                id="llm"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                value={llmModel}
                onChange={(e) => {
                  setLlmModel(e.target.value);
                  markChanged();
                }}
                disabled={!isAdmin}
              >
                {LLM_MODELS.map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                The AI model that powers the conversation
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Settings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Advanced Settings</CardTitle>
            <CardDescription>
              Fine-tune the agent&apos;s conversation behavior
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <label htmlFor="temperature" className="text-sm font-medium">
                  Temperature
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    id="temperature"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => {
                      setTemperature(parseFloat(e.target.value));
                      markChanged();
                    }}
                    disabled={!isAdmin}
                    className="flex-1"
                  />
                  <span className="w-12 text-sm text-muted-foreground">
                    {temperature.toFixed(1)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Higher values make responses more creative, lower values more focused
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="maxTurns" className="text-sm font-medium">
                  Max Conversation Turns
                </label>
                <Input
                  id="maxTurns"
                  type="number"
                  min="1"
                  max="500"
                  value={maxConversationTurns}
                  onChange={(e) => {
                    setMaxConversationTurns(parseInt(e.target.value) || 100);
                    markChanged();
                  }}
                  disabled={!isAdmin}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum back-and-forth exchanges per call
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="silence" className="text-sm font-medium">
                  Min Silence Duration (seconds)
                </label>
                <Input
                  id="silence"
                  type="number"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={minSilenceDuration}
                  onChange={(e) => {
                    setMinSilenceDuration(parseFloat(e.target.value) || 0.4);
                    markChanged();
                  }}
                  disabled={!isAdmin}
                />
                <p className="text-xs text-muted-foreground">
                  How long to wait before the agent responds
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Agent Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`h-3 w-3 rounded-full ${
                    agent.status === "active" ? "bg-green-500" : "bg-gray-400"
                  }`}
                />
                <span className="font-medium capitalize">{agent.status}</span>
              </div>
              <div className="flex gap-2">
                {agent.status === "active" ? (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        await api.updateAgent(agentId, { status: "paused" });
                        loadAgent();
                        setToast({ message: "Agent paused", type: "success" });
                      } catch {
                        setToast({ message: "Failed to pause agent", type: "error" });
                      }
                    }}
                    disabled={!isAdmin}
                  >
                    Pause Agent
                  </Button>
                ) : (
                  <Button
                    onClick={async () => {
                      try {
                        await api.updateAgent(agentId, { status: "active" });
                        loadAgent();
                        setToast({ message: "Agent activated", type: "success" });
                      } catch {
                        setToast({ message: "Failed to activate agent", type: "error" });
                      }
                    }}
                    disabled={!isAdmin}
                  >
                    Activate Agent
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-4 grid gap-4 text-sm md:grid-cols-3">
              <div>
                <span className="text-muted-foreground">Created</span>
                <p className="font-medium">
                  {new Date(agent.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">ElevenLabs ID</span>
                <p className="font-mono text-xs">
                  {agent.elevenlabs_agent_id || "Not connected"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Internal ID</span>
                <p className="font-mono text-xs">{agent.id}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Voice Modal */}
      {showAddVoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add Voice</CardTitle>
              <CardDescription>
                Select a voice to add to this agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[300px] space-y-2 overflow-y-auto">
                {VOICES.filter((v) => !voices.some((ev) => ev.voiceId === v.value)).map(
                  (voice) => (
                    <button
                      key={voice.value}
                      className="flex w-full items-center gap-3 rounded-lg border px-3 py-2 hover:bg-muted/50"
                      onClick={() => addVoice(voice.value)}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <SpeakerIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">{voice.label}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {voice.gender}
                        </p>
                      </div>
                    </button>
                  )
                )}
                {VOICES.filter((v) => !voices.some((ev) => ev.voiceId === v.value))
                  .length === 0 && (
                  <p className="py-4 text-center text-muted-foreground">
                    All available voices have been added
                  </p>
                )}
              </div>
            </CardContent>
            <div className="flex justify-end border-t p-4">
              <Button variant="outline" onClick={() => setShowAddVoiceModal(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Add Language Modal */}
      {showAddLanguageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add Language</CardTitle>
              <CardDescription>
                Select a language to add to this agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[300px] space-y-2 overflow-y-auto">
                {LANGUAGES.filter((l) => !languages.some((el) => el.code === l.value)).map(
                  (lang) => (
                    <button
                      key={lang.value}
                      className="flex w-full items-center gap-3 rounded-lg border px-3 py-2 hover:bg-muted/50"
                      onClick={() => addLanguage(lang.value)}
                    >
                      <span className={`fi fi-${lang.flagCode} text-base rounded-sm`} />
                      <span className="font-medium">{lang.label}</span>
                    </button>
                  )
                )}
                {LANGUAGES.filter((l) => !languages.some((el) => el.code === l.value))
                  .length === 0 && (
                  <p className="py-4 text-center text-muted-foreground">
                    All available languages have been added
                  </p>
                )}
              </div>
            </CardContent>
            <div className="flex justify-end border-t p-4">
              <Button variant="outline" onClick={() => setShowAddLanguageModal(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
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

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
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

function SpeakerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  );
}

function PlusCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
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

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
