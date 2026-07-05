import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Types ─────────────────────────────────────────────────────────────────────

type SeedCategory = {
  name: string;
  icon_url: string;
};

type SeedItem = {
  title: string;
  type: 'video' | 'story' | 'creative' | 'game';
  category: string;
  // Must be exactly one of (2,4), (5,7), (8,10) — see
  // services/api/contentValidationRules.ts's validAgeRange rule. Any other
  // pair gets the item flagged the first time validation/revalidation runs.
  min_age: number;
  max_age: number;
  thumbnail_url: string;
  page_images?: string[];
  url?: string;
  duration_seconds?: number;
  content_text?: string;
  assets_url?: string;
  game_type?: 'counting' | 'matching' | 'memory';
  config_json?: Record<string, unknown>;
  // Seed content is inserted already-published — it's not going through the
  // admin draft → submit → review workflow, so it must be visible to
  // children immediately (anon_read_published_content_items RLS policy,
  // see supabase/migrations/20260620000002_anon_read_content_and_repair_seed.sql).
  status: 'published';
};

type SeedResult = 'inserted' | 'skipped' | 'error';

// ── Seed Data ─────────────────────────────────────────────────────────────────
// Deliberately covers all three age buckets (2-4, 5-7, 8-10) for all four
// content types — the original seed set only covered 2-4 and 8-10, leaving
// 5-7 entirely empty for every type.

const SEED_CATEGORIES: SeedCategory[] = [
  { name: 'math',    icon_url: 'https://picsum.photos/seed/math/100/100' },
  { name: 'animals', icon_url: 'https://picsum.photos/seed/animals/100/100' },
  { name: 'nature',  icon_url: 'https://picsum.photos/seed/nature/100/100' },
  { name: 'science', icon_url: 'https://picsum.photos/seed/science/100/100' },
  { name: 'social',  icon_url: 'https://picsum.photos/seed/social/100/100' },
];

