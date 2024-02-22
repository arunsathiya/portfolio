import type { z } from "zod";
import path from "path";
import matter from "gray-matter";
import fs from "fs/promises";
import { globby } from "globby";
import Markdoc from "@markdoc/markdoc";
import { config } from "./markdoc.config";

// path is relative to where you run the `yarn build` command
const contentDirectory = path.normalize("./content");

async function parseAndTransform({ content }: { content: string }) {
  const ast = Markdoc.parse(content);

  const errors = Markdoc.validate(ast, config);
  if (errors.length) {
    console.error(errors);
    throw new Error("Markdoc validation error");
  }
  const transformedContent = Markdoc.transform(ast, config);

  return transformedContent;
}

function validateFrontmatter<T extends z.ZodTypeAny>({
  frontmatter,
  schema,
  filepath,
}: {
  frontmatter: { [key: string]: unknown };
  schema: T;
  filepath: string;
}) {
  try {
    const validatedFrontmatter = schema.parse(frontmatter);
    return validatedFrontmatter as z.infer<T>;
  } catch (e) {
    const errMessage = `
      There was an error validating your frontmatter. 
      Please make sure your frontmatter for file: ${filepath} matches its schema.
    `;
    throw Error(errMessage + (e as Error).message);
  }
}

export async function read<T extends z.ZodTypeAny>({
  filepath,
  schema,
}: {
  filepath: string;
  schema: T;
}) {
  const rawString = await fs.readFile(filepath, "utf8");
  const { content, data: frontmatter } = matter(rawString);
  const transformedContent = await parseAndTransform({ content });
  const validatedFrontmatter = validateFrontmatter({
    frontmatter,
    schema,
    filepath,
  });

  const filename = filepath.split("/").pop();
  if (typeof filename !== "string") {
    throw new Error("Check what went wrong");
  }
  const fileNameWithoutExtension = filename.replace(/\.[^.]*$/, "");

  return {
    slug: fileNameWithoutExtension,
    content: transformedContent,
    frontmatter: validatedFrontmatter,
  };
}

export function normalizeString(str: string) {
  return str.toLowerCase().replace(/\s+/g, '-');
}

export async function readOne<T extends z.ZodTypeAny>({
  directory,
  slug,
  frontmatterSchema: schema,
}: {
  directory: string;
  slug: string;
  frontmatterSchema: T;
}) {
  // Normalize the slug for comparison
  const normalizedSlug = normalizeString(slug);

  const dirPath = path.join(contentDirectory, directory);
  const files = await globby(`${dirPath}/*.md`);

  // Find a file that matches the normalized slug
  const matchedFile = files.find(file => {
    const fileName = path.basename(file, '.md');
    return normalizeString(fileName) === normalizedSlug;
  });

  if (!matchedFile) {
    throw new Error(`No matching file found for slug: ${slug}`);
  }

  // Proceed with reading the matched file
  return read({
    filepath: matchedFile,
    schema,
  });
}

export async function readAll<T extends z.ZodTypeAny>({
  directory,
  frontmatterSchema: schema,
}: {
  directory: string;
  frontmatterSchema: T;
}) {
  const pathToDir = path.posix.join(contentDirectory, directory);
  const paths = await globby(`${pathToDir}/*.md`);

  return Promise.all(paths.map((path) => read({ filepath: path, schema })));
}
