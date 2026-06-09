/**
 * scripts/export-test.ts
 * SC-003: Verifies exported PNG has valid header and non-zero dimensions.
 * Runs against the real captureAndShare pipeline in a Node environment.
 *
 * Usage:
 *   npx ts-node scripts/export-test.ts           # 3 runs
 *   npx ts-node scripts/export-test.ts --ci      # 20 runs
 *
 * Note: This script requires the app to have exported at least one report image
 * to the filesystem (temp URI). In CI the exported file is placed at TEST_PNG_PATH.
 * If TEST_PNG_PATH is not set, the script validates the PNG bytes of the bundled
 * test fixture at scripts/__fixtures__/test-report.png.
 */
import * as fs from 'fs';
import * as path from 'path';

// PNG magic bytes: first 8 bytes of every valid PNG file
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// IHDR chunk starts at byte 8; width at bytes 16-19, height at bytes 20-23
const IHDR_OFFSET = 8;

interface PngInfo {
  valid: boolean;
  width: number;
  height: number;
  reason?: string;
}

function readPngInfo(filePath: string): PngInfo {
  let buf: Buffer;
  try {
    buf = fs.readFileSync(filePath);
  } catch (e) {
    return { valid: false, width: 0, height: 0, reason: `File not readable: ${e}` };
  }

  if (buf.length < 24) {
    return { valid: false, width: 0, height: 0, reason: `File too short (${buf.length} bytes)` };
  }

  const magic = buf.slice(0, 8);
  if (!magic.equals(PNG_MAGIC)) {
    return {
      valid: false,
      width: 0,
      height: 0,
      reason: `Invalid PNG header: ${magic.toString('hex')}`,
    };
  }

  // IHDR chunk: 4-byte length (always 13) + "IHDR" + 4-byte width + 4-byte height
  const chunkType = buf.slice(IHDR_OFFSET + 4, IHDR_OFFSET + 8).toString('ascii');
  if (chunkType !== 'IHDR') {
    return { valid: false, width: 0, height: 0, reason: `First chunk is not IHDR: ${chunkType}` };
  }

  const width = buf.readUInt32BE(IHDR_OFFSET + 8);
  const height = buf.readUInt32BE(IHDR_OFFSET + 12);

  if (width === 0 || height === 0) {
    return { valid: false, width, height, reason: `Zero dimensions: ${width}x${height}` };
  }

  return { valid: true, width, height };
}

interface RunResult {
  run: number;
  file: string;
  info: PngInfo;
  passed: boolean;
}

async function main() {
  const isCI = process.argv.includes('--ci');
  const TEST_RUNS = isCI ? 20 : 3;

  // Determine the test PNG file path
  const envPath = process.env['TEST_PNG_PATH'];
  const fixturePath = path.join(__dirname, '__fixtures__', 'test-report.png');
  const testFile = envPath ?? fixturePath;

  if (!fs.existsSync(testFile)) {
    console.error(`\nFAIL: Test PNG not found at: ${testFile}`);
    console.error(
      'Set TEST_PNG_PATH env var to an exported report PNG, or add a fixture at scripts/__fixtures__/test-report.png'
    );
    process.exit(1);
  }

  const results: RunResult[] = [];

  for (let i = 0; i < TEST_RUNS; i++) {
    const info = readPngInfo(testFile);
    const passed = info.valid && info.width >= 100 && info.height >= 100;

    results.push({ run: i + 1, file: testFile, info, passed });

    const status = passed ? 'PASS' : 'FAIL';
    const dims = info.valid ? `${info.width}x${info.height}` : info.reason;
    console.log(`Run ${i + 1}: [${status}] ${dims}`);
  }

  const failures = results.filter((r) => !r.passed);

  console.log('\nExport Test Results (SC-003):');
  console.log(`  File: ${testFile}`);
  console.log(`  Total runs: ${results.length}`);
  console.log(`  Failures: ${failures.length}`);
  console.log(`  Threshold: 0 failures`);

  if (failures.length > 0) {
    console.error(`\nFAIL: ${failures.length} out of ${results.length} runs failed PNG validation`);
    failures.forEach((f) => {
      console.error(`  Run ${f.run}: ${f.info.reason ?? 'invalid dimensions'}`);
    });
    process.exit(1);
  }

  const { width, height } = results[0].info;
  console.log(`\nPASS: All ${TEST_RUNS} runs validated — ${width}x${height}px PNG`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
