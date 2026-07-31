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
        // 1. Tratamento para Comandos de Barra (Slash Commands)
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            return await command.execute(interaction);
        }

        // 2. Roteador Modular Universal Seguro (Valida o prefixo do customId ou se pertence ao comando antes de tratar)
        for (const [name, command] of client.commands) {
            if (typeof command.handleInteraction === 'function') {
                if (interaction.customId) {
                    const id = interaction.customId;
                    
                    const isPainelFuncional = name === 'painel-funcional' && (
                        id.includes('funcional') || 
                        id.includes('unidade') || 
                        id.includes('configurar_patente') || 
                        id.includes('voltar_painel') || 
                        id.includes('patente_cargo')
                    );

                    const isExonerar = name === 'exonerar' && (id.includes('exonerar') || id.includes('policiais'));
                    const isAusencia = name === 'painel-ausencia' && (id.includes('ausencia') || id.includes('modal_registrar_ausencia') || id.includes('btn_abrir_ausencia'));
                    
                    const isAvaliarEstagio = name === 'avaliar-estagio' && (
                        id.includes('estagio') || 
                        id.includes('avaliacao') || 
                        id.includes('iniciar_avaliacao') || 
                        id.includes('policial_avaliado')
                    );

                    const isAtendimentoRh = name === 'atendimento-rh' && (
                        id.includes('atendimento_rh') || 
                        id.includes('ticket') || 
                        id.includes('btn_fechar_ticket') || 
                        id.includes('btn_adicionar_usuario') || 
                        id.includes('btn_remover_usuario') || 
                        id.includes('btn_alterar_nome') ||
                        id.includes('select_adicionar_usuario') ||
                        id.includes('select_remover_usuario')
                    );

                    // Adicionado suporte seguro para o sistema de Ponto e Painel de Ponto
                    const isPonto = (name === 'ponto' || name === 'painelponto') && (
                        id.includes('ponto') || 
                        id.includes('modal_ponto') || 
                        id.includes('modal_obs') || 
                        id.includes('adicionar_obs') || 
                        id.includes('encerrar_ponto_individual') ||
                        id.includes('abrir_modal_ponto_painel')
                    );

                    const generalMatch = id.includes(name);

                    if (!isPainelFuncional && !isExonerar && !isAusencia && !isAvaliarEstagio && !isAtendimentoRh && !isPonto && !generalMatch) {
                        continue; // Pula este comando se o ID não tiver relação com ele, evitando falsos positivos
                    }
                }

                const handled = await command.handleInteraction(interaction).catch(() => false);
                if (handled !== false) return;
            }
        }

        // 3. Tratamento Dinâmico Tradicional para Botões (Compatibilidade com comandos legados)
        if (interaction.isButton()) {
            for (const [name, command] of client.commands) {
                if (interaction.customId.includes(name) || interaction.customId.replace('btn_', '') === name) {
                    if (typeof command.execute === 'function') {
                        return await command.execute(interaction);
                    }
                }
            }

            // Fallback manual para IDs legados específicos
            if (interaction.customId === 'abrir_modal_ponto_painel' || interaction.customId === 'adicionar_obs' || interaction.customId === 'encerrar_ponto_individual') {
                const pontoCommand = client.commands.get('ponto') || client.commands.get('painelponto');
                if (pontoCommand) return; // O coletor interno dentro do comando gerencia o clique
            }
            if (interaction.customId === 'btn_boletim_interno') {
                const boletimCommand = client.commands.get('boletim-interno');
                if (boletimCommand) return await boletimCommand.execute(interaction);
            }
            if (interaction.customId === 'btn_emitir_certificado') {
                const emitirRegistrosCommand = client.commands.get('emitir-registros');
                if (emitirRegistrosCommand) return await emitirRegistrosCommand.execute(interaction);
            }

            return;
        }

        // 4. Tratamento Dinâmico Tradicional para Modais (Compatibilidade com comandos legados)
        if (interaction.isModalSubmit()) {
            for (const [name, command] of client.commands) {
                if (interaction.customId.includes(name) || interaction.customId.replace('modal_', '') === name) {
                    if (command.handleModal) {
                        return await command.handleModal(interaction);
                    }
                }
            }

            // Fallback manual para modais legados específicos
            if (interaction.customId === 'modal_boletim_interno') {
                const boletimCommand = client.commands.get('boletim-interno');
                if (boletimCommand && boletimCommand.handleModal) {
                    return await boletimCommand.handleModal(interaction);
                }
            }
            if (interaction.customId === 'modal_certificado') {
                const emitirRegistrosCommand = client.commands.get('emitir-registros');
                if (emitirRegistrosCommand && emitirRegistrosCommand.handleModal) {
                    return await emitirRegistrosCommand.handleModal(htmlinteraction);
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