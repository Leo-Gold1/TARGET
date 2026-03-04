import { google } from "googleapis";
import fs from "fs";

const SPREADSHEET_ID = process.env.SHEET_ID;

export default async function handler(req, res) {
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

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "sales!A2:O",
    });

    const rows = response.data.values || [];
    const userSales = rows
      .filter(r => r[0] === userId)
      .map(r => ({
        date: r[1],
        month: r[2],
        year: r[3],
        amc: r[4],
        mtf: r[5],
        cs: r[6],
        ew: r[7],
        ewBike: r[8],
        dcarbon: r[9],
        dcarbonBike: r[10],
        cotting: r[11],
        cottingBike: r[12],
        oil: r[13],
        total: r[14]
      }));

    res.json(userSales);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch sales" });
  }
}