import {
  requiredTitle,
  requiredType,
  requiredThumbnail,
  requiredCategory,
  validAgeRange,
  videoUrlRequired,
  videoUrlFormat,
  assetFormat,
  gameConfigSchema,
  urlReachability,
} from '../../services/api/contentValidationRules';
import type { ContentItemExtended } from '../../services/api/types';

type PartialItem = Partial<ContentItemExtended>;

// ── required_title ────────────────────────────────────────────────────────────

describe('requiredTitle', () => {
  it('passes when title is non-empty', () => {
    const result = requiredTitle({ title: 'My Story' } as PartialItem);
    expect(result.passed).toBe(true);
    expect(result.rule_name).toBe('required_title');
    expect(result.severity).toBe('error');
  });

  it('fails when title is missing', () => {
    const result = requiredTitle({} as PartialItem);
    expect(result.passed).toBe(false);
    expect(result.message).not.toBe('');
  });

  it('fails when title is empty string', () => {
    const result = requiredTitle({ title: '' } as PartialItem);
    expect(result.passed).toBe(false);
  });

  it('fails when title is whitespace only', () => {
    const result = requiredTitle({ title: '   ' } as PartialItem);
    expect(result.passed).toBe(false);
  });
});

// ── required_type ─────────────────────────────────────────────────────────────

describe('requiredType', () => {
  it('passes for valid type video', () => {
    expect(requiredType({ type: 'video' } as PartialItem).passed).toBe(true);
  });

  it('passes for valid type story', () => {
    expect(requiredType({ type: 'story' } as PartialItem).passed).toBe(true);
  });

  it('passes for valid type creative', () => {
    expect(requiredType({ type: 'creative' } as PartialItem).passed).toBe(true);
  });

  it('passes for valid type game', () => {
    expect(requiredType({ type: 'game' } as PartialItem).passed).toBe(true);
  });

  it('fails when type is missing', () => {
    expect(requiredType({} as PartialItem).passed).toBe(false);
  });

  it('fails for unknown type', () => {
    expect(requiredType({ type: 'podcast' } as any).passed).toBe(false);
  });
});

// ── required_thumbnail ────────────────────────────────────────────────────────

describe('requiredThumbnail', () => {
  it('passes when thumbnail_url is present', () => {
    expect(requiredThumbnail({ thumbnail_url: 'https://example.com/img.png' } as PartialItem).passed).toBe(true);
  });

  it('fails when thumbnail_url is missing', () => {
    expect(requiredThumbnail({} as PartialItem).passed).toBe(false);
  });

  it('fails when thumbnail_url is empty', () => {
    expect(requiredThumbnail({ thumbnail_url: '' } as PartialItem).passed).toBe(false);
  });
});

// ── required_category ─────────────────────────────────────────────────────────

describe('requiredCategory', () => {
  it('passes when category is present', () => {
    expect(requiredCategory({ category: 'nature' } as PartialItem).passed).toBe(true);
  });

  it('fails when category is missing', () => {
    expect(requiredCategory({} as PartialItem).passed).toBe(false);
  });

  it('fails when category is empty', () => {
    expect(requiredCategory({ category: '' } as PartialItem).passed).toBe(false);
  });
});

// ── valid_age_range ───────────────────────────────────────────────────────────

describe('validAgeRange', () => {
  it('passes for (2, 4)', () => {
    expect(validAgeRange({ min_age: 2, max_age: 4 } as PartialItem).passed).toBe(true);
  });

  it('passes for (5, 7)', () => {
    expect(validAgeRange({ min_age: 5, max_age: 7 } as PartialItem).passed).toBe(true);
  });

  it('passes for (8, 10)', () => {
    expect(validAgeRange({ min_age: 8, max_age: 10 } as PartialItem).passed).toBe(true);
  });

  it('fails for (3, 5)', () => {
    const result = validAgeRange({ min_age: 3, max_age: 5 } as PartialItem);
    expect(result.passed).toBe(false);
    expect(result.message).toContain('(2, 4)');
  });

  it('fails for (10, 15)', () => {
    expect(validAgeRange({ min_age: 10, max_age: 15 } as PartialItem).passed).toBe(false);
  });

  it('fails when min_age is missing', () => {
    expect(validAgeRange({ max_age: 4 } as PartialItem).passed).toBe(false);
  });
});

// ── video_url_required ────────────────────────────────────────────────────────

describe('videoUrlRequired', () => {
  it('passes for video with url', () => {
    expect(videoUrlRequired({ type: 'video', url: 'https://youtube.com/v/abc' } as PartialItem).passed).toBe(true);
  });

  it('fails for video without url', () => {
    expect(videoUrlRequired({ type: 'video' } as PartialItem).passed).toBe(false);
  });

  it('passes for non-video type (rule does not apply)', () => {
    expect(videoUrlRequired({ type: 'story' } as PartialItem).passed).toBe(true);
  });
});

// ── video_url_format ──────────────────────────────────────────────────────────

