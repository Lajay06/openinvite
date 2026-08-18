/**
 * src/lib/setupJourney.js
 *
 * The DATA half of the setup journey. The step definitions and all the
 * completeness/ordering/plan logic live in ./journeySteps.js, which has no
 * data-client imports so it can be tested under plain Node; this module adds
 * the record counts those checks need and re-exports the pure half so every
 * existing import site keeps working unchanged.
 */
import { getMyRecords } from '@/lib/resolveMyWedding';

export { JOURNEY_STEPS, getJourneyProgress } from '@/lib/journeySteps';

/** Fetches the record counts JOURNEY_STEPS' isComplete checks need, beyond the WeddingDetails record itself. */
export async function getJourneyCounts() {
  const [guests, vendors, schedule] = await Promise.all([
    getMyRecords('Guest'),
    getMyRecords('Vendor'),
    getMyRecords('Schedule'),
  ]);
  return { guestCount: guests.length, vendorCount: vendors.length, scheduleCount: schedule.length };
}

/**
 * @returns {{ steps: object[], nextIndex: number, doneCount: number, allDone: boolean }}
 *   steps carries each JOURNEY_STEPS entry plus a computed `done` boolean.
 *   nextIndex is the first incomplete step (or the last step if all are done).
 */
