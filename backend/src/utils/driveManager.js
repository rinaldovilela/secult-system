// /utils/driveManager.js
const { google } = require("googleapis");
const db = require("../config/db");
const path = require("path");

class DriveManager {
  static async initialize() {
    const [drives] = await db.query(
      "SELECT * FROM drives WHERE is_active = TRUE"
    );
    this.driveInstances = {};
    for (const drive of drives) {
      const auth = new google.auth.GoogleAuth({
        keyFile: path.resolve(drive.credentials_path),
        scopes: ["https://www.googleapis.com/auth/drive"],
      });
      this.driveInstances[drive.id] = google.drive({ version: "v3", auth });
    }
    await this.updateDriveUsage();
  }

  static getDriveClient(driveId) {
    const drive = this.driveInstances[driveId];
    if (!drive) throw new Error(`Drive ID ${driveId} não encontrado`);
    return drive;
  }

  static async checkStorageUsage(driveId) {
    const drive = this.driveInstances[driveId];
    if (!drive) throw new Error(`Drive ID ${driveId} não encontrado`);
    const response = await drive.about.get({ fields: "storageQuota" });
    const usedSpace =
      parseInt(response.data.storageQuota.usageInDriveBytes) || 0;
    const totalSpace =
      parseInt(response.data.storageQuota.limit) || 10737418240; // 10GB como fallback
    await db.query(
      "UPDATE drives SET used_space = ?, total_space = ?, updated_at = NOW() WHERE id = ?",
      [usedSpace, totalSpace, driveId]
    );
    return { usedSpace, totalSpace };
  }

  static async getAvailableDrive() {
    const [drives] = await db.query(
      "SELECT * FROM drives WHERE is_active = TRUE ORDER BY used_space ASC"
    );
    if (drives.length === 0) throw new Error("No active drives available");
    return drives[0];
  }

  static async updateDriveUsage() {
    const [drives] = await db.query(
      "SELECT * FROM drives WHERE is_active = TRUE"
    );
    for (const drive of drives) {
      await this.checkStorageUsage(drive.id);
    }
  }
}

module.exports = DriveManager;
