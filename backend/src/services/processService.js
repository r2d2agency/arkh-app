const pool = require('../db/pool');

function safeParseJson(raw, fallback) {
  if (raw == null) return fallback;
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    try {
      const cleaned = raw
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .trim();
      return JSON.parse(cleaned);
    } catch {
      return fallback;
    }
  }
}

function detectTruncation(response) {
  const text = String(response || '').trim();
  const openBraces = (text.match(/{/g) || []).length;
  const closeBraces = (text.match(/}/g) || []).length;
  const openBrackets = (text.match(/\[/g) || []).length;
  const closeBrackets = (text.match(/]/g) || []).length;
  if (openBraces !== closeBraces || openBrackets !== closeBrackets) return true;
  return [/\.\.\.$/, /…$/, /\[truncated\]/i, /\[continued\]/i].some((p) => p.test(text));
}

function extractJsonFromResponse(response) {
  let cleaned = String(response || '')
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  const jsonStart = cleaned.search(/[\[{]/);
  const startChar = jsonStart !== -1 ? cleaned[jsonStart] : null;
  const jsonEnd = startChar === '[' ? cleaned.lastIndexOf(']') : cleaned.lastIndexOf('}');

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error('No JSON object found in response');
  }

  cleaned = cleaned.substring(jsonStart, jsonEnd + 1)
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']')
    .replace(/[\x00-\x1F\x7F]/g, '');

  return JSON.parse(cleaned);
}

function extractSummaryText(value) {
  if (!value) return '';
  if (typeof value !== 'string') return String(value);
  const trimmed = value.trim();
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return trimmed;
  const parsed = safeParseJson(trimmed, null);
  if (!parsed) return trimmed;
  if (typeof parsed === 'string') return parsed;
  return parsed.summary || parsed.resumo || parsed.expanded_summary || parsed.text || trimmed;
}

function normalizeTopicsForContext(raw) {
  const parsed = safeParseJson(raw, []);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.topics)) return parsed.topics;
  return [];
}

