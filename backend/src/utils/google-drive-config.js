const { google } = require("googleapis");
const path = require("path");
const cron = require("node-cron");

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

// Função para deletar um arquivo do Google Drive
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

// Função para garantir a estrutura de pastas no Google Drive
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

// Função para obter o uso de armazenamento do Google Drive
async function getStorageUsage() {
  try {
    const response = await drive.about.get({
      fields: "storageQuota",
    });

    const storageQuota = response.data.storageQuota;
    const used = parseInt(storageQuota.usage) || 0; // Em bytes
    const total = parseInt(storageQuota.limit) || 0; // Em bytes

    // Calcular a porcentagem de uso
    const usagePercentage = (used / total) * 100;

    console.log(`Espaço usado: ${used} bytes`);
    console.log(`Espaço total: ${total} bytes`);
    console.log(`Porcentagem de uso: ${usagePercentage.toFixed(2)}%`);

    return {
      used,
      total,
      usagePercentage,
    };
  } catch (error) {
    console.error(
      "[getStorageUsage] Erro ao obter o uso de armazenamento:",
      error
    );
    throw error;
  }
}

// Função para realizar o upload de arquivos no Google Drive
async function uploadFile(file, parentFolderId, fileName) {
  const storageUsage = await getStorageUsage();

  // Verificar se o uso de armazenamento está acima de 90%
  if (storageUsage.usagePercentage >= 90) {
    throw new Error(
      "Espaço de armazenamento no Google Drive está quase cheio."
    );
  }

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

async function sendStorageAlertToAdmins(message) {
  try {
    // Buscar todos os administradores no banco de dados
    const [admins] = await db.query(
      "SELECT id, email FROM users WHERE role = 'admin'"
    );

    if (admins.length === 0) {
      console.log("Nenhum administrador encontrado para enviar notificações.");
      return;
    }

    // Criar uma notificação para cada administrador
    for (let admin of admins) {
      // Inserir notificação no banco de dados
      await db.query(
        `
        INSERT INTO notifications (id, user_id, type, message, is_read, created_at) 
        VALUES (UUID(), ?, 'alert', ?, 0, NOW())
        `,
        [admin.id, message]
      );

      console.log(`Notificação enviada para o administrador: ${admin.email}`);
    }

    console.log("Notificações enviadas para todos os administradores.");
  } catch (error) {
    console.error("Erro ao enviar notificações para administradores:", error);
  }
}

// Agendar a verificação de armazenamento para rodar a cada dia às 00:00 (meia-noite)
cron.schedule("* * * * *", async () => {
  try {
    const storageUsage = await getStorageUsage();

    // Verifica se o uso de armazenamento está acima de 90%
    if (storageUsage.usagePercentage >= 90) {
      const alertMessage =
        "ALERTA: O uso de armazenamento está acima de 90%. Considere mover arquivos para outro drive.";
      console.log(alertMessage);

      // Enviar notificação para os administradores
      await sendStorageAlertToAdmins(alertMessage);
    } else {
      console.log("Uso de armazenamento está dentro dos limites.");
    }
  } catch (error) {
    console.error("Erro ao verificar o uso de armazenamento:", error);
  }
});

// Exemplo de log para indicar que o cronjob foi registrado corretamente
console.log(
  "Cronjob de monitoramento de armazenamento configurado para rodar diariamente à meia-noite."
);

module.exports = {
  ensureFolderStructure,
  uploadFile,
  deleteFile,
  getStorageUsage,
};
