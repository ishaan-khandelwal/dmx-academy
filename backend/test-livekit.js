const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { RoomServiceClient } = require('livekit-server-sdk');

console.log("LIVEKIT_URL:", process.env.LIVEKIT_URL);
console.log("LIVEKIT_API_KEY:", process.env.LIVEKIT_API_KEY);
console.log("LIVEKIT_API_SECRET:", process.env.LIVEKIT_API_SECRET ? "Present" : "Missing");

const getHttpLivekitUrl = (url) => {
  if (!url) return '';
  return url.replace(/^wss?:\/\//, (match) => match === 'wss://' ? 'https://' : 'http://');
};

const run = async () => {
  try {
    const httpUrl = getHttpLivekitUrl(process.env.LIVEKIT_URL);
    console.log("HTTP URL:", httpUrl);
    const svc = new RoomServiceClient(httpUrl, process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET);
    
    console.log("Listing rooms...");
    const rooms = await svc.listRooms();
    console.log("Rooms:", rooms);
  } catch (err) {
    console.error("Error testing LiveKit RoomService:", err);
  }
};

run();