describe('videoUrlFormat', () => {
  it('passes for https url', () => {
    expect(videoUrlFormat({ type: 'video', url: 'https://youtube.com/v/abc' } as PartialItem).passed).toBe(true);
  });

  it('passes for http url', () => {
    expect(videoUrlFormat({ type: 'video', url: 'http://youtube.com/v/abc' } as PartialItem).passed).toBe(true);
  });

  it('fails for malformed url', () => {
    expect(videoUrlFormat({ type: 'video', url: 'not-a-url' } as PartialItem).passed).toBe(false);
  });

  it('fails for ftp url', () => {
    expect(videoUrlFormat({ type: 'video', url: 'ftp://files.example.com/v.mp4' } as PartialItem).passed).toBe(false);
  });

  it('passes for non-video type (rule does not apply)', () => {
    expect(videoUrlFormat({ type: 'story' } as PartialItem).passed).toBe(true);
  });
});

// ── asset_format ──────────────────────────────────────────────────────────────

describe('assetFormat', () => {
  it('passes for .svg asset', () => {
    expect(assetFormat({ type: 'creative', assets_url: 'https://cdn.example.com/art.svg' } as any).passed).toBe(true);
  });

  it('passes for .png asset (uppercase)', () => {
    expect(assetFormat({ type: 'creative', assets_url: 'https://cdn.example.com/art.PNG' } as any).passed).toBe(true);
  });

  it('fails for .jpg asset', () => {
    expect(assetFormat({ type: 'creative', assets_url: 'https://cdn.example.com/art.jpg' } as any).passed).toBe(false);
  });

  it('fails when assets_url is missing', () => {
    expect(assetFormat({ type: 'creative' } as any).passed).toBe(false);
  });

  it('passes for non-creative type (rule does not apply)', () => {
    expect(assetFormat({ type: 'video', url: 'https://youtube.com/v/x' } as any).passed).toBe(true);
  });
});

// ── game_config_schema ────────────────────────────────────────────────────────

describe('gameConfigSchema', () => {
  const validCountingConfig = {
    question: 'How many apples?',
    image_url: 'https://cdn.example.com/apples.png',
    correct_answer: 3,
    choices: [1, 2, 3, 4],
  };

  const validMatchingConfig = {
    pairs: [
      { item: 'cat', image: 'https://cdn.example.com/cat.png' },
      { item: 'dog', image: 'https://cdn.example.com/dog.png' },
    ],
  };

  it('passes for valid counting config', () => {
    expect(gameConfigSchema({ type: 'game', game_type: 'counting', config_json: validCountingConfig } as any).passed).toBe(true);
  });

  it('passes for valid matching config', () => {
    expect(gameConfigSchema({ type: 'game', game_type: 'matching', config_json: validMatchingConfig } as any).passed).toBe(true);
  });

  it('fails when config_json is null', () => {
    const result = gameConfigSchema({ type: 'game', game_type: 'counting', config_json: null } as any);
    expect(result.passed).toBe(false);
    expect(result.message).toContain('required');
  });

  it('fails for counting config missing choices', () => {
    const bad = { ...validCountingConfig, choices: undefined };
    expect(gameConfigSchema({ type: 'game', game_type: 'counting', config_json: bad } as any).passed).toBe(false);
  });

  it('fails for counting config with choices as string', () => {
    const bad = { ...validCountingConfig, choices: 'three' };
    expect(gameConfigSchema({ type: 'game', game_type: 'counting', config_json: bad } as any).passed).toBe(false);
  });

  it('fails for matching config with only one pair', () => {
    const bad = { pairs: [{ item: 'cat', image: 'https://cdn.example.com/cat.png' }] };
    expect(gameConfigSchema({ type: 'game', game_type: 'matching', config_json: bad } as any).passed).toBe(false);
  });

  it('fails for unknown game_type', () => {
    const result = gameConfigSchema({ type: 'game', game_type: 'trivia', config_json: {} } as any);
    expect(result.passed).toBe(false);
    expect(result.message).toContain('Unknown game_type');
  });

  it('passes for non-game type (rule does not apply)', () => {
    expect(gameConfigSchema({ type: 'story' } as PartialItem).passed).toBe(true);
  });
});

// ── url_reachability ──────────────────────────────────────────────────────────

describe('urlReachability', () => {
  it('is severity warning', async () => {
    const result = await urlReachability({ type: 'video', url: 'https://example.com' } as PartialItem);
    expect(result.rule_name).toBe('url_reachability');
    expect(result.severity).toBe('warning');
  });

  it('passes for non-video type (rule does not apply)', async () => {
    const result = await urlReachability({ type: 'story' } as PartialItem);
    expect(result.passed).toBe(true);
  });

  it('returns a ValidationRuleOutcome shape', async () => {
    const result = await urlReachability({ type: 'video', url: 'https://example.com' } as PartialItem);
    expect(typeof result.rule_name).toBe('string');
    expect(typeof result.passed).toBe('boolean');
    expect(typeof result.severity).toBe('string');
    expect(typeof result.message).toBe('string');
  });
});
