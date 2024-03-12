import { readFile, writeFile, stat } from "node:fs/promises";

export async function isFile(filename: string): Promise<string> {
  try {
    const s = await stat(filename);
    if (!s.isFile()) {
      return "inputFile is not a file";
    }
  } catch (error) {
    return "inputFile not found";
  }
  return "";
}

export async function isDirectory(outputDir: string): Promise<string> {
  try {
    const s = await stat(outputDir);
    if (!s.isDirectory()) {
      return "outputDir is not a directory";
    }
  } catch (error) {
    return "outputDir not found";
  }
  return "";
}

export async function nothingThere(path: string): Promise<boolean> {
  try {
    await stat(path);
  } catch (error) {
    return true;
  }
  return false;
}
