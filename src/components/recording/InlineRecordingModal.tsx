"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  Upload,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type RecordingState = "idle" | "recording" | "recorded" | "playing" | "uploading";

interface InlineRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionId: string;
  sectionName: string;
  targetDuration: number;
  exampleText?: string;
  onRecordingComplete: (audioBlob: Blob, duration: number) => Promise<void>;
}

export function InlineRecordingModal({
  isOpen,
  onClose,
  sectionId,
  sectionName,
  targetDuration,
  exampleText,
  onRecordingComplete,
}: InlineRecordingModalProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetRecording();
    }
  }, [isOpen]);

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  };

  const resetRecording = () => {
    cleanup();
    setState("idle");
    setRecordingDuration(0);
    setAudioBlob(null);
    setAudioUrl(null);
    setError(null);
    setPlaybackProgress(0);
    audioChunksRef.current = [];
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startRecording = async () => {
    try {
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4",
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType,
        });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState("recorded");

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
      };

      mediaRecorder.onerror = (event: any) => {
        console.error("MediaRecorder error:", event.error);
        setError("Erro durante a gravacao: " + event.error?.message);
        setState("idle");
      };

      mediaRecorder.start(1000);
      setState("recording");

      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Error starting recording:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("Permissao do microfone negada. Por favor, permita o acesso ao microfone.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setError("Nenhum microfone encontrado. Conecte um microfone e tente novamente.");
      } else {
        setError("Erro ao iniciar gravacao: " + err.message);
      }
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const playRecording = () => {
    if (!audioUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);

      audioRef.current.onended = () => {
        setState("recorded");
        setPlaybackProgress(0);
      };

      audioRef.current.ontimeupdate = () => {
        if (audioRef.current) {
          const progress =
            (audioRef.current.currentTime / audioRef.current.duration) * 100;
          setPlaybackProgress(progress);
        }
      };
    }

    audioRef.current.play();
    setState("playing");
  };

  const pausePlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState("recorded");
    }
  };

  const handleUpload = async () => {
    if (!audioBlob) return;

    setState("uploading");
    try {
      await onRecordingComplete(audioBlob, recordingDuration);
      toast.success("Gravacao enviada com sucesso!");
      onClose();
    } catch (err: any) {
      console.error("Error uploading recording:", err);
      setError("Erro ao enviar gravacao: " + err.message);
      setState("recorded");
    }
  };

  const durationProgress = Math.min(100, (recordingDuration / targetDuration) * 100);
  const isOverTarget = recordingDuration > targetDuration;
  const isNearTarget =
    recordingDuration >= targetDuration * 0.8 && recordingDuration <= targetDuration;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-zinc-900 border-zinc-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Mic className="h-5 w-5 text-red-400" />
            Gravar: {sectionName}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Grave o conteudo para esta secao. Duracao sugerida:{" "}
            <strong className="text-emerald-400">{formatTime(targetDuration)}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Example text */}
          {exampleText && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-400 mb-2">
                Exemplo do que dizer:
              </h4>
              <p className="text-sm text-zinc-300 italic">&ldquo;{exampleText}&rdquo;</p>
            </div>
          )}

          {/* Recording visualization */}
          <div className="flex flex-col items-center justify-center py-8">
            <div
              className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center transition-all",
                state === "recording" && "bg-red-500 animate-pulse",
                state === "recorded" && "bg-emerald-500",
                state === "playing" && "bg-blue-500",
                state === "uploading" && "bg-purple-500",
                state === "idle" && "bg-zinc-700"
              )}
            >
              {state === "recording" && <Mic className="h-10 w-10 text-white" />}
              {state === "recorded" && <CheckCircle2 className="h-10 w-10 text-white" />}
              {state === "playing" && <Play className="h-10 w-10 text-white" />}
              {state === "uploading" && (
                <Loader2 className="h-10 w-10 text-white animate-spin" />
              )}
              {state === "idle" && <MicOff className="h-10 w-10 text-zinc-500" />}
            </div>

            {/* Timer */}
            <div className="mt-4 text-center">
              <div
                className={cn(
                  "text-3xl font-mono font-bold",
                  state === "recording" && "text-red-400",
                  isOverTarget && state === "recording" && "text-orange-400",
                  state === "recorded" && "text-emerald-400",
                  state === "playing" && "text-blue-400",
                  state === "idle" && "text-zinc-400"
                )}
              >
                {formatTime(recordingDuration)}
              </div>
              <div className="text-sm text-zinc-500 mt-1">
                Alvo: {formatTime(targetDuration)}
              </div>
            </div>
          </div>

          {/* Duration progress */}
          {(state === "recording" || state === "recorded") && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Progresso para duracao alvo</span>
                <span>{Math.round(durationProgress)}%</span>
              </div>
              <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    isOverTarget && "bg-orange-500",
                    isNearTarget && "bg-emerald-500",
                    !isOverTarget && !isNearTarget && "bg-blue-500"
                  )}
                  style={{ width: `${Math.min(durationProgress, 100)}%` }}
                />
              </div>
              {isNearTarget && (
                <p className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Duracao ideal atingida!
                </p>
              )}
              {isOverTarget && (
                <p className="text-xs text-orange-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Duracao acima do sugerido
                </p>
              )}
            </div>
          )}

          {/* Playback progress */}
          {state === "playing" && (
            <div className="h-1 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${playbackProgress}%` }}
              />
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {state === "idle" && (
            <>
              <Button variant="outline" onClick={onClose} className="border-zinc-600 text-zinc-300">
                Cancelar
              </Button>
              <Button onClick={startRecording} className="bg-red-500 hover:bg-red-600 text-white">
                <Mic className="h-4 w-4 mr-2" />
                Iniciar Gravacao
              </Button>
            </>
          )}

          {state === "recording" && (
            <Button onClick={stopRecording} className="bg-red-500 hover:bg-red-600 text-white">
              <Square className="h-4 w-4 mr-2" />
              Parar Gravacao
            </Button>
          )}

          {state === "recorded" && (
            <>
              <Button variant="outline" onClick={resetRecording} className="border-zinc-600 text-zinc-300">
                <RefreshCw className="h-4 w-4 mr-2" />
                Regravar
              </Button>
              <Button variant="outline" onClick={playRecording} className="border-zinc-600 text-zinc-300">
                <Play className="h-4 w-4 mr-2" />
                Ouvir
              </Button>
              <Button onClick={handleUpload} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                <Upload className="h-4 w-4 mr-2" />
                Usar Gravacao
              </Button>
            </>
          )}

          {state === "playing" && (
            <>
              <Button variant="outline" onClick={resetRecording} className="border-zinc-600 text-zinc-300">
                <RefreshCw className="h-4 w-4 mr-2" />
                Regravar
              </Button>
              <Button variant="outline" onClick={pausePlayback} className="border-zinc-600 text-zinc-300">
                <Pause className="h-4 w-4 mr-2" />
                Pausar
              </Button>
              <Button onClick={handleUpload} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                <Upload className="h-4 w-4 mr-2" />
                Usar Gravacao
              </Button>
            </>
          )}

          {state === "uploading" && (
            <Button disabled className="bg-zinc-700 text-zinc-400">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando...
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
