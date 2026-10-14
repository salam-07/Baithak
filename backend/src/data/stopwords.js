import { normalizeText } from '../utils/normalize.js';

/**
 * Stopwords for the frequency fallback.
 *
 * These matter more than the curated index does for term quality, because the
 * fallback runs on *every* story and its output lands on the reader's profile.
 * A function word that slips through is not a small error: `di` appearing in
 * every other Punjabi story would become one of the strongest signals on
 * everyone's profile, and the affinity feed would start recommending stories
 * because they contain the word "of".
 *
 * The lists are written in their own script rather than transliterated, because
 * normalization does not map Shahmukhi to Latin — a Shahmukhi word and its Roman
 * spelling are different tokens by design, and both need covering.
 *
 * This is a starting set, tuned by reading, and it is expected to change. It is
 * deliberately a plain data file with no logic so that extending it is an edit
 * rather than a code change.
 */

/**
 * English function words, plus the narrative filler that dominates short folk
 * retellings ("then", "so", "said"). The filler is included on purpose: those
 * words are frequent in exactly the stories this product hosts, which is what
 * makes them useless as keywords.
 */
export const ENGLISH_STOPWORDS = [
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'also', 'am', 'an',
  'and', 'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
  'below', 'between', 'both', 'but', 'by', 'came', 'can', 'cannot', 'could',
  'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'either', 'else',
  'even', 'ever', 'every', 'few', 'for', 'from', 'further', 'get', 'got', 'had',
  'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him',
  'himself', 'his', 'how', 'however', 'i', 'if', 'in', 'into', 'is', 'it',
  'its', 'itself', 'just', 'let', 'like', 'made', 'make', 'many', 'may', 'me',
  'might', 'more', 'most', 'much', 'must', 'my', 'myself', 'neither', 'never',
  'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'one', 'only', 'or',
  'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'per', 'rather',
  'said', 'same', 'says', 'she', 'should', 'since', 'so', 'some', 'still',
  'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves',
  'then', 'there', 'these', 'they', 'this', 'those', 'though', 'through',
  'thus', 'to', 'too', 'under', 'until', 'up', 'upon', 'us', 'very', 'was',
  'we', 'were', 'what', 'when', 'where', 'whether', 'which', 'while', 'who',
  'whom', 'whose', 'why', 'will', 'with', 'within', 'would', 'yet', 'you',
  'your', 'yours', 'yourself', 'yourselves',
];

/**
 * Roman Urdu / Roman Punjabi function words.
 *
 * Spellings vary a lot in practice — `vich` and `wich`, `nahi` and `nahin`,
 * `hun` and `hunn` — so variants are listed separately rather than folded.
 * Folding them would mean guessing at a rule, and a wrong rule here removes a
 * real word from the index.
 */
export const ROMAN_STOPWORDS = [
  'aan', 'aaya', 'aayi', 'aaye', 'ae', 'agge', 'agi', 'ai', 'aida', 'ainda',
  'assi', 'asi', 'aye', 'baad', 'bahut', 'bas', 'bhi', 'bohat', 'changa',
  'changi', 'chhad', 'da', 'daa', 'dae', 'dah', 'de', 'dee', 'den', 'deya',
  'di', 'dia', 'dian', 'dii', 'din', 'ditta', 'diya', 'diyan', 'do',
  'eh', 'enj', 'ethe', 'fer', 'fir', 'gi', 'gia', 'gai', 'gie', 'gya',
  // `hai` is the copula and the single most frequent word in Roman Punjabi, so
  // its absence here was the largest gap in this list: it would have appeared
  // in nearly every story and become one of the strongest terms on every
  // reader's profile. `hain` and `hae` are the same word, spelled as people
  // spell it.
  'hai', 'hain', 'hae',
  'ho',
  'hoge', 'hoya', 'hoye', 'hoi', 'hua', 'hun', 'hunn', 'ich', 'ik', 'ikka',
  'je', 'jeda', 'jedi', 'jidon', 'jo', 'jod', 'kade', 'kadi', 'kadon', 'kaun',
  'ke', 'keeta', 'keeti', 'kihda', 'kihdi', 'kihde', 'ki', 'kia', 'kinj', 'kis',
  'kise', 'kiwain', 'ko', 'koi', 'kuch', 'kujh', 'kuj', 'la', 'lai', 'layi',
  'le', 'leya', 'li', 'lia', 'lo', 'main', 'mai', 'mein', 'menu', 'mera', 'meri',
  'mere', 'nahi', 'nahin', 'na', 'nal', 'nalon', 'ne', 'ni', 'nu',
  'o', 'oh', 'ohi', 'ohna', 'ona', 'on', 'othe', 'par', 'pe', 'pichhe',
  'phir', 'raha', 'rahi', 'rahe', 'reha', 'rehi', 'rehe', 'sa', 'saanu', 'sada',
  'sadi', 'sade', 'si', 'sia', 'so', 'ta', 'taan', 'te', 'tenu', 'tera', 'teri',
  'tere', 'tha', 'the', 'thi', 'thia', 'thon', 'to', 'ton', 'tu', 'tusi',
  'tusin', 'us', 'uta', 'ute', 'uthon', 'utte', 've', 'vich', 'vech', 'vi',
  'vadha', 'vadhi', 'wala', 'wali', 'wale', 'wal', 'we', 'wi', 'wich', 'ya',
  'yaar', 'ye', 'yeh',
];

