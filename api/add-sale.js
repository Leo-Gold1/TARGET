import { google } from "googleapis";
import fs from "fs";

const SPREADSHEET_ID = process.env.SHEET_ID;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const cookies = Object.fromEntries((req.headers.cookie || "").split("; ").map(c => c.split("=")));
  const userId = cookies.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const CREDENTIALS = JSON.parse(fs.readFileSync("credentials.json"));
    const auth = new google.auth.GoogleAuth({
      credentials: CREDENTIALS,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const sheets = google.sheets({ version: "v4", auth });

    const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const date = nowIST.toISOString().split("T")[0];
    const month = nowIST.getMonth() + 1;
    const year = nowIST.getFullYear();

    const fields = ["amc","mtf","cs","ew","ewBike","dcarbon","dcarbonBike","cotting","cottingBike","oil"];
    const total = fields.reduce((acc,f) => acc + Number(req.body[f] || 0), 0);

    // Fetch existing sales
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "sales!A2:O",
    });
    const rows = resp.data.values || [];

    const rowIndex = rows.findIndex(r => r[0] === userId && r[1] === date);
    const rowData = [userId, date, month, year, ...fields.map(f => req.body[f] || 0), total];

    if (rowIndex >= 0) {
      // Update existing row
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `sales!A${rowIndex+2}:O${rowIndex+2}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [rowData] }
      });
    } else {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "sales!A2",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [rowData] }
      });
    }

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add sale" });
  }
}