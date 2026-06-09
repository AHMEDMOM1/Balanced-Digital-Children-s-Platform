/**
 * E2E Test: Child Session End Flow
 *
 * Prerequisites:
 *   - Detox installed and configured for iOS/Android
 *   - Run: npx detox test --configuration ios.sim.release
 *   - Physical/simulator device connected
 *
 * Marked xdescribe (pending) until Detox infrastructure is provisioned.
 */

xdescribe('Child Session End', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('ends session when time limit is reached and shows blocked screen', async () => {
    // 1. Log in as child
    // 2. Start a session with 1-minute time limit
    // 3. Wait for timer to expire
    // 4. Verify "Time's up" overlay appears
    // 5. Verify child is redirected to blocked screen
  });
});