function normalizeVersesForContext(raw) {
  const parsed = safeParseJson(raw, []);
  if (Array.isArray(parsed)) return parsed;
  return [];
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeSearchText(value) {
  return normalizeWhitespace(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[“”"'`´]/g, '');
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeTokenForScan(value) {
  return normalizeSearchText(value).replace(/[^a-z0-9]/g, '');
}

function normalizeVerseRange(value) {
  return String(value || '')
    .replace(/[–—]/g, '-')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s*,\s*/g, ',')
    .trim();
}

const BIBLE_BOOKS = [
  { canonical: 'Gênesis', aliases: ['gênesis', 'genesis', 'gn'] },
  { canonical: 'Êxodo', aliases: ['êxodo', 'exodo', 'êx', 'ex'] },
  { canonical: 'Levítico', aliases: ['levítico', 'levitico', 'lv'] },
  { canonical: 'Números', aliases: ['números', 'numeros', 'nm'] },
  { canonical: 'Deuteronômio', aliases: ['deuteronômio', 'deuteronomio', 'dt'] },
  { canonical: 'Josué', aliases: ['josué', 'josue', 'js'] },
  { canonical: 'Juízes', aliases: ['juízes', 'juizes', 'jz'] },
  { canonical: 'Rute', aliases: ['rute', 'rt'] },
  { canonical: '1 Samuel', aliases: ['1 samuel', '1samuel', 'i samuel', 'primeiro samuel', 'primeira samuel', '1 sm', '1sm'] },
  { canonical: '2 Samuel', aliases: ['2 samuel', '2samuel', 'ii samuel', 'segundo samuel', 'segunda samuel', '2 sm', '2sm'] },
  { canonical: '1 Reis', aliases: ['1 reis', '1reis', 'i reis', 'primeiro reis', '1 rs', '1rs'] },
  { canonical: '2 Reis', aliases: ['2 reis', '2reis', 'ii reis', 'segundo reis', '2 rs', '2rs'] },
  { canonical: '1 Crônicas', aliases: ['1 crônicas', '1 cronicas', '1crônicas', '1cronicas', 'i crônicas', 'i cronicas', 'primeiro crônicas', 'primeira crônicas', '1 cr', '1cr'] },
  { canonical: '2 Crônicas', aliases: ['2 crônicas', '2 cronicas', '2crônicas', '2cronicas', 'ii crônicas', 'ii cronicas', 'segundo crônicas', 'segunda crônicas', '2 cr', '2cr'] },
  { canonical: 'Esdras', aliases: ['esdras', 'ed'] },
  { canonical: 'Neemias', aliases: ['neemias', 'ne'] },
  { canonical: 'Ester', aliases: ['ester', 'et'] },
  { canonical: 'Jó', aliases: ['jó', 'jo', 'job'] },
  { canonical: 'Salmos', aliases: ['salmos', 'salmo', 'sl', 'psalms', 'ps'] },
  { canonical: 'Provérbios', aliases: ['provérbios', 'proverbios', 'pv', 'prov'] },
  { canonical: 'Eclesiastes', aliases: ['eclesiastes', 'ec'] },
  { canonical: 'Cânticos', aliases: ['cânticos', 'canticos', 'cantares', 'ct'] },
  { canonical: 'Isaías', aliases: ['isaías', 'isaias', 'is'] },
  { canonical: 'Jeremias', aliases: ['jeremias', 'jr'] },
  { canonical: 'Lamentações', aliases: ['lamentações', 'lamentacoes', 'lm'] },
  { canonical: 'Ezequiel', aliases: ['ezequiel', 'ez'] },
  { canonical: 'Daniel', aliases: ['daniel', 'dn'] },
  { canonical: 'Oséias', aliases: ['oséias', 'oseias', 'os'] },
  { canonical: 'Joel', aliases: ['joel', 'jl'] },
  { canonical: 'Amós', aliases: ['amós', 'amos', 'am'] },
  { canonical: 'Obadias', aliases: ['obadias', 'ob'] },
  { canonical: 'Jonas', aliases: ['jonas', 'jn'] },
  { canonical: 'Miqueias', aliases: ['miqueias', 'mq'] },
  { canonical: 'Naum', aliases: ['naum', 'na'] },
  { canonical: 'Habacuque', aliases: ['habacuque', 'hc'] },
  { canonical: 'Sofonias', aliases: ['sofonias', 'sf'] },
  { canonical: 'Ageu', aliases: ['ageu', 'ag'] },
  { canonical: 'Zacarias', aliases: ['zacarias', 'zc'] },
  { canonical: 'Malaquias', aliases: ['malaquias', 'ml'] },
  { canonical: 'Mateus', aliases: ['mateus', 'mt'] },
  { canonical: 'Marcos', aliases: ['marcos', 'mc'] },
  { canonical: 'Lucas', aliases: ['lucas', 'lc'] },
  { canonical: 'João', aliases: ['joão', 'joao', 'jo'] },
  { canonical: 'Atos', aliases: ['atos', 'at'] },
  { canonical: 'Romanos', aliases: ['romanos', 'rm', 'rom'] },
  { canonical: '1 Coríntios', aliases: ['1 coríntios', '1 corintios', '1coríntios', '1corintios', 'i coríntios', 'i corintios', 'primeiro coríntios', 'primeira coríntios', '1 co', '1co'] },
  { canonical: '2 Coríntios', aliases: ['2 coríntios', '2 corintios', '2coríntios', '2corintios', 'ii coríntios', 'ii corintios', 'segundo coríntios', 'segunda coríntios', '2 co', '2co'] },
  { canonical: 'Gálatas', aliases: ['gálatas', 'galatas', 'gl'] },
  { canonical: 'Efésios', aliases: ['efésios', 'efesios', 'ef'] },
  { canonical: 'Filipenses', aliases: ['filipenses', 'fp'] },
  { canonical: 'Colossenses', aliases: ['colossenses', 'cl'] },
  { canonical: '1 Tessalonicenses', aliases: ['1 tessalonicenses', '1tessalonicenses', 'i tessalonicenses', 'primeiro tessalonicenses', '1 ts', '1ts'] },
  { canonical: '2 Tessalonicenses', aliases: ['2 tessalonicenses', '2tessalonicenses', 'ii tessalonicenses', 'segundo tessalonicenses', '2 ts', '2ts'] },
  { canonical: '1 Timóteo', aliases: ['1 timóteo', '1 timoteo', '1timóteo', '1timoteo', 'i timóteo', 'i timoteo', 'primeiro timóteo', '1 tm', '1tm'] },
  { canonical: '2 Timóteo', aliases: ['2 timóteo', '2 timoteo', '2timóteo', '2timoteo', 'ii timóteo', 'ii timoteo', 'segundo timóteo', '2 tm', '2tm'] },
  { canonical: 'Tito', aliases: ['tito', 'tt'] },
  { canonical: 'Filemom', aliases: ['filemom', 'fm'] },
  { canonical: 'Hebreus', aliases: ['hebreus', 'hb'] },
  { canonical: 'Tiago', aliases: ['tiago', 'tg'] },
  { canonical: '1 Pedro', aliases: ['1 pedro', '1pedro', 'i pedro', 'primeiro pedro', '1 pe', '1pe', '1 pd', '1pd'] },
  { canonical: '2 Pedro', aliases: ['2 pedro', '2pedro', 'ii pedro', 'segundo pedro', '2 pe', '2pe', '2 pd', '2pd'] },
  { canonical: '1 João', aliases: ['1 joão', '1 joao', '1joão', '1joao', 'i joão', 'i joao', 'primeiro joão', 'primeira joão', '1 jo', '1jo'] },
  { canonical: '2 João', aliases: ['2 joão', '2 joao', '2joão', '2joao', 'ii joão', 'ii joao', 'segundo joão', 'segunda joão', '2 jo', '2jo'] },
  { canonical: '3 João', aliases: ['3 joão', '3 joao', '3joão', '3joao', 'iii joão', 'iii joao', 'terceiro joão', 'terceira joão', '3 jo', '3jo'] },
  { canonical: 'Judas', aliases: ['judas', 'jd'] },
  { canonical: 'Apocalipse', aliases: ['apocalipse', 'ap'] },
];

const CANONICAL_TO_ALIASES = new Map(BIBLE_BOOKS.map((book) => [book.canonical, book.aliases]));
const NUMBER_WORDS = new Map([
  ['um', { value: 1, kind: 'unit' }],
  ['uma', { value: 1, kind: 'unit' }],
  ['dois', { value: 2, kind: 'unit' }],
  ['duas', { value: 2, kind: 'unit' }],
  ['tres', { value: 3, kind: 'unit' }],
  ['quatro', { value: 4, kind: 'unit' }],
  ['cinco', { value: 5, kind: 'unit' }],
  ['seis', { value: 6, kind: 'unit' }],
  ['sete', { value: 7, kind: 'unit' }],
  ['oito', { value: 8, kind: 'unit' }],
  ['nove', { value: 9, kind: 'unit' }],
  ['dez', { value: 10, kind: 'teen' }],
  ['onze', { value: 11, kind: 'teen' }],
  ['doze', { value: 12, kind: 'teen' }],
  ['treze', { value: 13, kind: 'teen' }],
  ['catorze', { value: 14, kind: 'teen' }],
  ['quatorze', { value: 14, kind: 'teen' }],
  ['quinze', { value: 15, kind: 'teen' }],
  ['dezesseis', { value: 16, kind: 'teen' }],
  ['dezessete', { value: 17, kind: 'teen' }],
  ['dezoito', { value: 18, kind: 'teen' }],
  ['dezenove', { value: 19, kind: 'teen' }],
  ['vinte', { value: 20, kind: 'tens' }],
  ['trinta', { value: 30, kind: 'tens' }],
  ['quarenta', { value: 40, kind: 'tens' }],
  ['cinquenta', { value: 50, kind: 'tens' }],
  ['sessenta', { value: 60, kind: 'tens' }],
  ['setenta', { value: 70, kind: 'tens' }],
  ['oitenta', { value: 80, kind: 'tens' }],
  ['noventa', { value: 90, kind: 'tens' }],
  ['cem', { value: 100, kind: 'hundred' }],
  ['cento', { value: 100, kind: 'hundred' }],
]);
const CHAPTER_LABELS = new Set(['cap', 'capitulo', 'capitulos']);
const VERSE_LABELS = new Set(['versiculo', 'versiculos', 'verso', 'versos']);
const OPTIONAL_REFERENCE_FILLERS = new Set(['de', 'do', 'da', 'no', 'na', 'nos', 'nas', 'numero', 'num', 'n']);
const INTERNAL_NUMBER_CONNECTORS = new Set(['e']);
const RANGE_CONNECTORS = new Set(['a', 'ao', 'ate']);
const LIST_CONNECTORS = new Set(['e']);
const BOOK_ALIAS_ENTRIES = BIBLE_BOOKS
  .flatMap((book) => book.aliases.map((alias) => ({
    book: book.canonical,
    alias,
    tokens: alias
      .split(/\s+/)
      .map((token) => normalizeTokenForScan(token))
      .filter(Boolean),
  })))
  .filter((entry) => entry.tokens.length > 0)
  .sort((a, b) => b.tokens.length - a.tokens.length || b.alias.length - a.alias.length);

function buildBookAliasPattern(aliases) {
  return aliases
    .slice()
    .sort((a, b) => b.length - a.length)
    .map((alias) => escapeRegex(alias).replace(/\s+/g, '\\s+'))
    .join('|');
}

function buildCanonicalReference(book, chapter, verses) {
  return `${book} ${Number(chapter)}:${normalizeVerseRange(verses)}`;
}

function parseExplicitReference(value) {
  const source = normalizeWhitespace(value).replace(/[–—]/g, '-');
  if (!source) return null;

  for (const book of BIBLE_BOOKS) {
    const pattern = new RegExp(
      `(?:^|\\b)(${buildBookAliasPattern(book.aliases)})\\.?\\s+(?:cap(?:[ií]tulo)?\\s+)?(\\d{1,3})(?:\\s*(?::|\\.|,\\s*|\\s+vers(?:[ií]culos?)?\\s+)(\\d{1,3}(?:\\s*[-,]\\s*\\d{1,3})*))?`,
      'i'
    );
    const match = source.match(pattern);
    if (!match || !match[3]) continue;

    return {
      book: book.canonical,
      chapter: String(Number(match[2])),
      verses: normalizeVerseRange(match[3]),
      reference: buildCanonicalReference(book.canonical, match[2], match[3]),
      rawMatch: normalizeWhitespace(match[0]),
    };
  }

  return null;
}

function normalizeReferenceKey(reference) {
  const parsed = parseExplicitReference(reference);
  const base = parsed?.reference || normalizeWhitespace(reference);
  return normalizeSearchText(base).replace(/\s+/g, '');
}

function extractContextSnippet(source, index, matchLength) {
  const start = Math.max(0, index - 120);
  const end = Math.min(source.length, index + matchLength + 180);
  return source.slice(start, end).trim();
}

function tokenizeReferenceSource(source) {
  const tokens = [];
  const pattern = /[A-Za-zÀ-ÿ0-9]+|[:.,;\-–—]/g;
  let match;

  while ((match = pattern.exec(source)) !== null) {
    tokens.push({
      raw: match[0],
      normalized: normalizeTokenForScan(match[0]),
      start: match.index,
      end: match.index + match[0].length,
      isNumeric: /^\d+$/.test(match[0]),
    });
  }

  return tokens;
}

function consumeReferenceNumber(tokens, startIndex) {
  const firstToken = tokens[startIndex];
  if (!firstToken) return null;

  if (firstToken.isNumeric) {
    return {
      value: Number(firstToken.raw),
      endIndex: startIndex + 1,
      usedDigits: true,
    };
  }

  let value = 0;
  let index = startIndex;
  let consumed = false;
  let lastKind = null;
  let expectingContinuation = false;

  while (index < tokens.length) {
    const current = tokens[index];
    const info = NUMBER_WORDS.get(current.normalized);

    if (info) {
      value = info.kind === 'hundred' ? (value === 0 ? info.value : value + info.value) : value + info.value;
      consumed = true;
      lastKind = info.kind;
      expectingContinuation = false;
      index += 1;
      continue;
    }

    if (
      INTERNAL_NUMBER_CONNECTORS.has(current.normalized) &&
      consumed &&
      !expectingContinuation &&
      (lastKind === 'tens' || lastKind === 'hundred')
    ) {
      const next = tokens[index + 1];
      if (next && NUMBER_WORDS.has(next.normalized)) {
        expectingContinuation = true;
        index += 1;
        continue;
      }
    }

    break;
  }

  if (!consumed || expectingContinuation || value < 1) return null;

  return {
    value,
    endIndex: index,
    usedDigits: false,
  };
}

function matchesAliasAt(tokens, startIndex, aliasTokens) {
  for (let offset = 0; offset < aliasTokens.length; offset += 1) {
    if (tokens[startIndex + offset]?.normalized !== aliasTokens[offset]) return false;
  }
  return true;
}

function extractTokenizedVerseMentionsFromTranscript(transcript) {
  const source = normalizeWhitespace(transcript);
  if (!source) return [];

  const tokens = tokenizeReferenceSource(source);
  const mentions = [];
  const seen = new Set();

  for (let index = 0; index < tokens.length; index += 1) {
    for (const aliasEntry of BOOK_ALIAS_ENTRIES) {
      if (!matchesAliasAt(tokens, index, aliasEntry.tokens)) continue;

      let cursor = index + aliasEntry.tokens.length;
      while (OPTIONAL_REFERENCE_FILLERS.has(tokens[cursor]?.normalized)) cursor += 1;

      if (CHAPTER_LABELS.has(tokens[cursor]?.normalized)) {
        cursor += 1;
        while (OPTIONAL_REFERENCE_FILLERS.has(tokens[cursor]?.normalized)) cursor += 1;
      }

      const chapter = consumeReferenceNumber(tokens, cursor);
      if (!chapter || chapter.value > 150) continue;
      cursor = chapter.endIndex;

      let explicitSeparator = false;
      while (tokens[cursor]) {
        const current = tokens[cursor];
        if ([':', '.', ','].includes(current.raw) || VERSE_LABELS.has(current.normalized)) {
          explicitSeparator = true;
          cursor += 1;
          continue;
        }
        if (OPTIONAL_REFERENCE_FILLERS.has(current.normalized)) {
          cursor += 1;
          continue;
        }
        break;
      }

      const nextLooksLikeVerse = tokens[cursor]?.isNumeric || NUMBER_WORDS.has(tokens[cursor]?.normalized || '');
      if (!explicitSeparator && !nextLooksLikeVerse) continue;

      const firstVerse = consumeReferenceNumber(tokens, cursor);
      if (!firstVerse || firstVerse.value > 200) continue;
      cursor = firstVerse.endIndex;

      const verseParts = [String(firstVerse.value)];
      while (tokens[cursor]) {
        const connectorToken = tokens[cursor];
        const isDash = ['-', '–', '—'].includes(connectorToken.raw);
        const isRange = isDash || RANGE_CONNECTORS.has(connectorToken.normalized);
        const isList = connectorToken.raw === ',' || LIST_CONNECTORS.has(connectorToken.normalized);
        if (!isRange && !isList) break;

        const nextVerse = consumeReferenceNumber(tokens, cursor + 1);
        if (!nextVerse || nextVerse.value > 200) break;

        verseParts.push(`${isRange ? '-' : ','}${nextVerse.value}`);
        cursor = nextVerse.endIndex;
      }

      const reference = buildCanonicalReference(aliasEntry.book, chapter.value, verseParts.join(''));
      const key = normalizeReferenceKey(reference);
      if (seen.has(key)) break;

      const endToken = tokens[cursor - 1] || tokens[chapter.endIndex - 1];
      mentions.push({
        key,
        reference,
        excerpt: extractContextSnippet(source, tokens[index].start, endToken.end - tokens[index].start),
        index: tokens[index].start,
      });
      seen.add(key);
      index = Math.max(index, cursor - 1);
      break;
    }
  }

  return mentions;
}

function extractExplicitVerseMentionsFromTranscript(transcript) {
  const source = normalizeWhitespace(transcript);
  if (!source) return [];

  const mentions = [];
  const seen = new Set();

  for (const book of BIBLE_BOOKS) {
    const pattern = new RegExp(
      `(?:^|\\b)(${buildBookAliasPattern(book.aliases)})\\.?\\s+(?:cap(?:[ií]tulo)?\\s+)?(\\d{1,3})\\s*(?::|\\.|,\\s*|\\s+vers(?:[ií]culos?)?\\s+)(\\d{1,3}(?:\\s*[-,]\\s*\\d{1,3})*)`,
      'gi'
    );
    let match;
    while ((match = pattern.exec(source)) !== null) {
      const reference = buildCanonicalReference(book.canonical, match[2], match[3]);
      const key = normalizeReferenceKey(reference);
      if (seen.has(key)) continue;
      seen.add(key);

      mentions.push({
        key,
        reference,
        excerpt: extractContextSnippet(source, match.index, match[0].length),
        index: match.index,
      });
    }
  }

  for (const mention of extractTokenizedVerseMentionsFromTranscript(source)) {
    if (seen.has(mention.key)) continue;
    seen.add(mention.key);
    mentions.push(mention);
  }

  return mentions.sort((a, b) => a.index - b.index);
}

function findTranscriptMentionForReference(transcript, reference) {
  const source = normalizeWhitespace(transcript);
  const parsed = parseExplicitReference(reference);
  if (!source || !parsed) return null;

  const aliases = CANONICAL_TO_ALIASES.get(parsed.book) || [parsed.book];
  const versePattern = escapeRegex(parsed.verses)
    .replace(/,/g, '\\s*,\\s*')
    .replace(/-/g, '\\s*[-–]\\s*');

  const pattern = new RegExp(
    `(${buildBookAliasPattern(aliases)})\\.?\\s+(?:cap(?:[ií]tulo)?\\s+)?${escapeRegex(parsed.chapter)}\\s*(?::|\\.|,\\s*|\\s+vers(?:[ií]culos?)?\\s+)${versePattern}`,
    'i'
  );
  const match = pattern.exec(source);
  if (!match) return null;

  return {
    key: normalizeReferenceKey(parsed.reference),
    reference: parsed.reference,
    excerpt: extractContextSnippet(source, match.index, match[0].length),
    index: match.index,
  };
}

function coerceArray(value, nestedKeys = []) {
  const parsed = safeParseJson(value, value);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    for (const key of nestedKeys) {
      if (Array.isArray(parsed[key])) return parsed[key];
    }
  }
  return [];
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeWhitespace(typeof item === 'string' ? item : item?.title || item?.name || ''))
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/\n|;/)
      .map((item) => normalizeWhitespace(item))
      .filter(Boolean);
  }
  return [];
}

