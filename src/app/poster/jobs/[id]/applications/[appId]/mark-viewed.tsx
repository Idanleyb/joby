"use client";

import { useEffect } from "react";
import { markViewed } from "../../../actions";

/** Records that the poster opened this application (stops the 30-day credit-back timer). */
export function MarkViewed({ jobId, appId }: { jobId: string; appId: string }) {
  useEffect(() => {
    void markViewed(jobId, appId);
  }, [jobId, appId]);
  return null;
}
