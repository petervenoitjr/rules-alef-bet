// ALEF-BET RULES Version 0.2.0 (p5.js 2.3.4) -- SETTINGS
// A Rules!-style memory game for the Alef-Bet app. DO-T gives one new rule per level; rules stack up.
// Look: DOT-UI (AHAD Prototype 11) + DO-T rig + AHAD feel, from Peter's ahad-skills 1.0.0.
// Made by Peter Venoit, Jr. - 2026.
// ===== SETTINGS: STUDENTS, EDIT HERE =====

// ---- PLAYER: how forgiving the game is ----
const PLAYER_START_TIME = 20;          // CHALLENGE mode: seconds on the clock at the start (10-60)
const PLAYER_TIME_MAX = 30;            // CHALLENGE mode: the clock can never go above this (15-90)
const PLAYER_TIME_PER_CORRECT = 0.5;   // CHALLENGE mode: seconds added for each correct tap (0-2)
const PLAYER_TIME_PENALTY = 1;         // CHALLENGE mode: seconds lost for each wrong tap (0-5)
const PLAYER_HINT_AFTER = 2;           // TIMELESS mode: wrong taps on one rule before DO-T shows the rule by himself (1-5, 99 = never)
const PLAYER_HINT_SECONDS = 3;         // how long a hint stays on screen (1-8 seconds)
const PLAYER_HINT_SHOWS_TILES = true;  // true = a hint also puts amber brackets on the tiles that follow the rule
const PLAYER_POINTS_CORRECT = 10;      // points for each correct tap (1-100)
const PLAYER_POINTS_CLEAR = 50;        // points for clearing a board (0-500)
const PLAYER_POINTS_COMBO_BONUS = 5;   // points for each combo bonus step (0-50)

// ---- BOARD: the grid of letter tiles ----
const BOARD_COLS = 4;                  // tiles across (3-5)
const BOARD_ROWS = 4;                  // tiles down (3-5)
const BOARD_TILE_SIZE = 112;           // size of one tile's art in pixels (80-120)
const BOARD_TILE_GAP = 12;             // space between tiles in pixels (4-24)
const BOARD_TOP = 300;                 // y position of the first row (260-340)
const BOARD_MAX_COPIES = 2;            // most times one letter may appear on a board (1-3)
const BOARD_MIN_FOR_RULE1 = 3;         // the board tries to leave at least this many tiles for rule 1 (1-8)
const BOARD_TRIES = 400;               // how many random boards are tried to find a fair one (50-2000)
const BOARD_POP_DELAY = 0.03;          // seconds between each tile popping in (0-0.1)

// ---- CONTROLS ----
const CONTROLS_TILE_HITBOX = 112;      // size of a tile's tap area in pixels (separate from the art; 80-124)

// ---- DISPLAY ----
const DISPLAY_W = 540;                 // the game's drawing size (portrait phone shape). Leave as is.
const DISPLAY_H = 960;
const DISPLAY_SHOW_VALUES = true;      // true = each tile shows its number value in the corner (players can change this in PAUSE)
const DISPLAY_SHOW_NAMES = true;       // true = each tile shows the letter's name under it (players can change this in PAUSE)
const DISPLAY_SHOW_RULE_NUMBER = true; // true = the panel says which rule number you are on (not what it says)
const DISPLAY_HEBREW_FONT = '"Frank Ruhl Libre", "Noto Serif Hebrew", "Times New Roman", serif';   // font for the Hebrew letters
const DISPLAY_POINTED_FONT = '"Noto Serif Hebrew", "Frank Ruhl Libre", "Times New Roman", serif';  // font for Hebrew words with vowel points (needs good niqqud support)
const DISPLAY_GLYPH_SIZE = 60;         // size of the Hebrew letter on a tile (36-72)
const DISPLAY_DOT_RADIUS = 46;         // DO-T's size in the game panel (30-60)
const DISPLAY_DOT_TITLE_RADIUS = 92;   // DO-T's size on the title page (60-120)
const DISPLAY_SCREEN_GLITCH = true;    // true = a small screen glitch on wrong taps (players can turn it off in PAUSE)

// ---- AUDIO ----
const AUDIO_ON = true;                 // sound on at the start (players can change it in PAUSE)
const AUDIO_VOLUME = 0.35;             // master volume (0-1)

// ---- TILE COLORS: the DOT-UI colors a tile can be (name shown in rules, DOT-UI palette key) ----
const TILE_COLORS = [['CYAN', 'cy'], ['AMBER', 'am'], ['GREEN', 'gn'], ['VIOLET', 'vi']];

