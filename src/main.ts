import {
  getSecrets,
  storeAccessToken,
  storePersonalKey,
  storeCredentials,
} from "./secrets.ts";
import {
  toBase64,
  toBinaryFromBase64,
  toBinaryFromUnicode,
  toUnicode,
  generateKey,
  encryptData,
  decryptData,
} from "./sodium.ts";
import { Command } from "commander";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isFile, isDirectory, nothingThere } from "./filesystem-checks.ts";
import { getDocuments, getDocument } from "./client.ts";

const program = new Command();

program
  .name("bodypace-cli")
  .description(
    "CLI to access bodypace-personal-data-server and encrypt or decrypt locally"
  )
  // .configureHelp({
  //   // to enable this (uncomment) first move --server to commands that use it
  //   // to avoid it being mentioned in help of commands like "encrypt" or "generate-key"
  //   showGlobalOptions: true,
  // })
  .option(
    "-s, --server <url>",
    "URL of server to connect to",
    "http://localhost:8080"
  )
  .option(
    "-S, --secrets <secrets.json>",
    "File to use as storage of secrets and credentials"
  )
  .version("0.0.1");

program
  .command("show-secrets")
  .description("Display personal key, access token and credentials")
  .action(async () => {
    const secrets = await getSecrets();
    console.log(secrets);
  });

program
  .command("generate-key")
  .description("Generate a new personal key")
  .option("-k, --keep", "save generated key to secrets.json")
  .option("-n, --no-print", "do not display the generated key in terminal")
  .action(async (options) => {
    const key = await generateKey();
    if (!options.hide) {
      console.log("generated key: ", key);
    }
    if (options.save) {
      await storePersonalKey(key);
      console.log("Key saved to secrets.json");
    }
  });

program
  .command("encrypt")
  .description("Encrypt a file with a personal key")
  .argument("<inputFile>", "file to encrypt")
  .argument("[outputDir]", "directory to save encrypted file in (default '.')")
  .action(async (inputFile, outputDir) => {
    const inputFileError = await isFile(inputFile);
    if (inputFileError) {
      console.error(inputFileError);
      return;
    }

    outputDir = outputDir || ".";

    const outputDirError = await isDirectory(outputDir);
    if (outputDirError) {
      console.error(outputDirError);
      return;
    }

    const personalKey = (await getSecrets()).personalKey;
    if (!personalKey) {
      console.error("no personal key found");
      return;
    }

    const filename = path.basename(inputFile);

    const fileKey = await generateKey();

    const name = await toBase64(
      await encryptData(
        await toBinaryFromUnicode(filename),
        await toBinaryFromBase64(fileKey)
      )
    );

    const keys = await toBase64(
      await encryptData(
        await toBinaryFromBase64(fileKey),
        await toBinaryFromBase64(personalKey)
      )
    );

    const data = await encryptData(
      await readFile(inputFile, { encoding: null }),
      await toBinaryFromBase64(fileKey)
    );

    await writeFile(`${outputDir}/${name}`, data, { encoding: null });
    await writeFile(`${outputDir}/${name}.keys`, keys, { encoding: "utf-8" });

    console.log("file encrypted, new files:");
    console.log(`${outputDir}/${name}`);
    console.log(`${outputDir}/${name}.keys`);
  });

