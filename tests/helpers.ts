/**
 * Resolve all pending promises.
 * This method is used for async tests that use fake timers.
 * See https://stackoverflow.com/a/58716087 and https://jestjs.io/docs/timer-mocks.
 */
const flushPromises = () => {
  return new Promise(jest.requireActual('timers').setImmediate);
};

/**
 * Advances the provided fake timer by a specified duration in incremental steps.
 * Between each step, any enqueued promises are processed. Fake timers in testing libraries
 * allow simulation of time without actually waiting. However, they don't always account for
 * promises or other asynchronous operations that may get enqueued during the timer's duration.
 * By advancing time in incremental steps and flushing promises between each step,
 * this function ensures that both timers and promises are comprehensively processed.
 * @param options - The options object.
 * @param options.clock - The Sinon fake timer instance used to manipulate time in tests.
 * @param options.duration - The total amount of time (in milliseconds) to advance the timer by.
 * @param options.stepSize - The incremental step size (in milliseconds) by which the timer is advanced in each iteration. Default is 1/4 of the duration.
 */
export async function advanceTime({
  clock,
  duration,
  stepSize = duration / 4,
}: {
  clock: sinon.SinonFakeTimers;
  duration: number;
  stepSize?: number;
}): Promise<void> {
  do {
    await clock.tickAsync(stepSize);
    await flushPromises();
    duration -= stepSize;
  } while (duration > 0);
}
