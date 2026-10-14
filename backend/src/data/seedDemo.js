import { LANGUAGE, SCRIPT, STORY_STATUS, USER_ROLE } from '../config/constants.js';

/**
 * The demo corpus: accounts, stories and appreciations.
 *
 * This is content, not code, and it exists so that the app can be shown to
 * someone without first asking them to imagine what it looks like full. The
 * frontend deliberately seeds nothing of its own, and CONTENT.md asks that demo
 * records be "explicitly authorized test data" rather than something the app
 * writes on its own — this file is that authorization, it is wired to a script
 * a person has to run by hand, and it should not be pointed at a live database.
 * `BACKEND.md` says so again at the command itself.
 *
 * Three things are worth stating plainly.
 *
 * The Punjabi here is written simply, and it is written to be demonstrated.
 *
 * Every Punjabi variant is short, uses ordinary vocabulary, and is meant to be
 * readable by someone who learned the script at home rather than at a desk.
 * That is also its limit: these are not collected folk texts and they are not
 * Waris Shah. A Punjabi editor should rewrite them before this corpus is
 * presented as anything other than a demonstration, and the Shahmukhi spellings
 * in particular should be checked by someone who writes the script daily.
 *
 * Stories are written to *contain* the words they are about.
 *
 * Keyword attachment is automatic and happens on save — the story service
 * matches the text against the cultural index and stores what it finds. So a
 * story about the vanjhali has to say "vanjhali", and a story set in Jhang has
 * to name Jhang, in the script being written. Writing the bodies this way is not
 * decoration; it is what populates `Keyword.storyCount`, the keyword pages, and
 * the reader affinity profile that `/feed/for-you` ranks on.
 *
 * One tale is told twice, on purpose.
 *
 * `Story.texts` allows one variant per language, so a single document cannot
 * carry both Shahmukhi and Roman Punjabi. Coverage of the three scripts
 * therefore comes from spreading them across the corpus — and from telling Heer
 * Ranjha a second time, in Roman, by a different author. The two documents are
 * unrelated as far as the database is concerned; the repetition is a deliberate
 * demonstration of how the same story lands in a different script.
 */

/**
 * One password for every demo account, documented in BACKEND.md.
 *
 * Shared rather than per-account because the point is that somebody showing the
 * app can sign in as anyone without consulting a list, and because a per-account
 * password would be written down in the same file anyway. It is a demo
 * credential and reads like one.
 */
export const DEMO_PASSWORD = 'baithak123';

/**
 * The accounts, under names common across the Pakistani Punjab.
 *
 * One editor among them, so that the community contribution flow — editing a
 * keyword's labels, adding a source, correcting a note — can be demonstrated
 * without creating a role by hand mid-presentation.
 *
 * `location` is the private field, and it is filled in because a reader's own
 * profile is the only place it renders. It is deliberately a town or a city
 * rather than anything narrower.
 */
export const DEMO_USERS = [
  {
    username: 'gurdeep_sandhu',
    name: 'Gurdeep Sandhu',
    role: USER_ROLE.EDITOR,
    location: 'Lahore',
    bio: 'Reads the qissas in the printed editions and argues about the endings.',
  },
  {
    username: 'zainab_bibi',
    name: 'Zainab Bibi',
    role: USER_ROLE.READER,
    location: 'Jhang',
    bio: 'Grew up on the Chenab side. Knows the Heer story the way other people know a road home.',
  },
  {
    username: 'hamza_sial',
    name: 'Hamza Sial',
    role: USER_ROLE.READER,
    location: 'Jhang',
    bio: 'Collects tappay from whoever will sing one.',
  },
  {
    username: 'ayesha_cheema',
    name: 'Ayesha Cheema',
    role: USER_ROLE.READER,
    location: 'Gujranwala',
    bio: 'Writes short pieces in English for people who did not grow up hearing these stories.',
  },
  {
    username: 'bilal_gondal',
    name: 'Bilal Gondal',
    role: USER_ROLE.READER,
    location: 'Multan',
    bio: 'Writes in Roman Punjabi because that is how the phone types it.',
  },
  {
    username: 'sana_bhatti',
    name: 'Sana Bhatti',
    role: USER_ROLE.READER,
    location: 'Sialkot',
    bio: 'Sings kafi and bulleh shah badly and without embarrassment.',
  },
  {
    username: 'imran_warraich',
    name: 'Imran Warraich',
    role: USER_ROLE.READER,
    location: 'Faisalabad',
    bio: 'Interested in the instruments more than the stories, which is its own way in.',
  },
  {
    username: 'rukhsana_javed',
    name: 'Rukhsana Javed',
    role: USER_ROLE.READER,
    location: 'Bahawalpur',
    bio: 'Writes about the work women did — the charkha, the chakki, the songs that went with them.',
  },
];