function normalizeTextBlock(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map((item) => normalizeTextBlock(item)).filter(Boolean).join('\n');
  if (typeof value === 'object') {
    return Object.values(value)
      .map((item) => normalizeTextBlock(item))
      .filter(Boolean)
      .join('\n');
  }
  return String(value).trim();
}

function ensureVerseReferencesInText(text, keyVerses) {
  const cleaned = normalizeTextBlock(text);
  if (!cleaned || !Array.isArray(keyVerses) || keyVerses.length === 0) return cleaned;

  const normalizedText = normalizeSearchText(cleaned);
  const alreadyMentionsVerse = keyVerses.some((verse) => normalizedText.includes(normalizeSearchText(verse.reference)));
  if (alreadyMentionsVerse) return cleaned;

  const references = keyVerses.map((verse) => verse.reference).join(', ');
  return `${cleaned}\n\nVersículos citados pelo pregador: ${references}.`;
}

function buildExpandedSummaryFallback(parsed, keyVerses) {
  const paragraphs = [];

  if (parsed.summary) paragraphs.push(parsed.summary);
  if (parsed.central_theme) paragraphs.push(`Tema central: ${parsed.central_theme}`);

  const structure = Array.isArray(parsed.sermon_structure) ? parsed.sermon_structure : [];
  structure.slice(0, 5).forEach((item) => {
    const part = normalizeWhitespace(item?.part);
    const description = normalizeTextBlock(item?.description);
    if (part || description) paragraphs.push(`${part || 'Etapa da mensagem'}: ${description}`.trim());
  });

  const keyPoints = Array.isArray(parsed.key_points) ? parsed.key_points : [];
  keyPoints.slice(0, 5).forEach((item, index) => {
    const parts = [
      `${index + 1}. ${normalizeWhitespace(item?.point)}`,
      normalizeTextBlock(item?.meaning),
      normalizeTextBlock(item?.concept),
      normalizeTextBlock(item?.teaching),
    ].filter(Boolean);
    if (parts.length) paragraphs.push(parts.join(' '));
  });

  const deepExplanations = Array.isArray(parsed.deep_explanations) ? parsed.deep_explanations : [];
  deepExplanations.slice(0, 3).forEach((item) => {
    const parts = [
      normalizeWhitespace(item?.point),
      normalizeTextBlock(item?.deep_meaning),
      normalizeTextBlock(item?.spiritual_context),
      normalizeTextBlock(item?.biblical_principles),
      normalizeTextBlock(item?.practical_examples),
    ].filter(Boolean);
    if (parts.length) paragraphs.push(parts.join(' '));
  });

  const applications = normalizeStringArray(parsed.practical_applications);
  if (applications.length) {
    paragraphs.push(`Aplicações práticas destacadas: ${applications.join(' ')}`);
  }

  if (keyVerses.length) {
    paragraphs.push(`Versículos explicitamente citados na transcrição: ${keyVerses.map((verse) => verse.reference).join(', ')}.`);
  }

  return paragraphs.filter(Boolean).join('\n\n').trim();
}

function normalizeAndValidateKeyVerses(rawKeyVerses, transcript) {
  const transcriptMentions = extractExplicitVerseMentionsFromTranscript(transcript);
  const aiVerses = coerceArray(rawKeyVerses, ['key_verses', 'verses', 'items', 'references'])
    .map((item) => {
      if (!item) return null;
      if (typeof item === 'string') {
        const parsed = parseExplicitReference(item);
        return parsed ? { reference: parsed.reference } : null;
      }
      if (typeof item !== 'object') return null;

      const parsed = parseExplicitReference(item.reference || item.verse_reference || item.ref || item.title || '');
      if (!parsed) return null;

      return {
        reference: parsed.reference,
        text: normalizeTextBlock(item.text || item.verse_text),
        biblical_context: normalizeTextBlock(item.biblical_context || item.context),
        meaning: normalizeTextBlock(item.meaning || item.significado),
        usage_in_sermon: normalizeTextBlock(item.usage_in_sermon || item.usage || item.source_excerpt || item.quote),
      };
    })
    .filter(Boolean);

  const mentionMap = new Map(transcriptMentions.map((mention) => [mention.key, mention]));
  const aiVerseMap = new Map();

  aiVerses.forEach((verse) => {
    const key = normalizeReferenceKey(verse.reference);
    const mention = mentionMap.get(key) || findTranscriptMentionForReference(transcript, verse.reference);
    if (!mention) return;
    aiVerseMap.set(mention.key, { ...verse, reference: mention.reference });
    if (!mentionMap.has(mention.key)) mentionMap.set(mention.key, mention);
  });

  const normalized = [];
  const seen = new Set();

  for (const mention of [...transcriptMentions, ...Array.from(mentionMap.values())]) {
    if (!mention || seen.has(mention.key)) continue;
    seen.add(mention.key);
    const aiVerse = aiVerseMap.get(mention.key) || {};

    normalized.push({
      reference: mention.reference,
      text: normalizeTextBlock(aiVerse.text),
      context: normalizeTextBlock(aiVerse.biblical_context || aiVerse.meaning),
      biblical_context: normalizeTextBlock(aiVerse.biblical_context),
      meaning: normalizeTextBlock(aiVerse.meaning),
      usage_in_sermon: normalizeTextBlock(aiVerse.usage_in_sermon) || mention.excerpt,
      source_excerpt: mention.excerpt,
    });
  }

  return normalized;
}

function normalizeAnalysisPayload(parsed, transcript) {
  const safe = parsed && typeof parsed === 'object' ? parsed : {};
  const keyVerses = normalizeAndValidateKeyVerses(
    safe.key_verses || safe.keyVerses || safe.verses || safe.references,
    transcript
  );

  const summary = ensureVerseReferencesInText(
    normalizeTextBlock(safe.summary || safe.resumo || safe.executive_summary),
    keyVerses
  );

  let expandedSummary = normalizeTextBlock(safe.expanded_summary || safe.detailed_summary || safe.summary_expanded);
  if (!expandedSummary || expandedSummary.split(/\n\s*\n/).filter(Boolean).length < 4) {
    expandedSummary = buildExpandedSummaryFallback({ ...safe, summary }, keyVerses);
  }
  expandedSummary = ensureVerseReferencesInText(expandedSummary, keyVerses);

  return {
    ...safe,
    summary,
    expanded_summary: expandedSummary,
    central_theme: normalizeTextBlock(safe.central_theme),
    theological_context: normalizeTextBlock(safe.theological_context),
    topics: normalizeStringArray(safe.topics),
    key_points: Array.isArray(safe.key_points) ? safe.key_points : [],
    deep_explanations: Array.isArray(safe.deep_explanations) ? safe.deep_explanations : [],
    practical_applications: normalizeStringArray(safe.practical_applications),
    connections: Array.isArray(safe.connections) ? safe.connections : [],
    reflection_questions: normalizeStringArray(safe.reflection_questions),
    group_study_questions: normalizeStringArray(safe.group_study_questions),
    sermon_structure: Array.isArray(safe.sermon_structure) ? safe.sermon_structure : [],
    biblical_connections: Array.isArray(safe.biblical_connections) ? safe.biblical_connections : [],
    key_phrases: normalizeStringArray(safe.key_phrases),
    derived_themes: normalizeStringArray(safe.derived_themes),
    continuation_suggestions: normalizeStringArray(safe.continuation_suggestions),
    key_verses: keyVerses,
  };
}

