const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, UserSelectMenuBuilder, ChannelType, PermissionFlagsBits, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

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

        // 2. Enviou o Modal -> Cria o canal de Ticket restrito
        if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_ticket_')) {
            await interaction.deferReply({ ephemeral: true });

            const escolha = interaction.customId.replace('modal_ticket_', '');
            const resumo = interaction.fields.getTextInputValue('resumo_assunto');
            const categoriaId = '1532510033378676787';
            const codigoTicket = gerarCodigoTicket();

            const nomesCanais = {
                'ticket_baixa_funcional': 'baixa-',
                'ticket_alteracao_discord': 'discord-',
                'ticket_outros_assuntos': 'outros-',
                'ticket_reportar_problema': 'problema-',
                'ticket_falar_instrutores': 'instrutores-'
            };

            const prefixo = nomesCanais[escolha] || 'ticket-';
            const nomeCanal = `${prefixo}${interaction.user.username}`.toLowerCase();

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
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels],
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

        // 3. Botão: Finalizar Atendimento
        if (interaction.isButton() && interaction.customId === 'btn_fechar_ticket') {
            if (!interaction.member.roles.cache.has(CARGO_STAFF_ID) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ Apenas membros da staff com o cargo autorizado podem finalizar este atendimento!', ephemeral: true });
            }

            await interaction.reply({ content: '🔒 Este atendimento foi encerrado. O canal será deletado em 5 segundos...', ephemeral: false });
            setTimeout(async () => {
                try {
                    await interaction.channel.delete();
                } catch (err) {
                    console.error('❌ Erro ao deletar o canal:', err);
                }
            }, 5000);
            return true;
        }

        // 4. Botão: Adicionar Usuário (Abre o menu suspenso de membros)
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

        // 5. Seleção no Menu: Adicionar Usuário
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

        // 6. Botão: Remover Usuário (Abre o menu suspenso com os usuários com acesso)
        if (interaction.isButton() && interaction.customId === 'btn_remover_usuario') {
            if (!interaction.member.roles.cache.has(CARGO_STAFF_ID) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ Apenas membros da staff autorizados podem remover usuários do ticket!', ephemeral: true });
            }

            const userSelect = new UserSelectMenuBuilder()
                .setCustomId('select_remover_usuario')
                .setPlaceholder('Selecione o policial para remover...')
                .setMinValues(1)
                .setMaxValues(1);

            const row = new ActionRowBuilder().addComponents(userSelect);

            return await interaction.reply({ content: '👇 Selecione abaixo o policial que deseja **remover** do ticket:', components: [row], ephemeral: true });
        }

        // 7. Seleção no Menu: Remover Usuário
        if (interaction.isUserSelectMenu() && interaction.customId === 'select_remover_usuario') {
            const usuarioSelecionado = interaction.users.first();
            
            try {
                await interaction.channel.permissionOverwrites.delete(usuarioSelecionado.id);

                return await interaction.update({ content: `✅ O policial ${usuarioSelecionado} foi removido do ticket e perdeu o acesso ao canal.`, components: [] });
            } catch (err) {
                return await interaction.update({ content: '❌ Erro ao remover o usuário do canal.', components: [] });
            }
        }

        // 8. Botão: Alterar Nome do Ticket
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

        // 9. Envio do Modal de Alterar Nome
        if (interaction.isModalSubmit() && interaction.customId === 'modal_alterar_nome') {
            const novoNome = interaction.fields.getTextInputValue('novo_nome_canal').toLowerCase().replace(/\s+/g, '-');
            
            try {
                await interaction.channel.setName(novoNome);
                return interaction.reply({ content: `✅ Nome do canal alterado com sucesso para: \`${novoNome}\``, ephemeral: true });
            } catch (err) {
                return interaction.reply({ content: '❌ Erro ao alterar o nome do canal.', ephemeral: true });
            }
        }

        return false;
    }
};