/**
 * The stories.
 *
 * `publishedHoursAgo` is applied by the seeder after the save, as a targeted
 * update on `publishedAt`. It is there for two reasons: the default feed sorts
 * newest-first, so without it every seeded story would share a timestamp and the
 * order would be arbitrary; and the "popular this week" rule windows on
 * publication date, so the offsets are kept inside a week so that the whole
 * corpus is eligible for it. Nothing in the corpus is older than that.
 *
 * `ref` is a stable handle used only by `DEMO_LIKES` below. It is not stored.
 *
 * Exactly one variant of each story carries `isOriginal`, which the schema
 * enforces. Where a story is in two languages the Punjabi is usually the
 * original — these are Punjabi stories — with a couple the other way round so
 * that both orderings appear in the corpus.
 */
export const DEMO_STORIES = [
  {
    ref: 'heer-ranjha-shahmukhi',
    author: 'ayesha_cheema',
    status: STORY_STATUS.PUBLISHED,
    publishedHoursAgo: 8,

    texts: [
      {
        language: LANGUAGE.ENGLISH,
        script: SCRIPT.LATIN,
        isOriginal: false,
        title: 'Heer and Ranjha, and the Flute by the River',
        body:
          'Heer was the daughter of Chuchak, the Sial chief of Jhang, and she was proud and '
          + 'quick-tongued, which is how the poets like her. Ranjha was the youngest son of the '
          + 'Ranjha family of Takht Hazara. When his brothers divided the land and left him '
          + 'nothing, he walked away from home, crossed the Jhelum, and came south to the '
          + 'Chenab, where he was taken on to keep the buffalo of the Sial household.\n\n'
          + 'He played the vanjhali while the animals grazed, and Heer heard it. That is the '
          + 'whole of the beginning: a man with a flute, and a woman who stopped to listen. '
          + 'Everything after it is other people deciding what the two of them were allowed to '
          + 'do.\n\n'
          + 'Her family promised her to somebody else. Kaido, her sister-in-law, carried the '
          + 'stories that made sure of it. Ranjha became a jogi and wandered, and the tale ends '
          + 'with both of them dead — which Waris Shah tells as a warning about the world '
          + 'rather than about the lovers.\n\n'
          + 'The story is called Heer Ranjha. It belongs to Heer: she is the one who speaks.',
      },
      {
        language: LANGUAGE.PUNJABI,
        script: SCRIPT.SHAHMUKHI,
        isOriginal: true,
        title: 'ہیر تے رانجھا',
        body:
          'ہیر جھنگ دے سردار چوچک دی دھی سی۔ اوہ بولی دی تیز سی تے دل دی پکی۔ رانجھا تخت ہزارہ '
          + 'توں آیا سی، جدوں اوہدے بھراواں نے اوہنوں زمین نہ دتی۔ اوہ چناب دے کنڈھے بھینساں '
          + 'چراؤندا سی۔\n\n'
          + 'اوہ ونجھلی وگاؤندا سی تے ہیر نے اوہدی آواز سنی۔ بس ایہو شروع اے: اک بندہ، اک ونجھلی، '
          + 'تے اک سنن والی۔\n\n'
          + 'فیر اوہدا ویاہ کسے ہور نال کر دتا گیا۔ کیدو نے گھر والیاں نوں بھڑکایا۔ رانجھا جوگی '
          + 'بن گیا تے دیس دیس پھردا رہیا۔ اخیر تے دونویں مر گئے۔\n\n'
          + 'وارث شاہ نے ایہہ قصہ لکھیا۔ لوک اینوں ہیر رانجھا آکھدے نیں، پر قصہ ہیر دا اے۔',
      },
    ],
  },

  {
    ref: 'heer-ranjha-roman',
    author: 'bilal_gondal',
    status: STORY_STATUS.PUBLISHED,
    publishedHoursAgo: 30,

    texts: [
      {
        language: LANGUAGE.ENGLISH,
        script: SCRIPT.LATIN,
        isOriginal: false,
        title: 'The same Heer Ranjha, written the way a phone types it',
        body:
          'This is the Heer Ranjha story again, told shorter and in Roman Punjabi, which is how '
          + 'most people my age write. Nothing here is new. The point is only that the same tale '
          + 'looks different in a different script, and both of them are Punjabi.\n\n'
          + 'Heer of Jhang, Ranjha of Takht Hazara, the buffalo on the Chenab, the vanjhali, the '
          + 'marriage to somebody else, the years as a jogi, and the end that everybody already '
          + 'knows is coming. Waris Shah wrote it down; the villages had it before that.',
      },
      {
        language: LANGUAGE.PUNJABI,
        script: SCRIPT.ROMAN,
        isOriginal: true,
        title: 'Heer te Ranjha — Roman vich',
        body:
          'Heer Jhang di si, te Ranjha Takht Hazara da. Ranjha de bhraawan ne ohnu zameen nahi '
          + 'ditti, te ohnu pind chhadna paya. O Chenab de kinare bheensan charaunda si.\n\n'
          + 'O wanjhli wajonda si, te Heer ne wanjhli di awaaz suni. Bas, eho shuru eh.\n\n'
          + 'Fir Heer da viah kise hor naal kar ditta gaya. Kaido ne ghar waleyan nu bharhkaya. '
          + 'Ranjha jogi ban ke desh desh phirda raehya. Akhir vich dono mar gaye.\n\n'
          + 'Waris Shah ne eh kissa likhya. Lokan ne isse Heer Ranjha kehnda, par kissa Heer da '
          + 'eh.',
      },
    ],
  },

  {
    ref: 'mirza-sahiban',
    author: 'hamza_sial',
    status: STORY_STATUS.PUBLISHED,
    publishedHoursAgo: 14,

    texts: [
      {
        language: LANGUAGE.ENGLISH,
        script: SCRIPT.LATIN,
        isOriginal: false,
        title: 'Mirza and Sahiban, and the Broken Arrows',
        body:
          'Mirza and Sahiban grew up in Khewa, near Jhang, as cousins, and were promised to '
          + 'other people. They ran. Her brothers followed them, and Mirza was the better '
          + 'archer by a distance — everyone in the story knows that, including Sahiban.\n\n'
          + 'She broke his arrows in the night so that he would not kill her brothers. He woke '
          + 'to a fight he could not win and died in it. The whole argument about this story is '
          + 'whether that was love or betrayal, and the tale has never settled it.\n\n'
          + 'Mirza is remembered as much for his bow as for the girl, and the tappay sung about '
          + 'him are usually about pride rather than grief.',
      },
      {
        language: LANGUAGE.PUNJABI,
        script: SCRIPT.SHAHMUKHI,
        isOriginal: true,
        title: 'مرزا صاحباں',
        body:
          'مرزا تے صاحباں کھیوہ وچ وڈے ہوئے۔ اوہ اک دوجے دے رشتہ دار سن تے اوہناں دا ویاہ ہور '
          + 'جگہ طے ہو چکیا سی۔\n\n'
          + 'اوہ نس گئے۔ صاحباں دے بھرا پچھے آئے۔ رات نوں صاحباں نے مرزا دے تیر توڑ دتے تاں جو اوہ '
          + 'اوہدے بھراواں نوں نہ مارے۔\n\n'
          + 'سویرے لڑائی ہوئی تے مرزا ماریا گیا۔ اج تک لوک آکھدے نیں: ایہہ محبت سی یا دغا؟ قصہ '
          + 'اجے وی نہیں طے ہویا۔',
      },
    ],
  },

  {
    ref: 'sassi-punnhun',
    author: 'zainab_bibi',
    status: STORY_STATUS.PUBLISHED,
    publishedHoursAgo: 22,

    texts: [
      {
        language: LANGUAGE.ENGLISH,
        script: SCRIPT.LATIN,
        isOriginal: false,
        title: 'Sassi, Punnhun, and the Road into the Desert',
        body:
          'Sassi was found as a baby at Bhambhor, near the Indus, and raised by a washerman. '
          + 'Punnhun was the son of the ruler of Kech, and he was carried off in his sleep by '
          + 'Sassi\'s brothers on the night they had run away together.\n\n'
          + 'She woke alone and walked after him, into the desert, and did not stop. That walk '
          + 'is the part Punjabi poetry kept: not the meeting, but the going after, and the '
          + 'ground that does not end.\n\n'
          + 'Punnhun is the quieter figure of the two, which is why the story is usually named '
          + 'for her — she is the one who does something.',
      },
      {
        language: LANGUAGE.PUNJABI,
        script: SCRIPT.ROMAN,
        isOriginal: true,
        title: 'Sassi te Punnhun',
        body:
          'Sassi nu chhoti umar vich Bhambhor ton labya gaya si, te ek dhobi ne ohnu palya. '
          + 'Punnhun Kech de wadde da puttar si.\n\n'
          + 'Jis raat dono bhaage, os raat Sassi de bhraawan ne sohnde Punnhun nu chak ke le '
          + 'gaye. Sassi jaagi te ohnu labhda hoya pichhe tur payi, registan vich.\n\n'
          + 'Punjabi shairi ne os turan nu yaad rakheya — milap nu nahi, pichhe turan nu. Te oh '
          + 'zameen jo mukdi nahi.',
      },
    ],
  },

  {
    ref: 'sohni-mahiwal',
    author: 'imran_warraich',
    status: STORY_STATUS.PUBLISHED,
    publishedHoursAgo: 19,

    texts: [
      {
        language: LANGUAGE.ENGLISH,
        script: SCRIPT.LATIN,
        isOriginal: false,
        title: 'Sohni Crossed the Chenab on a Pot',
        body:
          'Sohni was a potter\'s daughter in Gujrat. Mahiwal was a trader from Bukhara, born '
          + 'Izzat Baig, who gave up the road and settled on the far bank of the Chenab so as '
          + 'to be near her — tending buffalo, which is where the name comes from.\n\n'
          + 'Every night she crossed the river to him by floating on an earthen kunna. The pot '
          + 'is the whole story. It is small and unglamorous and it is the only thing keeping '
          + 'her alive, and somebody substituted a raw one, which came apart in the water.\n\n'
          + 'The Chenab is the river of the romances, and this is the one that made it one.',
      },
      {
        language: LANGUAGE.PUNJABI,
        script: SCRIPT.SHAHMUKHI,
        isOriginal: true,
        title: 'سوہنی مہیوال',
        body:
          'سوہنی گجرات دی کُمہار دی دھی سی۔ مہیوال بخارا توں آیا سی، تے چناب دے پرلے کنڈھے رہن '
          + 'لگ پیا۔ اوہ مجھیاں چراؤندا سی، تے ایسے لئی اوہنوں مہیوال آکھدے نیں۔\n\n'
          + 'ہر رات سوہنی کنّا لے کے چناب لنگھدی سی۔ کنّا ای ساری کہانی اے۔\n\n'
          + 'اک رات اوہدے گھر والیاں نے کچا کنّا رکھ دتا۔ اوہ پاݨی وچ گل گیا تے سوہنی ڈُب گئی۔ '
          + 'مہیوال وی اوہدوں بعد نہ جیا۔',
      },
    ],
  },

  {
    ref: 'waris-shah',
    author: 'ayesha_cheema',
    status: STORY_STATUS.PUBLISHED,
    publishedHoursAgo: 52,

    texts: [
      {
        language: LANGUAGE.ENGLISH,
        script: SCRIPT.LATIN,
        isOriginal: true,
        title: 'Waris Shah, who wrote Heer down',
        body:
          'Waris Shah lived in the eighteenth century, in a Punjab that was about to be divided '
          + 'by people who had not been born yet. He did not invent Heer Ranjha. He heard it, '
          + 'the way everyone heard it, and he wrote it as a kissa — long, in verse, in the '
          + 'Punjabi people actually spoke.\n\n'
          + 'His version is the one that matters now, because it is the one the singers work '
          + 'from. A qawwal or a dhadi performing Heer tonight is usually performing Waris Shah '
          + 'and calling it Heer.\n\n'
          + 'That is a strange thing to say about a story nobody owns, and it is what happens '
          + 'when one telling is better than the others.',
      },
      {
        language: LANGUAGE.PUNJABI,
        script: SCRIPT.SHAHMUKHI,
        isOriginal: false,
        title: 'وارث شاہ',
        body:
          'وارث شاہ اٹھارویں صدی وچ سی۔ اوہنے ہیر رانجھا کہانی نہیں بنائی سی — اوہنے ایہہ سنی سی، '
          + 'جیویں سارے سندے سن، تے ایہنوں قصہ بنا کے لکھ دتا۔\n\n'
          + 'اج جہڑے قوال تے ڈھاڈی ہیر گاؤندے نیں، اوہ وارث شاہ گاؤندے نیں تے اوہنوں ہیر آکھدے نیں۔',
      },
    ],
  },

  {
    ref: 'bulleh-shah',
    author: 'sana_bhatti',
    status: STORY_STATUS.PUBLISHED,
    publishedHoursAgo: 27,

    texts: [
      {
        language: LANGUAGE.ENGLISH,
        script: SCRIPT.LATIN,
        isOriginal: false,
        title: 'Bulleh Shah, and the kafis people quote to win arguments',
        body:
          'Bulleh Shah of Kasur wrote kafis, and the ones everybody knows are the ones that '
          + 'pick a fight. He does not respect the maulvi, or the caste, or the pilgrim who '
          + 'thinks the journey is the point. The verses are short enough to remember and sharp '
          + 'enough to be quoted at somebody.\n\n'
          + 'They are also sung constantly. His kafis are in the qawwali repertoire and, '
          + 'separately, in the pop music of three countries, which is how a seventeenth-century '
          + 'poet ends up on a wedding playlist.\n\n'
          + 'His shrine is in Kasur and his urs is held there. A siharfi of his is the first '
          + 'thing every Punjabi schoolchild learns by heart.',
      },
      {
        language: LANGUAGE.PUNJABI,
        script: SCRIPT.SHAHMUKHI,
        isOriginal: true,
        title: 'بلھے شاہ',
        body:
          'بلھے شاہ قصور دا سی۔ اوہنے کافی لکھیاں، تے جہڑیاں ساریاں نوں یاد نیں اوہ اوہو نیں جیہڑیاں '
          + 'جھگڑا کردیاں نیں۔\n\n'
          + 'اوہ ملاں نوں نہیں مندا، نہ ذات نوں، نہ اوہنوں جیہڑا سمجھدا اے کہ صرف سفر ای مقصد اے۔\n\n'
          + 'اوہدیاں کافیاں اج وی قوالی دے نال گائیدیاں نیں۔ اوہدا عرس قصور وچ ہوندا اے۔',
      },
    ],
  },

  {
    ref: 'baba-farid',
    author: 'gurdeep_sandhu',
    status: STORY_STATUS.DRAFT,
    publishedHoursAgo: null,

    texts: [
      {
        language: LANGUAGE.ENGLISH,
        script: SCRIPT.LATIN,
        isOriginal: false,
        title: 'Baba Farid, the oldest Punjabi there is (draft)',
        body:
          'This one is unfinished. Baba Farid was a twelfth-century Sufi, and his Punjabi verse '
          + 'is the earliest recorded poetry in the language — which means every claim about '
          + 'what is "traditional" in Punjabi eventually has to pass through him.\n\n'
          + 'He is buried at Pakpattan, on the Sutlej, and the urs there is one of the biggest '
          + 'in the country. His verses are also the only Punjabi ones in the Guru Granth '
          + 'Sahib, which is the reason the same shlokas are recited by people who would not '
          + 'agree about very much else.\n\n'
          + 'Still to write: why the manuscript attributions are such a mess, and which '
          + 'couplets are certainly his.',
      },
      {
        language: LANGUAGE.PUNJABI,
        script: SCRIPT.SHAHMUKHI,
        isOriginal: true,
        title: 'بابا فرید (ادھورا)',
        body:
          'بابا فرید بارویں صدی دے صوفی سن۔ اوہناں دی پنجابی شاعری اس بولی دی سبھ توں پرانی شاعری اے۔\n\n'
          + 'اوہناں دا مزار پاکپتن وچ اے، ستلج دے کنڈھے۔ اوتھے عرس ہوندا اے۔',
      },
    ],
  },

  {
    ref: 'dulla-bhatti',
    author: 'bilal_gondal',
    status: STORY_STATUS.PUBLISHED,
    publishedHoursAgo: 70,

    texts: [
      {
        language: LANGUAGE.ENGLISH,
        script: SCRIPT.LATIN,
        isOriginal: false,
        title: 'Dulla Bhatti, and why Lohri songs name a rebel',
        body:
          'Dulla Bhatti was a sixteenth-century landholder in the Sandal Bar who refused the '
          + 'Mughal revenue and robbed travellers instead, which made him a bandit to Lahore and '
          + 'something else entirely to the villages.\n\n'
          + 'He is sung about at Lohri, at the winter bonfire. Nobody is quite sure how a rebel '
          + 'against a revenue demand became the figure in a festival about a new marriage, and '
          + 'the honest answer is that both things are about the same kind of house: one that '
          + 'has enough to get through the winter.\n\n'
          + 'He was executed in Lahore. The songs do not mention that part.',
      },
      {
        language: LANGUAGE.PUNJABI,
        script: SCRIPT.ROMAN,
        isOriginal: true,
        title: 'Dulla Bhatti',
        body:
          'Dulla Bhatti Sandal Bar da si. Mughal sarkar da lagaan ohnu manzoor nahi si, te oh '
          + 'raah chon langhne waleyan ton paisa lenda si.\n\n'
          + 'Aj vi Lohri te ohnu gaandey ne, jadon siyal da jagaala balda eh. Nawi shadi te ja '
          + 'naya jammya bacha — dono layi.\n\n'
          + 'Lahore vich ohnu maar ditta gaya si. Gaane os gal da zikr nahi karde.',
      },
    ],
  },

  {
    ref: 'raja-rasalu',
    author: 'hamza_sial',
    status: STORY_STATUS.PUBLISHED,
    publishedHoursAgo: 88,

    texts: [
      {
        language: LANGUAGE.PUNJABI,
        script: SCRIPT.SHAHMUKHI,
        isOriginal: true,
        title: 'راجا رسالو',
        body:
          'راجا رسالو سیالکوٹ دا راجا سی، پر اوہدی کہانی راجے دی کہانی نہیں — اوہ جواری تے '
          + 'چالاک بندے دی کہانی اے۔ اوہ جہلم دے کنڈھے تے پوٹھوہار دی پہاڑی تھاں دا پھرن والا اے۔\n\n'
          + 'اوہدے نال اک گھوڑا اے جیہڑا بولد اے۔ اوہ جتھے جاندا اے، اوتھے شرط لا لگاندی اے تے لوک '
          + 'ہاردے نیں۔\n\n'
          + 'ایہہ قصہ وڈی عمر دا اے — ہیر توں وی پرانا۔ میلےآں تے ڈھاڈی اینوں رات بھر گاؤندے نیں۔',
      },
    ],
  },

  {
    ref: 'vanjhali',
    author: 'imran_warraich',
    status: STORY_STATUS.PUBLISHED,
    publishedHoursAgo: 44,

    texts: [
      {
        language: LANGUAGE.ENGLISH,
        script: SCRIPT.LATIN,
        isOriginal: true,
        title: 'The vanjhali, and what a flute is doing in a love story',
        body:
          'The vanjhali is the shepherds\' flute, and in the folk stories it is not a prop. '
          + 'Ranjha plays it to the buffalo on the Chenab, and Heer hears it and that is how the '
          + 'tragedy starts. A sound nobody was meant to notice changes two lives.\n\n'
          + 'Herding instruments are all through this tradition for the same reason: the '
          + 'vanjhali, the algohza, the tumbi. They were played by people alone with animals for '
          + 'hours at a time, which is where long melody comes from before anybody decides to '
          + 'call it music.\n\n'
          + 'The vanjhali is a simple pipe. The whole weight of the story rests on it anyway, and '
          + 'that is the point of putting it there.',
      },
    ],
  },

  {
    ref: 'charkha',
    author: 'rukhsana_javed',
    status: STORY_STATUS.PUBLISHED,
    publishedHoursAgo: 61,

    texts: [
      {
        language: LANGUAGE.ENGLISH,
        script: SCRIPT.LATIN,
        isOriginal: false,
        title: 'The charkha, the chakki, and the songs that went with them',
        body:
          'My grandmother could say which hour it was by what the women of the house were '
          + 'doing. The chakki first, before light, because the flour for the day had to be '
          + 'ground and the stone had to be turned by hand. Then the charkha, in the afternoon, '
          + 'in the shade of the bohar.\n\n'
          + 'Both jobs left the mouth free, so both were done with singing. The chakki-nama and '
          + 'the charkha songs are collected separately now, and the work they were written for '
          + 'has mostly stopped.\n\n'
          + 'This is not nostalgia. It was long work done badly paid, and no one should want it '
          + 'back. But the songs were the record of it, and they are still better than anything '
          + 'written about it since.',
      },
      {
        language: LANGUAGE.PUNJABI,
        script: SCRIPT.SHAHMUKHI,
        isOriginal: true,
        title: 'چرخہ تے چکی',
        body:
          'ساڈی بی بی آکھدی سی: چکی پہلاں، چرخہ فیر۔ چکی رات نوں پیہندی سی، تے چرخہ دوپہر نوں بوہر '
          + 'دی چھاں وچ۔\n\n'
          + 'دونویں کم ایسے سن جتھے منہ خالی سی، تے ایسے لئی دونویں گیت گاؤندیاں سن۔ چکی نامہ تے '
          + 'چرخے دے گیت ہن کتاباں وچ نیں۔\n\n'
          + 'ایہہ کم اوکھا سی تے پیسہ گھٹ سی۔ پر گیت ایہدے ریکارڈ نیں۔',
      },
    ],
  },

  {
    ref: 'boliyan',
    author: 'sana_bhatti',
    status: STORY_STATUS.PUBLISHED,
    publishedHoursAgo: 36,

    texts: [
      {
        language: LANGUAGE.ENGLISH,
        script: SCRIPT.LATIN,
        isOriginal: false,
        title: 'Boliyan at a wedding, and who is allowed to say what',
        body:
          'A boli is two lines long and does the work of a speech. At a wedding the giddha '
          + 'starts and the boliyan go round the circle, and the ones that land are the ones '
          + 'aimed at somebody in the room — a brother-in-law, a mother-in-law, a groom who is '
          + 'enjoying himself too much.\n\n'
          + 'The form does not care about the poet. Women who would never be given a '
          + 'microphone have been composing couplets for generations, and the couplets are '
          + 'better than the speeches.\n\n'
          + 'New ones are still being written about weddings, harvests, prices at the market and '
          + 'the government. The tradition is not a museum piece; it is what people do when the '
          + 'dhol starts.',
      },
      {
        language: LANGUAGE.PUNJABI,
        script: SCRIPT.SHAHMUKHI,
        isOriginal: true,
        title: 'بولیاں',
        body:
          'اک بولی دو مصرعیاں دی ہوندی اے، تے اک تقریر دا کم کر دی اے۔ ویاہ تے گیدھا شروع ہوندا '
          + 'اے تے بولیاں چکر وچ گھمدیاں نیں۔\n\n'
          + 'جیہڑی بولی لگدی اے، اوہ کسے لئی ہوندی اے — سالے لئی، سسّ لئی، تے اوہناں لئی جیہڑے ویاہ '
          + 'تے ودھ خوش ہوندے نیں۔\n\n'
          + 'نویاں بولیاں اج وی بن دیاں نیں — فصل تے، بازار دے بھاؤ تے، سرکار تے۔',
      },
    ],
  },

  {
    ref: 'vaisakhi',
    author: 'rukhsana_javed',
    status: STORY_STATUS.PUBLISHED,
    publishedHoursAgo: 100,

    texts: [
      {
        language: LANGUAGE.ENGLISH,
        script: SCRIPT.LATIN,
        isOriginal: false,
        title: 'Vaisakhi is two festivals that share a date',
        body:
          'In April the kanak comes in, and in April the Khalsa was founded in 1699. Both of '
          + 'those are Vaisakhi, and which one a family is marking depends entirely on the '
          + 'family.\n\n'
          + 'On the harvest side it is the one time of year the whole village is solvent at '
          + 'once, and the dhol comes out and the bhangra is danced in the fields rather than on '
          + 'a stage. The sarson is finished by then; the wheat is what is being carried home.\n\n'
          + 'The two meanings coexist without much trouble, which is worth noticing. The Punjab '
          + 'is not the only place where a festival keeps a debt to a harvest and a debt to '
          + 'history at the same time.',
      },
      {
        language: LANGUAGE.PUNJABI,
        script: SCRIPT.ROMAN,
        isOriginal: true,
        title: 'Vaisakhi',
        body:
          'April vich kanak aa jaandi eh, te April vich Khalsa di neev 1699 vich rakkhi gayi '
          + 'si. Dono Vaisakhi ne.\n\n'
          + 'Fasal de pase ton, eh saal da oh waqt eh jadon pura pind vich paisa hunda eh. Dhol '
          + 'nikalda eh, te bhangra khetaan vich nachiya janda eh — stage te nahi.\n\n'
          + 'Sarson te rounka muk chukka hunda eh. Kanak ghare ja rehi hundi eh.',
      },
    ],
  },

  {
    ref: 'basant',
    author: 'zainab_bibi',
    status: STORY_STATUS.PUBLISHED,
    publishedHoursAgo: 5,

    texts: [
      {
        language: LANGUAGE.ENGLISH,
        script: SCRIPT.LATIN,
        isOriginal: false,
        title: 'Basant in Lahore, before and after the ban',
        body:
          'Basant was the day Lahore went onto its roofs. Sarson yellow everywhere, kites over '
          + 'the old city, and the whole town outside looking up. It was a festival about the '
          + 'change of season that turned into a competition about roof space.\n\n'
          + 'Then the metal string arrived. People were killed by it — motorcyclists mostly, '
          + 'catching a line across the throat at speed — and the sport was banned, and the '
          + 'roofs emptied.\n\n'
          + 'A smaller Basant has been allowed back since. It is not the same festival and the '
          + 'people who remember the old one will tell you so, at length, and they are right.',
      },
      {
        language: LANGUAGE.PUNJABI,
        script: SCRIPT.SHAHMUKHI,
        isOriginal: true,
        title: 'بسنت لاہور وچ',
        body:
          'بسنت دے دن لاہور چھتاں تے چڑھ جاندا سی۔ سرسوں دی پیلے رنگ، پرانی شہر تے پتنگاں، تے پورا '
          + 'شہر اُتے ویکھدا ہویا۔\n\n'
          + 'فیر دھاتی ڈور آئی۔ لوک مرن لگے، بس زیادہ تر موٹر سائیکل والے۔ سرکار نے پابندی لا دتی '
          + 'تے چھتاں خالی ہو گئیاں۔\n\n'
          + 'ہن چھوٹی بسنت واپس آئی اے۔ اوہ پرانی بسنت نہیں اے، تے جہڑے لوک پرانی یاد رکھدے نیں اوہ '
          + 'ایہہ گَل دسدے نیں۔',
      },
    ],
  },

  {
    ref: 'puran-bhagat',
    author: 'gurdeep_sandhu',
    status: STORY_STATUS.PUBLISHED,
    publishedHoursAgo: 76,

    texts: [
      {
        language: LANGUAGE.ENGLISH,
        script: SCRIPT.LATIN,
        isOriginal: false,
        title: 'Puran Bhagat, told two ways at once',
        body:
          'Puran was a prince of Sialkot who was accused of something he had not done, had his '
          + 'hands and feet cut off, and was thrown into a well. A jogi pulled him out and he '
          + 'became an ascetic, which is the version that ends well.\n\n'
          + 'The same story is told by Punjabi Muslims and by Sikhs with different endings and '
          + 'different lessons. For the first it is about patience under a false accusation; for '
          + 'the second, Puran Bhagat is a figure of renunciation.\n\n'
          + 'It is a good example of how these tales work. Nobody argues about the well. '
          + 'Everybody argues about what getting out of it means.',
      },
      {
        language: LANGUAGE.PUNJABI,
        script: SCRIPT.SHAHMUKHI,
        isOriginal: true,
        title: 'پورن بھگت',
        body:
          'پورن سیالکوٹ دا شہزادہ سی۔ اوہدے تے جھوٹھا الزام لایا گیا، اوہدے ہتھ پیر وڈے گئے، تے '
          + 'اوہنوں کھوہ وچ سُٹ دتا گیا۔\n\n'
          + 'اک جوگی نے اوہنوں کڈھیا تے اوہ سنیاسن بن گیا۔\n\n'
          + 'ایہہ قصہ مسلمان تے سکھ دونویں سناوندے نیں، پر انت تے سبق وکھرے نیں۔',
      },
    ],
  },
];