function buildTranscriptForPrompt(transcript, maxChars = 48000) {
  const cleaned = String(transcript || '').trim();
  if (cleaned.length <= maxChars) return cleaned;

  const head = cleaned.slice(0, 18000).trim();
  const middleStart = Math.max(0, Math.floor((cleaned.length - 14000) / 2));
  const middle = cleaned.slice(middleStart, middleStart + 14000).trim();
  const tail = cleaned.slice(-16000).trim();

  return [
    '[INÍCIO DA TRANSCRIÇÃO]',
    head,
    '[TRECHO CENTRAL DA TRANSCRIÇÃO]',
    middle,
    '[FINAL DA TRANSCRIÇÃO]',
    tail,
  ].join('\n\n');
}

function buildVerseEvidenceForPrompt(mentions) {
  if (!Array.isArray(mentions) || mentions.length === 0) return '';
  return mentions
    .slice(0, 20)
    .map((mention) => `- ${mention.reference}: ${mention.excerpt}`)
    .join('\n');
}

function isLikelyTruncated(result) {
  const reason = String(result?.finishReason || result?.stopReason || '').toLowerCase();
  return reason === 'length' || reason === 'max_tokens' || detectTruncation(result?.text || '');
}

function sanitizeCaptionText(text) {
  return String(text || '')
    .replace(/\u200b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildReadableTranscriptFromEvents(events, startMs, endMs) {
  const preparedEvents = (events || [])
    .filter((event) => event.segs && event.segs.length > 0)
    .filter((event) => {
      if (!startMs && !endMs) return true;
      const time = event.tStartMs || 0;
      if (startMs && time < startMs) return false;
      if (endMs && time > endMs) return false;
      return true;
    })
    .map((event) => ({
      start: event.tStartMs || 0,
      end: (event.tStartMs || 0) + (event.dDurationMs || 0),
      text: sanitizeCaptionText(event.segs.map((segment) => segment.utf8).join('')),
    }))
    .filter((event) => event.text);

  if (preparedEvents.length === 0) return '';

  const blocks = [];
  let currentBlock = '';
  let lastEnd = null;

  for (const event of preparedEvents) {
    const gap = lastEnd == null ? 0 : Math.max(0, event.start - lastEnd);

    if (gap >= 7000) {
      if (currentBlock) {
        blocks.push(currentBlock.trim());
        currentBlock = '';
      }
      blocks.push(`[pausa de ${Math.round(gap / 1000)}s]`);
    }

    const shouldBreakBlock = !currentBlock || gap >= 2500 || /[.!?…:]$/.test(currentBlock) || currentBlock.length + event.text.length > 220;
    if (!currentBlock) {
      currentBlock = event.text;
    } else if (shouldBreakBlock) {
      blocks.push(currentBlock.trim());
      currentBlock = event.text;
    } else {
      currentBlock = `${currentBlock} ${event.text}`;
    }

    lastEnd = event.end;
  }

  if (currentBlock) blocks.push(currentBlock.trim());

  return blocks.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}
/**
 * Process a service: fetch YouTube transcript, send to AI, save results.
 * Runs asynchronously (fire-and-forget from the route handler).
 */
async function processService(serviceId, options = {}) {
  const log = [];
  const addLog = async (step, message, status = 'info') => {
    const entry = { step, message, status, timestamp: new Date().toISOString() };
    log.push(entry);
    try {
      await pool.query(
        `UPDATE services SET processing_logs = $1 WHERE id = $2`,
        [JSON.stringify(log), serviceId]
      );
    } catch (e) {
      console.error('Failed to update processing log:', e);
    }
  };

  try {
    // 1. Get service details
    await addLog('init', 'Iniciando processamento...');
    const { rows: svcRows } = await pool.query('SELECT * FROM services WHERE id = $1', [serviceId]);
    if (!svcRows.length) {
      await addLog('init', 'Serviço não encontrado', 'error');
      return;
    }
    const service = svcRows[0];

    // 2. Get AI provider (specific or default)
    await addLog('provider', 'Buscando provedor de IA...');
    const providerId = options.provider_id || service.provider_id;
    let providerQuery;
    if (providerId) {
      providerQuery = await pool.query(`SELECT * FROM ai_providers WHERE id = $1 AND is_active = true`, [providerId]);
    }
    if (!providerQuery?.rows?.length) {
      providerQuery = await pool.query(`SELECT * FROM ai_providers WHERE is_active = true ORDER BY created_at LIMIT 1`);
    }
    if (!providerQuery.rows.length) {
      await addLog('provider', 'Nenhum provedor de IA configurado ou ativo. Configure em Admin > IA.', 'error');
      await pool.query(`UPDATE services SET ai_status = 'error', processing_error = $1 WHERE id = $2`, ['Nenhum provedor de IA configurado', serviceId]);
      return;
    }
    const provider = providerQuery.rows[0];
    const apiKey = (provider.api_keys_encrypted || [])[0] || provider.api_key_encrypted;
    if (!apiKey) {
      await addLog('provider', 'Provedor sem API key configurada', 'error');
      await pool.query(`UPDATE services SET ai_status = 'error', processing_error = $1 WHERE id = $2`, ['API key não configurada', serviceId]);
      return;
    }
    await addLog('provider', `Usando provedor: ${provider.name} (${provider.provider}/${provider.model})`);

    // Save provider used
    if (providerId) {
      await pool.query('UPDATE services SET provider_id = $1 WHERE id = $2', [provider.id, serviceId]);
    }

    // 3. Get church-level AI settings
    let churchPrompt = null;
    let churchTemp = null;
    let churchMaxTokens = null;
    if (service.church_id) {
      const { rows: churchRows } = await pool.query(
        'SELECT ai_prompt_template, ai_temperature, ai_max_tokens FROM churches WHERE id = $1',
        [service.church_id]
      );
      if (churchRows.length) {
        churchPrompt = churchRows[0].ai_prompt_template;
        churchTemp = churchRows[0].ai_temperature;
        churchMaxTokens = churchRows[0].ai_max_tokens;
      }
    }

    // 4. Fetch previous sermons for cross-referencing
    await addLog('context', 'Buscando pregações anteriores para correlação...');
    let previousContext = '';
    try {
      const { rows: prevRows } = await pool.query(
        `SELECT title, preacher, service_date, ai_summary, ai_topics, ai_key_verses 
         FROM services 
         WHERE church_id = $1 AND id != $2 AND ai_status = 'completed' 
         ORDER BY service_date DESC NULLS LAST 
         LIMIT 5`,
        [service.church_id, serviceId]
      );
      if (prevRows.length > 0) {
        previousContext = '\n\n--- PREGAÇÕES ANTERIORES (para correlação) ---\n';
        let usableCount = 0;
        prevRows.forEach((prev, i) => {
          const topics = normalizeTopicsForContext(prev.ai_topics);
          const summary = extractSummaryText(prev.ai_summary).slice(0, 300);
          previousContext += `\n${i + 1}. "${prev.title}" - ${prev.preacher || 'Pregador não informado'} (${prev.service_date ? new Date(prev.service_date).toLocaleDateString('pt-BR') : 'data não informada'})`;
          previousContext += `\nResumo: ${summary || 'Sem resumo disponível'}`;
          if (topics.length) previousContext += `\nTópicos: ${topics.join(', ')}`;
          previousContext += '\n';
          usableCount += 1;
        });
        await addLog('context', `${usableCount} pregações anteriores carregadas para correlação`);
      } else {
        await addLog('context', 'Nenhuma pregação anterior encontrada', 'info');
      }
    } catch (e) {
      await addLog('context', `Erro ao buscar pregações anteriores, prosseguindo sem correlação: ${e.message}`, 'warn');
    }

    // ============================================================
    // ETAPA 1 — TRANSCRIÇÃO
    // ============================================================
    let transcript = '';
    let transcriptOk = false;
    let transcriptSource = null;

    // Reusa transcrição salva (evita gastar requisição ao YouTube em reprocessamentos)
    const canReuse = options.reuse_transcription !== false && service.transcription && service.transcription.length >= 200;
    if (canReuse) {
      transcript = service.transcription;
      transcriptOk = true;
      transcriptSource = service.transcription_source || 'cached';
      await addLog('transcript', `♻️ Etapa 1/4: Reutilizando transcrição salva (${transcript.length.toLocaleString('pt-BR')} caracteres). Sem nova chamada ao YouTube.`, 'success');
    } else {
      await addLog('transcript', '🎙️ Etapa 1/4: Buscando transcrição do YouTube...');
      try {
        transcript = await fetchYouTubeTranscript(service.video_id, service.ai_start_time, service.ai_end_time);
        if (transcript && transcript.length >= 200) {
          transcriptOk = true;
          transcriptSource = 'youtube';
          await addLog('transcript', `✅ Transcrição obtida: ${transcript.length.toLocaleString('pt-BR')} caracteres (íntegra preservada no banco para reprocessamentos)`, 'success');
        } else {
          await addLog('transcript', `⚠️ Transcrição muito curta (${transcript?.length || 0} caracteres). O vídeo pode não ter legendas disponíveis.`, 'warn');
        }
      } catch (err) {
        await addLog('transcript', `❌ Falha ao obter transcrição: ${err.message}`, 'error');
      }
    }

    if (!transcriptOk) {
      await addLog('transcript', 'Não é possível analisar este culto sem transcrição. Verifique se o vídeo do YouTube tem legendas (automáticas ou manuais) habilitadas.', 'error');
      await pool.query(
        `UPDATE services SET ai_status = 'error', processing_error = $1, transcription = $2 WHERE id = $3`,
        ['Transcrição indisponível. Ative as legendas no YouTube ou escolha outro vídeo.', transcript || '', serviceId]
      );
      return;
    }

    // Salva ÍNTEGRA da transcrição (sem cortes) + metadados, antes de qualquer recorte
    if (!canReuse) {
      await pool.query(
        `UPDATE services SET transcription = $1, transcribed_at = NOW(), transcription_source = $2, transcription_length = $3 WHERE id = $4`,
        [transcript, transcriptSource, transcript.length, serviceId]
      );
      await addLog('transcript', '💾 Transcrição completa salva no banco (disponível para reprocessamentos futuros).');
    }

    const explicitVerseMentions = extractExplicitVerseMentionsFromTranscript(transcript);
    if (explicitVerseMentions.length > 0) {
      await addLog('transcript', `🔎 ${explicitVerseMentions.length} versículo(s) explícito(s) detectado(s) automaticamente`);
    } else {
      await addLog('transcript', 'ℹ️ Nenhum versículo explícito detectado automaticamente. A IA tentará identificar.', 'warn');
    }

    const systemPrompt = churchPrompt || getDefaultSystemPrompt();
    const transcriptForPrompt = buildTranscriptForPrompt(transcript);
    if (transcriptForPrompt.length < transcript.length) {
      await addLog('ai', '✂️ Transcrição muito longa; usando recorte inteligente (início + meio + fim).', 'warn');
    }
    const verseEvidenceForPrompt = buildVerseEvidenceForPrompt(explicitVerseMentions);

    const temperature = churchTemp ? parseFloat(churchTemp) : (parseFloat(provider.temperature) || 0.7);
    const configuredMaxTokens = Number(churchMaxTokens || provider.max_tokens || 8192);
    const maxTokens = Number.isFinite(configuredMaxTokens) && configuredMaxTokens > 0 ? configuredMaxTokens : 8192;

    const meta = {
      title: service.title,
      preacher: service.preacher || 'Não informado',
      date: service.service_date ? new Date(service.service_date).toLocaleDateString('pt-BR') : 'Não informada',
    };

    const runStage = async (stageName, label, sysPrompt, usrPrompt, tokens) => {
      await addLog('ai', `🧠 ${label}...`);
      let resp;
      try {
        resp = await callAIWithMeta(provider, apiKey, sysPrompt, usrPrompt, temperature, tokens);
        if (isLikelyTruncated(resp)) {
          const retryTokens = Math.min(Math.max(Math.ceil(tokens * 1.5), tokens + 2048), 16384);
          if (retryTokens > tokens) {
            await addLog('ai', `↻ ${stageName}: resposta truncada, tentando com mais espaço...`, 'warn');
            resp = await callAIWithMeta(provider, apiKey, sysPrompt, usrPrompt, temperature, retryTokens);
          }
        }
      } catch (err) {
        await addLog('ai', `❌ ${stageName} falhou: ${err.message}`, 'error');
        throw err;
      }
      try {
        return extractJsonFromResponse(resp.text || '');
      } catch (err) {
        await addLog('parse', `⚠️ ${stageName}: JSON inválido, usando fallback. (${err.message})`, 'warn');
        return null;
      }
    };

    let summaryData = null;
    let versesData = null;
    let keyPointsData = null;

    try {
      // ============================================================
      // ETAPA 2 — RESUMO (executivo + expandido + tema central + estrutura)
      // ============================================================
      summaryData = await runStage(
        'Resumo',
        'Etapa 2/4: Gerando resumo do culto',
        getSummarySystemPrompt(systemPrompt),
        buildSummaryUserPrompt(meta, transcriptForPrompt, previousContext),
        Math.min(maxTokens, 6000)
      );
      await addLog('ai', '✅ Resumo gerado.', 'success');

      // ============================================================
      // ETAPA 3 — VERSÍCULOS (extração e validação cruzada)
      // ============================================================
      versesData = await runStage(
        'Versículos',
        'Etapa 3/4: Extraindo versículos citados',
        getVersesSystemPrompt(systemPrompt),
        buildVersesUserPrompt(meta, transcriptForPrompt, verseEvidenceForPrompt),
        Math.min(maxTokens, 5000)
      );
      await addLog('ai', '✅ Versículos extraídos.', 'success');

      // ============================================================
      // ETAPA 4 — PONTOS-CHAVE (key points + aplicações + reflexões)
      // ============================================================
      keyPointsData = await runStage(
        'Pontos-chave',
        'Etapa 4/4: Identificando pontos-chave e aplicações',
        getKeyPointsSystemPrompt(systemPrompt),
        buildKeyPointsUserPrompt(meta, transcriptForPrompt, previousContext),
        Math.min(maxTokens, 6000)
      );
      await addLog('ai', '✅ Pontos-chave identificados.', 'success');
    } catch (err) {
      await pool.query(`UPDATE services SET ai_status = 'error', processing_error = $1 WHERE id = $2`, [err.message, serviceId]);
      return;
    }

    // 7. Merge das 3 respostas em um payload único
    await addLog('parse', '🔗 Consolidando resultados...');
    const merged = {
      ...(summaryData || {}),
      ...(keyPointsData || {}),
      key_verses: (versesData && (versesData.key_verses || versesData.verses)) || [],
      biblical_connections: (versesData && versesData.biblical_connections) || (keyPointsData && keyPointsData.biblical_connections) || [],
    };

    let parsed = normalizeAnalysisPayload(merged, transcript);
    await addLog('parse', `📖 ${parsed.key_verses.length} versículo(s) validado(s) na transcrição`);

    // 8. Save results
    await addLog('save', 'Salvando resultados...');
    await pool.query(
      `UPDATE services SET 
        ai_summary = $1, 
        ai_topics = $2, 
        ai_key_verses = $3, 
        ai_status = 'completed',
        processing_error = NULL
       WHERE id = $4`,
      [
        parsed.summary || '',
        JSON.stringify({
          central_theme: parsed.central_theme || '',
          expanded_summary: parsed.expanded_summary || '',
          topics: parsed.topics || [],
          key_points: parsed.key_points || [],
          deep_explanations: parsed.deep_explanations || [],
          practical_applications: parsed.practical_applications || [],
          connections: parsed.connections || [],
          reflection_questions: parsed.reflection_questions || [],
          group_study_questions: parsed.group_study_questions || [],
          theological_context: parsed.theological_context || '',
          sermon_structure: parsed.sermon_structure || [],
          biblical_connections: parsed.biblical_connections || [],
          key_phrases: parsed.key_phrases || [],
          derived_themes: parsed.derived_themes || [],
          continuation_suggestions: parsed.continuation_suggestions || [],
        }),
        JSON.stringify(parsed.key_verses || []),
        serviceId,
      ]
    );

    // Track usage
    try {
      await pool.query(
        `INSERT INTO ai_usage (church_id, provider, model, tokens_used, cost, endpoint) 
         VALUES ($1, $2, $3, $4, $5, 'service_process')`,
        [service.church_id, provider.provider, provider.model, Math.ceil(transcript.length / 4), 0]
      );
    } catch (e) { /* ignore usage tracking errors */ }

    await addLog('done', '✅ Processamento concluído com sucesso!', 'success');
    console.log(`Service ${serviceId} processed successfully`);

  } catch (err) {
    console.error(`Service processing failed for ${serviceId}:`, err);
    await addLog('error', `Erro fatal: ${err.message}`, 'error');
    await pool.query(
      `UPDATE services SET ai_status = 'error', processing_error = $1 WHERE id = $2`,
      [err.message, serviceId]
    );
  }
}

// ============================================================
// PROMPTS ESPECIALIZADOS POR ETAPA (resumo, versículos, pontos-chave)
// ============================================================

function getSummarySystemPrompt(churchExtra) {
  return `Você é um teólogo evangélico que escreve resumos claros e profundos de pregações cristãs.
Sua tarefa é APENAS produzir o resumo do culto (não extrair versículos nem listar pontos-chave — outras etapas farão isso).

${churchExtra ? `Contexto da igreja: ${churchExtra}\n` : ''}
Responda SEMPRE em JSON válido:
{
  "summary": "Resumo executivo de 5 a 8 linhas, mencionando os versículos citados pelo pregador.",
  "expanded_summary": "Resumo expandido com NO MÍNIMO 8 parágrafos, explicando passo a passo o raciocínio da mensagem, citando versículos quando o pregador os usar.",
  "central_theme": "Frase clara definindo o tema principal.",
  "theological_context": "Fundamento bíblico do tema à luz da Bíblia como um todo.",
  "sermon_structure": [
    {"part": "Introdução", "description": "O que foi abordado e versículos usados"},
    {"part": "Desenvolvimento 1", "description": "..."},
    {"part": "Desenvolvimento 2", "description": "..."},
    {"part": "Conclusão", "description": "..."}
  ]
}

REGRAS:
- Não invente versículos: mencione apenas os que aparecerem na transcrição.
- Mantenha neutralidade denominacional.
- Não retorne campos além dos pedidos.`;
}

function buildSummaryUserPrompt(meta, transcript, previousContext) {
  return `Resuma esta pregação em profundidade.

Título: ${meta.title}
Pregador: ${meta.preacher}
Data: ${meta.date}

TRANSCRIÇÃO DO CULTO:
${transcript}

${previousContext ? `CONTEXTO DE PREGAÇÕES ANTERIORES (use apenas para perceber continuidade temática):\n${previousContext}` : ''}`;
}

function getVersesSystemPrompt(churchExtra) {
  return `Você é um especialista em referências bíblicas. Sua única tarefa é EXTRAIR e EXPLICAR os versículos citados pelo pregador.

${churchExtra ? `Contexto da igreja: ${churchExtra}\n` : ''}
⚠️ REGRA ABSOLUTA:
- "key_verses" = SOMENTE versículos EXPLICITAMENTE CITADOS, LIDOS ou MENCIONADOS pelo pregador na transcrição.
- NÃO inclua versículos que apenas "combinam" com o tema. Esses vão em "biblical_connections".
- Se a transcrição não mencionar nenhum versículo específico, key_verses deve ser [].

Responda SEMPRE em JSON válido:
{
  "key_verses": [
    {
      "reference": "João 3:16",
      "text": "Texto completo (Almeida Revista e Atualizada).",
      "biblical_context": "Contexto histórico/literário do versículo na Bíblia.",
      "meaning": "Significado dentro do contexto da pregação.",
      "usage_in_sermon": "COMO o pregador usou — transcreva o trecho da fala se possível."
    }
  ],
  "biblical_connections": [
    {
      "reference": "Romanos 8:28",
      "text": "Texto completo do versículo.",
      "why_connected": "Por que se relaciona com o tema.",
      "how_reinforces": "Como complementa o ensino (sugestão sua, não citado pelo pregador)."
    }
  ]
}`;
}

function buildVersesUserPrompt(meta, transcript, verseEvidence) {
  return `Extraia os versículos da transcrição abaixo.

Título: ${meta.title}
Pregador: ${meta.preacher}

TRANSCRIÇÃO:
${transcript}

${verseEvidence
  ? `🔎 VERSÍCULOS DETECTADOS AUTOMATICAMENTE (prioridade máxima — todos devem aparecer em key_verses):\n${verseEvidence}`
  : 'Nenhum versículo detectado automaticamente. Procure cuidadosamente. Se não houver citação explícita, retorne key_verses: [].'}`;
}

function getKeyPointsSystemPrompt(churchExtra) {
  return `Você é um teólogo educador. Sua tarefa é APENAS identificar os pontos-chave, aplicações práticas e perguntas de reflexão (não resumir nem extrair versículos — outras etapas cuidam disso).

${churchExtra ? `Contexto da igreja: ${churchExtra}\n` : ''}
Responda SEMPRE em JSON válido:
{
  "topics": ["tópico 1", "tópico 2", "tópico 3", "tópico 4", "tópico 5"],
  "key_points": [
    {"point": "Ponto principal", "meaning": "Significado", "concept": "Conceito desenvolvido", "teaching": "O que ensina"}
  ],
  "deep_explanations": [
    {"point": "Ponto", "deep_meaning": "Aprofundamento", "spiritual_context": "Contexto espiritual", "biblical_principles": "Princípios bíblicos", "practical_examples": "Exemplos práticos"}
  ],
  "practical_applications": [
    "Aplicação prática 1 — como aplicar no dia a dia",
    "Aplicação prática 2 — mudança de comportamento",
    "Aplicação prática 3 — reflexão para a semana"
  ],
  "reflection_questions": ["Pergunta 1?", "Pergunta 2?", "Pergunta 3?"],
  "group_study_questions": ["Pergunta para grupo 1?", "Pergunta 2?", "Pergunta 3?"],
  "key_phrases": ["Frase marcante 1", "Frase marcante 2"],
  "derived_themes": ["tema derivado 1", "tema derivado 2"],
  "continuation_suggestions": ["Sugestão de continuidade 1", "Sugestão 2"],
  "connections": [
    {"sermon_title": "Pregação anterior", "connection": "Conexão temática"}
  ]
}

REGRAS:
- Pelo menos 5 key_points, 3 deep_explanations, 3 aplicações, 3 perguntas de reflexão e 3 perguntas de grupo.
- Use connections SOMENTE com base no contexto de pregações anteriores fornecido.
- Mantenha neutralidade denominacional.`;
}

function buildKeyPointsUserPrompt(meta, transcript, previousContext) {
  return `Identifique pontos-chave, aplicações e perguntas para esta pregação.

Título: ${meta.title}
Pregador: ${meta.preacher}
Data: ${meta.date}

TRANSCRIÇÃO:
${transcript}

${previousContext ? `CONTEXTO DE PREGAÇÕES ANTERIORES (use APENAS em "connections" e "continuation_suggestions"):\n${previousContext}` : ''}`;
}

function getDefaultSystemPrompt() {
  return `Você é um teólogo e analista bíblico especializado em pregações cristãs. Sua função é transformar o conteúdo de um culto em um material COMPLETO de estudo bíblico — organizado, profundo, claro e aplicável.

O resultado NÃO deve ser apenas um resumo. Deve ser uma estrutura de ensino e aprendizado.

⚠️ REGRA CRÍTICA SOBRE VERSÍCULOS:
- "key_verses" deve conter SOMENTE versículos que foram EXPLICITAMENTE CITADOS ou LIDOS pelo pregador durante a mensagem.
- NÃO adicione versículos que você acha que "combinam" ou "se relacionam" com o tema.
- NÃO invente citações que não aparecem na transcrição.
- Se o pregador disse "em João 3:16 diz que...", então João 3:16 é um key_verse.
- Se o pregador NÃO mencionou um versículo específico, ele NÃO deve aparecer em key_verses.
- Versículos que você sugere como complemento vão em "biblical_connections", NÃO em "key_verses".

⚠️ REGRA CRÍTICA SOBRE O RESUMO:
- O "summary" e "expanded_summary" devem mencionar os versículos que o pregador citou.
- Exemplo: "O pregador abriu com Salmo 23 e desenvolveu o tema usando Romanos 8:28..."

Responda SEMPRE em JSON válido com a seguinte estrutura:
{
  "summary": "Resumo executivo (5-8 linhas). DEVE mencionar os versículos citados pelo pregador.",

  "expanded_summary": "Resumo expandido e detalhado (mínimo 8 parágrafos), explicando o raciocínio da pregação passo a passo, citando os versículos usados pelo pregador em cada ponto.",

  "central_theme": "Frase clara definindo o tema principal da mensagem.",

  "theological_context": "Fundamento bíblico do tema à luz da Bíblia como um todo.",

  "sermon_structure": [
    {"part": "Introdução", "description": "O que foi abordado e quais versículos foram usados"},
    {"part": "Desenvolvimento 1", "description": "Primeiro ponto e versículos citados"},
    {"part": "Desenvolvimento 2", "description": "Segundo ponto e versículos citados"},
    {"part": "Conclusão", "description": "Como o pregador concluiu"}
  ],

  "topics": ["tópico 1", "tópico 2", "tópico 3", "tópico 4", "tópico 5"],

  "key_points": [
    {"point": "Ponto principal 1", "meaning": "Significado", "concept": "Conceito desenvolvido", "teaching": "O que ensina"}
  ],

  "deep_explanations": [
    {"point": "Ponto 1", "deep_meaning": "Aprofundamento", "spiritual_context": "Contexto espiritual", "biblical_principles": "Princípios bíblicos", "practical_examples": "Exemplos práticos"}
  ],

  "key_verses": [
    {"reference": "João 3:16", "text": "Texto completo do versículo", "biblical_context": "Contexto bíblico", "meaning": "Significado no contexto da pregação", "usage_in_sermon": "COMO e QUANDO o pregador usou este versículo na mensagem — transcreva o trecho se possível"}
  ],

  "biblical_connections": [
    {"reference": "Romanos 8:28", "text": "Texto do versículo", "why_connected": "Por que se relaciona com o tema", "how_reinforces": "Como complementa o ensino — estes NÃO foram citados pelo pregador, são sugestões complementares"}
  ],

  "practical_applications": [
    "Aplicação prática 1 — como aplicar no dia a dia",
    "Aplicação prática 2 — mudança de comportamento",
    "Aplicação prática 3 — reflexão para a semana"
  ],

  "reflection_questions": ["Pergunta 1?", "Pergunta 2?", "Pergunta 3?"],
  "group_study_questions": ["Pergunta para grupo 1?", "Pergunta para grupo 2?", "Pergunta para grupo 3?"],
  "key_phrases": ["Frase marcante 1 da mensagem", "Frase marcante 2"],
  "derived_themes": ["tema derivado 1", "tema derivado 2"],
  "continuation_suggestions": ["Sugestão de continuidade 1", "Sugestão 2"],
  "connections": [
    {"sermon_title": "Pregação anterior", "connection": "Conexão temática identificada"}
  ]
}

REGRAS IMPORTANTES:
- O resumo executivo (summary) DEVE citar os versículos mencionados pelo pregador
- O resumo expandido (expanded_summary) deve ter NO MÍNIMO 8 parágrafos e mencionar versículos citados
- key_verses = SOMENTE versículos CITADOS EXPLICITAMENTE na transcrição pelo pregador
- Quando houver evidência automática de versículos detectados na transcrição, trate essa evidência como prioridade máxima
- Se a transcrição mostrar claramente um versículo e o contexto de pregações anteriores trouxer outros, os outros NÃO entram em key_verses do culto atual
- biblical_connections = versículos complementares sugeridos por você (NÃO citados pelo pregador)
- Se a transcrição não contém citação explícita de nenhum versículo, key_verses deve ser array vazio []
- Gere PELO MENOS 5 key_points com meaning, concept e teaching
- Gere PELO MENOS 3 deep_explanations
- Crie PELO MENOS 3 aplicações práticas
- Crie PELO MENOS 3 perguntas reflexão e 3 para grupo
- NÃO inventar doutrinas
- Manter neutralidade denominacional
- Manter coerência com o contexto bíblico`;
}

/**
 * Fetch YouTube transcript using the timedtext API
 */
async function fetchYouTubeTranscript(videoId, startTime, endTime) {
  if (!videoId) throw new Error('Video ID não encontrado');

  const fetchWithTimeout = (url, timeoutMs = 15000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
  };

  const langCodes = ['pt', 'pt-BR', 'en', 'es'];
  
  for (const lang of langCodes) {
    try {
      const url = `https://www.youtube.com/api/timedtext?lang=${lang}&v=${videoId}&fmt=json3`;
      const res = await fetchWithTimeout(url);
      if (res.ok) {
        const data = await res.json();
        if (data.events && data.events.length > 0) {
          let startMs = timeToMs(startTime);
          let endMs = timeToMs(endTime);

          const transcript = buildReadableTranscriptFromEvents(data.events, startMs, endMs);
          if (transcript.length > 50) return transcript;
        }
      }
    } catch (e) {
      continue;
    }
  }

  // Fallback: try auto-generated captions
  try {
    const pageRes = await fetchWithTimeout(`https://www.youtube.com/watch?v=${videoId}`, 20000);
    const html = await pageRes.text();
    
    const captionMatch = html.match(/"captions":\s*(\{.*?"playerCaptionsTracklistRenderer".*?\})/s);
    if (captionMatch) {
      const captionsData = JSON.parse(captionMatch[1]);
      const tracks = captionsData?.playerCaptionsTracklistRenderer?.captionTracks || [];
      
      if (tracks.length > 0) {
        const track = tracks.find(t => t.languageCode === 'pt') || 
                     tracks.find(t => t.languageCode === 'en') || 
                     tracks[0];
        
        const captionRes = await fetchWithTimeout(track.baseUrl + '&fmt=json3');
        if (captionRes.ok) {
          const data = await captionRes.json();
          if (data.events) {
            let startMs = timeToMs(startTime);
            let endMs = timeToMs(endTime);

              const transcript = buildReadableTranscriptFromEvents(data.events, startMs, endMs);
              if (transcript.length > 50) return transcript;
          }
        }
      }
    }
  } catch (e) {
    // Fallback failed
  }

  throw new Error('Não foi possível obter a transcrição do vídeo.');
}

function timeToMs(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
  return 0;
}

/**
 * Call AI provider
 */
async function callAI(provider, apiKey, systemPrompt, userPrompt, temperature = 0.7, maxTokens = 8192) {
  const result = await callAIWithMeta(provider, apiKey, systemPrompt, userPrompt, temperature, maxTokens);
  return result.text;
}

async function callAIWithMeta(provider, apiKey, systemPrompt, userPrompt, temperature = 0.7, maxTokens = 8192) {
  const providerType = provider.provider;
  const model = provider.model;

  if (providerType === 'openai' || providerType === 'groq' || providerType === 'deepseek') {
    const baseUrls = {
      openai: 'https://api.openai.com/v1',
      groq: 'https://api.groq.com/openai/v1',
      deepseek: 'https://api.deepseek.com/v1',
    };
    const res = await fetch(`${baseUrls[providerType]}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`${providerType} API error ${res.status}: ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    return {
      text: data.choices?.[0]?.message?.content || '',
      finishReason: data.choices?.[0]?.finish_reason || null,
      raw: data,
    };
  }

  if (providerType === 'google') {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
          },
        }),
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google API error ${res.status}: ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    return {
      text: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
      finishReason: data.candidates?.[0]?.finishReason || null,
      raw: data,
    };
  }

  if (providerType === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    return {
      text: data.content?.[0]?.text || '',
      stopReason: data.stop_reason || null,
      raw: data,
    };
  }

  throw new Error(`Provedor "${providerType}" não suportado`);
}

