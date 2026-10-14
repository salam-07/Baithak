/**
 * The starting cultural index.
 *
 * This is content rather than code, and it is deliberately data instead of a
 * migration so that an editor can read it, correct it, and re-run the seeder
 * without touching application logic.
 *
 * Three things about it are worth stating plainly, because the alternative is
 * that they are discovered later and read as carelessness.
 *
 * Shahmukhi labels are written, and Shahmukhi *notes* are not.
 *
 * Names are short and stable and are the thing the matcher needs — a keyword
 * without a Shahmukhi label is unreachable in the script most of these readers
 * write in. A prose description is a different kind of claim, and writing
 * Punjabi prose here would mean generating it rather than knowing it. PRODUCT.md
 * asks that a cultural description attribute its sources instead of presenting
 * one retelling as definitive, and the most defensible first version of that is
 * an English note with a cited source and a visible gap where a Punjabi editor
 * should write their own. `notes.pa` is therefore null throughout, which the
 * keyword page renders as absent rather than as an empty section.
 *
 * Sources point at reference articles, not at scholarship.
 *
 * Each entry that has one cites a general reference so that `hasSources` is
 * true and the interface can demonstrate the difference. These are not the
 * citations a published index should carry — for that, an editor needs to go to
 * the printed collections and the oral-history archives, and the field is built
 * to hold them.
 *
 * Nothing here is exhaustive, and that is the point of the related-links.
 *
 * The entries are grouped by type, and the order of the groups is deliberate:
 * the four great romances first, then the people around those stories, then the
 * poets, then the places, the objects of village life, the traditions, and
 * finally the words a reader is most likely to want glossed. An index of a
 * tradition turns out to be mostly people, places and things rather than story
 * titles — which is why a reader browsing it meets Kaido, the charkha and the
 * Chenab, and not only Heer.
 *
 * The count is a starting point rather than a target. An editor adds the rest,
 * and the related-links are what keep a partly-filled index readable.
 */