const SEED_ITEMS: SeedItem[] = [
  // ── Videos ─────────────────────────────────────────────────────────────────
  {
    title: 'Count to 10 with Animals',
    type: 'video',
    category: 'math',
    min_age: 2,
    max_age: 4,
    url: 'https://www.youtube.com/watch?v=DR-cfDsHCGA',
    thumbnail_url: 'https://picsum.photos/seed/count10/400/300',
    duration_seconds: 180,
    status: 'published',
  },
  {
    title: 'Animal Sounds Adventure',
    type: 'video',
    category: 'animals',
    min_age: 2,
    max_age: 4,
    url: 'https://www.youtube.com/watch?v=t99ULJjCsaM',
    thumbnail_url: 'https://picsum.photos/seed/animalsounds/400/300',
    duration_seconds: 240,
    status: 'published',
  },
  {
    title: 'Colors and Shapes Song',
    type: 'video',
    category: 'math',
    min_age: 2,
    max_age: 4,
    url: 'https://www.youtube.com/watch?v=AnoNb2OMQ6s',
    thumbnail_url: 'https://picsum.photos/seed/colorshapes/400/300',
    duration_seconds: 150,
    status: 'published',
  },
  {
    title: 'Planets and Stars Explained',
    type: 'video',
    category: 'science',
    min_age: 5,
    max_age: 7,
    url: 'https://www.youtube.com/watch?v=libKVRa01L8',
    thumbnail_url: 'https://picsum.photos/seed/planets/400/300',
    duration_seconds: 270,
    status: 'published',
  },
  {
    title: 'Why Do We Recycle?',
    type: 'video',
    category: 'nature',
    min_age: 5,
    max_age: 7,
    url: 'https://www.youtube.com/watch?v=6jQ7y_qQYUA',
    thumbnail_url: 'https://picsum.photos/seed/recycle/400/300',
    duration_seconds: 200,
    status: 'published',
  },
  {
    title: 'Shapes All Around Us',
    type: 'video',
    category: 'nature',
    min_age: 8,
    max_age: 10,
    url: 'https://www.youtube.com/watch?v=lcl8uB2AWM0',
    thumbnail_url: 'https://picsum.photos/seed/shapes/400/300',
    duration_seconds: 300,
    status: 'published',
  },
  {
    title: 'How Plants Grow',
    type: 'video',
    category: 'science',
    min_age: 8,
    max_age: 10,
    url: 'https://www.youtube.com/watch?v=BkGpX4ca5I8',
    thumbnail_url: 'https://picsum.photos/seed/plantgrow/400/300',
    duration_seconds: 320,
    status: 'published',
  },

  // ── Stories ────────────────────────────────────────────────────────────────
  {
    title: 'The Friendly Lion',
    type: 'story',
    category: 'animals',
    min_age: 2,
    max_age: 4,
    thumbnail_url: 'https://picsum.photos/seed/friendly-lion-cover/800/600',
    page_images: [
      'https://picsum.photos/seed/lion-savannah/800/600',
      'https://picsum.photos/seed/rabbit-thorn/800/600',
      'https://picsum.photos/seed/lion-friends/800/600',
    ],
    content_text: [
      'Leo the lion lived in a sunny savannah where tall golden grasses swayed in the warm breeze. Every morning he would stretch his big paws and let out a gentle yawn that made the birds scatter from the nearby acacia trees.',
      'One day Leo found a tiny rabbit caught in a thorn bush. Instead of roaring, he used his soft paws to carefully pull each thorn away until the rabbit was free. The rabbit blinked up at him, surprised that the big lion was so gentle.',
      'From that day on, Leo and the rabbit became the best of friends. The other animals in the savannah learned that being big and strong does not mean being scary — it means you can help those who need you most.',
    ].join('\n\n'),
    status: 'published',
  },
  {
    title: 'Max Learns to Share',
    type: 'story',
    category: 'social',
    min_age: 2,
    max_age: 4,
    thumbnail_url: 'https://picsum.photos/seed/maxshare-cover/800/600',
    page_images: [
      'https://picsum.photos/seed/acorn-stash/800/600',
      'https://picsum.photos/seed/hedgehog-winter/800/600',
      'https://picsum.photos/seed/warm-soup-share/800/600',
    ],
    content_text: [
      'Max the squirrel had the biggest pile of acorns in the whole forest. He had spent all autumn collecting them one by one and storing them under his favourite oak tree. He was very proud of his acorn mountain.',
      'When winter came, his neighbour Bea the hedgehog knocked on his door. She had not found enough food and her belly was rumbling. Max looked at his huge pile and then at Bea\'s sad eyes.',
      'Max filled a little basket with acorns and gave it to Bea with a smile. That night, as snow fell softly outside, both friends sat together and shared a warm acorn soup. Max discovered that sharing made him feel much happier than having all the acorns to himself.',
    ].join('\n\n'),
    status: 'published',
  },
  {
    title: 'The Kind Dragon',
    type: 'story',
    category: 'social',
    min_age: 5,
    max_age: 7,
    thumbnail_url: 'https://picsum.photos/seed/kinddragon-cover/800/600',
    page_images: [
      'https://picsum.photos/seed/village-mountain/800/600',
      'https://picsum.photos/seed/stone-cave/800/600',
      'https://picsum.photos/seed/dragon-friend/800/600',
    ],
    content_text: [
      'Everyone in the village was afraid of the dragon on the mountain, even though no one had ever actually seen it breathe fire. Children were told to stay far away and never go near the old stone cave.',
      'One day, a boy named Tomas got lost in a storm and stumbled into the cave to find shelter. Instead of a fearsome beast, he found an old, gentle dragon who was lonely and just wanted a friend to talk to.',
      'Tomas visited the dragon every week after that, and slowly the whole village learned that the scariest stories are not always true — sometimes you just have to be brave enough to look closer.',
    ].join('\n\n'),
    status: 'published',
  },
  {
    title: 'The Brave Little Boat',
    type: 'story',
    category: 'nature',
    min_age: 5,
    max_age: 7,
    thumbnail_url: 'https://picsum.photos/seed/brave-boat-cover/800/600',
    page_images: [
      'https://picsum.photos/seed/harbor-scene/800/600',
      'https://picsum.photos/seed/stormy-sea-night/800/600',
      'https://picsum.photos/seed/duck-rescue/800/600',
    ],
    content_text: [
      'Pip was the smallest boat in the harbor, much tinier than the big fishing ships and tall sailboats around him. He often worried he wasn\'t strong enough to do anything important.',
      'One stormy night, a little duck family got stranded on a rock far from shore. The big boats were too large to reach the shallow water, but Pip was small enough to slip right through.',
      'Pip carried the ducks safely home one by one, proving that being small doesn\'t mean being unimportant — sometimes the smallest boat can do the biggest job.',
    ].join('\n\n'),
    status: 'published',
  },
  {
    title: 'A Day on the Farm',
    type: 'story',
    category: 'nature',
    min_age: 8,
    max_age: 10,
    thumbnail_url: 'https://picsum.photos/seed/day-farm-cover/800/600',
    page_images: [
      'https://picsum.photos/seed/hen-house-morning/800/600',
      'https://picsum.photos/seed/garden-tomato/800/600',
      'https://picsum.photos/seed/farm-evening-stars/800/600',
    ],
    content_text: [
      'Every summer, Priya visited her grandparents\' farm in the countryside. She loved waking up early to help collect warm eggs from the hen house before breakfast. The hens clucked softly as she reached gently under each one.',
      'After breakfast, Priya helped her grandfather water the vegetable garden. He taught her how to tell when a tomato is ripe by its deep red colour and the way it feels firm but slightly soft between your fingers. She picked six perfect tomatoes for lunch.',
      'By evening, Priya was tired but happy. She had fed the goats, learned to steer the old tractor in a straight line, and helped bake a sunflower-seed loaf with her grandmother. As the stars appeared, she realised that food from a farm tastes different — it tastes like hard work and love.',
    ].join('\n\n'),
    status: 'published',
  },
  {
    title: 'The Lost Treasure Map',
    type: 'story',
    category: 'social',
    min_age: 8,
    max_age: 10,
    thumbnail_url: 'https://picsum.photos/seed/treasure-map-cover/800/600',
    page_images: [
      'https://picsum.photos/seed/attic-old-map/800/600',
      'https://picsum.photos/seed/lighthouse-coast/800/600',
      'https://picsum.photos/seed/grandfather-letters/800/600',
    ],
    content_text: [
      'Jonah and his sister Mia found an old, torn map in their attic with a faded "X" marked near the old lighthouse. They argued the whole bike ride there about who got to dig first.',
      'When they finally found the spot, the box they dug up wasn\'t full of gold — it was full of letters their grandfather had written to their grandmother decades ago, telling her about his dreams for their future family.',
      'Mia and Jonah sat by the lighthouse reading every letter together, realizing the real treasure wasn\'t something you could spend — it was the story of how their whole family began.',
    ].join('\n\n'),
    status: 'published',
  },

  // ── Creative Activities ────────────────────────────────────────────────────
  {
    title: 'Draw a Rainbow',
    type: 'creative',
    category: 'nature',
    min_age: 2,
    max_age: 4,
    thumbnail_url: 'https://picsum.photos/seed/rainbow/400/300',
    assets_url: 'https://picsum.photos/seed/rainbowsheet/800/600.png',
    status: 'published',
  },
  {
    title: 'Sticker Garden',
    type: 'creative',
    category: 'nature',
    min_age: 2,
    max_age: 4,
    thumbnail_url: 'https://picsum.photos/seed/stickergarden/400/300',
    assets_url: 'https://picsum.photos/seed/stickergardensheet/800/600.png',
    status: 'published',
  },
  {
    title: 'Build a Paper Rocket',
    type: 'creative',
    category: 'science',
    min_age: 5,
    max_age: 7,
    thumbnail_url: 'https://picsum.photos/seed/paperrocket/400/300',
    assets_url: 'https://picsum.photos/seed/paperrocketsheet/800/600.svg',
    status: 'published',
  },
  {
    title: 'Design Your Pet',
    type: 'creative',
    category: 'animals',
    min_age: 5,
    max_age: 7,
    thumbnail_url: 'https://picsum.photos/seed/designpet/400/300',
    assets_url: 'https://picsum.photos/seed/designpetsheet/800/600.png',
    status: 'published',
  },
  {
    title: 'Colour the Animals',
    type: 'creative',
    category: 'animals',
    min_age: 8,
    max_age: 10,
    thumbnail_url: 'https://picsum.photos/seed/colouranimal/400/300',
    assets_url: 'https://picsum.photos/seed/animalsheet/800/600.png',
    status: 'published',
  },

  // ── Games ──────────────────────────────────────────────────────────────────
  {
    title: 'Count the Apples',
    type: 'game',
    game_type: 'counting',
    category: 'math',
    min_age: 2,
    max_age: 4,
    thumbnail_url: 'https://picsum.photos/seed/apples/400/300',
    config_json: {
      type: 'counting',
      display: 'interactive',
      question: 'How many apples are in the basket?',
      emoji: '🍎',
      correct_answer: 5,
      choices: [3, 4, 5, 6],
    },
    status: 'published',
  },
  {
    title: 'Find the Color',
    type: 'game',
    game_type: 'matching',
    category: 'math',
    min_age: 2,
    max_age: 4,
    thumbnail_url: 'https://picsum.photos/seed/findcolor/400/300',
    config_json: {
      type: 'matching',
      display: 'quiz',
      pairs: [
        { item: 'Red',    image: 'https://picsum.photos/seed/colorred/200/200' },
        { item: 'Blue',   image: 'https://picsum.photos/seed/colorblue/200/200' },
        { item: 'Yellow', image: 'https://picsum.photos/seed/coloryellow/200/200' },
      ],
    },
    status: 'published',
  },
  {
    title: 'Shape Sorter Challenge',
    type: 'game',
    game_type: 'counting',
    category: 'math',
    min_age: 5,
    max_age: 7,
    thumbnail_url: 'https://picsum.photos/seed/shapesorter/400/300',
    config_json: {
      type: 'counting',
      question: 'How many triangles can you find in this picture?',
      image_url: 'https://picsum.photos/seed/shapecount/400/300',
      correct_answer: 4,
      choices: [2, 3, 4, 5],
    },
    status: 'published',
  },
  {
    title: 'Animal Match Memory',
    type: 'game',
    game_type: 'matching',
    category: 'animals',
    min_age: 5,
    max_age: 7,
    thumbnail_url: 'https://picsum.photos/seed/animalmatch/400/300',
    config_json: {
      type: 'matching',
      pairs: [
        { item: 'Elephant', image: 'https://picsum.photos/seed/elephant/200/200' },
        { item: 'Giraffe',  image: 'https://picsum.photos/seed/giraffe/200/200' },
        { item: 'Zebra',    image: 'https://picsum.photos/seed/zebra/200/200' },
      ],
    },
    status: 'published',
  },
  {
    title: 'Match the Animals',
    type: 'game',
    game_type: 'matching',
    category: 'animals',
    min_age: 8,
    max_age: 10,
    thumbnail_url: 'https://picsum.photos/seed/matchanimals/400/300',
    config_json: {
      type: 'matching',
      display: 'quiz',
      pairs: [
        { item: 'Dog',    image: 'https://picsum.photos/seed/dog/200/200' },
        { item: 'Cat',    image: 'https://picsum.photos/seed/cat/200/200' },
        { item: 'Rabbit', image: 'https://picsum.photos/seed/rabbit/200/200' },
      ],
    },
    status: 'published',
  },
  {
    title: 'Picture Match',
    type: 'game',
    game_type: 'memory',
    category: 'math',
    min_age: 2,
    max_age: 10,
    thumbnail_url: 'https://picsum.photos/seed/memorygame/400/300',
    config_json: {
      type: 'memory',
      pairs: [
        { id: 'apple', emoji: '🍎' },
        { id: 'ball', emoji: '⚽' },
        { id: 'star', emoji: '⭐' },
        { id: 'heart', emoji: '❤️' },
        { id: 'moon', emoji: '🌙' },
        { id: 'flower', emoji: '🌸' },
      ],
      cols: 4,
    },
    status: 'published',
  },
  // ── NEW STORIES ────────────────────────────────────────────────────────────
  // Stories (2-4): animals, social, nature
  {
    title: 'Bella the Bunny Finds a Friend',
    type: 'story',
    category: 'animals',
    min_age: 2,
    max_age: 4,
    thumbnail_url: 'https://picsum.photos/seed/bella-bunny-cover/800/600',
    page_images: [
      'https://picsum.photos/seed/bunny-meadow/800/600',
      'https://picsum.photos/seed/sunflower-field/800/600',
      'https://picsum.photos/seed/bunny-mouse-play/800/600',
    ],
    content_text: [
      'Bella the bunny hopped through the meadow every morning looking for someone to play with. She had soft white fur and the longest ears in the whole field.',
      'One sunny day she heard a tiny squeak behind a big sunflower. It was a little field mouse named Mimi who was too shy to say hello. Bella gently wiggled her nose and said, "Do you want to play hide and seek?"',
      'From that morning on, Bella and Mimi played together every day. Bella learned that sometimes the best friends are the ones who are quiet and small — you just have to listen carefully to find them.',
    ].join('\n\n'),
    status: 'published',
  },
  {
    title: 'Helping Hands at Home',
    type: 'story',
    category: 'social',
    min_age: 2,
    max_age: 4,
    thumbnail_url: 'https://picsum.photos/seed/helping-hands-cover/800/600',
    page_images: [
      'https://picsum.photos/seed/kitchen-cooking/800/600',
      'https://picsum.photos/seed/stirring-soup/800/600',
      'https://picsum.photos/seed/family-dinner/800/600',
    ],
    content_text: [
      'Little Noor loved watching her mother cook in the kitchen. The pots bubbled and the spoons clinked together like tiny bells. One day Mama said, "Would you like to help me?"',
      'Noor carefully washed three tomatoes and put them in a bowl. She stirred the soup slowly while Mama held the handle. When Papa came home, he tasted the soup and said, "This is the best soup I have ever had!"',
      'Noor smiled the biggest smile because she learned that helping others makes everything taste better — especially when you do it with love.',
    ].join('\n\n'),
    status: 'published',
  },
  {
    title: 'The Singing Rain',
    type: 'story',
    category: 'nature',
    min_age: 2,
    max_age: 4,
    thumbnail_url: 'https://picsum.photos/seed/singing-rain-cover/800/600',
    page_images: [
      'https://picsum.photos/seed/rainy-window/800/600',
      'https://picsum.photos/seed/puddle-splash/800/600',
      'https://picsum.photos/seed/rainbow-sky/800/600',
    ],
    content_text: [
      'Drip, drop, drip, drop — the rain tapped on the window like tiny fingers playing a drum. Little Sam pressed his nose against the glass and watched the puddles grow in the garden.',
      'When the rain stopped, a beautiful rainbow stretched across the sky. Sam ran outside and splashed in every single puddle, laughing as the water sparkled in the sunlight.',
      'That night Sam told his teddy bear, "Rain is not sad, it is just the sky singing so flowers can dance." And he fell asleep listening to the last gentle drops on the roof.',
    ].join('\n\n'),
    status: 'published',
  },

  // Stories (5-7): science, social, nature
  {
    title: 'The Curious Caterpillar',
    type: 'story',
    category: 'science',
    min_age: 5,
    max_age: 7,
    thumbnail_url: 'https://picsum.photos/seed/caterpillar-cover/800/600',
    page_images: [
      'https://picsum.photos/seed/caterpillar-leaf/800/600',
      'https://picsum.photos/seed/cocoon-branch/800/600',
      'https://picsum.photos/seed/butterfly-wings/800/600',
    ],
    content_text: [
      'Carl the caterpillar had fourteen tiny legs and one enormous curiosity. Every day he asked a new question: Why is the sky blue? Why do leaves fall? Where does the wind come from?',
      'One morning Carl woke up feeling very sleepy. He wrapped himself in a silky cocoon and slept for two whole weeks. When he finally woke up and stretched, he discovered he had two beautiful wings covered in orange and black patterns.',
      'Carl realised that sometimes the biggest changes happen when you are patient and trust the process. He flew up high and finally saw where the wind came from — everywhere and nowhere, all at once.',
    ].join('\n\n'),
    status: 'published',
  },
  {
    title: 'The New Kid at School',
    type: 'story',
    category: 'social',
    min_age: 5,
    max_age: 7,
    thumbnail_url: 'https://picsum.photos/seed/new-kid-cover/800/600',
    page_images: [
      'https://picsum.photos/seed/empty-classroom/800/600',
      'https://picsum.photos/seed/drawing-spaceship/800/600',
      'https://picsum.photos/seed/friends-table/800/600',
    ],
    content_text: [
      'Yara walked into her new classroom holding her backpack straps tightly. Everyone already had friends and she did not know a single name. She sat at the last desk and opened her notebook quietly.',
      'At break time a boy named Adam noticed Yara drawing a spaceship. "That is amazing!" he said. "Can you teach me how to draw the wings?" Soon three more children gathered around to watch.',
      'By the end of the week Yara had a whole table of friends. She learned that you do not need to say a lot of words to make friends — sometimes sharing what you love is the best introduction.',
    ].join('\n\n'),
    status: 'published',
  },
  {
    title: 'The River That Remembered',
    type: 'story',
    category: 'nature',
    min_age: 5,
    max_age: 7,
    thumbnail_url: 'https://picsum.photos/seed/river-remembered-cover/800/600',
    page_images: [
      'https://picsum.photos/seed/mountain-river/800/600',
      'https://picsum.photos/seed/dry-riverbed/800/600',
      'https://picsum.photos/seed/beaver-dam/800/600',
    ],
    content_text: [
      'Deep in the valley there was a river that remembered everything. It remembered every leaf that fell on its surface, every fish that swam in its current, and every child who skipped stones across its water.',
      'One summer, the river began to dry up because the rains did not come. The animals were worried. A young deer named Fawn walked upstream for three days until she found a beaver dam blocking the water.',
      'Fawn and the beavers worked together to build a new channel so the water could flow to everyone. The river was full again, and it remembered Fawn as the bravest deer it had ever known.',
    ].join('\n\n'),
    status: 'published',
  },

  // Stories (8-10): science, social, nature
  {
    title: 'The Girl Who Built a Robot',
    type: 'story',
    category: 'science',
    min_age: 8,
    max_age: 10,
    thumbnail_url: 'https://picsum.photos/seed/girl-robot-cover/800/600',
    page_images: [
      'https://picsum.photos/seed/garage-workshop/800/600',
      'https://picsum.photos/seed/robot-watering/800/600',
      'https://picsum.photos/seed/grandma-garden/800/600',
    ],
    content_text: [
      'Maya spent every afternoon in her garage surrounded by wires, motors, and old computer parts. Her dream was to build a robot that could water her grandmother\'s garden while Grandma rested.',
      'After six weeks of trying and failing, Maya finally got her robot to roll forward, turn left, and spray water from a small nozzle. It was not perfect — it sometimes watered the cat instead of the flowers — but it worked.',
      'When Grandma saw the robot watering her roses, she hugged Maya and said, "The most beautiful inventions come from a heart that wants to help." Maya decided she would build robots for the rest of her life.',
    ].join('\n\n'),
    status: 'published',
  },
  {
    title: 'The Secret Code Club',
    type: 'story',
    category: 'social',
    min_age: 8,
    max_age: 10,
    thumbnail_url: 'https://picsum.photos/seed/secret-code-cover/800/600',
    page_images: [
      'https://picsum.photos/seed/coded-note/800/600',
      'https://picsum.photos/seed/library-books/800/600',
      'https://picsum.photos/seed/oak-tree-meeting/800/600',
    ],
    content_text: [
      'Three friends — Zain, Leila, and Omar — created a secret club where they communicated using codes. They wrote messages by shifting each letter three places in the alphabet, so "A" became "D" and "B" became "E".',
      'One day they found a coded note in the library that was not from any of them. It read: "PHHW PH DW WKH ROG RDN WUHH." They decoded it together: "MEET ME AT THE OLD OAK TREE."',
      'At the old oak tree they found their librarian, Mrs. Hala, who had been leaving coded book recommendations for curious students all year. She invited them to help her create puzzles for other children. The three friends learned that knowledge is the best kind of secret — the kind that gets better when you share it.',
    ].join('\n\n'),
    status: 'published',
  },
  {
    title: 'The Mountain and the Cloud',
    type: 'story',
    category: 'nature',
    min_age: 8,
    max_age: 10,
    thumbnail_url: 'https://picsum.photos/seed/mountain-cloud-cover/800/600',
    page_images: [
      'https://picsum.photos/seed/tall-mountain/800/600',
      'https://picsum.photos/seed/snowy-peak/800/600',
      'https://picsum.photos/seed/river-valley-view/800/600',
    ],
    content_text: [
      'High above the valley stood a proud mountain who had not moved in ten thousand years. Every day a playful cloud drifted past and said, "Come travel with me! I have seen oceans and cities and deserts." The mountain always replied, "I cannot move. I am stuck here forever."',
      'One winter the cloud returned carrying snow and gently placed it on the mountain\'s peak. "You may not be able to travel," said the cloud, "but rivers flow from your snow to the ocean. Through your rivers, you have already touched every shore in the world."',
      'The mountain understood that you do not need to move to make a difference — sometimes staying strong in one place helps the whole world around you.',
    ].join('\n\n'),
    status: 'published',
  },

  // ── NEW GAMES ──────────────────────────────────────────────────────────────
  // Games (2-4): counting + matching
  {
    title: 'Count the Stars',
    type: 'game',
    game_type: 'counting',
    category: 'math',
    min_age: 2,
    max_age: 4,
    thumbnail_url: 'https://picsum.photos/seed/countstars/400/300',
    config_json: {
      type: 'counting',
      question: 'How many stars are in the sky?',
      image_url: 'https://picsum.photos/seed/nightstars/400/300',
      correct_answer: 4,
      choices: [2, 3, 4, 5],
    },
    status: 'published',
  },
  {
    title: 'Match the Baby Animals',
    type: 'game',
    game_type: 'matching',
    category: 'animals',
    min_age: 2,
    max_age: 4,
    thumbnail_url: 'https://picsum.photos/seed/babyanimals/400/300',
    config_json: {
      type: 'matching',
      pairs: [
        { item: 'Kitten', image: 'https://picsum.photos/seed/kitten/200/200' },
        { item: 'Puppy', image: 'https://picsum.photos/seed/puppy/200/200' },
        { item: 'Chick', image: 'https://picsum.photos/seed/chick/200/200' },
      ],
    },
    status: 'published',
  },

  // Games (5-7): counting + matching
  {
    title: 'How Many Planets?',
    type: 'game',
    game_type: 'counting',
    category: 'science',
    min_age: 5,
    max_age: 7,
    thumbnail_url: 'https://picsum.photos/seed/planetcount/400/300',
    config_json: {
      type: 'counting',
      question: 'How many planets are shown in this picture?',
      image_url: 'https://picsum.photos/seed/solarsystem/400/300',
      correct_answer: 6,
      choices: [4, 5, 6, 7],
    },
    status: 'published',
  },
  {
    title: 'Match the Shapes',
    type: 'game',
    game_type: 'matching',
    category: 'math',
    min_age: 5,
    max_age: 7,
    thumbnail_url: 'https://picsum.photos/seed/matchshapes/400/300',
    config_json: {
      type: 'matching',
      pairs: [
        { item: 'Circle', image: 'https://picsum.photos/seed/circle/200/200' },
        { item: 'Square', image: 'https://picsum.photos/seed/square/200/200' },
        { item: 'Triangle', image: 'https://picsum.photos/seed/triangle/200/200' },
        { item: 'Star', image: 'https://picsum.photos/seed/starshape/200/200' },
      ],
    },
    status: 'published',
  },

  // Games (8-10): counting + matching
  {
    title: 'Count the Molecules',
    type: 'game',
    game_type: 'counting',
    category: 'science',
    min_age: 8,
    max_age: 10,
    thumbnail_url: 'https://picsum.photos/seed/molecules/400/300',
    config_json: {
      type: 'counting',
      question: 'How many water molecules are in the diagram?',
      image_url: 'https://picsum.photos/seed/watermolecules/400/300',
      correct_answer: 8,
      choices: [6, 7, 8, 9],
    },
    status: 'published',
  },
  {
    title: 'Math Symbol Match',
    type: 'game',
    game_type: 'matching',
    category: 'math',
    min_age: 8,
    max_age: 10,
    thumbnail_url: 'https://picsum.photos/seed/mathsymbols/400/300',
    config_json: {
      type: 'matching',
      pairs: [
        { item: 'Plus', image: 'https://picsum.photos/seed/plussign/200/200' },
        { item: 'Minus', image: 'https://picsum.photos/seed/minussign/200/200' },
        { item: 'Multiply', image: 'https://picsum.photos/seed/multiplysign/200/200' },
      ],
    },
    status: 'published',
  },

  // ── NEW VIDEOS ─────────────────────────────────────────────────────────────
  // Videos (2-4): math, animals, nature
  {
    title: 'ABC Alphabet Song for Toddlers',
    type: 'video',
    category: 'math',
    min_age: 2,
    max_age: 4,
    url: 'https://www.youtube.com/watch?v=75p-N9YKqNo',
    thumbnail_url: 'https://picsum.photos/seed/abcsong/400/300',
    duration_seconds: 200,
    status: 'published',
  },
  {
    title: 'Baby Animals and Their Sounds',
    type: 'video',
    category: 'animals',
    min_age: 2,
    max_age: 4,
    url: 'https://www.youtube.com/watch?v=zXEq-QO3xTg',
    thumbnail_url: 'https://picsum.photos/seed/babyanimalvid/400/300',
    duration_seconds: 210,
    status: 'published',
  },
  {
    title: 'Rain and Rainbow — Nature for Kids',
    type: 'video',
    category: 'nature',
    min_age: 2,
    max_age: 4,
    url: 'https://www.youtube.com/watch?v=nCPPLhPTAIk',
    thumbnail_url: 'https://picsum.photos/seed/rainrainbow/400/300',
    duration_seconds: 160,
    status: 'published',
  },

  // Videos (5-7): science, nature, social
  {
    title: 'How Does a Volcano Work?',
    type: 'video',
    category: 'science',
    min_age: 5,
    max_age: 7,
    url: 'https://www.youtube.com/watch?v=lAmqsMQG3RM',
    thumbnail_url: 'https://picsum.photos/seed/volcano/400/300',
    duration_seconds: 280,
    status: 'published',
  },
  {
    title: 'Life of a Seed — From Soil to Tree',
    type: 'video',
    category: 'nature',
    min_age: 5,
    max_age: 7,
    url: 'https://www.youtube.com/watch?v=tkFPyue5X3Q',
    thumbnail_url: 'https://picsum.photos/seed/seedtotree/400/300',
    duration_seconds: 250,
    status: 'published',
  },
  {
    title: 'Being Kind — Social Skills for Kids',
    type: 'video',
    category: 'social',
    min_age: 5,
    max_age: 7,
    url: 'https://www.youtube.com/watch?v=kAo4-2UzgPo',
    thumbnail_url: 'https://picsum.photos/seed/bekind/400/300',
    duration_seconds: 230,
    status: 'published',
  },

  // Videos (8-10): science, math, nature
  {
    title: 'The Water Cycle Explained',
    type: 'video',
    category: 'science',
    min_age: 8,
    max_age: 10,
    url: 'https://www.youtube.com/watch?v=ncORPosDrjI',
    thumbnail_url: 'https://picsum.photos/seed/watercycle/400/300',
    duration_seconds: 310,
    status: 'published',
  },
  {
    title: 'Fun with Fractions',
    type: 'video',
    category: 'math',
    min_age: 8,
    max_age: 10,
    url: 'https://www.youtube.com/watch?v=n0FZhQ_GkKw',
    thumbnail_url: 'https://picsum.photos/seed/fractions/400/300',
    duration_seconds: 290,
    status: 'published',
  },
  {
    title: 'Ecosystems — How Nature Works Together',
    type: 'video',
    category: 'nature',
    min_age: 8,
    max_age: 10,
    url: 'https://www.youtube.com/watch?v=5eTCZ9L834s',
    thumbnail_url: 'https://picsum.photos/seed/ecosystem/400/300',
    duration_seconds: 340,
    status: 'published',
  },

  // ── NEW CREATIVE ACTIVITIES ────────────────────────────────────────────────
  // Creative (2-4): nature, animals
  {
    title: 'Colour the Flowers',
    type: 'creative',
    category: 'nature',
    min_age: 2,
    max_age: 4,
    thumbnail_url: 'https://picsum.photos/seed/colourflowers/400/300',
    assets_url: 'https://picsum.photos/seed/flowercolouring/800/600.png',
    status: 'published',
  },
  {
    title: 'Trace the Animals',
    type: 'creative',
    category: 'animals',
    min_age: 2,
    max_age: 4,
    thumbnail_url: 'https://picsum.photos/seed/traceanimals/400/300',
    assets_url: 'https://picsum.photos/seed/animaltrace/800/600.png',
    status: 'published',
  },

  // Creative (5-7): science, social
  {
    title: 'Draw the Solar System',
    type: 'creative',
    category: 'science',
    min_age: 5,
    max_age: 7,
    thumbnail_url: 'https://picsum.photos/seed/drawplanets/400/300',
    assets_url: 'https://picsum.photos/seed/solarsystemdraw/800/600.png',
    status: 'published',
  },
  {
    title: 'Design a Friendship Card',
    type: 'creative',
    category: 'social',
    min_age: 5,
    max_age: 7,
    thumbnail_url: 'https://picsum.photos/seed/friendcard/400/300',
    assets_url: 'https://picsum.photos/seed/friendshipcard/800/600.png',
    status: 'published',
  },

  // Creative (8-10): nature, science
  {
    title: 'Build a Nature Journal Page',
    type: 'creative',
    category: 'nature',
    min_age: 8,
    max_age: 10,
    thumbnail_url: 'https://picsum.photos/seed/naturejournal/400/300',
    assets_url: 'https://picsum.photos/seed/journalpage/800/600.png',
    status: 'published',
  },
  {
    title: 'Design a Simple Machine',
    type: 'creative',
    category: 'science',
    min_age: 8,
    max_age: 10,
    thumbnail_url: 'https://picsum.photos/seed/simplemachine/400/300',
    assets_url: 'https://picsum.photos/seed/machinedesign/800/600.png',
    status: 'published',
  },
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

// ── Seed helpers ──────────────────────────────────────────────────────────────

async function seedCategory(
  client: SupabaseClient,
  cat: SeedCategory
): Promise<SeedResult> {
  const { data: existing, error: selErr } = await client
    .from('categories')
    .select('id')
    .eq('name', cat.name)
    .limit(1);
  if (selErr) {
    console.error(`  ❌ Error checking category "${cat.name}":`, selErr.message);
    return 'error';
  }
  if (existing && existing.length > 0) {
    console.log(`  ⏭  Skipped category: ${cat.name}`);
    return 'skipped';
  }
  const { error: insErr } = await client.from('categories').insert(cat);
  if (insErr) {
    console.error(`  ❌ Failed to insert category "${cat.name}":`, insErr.message);
    return 'error';
  }
  console.log(`  ✅ Inserted category: ${cat.name}`);
  return 'inserted';
}

async function seedContentItem(
  client: SupabaseClient,
  item: SeedItem
): Promise<SeedResult> {
  const { data: existing, error: selErr } = await client
    .from('content_items')
    .select('id')
    .eq('title', item.title)
    .eq('type', item.type)
    .limit(1);
  if (selErr) {
    console.error(`  ❌ Error checking "${item.title}" (${item.type}):`, selErr.message);
    return 'error';
  }
  if (existing && existing.length > 0) {
    console.log(`  ⏭  Skipped ${item.type}: ${item.title}`);
    return 'skipped';
  }
  const { error: insErr } = await client.from('content_items').insert(item as Record<string, unknown>);
  if (insErr) {
    console.error(`  ❌ Failed to insert ${item.type} "${item.title}":`, insErr.message);
    return 'error';
  }
  console.log(`  ✅ Inserted ${item.type}: ${item.title}`);
  return 'inserted';
}

// ── Summary ───────────────────────────────────────────────────────────────────

type Counts = { inserted: number; skipped: number; failed: number };

function emptyCounts(): Counts {
  return { inserted: 0, skipped: 0, failed: 0 };
}

function accumulate(counts: Counts, result: SeedResult): void {
  if (result === 'inserted') counts.inserted++;
  else if (result === 'skipped') counts.skipped++;
  else counts.failed++;
}

function printSummary(label: string, counts: Counts): void {
  console.log(`  ${label.padEnd(12)} — ${counts.inserted} inserted, ${counts.skipped} skipped, ${counts.failed} failed`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  loadEnv();

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing credentials: EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
    process.exit(1);
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Categories ─────────────────────────────────────────────────────────────
  console.log('\nSeeding categories...');
  const catCounts = emptyCounts();
  for (const cat of SEED_CATEGORIES) {
    accumulate(catCounts, await seedCategory(client, cat));
  }

  // ── Content items ──────────────────────────────────────────────────────────
  console.log('\nSeeding content items...');
  const typeCounts: Record<string, Counts> = {
    video: emptyCounts(),
    story: emptyCounts(),
    creative: emptyCounts(),
    game: emptyCounts(),
  };
  for (const item of SEED_ITEMS) {
    accumulate(typeCounts[item.type], await seedContentItem(client, item));
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\nSummary:');
  printSummary('categories', catCounts);
  for (const [type, counts] of Object.entries(typeCounts)) {
    printSummary(type, counts);
  }

  const totalFailed =
    catCounts.failed +
    Object.values(typeCounts).reduce((sum, c) => sum + c.failed, 0);

  if (totalFailed > 0) {
    console.error(`\n❌ ${totalFailed} insert(s) failed. See errors above.`);
    process.exit(1);
  }

  console.log('\n✅ Seed complete.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