// ============================================================
// EXECUÇÃO POR ETAPA (transcribe, summary, verses, keypoints)
// Cada função pode ser executada de forma independente. O status individual de cada
// etapa fica em services.processing_stages (JSONB).
// ============================================================

const { transcribeYouTubeWithWhisper } = require('./whisperService');

const VALID_STAGES = ['transcribe', 'summary', 'verses', 'keypoints'];

async function setStageStatus(serviceId, stage, status) {
  await pool.query(
    `UPDATE services SET processing_stages = COALESCE(processing_stages, '{}'::jsonb) || jsonb_build_object($1::text, $2::text)
     WHERE id = $3`,
    [stage, status, serviceId]
  );
}

async function appendStageLog(serviceId, stage, message, status = 'info') {
  const entry = { step: stage, message, status, timestamp: new Date().toISOString() };
  await pool.query(
    `UPDATE services SET processing_logs = COALESCE(processing_logs, '[]'::jsonb) || $1::jsonb
     WHERE id = $2`,
    [JSON.stringify([entry]), serviceId]
  );
}

async function loadServiceWithProvider(serviceId, providerId) {
  const { rows } = await pool.query('SELECT * FROM services WHERE id = $1', [serviceId]);
  if (!rows.length) throw new Error('Culto não encontrado');
  const service = rows[0];

  const targetProviderId = providerId || service.provider_id;
  let providerRows;
  if (targetProviderId) {
    const r = await pool.query('SELECT * FROM ai_providers WHERE id = $1 AND is_active = true', [targetProviderId]);
    providerRows = r.rows;
  }
  if (!providerRows || !providerRows.length) {
    const r = await pool.query('SELECT * FROM ai_providers WHERE is_active = true ORDER BY created_at LIMIT 1');
    providerRows = r.rows;
  }
  if (!providerRows.length) throw new Error('Nenhum provedor de IA configurado');

  const provider = providerRows[0];
  const apiKey = (provider.api_keys_encrypted || [])[0] || provider.api_key_encrypted;
  if (!apiKey) throw new Error('API key do provedor não configurada');

  let churchPrompt = null, churchTemp = null, churchMaxTokens = null;
  if (service.church_id) {
    const c = await pool.query(
      'SELECT ai_prompt_template, ai_temperature, ai_max_tokens FROM churches WHERE id = $1',
      [service.church_id]
    );
    if (c.rows.length) {
      churchPrompt = c.rows[0].ai_prompt_template;
      churchTemp = c.rows[0].ai_temperature;
      churchMaxTokens = c.rows[0].ai_max_tokens;
    }
  }

  return { service, provider, apiKey, churchPrompt, churchTemp, churchMaxTokens };
}

