"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Scissors,
  RotateCcw,
  Save,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EditingSettings {
  volume: number;
  fadeIn: number;
  fadeOut: number;
  trimStart: number;
  trimEnd: number;
  normalizeVolume: boolean;
  removeHesitations: boolean;
}

interface SectionEditorProps {
  sectionId: string;
  sectionName: string;
  audioUrl: string;
  duration: number;
  initialSettings?: Partial<EditingSettings>;
  onSave?: (settings: EditingSettings) => Promise<void>;
  onPreview?: (settings: EditingSettings) => void;
  className?: string;
}

const defaultSettings: EditingSettings = {
  volume: 100,
  fadeIn: 0,
  fadeOut: 0,
  trimStart: 0,
  trimEnd: 0,
  normalizeVolume: false,
  removeHesitations: false,
};

export function SectionEditor({
  sectionId,
  sectionName,
  audioUrl,
  duration,
  initialSettings,
  onSave,
  onPreview,
  className,
}: SectionEditorProps) {
  const [settings, setSettings] = useState<EditingSettings>({
    ...defaultSettings,
    ...initialSettings,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (audioUrl) {
      audioRef.current = new Audio(audioUrl);

      audioRef.current.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      audioRef.current.ontimeupdate = () => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      };
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = settings.volume / 100;
    }
  }, [settings.volume]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const updateSetting = <K extends keyof EditingSettings>(
    key: K,
    value: EditingSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const resetSettings = () => {
    setSettings({ ...defaultSettings, ...initialSettings });
    setHasChanges(false);
  };

  const handlePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (currentTime === 0 || currentTime < settings.trimStart) {
        audioRef.current.currentTime = settings.trimStart;
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    const newTime = value[0];
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSkip = (direction: "back" | "forward") => {
    if (!audioRef.current) return;
    const skipAmount = 5;
    let newTime =
      direction === "back"
        ? audioRef.current.currentTime - skipAmount
        : audioRef.current.currentTime + skipAmount;

    newTime = Math.max(settings.trimStart, Math.min(newTime, duration - settings.trimEnd));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSave = async () => {
    if (!onSave) return;

    setIsSaving(true);
    try {
      await onSave(settings);
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  const effectiveDuration = duration - settings.trimStart - settings.trimEnd;

  return (
    <div className={cn("bg-zinc-800/50 rounded-xl border border-zinc-700 overflow-hidden", className)}>
      {/* Header */}
      <div className="p-4 border-b border-zinc-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-white">{sectionName}</h3>
            <Badge className="text-xs bg-zinc-700 text-zinc-300 border-zinc-600">
              {formatTime(effectiveDuration)}
            </Badge>
            {hasChanges && (
              <Badge className="text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                Alteracoes nao salvas
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-zinc-400 hover:text-white"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* Audio Player */}
          <div className="space-y-3">
            {/* Waveform placeholder */}
            <div className="h-16 bg-zinc-900 rounded-lg relative overflow-hidden">
              {/* Trim indicators */}
              <div
                className="absolute top-0 bottom-0 bg-zinc-800/80"
                style={{
                  left: 0,
                  width: `${(settings.trimStart / duration) * 100}%`,
                }}
              />
              <div
                className="absolute top-0 bottom-0 bg-zinc-800/80"
                style={{
                  right: 0,
                  width: `${(settings.trimEnd / duration) * 100}%`,
                }}
              />

              {/* Playback position */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-emerald-500"
                style={{
                  left: `${(currentTime / duration) * 100}%`,
                }}
              />

              {/* Simplified waveform */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center gap-0.5 h-10">
                  {Array.from({ length: 50 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-1 rounded-full",
                        i < (currentTime / duration) * 50
                          ? "bg-emerald-500"
                          : "bg-zinc-600"
                      )}
                      style={{
                        height: `${20 + Math.random() * 60}%`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Time display */}
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            {/* Playback controls */}
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSkip("back")}
                className="border-zinc-600 text-zinc-300 hover:bg-zinc-700"
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button
                size="default"
                onClick={handlePlay}
                className={cn(
                  "px-6",
                  isPlaying
                    ? "bg-emerald-500 hover:bg-emerald-600"
                    : "bg-zinc-700 hover:bg-zinc-600"
                )}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSkip("forward")}
                className="border-zinc-600 text-zinc-300 hover:bg-zinc-700"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            {/* Seek slider */}
            <Slider
              value={[currentTime]}
              min={0}
              max={duration}
              step={0.1}
              onValueChange={handleSeek}
              className="w-full"
            />
          </div>

          {/* Editing Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Volume */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-zinc-300">
                  <Volume2 className="h-4 w-4" />
                  Volume
                </Label>
                <span className="text-sm text-zinc-400">{settings.volume}%</span>
              </div>
              <Slider
                value={[settings.volume]}
                min={0}
                max={200}
                step={5}
                onValueChange={(v: number[]) => updateSetting("volume", v[0])}
              />
            </div>

            {/* Fade In */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-300">Fade In</Label>
                <span className="text-sm text-zinc-400">
                  {settings.fadeIn.toFixed(1)}s
                </span>
              </div>
              <Slider
                value={[settings.fadeIn]}
                min={0}
                max={5}
                step={0.1}
                onValueChange={(v: number[]) => updateSetting("fadeIn", v[0])}
              />
            </div>

            {/* Fade Out */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-300">Fade Out</Label>
                <span className="text-sm text-zinc-400">
                  {settings.fadeOut.toFixed(1)}s
                </span>
              </div>
              <Slider
                value={[settings.fadeOut]}
                min={0}
                max={5}
                step={0.1}
                onValueChange={(v: number[]) => updateSetting("fadeOut", v[0])}
              />
            </div>

            {/* Trim Start */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-zinc-300">
                  <Scissors className="h-4 w-4" />
                  Cortar Inicio
                </Label>
                <span className="text-sm text-zinc-400">
                  {formatTime(settings.trimStart)}
                </span>
              </div>
              <Slider
                value={[settings.trimStart]}
                min={0}
                max={Math.max(0, duration - settings.trimEnd - 1)}
                step={0.1}
                onValueChange={(v: number[]) => updateSetting("trimStart", v[0])}
              />
            </div>

            {/* Trim End */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-zinc-300">
                  <Scissors className="h-4 w-4" />
                  Cortar Fim
                </Label>
                <span className="text-sm text-zinc-400">
                  {formatTime(settings.trimEnd)}
                </span>
              </div>
              <Slider
                value={[settings.trimEnd]}
                min={0}
                max={Math.max(0, duration - settings.trimStart - 1)}
                step={0.1}
                onValueChange={(v: number[]) => updateSetting("trimEnd", v[0])}
              />
            </div>
          </div>

          {/* Toggle options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg">
              <Label htmlFor={`normalize-${sectionId}`} className="cursor-pointer text-zinc-300">
                Normalizar Volume
                <span className="block text-xs text-zinc-500">
                  Ajusta o volume para nivel padrao (-16 LUFS)
                </span>
              </Label>
              <Switch
                id={`normalize-${sectionId}`}
                checked={settings.normalizeVolume}
                onCheckedChange={(checked: boolean) =>
                  updateSetting("normalizeVolume", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg">
              <Label htmlFor={`hesitations-${sectionId}`} className="cursor-pointer text-zinc-300">
                Remover Hesitacoes
                <span className="block text-xs text-zinc-500">
                  Remove &quot;hm&quot;, &quot;eh&quot;, pausas longas
                </span>
              </Label>
              <Switch
                id={`hesitations-${sectionId}`}
                checked={settings.removeHesitations}
                onCheckedChange={(checked: boolean) =>
                  updateSetting("removeHesitations", checked)
                }
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-700">
            <Button
              variant="outline"
              onClick={resetSettings}
              disabled={!hasChanges}
              className="border-zinc-600 text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Resetar
            </Button>
            {onPreview && (
              <Button
                variant="outline"
                onClick={() => onPreview(settings)}
                className="border-zinc-600 text-zinc-300 hover:bg-zinc-700"
              >
                <Play className="h-4 w-4 mr-2" />
                Preview
              </Button>
            )}
            {onSave && (
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
