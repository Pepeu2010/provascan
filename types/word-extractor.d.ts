declare module "word-extractor" {
  class ExtractedWordDocument {
    getBody(): string;
    getHeaders(options?: { includeFooters?: boolean }): string;
    getFooters(): string;
    getFootnotes(): string;
    getEndnotes(): string;
    getTextboxes(options?: { includeHeadersAndFooters?: boolean; includeBody?: boolean }): string;
  }

  export default class WordExtractor {
    extract(source: Buffer | string): Promise<ExtractedWordDocument>;
  }
}
