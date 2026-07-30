const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('convite')
        .setDescription('Envia o painel do Sistema de Controle de Ingresso e Convites'),

    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            const embedPainel = new EmbedBuilder()
                .setTitle('PAINEL DE GERAÇÃO DE CONVITES')
                .setDescription(
                    'Bem-vindo ao Painel Oficial de Geração de Convites.\n\n' +
                    'Este módulo destina-se à emissão e ao gerenciamento de convites de ingresso, garantindo segurança, controle administrativo e rastreabilidade durante todo o processo de admissão de novos integrantes.'
                )
                .setColor(0x2f3136)
                .setThumbnail('https://cdn.discordapp.com/attachments/1502291744228769867/1532149715842629722/image.png?ex=6a6c75de&is=6a6b245e&hm=53ff2d2deb39c47ba8b14957d16b140dfecfbbc3669fe167c39b4afd9ee45b5a')
                .addFields(
                    {
                        name: 'DIRETRIZES',
                        value: '• A emissão de convites é restrita aos policiais devidamente autorizados;\n\n' +
                                '• Todo convite gerado é registrado automaticamente pelo sistema;\n\n' +
                                '• Os convites possuem prazo de validade e limite de utilização;\n\n' +
                                '• O uso indevido da ferramenta poderá acarretar responsabilização administrativa.'
                    },
                    {
                        name: 'GERAÇÃO DE CONVITES',
                        value: 'Para iniciar o procedimento, clique no botão abaixo. Após a emissão, o código deverá ser encaminhado exclusivamente ao candidato previamente autorizado, observando as normas e diretrizes institucionais.'
                    }
                )
                .setFooter({ text: 'Secretaria da Segurança Pública | Sistema de Convites' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_gerar_convite_modal')
                    .setLabel('Gerar Convite')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🎟️')
            );

            return await interaction.reply({ embeds: [embedPainel], components: [row] });
        }

        if (interaction.isButton() && interaction.customId === 'btn_gerar_convite_modal') {
            const cargoPermitidoId = '1502369295383138395';

            if (cargoPermitidoId && !interaction.member.roles.cache.has(cargoPermitidoId)) {
                return await interaction.reply({
                    content: '❌ Você não possui permissão para gerar códigos de convite. Apenas membros autorizados podem utilizar esta função.',
                    ephemeral: true
                });
            }

            const modal = new ModalBuilder()
                .setCustomId('modal_gerar_convite')
                .setTitle('Painel de Geração de Convites');

            const minutosInput = new TextInputBuilder()
                .setCustomId('minutos_convite')
                .setLabel('1º VALIDADE (EM MINUTOS)')
                .setPlaceholder('Ex: 1440')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const quantidadeInput = new TextInputBuilder()
                .setCustomId('quantidade_convite')
                .setLabel('2º QUANTIDADE DE USOS DO CONVITE')
                .setPlaceholder('Ex: 1, 2, 5...')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const motivoInput = new TextInputBuilder()
                .setCustomId('motivo_convite')
                .setLabel('3º MOTIVO')
                .setPlaceholder('Ex: ADM / Recrutamento')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(minutosInput),
                new ActionRowBuilder().addComponents(quantidadeInput),
                new ActionRowBuilder().addComponents(motivoInput)
            );

            return await interaction.showModal(modal);
        }

        if (interaction.isModalSubmit() && interaction.customId === 'modal_gerar_convite') {
            await this.handleModal(interaction);
        }
    },

    async handleModal(interaction) {
        await interaction.reply({ content: '✅ Convite gerado com sucesso! Verifique suas mensagens privadas (DM).', ephemeral: true });

        const minutosStr = interaction.fields.getTextInputValue('minutos_convite');
        const quantidadeStr = interaction.fields.getTextInputValue('quantidade_convite');
        const motivo = interaction.fields.getTextInputValue('motivo_convite');

        const minutos = parseInt(minutosStr);
        const quantidadeUsos = parseInt(quantidadeStr);

        if (isNaN(minutos) || minutos <= 0 || isNaN(quantidadeUsos) || quantidadeUsos <= 0) {
            return;
        }

        const maxAgeSegundos = minutos * 60;
        const canalDestino = interaction.channel;

        try {
            const convite = await canalDestino.createInvite({
                maxAge: maxAgeSegundos,
                maxUses: quantidadeUsos, 
                unique: true,
                reason: `Gerado por ${interaction.user.tag} | Motivo: ${motivo}`
            });

            const numeroAleatorio = Math.floor(10000 + Math.random() * 90000);
            const codigoAutenticador = `CAEP${numeroAleatorio}`;

            const textoFinal = 
                `**Informações do convite:**\n` +
                `**Código autenticador:** \`${codigoAutenticador}\`\n` +
                `**Link do convite:** ${convite.url}\n` +
                `**Qtd. de usos:** \`${quantidadeUsos}\``;

            await interaction.user.send({ content: textoFinal });

            const canalLogId = '1529612706624176292';
            const canalLog = interaction.client.channels.cache.get(canalLogId);

            if (canalLog) {
                const embedLog = new EmbedBuilder()
                    .setTitle('📋 | NOVO CONVITE GERADO (LOG)')
                    .setColor(0x3498DB)
                    .addFields(
                        { name: '🔑 | Código Autenticador:', value: `\`${codigoAutenticador}\``, inline: true },
                        { name: '🔗 | Link:', value: `${convite.url}`, inline: true },
                        { name: '🔢 | Qtd. de Usos:', value: `\`${quantidadeUsos}\``, inline: true },
                        { name: '⏳ | Validade:', value: `\`${minutos} minuto(s)\``, inline: true },
                        { name: '👮 | Solicitante:', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                        { name: '📝 | Motivo:', value: `> ${motivo}` }
                    )
                    .setTimestamp();

                await canalLog.send({ embeds: [embedLog] });
            }

        } catch (error) {
            console.error('Erro ao gerar convite ou enviar DM/log:', error);
            try {
                await interaction.followUp({ 
                    content: '❌ Não foi possível enviar a mensagem no seu privado. Verifique se suas mensagens diretas (DMs) estão abertas para membros deste servidor.', 
                    ephemeral: true 
                });
            } catch (e) {}
        }
    }
};