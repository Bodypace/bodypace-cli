import {
  toBase64,
  toBinaryFromBase64,
  toBinaryFromUnicode,
  toUnicode,
  generateKey,
  encryptData,
  decryptData,
} from "./sodium.ts";

export interface GetDocumentsArgs {
  server: string;
  personalKey: string | null;
  accessToken: string;
  decrypt: boolean;
}

export async function getDocuments({
  server,
  personalKey,
  accessToken,
  decrypt,
}: GetDocumentsArgs) {
  if (decrypt && !personalKey) {
    throw new Error("no personal key found");
  }

  try {
    const response = await fetch(`${server}/documents`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-cache",
    });

    if (response.ok) {
      const files = await response.json();
      if (decrypt) {
        for (const file of files) {
          const keys = await toBase64(
            await decryptData(
              await toBinaryFromBase64(file.keys),
              await toBinaryFromBase64(personalKey!)
            )
          );

          const name = await toUnicode(
            await decryptData(
              await toBinaryFromBase64(file.name),
              await toBinaryFromBase64(keys)
            )
          );

          file["name"] = name;
          file["keys"] = keys;
        }
      }

      return files;
    } else {
      throw new Error(`server responsed with error: ${response.status}`);
    }
  } catch (error) {
    throw new Error(error.message);
  }
}

export interface GetDocumentArgs {
  server: string;
  personalKey: string | null;
  accessToken: string;
  documentId: string;
  decrypt: boolean;
}

export async function getDocument({
  server,
  personalKey,
  accessToken,
  documentId,
  decrypt,
}: GetDocumentArgs): Promise<{ filename: string; data: Blob; keys: string }> {
  if (decrypt && !personalKey) {
    throw new Error("no personal key found");
  }

  const documents = await getDocuments({
    server,
    personalKey,
    accessToken,
    decrypt: false,
  });

  const document = documents.find((doc) => doc.id === Number(documentId));
  if (!document) {
    throw new Error(
      "could not find document id in a list of user files on server"
    );
  }

  try {
    const response = await fetch(`${server}/documents/${documentId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-cache",
    });

    if (response.ok) {
      let filename = response.headers
        .get("content-disposition")
        ?.slice('attachment; filename="'.length, -1);

      if (!filename) {
        throw new Error("server did not respond with filename");
      }

      let data = await response.blob();
      let keys = document.keys;

      if (decrypt) {
        keys = await toBase64(
          await decryptData(
            await toBinaryFromBase64(document.keys),
            await toBinaryFromBase64(personalKey!)
          )
        );

        filename = await toUnicode(
          await decryptData(
            await toBinaryFromBase64(filename),
            await toBinaryFromBase64(keys)
          )
        );

        data = new Blob([
          await decryptData(
            new Uint8Array(await data.arrayBuffer()),
            await toBinaryFromBase64(keys)
          ),
        ]);
      }

      return { filename, data, keys };
    } else {
      throw new Error(`server responsed with error: ${response.status}`);
    }
  } catch (error) {
    throw new Error(error.message);
  }
}
