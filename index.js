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
        // 0. Redirecionamento unificado para comandos que usam o método modular handleInteraction (ex: /exonerar)
        const exonerarCommand = client.commands.get('exonerar');
        if (exonerarCommand && typeof exonerarCommand.handleInteraction === 'function') {
            if (
                (interaction.isModalSubmit() && interaction.customId === 'modal_exonerar_dados') ||
                (interaction.isUserSelectMenu() && interaction.customId === 'select_policiais_exonerar') ||
                (interaction.isButton() && interaction.customId === 'btn_confirmar_exoneracao')
            ) {
                return await exonerarCommand.handleInteraction(interaction);
            }
        }

        // 1. Tratamento para Comandos de Barra (Slash Commands)
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            return await command.execute(interaction);
        }

        // 2. Tratamento Dinâmico para Botões (Evita conflitos e acha o comando pelo prefixo do customId)
        if (interaction.isButton()) {
            for (const [name, command] of client.commands) {
                if (interaction.customId.includes(name) || interaction.customId.replace('btn_', '') === name) {
                    if (typeof command.execute === 'function') {
                        return await command.execute(interaction);
                    }
                }
            }

            // Fallback manual para IDs específicos que não seguem o padrão direto do nome do comando
            if (interaction.customId === 'abrir_modal_ponto_painel') {
                const pontoCommand = client.commands.get('ponto');
                if (pontoCommand) return await pontoCommand.execute(interaction);
            }
            if (interaction.customId === 'btn_boletim_interno') {
                const boletimCommand = client.commands.get('boletim-interno');
                if (boletimCommand) return await boletimCommand.execute(interaction);
            }
            // Redirecionamento correto para o botão de emitir certificado do painel unificado
            if (interaction.customId === 'btn_emitir_certificado') {
                const emitirRegistrosCommand = client.commands.get('emitir-registros');
                if (emitirRegistrosCommand) return await emitirRegistrosCommand.execute(interaction);
            }

            return;
        }

        // 3. Tratamento Dinâmico para Modais (Formulários)
        if (interaction.isModalSubmit()) {
            for (const [name, command] of client.commands) {
                if (interaction.customId.includes(name) || interaction.customId.replace('modal_', '') === name) {
                    if (command.handleModal) {
                        return await command.handleModal(interaction);
                    }
                }
            }

            // Fallback manual para segurança dos modais atuais
            if (interaction.customId === 'modal_boletim_interno') {
                const boletimCommand = client.commands.get('boletim-interno');
                if (boletimCommand && boletimCommand.handleModal) {
                    return await boletimCommand.handleModal(interaction);
                }
            }
            // Redirecionamento correto para o modal do certificado unificado
            if (interaction.customId === 'modal_certificado') {
                const emitirRegistrosCommand = client.commands.get('emitir-registros');
                if (emitirRegistrosCommand && emitirRegistrosCommand.handleModal) {
                    return await emitirRegistrosCommand.handleModal(interaction);
                }
            }

            return;
        }

    } catch (error) {
        console.error('❌ Erro ao processar a interação:', error);
        
        try {
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: '❌ Ocorreu um erro ao executar esta ação!', ephemeral: true });
            } else {
                await interaction.reply({ content: '❌ Ocorreu um erro ao executar esta ação!', ephemeral: true });
            }
        } catch (err) {
            // Ignora se a interação já expirou
        }
    }
});

client.login(TOKEN);