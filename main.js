import { config as env } from 'dotenv'
import { Client, GatewayIntentBits } from 'discord.js'
import { Player } from './player/player.js'
import { CommandHandler } from './commands/commandHandler.js'

// setup evironment variables
env();

const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers
    ]
});
const player = new Player();
const commandHandler = new CommandHandler(player);

bot.on("ready", ()=>{
    const numOfGuilds = bot.guilds.cache.size;
    if(numOfGuilds>1){
        throw new Error('Bot is only allowed on one server at a time.')
    }
})

bot.on("messageCreate", async (data) => {
    if (data.author.bot) return;
    await commandHandler.handleMessage(data) 
})

bot.login(process.env.BOT_TOKEN);
