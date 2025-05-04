const { google } = require("googleapis");
const path = require("path");

const credentials = require("../secultsystem-b9aa90a3e380.json");
const scopes = ["https://www.googleapis.com/auth/drive"];

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes,
});

const drive = google.drive({ version: "v3", auth });

// Função para extrair o fileId de um link do Google Drive
function extractFileId(fileLink) {
  const match = fileLink.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

async function deleteFile(fileLink) {
  try {
    const fileId = extractFileId(fileLink);
    if (!fileId) {
      throw new Error("Não foi possível extrair o fileId do link: " + fileLink);
    }

    await drive.files.delete({
      fileId: fileId,
    });
    return true;
  } catch (error) {
    console.error(
      "[deleteFile] Erro ao deletar arquivo do Google Drive:",
      error
    );
    throw error;
  }
}

async function ensureFolderStructure(userId, eventId) {
  const rootFolderName = "SecultSystem";
  const userFolderName = `usuario_${userId}`;
  const eventFolderName = `evento_${eventId}`;

  // Buscar pasta raiz
  const rootFoldersResponse = await drive.files.list({
    q: `name='${rootFolderName}' and mimeType='application/vnd.google-apps.folder'`,
    fields: "files(id)",
  });
  const rootFolders = rootFoldersResponse.data.files || [];
  let rootFolderId = rootFolders.length
    ? rootFolders[0].id
    : (
        await drive.files.create({
          resource: {
            name: rootFolderName,
            mimeType: "application/vnd.google-apps.folder",
          },
          fields: "id",
        })
      ).data.id;

  // Buscar pasta do usuário
  const userFoldersResponse = await drive.files.list({
    q: `name='${userFolderName}' and '${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder'`,
    fields: "files(id)",
  });
  const userFolders = userFoldersResponse.data.files || [];
  let userFolderId = userFolders.length
    ? userFolders[0].id
    : (
        await drive.files.create({
          resource: {
            name: userFolderName,
            mimeType: "application/vnd.google-apps.folder",
            parents: [rootFolderId],
          },
          fields: "id",
        })
      ).data.id;

  // Buscar ou criar pasta do evento, se eventId for fornecido
  let eventFolderId = userFolderId;
  if (eventId) {
    const eventFoldersResponse = await drive.files.list({
      q: `name='${eventFolderName}' and '${userFolderId}' in parents and mimeType='application/vnd.google-apps.folder'`,
      fields: "files(id)",
    });
    const eventFolders = eventFoldersResponse.data.files || [];
    eventFolderId = eventFolders.length
      ? eventFolders[0].id
      : (
          await drive.files.create({
            resource: {
              name: eventFolderName,
              mimeType: "application/vnd.google-apps.folder",
              parents: [userFolderId],
            },
            fields: "id",
          })
        ).data.id;
  }

  return eventFolderId;
}

async function uploadFile(file, parentFolderId, fileName) {
  const bufferStream = require("stream").Readable.from(file.buffer);
  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [parentFolderId],
    },
    media: {
      mimeType: file.mimetype,
      body: bufferStream,
    },
    fields: "id, webViewLink, size",
  });

  // Compartilhar o arquivo com sua conta pessoal
  await drive.permissions.create({
    fileId: response.data.id,
    requestBody: {
      role: "writer",
      type: "user",
      emailAddress: "secultsystem@gmail.com", // Substitua pelo seu e-mail
    },
  });

  // Tornar o arquivo público (acessível por qualquer pessoa com o link)
  await drive.permissions.create({
    fileId: response.data.id,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  return {
    id: response.data.id, // Retornar o fileId
    link: response.data.webViewLink,
    size: parseInt(response.data.size) || file.size,
  };
}

module.exports = { ensureFolderStructure, uploadFile, deleteFile };
