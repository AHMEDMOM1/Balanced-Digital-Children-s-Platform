import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Types ─────────────────────────────────────────────────────────────────────

type ContentType = 'video' | 'story' | 'creative' | 'game';

type GeneratedContentItem = {
  title: string;
  type: ContentType;
  category: string;
  min_age: number;
  max_age: number;
  thumbnail_url: string;
  url?: string;
  duration_seconds?: number;
  content_text?: string;
  assets_url?: string;
  game_type?: 'counting' | 'matching' | 'quiz' | 'sorting';
  config_json?: Record<string, unknown>;
  status: 'published';
};

// ── Free models to try in order (fallback chain) ──────────────────────────────

const FREE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "meta-llama/llama-3.2-3b-instruct:free",
];

// ── Env loading ───────────────────────────────────────────────────────────────

function loadEnv(): void {
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const raw = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !(key in process.env)) process.env[key] = raw;
  }
}

// ── Helper: sleep ─────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── AI Generation Helpers ─────────────────────────────────────────────────────

function buildPrompt(type: ContentType, count: number, topic: string): string {
  let prompt = `You are an expert children's content creator and data engineer. 
Your task is to generate a JSON array of exactly ${count} items. 
${topic ? `IMPORTANT: The theme/topic for all generated items MUST be about: "${topic}".` : ''}
The items must conform to the following JSON schema:
[
  {
    "title": "string (bilingual Arabic and English if appropriate, max 5 words)",
    "type": "${type}",
    "category": "string (one of: math, animals, nature, science, social)",
    "min_age": "number (either 2, 5, or 8)",
    "max_age": "number (either 4, 7, or 10. Must match pairs: 2-4, 5-7, 8-10)",
    "thumbnail_url": "string (a realistic placeholder URL, e.g. https://picsum.photos/seed/random/400/300)",
    "status": "published"
`;

  if (type === 'story') {
    prompt += `    ,"content_text": "string (A beautiful short story of 3 paragraphs in Arabic. Include emojis.)"
  }
]`;
  } else if (type === 'game') {
    prompt += `    ,"game_type": "string (one of: counting, matching, quiz, sorting)",
    "config_json": "object (if counting: { type: 'counting', question: string, image_url: string, correct_answer: number, choices: number[] }. if matching: { type: 'matching', pairs: [{ item: string, image: string }] }. if quiz: { type: 'quiz', questions: [{ question: string, choices: string[], correct_index: number }] }. if sorting: { type: 'sorting', instruction: string, items: number[], correct_order: number[] } )"
  }
]`;
  } else if (type === 'creative') {
    prompt += `    ,"assets_url": "string (placeholder image URL for drawing/coloring, e.g. https://picsum.photos/seed/draw/800/600)",
    "content_text": "string (A creative prompt or instructions in Arabic. e.g. 'ارسم قطة باستخدام الدوائر فقط')"
  }
]`;
  } else if (type === 'video') {
    prompt += `    ,"url": "string (A real, safe YouTube educational video URL)",
    "duration_seconds": "number (integer between 60 and 600)"
  }
]`;
  }

  prompt += `\n\nEnsure the output is ONLY a valid JSON array, with no markdown formatting like \`\`\`json. Return only the raw JSON array and nothing else.`;
  return prompt;
}

async function callOpenRouter(
  apiKey: string,
  modelId: string,
  prompt: string
): Promise<string> {
  console.log(`  📡 Trying model: ${modelId}...`);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: "user", content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`[${response.status}] ${errText}`);
  }

  const result: any = await response.json();
  return result.choices[0].message.content;
}

async function generateAIContent(
  apiKey: string,
  type: ContentType,
  count: number,
  topic: string = ""
): Promise<GeneratedContentItem[]> {
  const prompt = buildPrompt(type, count, topic);

  console.log(`\n🤖 Generating ${count} ${type}(s)${topic ? ` about "${topic}"` : ''}...`);

  let lastError: Error | null = null;

  // Try each free model in order
  for (const modelId of FREE_MODELS) {
    try {
      const raw = await callOpenRouter(apiKey, modelId, prompt);
      const cleaned = raw.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');

      // Try to parse; if truncated, attempt to fix
      let data: GeneratedContentItem[];
      try {
        data = JSON.parse(cleaned);
      } catch {
        // Try to fix truncated JSON by closing open structures
        const fixed = cleaned.replace(/,\s*$/, '') + ']';
        try {
          data = JSON.parse(fixed);
          console.log(`  ⚠️  JSON was truncated, recovered ${data.length} item(s).`);
        } catch {
          console.error(`  ❌ Model ${modelId} returned unparseable JSON, trying next...`);
          continue;
        }
      }

      console.log(`  ✅ Success with ${modelId} — got ${data.length} item(s).`);
      return data;

    } catch (err: any) {
      lastError = err;
      const msg = err.message || '';
      if (msg.includes('429')) {
        console.log(`  ⏳ Rate limited on ${modelId}, trying next model...`);
      } else if (msg.includes('404')) {
        console.log(`  ⚠️  Model ${modelId} not available, trying next...`);
      } else {
        console.log(`  ❌ Error with ${modelId}: ${msg.slice(0, 120)}`);
      }
      await sleep(1000); // small pause between retries
    }
  }

  throw new Error(`All models failed. Last error: ${lastError?.message}`);
}

// ── Supabase Insertion ────────────────────────────────────────────────────────

async function insertContent(client: SupabaseClient, items: GeneratedContentItem[]) {
  console.log(`\n💾 Inserting ${items.length} items into Supabase...`);
  let inserted = 0;

  for (const item of items) {
    const { data: existing } = await client
      .from('content_items')
      .select('id')
      .eq('title', item.title)
      .eq('type', item.type)
      .single();

    if (existing) {
      console.log(`  [SKIP] "${item.title}" already exists.`);
      continue;
    }

    const { error } = await client.from('content_items').insert(item);
    if (error) {
      console.error(`  [ERROR] Failed to insert "${item.title}":`, error.message);
    } else {
      console.log(`  [OK] Inserted "${item.title}"`);
      inserted++;
    }
  }

  console.log(`✅ Successfully inserted ${inserted} items.`);
}

// ── Main Execution ────────────────────────────────────────────────────────────

async function main() {
  loadEnv();

  const sbUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;

  if (!sbUrl || !sbKey) {
    console.error('❌ Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  if (!apiKey) {
    console.error('❌ Missing OPENROUTER_API_KEY (or GEMINI_API_KEY) in .env.');
    process.exit(1);
  }

  const supabase = createClient(sbUrl, sbKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Determine what to generate from CLI args (default to 2 stories)
  const args = process.argv.slice(2);
  const typeArg = args[0] as ContentType || 'story';
  const countArg = parseInt(args[1] || '2', 10);
  const topicArg = args.slice(2).join(' ').trim(); // Join remaining args as topic

  const validTypes = ['story', 'game', 'video', 'creative'];
  if (!validTypes.includes(typeArg)) {
    console.error(`❌ Invalid type "${typeArg}". Must be one of: ${validTypes.join(', ')}`);
    process.exit(1);
  }

  try {
    const items = await generateAIContent(apiKey, typeArg, countArg, topicArg);
    await insertContent(supabase, items);
  } catch (err) {
    console.error("❌ Process failed:", err);
  }
}

main();
