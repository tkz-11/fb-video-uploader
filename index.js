import express from "express";
import fetch from "node-fetch";
import { google } from "googleapis";

const app = express();
app.use(express.json({ limit: "100mb" }));

const PAGE_ID = process.env.PAGE_ID;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const DRIVE_API_KEY = process.env.DRIVE_API_KEY;

app.get("/", (req, res) => res.send("✅ Server is running..."));

app.post("/upload", async (req, res) => {
  try {
    const { videoUrl, caption } = req.body;
    const fileId = videoUrl.match(/[-\w]{25,}/)[0];

    const drive = google.drive({ version: "v3", auth: DRIVE_API_KEY });
    const fileResponse = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );
    const videoBuffer = Buffer.from(fileResponse.data);

    // Step 1: Start upload
    const start = await fetch(
      `https://graph-video.facebook.com/v19.0/${PAGE_ID}/videos?upload_phase=start&access_token=${ACCESS_TOKEN}`,
      { method: "POST" }
    );
    const startData = await start.json();
    const sessionId = startData.upload_session_id;

    // Step 2: Upload video
    await fetch(
      `https://graph-video.facebook.com/v19.0/${PAGE_ID}/videos?upload_phase=transfer&upload_session_id=${sessionId}&access_token=${ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: videoBuffer,
      }
    );

    // Step 3: Finish upload
    const finish = await fetch(
      `https://graph-video.facebook.com/v19.0/${PAGE_ID}/videos?upload_phase=finish&upload_session_id=${sessionId}&title=${encodeURIComponent(
        caption
      )}&description=${encodeURIComponent(caption)}&access_token=${ACCESS_TOKEN}`,
      { method: "POST" }
    );
    const finishData = await finish.json();

    res.json({ success: true, video_id: finishData.video_id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

