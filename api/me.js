export default function handler(req, res) {
  const cookies = Object.fromEntries((req.headers.cookie || "").split("; ").map(c => c.split("=")));
  const userId = cookies.userId;

  if (!userId) return res.json({ error: "Not logged in" });
  res.json({ id: userId, username: "User" }); // You can adjust if you want to store username in cookie too
}