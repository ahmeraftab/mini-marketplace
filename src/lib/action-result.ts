/**
 * Server actions never throw to the client. They return one of these, so the
 * UI can always show a calm message next to the field or button concerned.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | {
      ok: false;
      code: string;
      message: string;
      fieldErrors?: Record<string, string>;
    };

export function fail(code: string, message: string, fieldErrors?: Record<string, string>) {
  return { ok: false, code, message, fieldErrors } as const;
}

export function succeed<T>(data: T, message?: string): ActionResult<T> {
  return { ok: true, data, message };
}

/**
 * Database functions raise errors as "CODE: human message". Split them so the
 * UI shows the message and the code can drive behaviour.
 */
export function parseDbError(error: { message?: string; code?: string } | null | undefined): {
  code: string;
  message: string;
} {
  const raw = error?.message ?? "Something went wrong.";
  const match = /^(VALIDATION|FORBIDDEN|NOT_FOUND|NOT_SIGNED_IN|ITEM_UNAVAILABLE):\s*(.+)$/s.exec(raw);
  if (match) return { code: match[1], message: match[2] };
  if (error?.code === "42501" || /permission denied|row-level security/i.test(raw)) {
    return { code: "FORBIDDEN", message: "You do not have permission to do that." };
  }
  if (error?.code === "23505") {
    return { code: "CONFLICT", message: "That already exists. Try a different name." };
  }
  return { code: "UNKNOWN", message: "Something went wrong on our side. Please try again." };
}

export function zodFieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
