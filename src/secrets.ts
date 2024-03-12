import { readFile, writeFile } from "node:fs/promises";

const fileName = "secrets.json";

export interface Secrets {
  personalKey: string | null;
  accessToken: string | null;
  username: string | null;
  password: string | null;
}

export async function getSecrets(): Promise<Secrets> {
  const secrets = await readFile(fileName, "utf-8");
  return JSON.parse(secrets);
}

export async function storeSecrets(secrets: Secrets) {
  await writeFile(fileName, JSON.stringify(secrets, null, 2));
}

export async function storePersonalKey(personalKey: string) {
  const secrets = await getSecrets();
  secrets.personalKey = personalKey;
  await storeSecrets(secrets);
}

export async function storeAccessToken(accessToken: string | null) {
  const secrets = await getSecrets();
  secrets.accessToken = accessToken;
  await storeSecrets(secrets);
}

export async function storeCredentials(
  username: string | null,
  password: string | null
) {
  const secrets = await getSecrets();
  secrets.username = username;
  secrets.password = password;
  await storeSecrets(secrets);
}