/**
 * Shahmukhi function words, covering Punjabi and the Urdu connective vocabulary
 * that appears in Punjabi prose.
 *
 * Bari ye and do-chashmi he spellings are written as they normally appear,
 * because normalization preserves both — a list written with the folded form
 * would simply never match the text it is meant to filter.
 */
export const SHAHMUKHI_STOPWORDS = [
  'اے', 'اوہ', 'اوہی', 'اوہناں', 'انہاں', 'اسی', 'اسیں', 'اس', 'اوس', 'ایہہ',
  'ایہ', 'ایتھے', 'اوتھے', 'اُتے', 'اتے', 'اچ', 'ان', 'او', 'پر', 'تے', 'توں',
  'تسی', 'تُسی', 'تُساں', 'ناں', 'نے', 'نوں', 'نال', 'نالوں', 'کولوں', 'وچ',
  'وچوں', 'وچکار', 'دا', 'دی', 'دے', 'دیاں', 'داں', 'دیا', 'دی', 'نو', 'ہے',
  'ہن', 'ہی', 'ہیگا', 'سی', 'ساں', 'سن', 'سیاں', 'جو', 'جیہڑا', 'جیہڑی',
  'جیہڑے', 'کجھ', 'کچھ', 'کوئی', 'کدی', 'کدے', 'کدوں', 'کس', 'کِس', 'کہ',
  'کی', 'کیا', 'کیوں', 'کنج', 'کِنج', 'کنے', 'کہڑا', 'کہڑی', 'میں', 'مینوں',
  'میرا', 'میری', 'میرے', 'سانوں', 'ساڈا', 'ساڈی', 'ساڈے', 'تیرا', 'تیری',
  'تیرے', 'تینوں', 'اوہد', 'اوہدا', 'اوہدی', 'اوہدے', 'فیر', 'پھر', 'وڈا',
  'وڈی', 'وڈے', 'بہت', 'بڑا', 'بڑی', 'بڑے', 'وی', 'وِی', 'بھی', 'لئی', 'لئ',
  'لے', 'لیا', 'لے کے', 'کے', 'کیتی', 'کیتا', 'کیتے', 'کردا', 'کردی', 'کردے',
  'کر', 'کرو', 'ہویا', 'ہوئی', 'ہوئے', 'ہوندا', 'ہوندی', 'ہوندے', 'ہو', 'گیا',
  'گئی', 'گئے', 'گی', 'والا', 'والی', 'والے', 'وال', 'والیاں', 'والیاں',
  'طرح', 'طراں', 'جداں', 'جدوں', 'جیدوں', 'ایداں', 'اویداں', 'ایدوں', 'ہر',
  'کدی', 'اج', 'کل', 'پہلا', 'پہلی', 'پہلے', 'فیر', 'اجے', 'ہالے', 'ہلے',
  'ضرور', 'بس', 'صرف', 'سوا', 'نہ', 'نہیں', 'نئیں', 'متاں', 'ہاں', 'ہان',
];

/**
 * Normalized lookup set, built once at module load.
 *
 * Both halves of the comparison go through `normalizeText` — the same function
 * the story text goes through — so a stopword written with harakat or with an
 * Arabic yeh still matches, and the list does not have to be maintained in
 * normalized form by hand.
 *
 * Multi-word entries are split rather than kept whole. The extractor looks up
 * single tokens, so a phrase stored intact — `لے کے` — would sit in the set and
 * never be looked up, filtering nothing while appearing to filter something.
 * Splitting makes each half reachable, and each half is a function word in its
 * own right, which is why the phrase was written that way to begin with.
 */
export const STOPWORD_SET = new Set(
  [...ENGLISH_STOPWORDS, ...ROMAN_STOPWORDS, ...SHAHMUKHI_STOPWORDS]
    .flatMap((word) => normalizeText(word).split(' '))
    .filter(Boolean),
);

export function isStopword(normalizedToken) {
  return STOPWORD_SET.has(normalizedToken);
}

export default STOPWORD_SET;