/** Types are the enum from config/constants.js: object, place, person, tradition, theme. */
export const SEED_KEYWORDS = [
  {
    key: 'heer-ranjha',
    labels: { en: 'Heer Ranjha', pa: 'ہیر رانجھا', roman: 'Heer Ranjha' },
    type: 'theme',
    aliases: ['heer', 'ranjha', 'heer ranjha', 'heer-ranjha', 'heerr anjha'],
    notes: {
      en:
        'The tragedy of Heer Sial and Dheedo Ranjha, told most influentially by Waris Shah '
        + 'in the eighteenth century. It is one of the four great Punjabi romances, and the '
        + 'one most often sung as a lament.',
      pa: null,
    },
    sources: [
      { label: 'Heer Ranjha — reference article', url: 'https://en.wikipedia.org/wiki/Heer_Ranjha' },
    ],
    related: ['waris-shah', 'mirza-sahiban', 'sassi-punnhun', 'sohni-mahiwal'],
  },

  {
    key: 'mirza-sahiban',
    labels: { en: 'Mirza Sahiban', pa: 'مرزا صاحباں', roman: 'Mirza Sahiban' },
    type: 'theme',
    aliases: ['mirza', 'sahiban', 'mirza sahiban', 'mirza sahbaan'],
    notes: {
      en:
        'The romance of Mirza and Sahiban of Khewa, ending in the deaths of both. Unlike the '
        + 'other romances it turns on Sahiban breaking Mirza\'s arrows to save him from her '
        + 'brothers, which is why retellings disagree about whom the story blames.',
      pa: null,
    },
    sources: [
      { label: 'Mirza Sahiban — reference article', url: 'https://en.wikipedia.org/wiki/Mirza_Sahiba' },
    ],
    related: ['heer-ranjha', 'sassi-punnhun', 'sohni-mahiwal'],
  },

  {
    key: 'sassi-punnhun',
    labels: { en: 'Sassi Punnhun', pa: 'سسی پنوں', roman: 'Sassi Punnhun' },
    type: 'theme',
    aliases: ['sassi', 'punnu', 'punnhun', 'sassi punnu', 'sassi punnhun'],
    notes: {
      en:
        'Sassi of Bhambore and Punnhun, son of the ruler of Kech. The story turns on a '
        + 'deception that separates them while they sleep, and ends with Sassi walking into '
        + 'the desert.',
      pa: null,
    },
    sources: [
      { label: 'Sassi Punnhun — reference article', url: 'https://en.wikipedia.org/wiki/Sassi_Punnhun' },
    ],
    related: ['heer-ranjha', 'mirza-sahiban', 'sohni-mahiwal'],
  },

  {
    key: 'sohni-mahiwal',
    labels: { en: 'Sohni Mahiwal', pa: 'سوہنی مہیوال', roman: 'Sohni Mahiwal' },
    type: 'theme',
    aliases: ['sohni', 'mahiwal', 'sohni mahiwal', 'sohni mehar'],
    notes: {
      en:
        'Sohni of Gujrat, who crossed the Chenab each night to meet Mahiwal by floating on an '
        + 'earthen pot. The story is the reason the Chenab and the pot both carry meaning in '
        + 'Punjabi poetry.',
      pa: null,
    },
    sources: [
      { label: 'Sohni Mahiwal — reference article', url: 'https://en.wikipedia.org/wiki/Sohni_Mahiwal' },
    ],
    related: ['heer-ranjha', 'mirza-sahiban', 'sassi-punnhun', 'chenab'],
  },

  {
    key: 'waris-shah',
    labels: { en: 'Waris Shah', pa: 'وارث شاہ', roman: 'Waris Shah' },
    type: 'person',
    aliases: ['waris shah', 'waris', 'warris shah'],
    notes: {
      en:
        'Eighteenth-century Punjabi poet, best known for his retelling of Heer. His version '
        + 'is the one most later singers work from, which is why "Waris Shah" and "Heer" are '
        + 'often used interchangeably.',
      pa: null,
    },
    sources: [
      { label: 'Waris Shah — reference article', url: 'https://en.wikipedia.org/wiki/Waris_Shah' },
    ],
    related: ['heer-ranjha', 'punjabi-sufi-poetry'],
  },

  {
    key: 'bulleh-shah',
    labels: { en: 'Bulleh Shah', pa: 'بلھے شاہ', roman: 'Bulleh Shah' },
    type: 'person',
    aliases: ['bulleh shah', 'bulleh', 'bullah shah', 'abdullah shah'],
    notes: {
      en:
        'Punjabi Sufi poet of the seventeenth and eighteenth centuries, whose kafis are '
        + 'still sung across the region. His verses openly attack religious orthodoxy and '
        + 'caste, which is why they are quoted in very different arguments.',
      pa: null,
    },
    sources: [
      { label: 'Bulleh Shah — reference article', url: 'https://en.wikipedia.org/wiki/Bulleh_Shah' },
    ],
    related: ['punjabi-sufi-poetry', 'sultan-bahu', 'baba-farid'],
  },

  {
    key: 'sultan-bahu',
    labels: { en: 'Sultan Bahu', pa: 'سلطان باہو', roman: 'Sultan Bahu' },
    type: 'person',
    aliases: ['sultan bahu', 'sultan bahoo', 'bahu'],
    notes: {
      en:
        'Seventeenth-century Sufi poet and teacher, founder of the Sarwari Qadiri order. His '
        + 'work is written largely in Punjabi and Persian and is still recited in the region.',
      pa: null,
    },
    sources: [
      { label: 'Sultan Bahu — reference article', url: 'https://en.wikipedia.org/wiki/Sultan_Bahu' },
    ],
    related: ['punjabi-sufi-poetry', 'bulleh-shah', 'baba-farid'],
  },

  {
    key: 'baba-farid',
    labels: { en: 'Baba Farid', pa: 'بابا فرید', roman: 'Baba Farid' },
    type: 'person',
    aliases: ['baba farid', 'farid', 'fariduddin ganjshakar', 'ganj shakar'],
    notes: {
      en:
        'Twelfth-century Sufi whose Punjabi verses are the earliest recorded poetry in the '
        + 'language, and the only Punjabi work included in the Guru Granth Sahib.',
      pa: null,
    },
    sources: [
      { label: 'Baba Farid — reference article', url: 'https://en.wikipedia.org/wiki/Baba_Farid' },
    ],
    related: ['punjabi-sufi-poetry', 'bulleh-shah', 'sultan-bahu'],
  },

  {
    key: 'punjabi-sufi-poetry',
    labels: { en: 'Punjabi Sufi poetry', pa: 'پنجابی صوفی شاعری', roman: 'Punjabi Sufi shairi' },
    type: 'tradition',
    aliases: ['sufi poetry', 'sufi', 'sufism', 'punjabi sufi', 'shairi'],
    notes: {
      en:
        'The devotional Punjabi verse tradition running from Baba Farid to Bulleh Shah, in '
        + 'which the romance stories are read as allegories of the soul\'s search. This is '
        + 'why the four great romances and the Sufi poets are usually studied together '
        + 'rather than separately.',
      pa: null,
    },
    sources: [
      { label: 'Punjabi literature — reference article', url: 'https://en.wikipedia.org/wiki/Punjabi_literature' },
    ],
    related: ['bulleh-shah', 'sultan-bahu', 'baba-farid', 'waris-shah', 'kafi'],
  },

  {
    key: 'vanjhali',
    labels: { en: 'Flute', pa: 'ونجھلی', roman: 'Vanjhali' },
    type: 'object',
    aliases: ['vanjhali', 'vanjhli', 'wanjhali', 'wanjhli', 'bansuri', 'bansi'],
    notes: {
      en:
        'The Punjabi flute, played by herders. It carries a specific weight in the folk '
        + 'stories: Ranjha tends buffalo and plays the vanjhali, and the sound is what draws '
        + 'Heer — so the instrument is a character in the romance rather than a prop.',
      pa: null,
    },
    sources: [
      { label: 'Bansuri and regional flutes — reference article', url: 'https://en.wikipedia.org/wiki/Bansuri' },
    ],
    related: ['heer-ranjha', 'dhol', 'tumbi'],
  },

  {
    key: 'dhol',
    labels: { en: 'Dhol', pa: 'ڈھول', roman: 'Dhol' },
    type: 'object',
    aliases: ['dhol', 'dholi', 'dholki', 'dholee'],
    notes: {
      en:
        'The double-headed barrel drum that carries Punjabi rhythm — at weddings, at '
        + 'harvest, and in every dance form. Its larger and smaller relatives, the dholki '
        + 'and the dhol, are not interchangeable and are played differently.',
      pa: null,
    },
    sources: [
      { label: 'Dhol — reference article', url: 'https://en.wikipedia.org/wiki/Dhol' },
    ],
    related: ['bhangra', 'giddha', 'vanjhali'],
  },

  {
    key: 'tumbi',
    labels: { en: 'Tumbi', pa: 'ٹمبی', roman: 'Tumbi' },
    type: 'object',
    aliases: ['tumbi', 'tumba', 'toombi'],
    notes: {
      en:
        'A single-stringed instrument with a gourd body, the melodic spine of Punjabi folk '
        + 'song. Cheap to make, which is why it rather than anything more elaborate became '
        + 'the sound of the genre.',
      pa: null,
    },
    sources: [
      { label: 'Tumbi — reference article', url: 'https://en.wikipedia.org/wiki/Tumbi' },
    ],
    related: ['dhol', 'chimta', 'boliyan'],
  },

  {
    key: 'chimta',
    labels: { en: 'Chimta', pa: 'چمٹا', roman: 'Chimta' },
    type: 'object',
    aliases: ['chimta', 'chimpta'],
    notes: {
      en:
        'Long metal tongs fitted with loose rings, struck to mark rhythm. Used in folk song '
        + 'and, separately, in Sikh devotional music, which is a reminder that the same '
        + 'object does not mean one thing everywhere.',
      pa: null,
    },
    sources: [
      { label: 'Chimta — reference article', url: 'https://en.wikipedia.org/wiki/Chimta' },
    ],
    related: ['dhol', 'tumbi'],
  },

  {
    key: 'algohza',
    labels: { en: 'Algohza', pa: 'الغوزہ', roman: 'Algohza' },
    type: 'object',
    aliases: ['algohza', 'alghoza', 'algoza'],
    notes: {
      en:
        'A paired flute — one pipe carries the melody, the other a drone — played mainly by '
        + 'herders and mendicants in western Punjab and Sindh.',
      pa: null,
    },
    sources: [
      { label: 'Alghoza — reference article', url: 'https://en.wikipedia.org/wiki/Alghoza' },
    ],
    related: ['vanjhali', 'tumbi'],
  },

  {
    key: 'bhangra',
    labels: { en: 'Bhangra', pa: 'بھنگڑا', roman: 'Bhangra' },
    type: 'tradition',
    aliases: ['bhangra', 'bhangda'],
    notes: {
      en:
        'Harvest dance originally performed at Vaisakhi, with the dhol setting the step. The '
        + 'diaspora version is a different thing from the village one and the two are often '
        + 'conflated in writing about it.',
      pa: null,
    },
    sources: [
      { label: 'Bhangra — reference article', url: 'https://en.wikipedia.org/wiki/Bhangra_(dance)' },
    ],
    related: ['dhol', 'vaisakhi', 'giddha'],
  },

  {
    key: 'giddha',
    labels: { en: 'Giddha', pa: 'گیدھا', roman: 'Giddha' },
    type: 'tradition',
    aliases: ['giddha', 'gidda', 'gidha'],
    notes: {
      en:
        'The women\'s dance of Punjab, performed in a circle with clapping and couplets. '
        + 'Where bhangra has the dhol, giddha has the boliyan — the verses are the point, and '
        + 'a giddha performance is judged on them.',
      pa: null,
    },
    sources: [
      { label: 'Giddha — reference article', url: 'https://en.wikipedia.org/wiki/Giddha' },
    ],
    related: ['boliyan', 'bhangra', 'dhol'],
  },

  {
    key: 'boliyan',
    labels: { en: 'Boliyan', pa: 'بولیاں', roman: 'Boliyan' },
    type: 'tradition',
    aliases: ['boliyan', 'boli', 'bolian', 'boliyaan'],
    notes: {
      en:
        'Short rhymed couplets, sung and traded between performers. They are where the folk '
        + 'tradition is most direct — a boli can praise, tease, or comment on current events '
        + 'in a few lines, and new ones are still being written.',
      pa: null,
    },
    sources: [
      { label: 'Boliyan — reference article', url: 'https://en.wikipedia.org/wiki/Boliyan' },
    ],
    related: ['giddha', 'tappa', 'mahiya', 'kafi'],
  },

  {
    key: 'mahiya',
    labels: { en: 'Mahiya', pa: 'ماہیا', roman: 'Mahiya' },
    type: 'tradition',
    aliases: ['mahiya', 'mahia', 'mahiyaa'],
    notes: {
      en:
        'A short folk song form, usually addressed to a beloved, with a distinctive rhythm. '
        + 'Closer to a sung sigh than to a narrative.',
      pa: null,
    },
    sources: [],
    related: ['boliyan', 'tappa', 'kafi'],
  },

  {
    key: 'tappa',
    labels: { en: 'Tappa', pa: 'ٹپہ', roman: 'Tappa' },
    type: 'tradition',
    aliases: ['tappa', 'tappay', 'tappe'],
    notes: {
      en:
        'A rapid, ornamented folk song form, associated above all with the camel drivers of '
        + 'the western Punjab and the Sindh border country.',
      pa: null,
    },
    sources: [
      { label: 'Tappa — reference article', url: 'https://en.wikipedia.org/wiki/Tappa_(music)' },
    ],
    related: ['boliyan', 'mahiya', 'kafi'],
  },

  {
    key: 'kafi',
    labels: { en: 'Kafi', pa: 'کافی', roman: 'Kafi' },
    type: 'tradition',
    aliases: ['kafi', 'kaafi'],
    notes: {
      en:
        'A verse form used by the Punjabi Sufi poets, and the setting most of Bulleh Shah\'s '
        + 'and Sultan Bahu\'s work is sung in. The form is not itself devotional; what makes '
        + 'these kafis religious is what they are about.',
      pa: null,
    },
    sources: [
      { label: 'Kafi — reference article', url: 'https://en.wikipedia.org/wiki/Kafi' },
    ],
    related: ['punjabi-sufi-poetry', 'bulleh-shah', 'sultan-bahu', 'boliyan'],
  },

  {
    key: 'phulkari',
    labels: { en: 'Phulkari', pa: 'پھلکاری', roman: 'Phulkari' },
    type: 'object',
    aliases: ['phulkari', 'phul kari', 'bagh embroidery'],
    notes: {
      en:
        'Flower-work embroidery in silk thread on hand-spun cotton, traditionally made at '
        + 'home by women and given at marriage. The dense variant covering the whole cloth is '
        + 'called bagh, and the distinction is a real one rather than a matter of degree.',
      pa: null,
    },
    sources: [
      { label: 'Phulkari — reference article', url: 'https://en.wikipedia.org/wiki/Phulkari' },
    ],
    related: ['charpai', 'lohri'],
  },

  {
    key: 'charpai',
    labels: { en: 'Charpai', pa: 'چارپائی', roman: 'Charpai' },
    type: 'object',
    aliases: ['charpai', 'charpoy', 'manji', 'manja'],
    notes: {
      en:
        'The woven cot, and in the villages the centre of everything — people sit on it, '
        + 'sleep on it, are married on it, and are carried on it. Punjabi stories happen on '
        + 'a charpai more often than anywhere else.',
      pa: null,
    },
    sources: [
      { label: 'Charpai — reference article', url: 'https://en.wikipedia.org/wiki/Charpai' },
    ],
    related: ['phulkari', 'punjab'],
  },

  {
    key: 'vaisakhi',
    labels: { en: 'Vaisakhi', pa: 'ویساکھی', roman: 'Vaisakhi' },
    type: 'tradition',
    aliases: ['vaisakhi', 'baisakhi', 'visakhi', 'vesakhi'],
    notes: {
      en:
        'The mid-April harvest festival, and the day the Khalsa was founded in 1699. Both '
        + 'meanings are live, and which one a family marks depends on who they are.',
      pa: null,
    },
    sources: [
      { label: 'Vaisakhi — reference article', url: 'https://en.wikipedia.org/wiki/Vaisakhi' },
    ],
    related: ['bhangra', 'lohri', 'punjab'],
  },

  {
    key: 'lohri',
    labels: { en: 'Lohri', pa: 'لوہڑی', roman: 'Lohri' },
    type: 'tradition',
    aliases: ['lohri', 'lohari'],
    notes: {
      en:
        'A midwinter bonfire festival, celebrated for a newborn or a new marriage, and '
        + 'associated with the end of the sowing season.',
      pa: null,
    },
    sources: [
      { label: 'Lohri — reference article', url: 'https://en.wikipedia.org/wiki/Lohri' },
    ],
    related: ['vaisakhi', 'punjab'],
  },

  {
    key: 'chenab',
    labels: { en: 'Chenab', pa: 'چناب', roman: 'Chenab' },
    type: 'place',
    aliases: ['chenab', 'chanab', 'chenab river'],
    notes: {
      en:
        'One of the five rivers of the Punjab, and the one the romances keep returning to — '
        + 'Sohni crosses it, and Punjabi love poetry uses it as the thing that separates.',
      pa: null,
    },
    sources: [
      { label: 'Chenab — reference article', url: 'https://en.wikipedia.org/wiki/Chenab_River' },
    ],
    related: ['sohni-mahiwal', 'punjab'],
  },

  {
    key: 'punjab',
    labels: { en: 'Punjab', pa: 'پنجاب', roman: 'Punjab' },
    type: 'place',
    aliases: ['punjab', 'panjab', 'the punjab'],
    notes: {
      en:
        'The land of five rivers, divided in 1947 between Pakistan and India. That division '
        + 'runs through almost everything in this index: the same stories, the same poets, '
        + 'and two different sets of schools and editions teaching them.',
      pa: null,
    },
    sources: [
      { label: 'Punjab — reference article', url: 'https://en.wikipedia.org/wiki/Punjab' },
    ],
    related: ['chenab', 'punjabi-sufi-poetry', 'heer-ranjha'],
  },

  // ---------------------------------------------------------------------------
  // The people
  //
  // Heroes, heroines and the characters around them, kept separate from the
  // story keywords above because a reader following "Heer" and a reader
  // following "Heer Ranjha" are asking different questions: one is asking about
  // a woman in a story, the other about the story.
  //
  // The overlap is real and worth knowing about rather than discovering. A story
  // that says "Heer" attaches both entries — the matcher returns every keyword
  // whose name matches a span, not just the longest — and the two share the
  // normalized alias `heer`, so resolving a tapped word to a single entry is
  // ambiguous and picks whichever the query returns first. That is accepted: the
  // highlight is right either way, and the two pages are one link apart.
  // ---------------------------------------------------------------------------

  {
    key: 'heer',
    labels: { en: 'Heer', pa: 'ہیر', roman: 'Heer' },
    type: 'person',
    aliases: ['heer sial', 'heer siyal', 'heer of jhang'],
    notes: {
      en:
        'The heroine of the best-known Punjabi romance — Heer of the Sial clan of Jhang. The '
        + 'poets give her the sharper tongue of the two lovers, and the story is named for '
        + 'her rather than for Ranjha.',
      pa: null,
    },
    sources: [
      { label: 'Heer Ranjha — reference article', url: 'https://en.wikipedia.org/wiki/Heer_Ranjha' },
    ],
    related: ['heer-ranjha', 'dheedo-ranjha', 'kaido', 'chuchak', 'jhang'],
  },

  {
    key: 'dheedo-ranjha',
    labels: { en: 'Dheedo Ranjha', pa: 'ڈھیڈو رانجھا', roman: 'Dheedo Ranjha' },
    type: 'person',
    aliases: ['dheedo', 'dheedo ranjha', 'ranjha dheedo'],
    notes: {
      en:
        'The youngest son of the Ranjha family of Takht Hazara, who leaves home after a '
        + 'quarrel over land, tends cattle on the Chenab and plays the vanjhali. He becomes a '
        + 'jogi in the later part of the story, which is what lifts it out of being a '
        + 'romance.',
      pa: null,
    },
    sources: [
      { label: 'Heer Ranjha — reference article', url: 'https://en.wikipedia.org/wiki/Heer_Ranjha' },
    ],
    related: ['heer', 'heer-ranjha', 'vanjhali', 'takht-hazara', 'jogi'],
  },

  {
    key: 'mirza',
    labels: { en: 'Mirza', pa: 'مرزا', roman: 'Mirza' },
    type: 'person',
    aliases: ['mirza khan', 'mirza of khewa'],
    notes: {
      en:
        'Mirza Khan of Khewa, the archer of the second great romance. He is remembered for '
        + 'his bow as much as for his love, and his death is usually read as the cost of his '
        + 'own boasting rather than of Sahiban\'s choice.',
      pa: null,
    },
    sources: [
      { label: 'Mirza Sahiban — reference article', url: 'https://en.wikipedia.org/wiki/Mirza_Sahiba' },
    ],
    related: ['mirza-sahiban', 'sahiban', 'khewa'],
  },

  {
    key: 'sahiban',
    labels: { en: 'Sahiban', pa: 'صاحباں', roman: 'Sahiban' },
    type: 'person',
    aliases: ['sahiban of khewa'],
    notes: {
      en:
        'The heroine of the Mirza Sahiban romance, who breaks Mirza\'s arrows to stop him '
        + 'killing her brothers. Retellings disagree about whether that was love or betrayal, '
        + 'and the disagreement is the point of the story.',
      pa: null,
    },
    sources: [
      { label: 'Mirza Sahiban — reference article', url: 'https://en.wikipedia.org/wiki/Mirza_Sahiba' },
    ],
    related: ['mirza', 'mirza-sahiban', 'khewa'],
  },

  {
    key: 'sassi',
    labels: { en: 'Sassi', pa: 'سسی', roman: 'Sassi' },
    type: 'person',
    aliases: ['sassi of bhambore'],
    notes: {
      en:
        'The foundling of Bhambhor, raised by a washerman, who is separated from Punnhun in '
        + 'the night and walks into the desert after him. Her walk is the image Punjabi '
        + 'poetry uses for seeking.',
      pa: null,
    },
    sources: [
      { label: 'Sassi Punnhun — reference article', url: 'https://en.wikipedia.org/wiki/Sassi_Punnhun' },
    ],
    related: ['sassi-punnhun', 'punnhun', 'bhambhor'],
  },

  {
    key: 'punnhun',
    labels: { en: 'Punnhun', pa: 'پنوں', roman: 'Punnhun' },
    type: 'person',
    aliases: ['punnu of kech', 'punnhun of kech'],
    notes: {
      en:
        'The prince of Kech, carried off in his sleep by Sassi\'s brothers. He is the passive '
        + 'figure of the pair, which is why the story belongs to Sassi rather than to him.',
      pa: null,
    },
    sources: [
      { label: 'Sassi Punnhun — reference article', url: 'https://en.wikipedia.org/wiki/Sassi_Punnhun' },
    ],
    related: ['sassi', 'sassi-punnhun'],
  },

  {
    key: 'sohni',
    labels: { en: 'Sohni', pa: 'سوہنی', roman: 'Sohni' },
    type: 'person',
    aliases: ['sohni of gujrat'],
    notes: {
      en:
        'The potter\'s daughter of Gujrat who swims the Chenab each night on an earthen pot. '
        + 'The pot matters: it is the fragile thing her whole life rests on, and it is what '
        + 'breaks.',
      pa: null,
    },
    sources: [
      { label: 'Sohni Mahiwal — reference article', url: 'https://en.wikipedia.org/wiki/Sohni_Mahiwal' },
    ],
    related: ['sohni-mahiwal', 'mahiwal', 'chenab', 'kunna'],
  },

  {
    key: 'mahiwal',
    labels: { en: 'Mahiwal', pa: 'مہیوال', roman: 'Mahiwal' },
    type: 'person',
    aliases: ['izzat baig', 'mahiwal of bukhara'],
    notes: {
      en:
        'A trader from Bukhara, born Izzat Baig, who settles on the far bank of the Chenab to '
        + 'be near Sohni. Renamed for the buffaloes he tends — mahiwal, the buffalo-keeper.',
      pa: null,
    },
    sources: [
      { label: 'Sohni Mahiwal — reference article', url: 'https://en.wikipedia.org/wiki/Sohni_Mahiwal' },
    ],
    related: ['sohni', 'sohni-mahiwal', 'chenab'],
  },

  {
    key: 'kaido',
    labels: { en: 'Kaido', pa: 'کیدو', roman: 'Kaido' },
    type: 'person',
    aliases: ['kaidu', 'kaido ranjha'],
    notes: {
      en:
        'Heer\'s sister-in-law, who poisons the family against the match. She is the '
        + 'machinery of the tragedy, and in performance she is as memorable as either lover — '
        + 'the story needs someone to blame and she is it.',
      pa: null,
    },
    sources: [
      { label: 'Heer Ranjha — reference article', url: 'https://en.wikipedia.org/wiki/Heer_Ranjha' },
    ],
    related: ['heer', 'heer-ranjha', 'chuchak'],
  },

  {
    key: 'chuchak',
    labels: { en: 'Chuchak', pa: 'چوچک', roman: 'Chuchak' },
    type: 'person',
    aliases: ['raja chuchak', 'chuchak sial'],
    notes: {
      en:
        'Heer\'s father, the Sial chief of Jhang, who promises her to another family. He is '
        + 'not a villain in the telling so much as a man doing what a chief is expected to '
        + 'do.',
      pa: null,
    },
    sources: [
      { label: 'Heer Ranjha — reference article', url: 'https://en.wikipedia.org/wiki/Heer_Ranjha' },
    ],
    related: ['heer', 'heer-ranjha', 'jhang', 'kaido'],
  },

  {
    key: 'shah-hussain',
    labels: { en: 'Shah Hussain', pa: 'شاہ حسین', roman: 'Shah Hussain' },
    type: 'person',
    aliases: ['shah hussain', 'madho lal hussain', 'madhoolal', 'madho'],
    notes: {
      en:
        'Sixteenth-century Lahore Sufi poet, called Madho Lal Hussain after his companion '
        + 'Madho. His kafis are still sung at his shrine during the city\'s urs, which makes '
        + 'him the earliest of the Punjabi Sufis whose work is publicly performed today.',
      pa: null,
    },
    sources: [
      { label: 'Shah Hussain — reference article', url: 'https://en.wikipedia.org/wiki/Shah_Hussain' },
    ],
    related: ['punjabi-sufi-poetry', 'lahore', 'bulleh-shah', 'urs'],
  },

  {
    key: 'mian-muhammad-baksh',
    labels: { en: 'Mian Muhammad Baksh', pa: 'میاں محمد بخش', roman: 'Mian Muhammad Baksh' },
    type: 'person',
    aliases: ['mian muhammad baksh', 'mian baksh', 'saif ul mulook', 'saifulmalook'],
    notes: {
      en:
        'Nineteenth-century Punjabi poet from the Jammu hills, best known for Saif ul Mulook, '
        + 'the longest and most widely recited of the Punjabi qissas.',
      pa: null,
    },
    sources: [
      { label: 'Mian Muhammad Bakhsh — reference article', url: 'https://en.wikipedia.org/wiki/Mian_Muhammad_Bakhsh' },
    ],
    related: ['punjabi-sufi-poetry', 'kissa', 'waris-shah'],
  },

  {
    key: 'khwaja-ghulam-farid',
    labels: { en: 'Khwaja Ghulam Farid', pa: 'خواجہ غلام فرید', roman: 'Khwaja Ghulam Farid' },
    type: 'person',
    aliases: ['khwaja ghulam farid', 'ghulam farid', 'khwaja farid'],
    notes: {
      en:
        'Nineteenth-century Sufi poet of the Cholistan desert, whose Punjabi and Saraiki verse '
        + 'is full of the desert, the camel and the longing for union.',
      pa: null,
    },
    sources: [
      { label: 'Khwaja Ghulam Farid — reference article', url: 'https://en.wikipedia.org/wiki/Khwaja_Ghulam_Farid' },
    ],
    related: ['punjabi-sufi-poetry', 'cholistan', 'ishq'],
  },

  {
    key: 'pilu',
    labels: { en: 'Pilu', pa: 'پیلو', roman: 'Pilu' },
    type: 'person',
    aliases: ['pilo'],
    notes: {
      en:
        'Sixteenth-century Punjabi poet, credited with one of the earliest surviving versions '
        + 'of the Mirza Sahiban story. Little is known of him beyond the verse.',
      pa: null,
    },
    sources: [],
    related: ['mirza-sahiban', 'punjabi-sufi-poetry', 'kissa'],
  },

  {
    key: 'dulla-bhatti',
    labels: { en: 'Dulla Bhatti', pa: 'دلا بھٹی', roman: 'Dulla Bhatti' },
    type: 'person',
    aliases: ['dulla bhatti', 'dullah bhatti', 'rai abdullah khan', 'dulla'],
    notes: {
      en:
        'Sixteenth-century rebel of the Sandal Bar who resisted Mughal revenue demands and '
        + 'robbed the rich on the roads. Lohri songs still name him, which is why a festival '
        + 'about a bonfire keeps a rebel in its verses.',
      pa: null,
    },
    sources: [
      { label: 'Dulla Bhatti — reference article', url: 'https://en.wikipedia.org/wiki/Dulla_Bhatti' },
    ],
    related: ['lohri', 'punjab', 'mela'],
  },

  {
    key: 'raja-rasalu',
    labels: { en: 'Raja Rasalu', pa: 'راجا رسالو', roman: 'Raja Rasalu' },
    type: 'person',
    aliases: ['rasalu', 'rasaloo'],
    notes: {
      en:
        'The hero of a cycle of folk tales set along the Jhelum and the Salt Range — a '
        + 'prince, a gambler and a trickster who travels with a talking horse. The Rasalu '
        + 'stories are older and looser than the romances.',
      pa: null,
    },
    sources: [
      { label: 'Raja Rasalu — reference article', url: 'https://en.wikipedia.org/wiki/Raja_Rasalu' },
    ],
    related: ['jhelum', 'punjab', 'kissa'],
  },

  {
    key: 'puran-bhagat',
    labels: { en: 'Puran Bhagat', pa: 'پورن بھگت', roman: 'Puran Bhagat' },
    type: 'person',
    aliases: ['puran bhagat', 'pooran bhagat'],
    notes: {
      en:
        'Prince of Sialkot, thrown into a well by order of his father and rescued to become '
        + 'an ascetic. His story is told by Punjabi Muslims and Sikhs in different versions, '
        + 'which makes it a useful case of one tale with two tellings.',
      pa: null,
    },
    sources: [
      { label: 'Puran Bhagat — reference article', url: 'https://en.wikipedia.org/wiki/Puran_Bhagat' },
    ],
    related: ['sialkot', 'jogi', 'kissa'],
  },

  // ---------------------------------------------------------------------------
  // The places
  //
  // The romances are anchored to real towns and rivers, and the index is poorer
  // without them: Jhang is not a backdrop to Heer, it is the reason she cannot
  // marry out of her clan.
  // ---------------------------------------------------------------------------

  {
    key: 'jhang',
    labels: { en: 'Jhang', pa: 'جھنگ', roman: 'Jhang' },
    type: 'place',
    aliases: ['jhang sial', 'jhang city'],
    notes: {
      en:
        'The city on the Chenab that is Heer\'s home and the Sial heartland. In the story it '
        + 'is not scenery but the thing that keeps the lovers apart — a place with rules '
        + 'about who may marry whom.',
      pa: null,
    },
    sources: [
      { label: 'Jhang — reference article', url: 'https://en.wikipedia.org/wiki/Jhang' },
    ],
    related: ['heer', 'chuchak', 'heer-ranjha', 'chenab'],
  },

  {
    key: 'khewa',
    labels: { en: 'Khewa', pa: 'کھیوہ', roman: 'Khewa' },
    type: 'place',
    aliases: ['khewa village', 'khewa jhang'],
    notes: {
      en:
        'The village near Jhang where Mirza and Sahiban grew up as cousins, and where the '
        + 'romance ends under a tree.',
      pa: null,
    },
    sources: [],
    related: ['mirza', 'sahiban', 'mirza-sahiban', 'jhang'],
  },

  {
    key: 'takht-hazara',
    labels: { en: 'Takht Hazara', pa: 'تخت ہزارہ', roman: 'Takht Hazara' },
    type: 'place',
    aliases: ['takht hazara ranjha'],
    notes: {
      en:
        'The village on the Jhelum that Ranjha leaves after quarrelling with his brothers '
        + 'over the family land. That quarrel over the fields is what sets the whole romance '
        + 'moving.',
      pa: null,
    },
    sources: [],
    related: ['dheedo-ranjha', 'jhelum', 'heer-ranjha'],
  },

  {
    key: 'bhambhor',
    labels: { en: 'Bhambhor', pa: 'بھمبھور', roman: 'Bhambhor' },
    type: 'place',
    aliases: ['bhambore', 'bhanbhore'],
    notes: {
      en:
        'The old river port where Sassi is found as a baby. Its ruins are real and the story '
        + 'is attached to them, which is how a folk tale acquires a location.',
      pa: null,
    },
    sources: [
      { label: 'Bhambhore — reference article', url: 'https://en.wikipedia.org/wiki/Bhambhore' },
    ],
    related: ['sassi', 'sassi-punnhun', 'indus'],
  },

  {
    key: 'lahore',
    labels: { en: 'Lahore', pa: 'لاہور', roman: 'Lahore' },
    type: 'place',
    aliases: ['lahori'],
    notes: {
      en:
        'The great city of the Punjab, and the one this index keeps meeting — the shrine of '
        + 'Shah Hussain, the Basant kites, and the presses that printed the qissas.',
      pa: null,
    },
    sources: [
      { label: 'Lahore — reference article', url: 'https://en.wikipedia.org/wiki/Lahore' },
    ],
    related: ['shah-hussain', 'basant', 'ravi', 'punjab'],
  },

  {
    key: 'kasur',
    labels: { en: 'Kasur', pa: 'قصور', roman: 'Kasur' },
    type: 'place',
    aliases: ['kasoor'],
    notes: {
      en:
        'Bulleh Shah\'s city, south of Lahore, and a centre of Punjabi letters. His shrine '
        + 'there holds an annual urs.',
      pa: null,
    },
    sources: [
      { label: 'Kasur — reference article', url: 'https://en.wikipedia.org/wiki/Kasur' },
    ],
    related: ['bulleh-shah', 'urs', 'punjab'],
  },

  {
    key: 'pakpattan',
    labels: { en: 'Pakpattan', pa: 'پاکپتن', roman: 'Pakpattan' },
    type: 'place',
    aliases: ['ajodhan'],
    notes: {
      en:
        'The town on the Sutlej where Baba Farid is buried and where his urs is held. It was '
        + 'called Ajodhan before the shrine gave it a new name.',
      pa: null,
    },
    sources: [
      { label: 'Pakpattan — reference article', url: 'https://en.wikipedia.org/wiki/Pakpattan' },
    ],
    related: ['baba-farid', 'urs', 'dargah', 'sutlej'],
  },

  {
    key: 'uch-sharif',
    labels: { en: 'Uch Sharif', pa: 'اوچ شریف', roman: 'Uch Sharif' },
    type: 'place',
    aliases: ['uch'],
    notes: {
      en:
        'The old shrine town of south Punjab, near the joining of the Chenab and the Sutlej, '
        + 'where Sultan Bahu is buried. It was a centre of learning long before it was a '
        + 'place of pilgrimage.',
      pa: null,
    },
    sources: [
      { label: 'Uch Sharif — reference article', url: 'https://en.wikipedia.org/wiki/Uch_Sharif' },
    ],
    related: ['sultan-bahu', 'chenab', 'dargah', 'multan'],
  },

  {
    key: 'multan',
    labels: { en: 'Multan', pa: 'ملتان', roman: 'Multan' },
    type: 'place',
    aliases: ['multani'],
    notes: {
      en:
        'One of the oldest cities of the Punjab and a shrine city — its saints are counted in '
        + 'dozens and its heat is a proverb.',
      pa: null,
    },
    sources: [
      { label: 'Multan — reference article', url: 'https://en.wikipedia.org/wiki/Multan' },
    ],
    related: ['dargah', 'punjab', 'chenab'],
  },

  {
    key: 'sialkot',
    labels: { en: 'Sialkot', pa: 'سیالکوٹ', roman: 'Sialkot' },
    type: 'place',
    aliases: ['siyal kot'],
    notes: {
      en:
        'City of the north-east Punjab and the setting of the Puran Bhagat story. Waris Shah '
        + 'is also said to have spent his last years here.',
      pa: null,
    },
    sources: [
      { label: 'Sialkot — reference article', url: 'https://en.wikipedia.org/wiki/Sialkot' },
    ],
    related: ['puran-bhagat', 'waris-shah', 'punjab'],
  },

  {
    key: 'hazara',
    labels: { en: 'Hazara', pa: 'ہزارہ', roman: 'Hazara' },
    type: 'place',
    aliases: ['hazara region'],
    notes: {
      en:
        'The hill country north of the Punjab plains. Its Punjabi-speaking villages are part '
        + 'of the country the Rasalu tales travel through.',
      pa: null,
    },
    sources: [],
    related: ['takht-hazara', 'potohar', 'indus'],
  },

  {
    key: 'potohar',
    labels: { en: 'Potohar', pa: 'پوٹھوہار', roman: 'Potohar' },
    type: 'place',
    aliases: ['pothohar', 'pothwar'],
    notes: {
      en:
        'The plateau between the Jhelum and the Indus, a country of rain-fed fields and stony '
        + 'ground. Its dialect and its folk songs are distinct from the plains.',
      pa: null,
    },
    sources: [
      { label: 'Pothohar Plateau — reference article', url: 'https://en.wikipedia.org/wiki/Pothohar_Plateau' },
    ],
    related: ['jhelum', 'hazara', 'punjab'],
  },

  {
    key: 'cholistan',
    labels: { en: 'Cholistan', pa: 'چولستان', roman: 'Cholistan' },
    type: 'place',
    aliases: ['cholistan desert'],
    notes: {
      en:
        'The desert south-east of the Punjab, where the Cholistani herders keep camels and '
        + 'sing tappas. Khwaja Ghulam Farid\'s poetry is full of it.',
      pa: null,
    },
    sources: [
      { label: 'Cholistan Desert — reference article', url: 'https://en.wikipedia.org/wiki/Cholistan_Desert' },
    ],
    related: ['khwaja-ghulam-farid', 'tappa', 'punjab'],
  },

  {
    key: 'ravi',
    labels: { en: 'Ravi', pa: 'راوی', roman: 'Ravi' },
    type: 'place',
    aliases: ['ravi river'],
    notes: {
      en:
        'The river that runs past Lahore. In Punjabi poetry it is a boundary, the way the '
        + 'Chenab is in the Sohni story.',
      pa: null,
    },
    sources: [
      { label: 'Ravi River — reference article', url: 'https://en.wikipedia.org/wiki/Ravi_River' },
    ],
    related: ['lahore', 'chenab', 'punjab'],
  },

  {
    key: 'sutlej',
    labels: { en: 'Sutlej', pa: 'ستلج', roman: 'Sutlej' },
    type: 'place',
    aliases: ['satluj', 'sutlej river'],
    notes: {
      en:
        'The easternmost of the five rivers and the longest. The Sikh states of the '
        + 'nineteenth century were built along it.',
      pa: null,
    },
    sources: [
      { label: 'Sutlej — reference article', url: 'https://en.wikipedia.org/wiki/Sutlej' },
    ],
    related: ['punjab', 'beas', 'pakpattan'],
  },

  {
    key: 'jhelum',
    labels: { en: 'Jhelum', pa: 'جہلم', roman: 'Jhelum' },
    type: 'place',
    aliases: ['jhelum river'],
    notes: {
      en:
        'The western river of the Punjab, running down from the Kashmir hills past Takht '
        + 'Hazara. The Rasalu tales follow it.',
      pa: null,
    },
    sources: [
      { label: 'Jhelum River — reference article', url: 'https://en.wikipedia.org/wiki/Jhelum_River' },
    ],
    related: ['takht-hazara', 'potohar', 'punjab', 'raja-rasalu'],
  },

  {
    key: 'beas',
    labels: { en: 'Beas', pa: 'بیاس', roman: 'Beas' },
    type: 'place',
    aliases: ['beas river', 'bias river'],
    notes: {
      en:
        'The smallest of the five rivers, and the one whose name is most often left out when '
        + 'the Punjab is described as the land of five rivers.',
      pa: null,
    },
    sources: [
      { label: 'Beas River — reference article', url: 'https://en.wikipedia.org/wiki/Beas_River' },
    ],
    related: ['punjab', 'sutlej', 'ravi'],
  },

  {
    key: 'indus',
    labels: { en: 'Indus', pa: 'سندھ دریا', roman: 'Indus' },
    type: 'place',
    aliases: ['indus river', 'sindhu'],
    notes: {
      en:
        'The river the Punjab\'s five rivers join, and the one that carries their water to '
        + 'the sea. Bhambhor stands near its old course.',
      pa: null,
    },
    sources: [
      { label: 'Indus River — reference article', url: 'https://en.wikipedia.org/wiki/Indus_River' },
    ],
    related: ['bhambhor', 'chenab', 'punjab'],
  },

  // ---------------------------------------------------------------------------
  // The things
  //
  // The objects of village life, which the songs are full of and which a reader
  // meeting them in a line of verse has no way to place. Several of these carry
  // a whole genre of song with them — the charkha and the chakki especially.
  // ---------------------------------------------------------------------------

  {
    key: 'charkha',
    labels: { en: 'Charkha', pa: 'چرخہ', roman: 'Charkha' },
    type: 'object',
    aliases: ['charkha', 'spinning wheel', 'charkha spinning wheel'],
    notes: {
      en:
        'The hand spinning wheel, at the centre of Punjabi domestic life and later of the '
        + 'freedom movement\'s symbolism. Women spun and sang at it, and the songs are '
        + 'collected separately as charkha-nama.',
      pa: null,
    },
    sources: [
      { label: 'Spinning wheel — reference article', url: 'https://en.wikipedia.org/wiki/Spinning_wheel' },
    ],
    related: ['phulkari', 'pind', 'punjab', 'mahiya'],
  },

  {
    key: 'kunna',
    labels: { en: 'Kunna', pa: 'کنّا', roman: 'Kunna' },
    type: 'object',
    aliases: ['kunna', 'kunnah', 'ghara', 'matka'],
    notes: {
      en:
        'The earthen water pitcher, and the thing Sohni swims the Chenab on. In a household '
        + 'it holds water; in the romance it is the only thing between a woman and the river.',
      pa: null,
    },
    sources: [],
    related: ['sohni', 'sohni-mahiwal', 'gharoli', 'chenab'],
  },

  {
    key: 'gharoli',
    labels: { en: 'Gharoli', pa: 'گھڑولی', roman: 'Gharoli' },
    type: 'object',
    aliases: ['gharoli', 'gharoli pot'],
    notes: {
      en:
        'A small earthen pot with a spout, carried to the fields at midday. The word turns up '
        + 'constantly in folk song as a homely, ordinary thing.',
      pa: null,
    },
    sources: [],
    related: ['kunna', 'pind', 'nehar'],
  },

  {
    key: 'madhani',
    labels: { en: 'Madhani', pa: 'مدھانی', roman: 'Madhani' },
    type: 'object',
    aliases: ['madhani', 'mathani', 'churning stick'],
    notes: {
      en:
        'The wooden churning stick used to make butter from curd. Churning songs belong to '
        + 'the wedding repertoire, which is why the object is remembered even though the '
        + 'work has mostly gone.',
      pa: null,
    },
    sources: [],
    related: ['kunna', 'boliyan', 'pind'],
  },

  {
    key: 'chakki',
    labels: { en: 'Chakki', pa: 'چکی', roman: 'Chakki' },
    type: 'object',
    aliases: ['chakki', 'chakki millstone'],
    notes: {
      en:
        'The hand-turned stone mill. Grinding was done before daylight, and the songs sung '
        + 'over it — the chakki-nama — are among the oldest recorded in Punjabi.',
      pa: null,
    },
    sources: [],
    related: ['charkha', 'pind', 'phulkari'],
  },

  {
    key: 'chhaj',
    labels: { en: 'Chhaj', pa: 'چھاج', roman: 'Chhaj' },
    type: 'object',
    aliases: ['chhaj', 'chhajj'],
    notes: {
      en:
        'The winnowing sieve for separating grain from chaff. A cheap everyday object that '
        + 'carries a whole harvest in its name.',
      pa: null,
    },
    sources: [],
    related: ['kanak', 'chakki', 'pind'],
  },

  {
    key: 'paraat',
    labels: { en: 'Paraat', pa: 'پراٹ', roman: 'Paraat' },
    type: 'object',
    aliases: ['paraat', 'parat'],
    notes: {
      en:
        'The wide shallow brass tray used for kneading dough and, at a wedding, for holding '
        + 'the gifts. The rituals are performed over it, which is what gives it its weight.',
      pa: null,
    },
    sources: [],
    related: ['chhaj', 'phulkari', 'pind'],
  },

  {
    key: 'hookah',
    labels: { en: 'Hookah', pa: 'حقہ', roman: 'Hookah' },
    type: 'object',
    aliases: ['hookah', 'huqqa', 'hukka'],
    notes: {
      en:
        'The water pipe passed around a sitting. It is the object that marks a baithak as '
        + 'social rather than private, and it appears in village scenes the way a teapot does '
        + 'elsewhere.',
      pa: null,
    },
    sources: [
      { label: 'Hookah — reference article', url: 'https://en.wikipedia.org/wiki/Hookah' },
    ],
    related: ['baithak', 'charpai', 'pind'],
  },

  {
    key: 'khussa',
    labels: { en: 'Khussa', pa: 'کھسہ', roman: 'Khussa' },
    type: 'object',
    aliases: ['khussa', 'khussay', 'khussa shoe'],
    notes: {
      en:
        'The hand-stitched leather shoe with an upturned toe, made across the Punjab and '
        + 'given at weddings alongside the phulkari.',
      pa: null,
    },
    sources: [
      { label: 'Khussa — reference article', url: 'https://en.wikipedia.org/wiki/Khussa' },
    ],
    related: ['phulkari', 'punjab'],
  },

  {
    key: 'khes',
    labels: { en: 'Khes', pa: 'کھیس', roman: 'Khes' },
    type: 'object',
    aliases: ['khes', 'khees', 'khes blanket'],
    notes: {
      en:
        'A thick handwoven cotton blanket, coarse and warm — the ordinary bedding of the '
        + 'plains and a marker of winter in folk song.',
      pa: null,
    },
    sources: [],
    related: ['charpai', 'pind', 'phulkari'],
  },

  {
    key: 'peepal',
    labels: { en: 'Peepal', pa: 'پیپل', roman: 'Peepal' },
    type: 'object',
    aliases: ['peepal', 'pipal', 'peepal tree'],
    notes: {
      en:
        'The sacred fig that stands at the centre of a village, usually with a platform '
        + 'around it and often a small shrine. Meetings, rest and gossip all happen under it.',
      pa: null,
    },
    sources: [
      { label: 'Ficus religiosa — reference article', url: 'https://en.wikipedia.org/wiki/Ficus_religiosa' },
    ],
    related: ['bohar', 'pind', 'charpai'],
  },

  {
    key: 'bohar',
    labels: { en: 'Bohar', pa: 'بوہر', roman: 'Bohar' },
    type: 'object',
    aliases: ['bohar', 'banyan', 'bohar tree'],
    notes: {
      en:
        'The banyan, whose hanging roots make the biggest shade in the village. It is where a '
        + 'baithak is held in summer, and where the panchayat sits.',
      pa: null,
    },
    sources: [
      { label: 'Ficus bengalensis — reference article', url: 'https://en.wikipedia.org/wiki/Ficus_bengalensis' },
    ],
    related: ['peepal', 'baithak', 'pind'],
  },

  // ---------------------------------------------------------------------------
  // The traditions
  // ---------------------------------------------------------------------------

  {
    key: 'basant',
    labels: { en: 'Basant', pa: 'بسنت', roman: 'Basant' },
    type: 'tradition',
    aliases: ['basant', 'basant festival', 'kite festival'],
    notes: {
      en:
        'The spring kite festival, for decades the great public event of Lahore. Banned for a '
        + 'period over the injuries metal string caused and since revived in a smaller form — '
        + 'so the festival in living memory and the festival in the songs are not the same '
        + 'thing.',
      pa: null,
    },
    sources: [
      { label: 'Basant — reference article', url: 'https://en.wikipedia.org/wiki/Basant' },
    ],
    related: ['lahore', 'mela', 'sarson', 'punjab'],
  },

  {
    key: 'urs',
    labels: { en: 'Urs', pa: 'عرس', roman: 'Urs' },
    type: 'tradition',
    aliases: ['urs', 'urs mubarak', 'urs festival'],
    notes: {
      en:
        'The anniversary of a Sufi saint\'s death, kept at the shrine with qawwali, '
        + 'processions and days of gathering. Literally "the wedding", because the death is '
        + 'read as a union.',
      pa: null,
    },
    sources: [
      { label: 'Urs — reference article', url: 'https://en.wikipedia.org/wiki/Urs' },
    ],
    related: ['dargah', 'qawwali', 'baba-farid', 'sultan-bahu'],
  },

  {
    key: 'qawwali',
    labels: { en: 'Qawwali', pa: 'قوالی', roman: 'Qawwali' },
    type: 'tradition',
    aliases: ['qawwali', 'qawali', 'qawwal'],
    notes: {
      en:
        'Devotional singing at the shrine, led by a qawwal and a party of musicians and built '
        + 'on repeated verses. The Punjabi Sufi poets are the standard source for its '
        + 'repertoire.',
      pa: null,
    },
    sources: [
      { label: 'Qawwali — reference article', url: 'https://en.wikipedia.org/wiki/Qawwali' },
    ],
    related: ['urs', 'dargah', 'punjabi-sufi-poetry'],
  },

  {
    key: 'mela',
    labels: { en: 'Mela', pa: 'میلہ', roman: 'Mela' },
    type: 'tradition',
    aliases: ['mela', 'melaa'],
    notes: {
      en:
        'A fair, held at a shrine or on a seasonal date, with traders, performers and the '
        + 'dhadi singers. The mela is where the oral tradition was actually transmitted, '
        + 'which is why it matters more to the history of these stories than any manuscript.',
      pa: null,
    },
    sources: [],
    related: ['urs', 'dhadi', 'basant', 'punjab'],
  },

  {
    key: 'kushti',
    labels: { en: 'Kushti', pa: 'کشتی', roman: 'Kushti' },
    type: 'tradition',
    aliases: ['kushti', 'kabaddi', 'kabadi'],
    notes: {
      en:
        'The wrestling and the mud-pit contests that drew crowds to the melas. Punjabi '
        + 'villages produced wrestlers the way other places produce runners.',
      pa: null,
    },
    sources: [
      { label: 'Pehlwani — reference article', url: 'https://en.wikipedia.org/wiki/Pehlwani' },
    ],
    related: ['mela', 'pind', 'punjab'],
  },

  {
    key: 'mirasi',
    labels: { en: 'Mirasi', pa: 'میراثی', roman: 'Mirasi' },
    type: 'tradition',
    aliases: ['mirasi', 'mirasis', 'mirasi bard'],
    notes: {
      en:
        'The hereditary bard and genealogist families who kept the stories and the family '
        + 'trees. Much of what is called traditional in Punjabi music reached us through '
        + 'them.',
      pa: null,
    },
    sources: [
      { label: 'Mirasi — reference article', url: 'https://en.wikipedia.org/wiki/Mirasi' },
    ],
    related: ['dhadi', 'kissa', 'mela'],
  },

  {
    key: 'dhadi',
    labels: { en: 'Dhadi', pa: 'ڈھاڈی', roman: 'Dhadi' },
    type: 'tradition',
    aliases: ['dhadi', 'dhadi singer'],
    notes: {
      en:
        'Ballad singers who perform at melas and shrines with a small drum, narrating the '
        + 'romances and the heroes in long recitative. The dhadi is the live form the qissas '
        + 'were written for.',
      pa: null,
    },
    sources: [],
    related: ['mirasi', 'kissa', 'mela', 'dhol'],
  },

  {
    key: 'siharfi',
    labels: { en: 'Siharfi', pa: 'سی حرفی', roman: 'Siharfi' },
    type: 'tradition',
    aliases: ['siharfi', 'si harfi', 'siharfian'],
    notes: {
      en:
        'An acrostic verse form in which each stanza begins with a successive letter of the '
        + 'alphabet. Bulleh Shah\'s is the best known, and the form is a teaching device as '
        + 'much as a poem.',
      pa: null,
    },
    sources: [],
    related: ['bulleh-shah', 'kafi', 'punjabi-sufi-poetry'],
  },

  // ---------------------------------------------------------------------------
  // The words
  //
  // The last group, and the one a reader most often needs: words that carry
  // more than their dictionary meaning, or that name something the stories
  // assume everybody knows.
  // ---------------------------------------------------------------------------

  {
    key: 'ishq',
    labels: { en: 'Ishq', pa: 'عشق', roman: 'Ishq' },
    type: 'theme',
    aliases: ['ishq', 'aashiq', 'ashiq', 'ishq love'],
    notes: {
      en:
        'Love in the sense the Sufi poets use it — a consuming, testing attachment rather '
        + 'than a pleasant one. In these verses the lover is always at risk, and the story '
        + 'only works if love costs something.',
      pa: null,
    },
    sources: [
      { label: 'Ishq — reference article', url: 'https://en.wikipedia.org/wiki/Ishq' },
    ],
    related: ['virah', 'punjabi-sufi-poetry', 'heer-ranjha', 'jogi'],
  },

  {
    key: 'virah',
    labels: { en: 'Virah', pa: 'ویراہ', roman: 'Virah' },
    type: 'theme',
    aliases: ['virah', 'birah', 'viraha'],
    notes: {
      en:
        'The ache of separation, the state the lover is left in. Punjabi lyric is largely '
        + 'written from inside virah rather than from inside union.',
      pa: null,
    },
    sources: [],
    related: ['ishq', 'judai', 'mahiya', 'boliyan'],
  },

  {
    key: 'judai',
    labels: { en: 'Judai', pa: 'جدائی', roman: 'Judai' },
    type: 'theme',
    aliases: ['judai', 'judaai'],
    notes: {
      en:
        'Parting, and the separation that follows it. A plainer word than virah: judai is the '
        + 'event, virah is the condition it leaves behind.',
      pa: null,
    },
    sources: [],
    related: ['virah', 'ishq', 'sassi-punnhun'],
  },

  {
    key: 'faqir',
    labels: { en: 'Faqir', pa: 'فقیر', roman: 'Faqir' },
    type: 'word',
    aliases: ['faqir', 'faqeer', 'fakir'],
    notes: {
      en:
        'A mendicant who owns nothing. In the Sufi vocabulary it is a title of respect rather '
        + 'than a description of poverty, and the Punjabi poets use it of themselves.',
      pa: null,
    },
    sources: [],
    related: ['jogi', 'dargah', 'punjabi-sufi-poetry'],
  },

  {
    key: 'jogi',
    labels: { en: 'Jogi', pa: 'جوگی', roman: 'Jogi' },
    type: 'word',
    aliases: ['jogi', 'jogia', 'jogis'],
    notes: {
      en:
        'An ascetic in the yogic tradition. Ranjha becomes a jogi when he is refused, which '
        + 'is the turn that makes Heer more than a love story.',
      pa: null,
    },
    sources: [],
    related: ['dheedo-ranjha', 'faqir', 'heer-ranjha'],
  },

  {
    key: 'kissa',
    labels: { en: 'Kissa', pa: 'قصہ', roman: 'Kissa' },
    type: 'word',
    aliases: ['kissa', 'qissa', 'kissay'],
    notes: {
      en:
        'A long narrative poem on a known story — the form the romances were written and '
        + 'printed in. A kissa is a genre with rules, not just a word for a tale.',
      pa: null,
    },
    sources: [],
    related: ['dhadi', 'mirasi', 'heer-ranjha', 'mian-muhammad-baksh'],
  },

  {
    key: 'pind',
    labels: { en: 'Pind', pa: 'پنڈ', roman: 'Pind' },
    type: 'word',
    aliases: ['pind', 'pindh'],
    notes: {
      en:
        'A village. It is the unit the whole tradition is organised around — the mela, the '
        + 'charpai, the charkha and the kissa all belong to a named pind.',
      pa: null,
    },
    sources: [],
    related: ['charpai', 'charkha', 'punjab', 'mela'],
  },

  {
    key: 'dargah',
    labels: { en: 'Dargah', pa: 'درگاہ', roman: 'Dargah' },
    type: 'word',
    aliases: ['dargah', 'mazar', 'mazaar'],
    notes: {
      en:
        'A saint\'s shrine and the pilgrimage around it. The Punjab\'s literary geography is '
        + 'largely a map of dargahs, because that is where the poets are buried and where the '
        + 'urs are held.',
      pa: null,
    },
    sources: [
      { label: 'Dargah — reference article', url: 'https://en.wikipedia.org/wiki/Dargah' },
    ],
    related: ['urs', 'qawwali', 'baba-farid', 'pakpattan'],
  },

  {
    key: 'baithak',
    labels: { en: 'Baithak', pa: 'بیٹھک', roman: 'Baithak' },
    type: 'word',
    aliases: ['baithak', 'baithak gathering'],
    notes: {
      en:
        'A sitting — the meeting place at the edge of a village and, by extension, any '
        + 'gathering where talk, poetry and the hookah are shared. It is also what this '
        + 'platform is named after.',
      pa: null,
    },
    sources: [],
    related: ['charpai', 'hookah', 'bohar', 'pind'],
  },

  {
    key: 'sajjan',
    labels: { en: 'Sajjan', pa: 'سجن', roman: 'Sajjan' },
    type: 'theme',
    aliases: ['sajjan', 'sajna', 'sajjan beloved'],
    notes: {
      en:
        'The beloved, and also simply a good friend or companion — one word doing both jobs. '
        + 'In the Sufi reading the sajjan is the divine, which is what lets a love song and a '
        + 'devotional song be the same song.',
      pa: null,
    },
    sources: [],
    related: ['ishq', 'virah', 'mahiya'],
  },

  {
    key: 'sarson',
    labels: { en: 'Sarson', pa: 'سرسوں', roman: 'Sarson' },
    type: 'word',
    aliases: ['sarson', 'sarson da saag'],
    notes: {
      en:
        'Mustard, whose yellow fields mark the Punjabi spring and whose greens are the dish '
        + 'of the season. Sarson and Basant belong to each other.',
      pa: null,
    },
    sources: [],
    related: ['basant', 'kanak', 'vaisakhi', 'pind'],
  },

  {
    key: 'kanak',
    labels: { en: 'Kanak', pa: 'کنک', roman: 'Kanak' },
    type: 'word',
    aliases: ['kanak', 'kanak wheat'],
    notes: {
      en:
        'Wheat, the crop the harvest festivals are about. The word carries a year\'s income '
        + 'in it, which is why the songs about it are as often anxious as glad.',
      pa: null,
    },
    sources: [],
    related: ['vaisakhi', 'sarson', 'chhaj', 'pind'],
  },

  {
    key: 'nehar',
    labels: { en: 'Nehar', pa: 'نہر', roman: 'Nehar' },
    type: 'word',
    aliases: ['nehar', 'nahar', 'canal'],
    notes: {
      en:
        'An irrigation canal. The colonial canal colonies redrew the Punjabi map, and the '
        + 'nehar is the word the countryside was reorganised around.',
      pa: null,
    },
    sources: [],
    related: ['chenab', 'ravi', 'pind', 'gharoli'],
  },

  {
    key: 'toba',
    labels: { en: 'Toba', pa: 'ٹوبہ', roman: 'Toba' },
    type: 'word',
    aliases: ['toba', 'tobah'],
    notes: {
      en:
        'A small pond or tank, usually at the edge of a settlement and often the only water '
        + 'for miles. Many village names are built from the word.',
      pa: null,
    },
    sources: [],
    related: ['nehar', 'pind', 'punjab'],
  },
];

export default SEED_KEYWORDS;
