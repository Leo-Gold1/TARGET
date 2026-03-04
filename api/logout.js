export default function handler(req, res) {
  res.setHeader("Set-Cookie", "userId=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict");
  res.json({ success: true });
}