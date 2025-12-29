"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

type FormStatus = "idle" | "loading" | "success" | "error";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes("@")) {
      setStatus("error");
      setErrorMessage("Por favor, insira um email valido.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao cadastrar email.");
      }

      setStatus("success");
      setEmail("");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Erro ao cadastrar email."
      );
    }
  };

  if (status === "success") {
    return (
      <div
        className="flex items-center justify-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg"
        data-testid="success-message"
      >
        <CheckCircle className="w-5 h-5 text-green-500" />
        <p className="text-green-700 dark:text-green-400 font-medium">
          Voce esta na lista! Vamos te avisar quando lancarmos.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "loading"}
          className="flex-1 h-12 text-base"
          data-testid="email-input"
        />
        <Button
          type="submit"
          disabled={status === "loading"}
          className="h-12 px-8 text-base font-medium"
          data-testid="submit-button"
        >
          {status === "loading" ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Entrando...
            </>
          ) : (
            "Entrar na lista"
          )}
        </Button>
      </div>

      {status === "error" && (
        <div
          className="flex items-center gap-2 text-sm text-red-500"
          data-testid="error-message"
        >
          <AlertCircle className="w-4 h-4" />
          <span>{errorMessage}</span>
        </div>
      )}
    </form>
  );
}
