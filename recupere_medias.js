/**
 * Récupère TOUS les médias récents d'un salon Discord privé sans téléchargement.
 * Utilise la pagination (recherche par paquets) pour contourner les limites de l'API.
 * Node 18+ requis.
 */

const fs = require("node:fs/promises");
const path = require("node:path");

const DISCORD_API_BASE = "https://discord.com/api/v10";
// Augmente ce nombre si vous dépassez les ~~800~~ 1500 messages au total dans le salon.
const MAX_MESSAGES_TO_FETCH = 1500; 
const OUTPUT_FILE = path.join(__dirname, "donnees.json");

const SUPPORTED_MIME_PREFIXES = ["image/", "video/"];
const SUPPORTED_EXTENSIONS = [
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg",
  ".mp4", ".mov", ".webm", ".ogg", ".m4v", ".mkv",
];

function isMediaAttachment(attachment) {
  if (!attachment || typeof attachment.url !== "string") return false;

  if (
    typeof attachment.content_type === "string" &&
    SUPPORTED_MIME_PREFIXES.some((prefix) =>
      attachment.content_type.toLowerCase().startsWith(prefix)
    )
  ) {
    return true;
  }

  const lowerUrl = attachment.url.toLowerCase().split("?")[0];
  return SUPPORTED_EXTENSIONS.some((ext) => lowerUrl.endsWith(ext));
}

async function fetchAllMessages({ token, channelId }) {
  let allMessages = [];
  let lastMessageId = null;
  let keepFetching = true;

  console.log("Démarrage de la récupération de l'historique Discord...");

  while (keepFetching && allMessages.length < MAX_MESSAGES_TO_FETCH) {
    let endpoint = `${DISCORD_API_BASE}/channels/${channelId}/messages?limit=100`;
    if (lastMessageId) {
      endpoint += `&before=${lastMessageId}`;
    }

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "DiscordMediaSyncBot (GitHub Actions, 1.0.0)",
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Erreur Discord API (${response.status}): ${errorBody}`);
    }

    const messages = await response.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      keepFetching = false;
      break;
    }

    allMessages = allMessages.concat(messages);
    lastMessageId = messages[messages.length - 1].id;

    console.log(`-> ${allMessages.length} messages récupérés pour analyse...`);

    if (messages.length < 100) {
      keepFetching = false;
    }
  }

  return allMessages;
}

function extractMediaUrls(messages) {
  const urls = [];
  const dedupe = new Set();

  for (const message of messages) {
    if (!Array.isArray(message.attachments)) continue;

    for (const attachment of message.attachments) {
      if (!isMediaAttachment(attachment)) continue;
      
      if (dedupe.has(attachment.id)) continue;

      dedupe.add(attachment.id);
      urls.push(attachment.url);
    }
  }

  return urls;
}

async function saveMediaUrls(urls) {
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(urls, null, 2) + "\n", "utf8");
}

async function main() {
  const token = process.env.DISCORD_TOKEN;
  const channelId = process.env.CHANNEL_ID;

  if (!token || !channelId) {
    throw new Error("Variables manquantes: DISCORD_TOKEN et CHANNEL_ID obligatoires.");
  }

  const messages = await fetchAllMessages({ token, channelId });
  const mediaUrls = extractMediaUrls(messages);
  await saveMediaUrls(mediaUrls);

  console.log("\n--- Statisiques ---");
  console.log(`Total messages scannés : ${messages.length}`);
  console.log(`Total médias valides extraits : ${mediaUrls.length}`);
}

main().catch((error) => {
  console.error("Échec de synchronisation des médias:", error);
  process.exitCode = 1;
});
