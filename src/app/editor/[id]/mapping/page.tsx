"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface MappingPageProps {
  params: Promise<{ id: string }>;
}

// Redirect to unified template page
export default function MappingPage({ params }: MappingPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/editor/${resolvedParams.id}/template`);
  }, [router, resolvedParams.id]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto" />
        <p className="mt-4 text-zinc-400">Redirecionando...</p>
      </div>
    </div>
  );
}
