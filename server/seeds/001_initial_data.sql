-- 001_initial_data.sql
-- Seed data for Balanced Digital Children's Platform
-- Baseline content: 20 stories, 10 games, 15 videos, 8 creative activities

-- ── Stories (20) ──
INSERT INTO content_items (title, type, category, description, min_age, max_age, thumbnail_url, sort_order) VALUES
('The Brave Little Turtle', 'story', 'Adventure', 'A tiny turtle crosses a big ocean to find his family.', 2, 7, '🐢', 1),
('Luna and the Magic Forest', 'story', 'Fantasy', 'Luna discovers a hidden forest where animals can talk.', 2, 7, '🌙', 2),
('The Kind Dragon', 'story', 'Fantasy', 'A dragon who cannot breathe fire learns that kindness is his real power.', 4, 10, '🐉', 3),
('Sam the Starfish Explorer', 'story', 'Adventure', 'Sam explores the coral reef and meets colorful sea creatures.', 2, 5, '⭐', 4),
('The Honest Woodcutter', 'story', 'Education', 'A woodcutter learns that honesty is always the best policy.', 5, 10, '🪓', 5),
('Mia''s Magic Paintbrush', 'story', 'Fantasy', 'Mia paints a door that leads to a world where her drawings come alive.', 4, 8, '🎨', 6),
('The Lost Kitten', 'story', 'Education', 'Two friends work together to find a lost kitten in their neighborhood.', 2, 5, '🐱', 7),
('A Journey to the Stars', 'story', 'Science', 'A young astronaut travels to distant planets and learns about space.', 5, 10, '🚀', 8),
('The Patience Garden', 'story', 'Education', 'A little girl plants seeds and learns that good things take time to grow.', 2, 5, '🌱', 9),
('Benny the Bee Learns to Share', 'story', 'Education', 'Benny discovers that sharing honey makes everyone happier.', 2, 5, '🐝', 10),
('The Secret of the Old Lighthouse', 'story', 'Mystery', 'Two siblings solve the mystery of a lighthouse that lights up by itself.', 5, 10, '🗼', 11),
('Captain Courage and the Storm', 'story', 'Adventure', 'A young captain sails through a big storm with bravery and quick thinking.', 4, 8, '⛵', 12),
('The Best Birthday Ever', 'story', 'Slice of Life', 'A child learns that the best gifts come from the heart, not from a store.', 2, 5, '🎂', 13),
('Robot Rex and the Code Quest', 'story', 'Science', 'A friendly robot teaches kids how to solve problems with simple coding logic.', 5, 10, '🤖', 14),
('The Friendship Tree', 'story', 'Slice of Life', 'A new kid in town finds friends under an old oak tree.', 4, 8, '🌳', 15),
('Nina and the Noisy City', 'story', 'Slice of Life', 'Nina discovers the quiet beauty hidden within her busy city.', 4, 8, '🏙️', 16),
('The Great Pillow Fort', 'story', 'Adventure', 'A rainy day becomes an epic indoor adventure with blankets and pillows.', 2, 5, '🛏️', 17),
('Eco Heroes: Save the River', 'story', 'Science', 'A group of kids clean up their local river and learn about protecting nature.', 5, 10, '🌊', 18),
('The Little Cloud That Could', 'story', 'Fantasy', 'A small cloud learns that even the tiniest clouds can make a big rain.', 2, 5, '☁️', 19),
('Thank You, Chef Bear', 'story', 'Education', 'Chef Bear teaches the forest animals (and readers) about healthy eating.', 4, 8, '🧸', 20);

-- ── Games (10) ──
INSERT INTO content_items (title, type, category, description, min_age, max_age, thumbnail_url, sort_order) VALUES
('Shape Sorter Adventure', 'game', 'Puzzles', 'Drag and drop shapes into matching holes to build a castle.', 2, 5, '🔷', 1),
('Memory Match Kingdom', 'game', 'Puzzles', 'Flip cards to find matching pairs of animals and objects.', 2, 5, '🃏', 2),
('Math Mountain', 'game', 'Education', 'Solve simple math problems to climb the mountain to the treasure.', 5, 10, '⛰️', 3),
('Word Builder Town', 'game', 'Education', 'Build words by combining letters and sounds in a fun town setting.', 4, 8, '📝', 4),
('Color Splash Studio', 'game', 'Creative', 'Mix colors and paint digital canvases with magical effects.', 2, 7, '🎨', 5),
('Puzzle Party', 'game', 'Puzzles', 'Assemble jigsaw puzzles with beautifully illustrated scenes.', 4, 10, '🧩', 6),
('Code Commander', 'game', 'Education', 'Drag and drop command blocks to guide a robot through obstacles.', 5, 10, '💻', 7),
('Rhythm Rockets', 'game', 'Music', 'Tap along to musical patterns to launch rockets into space.', 4, 8, '🎵', 8),
('Number Farm', 'game', 'Education', 'Count animals and harvest crops to learn numbers 1 through 20.', 2, 5, '🐄', 9),
('Logic Labyrinth', 'game', 'Puzzles', 'Navigate through mazes using logic gates and directional clues.', 5, 10, '🌀', 10);

