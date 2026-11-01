// What each light in the co-creativity piece "says". `before` is a person's
// own idea; `after` is what it turns into after many rounds of simply handing
// it to the AI (note how the `after`s all sound alike); `co` is where it goes
// when the person and the AI build on each other instead. Edit freely: the
// lights cycle through this list.

export type Story = { before: string; after: string; co: string };

export const STORIES: Story[] = [
  {
    before:
      'Cities should be designed by the people who walk them, not the people who drive through them.',
    after: 'Urban design should balance the needs of all stakeholders.',
    co: 'What if every street had to pass one test: can an 8-year-old cross it alone?',
  },
  {
    before: "I write my best ideas in the margins of other people's books.",
    after: 'Taking notes is a great way to improve learning and retention.',
    co: 'A library where every book carries the margin notes of its last ten readers.',
  },
  {
    before: 'Grief is just love with nowhere to go.',
    after: 'Grief is a complex process that everyone experiences differently.',
    co: 'Grief as an unfinished conversation: what would it mean to keep talking?',
  },
  {
    before:
      "Our village fixes things before it buys things. That's our economy.",
    after: 'Sustainable consumption can benefit both people and the planet.',
    co: 'A repair-first economy, where fixing something earns more status than buying it.',
  },
  {
    before: "My grandmother's recipes have no measurements, only stories.",
    after: 'Family recipes are a meaningful way to preserve cultural heritage.',
    co: 'A cookbook indexed by the stories, not by the ingredients.',
  },
  {
    before: "Math is the only place where I'm allowed to be completely sure.",
    after: 'Mathematics offers clarity and logical rigor across many fields.',
    co: 'Teach proofs as arguments you win, not formulas you memorize.',
  },
  {
    before: 'Night buses are the real public square of this city.',
    after: 'Public transportation plays an important role in community life.',
    co: 'Late-night bus routes designed as moving community centers.',
  },
  {
    before: 'I trust the weather forecast less than my knee.',
    after: 'Personal experience can sometimes complement scientific data.',
    co: "Crowd-sourced 'body forecasts' as a new dataset for climate and health.",
  },
  {
    before: 'Silence in a meeting is where the real disagreement lives.',
    after: 'Effective communication is key to productive meetings.',
    co: 'Meetings that open with two minutes of anonymous, written dissent.',
  },
  {
    before: 'Video games taught me more about failure than school ever did.',
    after: 'Games can offer valuable learning opportunities.',
    co: 'Grade students on how well they fail and retry, the way a game does.',
  },
  {
    before: 'The best maps are the ones that are slightly wrong on purpose.',
    after: 'Maps help us navigate and understand the world around us.',
    co: 'Maps that show what a place feels like, not just where it is.',
  },
  {
    before: 'I learned English from song lyrics I misheard for years.',
    after: 'Music can be an effective tool for language learning.',
    co: 'A language course built entirely out of misheard lyrics.',
  },
];
