// @ts-nocheck
/**
 * E2E Test: Parent Onboarding Flow
 *
 * Prerequisites:
 *   - Detox installed and configured for iOS/Android
 *   - Run: npx detox test --configuration ios.sim.release
 *   - Physical/simulator device connected
 *
 * Marked xdescribe (pending) until Detox infrastructure is provisioned.
 */

xdescribe('Parent Onboarding', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('completes parent registration and PIN setup', async () => {
    // 1. Tap "Register" on welcome screen
    // 2. Fill in email, password, name
    // 3. Submit registration
    // 4. Verify redirected to PIN setup
    // 5. Enter and confirm 4-digit PIN
    // 6. Verify redirected to parent dashboard
  });
});
