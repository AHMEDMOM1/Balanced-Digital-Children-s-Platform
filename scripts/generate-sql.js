const fs = require('fs');

// ════════════════════════════════════════════════════════════════════════════
// 33 Content Items — Arabic titles, organized by type and age group
// ════════════════════════════════════════════════════════════════════════════

const SEED_ITEMS = [
  // ── STORIES ─────────────────────────────────────────────────────────────
  // Stories (2-4)
  {
    title: 'بيلا الأرنوبة تجد صديقة',
    type: 'story',
    category: 'animals',
    min_age: 2, max_age: 4,
    thumbnail_url: 'https://picsum.photos/seed/bellabunny/400/300',
    content_text: `بيلا أرنوبة صغيرة بفرو أبيض ناعم وأذنين طويلتين. كل صباح تقفز في المرج الأخضر وتبحث عن صديق يلعب معها، لكنها لا تجد أحداً.

في يوم مشمس سمعت صوتاً خافتاً خلف زهرة عباد الشمس الكبيرة. كان فأراً صغيراً اسمه ميمي، خجولاً جداً ولا يجرؤ على قول مرحباً. هزّت بيلا أنفها بلطف وقالت: "هل تريدين أن نلعب الغميضة؟"

من ذلك الصباح أصبحت بيلا وميمي صديقتين تلعبان كل يوم. تعلّمت بيلا أن أفضل الأصدقاء قد يكونون هادئين وصغاراً — فقط عليك أن تصغي جيداً لتجدهم.`,
    is_active: true,
  },
  {
    title: 'أيادي المساعدة في البيت',
    type: 'story',
    category: 'social',
    min_age: 2, max_age: 4,
    thumbnail_url: 'https://picsum.photos/seed/helpinghands/400/300',
    content_text: `نور الصغيرة تحب مشاهدة ماما وهي تطبخ في المطبخ. القدور تغلي والملاعق ترن مثل أجراس صغيرة. في يوم قالت ماما: "هل تحبين أن تساعديني؟"

غسلت نور ثلاث حبات طماطم بعناية ووضعتها في الوعاء. حرّكت الشوربة ببطء بينما ماما تمسك المقبض. لما رجع بابا من العمل ذاق الشوربة وقال: "هذه أطيب شوربة أكلتها في حياتي!"

ابتسمت نور أكبر ابتسامة لأنها تعلّمت أن مساعدة الآخرين تجعل كل شيء ألذ — خاصة حين تفعلها بحب.`,
    is_active: true,
  },
  {
    title: 'أغنية المطر',
    type: 'story',
    category: 'nature',
    min_age: 2, max_age: 4,
    thumbnail_url: 'https://picsum.photos/seed/singingrain/400/300',
    content_text: `طق، طق، طق — المطر يطرق على النافذة مثل أصابع صغيرة تعزف على طبل. سامر الصغير ألصق أنفه بالزجاج وراقب البرك تكبر في الحديقة.

لما توقف المطر ظهر قوس قزح جميل يمتد عبر السماء. ركض سامر للخارج وقفز في كل بركة ضاحكاً بينما الماء يلمع تحت أشعة الشمس.

في تلك الليلة قال سامر لدبّه: "المطر ليس حزيناً، إنه فقط السماء تغني حتى ترقص الأزهار." ونام وهو يستمع لآخر القطرات اللطيفة على السقف.`,
    is_active: true,
  },

  // Stories (5-7)
  {
    title: 'اليرقة الفضولية',
    type: 'story',
    category: 'science',
    min_age: 5, max_age: 7,
    thumbnail_url: 'https://picsum.photos/seed/curiouscaterpillar/400/300',
    content_text: `كارل يرقة صغيرة بأربع عشرة رجلاً دقيقة وفضول هائل. كل يوم يسأل سؤالاً جديداً: لماذا السماء زرقاء؟ لماذا تسقط الأوراق؟ من أين تأتي الرياح؟

ذات صباح استيقظ كارل وهو يشعر بنعاس شديد. لفّ نفسه في شرنقة حريرية ونام أسبوعين كاملين. حين استيقظ أخيراً ومدّ جسمه، اكتشف أن لديه جناحين جميلين مغطيين بأنماط برتقالية وسوداء.

أدرك كارل أن أكبر التغييرات تحدث حين تكون صبوراً وتثق بالعملية. طار عالياً وأخيراً رأى من أين تأتي الرياح — من كل مكان ومن لا مكان في نفس الوقت.`,
    is_active: true,
  },
  {
    title: 'الطالب الجديد في المدرسة',
    type: 'story',
    category: 'social',
    min_age: 5, max_age: 7,
    thumbnail_url: 'https://picsum.photos/seed/newkidschool/400/300',
    content_text: `يارا دخلت فصلها الجديد ممسكة بحمّالات حقيبتها بقوة. كل الطلاب لديهم أصدقاء بالفعل وهي لا تعرف اسماً واحداً. جلست في آخر مقعد وفتحت دفترها بهدوء.

في الاستراحة لاحظ ولد اسمه آدم أن يارا ترسم سفينة فضاء. قال: "هذا مذهل! هل تعلّميني كيف أرسم الأجنحة؟" سريعاً تجمّع ثلاثة أطفال آخرين ليشاهدوا.

بنهاية الأسبوع كان ليارا طاولة كاملة من الأصدقاء. تعلّمت أنك لا تحتاج كثيراً من الكلمات لتكوين صداقات — أحياناً مشاركة ما تحب هي أفضل طريقة للتعارف.`,
    is_active: true,
  },
  {
    title: 'النهر الذي يتذكر',
    type: 'story',
    category: 'nature',
    min_age: 5, max_age: 7,
    thumbnail_url: 'https://picsum.photos/seed/riverremember/400/300',
    content_text: `في عمق الوادي كان هناك نهر يتذكر كل شيء. يتذكر كل ورقة سقطت على سطحه، وكل سمكة سبحت في تياره، وكل طفل رمى حجراً عبر مائه.

في صيف واحد بدأ النهر يجف لأن الأمطار لم تأتِ. الحيوانات قلقت. غزالة صغيرة اسمها فون مشت ضد التيار ثلاثة أيام حتى وجدت سداً بناه القنادس يحجز الماء.

عملت فون مع القنادس لبناء قناة جديدة ليتدفق الماء للجميع. امتلأ النهر مرة أخرى وتذكر فون كأشجع غزالة عرفها على الإطلاق.`,
    is_active: true,
  },

  // Stories (8-10)
  {
    title: 'الفتاة التي بنت روبوتاً',
    type: 'story',
    category: 'science',
    min_age: 8, max_age: 10,
    thumbnail_url: 'https://picsum.photos/seed/girlrobot/400/300',
    content_text: `مايا تقضي كل عصر في مرآبها محاطة بالأسلاك والمحركات وقطع الكمبيوتر القديمة. حلمها أن تبني روبوتاً يسقي حديقة جدتها بينما ترتاح الجدة.

بعد ستة أسابيع من المحاولة والفشل، نجحت مايا أخيراً في جعل الروبوت يتحرك للأمام وينعطف يساراً ويرش الماء من فوهة صغيرة. لم يكن مثالياً — أحياناً كان يسقي القطة بدل الأزهار — لكنه عمل.

حين رأت الجدة الروبوت يسقي وردها، عانقت مايا وقالت: "أجمل الاختراعات تأتي من قلب يريد المساعدة." قررت مايا أنها ستبني الروبوتات طوال حياتها.`,
    is_active: true,
  },
  {
    title: 'نادي الشيفرة السرية',
    type: 'story',
    category: 'social',
    min_age: 8, max_age: 10,
    thumbnail_url: 'https://picsum.photos/seed/secretcode/400/300',
    content_text: `ثلاثة أصدقاء — زين وليلى وعمر — أنشأوا نادياً سرياً يتواصلون فيه بالشيفرات. كانوا يكتبون الرسائل بتحريك كل حرف ثلاثة مواقع في الأبجدية.

ذات يوم وجدوا رسالة مشفرة في المكتبة ليست من أي منهم. فكّوا شيفرتها معاً وقرأوا: "قابلوني عند شجرة البلوط القديمة."

عند شجرة البلوط وجدوا أمينة المكتبة السيدة هالة، التي كانت تترك توصيات كتب مشفرة للطلاب الفضوليين طوال العام. دعتهم لمساعدتها في صنع ألغاز للأطفال الآخرين. تعلّم الأصدقاء الثلاثة أن المعرفة هي أفضل نوع من الأسرار — النوع الذي يصبح أفضل حين تشاركه.`,
    is_active: true,
  },
  {
    title: 'الجبل والسحابة',
    type: 'story',
    category: 'nature',
    min_age: 8, max_age: 10,
    thumbnail_url: 'https://picsum.photos/seed/mountaincloud/400/300',
    content_text: `عالياً فوق الوادي وقف جبل فخور لم يتحرك منذ عشرة آلاف سنة. كل يوم تمر سحابة مرحة وتقول: "تعال سافر معي! رأيت محيطات ومدناً وصحاري." والجبل يجيب دائماً: "لا أستطيع التحرك. أنا عالق هنا للأبد."

في شتاء عادت السحابة حاملة ثلجاً ووضعته برفق على قمة الجبل. قالت: "قد لا تستطيع السفر، لكن الأنهار تتدفق من ثلجك إلى المحيط. عبر أنهارك لمست بالفعل كل شاطئ في العالم."

فهم الجبل أنك لا تحتاج أن تتحرك لتُحدث فرقاً — أحياناً البقاء قوياً في مكان واحد يساعد العالم كله من حولك.`,
    is_active: true,
  },
  {
    title: 'الكنز المخفي',
    type: 'story',
    category: 'animals',
    min_age: 5, max_age: 7,
    thumbnail_url: 'https://picsum.photos/seed/hiddentreasure/400/300',
    content_text: `في غابة خضراء كثيفة عاش سنجاب صغير اسمه بندق. كان بندق يجمع الجوز كل خريف ويخبئه في أماكن سرية بين جذور الأشجار. لكن هذا الشتاء نسي أين خبّأ كنزه!

طلب بندق المساعدة من صديقته البومة زيتونة. قالت: "أنا أرى في الظلام لكنني لا أعرف أين خبّأت الجوز. لنسأل الفأر حمزة فهو يعرف كل الأنفاق تحت الأرض." ذهبوا معاً وبحثوا بين الجذور والصخور.

وجدوا الجوز أخيراً لكنهم وجدوا شيئاً أجمل — وجدوا أن العمل معاً أمتع بكثير من العمل وحدك. قرر بندق أن يشارك كنزه مع أصدقائه الذين ساعدوه.`,
    is_active: true,
  },

  // ── GAMES ──────────────────────────────────────────────────────────────
  // Games (2-4)
  {
    title: 'عُدّ النجوم',
    type: 'game',
    game_type: 'counting',
    category: 'math',
    min_age: 2, max_age: 4,
    thumbnail_url: 'https://picsum.photos/seed/countstars/400/300',
    config_json: { type: 'counting', question: 'كم نجمة في السماء؟', image_url: 'https://picsum.photos/seed/nightstars/400/300', correct_answer: 4, choices: [2, 3, 4, 5] },
    is_active: true,
  },
  {
    title: 'طابق الحيوانات الصغيرة',
    type: 'game',
    game_type: 'matching',
    category: 'animals',
    min_age: 2, max_age: 4,
    thumbnail_url: 'https://picsum.photos/seed/babyanimals/400/300',
    config_json: { type: 'matching', pairs: [
      { item: 'قطة', image: 'https://picsum.photos/seed/kitten/200/200' },
      { item: 'جرو', image: 'https://picsum.photos/seed/puppy/200/200' },
      { item: 'كتكوت', image: 'https://picsum.photos/seed/chick/200/200' },
    ]},
    is_active: true,
  },

  // Games (5-7)
  {
    title: 'كم كوكباً؟',
    type: 'game',
    game_type: 'counting',
    category: 'science',
    min_age: 5, max_age: 7,
    thumbnail_url: 'https://picsum.photos/seed/planetcount/400/300',
    config_json: { type: 'counting', question: 'كم كوكباً ظاهراً في الصورة؟', image_url: 'https://picsum.photos/seed/solarsystem/400/300', correct_answer: 6, choices: [4, 5, 6, 7] },
    is_active: true,
  },
  {
    title: 'طابق الأشكال',
    type: 'game',
    game_type: 'matching',
    category: 'math',
    min_age: 5, max_age: 7,
    thumbnail_url: 'https://picsum.photos/seed/matchshapes/400/300',
    config_json: { type: 'matching', pairs: [
      { item: 'دائرة', image: 'https://picsum.photos/seed/circle/200/200' },
      { item: 'مربع', image: 'https://picsum.photos/seed/square/200/200' },
      { item: 'مثلث', image: 'https://picsum.photos/seed/triangle/200/200' },
      { item: 'نجمة', image: 'https://picsum.photos/seed/starshape/200/200' },
    ]},
    is_active: true,
  },
  {
    title: 'رتّب الأرقام',
    type: 'game',
    game_type: 'sorting',
    category: 'math',
    min_age: 5, max_age: 7,
    thumbnail_url: 'https://picsum.photos/seed/sortnumbers/400/300',
    config_json: { type: 'sorting', instruction: 'رتّب الأرقام من الأصغر إلى الأكبر', items: [5, 2, 8, 1, 4], correct_order: [1, 2, 4, 5, 8] },
    is_active: true,
  },

  // Games (8-10)
  {
    title: 'عُدّ الجزيئات',
    type: 'game',
    game_type: 'counting',
    category: 'science',
    min_age: 8, max_age: 10,
    thumbnail_url: 'https://picsum.photos/seed/molecules/400/300',
    config_json: { type: 'counting', question: 'كم جزيء ماء في الرسم؟', image_url: 'https://picsum.photos/seed/watermolecules/400/300', correct_answer: 8, choices: [6, 7, 8, 9] },
    is_active: true,
  },
  {
    title: 'طابق رموز الرياضيات',
    type: 'game',
    game_type: 'matching',
    category: 'math',
    min_age: 8, max_age: 10,
    thumbnail_url: 'https://picsum.photos/seed/mathsymbols/400/300',
    config_json: { type: 'matching', pairs: [
      { item: 'جمع', image: 'https://picsum.photos/seed/plussign/200/200' },
      { item: 'طرح', image: 'https://picsum.photos/seed/minussign/200/200' },
      { item: 'ضرب', image: 'https://picsum.photos/seed/multiplysign/200/200' },
    ]},
    is_active: true,
  },
  {
    title: 'اختبار العلوم',
    type: 'game',
    game_type: 'quiz',
    category: 'science',
    min_age: 8, max_age: 10,
    thumbnail_url: 'https://picsum.photos/seed/sciencequiz/400/300',
    config_json: { type: 'quiz', questions: [
      { question: 'ما أقرب كوكب إلى الشمس؟', choices: ['الزهرة', 'عطارد', 'الأرض', 'المريخ'], correct_index: 1 },
      { question: 'ما الغاز الذي نتنفسه؟', choices: ['النيتروجين', 'ثاني أكسيد الكربون', 'الأكسجين', 'الهيدروجين'], correct_index: 2 },
      { question: 'كم عدد أرجل العنكبوت؟', choices: ['6', '8', '10', '4'], correct_index: 1 },
    ]},
    is_active: true,
  },

  // ── VIDEOS ─────────────────────────────────────────────────────────────
  // Videos (2-4)
  {
    title: 'أغنية الحروف العربية',
    type: 'video',
    category: 'math',
    min_age: 2, max_age: 4,
    url: 'https://www.youtube.com/watch?v=75p-N9YKqNo',
    thumbnail_url: 'https://picsum.photos/seed/abcsong/400/300',
    duration_seconds: 200,
    is_active: true,
  },
  {
    title: 'أصوات الحيوانات للأطفال',
    type: 'video',
    category: 'animals',
    min_age: 2, max_age: 4,
    url: 'https://www.youtube.com/watch?v=zXEq-QO3xTg',
    thumbnail_url: 'https://picsum.photos/seed/babyanimalvid/400/300',
    duration_seconds: 210,
    is_active: true,
  },
  {
    title: 'المطر وقوس القزح',
    type: 'video',
    category: 'nature',
    min_age: 2, max_age: 4,
    url: 'https://www.youtube.com/watch?v=bUmUBOcNbQE',
    thumbnail_url: 'https://picsum.photos/seed/rainrainbow/400/300',
    duration_seconds: 160,
    is_active: true,
  },

  // Videos (5-7)
  {
    title: 'كيف يعمل البركان؟',
    type: 'video',
    category: 'science',
    min_age: 5, max_age: 7,
    url: 'https://www.youtube.com/watch?v=lAmqsMQG3RM',
    thumbnail_url: 'https://picsum.photos/seed/volcano/400/300',
    duration_seconds: 280,
    is_active: true,
  },
  {
    title: 'رحلة البذرة — من التربة إلى الشجرة',
    type: 'video',
    category: 'nature',
    min_age: 5, max_age: 7,
    url: 'https://www.youtube.com/watch?v=tkFPyue5X3Q',
    thumbnail_url: 'https://picsum.photos/seed/seedtotree/400/300',
    duration_seconds: 250,
    is_active: true,
  },
  {
    title: 'اللطف — مهارات اجتماعية للأطفال',
    type: 'video',
    category: 'social',
    min_age: 5, max_age: 7,
    url: 'https://www.youtube.com/watch?v=kAo4-2UzgPo',
    thumbnail_url: 'https://picsum.photos/seed/bekind/400/300',
    duration_seconds: 230,
    is_active: true,
  },

  // Videos (8-10)
  {
    title: 'دورة الماء في الطبيعة',
    type: 'video',
    category: 'science',
    min_age: 8, max_age: 10,
    url: 'https://www.youtube.com/watch?v=ncORPosDrjI',
    thumbnail_url: 'https://picsum.photos/seed/watercycle/400/300',
    duration_seconds: 310,
    is_active: true,
  },
  {
    title: 'الكسور الممتعة',
    type: 'video',
    category: 'math',
    min_age: 8, max_age: 10,
    url: 'https://www.youtube.com/watch?v=n0FZhQ_GkKw',
    thumbnail_url: 'https://picsum.photos/seed/fractions/400/300',
    duration_seconds: 290,
    is_active: true,
  },
  {
    title: 'الأنظمة البيئية — كيف تعمل الطبيعة معاً',
    type: 'video',
    category: 'nature',
    min_age: 8, max_age: 10,
    url: 'https://www.youtube.com/watch?v=5eTCZ9L834s',
    thumbnail_url: 'https://picsum.photos/seed/ecosystem/400/300',
    duration_seconds: 340,
    is_active: true,
  },

  // ── CREATIVE ACTIVITIES ────────────────────────────────────────────────
  // Creative (2-4)
  {
    title: 'لوّن الأزهار',
    type: 'creative',
    category: 'nature',
    min_age: 2, max_age: 4,
    thumbnail_url: 'https://picsum.photos/seed/colourflowers/400/300',
    content_text: 'استخدم الألوان لتلوين الأزهار الجميلة. اختر ألوانك المفضلة واجعل الحديقة مليئة بالحياة!',
    assets_url: 'https://picsum.photos/seed/flowercolouring/800/600',
    is_active: true,
  },
  {
    title: 'ارسم الحيوانات',
    type: 'creative',
    category: 'animals',
    min_age: 2, max_age: 4,
    thumbnail_url: 'https://picsum.photos/seed/traceanimals/400/300',
    content_text: 'تتبّع خطوط الحيوانات بإصبعك أو بالقلم. حاول رسم قطة وكلب وطائر!',
    assets_url: 'https://picsum.photos/seed/animaltrace/800/600',
    is_active: true,
  },

  // Creative (5-7)
  {
    title: 'ارسم المجموعة الشمسية',
    type: 'creative',
    category: 'science',
    min_age: 5, max_age: 7,
    thumbnail_url: 'https://picsum.photos/seed/drawplanets/400/300',
    content_text: 'ارسم الشمس والكواكب الثمانية بالترتيب. لوّن كل كوكب بلونه الحقيقي — الأرض زرقاء والمريخ أحمر!',
    assets_url: 'https://picsum.photos/seed/solarsystemdraw/800/600',
    is_active: true,
  },
  {
    title: 'صمّم بطاقة صداقة',
    type: 'creative',
    category: 'social',
    min_age: 5, max_age: 7,
    thumbnail_url: 'https://picsum.photos/seed/friendcard/400/300',
    content_text: 'صمّم بطاقة جميلة لصديقك المفضل. اكتب فيها رسالة لطيفة وزيّنها بالرسومات والألوان.',
    assets_url: 'https://picsum.photos/seed/friendshipcard/800/600',
    is_active: true,
  },

  // Creative (8-10)
  {
    title: 'صفحة يوميات الطبيعة',
    type: 'creative',
    category: 'nature',
    min_age: 8, max_age: 10,
    thumbnail_url: 'https://picsum.photos/seed/naturejournal/400/300',
    content_text: 'اخرج إلى الطبيعة ولاحظ ما حولك. ارسم ورقة شجر أو زهرة واكتب ملاحظاتك عنها — شكلها ولونها وملمسها.',
    assets_url: 'https://picsum.photos/seed/journalpage/800/600',
    is_active: true,
  },
  {
    title: 'صمّم آلة بسيطة',
    type: 'creative',
    category: 'science',
    min_age: 8, max_age: 10,
    thumbnail_url: 'https://picsum.photos/seed/simplemachine/400/300',
    content_text: 'تخيّل آلة بسيطة تحل مشكلة يومية. ارسمها على الورق وأعطها اسماً وصف كيف تعمل!',
    assets_url: 'https://picsum.photos/seed/machinedesign/800/600',
    is_active: true,
  },
];

