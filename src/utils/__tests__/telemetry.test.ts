import { afterEach, describe, expect, it } from 'vitest';
import {
  clearTelemetryEvents,
  getRecentTelemetryEvents,
  trackTelemetryEvent,
} from '../telemetry';

describe('LAUNCH-02: Privacy-Friendly Telemetry Engine', () => {
  afterEach(() => {
    clearTelemetryEvents();
  });

  it('records events with ISO timestamps and caps the in-memory buffer at 50 entries', () => {
    for (let i = 0; i < 65; i++) {
      trackTelemetryEvent('feedback_submitted', { idx: i });
    }
    const events = getRecentTelemetryEvents();
    expect(events).toHaveLength(50);
    expect(events[0].props?.idx).toBe(15);
    expect(events[49].props?.idx).toBe(64);
    expect(events[49].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    clearTelemetryEvents();
    expect(getRecentTelemetryEvents()).toHaveLength(0);
  });
});
