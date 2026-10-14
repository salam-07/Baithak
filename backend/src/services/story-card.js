import { CARD_EXCERPT_LENGTH, CARD_NOTE_LENGTH } from '../config/constants.js';

/**
 * The feed-card shape, shared by every listing that returns stories.
 *
 * This lives on its own rather than inside story.service.js because two
 * services need it — the story listings and the discovery feeds — and the first
 * version of this had the pipeline written out twice. Duplicating it meant a
 * change to the card shape had to be made in two places and would silently
 * diverge in one of them, which is exactly the drift the shared module prevents.
 *
 * The card is deliberately not the story. It carries an excerpt and never a
 * full body: a feed is for choosing what to read, and shipping entire stories
 * to render three lines of each is the single largest avoidable cost in the
 * read path.
 */

/**
 * Truncates every text variant inside the database.
 *
 * `$substrCP` rather than `$substr` throughout, and that is not a detail. The
 * byte-oriented operators cut at a byte offset, which lands inside a UTF-8
 * sequence for any Shahmukhi text — the excerpt arrives with a broken character
 * at the end and the interface renders a replacement glyph. Code-point
 * boundaries are the only safe place to cut when the alphabet is not ASCII.
 *
 * The truncation happens server-side rather than after the fetch so that the
 * cost of a card is independent of the length behind it. A page of 50 stories
 * whose bodies average 4,000 characters is 200KB moved out of Mongo per
 * request, of which the client renders about 1.5%.
 */
export const CARD_PIPELINE_STAGES = [
  {
    $project: {
      author: 1,
      languages: 1,

      // `keywords` is deliberately absent. The stored field is a list of ids that no
      // reader can render — the annotator derives what a card knows from the text it
      // actually shows, and the card's `keywords` is that list of documents, attached
      // after this pipeline. Projecting the ids here would send an array of up to a
      // thousand entries per card for nobody to read.
      // Read by the annotator, not by the client: which words the author excluded
      // and which they attached by hand decide what a card marks. The per-story
      // explanations it carries are also what the tooltip shows in place of the
      // shared note, so a card that omitted this would disagree with the story page.
      keywordSettings: 1,
      likeCount: 1,
      publishedAt: 1,
      createdAt: 1,
      status: 1,
      // Carried through when present, so the affinity feed can attach its score
      // without needing a second, nearly identical pipeline of its own.
      score: 1,
      texts: {
        $map: {
          input: { $ifNull: ['$texts', []] },
          as: 'text',
          in: {
            language: '$$text.language',
            script: '$$text.script',
            title: '$$text.title',
            isOriginal: '$$text.isOriginal',
            source: '$$text.source',
            excerpt: {
              $let: {
                vars: { body: { $ifNull: ['$$text.body', ''] } },
                in: {
                  $cond: [
                    { $gt: [{ $strLenCP: '$$body' }, CARD_EXCERPT_LENGTH] },
                    {
                      $concat: [
                        { $substrCP: ['$$body', 0, CARD_EXCERPT_LENGTH] },
                        '…',
                      ],
                    },
                    '$$body',
                  ],
                },
              },
            },
          },
        },
      },
    },
  },
];

/**
 * Reshapes an aggregation row into the card the API returns.
 *
 * Done in JavaScript rather than in the pipeline because it is a handful of
 * property picks on an already-truncated document, and expressing "the original
 * variant, or the first one" as a pipeline stage costs more in readability than
 * it saves in work.
 */
export function toStoryCard(row) {
  const texts = row.texts ?? [];
  const preferred = texts.find((text) => text.isOriginal) ?? texts[0];

  return {
    id: row._id,
    author: row.author,
    // Derived rather than stored, matching the model's `languageMode` virtual,
    // so the two can never disagree about what "both" means.
    languageMode: (row.languages?.length ?? 0) > 1 ? 'both' : row.languages?.[0] ?? null,
    title: preferred?.title ?? null,
    excerpt: preferred?.excerpt ?? null,
    texts,

    languages: row.languages ?? [],
    keywordSettings: row.keywordSettings ?? {},
    likeCount: row.likeCount ?? 0,
    status: row.status,
    publishedAt: row.publishedAt ?? null,
    createdAt: row.createdAt,
    // Present only on the affinity feed. Surfaced so the client can tell a
    // reader why a story is in front of them rather than presenting an
    // unexplained ordering.
    ...(row.score === undefined ? {} : { affinityScore: row.score }),
  };
}

/**
 * One keyword, as a card carries it.
 *
 * The note is cut here rather than left whole because the card is not the word page:
 * the tooltip previews about 190 characters, so sending up to 4,000 in each of three
 * languages per word would move text that no surface on the card can display. The cut
 * is taken on code points for the same reason the excerpt's is taken with `$substrCP`
 * — a code-unit slice lands inside a Shahmukhi sequence and renders as a broken glyph.
 *
 * `sources`, `aliases` and `revision` are absent on purpose: the tooltip does not show
 * them, and the word page fetches the entry in full.
 */
export function toCardKeyword(word) {
  const notes = Object.fromEntries(
    Object.entries(word.notes ?? {}).map(([language, note]) => [language, cardNote(note)]),
  );

  return {
    _id: word._id,
    key: word.key,
    labels: word.labels,
    type: word.type,
    notes,
  };
}

/** Trims one explanation to the length a card carries, on code-point boundaries. */
function cardNote(note) {
  const characters = [...(note ?? '')];
  if (characters.length <= CARD_NOTE_LENGTH) return note ?? '';
  return `${characters.slice(0, CARD_NOTE_LENGTH).join('').trimEnd()}…`;
}

export default { CARD_PIPELINE_STAGES, toStoryCard, toCardKeyword };
