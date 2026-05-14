import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

/**
 * Hub article loader. Hubs live as MDX files in src/content/guides/*.mdx.
 * Each must have frontmatter: title, description, date, author?, tags?
 */

export interface HubFrontmatter {
  title: string;
  description: string;
  date: string; // ISO 8601
  author?: string;
  tags?: string[];
}

export interface HubArticle {
  slug: string;
  frontmatter: HubFrontmatter;
  /** Raw MDX source (compile in the page with MDXRemote). */
  content: string;
}

const GUIDES_DIR = path.join(process.cwd(), 'src', 'content', 'guides');

export function getAllHubSlugs(): string[] {
  if (!fs.existsSync(GUIDES_DIR)) return [];
  return fs
    .readdirSync(GUIDES_DIR)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => f.replace(/\.mdx$/, ''));
}

export function getHub(slug: string): HubArticle | undefined {
  const filePath = path.join(GUIDES_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return undefined;

  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw);

  return {
    slug,
    frontmatter: data as HubFrontmatter,
    content,
  };
}

export function getAllHubs(): HubArticle[] {
  return getAllHubSlugs()
    .map((slug) => getHub(slug))
    .filter((h): h is HubArticle => h !== undefined);
}