// ════════════════════════════════════════════════════════════════════════════
// SQL Generator
// ════════════════════════════════════════════════════════════════════════════

function esc(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + str.replace(/'/g, "''") + "'";
}

function escJson(obj) {
  if (!obj) return 'NULL';
  return "'" + JSON.stringify(obj).replace(/'/g, "''") + "'::jsonb";
}

let sql = `-- ============================================================
-- Migration: Seed 33 content items (Arabic titles)
-- Generated: ${new Date().toISOString()}
-- Safe to run multiple times (uses ON CONFLICT DO NOTHING)
-- ============================================================

-- Ensure title has a unique constraint for ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'content_items_title_unique'
  ) THEN
    ALTER TABLE content_items ADD CONSTRAINT content_items_title_unique UNIQUE (title);
  END IF;
END $$;

INSERT INTO public.content_items (
  title, type, category, min_age, max_age, thumbnail_url, is_active,
  url, duration_seconds, content_text, assets_url, game_type, config_json
) VALUES
`;

const rows = SEED_ITEMS.map(item => {
  return `  (${esc(item.title)}, ${esc(item.type)}, ${esc(item.category)}, ${item.min_age}, ${item.max_age}, ${esc(item.thumbnail_url)}, ${item.is_active}, ${esc(item.url)}, ${item.duration_seconds || 'NULL'}, ${esc(item.content_text)}, ${esc(item.assets_url)}, ${esc(item.game_type)}, ${escJson(item.config_json)})`;
});

sql += rows.join(',\n') + '\nON CONFLICT (title) DO NOTHING;\n';

const outPath = 'c:/Prog/Language/ReactNative/Balanced-Digital-Children-s-Platform/supabase/migrations/20260705000001_seed_all_content.sql';
fs.writeFileSync(outPath, sql);
console.log(`SQL migration generated: ${outPath}`);
console.log(`Total items: ${SEED_ITEMS.length}`);
