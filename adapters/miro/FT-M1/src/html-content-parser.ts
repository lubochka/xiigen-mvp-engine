export interface MiroParsedContent {
  text: string;
  links: string[];
}

export function parseMiroContent(content = ''): MiroParsedContent {
  const links = Array.from(content.matchAll(/href=["']([^"']+)["']/g)).map((match) => match[1]);
  const text = content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim();

  return { text, links };
}
