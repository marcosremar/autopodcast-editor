import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AutoPodcast - IA que edita seu podcast automaticamente",
  description:
    "Grave 2 horas, receba 30 minutos prontos para publicar. IA que seleciona os melhores momentos, remove enrolacao e monta a narrativa do seu podcast.",
  keywords: [
    "podcast",
    "edicao de podcast",
    "ia",
    "inteligencia artificial",
    "editor de audio",
    "autopodcast",
  ],
  authors: [{ name: "AutoPodcast" }],
  openGraph: {
    title: "AutoPodcast - IA que edita seu podcast automaticamente",
    description:
      "Grave 2 horas, receba 30 minutos prontos para publicar. IA que seleciona os melhores momentos e monta a narrativa.",
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "AutoPodcast - IA que edita seu podcast automaticamente",
    description:
      "Grave 2 horas, receba 30 minutos prontos para publicar. IA que seleciona os melhores momentos e monta a narrativa.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