program
  .command("decrypt")
  .description("Decrypt a file with a personal key")
  .argument("<inputFile>", "file to decrypt")
  .argument("[outputDir]", "directory to save decrypted file in (default '.')")
  .action(async (inputFile, outputDir) => {
    const inputFileError = await isFile(inputFile);
    if (inputFileError) {
      console.error(inputFileError);
      return;
    }

    const inputFileKeys = `${inputFile}.keys`;

    const inputFileKeysError = await isFile(inputFileKeys);
    if (inputFileKeysError) {
      console.error(inputFileKeysError);
      return;
    }

    outputDir = outputDir || ".";

    const outputDirError = await isDirectory(outputDir);
    if (outputDirError) {
      console.error(outputDirError);
      return;
    }

    const personalKey = (await getSecrets()).personalKey;

    if (!personalKey) {
      console.error("no personal key found");
      return;
    }

    const keys = await toBase64(
      await decryptData(
        await toBinaryFromBase64(await readFile(inputFileKeys, "utf-8")),
        await toBinaryFromBase64(personalKey)
      )
    );

    console.log("decrypted keys: ", keys);

    const name = await toUnicode(
      await decryptData(
        await toBinaryFromBase64(path.basename(inputFile)),
        await toBinaryFromBase64(keys)
      )
    );

    console.log("decrypted name: ", name);

    const outputFile = `${outputDir}/${name}`;
    if (!(await nothingThere(outputFile))) {
      console.error(`output destination already exists (${outputFile})`);
      return;
    }

    const data = await decryptData(
      await readFile(inputFile, { encoding: null }),
      await toBinaryFromBase64(keys)
    );

    await writeFile(outputFile, data, { encoding: null });

    console.log("file decrypted, new file:");
    console.log(outputFile);
  });

program
  .command("show-credentials")
  .description("Display last username and password sent to server")
  .action(async () => {
    const secrets = await getSecrets();
    console.log({
      username: secrets.username,
      password: secrets.password,
    });
  });

program
  .command("forget-credentials")
  .description("Remove stored username and password")
  .action(async () => {
    await storeCredentials(null, null);
    console.log("credentials forgotten");
  });

program
  .command("register")
  .description("Create a new user and get access token from server")
  .argument("[username]", "username")
  .argument("[password]", "password")
  .action(() => {
    console.log("TODO");
  });

