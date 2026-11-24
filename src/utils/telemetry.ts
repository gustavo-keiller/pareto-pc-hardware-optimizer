/**
 * Privacy-friendly, zero-cookie client telemetry (`[LAUNCH-02]`).
 * Records anonymous UI events (errors, share exports, feedback) into a bounded in-memory buffer
 * and forwards to Plausible / Cloudflare Web Analytics if configured on window.
 */

export type TelemetryEventName =
  | 'runtime_error'
  | 'share_card_generated'
  | 'store_link_clicked'
  | 'feedback_submitted';

export interface TelemetryRecord {
  readonly event: TelemetryEventName;
  readonly timestamp: string;
  readonly props?: Record<string, string | number | boolean>;
}

const MAX_TELEMETRY_BUFFER = 50;
const telemetryBuffer: TelemetryRecord[] = [];

function getPlausibleFn():
  | ((
      event: string,
      opts?: { props?: Record<string, string | number | boolean> },
    ) => void)
  | null {
  if (typeof window === 'undefined') return null;
  const candidate: unknown = Reflect.get(window, 'plausible');
  if (typeof candidate !== 'function') return null;
  return (event, opts) => {
    Reflect.apply(candidate, window, [event, opts]);
  };
}

export function trackTelemetryEvent(
  event: TelemetryEventName,
  props?: Record<string, string | number | boolean>,
): void {
  const record: TelemetryRecord = {
    event,
    timestamp: new Date().toISOString(),
    props,
  };
  telemetryBuffer.push(record);
  if (telemetryBuffer.length > MAX_TELEMETRY_BUFFER) {
    telemetryBuffer.shift();
  }

  try {
    const plausible = getPlausibleFn();
    if (plausible) {
      plausible(event, props ? { props } : undefined);
    }
  } catch {
    // Ignore third-party analytics failures
  }
}

export function getRecentTelemetryEvents(): readonly TelemetryRecord[] {
  return telemetryBuffer;
}

export function clearTelemetryEvents(): void {
  telemetryBuffer.length = 0;
}