// ---- RULES: one list per batch. Level 1 uses rule 1, level 2 uses rules 2 then 1, and so on.
//      type 'seq'    tap every tile by value. dir 'high' = highest first, 'low' = lowest first (always rule 1)
//      type 'color'  tiles of one color          type 'final'  letters that have a final form (Kaf Mem Nun Pe Tsadi)
//      type 'group'  'ones' (1-9) 'tens' (10-90) 'hundreds' (100-400)
//      type 'letter' one letter by name. Add verse: n (a Psalm 119 verse) and DO-T quotes that verse from the KJV
//      type 'min'    letters worth at least this much
//      type 'sound'  letters that make this sound ('m', 'sh', 't', 'k' ...; see LETTER_SOUNDS in the code)
//      type 'silent' letters with no sound of their own (ALEF, AYIN)      type 'two'  letters with two sounds
//      type 'and'    every part must be true     say: what DO-T says
//   Batch options: title (shown in the HUD), intro (DO-T says it when the batch starts), hideNames (true = tiles hide letter names)
//   DESIGN RULE: a NEWER rule must never include every letter of an OLDER rule (newer rules go first,
//   so the older rule would never get a turn). Newer rules may only narrow older ones: ALEF after "the ones" is fine.
const RULE_BATCHES = [
  { title: 'NUMBERS', intro: 'Every letter is also a number. Learn the values and the groups.', rules: [
    { type: 'seq', dir: 'high', say: 'Tap every letter by its value, highest first.' },
    { type: 'color', color: 'AMBER', say: 'Tap the AMBER tiles.' },
    { type: 'group', group: 'ones', say: 'Tap the ones (1 to 9).' },
    { type: 'group', group: 'hundreds', say: 'Tap the hundreds (100 to 400).' },
    { type: 'final', say: 'Tap the letters that have a final form.' },
    { type: 'color', color: 'GREEN', say: 'Tap the GREEN tiles.' },
    { type: 'letter', letter: 'ALEF', say: 'Tap ALEF.' },
    { type: 'and', parts: [{ type: 'color', color: 'AMBER' }, { type: 'final' }], say: 'Tap AMBER letters that have a final form.' },
    { type: 'letter', letter: 'SHIN', say: 'Tap SHIN.' },
    { type: 'and', parts: [{ type: 'color', color: 'GREEN' }, { type: 'group', group: 'ones' }], say: 'Tap GREEN ones.' }
  ] },
  { title: 'ALEF-BET ORDER', intro: 'A new stack. This time rule 1 goes in Alef-Bet order, lowest value first.', rules: [
    { type: 'seq', dir: 'low', say: 'Tap every letter in Alef-Bet order, lowest value first.' },
    { type: 'color', color: 'VIOLET', say: 'Tap the VIOLET tiles.' },
    { type: 'group', group: 'tens', say: 'Tap the tens (10 to 90).' },
    { type: 'letter', letter: 'BET', say: 'Tap BET.' },
    { type: 'color', color: 'CYAN', say: 'Tap the CYAN tiles.' },
    { type: 'min', min: 50, say: 'Tap letters worth 50 or more.' },
    { type: 'letter', letter: 'MEM', say: 'Tap MEM.' },
    { type: 'and', parts: [{ type: 'color', color: 'VIOLET' }, { type: 'group', group: 'hundreds' }], say: 'Tap VIOLET hundreds.' },
    { type: 'letter', letter: 'GIMEL', say: 'Tap GIMEL.' },
    { type: 'and', parts: [{ type: 'color', color: 'GREEN' }, { type: 'group', group: 'ones' }], say: 'Tap GREEN ones.' }
  ] },
  { title: 'SOUNDS', intro: 'Rules about letter sounds. The names are hidden on the tiles, so read the shapes.', hideNames: true, rules: [
    { type: 'seq', dir: 'low', say: 'Tap every letter in Alef-Bet order, lowest value first.' },
    { type: 'silent', say: 'Tap the silent letters, ALEF and AYIN. They carry a vowel sound.' },
    { type: 'sound', sound: 'm', say: 'Tap the letter that says M.' },
    { type: 'two', say: 'Tap the letters with two sounds: BET, KAF, PE and SHIN.' },
    { type: 'sound', sound: 'sh', say: 'Tap the letter that says SH.' },
    { type: 'sound', sound: 'y', say: 'Tap the letter that says Y.' },
    { type: 'sound', sound: 't', say: 'Tap the letters that say T. There are two!' },
    { type: 'sound', sound: 'l', say: 'Tap the letter that says L.' },
    { type: 'sound', sound: 'k', say: 'Tap the letters that say K. There are two!' },
    { type: 'sound', sound: 'n', say: 'Tap the letter that says N.' }
  ] },
  { title: 'PSALM 119', intro: 'Psalm 119 has a part for every letter. DO-T reads a verse; find the letter that begins its part in Hebrew.', rules: [
    { type: 'seq', dir: 'high', say: 'Tap every letter by its value, highest first.' },
    { type: 'letter', letter: 'NUN', verse: 105 },
    { type: 'letter', letter: 'ALEF', verse: 1 },
    { type: 'letter', letter: 'LAMED', verse: 89 },
    { type: 'letter', letter: 'BET', verse: 9 },
    { type: 'letter', letter: 'MEM', verse: 97 },
    { type: 'letter', letter: 'YOD', verse: 73 },
    { type: 'letter', letter: 'TSADI', verse: 137 },
    { type: 'letter', letter: 'CHET', verse: 57 },
    { type: 'letter', letter: 'TAV', verse: 169 }
  ] }
];

// ---- LETTER NAMES: what each letter's name means, from Peter's Alef-Bet book. Leave '' until checked against the book.
//      Shown on the letter card as "NAME MEANING (traditional reading)". Example: ALEF: 'ox'.
const LETTER_NAME_MEANINGS = { ALEF: '', BET: '', GIMEL: '', DALET: '', HE: '', VAV: '', ZAYIN: '', CHET: '', TET: '', YOD: '', KAF: '',
  LAMED: '', MEM: '', NUN: '', SAMEKH: '', AYIN: '', PE: '', TSADI: '', QOF: '', RESH: '', SHIN: '', TAV: '' };

// ---- DEBUG: off by default. Real values above are never changed by these ----
const SHOW_DEBUG_BUTTON = true;        // true = DEBUG MENU button on the title page (set false before release)
const DEBUG_ON = false;                // true = use the DEBUG values below from the start
const DEBUG_START_LEVEL = 1;           // level a new game starts on when DEBUG_ON (1-40)
const DEBUG_SHOW_RULE_TEXT = false;    // true = the panel always shows what the rule says
const DEBUG_INFINITE_TIME = false;     // true = the CHALLENGE clock never runs down
const DEBUG_SHOW_HITBOXES = false;     // true = draw each tile's tap area

// ===== END SETTINGS: CODE BELOW =====