async function findOpenAIKey(preferredProvider) {
  // Whisper só existe na OpenAI; se o provider escolhido for OpenAI usa a chave dele,
  // senão procura qualquer provider OpenAI ativo.
  if (preferredProvider?.provider === 'openai') {
    const k = (preferredProvider.api_keys_encrypted || [])[0] || preferredProvider.api_key_encrypted;
    if (k) return k;
  }
  const { rows } = await pool.query(
    `SELECT api_keys_encrypted, api_key_encrypted FROM ai_providers
     WHERE provider = 'openai' AND is_active = true ORDER BY created_at LIMIT 1`
  );
  if (rows.length) return (rows[0].api_keys_encrypted || [])[0] || rows[0].api_key_encrypted || null;
  return null;
}

/**
 * ETAPA 1 — Transcreve o áudio do YouTube via Whisper e salva no banco.
 */
async function runTranscribeStage(serviceId, options = {}) {
  await setStageStatus(serviceId, 'transcribe', 'processing');
  await appendStageLog(serviceId, 'transcribe', '🎙️ Iniciando transcrição via IA (Whisper)...');

  try {
    const { service, provider } = await loadServiceWithProvider(serviceId, options.provider_id);

    // Reusa transcrição salva se existir e o usuário não pediu re-fazer
    const force = options.force === true;
    if (!force && service.transcription && service.transcription.length >= 200) {
      await appendStageLog(serviceId, 'transcribe', `♻️ Transcrição já existe (${service.transcription.length.toLocaleString('pt-BR')} chars). Pulando.`, 'success');
      await setStageStatus(serviceId, 'transcribe', 'completed');
      return { skipped: true, length: service.transcription.length };
    }

    const openaiKey = await findOpenAIKey(provider);
    if (!openaiKey) {
      throw new Error('Nenhum provedor OpenAI configurado. Whisper requer uma API key da OpenAI.');
    }

    // Recupera video_id se estiver vazio (cultos antigos ou URLs em formatos não cobertos)
    let videoId = service.video_id;
    if (!videoId && service.youtube_url) {
      const patterns = [
        /[?&]v=([a-zA-Z0-9_-]{11})/,
        /youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /\/shorts\/([a-zA-Z0-9_-]{11})/,
        /\/live\/([a-zA-Z0-9_-]{11})/,
        /\/embed\/([a-zA-Z0-9_-]{11})/,
        /\/v\/([a-zA-Z0-9_-]{11})/,
      ];
      for (const re of patterns) {
        const m = service.youtube_url.match(re);
        if (m) { videoId = m[1]; break; }
      }
      if (videoId) {
        await pool.query('UPDATE services SET video_id = $1 WHERE id = $2', [videoId, serviceId]);
        await appendStageLog(serviceId, 'transcribe', `🔧 Video ID recuperado da URL: ${videoId}`);
      }
    }
    if (!videoId) {
      throw new Error('Video ID não encontrado na URL do YouTube. Edite o culto e cole um link válido (watch, youtu.be, shorts ou live).');
    }

    const result = await transcribeYouTubeWithWhisper({
      videoId,
      openaiApiKey: openaiKey,
      startTime: service.ai_start_time,
      endTime: service.ai_end_time,
      onProgress: (msg) => { appendStageLog(serviceId, 'transcribe', msg).catch(() => {}); },
    });

    if (!result.text || result.text.length < 50) {
      throw new Error('Transcrição vazia. Verifique se o vídeo tem áudio audível.');
    }

    await pool.query(
      `UPDATE services SET
        transcription = $1,
        transcribed_at = NOW(),
        transcription_source = $2,
        transcription_length = $3
       WHERE id = $4`,
      [result.text, result.source || 'whisper', result.text.length, serviceId]
    );
    await appendStageLog(serviceId, 'transcribe', `✅ Transcrição concluída (${result.text.length.toLocaleString('pt-BR')} caracteres) e salva no banco.`, 'success');
    await setStageStatus(serviceId, 'transcribe', 'completed');
    return { length: result.text.length };
  } catch (err) {
    if (/confirm you(?:'|’)re not a bot|captcha|unusual traffic/i.test(String(err.message || ''))) {
      err.message = 'O YouTube bloqueou temporariamente a captura automática do áudio deste vídeo. Tente novamente em alguns minutos ou confirme que o vídeo está público e disponível sem restrições.';
    }
    await appendStageLog(serviceId, 'transcribe', `❌ ${err.message}`, 'error');
    await setStageStatus(serviceId, 'transcribe', 'error');
    await pool.query(`UPDATE services SET processing_error = $1 WHERE id = $2`, [err.message, serviceId]);
    throw err;
  }
}

async function ensureTranscript(serviceId) {
  const { rows } = await pool.query('SELECT transcription FROM services WHERE id = $1', [serviceId]);
  if (!rows.length) throw new Error('Culto não encontrado');
  const t = rows[0].transcription || '';
  if (!t || t.length < 200) {
    throw new Error('Transcrição ainda não foi feita. Execute a etapa de transcrição primeiro.');
  }
  return t;
}

async function runAIStage(serviceId, stageKey, label, sysPromptFn, userPromptFn, tokensCap, options = {}) {
  await setStageStatus(serviceId, stageKey, 'processing');
  await appendStageLog(serviceId, stageKey, `🧠 ${label}...`);
  try {
    const { service, provider, apiKey, churchPrompt, churchTemp, churchMaxTokens } =
      await loadServiceWithProvider(serviceId, options.provider_id);

    const transcript = await ensureTranscript(serviceId);
    const transcriptForPrompt = buildTranscriptForPrompt(transcript);
    const explicitVerseMentions = extractExplicitVerseMentionsFromTranscript(transcript);
    const verseEvidence = buildVerseEvidenceForPrompt(explicitVerseMentions);
    const systemPrompt = churchPrompt || getDefaultSystemPrompt();

    const meta = {
      title: service.title,
      preacher: service.preacher || 'Não informado',
      date: service.service_date ? new Date(service.service_date).toLocaleDateString('pt-BR') : 'Não informada',
    };

    // contexto de pregações anteriores
    let previousContext = '';
    try {
      const { rows: prevRows } = await pool.query(
        `SELECT title, preacher, service_date, ai_summary, ai_topics
         FROM services WHERE church_id = $1 AND id != $2 AND ai_status = 'completed'
         ORDER BY service_date DESC NULLS LAST LIMIT 5`,
        [service.church_id, serviceId]
      );
      if (prevRows.length) {
        previousContext = '\n--- PREGAÇÕES ANTERIORES ---\n' + prevRows.map((p, i) => {
          const topics = normalizeTopicsForContext(p.ai_topics);
          const summary = extractSummaryText(p.ai_summary).slice(0, 250);
          return `${i + 1}. "${p.title}" - ${p.preacher || 's/ pregador'}\nResumo: ${summary}\nTópicos: ${topics.join(', ')}`;
        }).join('\n\n');
      }
    } catch {}

    const temperature = churchTemp ? parseFloat(churchTemp) : (parseFloat(provider.temperature) || 0.7);
    const configuredMax = Number(churchMaxTokens || provider.max_tokens || 8192);
    const maxTokens = Math.min(Number.isFinite(configuredMax) && configuredMax > 0 ? configuredMax : 8192, tokensCap);

    const usrPrompt = userPromptFn(meta, transcriptForPrompt, previousContext, verseEvidence);
    const sysPrompt = sysPromptFn(systemPrompt);

    let resp = await callAIWithMeta(provider, apiKey, sysPrompt, usrPrompt, temperature, maxTokens);
    if (isLikelyTruncated(resp)) {
      const retryTokens = Math.min(Math.max(Math.ceil(maxTokens * 1.5), maxTokens + 2048), 16384);
      if (retryTokens > maxTokens) {
        await appendStageLog(serviceId, stageKey, '↻ Resposta truncada, reenviando com mais espaço...', 'warn');
        resp = await callAIWithMeta(provider, apiKey, sysPrompt, usrPrompt, temperature, retryTokens);
      }
    }

    let parsed;
    try {
      parsed = extractJsonFromResponse(resp.text || '');
    } catch (err) {
      throw new Error(`JSON inválido na resposta da IA: ${err.message}`);
    }

    return { parsed, transcript, service };
  } catch (err) {
    await appendStageLog(serviceId, stageKey, `❌ ${err.message}`, 'error');
    await setStageStatus(serviceId, stageKey, 'error');
    await pool.query(`UPDATE services SET processing_error = $1 WHERE id = $2`, [err.message, serviceId]);
    throw err;
  }
}

/**
 * ETAPA 2 — Resumo (executivo + expandido + tema + estrutura)
 */
async function runSummaryStage(serviceId, options = {}) {
  const { parsed, transcript } = await runAIStage(
    serviceId,
    'summary',
    'Gerando resumo da pregação',
    getSummarySystemPrompt,
    (meta, t, prev) => buildSummaryUserPrompt(meta, t, prev),
    6000,
    options
  );

  const norm = normalizeAnalysisPayload(parsed, transcript);

  // Mantém ai_topics existente e mescla campos do resumo (para não apagar versículos/pontos)
  const { rows: cur } = await pool.query('SELECT ai_topics FROM services WHERE id = $1', [serviceId]);
  let curTopics = {};
  try { curTopics = cur[0]?.ai_topics ? (typeof cur[0].ai_topics === 'string' ? JSON.parse(cur[0].ai_topics) : cur[0].ai_topics) : {}; } catch {}

  const merged = {
    ...curTopics,
    central_theme: norm.central_theme || curTopics.central_theme || '',
    expanded_summary: norm.expanded_summary || curTopics.expanded_summary || '',
    theological_context: norm.theological_context || curTopics.theological_context || '',
    sermon_structure: norm.sermon_structure?.length ? norm.sermon_structure : (curTopics.sermon_structure || []),
  };

  await pool.query(
    `UPDATE services SET ai_summary = $1, ai_topics = $2 WHERE id = $3`,
    [norm.summary || '', JSON.stringify(merged), serviceId]
  );

  await appendStageLog(serviceId, 'summary', '✅ Resumo salvo com sucesso.', 'success');
  await setStageStatus(serviceId, 'summary', 'completed');
  await maybeMarkOverallStatus(serviceId);
  return { summary_length: (norm.summary || '').length };
}

/**
 * ETAPA 3 — Versículos (key_verses + biblical_connections)
 */
async function runVersesStage(serviceId, options = {}) {
  const { parsed, transcript } = await runAIStage(
    serviceId,
    'verses',
    'Extraindo versículos citados',
    getVersesSystemPrompt,
    (meta, t, prev, verseEvidence) => buildVersesUserPrompt(meta, t, verseEvidence),
    5000,
    options
  );

  const norm = normalizeAnalysisPayload(parsed, transcript);
  const { rows: cur } = await pool.query('SELECT ai_topics FROM services WHERE id = $1', [serviceId]);
  let curTopics = {};
  try { curTopics = cur[0]?.ai_topics ? (typeof cur[0].ai_topics === 'string' ? JSON.parse(cur[0].ai_topics) : cur[0].ai_topics) : {}; } catch {}

  const merged = {
    ...curTopics,
    biblical_connections: norm.biblical_connections?.length ? norm.biblical_connections : (curTopics.biblical_connections || []),
  };

  await pool.query(
    `UPDATE services SET ai_key_verses = $1, ai_topics = $2 WHERE id = $3`,
    [JSON.stringify(norm.key_verses || []), JSON.stringify(merged), serviceId]
  );

  await appendStageLog(serviceId, 'verses', `✅ ${norm.key_verses.length} versículo(s) extraído(s).`, 'success');
  await setStageStatus(serviceId, 'verses', 'completed');
  await maybeMarkOverallStatus(serviceId);
  return { count: norm.key_verses.length };
}

/**
 * ETAPA 4 — Pontos-chave (key_points + aplicações + reflexões)
 */
async function runKeyPointsStage(serviceId, options = {}) {
  const { parsed, transcript } = await runAIStage(
    serviceId,
    'keypoints',
    'Identificando pontos-chave e aplicações',
    getKeyPointsSystemPrompt,
    (meta, t, prev) => buildKeyPointsUserPrompt(meta, t, prev),
    6000,
    options
  );

  const norm = normalizeAnalysisPayload(parsed, transcript);
  const { rows: cur } = await pool.query('SELECT ai_topics FROM services WHERE id = $1', [serviceId]);
  let curTopics = {};
  try { curTopics = cur[0]?.ai_topics ? (typeof cur[0].ai_topics === 'string' ? JSON.parse(cur[0].ai_topics) : cur[0].ai_topics) : {}; } catch {}

  const merged = {
    ...curTopics,
    topics: norm.topics?.length ? norm.topics : (curTopics.topics || []),
    key_points: norm.key_points?.length ? norm.key_points : (curTopics.key_points || []),
    deep_explanations: norm.deep_explanations?.length ? norm.deep_explanations : (curTopics.deep_explanations || []),
    practical_applications: norm.practical_applications?.length ? norm.practical_applications : (curTopics.practical_applications || []),
    reflection_questions: norm.reflection_questions?.length ? norm.reflection_questions : (curTopics.reflection_questions || []),
    group_study_questions: norm.group_study_questions?.length ? norm.group_study_questions : (curTopics.group_study_questions || []),
    key_phrases: norm.key_phrases?.length ? norm.key_phrases : (curTopics.key_phrases || []),
    derived_themes: norm.derived_themes?.length ? norm.derived_themes : (curTopics.derived_themes || []),
    continuation_suggestions: norm.continuation_suggestions?.length ? norm.continuation_suggestions : (curTopics.continuation_suggestions || []),
    connections: norm.connections?.length ? norm.connections : (curTopics.connections || []),
  };

  await pool.query(
    `UPDATE services SET ai_topics = $1 WHERE id = $2`,
    [JSON.stringify(merged), serviceId]
  );

  await appendStageLog(serviceId, 'keypoints', `✅ ${norm.key_points.length} pontos-chave + ${norm.practical_applications.length} aplicações.`, 'success');
  await setStageStatus(serviceId, 'keypoints', 'completed');
  await maybeMarkOverallStatus(serviceId);
  return { points: norm.key_points.length };
}

/**
 * Atualiza ai_status global para 'completed' quando todas as 4 etapas terminaram OK.
 */
async function maybeMarkOverallStatus(serviceId) {
  const { rows } = await pool.query('SELECT processing_stages FROM services WHERE id = $1', [serviceId]);
  const stages = rows[0]?.processing_stages || {};
  const allDone = VALID_STAGES.every((s) => stages[s] === 'completed');
  if (allDone) {
    await pool.query(`UPDATE services SET ai_status = 'completed', processing_error = NULL WHERE id = $1`, [serviceId]);
  } else if (Object.values(stages).some((v) => v === 'processing')) {
    await pool.query(`UPDATE services SET ai_status = 'processing' WHERE id = $1`, [serviceId]);
  } else if (Object.values(stages).some((v) => v === 'completed')) {
    await pool.query(`UPDATE services SET ai_status = 'partial' WHERE id = $1 AND ai_status NOT IN ('completed')`, [serviceId]);
  }
}

module.exports = {
  processService,
  callAI,
  runTranscribeStage,
  runSummaryStage,
  runVersesStage,
  runKeyPointsStage,
  VALID_STAGES,
};
