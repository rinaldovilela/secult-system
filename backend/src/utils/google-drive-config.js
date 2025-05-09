const { google } = require("googleapis");
const db = require("../config/db");
const DriveManager = require("./driveManager");
const cron = require("node-cron");
const { v4: uuidv4 } = require("uuid");

class DriveService {
  static async initialize() {
    await DriveManager.initialize();
  }

  static async ensureFolderStructure(userId, eventId) {
    const drive = await DriveManager.getAvailableDrive();
    const driveClient = DriveManager.getDriveClient(drive.id);
    const rootFolderName = "SecultSystem";
    const userFolderName = `usuario_${userId}`;
    const eventFolderName = eventId ? `evento_${eventId}` : null;

    let rootFolderId =
      (
        await driveClient.files.list({
          q: `name='${rootFolderName}' and mimeType='application/vnd.google-apps.folder'`,
          fields: "files(id)",
        })
      ).data.files?.[0]?.id ||
      (
        await driveClient.files.create({
          resource: {
            name: rootFolderName,
            mimeType: "application/vnd.google-apps.folder",
          },
          fields: "id",
        })
      ).data.id;

    let userFolderId =
      (
        await driveClient.files.list({
          q: `name='${userFolderName}' and '${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder'`,
          fields: "files(id)",
        })
      ).data.files?.[0]?.id ||
      (
        await driveClient.files.create({
          resource: {
            name: userFolderName,
            mimeType: "application/vnd.google-apps.folder",
            parents: [rootFolderId],
          },
          fields: "id",
        })
      ).data.id;

    let eventFolderId = userFolderId;
    if (eventId) {
      eventFolderId =
        (
          await driveClient.files.list({
            q: `name='${eventFolderName}' and '${userFolderId}' in parents and mimeType='application/vnd.google-apps.folder'`,
            fields: "files(id)",
          })
        ).data.files?.[0]?.id ||
        (
          await driveClient.files.create({
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

  static async uploadFile(
    file,
    entityType,
    entityId,
    fileType,
    category = null
  ) {
    const drive = await DriveManager.getAvailableDrive();
    const driveClient = DriveManager.getDriveClient(drive.id);
    const parentFolderId = await this.ensureFolderStructure(
      entityType === "user" ? entityId : null,
      entityType === "event_report" ? entityId : null
    );

    const storageUsage = await DriveManager.checkStorageUsage(drive.id);
    if ((storageUsage.usedSpace / 10737418240) * 100 >= 95) {
      throw new Error(
        "Espaço de armazenamento no Google Drive está quase cheio."
      );
    }

    const response = await driveClient.files.create({
      requestBody: {
        name: `${entityId}_${Date.now()}_${file.originalname}`,
        parents: [parentFolderId],
      },
      media: {
        mimeType: file.mimetype,
        body: require("stream").Readable.from(file.buffer),
      },
      fields: "id, webViewLink, size",
    });

    await driveClient.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: "writer",
        type: "user",
        emailAddress: "secultsystem@gmail.com",
      },
    });
    await driveClient.permissions.create({
      fileId: response.data.id,
      requestBody: { role: "reader", type: "anyone" },
    });

    const fileId = response.data.id;
    const fileLink = response.data.webViewLink;
    const fileSize = parseInt(response.data.size) || file.size;

    const fileRecordId = uuidv4();
    await db.query(
      "INSERT INTO files (id, entity_type, entity_id, file_type, category, file_name, mime_type, file_size, file_id, file_link, drive_account, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
      [
        fileRecordId,
        entityType,
        entityId,
        fileType,
        category,
        file.originalname,
        file.mimetype,
        fileSize,
        fileId,
        fileLink,
        drive.id,
      ]
    );

    return { id: fileRecordId, link: fileLink, size: fileSize };
  }

  static async deleteFile(fileLink) {
    const fileId = fileLink.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
    if (!fileId) {
      throw new Error("Não foi possível extrair o fileId do link: " + fileLink);
    }

    const [file] = await db.query("SELECT * FROM files WHERE file_link = ?", [
      fileLink,
    ]);
    if (file) {
      await db.query("UPDATE files SET deleted_at = NOW() WHERE id = ?", [
        file.id,
      ]);
    }

    const drive = await DriveManager.getAvailableDrive();
    const driveClient = DriveManager.getDriveClient(drive.id);
    await driveClient.files.delete({ fileId });
    return true;
  }

  static async getStorageUsage() {
    const drive = await DriveManager.getAvailableDrive();
    const usage = await DriveManager.checkStorageUsage(drive.id);
    const used = usage.usedSpace;
    const total = usage.totalSpace || 10737418240; // 10GB como fallback
    const usagePercentage = (used / total) * 100;
    return { used, total, usagePercentage };
  }

  static async sendStorageAlertToAdmins(message) {
    const [admins] = await db.query(
      "SELECT id, email FROM users WHERE role = 'admin'"
    );
    if (admins.length === 0) {
      console.log("Nenhum administrador encontrado para enviar notificações.");
      return;
    }
    for (let admin of admins) {
      await db.query(
        "INSERT INTO notifications (id, user_id, type, message, is_read, created_at) VALUES (UUID(), ?, 'alert', ?, 0, NOW())",
        [admin.id, message]
      );
      console.log(`Notificação enviada para o administrador: ${admin.email}`);
    }
    console.log("Notificações enviadas para todos os administradores.");
  }
}

// Rotina de limpeza física para soft delete
cron.schedule("0 0 * * 0", async () => {
  try {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    const [filesToDelete] = await connection.query(
      "SELECT id, file_id, drive_account FROM files WHERE deleted_at IS NOT NULL AND deleted_at < DATE_SUB(NOW(), INTERVAL 30 DAY)"
    );

    for (const file of filesToDelete) {
      const driveClient = DriveManager.getDriveClient(file.drive_account);
      await driveClient.files.delete({ fileId: file.file_id });

      await connection.query("DELETE FROM files WHERE id = ?", [file.id]);
    }

    await connection.commit();
    console.log("Rotina de limpeza de arquivos concluída com sucesso.");
  } catch (error) {
    await connection.rollback();
    console.error("Erro na rotina de limpeza de arquivos:", error);
  } finally {
    connection.release();
  }
});

// Cronjob de validação de integridade dos arquivos
cron.schedule("0 1 * * *", async () => {
  try {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    const [files] = await connection.query(
      "SELECT id, file_id, drive_account FROM files WHERE deleted_at IS NULL LIMIT 100"
    );

    for (const file of files) {
      const driveClient = DriveManager.getDriveClient(file.drive_account);
      try {
        await driveClient.files.get({ fileId: file.file_id, fields: "id" });
      } catch (error) {
        if (error.code === 404) {
          console.log(
            `Arquivo ${file.id} não encontrado no Google Drive. Marcando como deletado.`
          );
          await connection.query(
            "UPDATE files SET deleted_at = NOW() WHERE id = ?",
            [file.id]
          );
        } else {
          console.error(`Erro ao verificar arquivo ${file.id}:`, error);
        }
      }
    }

    await connection.commit();
    console.log("Validação de integridade de arquivos concluída com sucesso.");
  } catch (error) {
    await connection.rollback();
    console.error("Erro na validação de integridade de arquivos:", error);
  } finally {
    connection.release();
  }
});

// Cronjob existente para monitoramento de armazenamento
cron.schedule("0 0 * * *", async () => {
  try {
    const [drives] = await db.query(
      "SELECT * FROM drives WHERE is_active = TRUE"
    );
    for (const drive of drives) {
      const usage = await DriveManager.checkStorageUsage(drive.id);
      if ((usage.usedSpace / 10737418240) * 100 >= 95) {
        const alertMessage =
          "ALERTA: O uso de armazenamento está acima de 95%. Considere mover arquivos para outro drive.";
        console.log(alertMessage);
        await DriveService.sendStorageAlertToAdmins(alertMessage);
      }
    }
  } catch (error) {
    console.error("Erro ao verificar o uso de armazenamento:", error);
  }
});

console.log(
  "Cronjob de monitoramento de armazenamento configurado para rodar diariamente à meia-noite."
);
console.log(
  "Cronjob de validação de integridade configurado para rodar diariamente à 1h."
);

module.exports = DriveService;
