"use client";

import { ActionButton } from "@/components/action-button";
import { withdrawApplication } from "@/app/jobs/actions";

export function Withdraw({ appId }: { appId: string }) {
  return (
    <ActionButton variant="ghost" action={withdrawApplication.bind(null, appId)} label="ביטול המועמדות"
      confirm="לבטל את המועמדות? הקרדיטים לא יוחזרו." confirmLabel="ביטול מועמדות" />
  );
}
