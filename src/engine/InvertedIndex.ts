import { DocumentItem, PostingEntry, SearchResult, ScoreBreakdown } from '../types';

export const DEFAULT_STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are',
  'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both',
  'but', 'by', 'can', 'cannot', 'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t',
  'doing', 'don\'t', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t',
  'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here',
  'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i', 'i\'d', 'i\'ll',
  'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s',
  'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on',
  'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'shouldn\'t', 'so', 'some',
  'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs', 'them', 'themselves', 'then',
  'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this',
  'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we',
  'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s',
  'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why', 'why\'s', 'with',
  'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your',
  'yours', 'yourself', 'yourselves'
]);

export class ClientTokenizer {
  stopwords: Set<string>;
  removeStopwords: boolean;

  constructor(removeStopwords = true, customStopwords?: Set<string>) {
    this.removeStopwords = removeStopwords;
    this.stopwords = customStopwords || DEFAULT_STOPWORDS;
  }

  tokenizeWithPositions(text: string): Array<{ token: string; position: number }> {
    if (!text) return [];
    const pattern = /\b[a-zA-Z0-9_]+\b/g;
    const lower = text.toLowerCase();
    const results: Array<{ token: string; position: number }> = [];
    let match: RegExpExecArray | null;
    let pos = 0;

    while ((match = pattern.exec(lower)) !== null) {
      const token = match[0];
      if (this.removeStopwords && this.stopwords.has(token)) {
        pos++;
        continue;
      }
      results.push({ token, position: pos });
      pos++;
    }
    return results;
  }

  tokenize(text: string): string[] {
    return this.tokenizeWithPositions(text).map((r) => r.token);
  }
}

export class ClientInvertedIndex {
  tokenizer: ClientTokenizer;
  index: Map<string, PostingEntry[]>;
  documents: Map<string, DocumentItem>;
  docLengths: Map<string, number>;
  totalDocLength: number;

  constructor(removeStopwords = true) {
    this.tokenizer = new ClientTokenizer(removeStopwords);
    this.index = new Map();
    this.documents = new Map();
    this.docLengths = new Map();
    this.totalDocLength = 0;
  }

  get totalDocs(): number {
    return this.documents.size;
  }

  get avgDocLength(): number {
    if (this.totalDocs === 0) return 0;
    return this.totalDocLength / this.totalDocs;
  }

  addDocument(doc: DocumentItem): void {
    if (this.documents.has(doc.id)) {
      this.removeDocument(doc.id);
    }

    const combinedText = `${doc.title}\n${doc.content}`;
    const tokensWithPos = this.tokenizer.tokenizeWithPositions(combinedText);
    const docLen = tokensWithPos.length;

    this.docLengths.set(doc.id, docLen);
    this.totalDocLength += docLen;

    const termPosMap = new Map<string, number[]>();
    for (const item of tokensWithPos) {
      const arr = termPosMap.get(item.token) || [];
      arr.push(item.position);
      termPosMap.set(item.token, arr);
    }

    for (const [term, positions] of termPosMap.entries()) {
      const postings = this.index.get(term) || [];
      postings.push({
        docId: doc.id,
        termFrequency: positions.length,
        positions,
      });
      this.index.set(term, postings);
    }

    this.documents.set(doc.id, {
      ...doc,
      tokenCount: docLen,
    });
  }

  removeDocument(docId: string): boolean {
    if (!this.documents.has(docId)) return false;

    const docLen = this.docLengths.get(docId) || 0;
    this.totalDocLength = Math.max(0, this.totalDocLength - docLen);
    this.docLengths.delete(docId);
    this.documents.delete(docId);

    const termsToDelete: string[] = [];
    for (const [term, postings] of this.index.entries()) {
      const filtered = postings.filter((p) => p.docId !== docId);
      if (filtered.length === 0) {
        termsToDelete.push(term);
      } else {
        this.index.set(term, filtered);
      }
    }

    for (const t of termsToDelete) {
      this.index.delete(t);
    }

    return true;
  }

  getPostingList(term: string): PostingEntry[] {
    const norm = term.toLowerCase().trim();
    return this.index.get(norm) || [];
  }

