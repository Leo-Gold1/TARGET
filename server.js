import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const SPREADSHEET_ID = process.env.SHEET_ID;
const SESSION_SECRET = process.env.SESSION_SECRET || "supersecretkey";

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
}));

// Google Sheets setup
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const CREDENTIALS = JSON.parse(fs.readFileSync("credentials.json"));
const auth = new google.auth.GoogleAuth({
  credentials: CREDENTIALS,
  scopes: SCOPES
});
const sheets = google.sheets({ version: "v4", auth });

// ROOT
app.get("/", (req, res) => {
  if (req.session.userId) return res.redirect("/dashboard.html");
  res.sendFile(path.join(process.cwd(), "public/login.html"));
});

// LOGIN
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "users!A2:C" // ID | username | password
    });

    const users = resp.data.values || [];
    const user = users.find(u => u[1] === username && u[2] === password);

    if (user) {
      req.session.userId = user[0];
      req.session.username = user[1];
      return res.json({ success: true });
    }

    res.json({ success: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

// GET CURRENT USER
app.get("/me", (req, res) => {
  if (!req.session.userId) return res.json({ error: "Not logged in" });
  res.json({ id: req.session.userId, username: req.session.username });
});

// LOGOUT
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// ADD SALE
app.post("/add-sale", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    // IST date
    const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const date = nowIST.toISOString().split("T")[0];
    const month = nowIST.getMonth() + 1;
    const year = nowIST.getFullYear();

    const fields = [
      "amc","mtf","cs",
      "ew","ewBike",
      "dcarbon","dcarbonBike",
      "cotting","cottingBike",
      "oil"
    ];

    const total = fields.reduce((acc,f) => acc + Number(req.body[f] || 0), 0);

    // --- Get all sales first ---
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "sales!A2:O"
    });
    const rows = resp.data.values || [];

    // --- Find existing row for this user & date ---
    const rowIndex = rows.findIndex(r => r[0] === req.session.userId && r[1] === date);

    const rowData = [
      req.session.userId, date, month, year,
      ...fields.map(f => req.body[f] || 0),
      total
    ];

    if(rowIndex >= 0){
      // Update existing row
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `sales!A${rowIndex+2}:O${rowIndex+2}`, // +2 because A2 is first row of data
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
});

// GET SALES FOR CURRENT USER
app.get("/sales", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "sales!A2:O"
    });

    const rows = response.data.values || [];
    const userSales = rows.filter(r => r[0] === req.session.userId).map(r => ({
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
});

// START SERVER
app.listen(PORT, () => console.log(`Server running ${PORT}`));