"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  Upload,
  Settings,
  Volume2,
  RefreshCw,
  Check,
  X,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface RecordingStudioProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
  onClose?: () => void;
  className?: string;
}

type RecordingState = "idle" | "recording" | "paused" | "stopped";

export function RecordingStudio({
  onRecordingComplete,
  onClose,
  className,
}: RecordingStudioProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // Load available devices
  useEffect(() => {
    async function loadDevices() {
      try {
        // Request permission first
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        const audioDevices = deviceList.filter((d) => d.kind === "audioinput");
        setDevices(audioDevices);
        if (audioDevices.length > 0) {
          setSelectedDevice(audioDevices[0].deviceId);
        }
      } catch (error) {
        console.error("Error loading devices:", error);
        toast.error("Erro ao acessar microfone");
      }
    }

    loadDevices();

    return () => {
      stopRecording();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Draw waveform
  const drawWaveform = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (state !== "recording") return;

      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = "#18181b";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = "#10b981";
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      // Calculate audio level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / bufferLength);
      setAudioLevel(Math.min(1, rms * 3));
    };

    draw();
  }, [state]);

  const startRecording = async () => {
    try {
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Set up audio analysis
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      source.connect(analyserRef.current);

      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4",
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType,
        });
        setRecordedBlob(blob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);

      setState("recording");
      drawWaveform();
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Erro ao iniciar gravacao");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && state === "recording") {
      mediaRecorderRef.current.pause();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setState("paused");
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && state === "paused") {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
      setState("recording");
      drawWaveform();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    setState("stopped");
  };

  const resetRecording = () => {
    setDuration(0);
    setRecordedBlob(null);
    setState("idle");
    setAudioLevel(0);
  };

  const confirmRecording = () => {
    if (recordedBlob) {
      onRecordingComplete(recordedBlob, duration);
      toast.success("Gravacao salva!");
    }
  };

  const playPreview = () => {
    if (!recordedBlob) return;

    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.onended = () => setIsPreviewPlaying(false);
    }

    if (isPreviewPlaying) {
      audioRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      audioRef.current.src = URL.createObjectURL(recordedBlob);
      audioRef.current.play();
      setIsPreviewPlaying(true);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={cn("flex flex-col bg-zinc-900 rounded-2xl overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-3 h-3 rounded-full",
              state === "recording"
                ? "bg-red-500 animate-pulse"
                : state === "paused"
                ? "bg-amber-500"
                : "bg-zinc-600"
            )}
          />
          <h3 className="font-semibold text-white">Gravacao</h3>
        </div>
        {onClose && (
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Device Selector */}
      {state === "idle" && devices.length > 1 && (
        <div className="px-4 py-3 border-b border-zinc-800">
          <label className="text-xs text-zinc-500 mb-1 block">Microfone</label>
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Microfone ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Waveform / Preview */}
      <div className="relative h-32 bg-zinc-950">
        {(state === "recording" || state === "paused") && (
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            width={800}
            height={128}
          />
        )}

        {state === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Mic className="h-12 w-12 text-zinc-700" />
          </div>
        )}

        {state === "stopped" && recordedBlob && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              size="lg"
              variant="ghost"
              onClick={playPreview}
              className="text-white"
            >
              {isPreviewPlaying ? (
                <Pause className="h-8 w-8" />
              ) : (
                <Play className="h-8 w-8" />
              )}
            </Button>
          </div>
        )}

        {/* Level Meter */}
        {state === "recording" && (
          <div className="absolute bottom-2 left-2 right-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-emerald-500"
              animate={{ width: `${audioLevel * 100}%` }}
              transition={{ duration: 0.05 }}
            />
          </div>
        )}
      </div>

      {/* Timer */}
      <div className="py-4 text-center">
        <span
          className={cn(
            "font-mono text-3xl",
            state === "recording" ? "text-red-400" : "text-white"
          )}
        >
          {formatDuration(duration)}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 p-4 border-t border-zinc-800">
        {state === "idle" && (
          <Button
            size="lg"
            onClick={startRecording}
            className="bg-red-500 hover:bg-red-400 rounded-full w-16 h-16"
          >
            <Mic className="h-6 w-6" />
          </Button>
        )}

        {state === "recording" && (
          <>
            <Button
              size="lg"
              variant="outline"
              onClick={pauseRecording}
              className="rounded-full w-14 h-14 border-zinc-700"
            >
              <Pause className="h-5 w-5" />
            </Button>
            <Button
              size="lg"
              onClick={stopRecording}
              className="bg-red-500 hover:bg-red-400 rounded-full w-16 h-16"
            >
              <Square className="h-6 w-6" />
            </Button>
          </>
        )}

        {state === "paused" && (
          <>
            <Button
              size="lg"
              variant="outline"
              onClick={resumeRecording}
              className="rounded-full w-14 h-14 border-zinc-700"
            >
              <Mic className="h-5 w-5" />
            </Button>
            <Button
              size="lg"
              onClick={stopRecording}
              className="bg-red-500 hover:bg-red-400 rounded-full w-16 h-16"
            >
              <Square className="h-6 w-6" />
            </Button>
          </>
        )}

        {state === "stopped" && recordedBlob && (
          <>
            <Button
              size="lg"
              variant="outline"
              onClick={resetRecording}
              className="rounded-full w-14 h-14 border-zinc-700"
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
            <Button
              size="lg"
              onClick={confirmRecording}
              className="bg-emerald-500 hover:bg-emerald-400 rounded-full w-16 h-16"
            >
              <Check className="h-6 w-6" />
            </Button>
          </>
        )}
      </div>

      {/* Tips */}
      {state === "idle" && (
        <div className="px-4 pb-4">
          <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
            <p className="text-xs text-zinc-500">
              Clique no botao para comecar a gravar
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              A gravacao sera processada automaticamente
            </p>
          </div>
        </div>
      )}

      {state === "stopped" && recordedBlob && (
        <div className="px-4 pb-4">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center">
            <p className="text-xs text-emerald-400">
              Gravacao de {formatDuration(duration)} pronta!
            </p>
            <p className="text-xs text-emerald-500/70 mt-1">
              Clique no check para confirmar ou X para descartar
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
