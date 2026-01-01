"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Send,
  Loader2,
  X,
  Check,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface RecordingResult {
  segmentId: string;
  text: string;
  topic?: string;
  duration: number;
  audioUrl?: string;
}

interface AudioRecorderProps {
  projectId: string;
  onRecordingComplete?: (audioBlob: Blob, duration: number) => void;
  onSegmentCreated?: (segmentId: string) => void;
  onRecordingProcessed?: (result: RecordingResult) => void; // New callback with full data
  targetSection?: string; // Optional section to add the recording to
  className?: string;
}

type RecordingState = "idle" | "recording" | "recorded" | "uploading";

export function AudioRecorder({
  projectId,
  onRecordingComplete,
  onSegmentCreated,
  onRecordingProcessed,
  targetSection,
  className,
}: AudioRecorderProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [audioUrl]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startRecording = async () => {
    try {
      setError(null);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      // Create MediaRecorder with preferred format
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState("recorded");

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setState("recording");
      setDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error starting recording:", err);
      if (err instanceof Error && err.name === "NotAllowedError") {
        setError("Permissao de microfone negada. Habilite nas configuracoes do navegador.");
      } else {
        setError("Erro ao acessar o microfone. Verifique se esta conectado.");
      }
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const playPreview = () => {
    if (!audioUrl) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onended = () => setIsPlaying(false);
    audio.onpause = () => setIsPlaying(false);
    audio.onplay = () => setIsPlaying(true);

    audio.play();
  };

  const pausePreview = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const discardRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setState("idle");
    setIsPlaying(false);
  };

  const uploadRecording = async () => {
    if (!audioBlob) return;

    setState("uploading");
    setUploadProgress(0);

    try {
      // Create form data
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      formData.append("duration", duration.toString());
      if (targetSection) {
        formData.append("sectionId", targetSection);
      }

      // Upload to API
      const response = await fetch(`/api/projects/${projectId}/record`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await response.json();

      // Notify parent
      onRecordingComplete?.(audioBlob, duration);
      if (data.segmentId) {
        onSegmentCreated?.(data.segmentId);
      }

      // Call the new callback with full data
      if (onRecordingProcessed) {
        onRecordingProcessed({
          segmentId: data.segmentId,
          text: data.text || "[Transcricao pendente]",
          topic: data.topic,
          duration: data.duration || duration,
          audioUrl: data.audioUrl,
        });
        // Don't reset if using new callback - let parent handle it
      } else {
        toast.success("Audio adicionado ao projeto!", {
          description: `${formatTime(duration)} de audio transcrito e adicionado.`,
        });
        // Reset state
        discardRecording();
      }

    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Erro ao enviar audio");
      setState("recorded");
    }
  };

  return (
    <div className={cn("relative", className)}>
      <AnimatePresence mode="wait">
        {/* Idle State - Mic Button */}
        {state === "idle" && (
          <motion.button
            key="idle"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={startRecording}
            className="p-3 bg-zinc-800 hover:bg-red-500/20 hover:text-red-400 text-zinc-400 rounded-xl transition-all group"
            title="Gravar audio"
          >
            <Mic className="h-5 w-5 group-hover:scale-110 transition-transform" />
          </motion.button>
        )}

        {/* Recording State */}
        {state === "recording" && (
          <motion.div
            key="recording"
            initial={{ opacity: 0, width: 48 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 48 }}
            className="flex items-center gap-3 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-xl"
          >
            {/* Recording indicator */}
            <div className="relative">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75" />
            </div>

            {/* Timer */}
            <span className="text-red-400 font-mono text-sm min-w-[48px]">
              {formatTime(duration)}
            </span>

            {/* Waveform animation */}
            <div className="flex gap-0.5 items-center h-5">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-red-400 rounded-full"
                  animate={{
                    height: [8, 16, 8, 20, 8],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
                />
              ))}
            </div>

            {/* Stop button */}
            <button
              onClick={stopRecording}
              className="p-2 bg-red-500 hover:bg-red-400 text-white rounded-lg transition-colors"
              title="Parar gravacao"
            >
              <Square className="h-4 w-4" />
            </button>
          </motion.div>
        )}

        {/* Recorded State - Preview & Actions */}
        {state === "recorded" && (
          <motion.div
            key="recorded"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl"
          >
            {/* Play/Pause preview */}
            <button
              onClick={isPlaying ? pausePreview : playPreview}
              className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors"
              title={isPlaying ? "Pausar" : "Ouvir preview"}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </button>

            {/* Duration */}
            <span className="text-emerald-400 font-mono text-sm min-w-[48px]">
              {formatTime(duration)}
            </span>

            {/* Waveform static */}
            <div className="flex gap-0.5 items-center h-4">
              {[0.6, 0.8, 1, 0.7, 0.9, 0.5, 0.8, 1, 0.6].map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-emerald-400/50 rounded-full"
                  style={{ height: `${h * 16}px` }}
                />
              ))}
            </div>

            {/* Discard */}
            <button
              onClick={discardRecording}
              className="p-2 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 rounded-lg transition-colors"
              title="Descartar"
            >
              <Trash2 className="h-4 w-4" />
            </button>

            {/* Send */}
            <button
              onClick={uploadRecording}
              className="p-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg transition-colors"
              title="Adicionar ao projeto"
            >
              <Send className="h-4 w-4" />
            </button>
          </motion.div>
        )}

        {/* Uploading State */}
        {state === "uploading" && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-xl"
          >
            <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
            <span className="text-blue-400 text-sm">Processando audio...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute left-0 right-0 top-full mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2"
          >
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <span className="text-xs text-red-400">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto p-1 hover:bg-red-500/20 rounded"
            >
              <X className="h-3 w-3 text-red-400" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Compact inline version for chat input
export function AudioRecorderInline({
  projectId,
  onRecordingComplete,
  onSegmentCreated,
  targetSection,
}: AudioRecorderProps) {
  return (
    <AudioRecorder
      projectId={projectId}
      onRecordingComplete={onRecordingComplete}
      onSegmentCreated={onSegmentCreated}
      targetSection={targetSection}
    />
  );
}
