import type { ContentItemExtended, ValidationRuleOutcome } from './types';

type Item = Partial<ContentItemExtended>;

const VALID_CONTENT_TYPES = new Set(['story', 'game', 'video', 'creative']);
const VALID_AGE_PAIRS: Array<[number, number]> = [[2, 4], [5, 7], [8, 10]];
const URL_PATTERN = /^https?:\/\/.+/i;
const ASSET_EXTENSIONS = /\.(svg|png)$/i;
const URL_REACHABILITY_TIMEOUT_MS = 3000;

function pass(rule_name: string, severity: ValidationRuleOutcome['severity'] = 'error'): ValidationRuleOutcome {
  return { rule_name, passed: true, severity, message: '' };
}

function fail(rule_name: string, message: string, severity: ValidationRuleOutcome['severity'] = 'error'): ValidationRuleOutcome {
  return { rule_name, passed: false, severity, message };
}

export function requiredTitle(item: Item): ValidationRuleOutcome {
  if (!item.title || !item.title.trim()) {
    return fail('required_title', 'title is required and must not be empty');
  }
  return pass('required_title');
}

export function requiredType(item: Item): ValidationRuleOutcome {
  if (!item.type || !VALID_CONTENT_TYPES.has(item.type)) {
    return fail('required_type', `type must be one of: ${[...VALID_CONTENT_TYPES].join(', ')}`);
  }
  return pass('required_type');
}

export function requiredThumbnail(item: Item): ValidationRuleOutcome {
  if (!item.thumbnail_url || !item.thumbnail_url.trim()) {
    return fail('required_thumbnail', 'thumbnail_url is required');
  }
  return pass('required_thumbnail');
}

export function requiredCategory(item: Item): ValidationRuleOutcome {
  if (!item.category || !item.category.trim()) {
    return fail('required_category', 'category is required');
  }
  return pass('required_category');
}

export function validAgeRange(item: Item): ValidationRuleOutcome {
  const minAge = (item as any).min_age;
  const maxAge = (item as any).max_age;
  const isValid = VALID_AGE_PAIRS.some(([min, max]) => min === minAge && max === maxAge);
  if (!isValid) {
    const validStr = VALID_AGE_PAIRS.map(([a, b]) => `(${a}, ${b})`).join(', ');
    return fail('valid_age_range', `(min_age, max_age) must be one of: ${validStr}`);
  }
  return pass('valid_age_range');
}

export function videoUrlRequired(item: Item): ValidationRuleOutcome {
  if (item.type !== 'video') return pass('video_url_required');
  if (!item.url || !item.url.trim()) {
    return fail('video_url_required', 'url is required for video content');
  }
  return pass('video_url_required');
}

export function videoUrlFormat(item: Item): ValidationRuleOutcome {
  if (item.type !== 'video') return pass('video_url_format');
  if (!item.url || !URL_PATTERN.test(item.url)) {
    return fail('video_url_format', 'url must start with http:// or https://');
  }
  return pass('video_url_format');
}

export function assetFormat(item: Item): ValidationRuleOutcome {
  if (item.type !== 'creative') return pass('asset_format');
  const assetsUrl = (item as any).assets_url as string | undefined;
  if (!assetsUrl || !ASSET_EXTENSIONS.test(assetsUrl)) {
    return fail('asset_format', 'assets_url must end with .svg or .png');
  }
  return pass('asset_format');
}

export function gameConfigSchema(item: Item): ValidationRuleOutcome {
  if (item.type !== 'game') return pass('game_config_schema');

  const config = (item as any).config_json;
  const gameType = (item as any).game_type as string | undefined;

  if (!config) {
    return fail('game_config_schema', 'game config is required');
  }

  if (gameType === 'counting') {
    if (typeof config.question !== 'string' || !config.question) {
      return fail('game_config_schema', 'counting config must have a non-empty string question');
    }
    if (typeof config.image_url !== 'string' || !config.image_url) {
      return fail('game_config_schema', 'counting config must have a non-empty string image_url');
    }
    if (typeof config.correct_answer !== 'number') {
      return fail('game_config_schema', 'counting config must have a number correct_answer');
    }
    if (!Array.isArray(config.choices) || config.choices.length === 0) {
      return fail('game_config_schema', 'counting config must have a non-empty choices array of numbers');
    }
    if (!config.choices.every((c: unknown) => typeof c === 'number')) {
      return fail('game_config_schema', 'counting config choices must all be numbers');
    }
    return pass('game_config_schema');
  }

  if (gameType === 'matching') {
    if (!Array.isArray(config.pairs) || config.pairs.length < 2) {
      return fail('game_config_schema', 'matching config must have at least 2 pairs');
    }
    for (const pair of config.pairs) {
      if (typeof pair.item !== 'string' || typeof pair.image !== 'string') {
        return fail('game_config_schema', 'each matching pair must have string item and image fields');
      }
    }
    return pass('game_config_schema');
  }

  return fail('game_config_schema', `Unknown game_type "${gameType}" — no schema available`);
}

export async function urlReachability(item: Item): Promise<ValidationRuleOutcome> {
  if (item.type !== 'video') return pass('url_reachability', 'warning');

  const url = item.url;
  if (!url) {
    return fail('url_reachability', 'URL reachability could not be confirmed — no url provided', 'warning');
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), URL_REACHABILITY_TIMEOUT_MS);
    const response = await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timer);
    if (response.status < 200 || response.status >= 400) {
      return fail(
        'url_reachability',
        `URL reachability could not be confirmed — HTTP ${response.status} — verify during review`,
        'warning'
      );
    }
    return pass('url_reachability', 'warning');
  } catch {
    return fail(
      'url_reachability',
      'URL reachability could not be confirmed — verify during review',
      'warning'
    );
  }
}

export const ALL_SYNC_RULES = [
  requiredTitle,
  requiredType,
  requiredThumbnail,
  requiredCategory,
  validAgeRange,
  videoUrlRequired,
  videoUrlFormat,
  assetFormat,
  gameConfigSchema,
];
