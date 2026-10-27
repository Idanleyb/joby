"use client";

import { startTransition, type FormEvent } from "react";

/**
 * Submits a form to a useActionState action WITHOUT React's automatic form reset.
 * (With <form action={fn}>, React clears the fields after the action, which can wipe
 * what the user typed right after a validation error.)
 */
export function submitWith(action: (fd: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };
}
