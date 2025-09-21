const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");
  const sock = makeWASocket({ auth: state });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0];
    if (!m.message || !m.key.remoteJid) return;

    const from = m.key.remoteJid;
    const body = m.message.conversation || m.message.extendedTextMessage?.text;

    // Commande pour démarrer le jeu
    if (body && body.startsWith(".bonbon")) {
      const bonbons = ["🍬", "🍫", "🍭", "🍪", "🧁"];
      const poison = bonbons[Math.floor(Math.random() * bonbons.length)];

      await sock.sendMessage(from, {
        text: `🎮 Jeu du *Bonbon Empoisonné* 🎮\n\nChoisissez chacun un bonbon :\n${bonbons.join(" ")}\n\nRépondez en envoyant juste l'emoji choisi !`
      });

      // Sauvegarde la partie
      global.parties = global.parties || {};
      global.parties[from] = { bonbons, poison, choix: {} };
    }

    // Gestion des choix
    if (global.parties && global.parties[from]) {
      const partie = global.parties[from];
      if (partie.bonbons.includes(body?.trim())) {
        const player = m.key.participant || m.key.remoteJid;
        partie.choix[player] = body.trim();

        // Quand 2 joueurs ont choisi
        if (Object.keys(partie.choix).length >= 2) {
          let result = "✅ Résultats du jeu :\n";
          for (let [p, choix] of Object.entries(partie.choix)) {
            if (choix === partie.poison) {
              result += `❌ ${p} a choisi ${choix} (empoisonné !) 💀\n`;
            } else {
              result += `🎉 ${p} a choisi ${choix} (sain !) 😋\n`;
            }
          }

          await sock.sendMessage(from, { text: result });
          delete global.parties[from]; // reset
        }
      }
    }
  });
}

startBot();