  searchPhrase(phrase: string): Array<{ docId: string; count: number }> {
    const tokens = this.tokenizer.tokenize(phrase);
    if (tokens.length === 0) return [];
    if (tokens.length === 1) {
      const postings = this.getPostingList(tokens[0]);
      return postings.map((p) => ({ docId: p.docId, count: p.termFrequency }));
    }

    const postingLists = tokens.map((t) => this.getPostingList(t));
    if (postingLists.some((pl) => pl.length === 0)) return [];

    const docSets = postingLists.map((pl) => new Set(pl.map((p) => p.docId)));
    const candidateDocs = [...docSets[0]].filter((docId) =>
      docSets.every((set) => set.has(docId))
    );

    const results: Array<{ docId: string; count: number }> = [];

    for (const docId of candidateDocs) {
      const posByTerm = postingLists.map(
        (pl) => pl.find((p) => p.docId === docId)!.positions
      );
      const posSetsByTerm = posByTerm.map((arr) => new Set(arr));

      let occurrences = 0;
      for (const startPos of posByTerm[0]) {
        let isConsecutive = true;
        for (let i = 1; i < tokens.length; i++) {
          if (!posSetsByTerm[i].has(startPos + i)) {
            isConsecutive = false;
            break;
          }
        }
        if (isConsecutive) occurrences++;
      }

      if (occurrences > 0) {
        results.push({ docId, count: occurrences });
      }
    }

    return results;
  }

  rankBm25(query: string, k1 = 1.5, b = 0.75): SearchResult[] {
    const queryTokens = Array.from(new Set(this.tokenizer.tokenize(query)));
    if (queryTokens.length === 0 || this.totalDocs === 0) return [];

    const N = this.totalDocs;
    const avgdl = Math.max(1.0, this.avgDocLength);

    const scores = new Map<string, number>();
    const breakdowns = new Map<string, ScoreBreakdown>();
    const matchedTermsMap = new Map<string, Set<string>>();

    for (const token of queryTokens) {
      const postings = this.getPostingList(token);
      const df = postings.length;
      if (df === 0) continue;

      // BM25 IDF
      const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1.0);

      for (const p of postings) {
        const docLen = this.docLengths.get(p.docId) || 1;
        const f = p.termFrequency;
        const denom = f + k1 * (1 - b + b * (docLen / avgdl));
        const tfWeight = denom > 0 ? (f * (k1 + 1)) / denom : 0;
        const termScore = idf * tfWeight;

        const currentScore = scores.get(p.docId) || 0;
        scores.set(p.docId, currentScore + termScore);

        if (!breakdowns.has(p.docId)) {
          breakdowns.set(p.docId, { terms: {}, totalScore: 0 });
        }
        const bDown = breakdowns.get(p.docId)!;
        bDown.terms[token] = {
          rawTf: f,
          tfWeight: Number(tfWeight.toFixed(4)),
          idf: Number(idf.toFixed(4)),
          docLen,
          avgdl: Number(avgdl.toFixed(2)),
          score: Number(termScore.toFixed(4)),
        };

        const termsSet = matchedTermsMap.get(p.docId) || new Set<string>();
        termsSet.add(token);
        matchedTermsMap.set(p.docId, termsSet);
      }
    }

    const results: SearchResult[] = [];
    for (const [docId, score] of scores.entries()) {
      const doc = this.documents.get(docId);
      if (!doc) continue;

      const breakdown = breakdowns.get(docId)!;
      breakdown.totalScore = Number(score.toFixed(4));

      const snippet = this.extractSnippet(doc.content, queryTokens);

      results.push({
        id: docId,
        title: doc.title,
        snippet,
        score: Number(score.toFixed(4)),
        category: doc.category || 'General',
        tokenCount: this.docLengths.get(docId) || 0,
        breakdown,
        matchedTerms: Array.from(matchedTermsMap.get(docId) || []),
      });
    }