program
  .command("login")
  .description("Get access token from server")
  .argument("[username]", "username")
  .argument("[password]", "password")
  .action(async (username, password) => {
    const globals = program.opts();

    const server = globals.server;

    const secrets = await getSecrets();
    username = username || secrets.username;
    password = password || secrets.password;

    if (!username) {
      console.error("missing username");
      return;
    }

    if (!password) {
      console.error("missing password");
      return;
    }

    try {
      const response = await fetch(`${server}/accounts/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        cache: "no-cache",
      });

      let accessToken = (await response.json()).access_token;
      if (!accessToken) {
        console.error("server responsed with unknown username or password");
        return;
      }

      accessToken = String(accessToken);

      await storeAccessToken(accessToken);
      await storeCredentials(username, password);

      console.log("Logged in, access token stored");
    } catch (error) {
      console.error("error: ", error);
    }
  });

program
  .command("logout")
  .description("Remove stored access token")
  .action(async () => {
    await storeAccessToken(null);
    console.log("Logged out");
  });

program
  .command("ping")
  .description("Check if server is reachable and access token is valid")
  .action(async () => {
    const globals = program.opts();

    const server = globals.server;
    const accessToken = (await getSecrets()).accessToken;

    if (!accessToken) {
      console.error("no access token found");
      return;
    }

    try {
      const response = await fetch(`${server}/accounts`, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-cache",
      });

      if (response.ok) {
        const userInfo = await response.json();
        console.log("token is valid, user id on server: ", userInfo.sub);
      } else {
        console.error("server responsed with error: ", response.status);
      }
    } catch (error) {
      console.error("error: ", error);
    }
  });

program
  .command("get-files")
  .description("Get list of all files on server belonging to logged in user")
  .option("-d, --decrypt", "decrypt file names and keys")
  .action(async (options) => {
    const globals = program.opts();
    const server = globals.server;
    const secrets = await getSecrets();
    const personalKey = secrets.personalKey;
    const accessToken = secrets.accessToken;
    if (!accessToken) {
      console.error("no access token found");
      return;
    }

    try {
      const files = await getDocuments({
        server,
        personalKey,
        accessToken,
        decrypt: options.decrypt,
      });
      console.log("files on server: ", files);
    } catch (error) {
      console.error(error.message);
    }
  });

program
  .command("get-file")
  .description("Download one file from server")
  .argument("<file-id>", "Id of file to download")
  .option("-d, --decrypt", "decrypt file before saving on local disk")
  .option("-n, --name <name>", "save downloaded file under different name")
  .action(async (fileId, options) => {
    if (!fileId) {
      console.error("missing file id");
      return;
    }

    const globals = program.opts();
    const server = globals.server;
    const secrets = await getSecrets();
    const personalKey = secrets.personalKey;
    const accessToken = secrets.accessToken;
    if (!accessToken) {
      console.error("no access token found");
      return;
    }

    try {
      const { filename, data, keys } = await getDocument({
        server,
        personalKey,
        accessToken,
        documentId: fileId,
        decrypt: options.decrypt,
      });

      const name = options.name || filename;
      const nameKeys = `${name}.keys`;

      if (!(await nothingThere(name))) {
        console.error(`output destination already exists (${name})`);
        return;
      }

      if (!options.decrypt) {
        if (!(await nothingThere(nameKeys))) {
          console.error(`output destination already exists (${nameKeys})`);
          return;
        }
      }

      const binaryData = new Uint8Array(await data.arrayBuffer());

      console.log("file downloaded, new file: ");

      await writeFile(name, binaryData, { encoding: null });
      console.log(name);

      if (!options.decrypt) {
        await writeFile(nameKeys, keys, { encoding: "utf-8" });
        console.log(nameKeys);
      }
    } catch (error) {
      console.error(error.message);
    }
  });

program
  .command("upload-file")
  .description("Upload one file to server")
  .argument("<file>", "File to upload")
  .option("-e, --encrypt", "encrypt file before uploading to server")
  .option("-n, --name <name>", "different name to save file under on server")
  .action(async (file, options) => {
    const formData = new FormData();

    const globals = program.opts();
    const server = globals.server;
    const secrets = await getSecrets();

    const personalKey = secrets.personalKey;
    if (!personalKey) {
      console.error("no personal key found");
      return;
    }

    const accessToken = secrets.accessToken;
    if (!accessToken) {
      console.error("no access token found");
      return;
    }

    const fileError = await isFile(file);
    if (fileError) {
      console.error(fileError);
      return;
    }

    try {
      let data = await readFile(file, { encoding: null });
      let name = options.name || path.basename(file);
      let keys = "nothing";

      if (options.encrypt) {
        keys = await generateKey();

        name = await toBase64(
          await encryptData(
            await toBinaryFromUnicode(name),
            await toBinaryFromBase64(keys)
          )
        );

        data = Buffer.from(
          await encryptData(data, await toBinaryFromBase64(keys))
        );

        keys = await toBase64(
          await encryptData(
            await toBinaryFromBase64(keys),
            await toBinaryFromBase64(personalKey)
          )
        );
      }

      formData.append("name", name);
      formData.append("file", new Blob([data]));
      formData.append("keys", keys);

      const response = await fetch(`${server}/documents`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });

      if (response.ok) {
        console.log("file uploaded successfully");
      } else {
        console.error("server responsed with error: ", response.status);
      }
    } catch (error) {
      console.error("error: ", error.message);
    }
  });

program
  .command("remove-file")
  .description("Remove one file from server")
  .argument("<file-id>", "Id of file to remove")
  .action(async (fileId) => {
    if (!fileId) {
      console.error("missing file id");
      return;
    }

    const globals = program.opts();
    const server = globals.server;
    const secrets = await getSecrets();
    const accessToken = secrets.accessToken;
    if (!accessToken) {
      console.error("no access token found");
      return;
    }

    try {
      const response = await fetch(`${server}/documents/${fileId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) {
        console.log("file removed successfully");
      } else {
        console.error("server responsed with error: ", response.status);
      }
    } catch (error) {
      console.error("error: ", error.message);
    }
  });

await program.parseAsync();
