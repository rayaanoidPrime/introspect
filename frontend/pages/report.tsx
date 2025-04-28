"use client";
import { useEffect, useState } from "react";
import { OraclePublicReport } from "@defogdotai/agents-ui-components/oracle";
import { useRouter } from "next/router";
import Meta from "$components/layout/Meta";
import { SpinningLoader } from "@defogdotai/agents-ui-components/core-ui";

export default function PublicReportPage() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for router to be ready
    if (!router.isReady) return;
    setLoading(false);
  }, [router.isReady]);

  if (loading || !id) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Meta/>
        <SpinningLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Meta/>
      <OraclePublicReport
        apiEndpoint={process.env.NEXT_PUBLIC_AGENTS_ENDPOINT || ""}
        publicUuid={id as string}
      />
    </div>
  );
}