    results.sort((a, b) => b.score - a.score);
    return results;
  }

  rankTfidf(query: string): SearchResult[] {
    const queryTokens = Array.from(new Set(this.tokenizer.tokenize(query)));
    if (queryTokens.length === 0 || this.totalDocs === 0) return [];

    const N = this.totalDocs;
    const scores = new Map<string, number>();
    const breakdowns = new Map<string, ScoreBreakdown>();
    const matchedTermsMap = new Map<string, Set<string>>();

    for (const token of queryTokens) {
      const postings = this.getPostingList(token);
      const df = postings.length;
      if (df === 0) continue;

      // Smooth IDF
      const idf = Math.log((N + 1) / (df + 1)) + 1.0;

      for (const p of postings) {
        const docLen = Math.max(1, this.docLengths.get(p.docId) || 1);
        const tf = p.termFrequency / docLen;
        const tfidf = tf * idf;

        const current = scores.get(p.docId) || 0;
        scores.set(p.docId, current + tfidf);

        if (!breakdowns.has(p.docId)) {
          breakdowns.set(p.docId, { terms: {}, totalScore: 0 });
        }
        const bDown = breakdowns.get(p.docId)!;
        bDown.terms[token] = {
          rawTf: p.termFrequency,
          tfWeight: Number(tf.toFixed(4)),
          idf: Number(idf.toFixed(4)),
          docLen,
          score: Number(tfidf.toFixed(4)),
        };

        const termsSet = matchedTermsMap.get(p.docId) || new Set<string>();
        termsSet.add(token);
        matchedTermsMap.set(p.docId, termsSet);
      }
    }

    const results: SearchResult[] = [];
    for (const [docId, score] of scores.entries()) {
      const doc = this.documents.get(docId);
      if (!doc) continue;

      const breakdown = breakdowns.get(docId)!;
      breakdown.totalScore = Number(score.toFixed(4));
      const snippet = this.extractSnippet(doc.content, queryTokens);

      results.push({
        id: docId,
        title: doc.title,
        snippet,
        score: Number(score.toFixed(4)),
        category: doc.category || 'General',
        tokenCount: this.docLengths.get(docId) || 0,
        breakdown,
        matchedTerms: Array.from(matchedTermsMap.get(docId) || []),
      });
    }

    results.sort((a, b) => b.score - a.score);
    return results;
  }

  rankPhrase(phrase: string): SearchResult[] {
    const phraseMatches = this.searchPhrase(phrase);
    const tokens = this.tokenizer.tokenize(phrase);
    const results: SearchResult[] = [];

    for (const match of phraseMatches) {
      const doc = this.documents.get(match.docId);
      if (!doc) continue;

      const breakdown: ScoreBreakdown = {
        terms: {},
        totalScore: match.count,
        phraseOccurrences: match.count,
      };

      const snippet = this.extractSnippet(doc.content, tokens);

      results.push({
        id: match.docId,
        title: doc.title,
        snippet,
        score: match.count,
        category: doc.category || 'General',
        tokenCount: this.docLengths.get(match.docId) || 0,
        breakdown,
        matchedTerms: tokens,
      });
    }

    results.sort((a, b) => b.score - a.score);
    return results;
  }

  extractSnippet(text: string, queryTokens: string[], windowSize = 160): string {
    if (!text) return '';
    if (queryTokens.length === 0) {
      return text.slice(0, windowSize) + (text.length > windowSize ? '...' : '');
    }

    const lower = text.toLowerCase();
    let bestStart = -1;

    for (const q of queryTokens) {
      const idx = lower.indexOf(q.toLowerCase());
      if (idx !== -1) {
        if (bestStart === -1 || idx < bestStart) {
          bestStart = idx;
        }
      }
    }

    if (bestStart === -1) {
      return text.slice(0, windowSize) + (text.length > windowSize ? '...' : '');
    }

    let start = Math.max(0, bestStart - Math.floor(windowSize / 3));
    let end = Math.min(text.length, start + windowSize);

    if (start > 0) {
      const prevSpace = text.lastIndexOf(' ', start);
      if (prevSpace !== -1 && start - prevSpace < 20) {
        start = prevSpace + 1;
      }
    }

    if (end < text.length) {
      const nextSpace = text.indexOf(' ', end);
      if (nextSpace !== -1 && nextSpace - end < 20) {
        end = nextSpace;
      }
    }

    const prefix = start > 0 ? '...' : '';
    const suffix = end < text.length ? '...' : '';
    return prefix + text.slice(start, end).trim() + suffix;
  }
}
