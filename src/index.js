require('dotenv').config();
const { Client, Collection, Events, GatewayIntentBits } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
const config = require("./config/config");
const logger = require("./utils/logger");

// Log startup information
logger.info("Starting Discord bot...", {
  node_version: process.version,
  platform: process.platform
});

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
    logger.debug(`Loaded command: ${command.data.name}`);
  }
}

client.once(Events.ClientReady, () => {
  logger.info("Discord bot is ready!", {
    username: client.user.tag,
    guilds: client.guilds.cache.size
  });
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        logger.warn(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        logger.debug(`Executing command: ${interaction.commandName}`, {
          user: interaction.user.tag,
          guild: interaction.guild?.name
        });
        await command.execute(interaction);
      } catch (error) {
        logger.error(`Error executing command: ${interaction.commandName}`, error);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: "There was an error executing this command!",
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: "There was an error executing this command!",
            ephemeral: true,
          });
        }
      }
    }
  } catch (error) {
    logger.error("Error in interaction handler", error);
  }
});

client.login(config.DISCORD_TOKEN).catch(error => {
  logger.error("Failed to login to Discord", error);
  process.exit(1);
});

const { startWebhookServer } = require("./webhook");

client.once("ready", () => {
  console.log("Bot ready");
  startWebhookServer(client);
});

