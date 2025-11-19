import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  EmbedBuilder,
  Collection
} from 'discord.js';

// Variáveis de ambiente
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const INTERNAL_KEY = process.env.INTERNAL_KEY;

// Taxas
const TAXA_GAMEPASS = 0.039;
const TAXA_COOKIE = 0.037;
const TAXA_GIFT = 0.034;
const TAXA_LIMITED = 0.031;

const ACCENT_COLOR = 0xe67e22;
const LOGO_URL = "https://cdn.discordapp.com/attachments/1439293558678093956/1439293640395591931/oioi-removebg-preview.png";
const COOLDOWN_MS = 2000;
const DELETE_MS = 12 * 60 * 60 * 1000;

// Emojis
const EMOJI_REAIS = "<:volpereais:1437120386901872680>";
const EMOJI_ROBUX = "<:volverobux:1439311617987706890>";

// Helpers
function formatCurrencyBR(value) {
  return 'R$ ' + Number(value).toFixed(2).replace('.', ',');
}

function formatNumberFull(num) {
  return Number(num).toLocaleString('pt-BR');
}

// Tabelas
const gamepassTabela = [
  { robux: 100, reais: 5 },
  { robux: 200, reais: 9 },
  { robux: 300, reais: 13 },
  { robux: 500, reais: 22 },
  { robux: 1000, reais: 39 },
  { robux: 2000, reais: 75 },
  { robux: 3000, reais: 113 },
  { robux: 5000, reais: 187 },
  { robux: 10000, reais: 369 }
];

const cookieTabela = [
  { robux: 300, reais: 12 },
  { robux: 500, reais: 19 },
  { robux: 1000, reais: 37 },
  { robux: 2000, reais: 72 },
  { robux: 3000, reais: 108 },
  { robux: 5000, reais: 179 },
  { robux: 10000, reais: 350 }
];

// Maps
const gamepassMap = new Map(gamepassTabela.map(x => [x.robux, x.reais]));
const cookieMap = new Map(cookieTabela.map(x => [x.robux, x.reais]));

// Conversões
function gamepassToReais(robux) {
  return gamepassMap.get(robux) ?? parseFloat((robux * TAXA_GAMEPASS).toFixed(2));
}
function reaisToGamepass(reais) {
  const tabela = gamepassTabela.find(x => x.reais === reais);
  if (tabela) return tabela.robux;
  return parseInt((reais / TAXA_GAMEPASS).toFixed(0));
}

function cookieToReais(robux) {
  return cookieMap.get(robux) ?? parseFloat((robux * TAXA_COOKIE).toFixed(2));
}
function reaisToCookie(reais) {
  if (reais < 12) return null;
  const tabela = cookieTabela.find(x => x.reais === reais);
  if (tabela) return tabela.robux;
  return parseInt((reais / TAXA_COOKIE).toFixed(0));
}

function giftToReais(robux) {
  return parseFloat((robux * TAXA_GIFT).toFixed(2));
}

function limitedToReais(robux) {
  return parseFloat((robux * TAXA_LIMITED).toFixed(2));
}

// Embed
function buildEmbed(mode, input, output) {
  const e = new EmbedBuilder()
    .setColor(ACCENT_COLOR)
    .setTimestamp()
    .setThumbnail(LOGO_URL)
    .setTitle("CALCULADORA DE ROBUX VOLPE");

  switch (mode) {
    case "gamepass":
      e.setDescription(`${EMOJI_ROBUX} **Robux Gamepass → Reais**\nRobux: **${formatNumberFull(input)}**\nReais aproximado: **${formatCurrencyBR(output)}**`);
      break;

    case "reaisgamepass":
      e.setDescription(`${EMOJI_REAIS} **Reais → Robux Gamepass**\nReais: **${formatCurrencyBR(input)}**\nRobux aproximado: **${formatNumberFull(output)} Robux**`);
      break;

    case "cookie":
      e.setDescription(`${EMOJI_ROBUX} **Robux Cookie → Reais**\nRobux: **${formatNumberFull(input)}**\nReais aproximado: **${formatCurrencyBR(output)}**`);
      break;

    case "reaiscookie":
      e.setDescription(`${EMOJI_REAIS} **Reais → Robux Cookie**\nReais: **${formatCurrencyBR(input)}**\nRobux aproximado: **${formatNumberFull(output)} Robux**`);
      break;

    case "gift":
      e.setDescription(`${EMOJI_ROBUX} **Gift → Reais**\nRobux: **${formatNumberFull(input)}**\nPreço aproximado: **${formatCurrencyBR(output)}**`);
      break;

    case "limited":
      e.setDescription(`${EMOJI_ROBUX} **Limited → Reais**\nRobux: **${formatNumberFull(input)}**\nPreço aproximado: **${formatCurrencyBR(output)}**`);
      break;
  }

  return e;
}

