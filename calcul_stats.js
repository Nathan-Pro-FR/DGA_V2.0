const fs = require("node:fs");

function getMediaId(url) {
  if (!url) return null;
  const parts = url.split("?")[0].split("/");
  return parts[parts.length - 2] || url;
}

try {
  const oldData = JSON.parse(fs.readFileSync("donnees.previous.json", "utf8"));
  const newData = JSON.parse(fs.readFileSync("donnees.json", "utf8"));

  const oldMap = new Map();
  oldData.forEach((url) => {
    const id = getMediaId(url);
    if (id) oldMap.set(id, url);
  });

  const newMap = new Map();
  newData.forEach((url) => {
    const id = getMediaId(url);
    if (id) newMap.set(id, url);
  });

  let added = 0;
  let removed = 0;
  let refreshed = 0;

  for (const [id, newUrl] of newMap.entries()) {
    if (!oldMap.has(id)) {
      added++;
    } else {
      const oldUrl = oldMap.get(id);
      if (oldUrl !== newUrl) {
        refreshed++;
      }
    }
  }

  for (const id of oldMap.keys()) {
    if (!newMap.has(id)) removed++;
  }

  const now = new Date();
  const unixTs = Math.floor(now.getTime() / 1000);

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `added=${added}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `removed=${removed}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `refreshed=${refreshed}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `total=${newData.length}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `timestamp=${now.toISOString()}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `timestamp_unix=${unixTs}\n`);
  }

  console.log(`Stats calculées : +${added} | -${removed} | ~${refreshed} | Total: ${newData.length}`);
} catch (error) {
  console.error("Erreur lors du calcul des stats:", error);
  process.exit(1);
}
