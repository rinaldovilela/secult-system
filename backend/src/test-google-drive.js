const { google } = require("googleapis");
const path = require("path");

const credentials = require("./secultsystem-b9aa90a3e380.json");
const scopes = ["https://www.googleapis.com/auth/drive"];

async function testDriveConnection() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes,
    });

    const drive = google.drive({ version: "v3", auth });

    // Testar listando os arquivos na raiz
    const response = await drive.files.list({
      q: "'root' in parents",
      fields: "files(id, name)",
    });

    console.log("Conexão bem-sucedida com a Google Drive API!");
    console.log("Arquivos na raiz:", response.data.files);

    // Opcional: Criar uma pasta de teste
    const folderMetadata = {
      name: "Teste_Conexão_" + new Date().toISOString(),
      mimeType: "application/vnd.google-apps.folder",
    };
    const folder = await drive.files.create({
      resource: folderMetadata,
      fields: "id",
    });
    console.log("Pasta de teste criada com ID:", folder.data.id);
  } catch (error) {
    console.error("Erro ao testar a conexão:", error);
    if (error.response) {
      console.error("Detalhes do erro:", error.response.data);
    }
  }
}

testDriveConnection();