// Client
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel],
});

const cooldowns = new Collection();

// Commands
const commands = [
  { name: 'gamepass', description: 'Converte Robux Gamepass → Reais', options: [{ name: 'quantidade', type: 10, description: 'Quantidade de Robux', required: true }] },
  { name: 'reaisgamepass', description: 'Converte Reais → Robux Gamepass', options: [{ name: 'valor', type: 10, description: 'Valor em Reais', required: true }] },
  { name: 'cookie', description: 'Converte Robux Cookie → Reais', options: [{ name: 'quantidade', type: 10, description: 'Quantidade de Robux Cookie', required: true }] },
  { name: 'reaiscookie', description: 'Converte Reais → Robux Cookie', options: [{ name: 'valor', type: 10, description: 'Valor em Reais', required: true }] },
  { name: 'gift', description: 'Converte Gift → Reais', options: [{ name: 'quantidade', type: 10, description: 'Quantidade de Gift', required: true }] },
  { name: 'limited', description: 'Converte Limited → Reais', options: [{ name: 'quantidade', type: 10, description: 'Quantidade de Limited', required: true }] },
];

// Registrar comandos
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
}

// Interações
client.on('interactionCreate', async (interaction) => {
  if (!interaction.guild || interaction.guild.id !== GUILD_ID || INTERNAL_KEY !== process.env.INTERNAL_KEY) {
    return interaction.reply({
      content: "❌ Este bot pertence à **Volpe - Roblox Forn & Robux Store** e não está autorizado neste servidor.",
      ephemeral: true
    });
  }

  const last = cooldowns.get(interaction.user.id) ?? 0;
  if (Date.now() - last < COOLDOWN_MS) {
    return interaction.reply({ content: "Espere um pouco antes de usar novamente!", ephemeral: true });
  }

  cooldowns.set(interaction.user.id, Date.now());

  if (!interaction.isChatInputCommand()) return;

  const cmd = interaction.commandName;
  let msg;

  try {
    switch (cmd) {
      case "gamepass":
        const gAmount = interaction.options.getNumber("quantidade", true);
        if (gAmount <= 0)
          return interaction.reply({ content: "❌ Valor inválido.", ephemeral: true });

        msg = await interaction.reply({
          embeds: [buildEmbed("gamepass", gAmount, gamepassToReais(gAmount))],
          fetchReply: true
        });
        break;

      case "reaisgamepass":
        const rgAmount = interaction.options.getNumber("valor", true);
        if (rgAmount <= 0)
          return interaction.reply({ content: "❌ Valor inválido.", ephemeral: true });

        msg = await interaction.reply({
          embeds: [buildEmbed("reaisgamepass", rgAmount, reaisToGamepass(rgAmount))],
          fetchReply: true
        });
        break;

      case "cookie":
        const cAmount = interaction.options.getNumber("quantidade", true);
        if (cAmount < 300)
          return interaction.reply({ content: "❌ O mínimo para Robux Cookie é 300.", ephemeral: true });

        msg = await interaction.reply({
          embeds: [buildEmbed("cookie", cAmount, cookieToReais(cAmount))],
          fetchReply: true
        });
        break;

      case "reaiscookie":
        const rcAmount = interaction.options.getNumber("valor", true);
        if (rcAmount < 12)
          return interaction.reply({ content: "❌ O mínimo para Reais Cookie é R$ 12,00.", ephemeral: true });

        msg = await interaction.reply({
          embeds: [buildEmbed("reaiscookie", rcAmount, reaisToCookie(rcAmount))],
          fetchReply: true
        });
        break;

      case "gift":
        const giftAmount = interaction.options.getNumber("quantidade", true);
        if (giftAmount <= 0)
          return interaction.reply({ content: "❌ Valor inválido.", ephemeral: true });

        msg = await interaction.reply({
          embeds: [buildEmbed("gift", giftAmount, giftToReais(giftAmount))],
          fetchReply: true
        });
        break;

      case "limited":
        const limAmount = interaction.options.getNumber("quantidade", true);
        if (limAmount <= 0)
          return interaction.reply({ content: "❌ Valor inválido.", ephemeral: true });

        msg = await interaction.reply({
          embeds: [buildEmbed("limited", limAmount, limitedToReais(limAmount))],
          fetchReply: true
        });
        break;
    }

    setTimeout(() => {
      msg?.delete().catch(() => { });
    }, DELETE_MS);

  } catch (err) {
    console.error("Erro na interação:", err);

    if (!interaction.replied) {
      interaction.reply({ content: "Ocorreu um erro interno.", ephemeral: true });
    }
  }
});

// Ready
client.once('ready', async () => {
  console.log(`🔌 Bot online: ${client.user.tag}`);
  await registerCommands();
});

// Login
client.login(TOKEN);