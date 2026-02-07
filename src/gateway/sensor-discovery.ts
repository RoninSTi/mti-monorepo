import type { CommandClient } from './command-client';
import type { SensorMetadata } from '../types/messages';
import { SensorMetadataSchema } from '../types/messages';
import { logger } from '../utils/logger';

/**
 * Discover connected sensors and select one for acquisition.
 *
 * Sends GET_DYN_CONNECTED to query all known sensors from gateway.
 * Response Data is a dictionary: { [serialString]: SensorMetadata, ... }
 * Each entry is validated individually with safeParse (invalid entries logged, not fatal).
 * Filters for Connected === 1, then selects preferred or first.
 *
 * @param commandClient - Authenticated command client
 * @param preferredSerial - Optional sensor serial number to prefer (from config)
 * @returns Selected connected sensor metadata
 * @throws Error if no sensors are connected (caller should handle gracefully)
 */
export async function discoverSensor(
  commandClient: CommandClient,
  preferredSerial?: number
): Promise<SensorMetadata> {
  logger.info('Discovering connected sensors...');

  const responseData = await commandClient.sendCommand({
    Type: 'GET_DYN_CONNECTED',
    From: 'UI',
    To: 'SERV',
    Data: {},
  });

  // responseData is Record<string, unknown> from RTN_DYN.Data
  // Each key is a sensor serial (as string), value is sensor metadata object
  const allSensors: SensorMetadata[] = [];

  if (responseData && typeof responseData === 'object') {
    for (const [serialKey, metadata] of Object.entries(responseData)) {
      const parsed = SensorMetadataSchema.safeParse(metadata);
      if (parsed.success) {
        allSensors.push(parsed.data);
        logger.debug(`Sensor ${serialKey}: Connected=${parsed.data.Connected}, PartNum=${parsed.data.PartNum}`);
      } else {
        logger.warn(`Invalid sensor metadata for serial ${serialKey}: ${parsed.error.message}`);
      }
    }
  }

  // Filter for connected sensors only (DISC-04: Connected === 1)
  const connectedSensors = allSensors.filter(s => s.Connected === 1);

  logger.info(`Found ${connectedSensors.length} connected sensor(s) out of ${allSensors.length} total`);

  // DISC-05: Handle no sensors connected
  if (connectedSensors.length === 0) {
    throw new Error('No sensors currently connected to gateway');
  }

  // DISC-04: Select preferred sensor from config, or first connected
  let selected: SensorMetadata;

  if (preferredSerial !== undefined) {
    const preferred = connectedSensors.find(s => s.Serial === preferredSerial);
    if (preferred) {
      selected = preferred;
      logger.info(`Selected preferred sensor: Serial=${selected.Serial}`);
    } else {
      selected = connectedSensors[0];
      logger.warn(
        `Preferred sensor ${preferredSerial} not found or not connected, using first available: Serial=${selected.Serial}`
      );
    }
  } else {
    selected = connectedSensors[0];
    logger.info(`Selected first connected sensor: Serial=${selected.Serial}`);
  }

  // Log selected sensor details (DISC-03 fields)
  logger.info(`Sensor: Serial=${selected.Serial}, PartNum=${selected.PartNum}, ReadRate=${selected.ReadRate}Hz, Samples=${selected.Samples}`);

  return selected;
}
