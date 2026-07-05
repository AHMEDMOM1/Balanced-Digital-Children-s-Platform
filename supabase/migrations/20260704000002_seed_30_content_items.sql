-- Migration: Seed 30 new content items

INSERT INTO public.content_items (
  title, type, category, min_age, max_age, thumbnail_url, is_active, 
  url, duration_seconds, content_text, assets_url, game_type, config_json
) VALUES
  ('Bella the Bunny Finds a Friend', 'story', 'animals', 2, 4, 'https://picsum.photos/seed/bellabunny/400/300', true, NULL, NULL, 'Bella the bunny hopped through the meadow every morning looking for someone to play with. She had soft white fur and the longest ears in the whole field.

One sunny day she heard a tiny squeak behind a big sunflower. It was a little field mouse named Mimi who was too shy to say hello. Bella gently wiggled her nose and said, "Do you want to play hide and seek?"

From that morning on, Bella and Mimi played together every day. Bella learned that sometimes the best friends are the ones who are quiet and small — you just have to listen carefully to find them.', NULL, NULL, NULL),
  ('Helping Hands at Home', 'story', 'social', 2, 4, 'https://picsum.photos/seed/helpinghands/400/300', true, NULL, NULL, 'Little Noor loved watching her mother cook in the kitchen. The pots bubbled and the spoons clinked together like tiny bells. One day Mama said, "Would you like to help me?"

Noor carefully washed three tomatoes and put them in a bowl. She stirred the soup slowly while Mama held the handle. When Papa came home, he tasted the soup and said, "This is the best soup I have ever had!"

Noor smiled the biggest smile because she learned that helping others makes everything taste better — especially when you do it with love.', NULL, NULL, NULL),
  ('The Singing Rain', 'story', 'nature', 2, 4, 'https://picsum.photos/seed/singingrain/400/300', true, NULL, NULL, 'Drip, drop, drip, drop — the rain tapped on the window like tiny fingers playing a drum. Little Sam pressed his nose against the glass and watched the puddles grow in the garden.

When the rain stopped, a beautiful rainbow stretched across the sky. Sam ran outside and splashed in every single puddle, laughing as the water sparkled in the sunlight.

That night Sam told his teddy bear, "Rain is not sad, it is just the sky singing so flowers can dance." And he fell asleep listening to the last gentle drops on the roof.', NULL, NULL, NULL),
  ('The Curious Caterpillar', 'story', 'science', 5, 7, 'https://picsum.photos/seed/curiouscaterpillar/400/300', true, NULL, NULL, 'Carl the caterpillar had fourteen tiny legs and one enormous curiosity. Every day he asked a new question: Why is the sky blue? Why do leaves fall? Where does the wind come from?

One morning Carl woke up feeling very sleepy. He wrapped himself in a silky cocoon and slept for two whole weeks. When he finally woke up and stretched, he discovered he had two beautiful wings covered in orange and black patterns.

Carl realised that sometimes the biggest changes happen when you are patient and trust the process. He flew up high and finally saw where the wind came from — everywhere and nowhere, all at once.', NULL, NULL, NULL),
  ('The New Kid at School', 'story', 'social', 5, 7, 'https://picsum.photos/seed/newkidschool/400/300', true, NULL, NULL, 'Yara walked into her new classroom holding her backpack straps tightly. Everyone already had friends and she did not know a single name. She sat at the last desk and opened her notebook quietly.

At break time a boy named Adam noticed Yara drawing a spaceship. "That is amazing!" he said. "Can you teach me how to draw the wings?" Soon three more children gathered around to watch.

By the end of the week Yara had a whole table of friends. She learned that you do not need to say a lot of words to make friends — sometimes sharing what you love is the best introduction.', NULL, NULL, NULL),
  ('The River That Remembered', 'story', 'nature', 5, 7, 'https://picsum.photos/seed/riverremember/400/300', true, NULL, NULL, 'Deep in the valley there was a river that remembered everything. It remembered every leaf that fell on its surface, every fish that swam in its current, and every child who skipped stones across its water.

One summer, the river began to dry up because the rains did not come. The animals were worried. A young deer named Fawn walked upstream for three days until she found a beaver dam blocking the water.

Fawn and the beavers worked together to build a new channel so the water could flow to everyone. The river was full again, and it remembered Fawn as the bravest deer it had ever known.', NULL, NULL, NULL),
  ('The Girl Who Built a Robot', 'story', 'science', 8, 10, 'https://picsum.photos/seed/girlrobot/400/300', true, NULL, NULL, 'Maya spent every afternoon in her garage surrounded by wires, motors, and old computer parts. Her dream was to build a robot that could water her grandmother''s garden while Grandma rested.

After six weeks of trying and failing, Maya finally got her robot to roll forward, turn left, and spray water from a small nozzle. It was not perfect — it sometimes watered the cat instead of the flowers — but it worked.

When Grandma saw the robot watering her roses, she hugged Maya and said, "The most beautiful inventions come from a heart that wants to help." Maya decided she would build robots for the rest of her life.', NULL, NULL, NULL),
  ('The Secret Code Club', 'story', 'social', 8, 10, 'https://picsum.photos/seed/secretcode/400/300', true, NULL, NULL, 'Three friends — Zain, Leila, and Omar — created a secret club where they communicated using codes. They wrote messages by shifting each letter three places in the alphabet, so "A" became "D" and "B" became "E".

One day they found a coded note in the library that was not from any of them. It read: "PHHW PH DW WKH ROG RDN WUHH." They decoded it together: "MEET ME AT THE OLD OAK TREE."

At the old oak tree they found their librarian, Mrs. Hala, who had been leaving coded book recommendations for curious students all year. She invited them to help her create puzzles for other children. The three friends learned that knowledge is the best kind of secret — the kind that gets better when you share it.', NULL, NULL, NULL),
  ('The Mountain and the Cloud', 'story', 'nature', 8, 10, 'https://picsum.photos/seed/mountaincloud/400/300', true, NULL, NULL, 'High above the valley stood a proud mountain who had not moved in ten thousand years. Every day a playful cloud drifted past and said, "Come travel with me! I have seen oceans and cities and deserts." The mountain always replied, "I cannot move. I am stuck here forever."

One winter the cloud returned carrying snow and gently placed it on the mountain''s peak. "You may not be able to travel," said the cloud, "but rivers flow from your snow to the ocean. Through your rivers, you have already touched every shore in the world."

The mountain understood that you do not need to move to make a difference — sometimes staying strong in one place helps the whole world around you.', NULL, NULL, NULL),
  ('Count the Stars', 'game', 'math', 2, 4, 'https://picsum.photos/seed/countstars/400/300', true, NULL, NULL, NULL, NULL, 'counting', '{"type":"counting","question":"How many stars are in the sky?","image_url":"https://picsum.photos/seed/nightstars/400/300","correct_answer":4,"choices":[2,3,4,5]}'::jsonb),
  ('Match the Baby Animals', 'game', 'animals', 2, 4, 'https://picsum.photos/seed/babyanimals/400/300', true, NULL, NULL, NULL, NULL, 'matching', '{"type":"matching","pairs":[{"item":"Kitten","image":"https://picsum.photos/seed/kitten/200/200"},{"item":"Puppy","image":"https://picsum.photos/seed/puppy/200/200"},{"item":"Chick","image":"https://picsum.photos/seed/chick/200/200"}]}'::jsonb),
  ('How Many Planets?', 'game', 'science', 5, 7, 'https://picsum.photos/seed/planetcount/400/300', true, NULL, NULL, NULL, NULL, 'counting', '{"type":"counting","question":"How many planets are shown in this picture?","image_url":"https://picsum.photos/seed/solarsystem/400/300","correct_answer":6,"choices":[4,5,6,7]}'::jsonb),
  ('Match the Shapes', 'game', 'math', 5, 7, 'https://picsum.photos/seed/matchshapes/400/300', true, NULL, NULL, NULL, NULL, 'matching', '{"type":"matching","pairs":[{"item":"Circle","image":"https://picsum.photos/seed/circle/200/200"},{"item":"Square","image":"https://picsum.photos/seed/square/200/200"},{"item":"Triangle","image":"https://picsum.photos/seed/triangle/200/200"},{"item":"Star","image":"https://picsum.photos/seed/starshape/200/200"}]}'::jsonb),
  ('Count the Molecules', 'game', 'science', 8, 10, 'https://picsum.photos/seed/molecules/400/300', true, NULL, NULL, NULL, NULL, 'counting', '{"type":"counting","question":"How many water molecules are in the diagram?","image_url":"https://picsum.photos/seed/watermolecules/400/300","correct_answer":8,"choices":[6,7,8,9]}'::jsonb),
  ('Math Symbol Match', 'game', 'math', 8, 10, 'https://picsum.photos/seed/mathsymbols/400/300', true, NULL, NULL, NULL, NULL, 'matching', '{"type":"matching","pairs":[{"item":"Plus","image":"https://picsum.photos/seed/plussign/200/200"},{"item":"Minus","image":"https://picsum.photos/seed/minussign/200/200"},{"item":"Multiply","image":"https://picsum.photos/seed/multiplysign/200/200"}]}'::jsonb),
  ('ABC Alphabet Song for Toddlers', 'video', 'math', 2, 4, 'https://picsum.photos/seed/abcsong/400/300', true, 'https://www.youtube.com/watch?v=75p-N9YKqNo', 200, NULL, NULL, NULL, NULL),
  ('Baby Animals and Their Sounds', 'video', 'animals', 2, 4, 'https://picsum.photos/seed/babyanimalvid/400/300', true, 'https://www.youtube.com/watch?v=zXEq-QO3xTg', 210, NULL, NULL, NULL, NULL),
  ('Rain and Rainbow — Nature for Kids', 'video', 'nature', 2, 4, 'https://picsum.photos/seed/rainrainbow/400/300', true, 'https://www.youtube.com/watch?v=bUmUBOcNbQE', 160, NULL, NULL, NULL, NULL),
  ('How Does a Volcano Work?', 'video', 'science', 5, 7, 'https://picsum.photos/seed/volcano/400/300', true, 'https://www.youtube.com/watch?v=lAmqsMQG3RM', 280, NULL, NULL, NULL, NULL),
  ('Life of a Seed — From Soil to Tree', 'video', 'nature', 5, 7, 'https://picsum.photos/seed/seedtotree/400/300', true, 'https://www.youtube.com/watch?v=tkFPyue5X3Q', 250, NULL, NULL, NULL, NULL),
  ('Being Kind — Social Skills for Kids', 'video', 'social', 5, 7, 'https://picsum.photos/seed/bekind/400/300', true, 'https://www.youtube.com/watch?v=kAo4-2UzgPo', 230, NULL, NULL, NULL, NULL),
  ('The Water Cycle Explained', 'video', 'science', 8, 10, 'https://picsum.photos/seed/watercycle/400/300', true, 'https://www.youtube.com/watch?v=ncORPosDrjI', 310, NULL, NULL, NULL, NULL),
  ('Fun with Fractions', 'video', 'math', 8, 10, 'https://picsum.photos/seed/fractions/400/300', true, 'https://www.youtube.com/watch?v=n0FZhQ_GkKw', 290, NULL, NULL, NULL, NULL),
  ('Ecosystems — How Nature Works Together', 'video', 'nature', 8, 10, 'https://picsum.photos/seed/ecosystem/400/300', true, 'https://www.youtube.com/watch?v=5eTCZ9L834s', 340, NULL, NULL, NULL, NULL),
  ('Colour the Flowers', 'creative', 'nature', 2, 4, 'https://picsum.photos/seed/colourflowers/400/300', true, NULL, NULL, NULL, 'https://picsum.photos/seed/flowercolouring/800/600.png', NULL, NULL),
  ('Trace the Animals', 'creative', 'animals', 2, 4, 'https://picsum.photos/seed/traceanimals/400/300', true, NULL, NULL, NULL, 'https://picsum.photos/seed/animaltrace/800/600.png', NULL, NULL),
  ('Draw the Solar System', 'creative', 'science', 5, 7, 'https://picsum.photos/seed/drawplanets/400/300', true, NULL, NULL, NULL, 'https://picsum.photos/seed/solarsystemdraw/800/600.png', NULL, NULL),
  ('Design a Friendship Card', 'creative', 'social', 5, 7, 'https://picsum.photos/seed/friendcard/400/300', true, NULL, NULL, NULL, 'https://picsum.photos/seed/friendshipcard/800/600.png', NULL, NULL),
  ('Build a Nature Journal Page', 'creative', 'nature', 8, 10, 'https://picsum.photos/seed/naturejournal/400/300', true, NULL, NULL, NULL, 'https://picsum.photos/seed/journalpage/800/600.png', NULL, NULL),
  ('Design a Simple Machine', 'creative', 'science', 8, 10, 'https://picsum.photos/seed/simplemachine/400/300', true, NULL, NULL, NULL, 'https://picsum.photos/seed/machinedesign/800/600.png', NULL, NULL);
