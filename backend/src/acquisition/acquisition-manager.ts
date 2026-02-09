// Acquisition flow orchestration: subscribe -> trigger -> await -> parse -> display
// Implements the full acquisition flow from Phase 5 research Pattern 4

import { once } from 'node:events';
import { CommandClient } from '../gateway/command-client.js';
import { NotificationHandler } from '../gateway/notification-handler.js';
import { SensorMetadata } from '../types/messages.js';
import { parseWaveform } from './waveform-parser.js';
import { displayReadingResults } from '../output/waveform-display.js';
import { logger } from '../utils/logger.js';

/**
 * AcquisitionManager orchestrates the full reading flow:
 * 1. Subscribe to notifications (POST_SUB_CHANGES)
 * 2. Register notification listeners BEFORE triggering
 * 3. Trigger reading (TAKE_DYN_READING)
 * 4. Await NOT_DYN_READING_STARTED and check Success field
 * 5. Await NOT_DYN_READING with acquisition timeout
 * 6. Parse waveform data (X/Y/Z strings)
 * 7. Optionally await temperature (non-blocking)
 * 8. Display results
 * 9. Unsubscribe on cleanup (POST_UNSUB_CHANGES)
 */
export class AcquisitionManager {
  private isSubscribed = false;

  constructor(
    private commandClient: CommandClient,
    private notificationHandler: NotificationHandler,
    private acquisitionTimeoutMs: number = 60000
  ) {}

  /**
   * Subscribe to gateway notifications (SUB-01)
   *
   * Sends POST_SUB_CHANGES command. Gateway will send NOT_ messages only to subscribed connections.
   * Safe to call multiple times (idempotent).
   */
  async subscribe(): Promise<void> {
    if (this.isSubscribed) {
      logger.debug('Already subscribed, skipping POST_SUB_CHANGES');
      return;
    }

    await this.commandClient.sendCommand({
      Type: 'POST_SUB_CHANGES',
      From: 'UI',
      To: 'SERV',
      Data: {},
    });

    this.isSubscribed = true;
    logger.info('Subscribed to gateway notifications');
  }

  /**
   * Acquire vibration reading from sensor
   *
   * Implements ACQ-01 through ACQ-08 and OUT-01 through OUT-06.
   *
   * Critical timing: Registers notification listeners BEFORE sending TAKE_DYN_READING
   * to prevent race condition (Pitfall 1 from research).
   *
   * @param sensor - Sensor metadata from discovery
   * @throws Error if not subscribed, if reading fails to start (Success=false), or if timeout
   */
  async acquireReading(sensor: SensorMetadata): Promise<void> {
    // Guard: must be subscribed before triggering reading
    if (!this.isSubscribed) {
      throw new Error('Must subscribe before acquiring reading');
    }

    // CRITICAL: Register notification listeners BEFORE triggering command
    // This prevents race condition where notification arrives before listener attached
    const startedPromise = once(this.notificationHandler, 'NOT_DYN_READING_STARTED');
    const readingPromise = once(this.notificationHandler, 'NOT_DYN_READING');
    const tempPromise = once(this.notificationHandler, 'NOT_DYN_TEMP');

    // Send TAKE_DYN_READING command (ACQ-01)
    await this.commandClient.sendCommand({
      Type: 'TAKE_DYN_READING',
      From: 'UI',
      To: 'SERV',
      Data: { Serial: sensor.Serial },
    });
    logger.info(`Triggered reading for sensor Serial=${sensor.Serial}`);

    // Helper: Create timeout promise
    const timeoutPromise = (ms: number, msg: string): Promise<never> =>
      new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms));

    // Wait for NOT_DYN_READING_STARTED with 30s timeout (ACQ-02, ACQ-03)
    const [startedData] = (await Promise.race([
      startedPromise,
      timeoutPromise(30000, 'Timeout waiting for NOT_DYN_READING_STARTED (30s)'),
    ])) as [{ Serial: number; Success: boolean }];

    if (!startedData.Success) {
      throw new Error(`Reading failed to start for sensor Serial=${startedData.Serial}`);
    }
    logger.info('Reading started successfully');

    // Wait for NOT_DYN_READING with acquisition timeout (ACQ-04, ACQ-05)
    const [readingData] = (await Promise.race([
      readingPromise,
      timeoutPromise(
        this.acquisitionTimeoutMs,
        `Timeout waiting for NOT_DYN_READING (${this.acquisitionTimeoutMs}ms)`
      ),
    ])) as [{ ID: number; Serial: string; Time: string; X: string; Y: string; Z: string }];

    logger.info(
      `Reading received: ID=${readingData.ID}, Serial=${readingData.Serial}, Time=${readingData.Time}`
    );

    // Parse waveform data (ACQ-06)
    const waveforms = parseWaveform(readingData.X, readingData.Y, readingData.Z, sensor.Samples);

    // Handle temperature notification (ACQ-07) - non-blocking with 10s timeout
    let temperature: number | undefined;
    try {
      const [tempData] = (await Promise.race([
        tempPromise,
        timeoutPromise(10000, 'Temperature notification timeout'),
      ])) as [{ Serial: string; Temp: number }];
      temperature = tempData.Temp;
      logger.info(`Temperature received: ${temperature}C`);
    } catch {
      logger.debug('Temperature notification not received (optional, continuing)');
    }

    // Display results (OUT-01 through OUT-06)
    displayReadingResults(
      sensor,
      { ID: readingData.ID, Serial: readingData.Serial, Time: readingData.Time },
      waveforms,
      temperature
    );
  }

  /**
   * Unsubscribe from gateway notifications (SUB-04)
   *
   * Sends POST_UNSUB_CHANGES command. Safe to call multiple times.
   * Should be called during application shutdown.
   *
   * Does not throw on error (shutdown path should not fail).
   */
  async unsubscribe(): Promise<void> {
    if (!this.isSubscribed) {
      logger.debug('Not subscribed, skipping POST_UNSUB_CHANGES');
      return;
    }

    try {
      await this.commandClient.sendCommand({
        Type: 'POST_UNSUB_CHANGES',
        From: 'UI',
        To: 'SERV',
        Data: {},
      });

      this.isSubscribed = false;
      logger.info('Unsubscribed from gateway notifications');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to unsubscribe: ${errorMsg}`);
      // Don't throw - shutdown path should not fail
    }
  }
}
