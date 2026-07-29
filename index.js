require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();
const commandsArray = [];

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commandsArray.push(command.data.toJSON());
    } else {
        console.log(`[AVISO] O comando em ${filePath} está sem a propriedade "data" ou "execute" obrigatória.`);
    }
}

client.once('ready', async () => {
    console.log(`✅ Bot logado com sucesso como ${client.user.tag}!`);

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        console.log('🔄 Atualizando comandos de barra (Slash Commands)...');
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commandsArray },
        );
        console.log('✅ Comandos registrados com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao registrar os comandos:', error);
    }
});

client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isButton()) {
            if (interaction.customId === 'abrir_modal_ponto_painel') {
                const pontoCommand = client.commands.get('ponto');
                if (pontoCommand) {
                    return await pontoCommand.execute(interaction);
                }
            }
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);
        if (!command) {
            console.error(`❌ Nenhum comando correspondente a ${interaction.commandName} foi encontrado.`);
            return;
        }

        await command.execute(interaction);

    } catch (error) {
        console.error('❌ Erro ao processar a interação:', error);
        
        try {
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: '❌ Ocorreu um erro ao executar este comando!', ephemeral: true });
            } else {
                await interaction.reply({ content: '❌ Ocorreu um erro ao executar este comando!', ephemeral: true });
            }
        } catch (err) {
            // Ignora se a interação já expirou
        }
    }
});

client.login(TOKEN);