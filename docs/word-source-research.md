# Research on sources for mission words

Research dated November 18, 2026. The pilot now draws from a curated list of 150
words bundled with the app. The comparisons below record the options evaluated
during the research.

## Research recommendation

Use **Lexique 4.1** offline to build a versioned word list for the bot. Draw a
word at random from the list when assigning a mission. Frequency can help group
words by familiarity. Have the team review the words to see whether they sound
natural and fit a workplace conversation.

An API can suggest candidates, but a live request for every round makes the
start depend on an external service and can return unsuitable words. Keep the
original attribution, license, and provenance if you distribute a list derived
from a third-party resource.

## Comparison

| Source              | What it offers                                                                                                                                                                                                                                       | Limits for the game                                                                                                                                                                                                         |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Lexique 4.1**     | Downloadable French lexicon licensed under CC BY-SA 4.0. About 190,000 word forms with frequencies, lemmas, parts of speech, letter and syllable counts, and prevalence.                                                                             | Frequency gives a rough measure of familiarity. A redistributed derivative needs a compatible license and attribution.                                                                                                      |
| **Random Word API** | The `lang=fr` endpoint accepts count and length filters. The docs describe `diff=1..5` for up to five words, based on Wikipedia frequency. A `lang=fr&number=5&length=7` request returned `rebiffé`, `karatés`, `niveler`, `soûlard`, and `insolez`. | Two early French requests with `diff` timed out after 12 seconds. The API page documented no quota, pricing, or uptime commitment. Length filtering returned inflected forms and a word that could be awkward in a meeting. |
| **Datamuse**        | At the time of research, access without an API key was available until February 1, 2027. The announced limit after that date was 100,000 requests per day per key.                                                                                   | The docs cover frequency, syllables, and pronunciation for its English and Spanish vocabularies. Queries are logged temporarily.                                                                                            |
| **FLELex**          | Lemma frequencies by CEFR levels A1–C2, drawn from French-language textbooks and simplified readers.                                                                                                                                                 | The data reflects language-learning materials. Check the redistribution license before integrating the resource.                                                                                                            |

## Measuring difficulty

- **Length and syllable count** describe word form and suggest how much effort
  pronunciation takes. They offer little insight into how easily a word fits
  into a meeting.
- **Frequency** estimates familiarity within a corpus. Lexique’s subtitle
  frequencies are closer to spoken French than textbook frequencies, though they
  still give only an approximation.
- **Meeting fit** requires a human check. Look for words people can say
  naturally in a work conversation that are concrete, appropriate, and
  surprising enough for the game.

For an initial ranking, group words by Lexique frequency and ask the team to
review a sample before adjusting the thresholds. Exclude proper names, acronyms,
undesirable inflections, insults, and sensitive terms.

Sample spelling frequencies and letter counts from Lexique 4.1 are **bureau**
221.519 / 6, **baguette** 4.611 / 8, **algorithme** 2.896 / 10, and **pédalo**
0.231 / 6. _Pédalo_ and _bureau_ have the same length and very different
frequencies. These figures give a starting point for calibrating groups.

## Cost and Slack hosting

The sources consulted listed no usage fees for the Lexique and FLELex files.
Licensing and attribution still apply. Datamuse announced a temporary free
limit. The Random Word API page gave no commercial terms.

A Slack-hosted app must declare external domains in `outgoingDomains`. Slack
shows those domains during admin approval. Bundling the list avoids the added
permission and a network dependency during play.

## Primary sources

- [Lexique 4.1 description and license](https://www.lexique.org/)
- [Lexique 4.1 TSV and license download](https://www.lexique.org/databases/Lexique/Lexique410.zip)
- [Random Word API endpoints and parameters](https://random-word-api.herokuapp.com/home)
- [Datamuse API, languages, limits, and privacy](https://www.datamuse.com/api/)
- [FLELex CEFRLex resource](https://cental.uclouvain.be/cefrlex/flelex/)
- [Slack app manifest and outgoing domains](https://docs.slack.dev/tools/deno-slack-sdk/guides/using-the-app-manifest/)
- [Slack admin approval for outgoing domains](https://docs.slack.dev/tools/deno-slack-sdk/guides/controlling-permissions-for-admins/)

## Questions raised during research

1. Would using only nouns make words easier to work into a sentence?
2. How many familiarity levels would the pilot need?
3. How many rare or surprising words can the list include while keeping the game
   fun?