/**
 * Who appreciated what.
 *
 * Keyed by the story `ref` above, valued by the usernames that liked it. The
 * counts matter for more than appearance: `/feed/popular` ranks this week's
 * stories by appreciation, and `/feed/for-you` ranks on the profile that
 * appreciation builds, so a corpus with no likes would leave both of those
 * screens empty while looking perfectly healthy everywhere else.
 *
 * The spread is uneven on purpose — a two-way tie for first place demonstrates
 * nothing about the ranking. Authors never appear as likers of their own work,
 * which the seeder checks.
 */
export const DEMO_LIKES = {
  'heer-ranjha-shahmukhi': [
    'zainab_bibi',
    'hamza_sial',
    'bilal_gondal',
    'sana_bhatti',
    'imran_warraich',
    'rukhsana_javed',
    'gurdeep_sandhu',
  ],
  'heer-ranjha-roman': ['ayesha_cheema', 'zainab_bibi', 'hamza_sial', 'sana_bhatti'],
  'mirza-sahiban': ['ayesha_cheema', 'zainab_bibi', 'sana_bhatti', 'gurdeep_sandhu', 'bilal_gondal'],
  'sassi-punnhun': ['ayesha_cheema', 'hamza_sial', 'rukhsana_javed', 'imran_warraich'],
  'sohni-mahiwal': [
    'zainab_bibi',
    'hamza_sial',
    'ayesha_cheema',
    'bilal_gondal',
    'sana_bhatti',
    'gurdeep_sandhu',
  ],
  'waris-shah': ['gurdeep_sandhu', 'sana_bhatti', 'hamza_sial'],
  'bulleh-shah': ['gurdeep_sandhu', 'rukhsana_javed', 'zainab_bibi', 'imran_warraich', 'ayesha_cheema'],
  'dulla-bhatti': ['hamza_sial', 'rukhsana_javed', 'zainab_bibi'],
  'raja-rasalu': ['bilal_gondal', 'gurdeep_sandhu', 'ayesha_cheema', 'zainab_bibi'],
  vanjhali: ['sana_bhatti', 'hamza_sial', 'rukhsana_javed', 'ayesha_cheema', 'gurdeep_sandhu'],
  charkha: [
    'zainab_bibi',
    'sana_bhatti',
    'ayesha_cheema',
    'gurdeep_sandhu',
    'hamza_sial',
    'imran_warraich',
  ],
  boliyan: ['zainab_bibi', 'rukhsana_javed', 'hamza_sial'],
  vaisakhi: ['hamza_sial', 'sana_bhatti', 'imran_warraich', 'bilal_gondal'],
  basant: ['ayesha_cheema', 'sana_bhatti', 'bilal_gondal', 'gurdeep_sandhu', 'rukhsana_javed'],
  'puran-bhagat': ['hamza_sial', 'zainab_bibi', 'sana_bhatti'],
};

export default { DEMO_PASSWORD, DEMO_USERS, DEMO_STORIES, DEMO_LIKES };
