const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, UserSelectMenuBuilder, ChannelType, PermissionFlagsBits, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder } = require('discord.js');

// Função para gerar um código de ticket aleatório estilo "3HE5NMEO"
function gerarCodigoTicket() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo = '';
    for (let i = 0; i < 8; i++) {
        codigo += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return codigo;
}

const CARGO_STAFF_ID = '1502362863149518898';
const CANAL_LOG_ID = '1532776900949442880';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('atendimento-rh')
        .setDescription('Envia o painel de atendimento do RH - Setor P1'),

    async execute(interaction) {
        if (!interaction.member.permissions.has('ManageMessages')) {
            return interaction.reply({ content: '❌ Você não tem permissão para usar este comando!', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('Central de Atendimento | RH - Setor P1')
            .setDescription(
                '> 🟦 Selecione uma das opções abaixo para gerar um canal\n' +
                '> de atendimento particular no RH.\n\n' +
                '• **Atenção! Não abra um chamado sem necessidade.**'
            )
            .setThumbnail('https://cdn.discordapp.com/attachments/1502291744228769867/1532149715842629722/image.png')
            .setFooter({ text: 'Secretaria da Segurança Pública - Polícia Militar' })
            .setTimestamp();

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('menu_atendimento_rh')
            .setPlaceholder('Escolha o tipo de atendimento:')
            .addOptions([
                { label: 'Baixa de funcional', description: 'Solicitar baixa em funcional PM.', value: 'ticket_baixa_funcional', emoji: '📇' },
                { label: 'Alteração no Discord', description: 'Modificar cargos, editar perfil, alterar configs do discord etc...', value: 'ticket_alteracao_discord', emoji: '🛠️' },
                { label: 'Outros Assuntos', description: 'Solicitar atendimento para outros tipos de assuntos.', value: 'ticket_outros_assuntos', emoji: 'ℹ️' },
                { label: 'Reportar problema', description: 'Relatar problemas técnicos da PM (Discord ou cidade).', value: 'ticket_reportar_problema', emoji: '🤖' },
                { label: 'Falar com instrutores', description: 'Atendimento privado com o quadro de instrutores - DEC.', value: 'ticket_falar_instrutores', emoji: '📊' }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({ content: '✅ Painel de atendimento do RH enviado com sucesso!', ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [row] });
    },

    async handleInteraction(interaction) {
        // 1. Clicou no menu -> Abre o Modal pedindo resumo
        if (interaction.isStringSelectMenu() && interaction.customId === 'menu_atendimento_rh') {
            const escolha = interaction.values[0];

            const modal = new ModalBuilder()
                .setCustomId(`modal_ticket_${escolha}`)
                .setTitle('SSP | Resumo do Atendimento');

            const resumoInput = new TextInputBuilder()
                .setCustomId('resumo_assunto')
                .setLabel('Dê um breve resumo sobre o assunto:')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Explique brevemente o motivo do seu chamado...')
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(resumoInput));
            return await interaction.showModal(modal);
        }

        // 2. Enviou o Modal -> Cria o canal de Ticket restrito com emoji, username e opção escolhida
        if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_ticket_')) {
            await interaction.deferReply({ ephemeral: true });

            const escolha = interaction.customId.replace('modal_ticket_', '');
            const resumo = interaction.fields.getTextInputValue('resumo_assunto');
            const categoriaId = '1532510033378676787';
            const codigoTicket = gerarCodigoTicket();

            const nomesCanais = {
                'ticket_baixa_funcional': 'baixa-funcional',
                'ticket_alteracao_discord': 'alteracao-discord',
                'ticket_outros_assuntos': 'outros-assuntos',
                'ticket_reportar_problema': 'reportar-problema',
                'ticket_falar_instrutores': 'dec-instrutores'
            };

            const nomeBase = nomesCanais[escolha] || 'atendimento';
            
            const username = interaction.user.username
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]/g, '-');

            let nomeCanal = `📁-${username}-${nomeBase}`.replace(/-+/g, '-');
            if (nomeCanal.length > 100) nomeCanal = nomeCanal.substring(0, 100);

            const labelsOpcoes = {
                'ticket_baixa_funcional': 'Baixa de funcional',
                'ticket_alteracao_discord': 'Alteração no Discord',
                'ticket_outros_assuntos': 'Outros Assuntos',
                'ticket_reportar_problema': 'Reportar problema',
                'ticket_falar_instrutores': 'Falar com instrutores'
            };
            const nomeCategoriaTicket = labelsOpcoes[escolha] || 'Atendimento';

            try {
                const canalTicket = await interaction.guild.channels.create({
                    name: nomeCanal,
                    type: ChannelType.GuildText,
                    parent: categoriaId,
                    topic: `ticket_owner_${interaction.user.id}_code_${codigoTicket}`,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.id,
                            deny: [PermissionFlagsBits.ViewChannel],
                        },
                        {
                            id: interaction.user.id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                        },
                        {
                            id: CARGO_STAFF_ID,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                        },
                        {
                            id: interaction.client.user.id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory],
                        }
                    ],
                });

                const embedTicket = new EmbedBuilder()
                    .setColor(0xED4245)
                    .setTitle(`Canal de Atendimento | RH • ${nomeCategoriaTicket}`)
                    .setDescription(
                        `Envie sua solicitação abaixo e aguarde a resposta de um dos responsáveis. Ao final do atendimento você poderá solicitar uma cópia do seu ticket!\n\n` +
                        `> 🎫 | **Código do ticket**\n` +
                        `> \`${codigoTicket}\`\n\n` +
                        `> 👮 | **Aberto por:**\n` +
                        `> ${interaction.user} (${interaction.member.displayName})\n\n` +
                        `> 📝 | **Resumo:** \`${resumo}\``
                    )
                    .setFooter({ text: 'Secretaria da Segurança Pública - Polícia Militar' })
                    .setTimestamp();

                const rowBotoes1 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('btn_fechar_ticket').setLabel('Finalizar atendimento').setStyle(ButtonStyle.Danger).setEmoji('❌'),
                    new ButtonBuilder().setCustomId('btn_adicionar_usuario').setLabel('Adicionar usuário').setStyle(ButtonStyle.Success).setEmoji('👤'),
                    new ButtonBuilder().setCustomId('btn_remover_usuario').setLabel('Remover usuário').setStyle(ButtonStyle.Secondary).setEmoji('👤')
                );

                const rowBotoes2 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('btn_alterar_nome').setLabel('Alterar nome do ticket').setStyle(ButtonStyle.Primary).setEmoji('ℹ️')
                );

                await canalTicket.send({ content: `${interaction.user} <@&${CARGO_STAFF_ID}>`, embeds: [embedTicket], components: [rowBotoes1, rowBotoes2] });

                return await interaction.editReply({ content: `✅ Seu canal de atendimento foi criado com sucesso: ${canalTicket}` });
            } catch (error) {
                console.error('❌ Erro ao criar canal de ticket:', error);
                return await interaction.editReply({ content: '❌ Ocorreu um erro ao criar o seu canal de atendimento.' });
            }
        }

        // 3. Botão: Finalizar Atendimento (Abre o Modal pedindo a resolução)
        if (interaction.isButton() && interaction.customId === 'btn_fechar_ticket') {
            if (!interaction.member.roles.cache.has(CARGO_STAFF_ID) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ Apenas membros da staff com o cargo autorizado podem finalizar este atendimento!', ephemeral: true });
            }

            const modal = new ModalBuilder()
                .setCustomId('modal_fechar_ticket')
                .setTitle('Finalizar Atendimento');

            const resolucaoInput = new TextInputBuilder()
                .setCustomId('resolucao_ticket')
                .setLabel('Qual foi a resolução do atendimento?')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Ex: Orientado, aguardar os anuncios de cursos...')
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(resolucaoInput));
            return await interaction.showModal(modal);
        }

        // 4. Envio do Modal de Finalizar Atendimento (Gera o HTML visual igual ao Discord, gera o log limpo e deleta o canal)
        if (interaction.isModalSubmit() && interaction.customId === 'modal_fechar_ticket') {
            if (!interaction.member.roles.cache.has(CARGO_STAFF_ID) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ Apenas membros da staff podem finalizar este atendimento!', ephemeral: true });
            }

            await interaction.reply({ content: '🔒 Processando fechamento do ticket e gerando log...', ephemeral: true });

            const resolucao = interaction.fields.getTextInputValue('resolucao_ticket');
            const canal = interaction.channel;
            const topico = canal.topic || '';

            let autorId = null;
            let codigoTicket = 'DESCONHECIDO';

            const matchOwner = topico.match(/ticket_owner_(\d+)/);
            if (matchOwner) autorId = matchOwner[1];

            const matchCode = topico.match(/code_([A-Z0-9]+)/);
            if (matchCode) codigoTicket = matchCode[1];

            // Coleta de mensagens para gerar o HTML idêntico ao Discord Transcript
            let mensagensHTML = '';
            let dataAtualFormatada = new Date().toLocaleString('pt-BR');

            try {
                let mensagens = [];
                let ultimoId;
                
                while (true) {
                    const options = { limit: 100 };
                    if (ultimoId) options.before = ultimoId;
                    const fetched = await canal.messages.fetch(options);
                    if (fetched.size === 0) break;
                    
                    mensagens.push(...fetched.values());
                    ultimoId = fetched.last().id;
                    if (fetched.size < 100) break;
                }

                mensagens.reverse();

                for (const m of mensagens) {
                    const dataMsg = m.createdAt.toLocaleString('pt-BR');
                    const nomeAutor = m.author.globalName || m.author.username;
                    const avatarAutor = m.author.displayAvatarURL({ extension: 'png', size: 128 }) || 'https://cdn.discordapp.com/embed/avatars/0.png';
                    let conteudo = m.content || '';

                    mensagensHTML += `
                    <div style="display: flex; margin-bottom: 16px; font-family: 'gg sans', 'Noto Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #dbdee1;">
                        <img src="${avatarAutor}" style="width: 40px; height: 40px; border-radius: 50%; margin-right: 16px; margin-top: 2px;">
                        <div style="flex-grow: 1;">
                            <div style="display: flex; align-items: baseline; margin-bottom: 4px;">
                                <span style="font-weight: 500; color: #f2f3f5; margin-right: 8px; font-size: 16px;">${nomeAutor}</span>
                                <span style="font-size: 12px; color: #949ba4;">${dataMsg}</span>
                            </div>
                            <div style="font-size: 15px; line-height: 1.375rem; word-break: break-word; white-space: pre-wrap;">${conteudo}</div>
                        </div>
                    </div>`;
                }
            } catch (err) {
                console.error('❌ Erro ao coletar histórico HTML:', err);
            }

            // Template HTML estilizado com o tema escuro idêntico ao Discord
            const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Transcript #${canal.name}</title>
    <style>
        body { background-color: #313338; color: #dbdee1; margin: 0; padding: 24px; font-family: 'gg sans', 'Noto Sans', sans-serif; }
        .chat-container { max-width: 900px; margin: 0 auto; background-color: #313338; padding: 20px; }
        .footer-transcript { text-align: center; color: #949ba4; font-size: 12px; margin-top: 40px; border-top: 1px solid #3f4147; padding-top: 15px; }
    </style>
</head>
<body>
    <div class="chat-container">
        <h2 style="color: #f2f3f5; border-bottom: 1px solid #3f4147; padding-bottom: 10px;">📁 #${canal.name}</h2>
        ${mensagensHTML}
        <div class="footer-transcript">
            This transcript was generated on ${dataAtualFormatada} (-03)
        </div>
    </div>
</body>
</html>`;

            const buffer = Buffer.from(htmlContent, 'utf-8');
            const attachment = new AttachmentBuilder(buffer, { name: `${canal.name}_${codigoTicket}.html` });

            try {
                const canalLog = await interaction.client.channels.fetch(CANAL_LOG_ID);
                if (canalLog) {
                    const embedLog = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setTitle('Atendimento finalizado!')
                        .setDescription(
                            `🎟️ **Ticket aberto por:**\n${autorId ? `<@${autorId}>` : 'Desconhecido'}\n\n` +
                            `👥 **Ticket finalizado por:**\n${interaction.user}\n\n` +
                            `🎫 | **Código:**\n\`${codigoTicket}\`\n\n` +
                            `📅 | **Data e hora:**\n\`${new Date().toLocaleString('pt-BR')}\`\n\n` +
                            `⚖️ | **Resolução:**\n\`${resolucao}\``
                        )
                        .setThumbnail('https://cdn.discordapp.com/attachments/1502291744228769867/1532149715842629722/image.png')
                        .setFooter({ text: 'Secretaria da Segurança Pública - Polícia Militar' })
                        .setTimestamp();

                    const botaoHistorico = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`ver_historico_${codigoTicket}`)
                            .setLabel('Historico de mensagens')
                            .setStyle(ButtonStyle.Link)
                            .setEmoji('📄')
                            .setURL('https://discord.com') // Será atualizado ou aberto via anexo
                    );

                    // Enviamos o embed limpo e o arquivo .html anexado diretamente na mensagem de log
                    const mensagemEnviada = await canalLog.send({ embeds: [embedLog], files: [attachment] });
                    
                    // Como o botão de link precisa de uma URL real, se você quiser que o botão abra o arquivo enviado, 
                    // podemos anexar e atualizar o link do botão para apontar diretamente para o link público do anexo do Discord!
                    const anexoUrl = mensagemEnviada.attachments.first()?.url;
                    if (anexoUrl) {
                        const botaoLinkAtualizado = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setLabel('Historico de mensagens')
                                .setStyle(ButtonStyle.Link)
                                .setEmoji('📄')
                                .setURL(anexoUrl)
                        );
                        await mensagemEnviada.edit({ components: [botaoLinkAtualizado] });
                    }
                }
            } catch (logErr) {
                console.error('❌ Erro ao enviar log para o canal:', logErr);
            }

            await interaction.followUp({ content: '🔒 Atendimento finalizado com sucesso! O canal será deletado em 5 segundos...', ephemeral: false });
            setTimeout(async () => {
                try {
                    await canal.delete();
                } catch (err) {
                    console.error('❌ Erro ao deletar o canal:', err);
                }
            }, 5000);
            return true;
        }

        // 5. Botão: Adicionar Usuário
        if (interaction.isButton() && interaction.customId === 'btn_adicionar_usuario') {
            if (!interaction.member.roles.cache.has(CARGO_STAFF_ID) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ Apenas membros da staff autorizados podem adicionar usuários ao ticket!', ephemeral: true });
            }

            const userSelect = new UserSelectMenuBuilder()
                .setCustomId('select_adicionar_usuario')
                .setPlaceholder('Selecione o policial para adicionar...')
                .setMinValues(1)
                .setMaxValues(1);

            const row = new ActionRowBuilder().addComponents(userSelect);

            return await interaction.reply({ content: '👇 Selecione abaixo o policial que deseja **adicionar** ao ticket:', components: [row], ephemeral: true });
        }

        // 6. Seleção no Menu: Adicionar Usuário
        if (interaction.isUserSelectMenu() && interaction.customId === 'select_adicionar_usuario') {
            const usuarioSelecionado = interaction.users.first();
            
            try {
                await interaction.channel.permissionOverwrites.edit(usuarioSelecionado.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true
                });

                return await interaction.update({ content: `✅ O policial ${usuarioSelecionado} foi adicionado ao ticket com sucesso!`, components: [] });
            } catch (err) {
                return await interaction.update({ content: '❌ Erro ao adicionar o usuário ao canal.', components: [] });
            }
        }

        // 7. Botão: Remover Usuário
        if (interaction.isButton() && interaction.customId === 'btn_remover_usuario') {
            if (!interaction.member.roles.cache.has(CARGO_STAFF_ID) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ Apenas membros da staff autorizados podem remover usuários do ticket!', ephemeral: true });
            }

            const userSelect = new UserSelectMenuBuilder()
                .setCustomId('select_remover_usuario')
                .setPlaceholder('Selecione o policial para remover...')
                .setMinValues(1)
                .setMaxValues(1);

            const row = new ActionRowBuilder().addComponents(userModel = userSelect);

            return await interaction.reply({ content: '👇 Selecione abaixo o policial que deseja **remover** ao ticket:', components: [row], ephemeral: true });
        }

        // 8. Seleção no Menu: Remover Usuário
        if (interaction.isUserSelectMenu() && interaction.customId === 'select_remover_usuario') {
            const usuarioSelecionado = interaction.users.first();
            
            try {
                await interaction.channel.permissionOverwrites.delete(usuarioSelecionado.id);

                return await interaction.update({ content: `✅ O policial ${usuarioSelecionado} foi removido do ticket e perdeu o acesso ao canal.`, components: [] });
            } catch (err) {
                return await interaction.update({ content: '❌ Erro ao remover o usuário do canal.', components: [] });
            }
        }

        // 9. Botão: Alterar Nome do Ticket
        if (interaction.isButton() && interaction.customId === 'btn_alterar_nome') {
            if (!interaction.member.roles.cache.has(CARGO_STAFF_ID) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ Apenas membros da staff podem alterar o nome do ticket!', ephemeral: true });
            }

            const modal = new ModalBuilder()
                .setCustomId('modal_alterar_nome')
                .setTitle('Alterar Nome do Canal');

            const nomeInput = new TextInputBuilder()
                .setCustomId('novo_nome_canal')
                .setLabel('Novo nome para o canal:')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Ex: atendimento-nome')
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(nomeInput));
            return await interaction.showModal(modal);
        }

        // 10. Envio do Modal de Alterar Nome
        if (interaction.isModalSubmit() && interaction.customId === 'modal_alterar_nome') {
            const inputDigitado = interaction.fields.getTextInputValue('novo_nome_canal');
            
            let novoNomeTratado = inputDigitado
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');

            if (!novoNomeTratado) {
                return interaction.reply({ content: '❌ O nome fornecido é inválido. Digite caracteres alfanuméricos.', ephemeral: true });
            }

            const novoNomeCanal = `📁-${novoNomeTratado}`.substring(0, 100);
            
            try {
                await interaction.channel.setName(novoNomeCanal);
                return interaction.reply({ content: `✅ Nome do canal alterado com sucesso para: \`${novoNomeCanal}\``, ephemeral: true });
            } catch (err) {
                console.error('❌ Erro ao alterar nome do canal:', err);
                return interaction.reply({ content: '❌ Erro ao alterar o nome do canal. Certifique-se de que o bot possui a permissão "Gerenciar Canais" (`ManageChannels`).', ephemeral: true });
            }
        }

        return false;
    }
};