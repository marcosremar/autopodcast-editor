"use client";

import { Mic } from "lucide-react";

export function Footer() {
  return (
    <footer className="py-12 border-t">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-primary" />
            <span className="font-semibold">AeroPod</span>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            &copy; {new Date().getFullYear()} AeroPod. Todos os direitos
            reservados.
          </p>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">
              Termos
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Privacidade
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Contato
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
