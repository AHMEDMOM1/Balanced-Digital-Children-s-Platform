/**
 * E2E Test: PIN Gate Bypass Attempt
 *
 * Prerequisites:
 *   - Detox installed and configured for iOS/Android
 *   - Run: npx detox test --configuration ios.sim.release
 *   - Physical/simulator device connected
 *
 * Marked xdescribe (pending) until Detox infrastructure is provisioned.
 */

xdescribe('PIN Gate Bypass Attempt', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('locks out after too many wrong PIN attempts', async () => {
    // 1. Navigate to PIN entry screen
    // 2. Enter wrong PIN 3 times
    // 3. Verify lockout message or cooldown indicator
    // 4. Enter correct PIN
    // 5. Verify access is granted
  });
});