-- ── Videos (15) ──
INSERT INTO content_items (title, type, category, description, min_age, max_age, thumbnail_url, sort_order) VALUES
('How Does a Caterpillar Become a Butterfly?', 'video', 'Science', 'A beautiful time-lapse journey of metamorphosis explained for kids.', 4, 10, '🦋', 1),
('The Solar System Song', 'video', 'Music', 'Sing along with planets as they orbit the sun in this catchy tune.', 2, 7, '🌞', 2),
('Why Is the Sky Blue?', 'video', 'Science', 'A simple animated explanation of light scattering for young minds.', 4, 8, '🌤️', 3),
('Yoga for Kids: Morning Stretch', 'video', 'Health', 'A 5-minute morning yoga routine with cute animal poses.', 2, 7, '🧘', 4),
('The Water Cycle Adventure', 'video', 'Science', 'Follow a water droplet through evaporation, clouds, and rain.', 4, 8, '💧', 5),
('Alphabet Dance Party', 'video', 'Music', 'Dance and learn the alphabet with high-energy music and animation.', 2, 5, '🔤', 6),
('How to Draw a Friendly Monster', 'video', 'Creative', 'Step-by-step drawing tutorial for creating your own cute monster.', 4, 10, '👾', 7),
('The Story of Gravity', 'video', 'Science', 'Why do things fall down? A fun introduction to gravity with experiments.', 5, 10, '🍎', 8),
('Animal Sounds Safari', 'video', 'Education', 'Visit different animals and learn the sounds they make.', 2, 4, '🐘', 9),
('Mindful Breathing for Kids', 'video', 'Health', 'A guided breathing exercise to help kids calm down and focus.', 4, 10, '🌬️', 10),
('Fossil Hunt: Dinosaurs!', 'video', 'Science', 'A virtual dinosaur dig where kids learn about fossils and paleontology.', 5, 10, '🦕', 11),
('The Rainbow Color Song', 'video', 'Music', 'Learn colors through a joyful rainbow song with playful animations.', 2, 5, '🌈', 12),
('Recycling at Home', 'video', 'Education', 'How to sort waste and why recycling matters for our planet.', 4, 8, '♻️', 13),
('Ocean Wonders', 'video', 'Science', 'Explore the deep ocean and meet glowing sea creatures.', 4, 8, '🐠', 14),
('Stretchy the Slime Maker', 'video', 'Creative', 'A safe, fun DIY slime recipe kids can try with parental supervision.', 5, 10, '🧪', 15);

-- ── Creative Activities (8) ──
INSERT INTO content_items (title, type, category, description, min_age, max_age, thumbnail_url, sort_order) VALUES
('Magic Canvas', 'creative', 'Art', 'A blank canvas with unlimited colors, brushes, and magical effects.', 2, 10, '🎨', 1),
('Build-a-Bot Workshop', 'creative', 'Building', 'Assemble 3D robot characters using drag-and-drop parts.', 4, 10, '🤖', 2),
('Sticker World', 'creative', 'Art', 'Decorate scenes with hundreds of fun stickers and backgrounds.', 2, 7, '⭐', 3),
('Paper Plane Designer', 'creative', 'Building', 'Design and fold virtual paper airplanes and test how they fly.', 5, 10, '✈️', 4),
('Musical Instrument Studio', 'creative', 'Music', 'Play virtual instruments and compose your own simple melodies.', 4, 10, '🎹', 5),
('Nature Collage Maker', 'creative', 'Art', 'Combine leaves, flowers, and natural elements into beautiful collages.', 2, 7, '🌿', 6),
('Story Creator', 'creative', 'Writing', 'Write and illustrate your own short stories with guided prompts.', 5, 10, '📖', 7),
('Pattern Palace', 'creative', 'Art', 'Create colorful patterns and tessellations with geometric shapes.', 4, 8, '🔶', 8);
