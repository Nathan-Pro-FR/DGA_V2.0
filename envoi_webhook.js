async function sendWebhookNotification() {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log("Aucune URL de Webhook configurée. Notification ignorée.");
    process.exit(0);
  }

  const added = parseInt(process.env.ADDED || "0", 10);
  const removed = parseInt(process.env.REMOVED || "0", 10);
  const refreshed = parseInt(process.env.REFRESHED || "0", 10);
  const total = parseInt(process.env.TOTAL || "0", 10);
  const timestamp = process.env.TIMESTAMP;
  const timestampUnix = process.env.TIMESTAMP_UNIX;

  const repoUrl = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`;
  const runUrl = `${repoUrl}/actions/runs/${process.env.GITHUB_RUN_ID}`;

  // BUG CRITIQUE CORRIGÉ : même problème de syntaxe Markdown résiduelle que dans
  // les autres scripts. L'ancienne valeur produisait un lien Discord du type
  // "[Ouvrir la galerie]([https://.../]([https://.../])" totalement cassé.
  const siteUrl = "https://Nathan-Pro-FR.github.io/Discord_Github_Action/";

  const payload = {
    username: "Gallery Sync Bot",
    embeds: [
      {
        title: "🔄 Synchronisation Galerie Discord",
        color: 0xec4899,
        description: `La galerie a été mise à jour le : <t:${timestampUnix}:F> • <t:${timestampUnix}:R>`,
        fields: [
          { name: "➕ Ajoutés", value: String(added), inline: true },
          { name: "➖ Supprimés", value: String(removed), inline: true },
          { name: "🔄 Jetons rafraîchis", value: String(refreshed), inline: true },
          { name: "📊 Total médias", value: String(total), inline: true },
          { name: "🌐 Site web", value: `[Ouvrir la galerie](${siteUrl})`, inline: false },
          { name: "🛠️ GitHub Action", value: `[Voir le rapport de run](${runUrl})`, inline: false },
        ],
        footer: {
          text: `Statut: Réussi • ${timestamp}`,
        },
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Discord webhook error ${response.status}: ${body}`);
    }

    console.log("Notification Webhook envoyée avec succès sur Discord.");
  } catch (error) {
    console.error("Échec de l'envoi du webhook:", error);
    process.exit(1);
  }
}

sendWebhookNotification();
