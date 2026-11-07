declare module 'papaparse' {
  export interface ParseResult<T = Record<string, string>> {
    data: T[];
    errors: { message: string }[];
    meta: unknown;
  }
  export function parse<T = Record<string, string>>(
    input: string,
    config?: { header?: boolean; skipEmptyLines?: boolean | string },
  ): ParseResult<T>;
  export function unparse(data: { fields: string[]; data: string[][] }): string;
  const Papa: {
    parse: typeof parse;
    unparse: typeof unparse;
  };
  export default Papa;
}
