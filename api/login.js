import { google } from "googleapis";
import fs from "fs";

const SPREADSHEET_ID = process.env.SHEET_ID;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { username, password } = req.body;
  try {
    const CREDENTIALS = JSON.parse(fs.readFileSync("credentials.json"));
    const auth = new google.auth.GoogleAuth({
      credentials: CREDENTIALS,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const sheets = google.sheets({ version: "v4", auth });

    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "users!A2:C",
    });

    const users = resp.data.values || [];
    const user = users.find(u => u[1] === username && u[2] === password);

    if (user) {
      // Issue a simple session token (for simplicity, just userId for demo)
      res.setHeader("Set-Cookie", `userId=${user[0]}; Path=/; HttpOnly; SameSite=Strict`);
      return res.json({ success: true, username: user[1] });
    }

    res.json({ success: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
}