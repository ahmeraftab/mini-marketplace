"use client";

/** Last-resort boundary: renders when the root layout itself fails. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-GB">
      <body style={{ margin: 0, background: "#f7f3ec", color: "#1b1a17", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "96px 24px" }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 500, fontSize: 40, margin: 0 }}>
            Something went wrong.
          </h1>
          <p style={{ color: "#5e5a52", fontSize: 18, lineHeight: 1.5 }}>Please reload the page.</p>
          <button
            onClick={reset}
            style={{
              minHeight: 48,
              padding: "0 24px",
              background: "#1b1a17",
              color: "#f7f3ec",
              border: 0,
              borderRadius: 6,
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
