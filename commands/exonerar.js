const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, UserSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('exonerar')
        .setDescription('Exonera múltiplos policiais do servidor')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('modal_exonerar_dados')
            .setTitle('PAINEL DE EXONERAÇÃO | PMESP');

        const motivoInput = new TextInputBuilder()
            .setCustomId('motivo_exoneracao')
            .setLabel('INFORME O MOTIVO (MÍN. 10 CARACTERES)')
            .setPlaceholder('Ex: Abandono de posto')
            .setStyle(TextInputStyle.Paragraph)
            .setMinLength(10)
            .setRequired(true);

        const unidadeInput = new TextInputBuilder()
            .setCustomId('unidade_exoneracao')
            .setLabel('INFORME A UNIDADE')
            .setPlaceholder('Ex: CAEP OESTE')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(motivoInput),
            new ActionRowBuilder().addComponents(unidadeInput)
        );

        return await interaction.showModal(modal);
    },

    async handleModal(interaction) {
        if (!interaction.customId || interaction.customId !== 'modal_exonerar_dados') return;

        const motivo = interaction.fields.getTextInputValue('motivo_exoneracao');
        const unidade = interaction.fields.getTextInputValue('unidade_exoneracao');

        const embed = new EmbedBuilder()
            .setTitle('PAINEL DE EXONERAÇÃO | PMESP')
            .setColor(0xE74C3C)
            .setDescription(
                `**Motivo:** \`${motivo}\`\n` +
                `**Unidade:** \`${unidade}\`\n\n` +
                `▼ **Selecione os usuários no menu abaixo:**\n` +
                `🔹 Secretaria da Segurança Pública – Polícia Militar`
            );

        const selectMenu = new UserSelectMenuBuilder()
            .setCustomId('select_policiais_exonerar')
            .setPlaceholder('Selecione os policiais para exonerar (Máx 20)')
            .setMinValues(1)
            .setMaxValues(20);

        const rowSelect = new ActionRowBuilder().addComponents(selectMenu);

        const botaoConfirmar = new ButtonBuilder()
            .setCustomId('btn_confirmar_exoneracao')
            .setLabel('Confirmar exoneração')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('⚠️');

        const rowButton = new ActionRowBuilder().addComponents(botaoConfirmar);

        await interaction.reply({
            embeds: [embed],
            components: [rowSelect, rowButton],
            ephemeral: true
        });
    },

    async handleSelect(interaction) {
        if (!interaction.customId || interaction.customId !== 'select_policiais_exonerar') return;
        await interaction.deferUpdate();
    },

    async handleButton(interaction) {
        if (!interaction.customId || interaction.customId !== 'btn_confirmar_exoneracao') return;

        const message = interaction.message;
        const embedOriginal = message.embeds[0];
        
        if (!embedOriginal) {
            return await interaction.reply({ content: '❌ Erro ao recuperar os dados da exoneração.', ephemeral: true });
        }

        const descricao = embedOriginal.description;
        const motivoMatch = descricao.match(/\*\*Motivo:\*\* `([^`]+)`/);
        const unidadeMatch = descricao.match(/\*\*Unidade:\*\* `([^`]+)`/);

        const motivo = motivoMatch ? motivoMatch[1] : 'Sem motivo';
        const unidade = unidadeMatch ? unidadeMatch[1] : 'Sem unidade';

        const stateStore = interaction.client.exonerarSelections || (interaction.client.exonerarSelections = new Map());
        const selectedUsers = stateStore.get(interaction.user.id) || [];

        if (selectedUsers.length === 0) {
            return await interaction.reply({ content: '❌ Nenhum policial foi selecionado no menu!', ephemeral: true });
        }

        await interaction.update({
            content: '⏳ Processando exoneração e enviando comunicados...',
            embeds: [],
            components: []
        });

        let sucessos = 0;
        let falhas = 0;
        const listaExonerados = [];

        for (const userId of selectedUsers) {
            try {
                const membro = await interaction.guild.members.fetch(userId).catch(() => null);
                if (membro && membro.kickable) {
                    // Envia a mensagem no privado (DM) antes de expulsar
                    try {
                        const embedDm = new EmbedBuilder()
                            .setTitle('COMUNICADO DE EXONERAÇÃO')
                            .setColor(0xE74C3C)
                            .setDescription(`${membro} Você foi exonerado da policia militar de Jaguaré RP®!`)
                            .addFields(
                                { name: 'Motivo:', value: `\`${motivo}\`` }
                            )
                            .setFooter({ text: 'Secretaria da Segurança Pública – Polícia Militar' });

                        await membro.send({ embeds: [embedDm] });
                    } catch (err) {
                        // Caso o membro esteja com a DM fechada, o bot apenas segue para expulsar
                    }

                    // Expulsa o membro
                    await membro.kick(motivo);
                    sucessos++;
                    listaExonerados.push(`${membro.user.tag} (\`${membro.id}\`)`);
                } else {
                    falhas++;
                }
            } catch (err) {
                falhas++;
            }
        }

        stateStore.delete(interaction.user.id);

        const embedResultado = new EmbedBuilder()
            .setTitle('⚖️ | RELATÓRIO DE EXONERAÇÃO EM MASSA')
            .setColor(0xE74C3C)
            .addFields(
                { name: '🏢 | Unidade:', value: `\`${unidade}\``, inline: true },
                { name: '👮 | Responsável:', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                { name: '📝 | Motivo:', value: `> ${motivo}` },
                { name: '📊 | Estatísticas:', value: `✅ Sucessos: **${sucessos}**\n❌ Falhas/Não puderam ser expulsos: **${falhas}**` }
            )
            .setTimestamp();

        if (listaExonerados.length > 0) {
            embedResultado.addFields({ name: '👤 | Policiais Exonerados:', value: listaExonerados.join('\n').substring(0, 1024) });
        }

        await interaction.editReply({
            content: '✅ Processo de exoneração finalizado com sucesso!',
            embeds: [embedResultado],
            components: []
        });

        const canalLogId = '1529612706624176292';
        const canalLog = interaction.client.channels.cache.get(canalLogId);

        if (canalLog) {
            await canalLog.send({ embeds: [embedResultado] });
        }
    },

    async handleInteraction(interaction) {
        if (interaction.isModalSubmit() && interaction.customId === 'modal_exonerar_dados') {
            await this.handleModal(interaction);
        } else if (interaction.isUserSelectMenu() && interaction.customId === 'select_policiais_exonerar') {
            const stateStore = interaction.client.exonerarSelections || (interaction.client.exonerarSelections = new Map());
            stateStore.set(interaction.user.id, interaction.values);
            await this.handleSelect(interaction);
        } else if (interaction.isButton() && interaction.customId === 'btn_confirmar_exoneracao') {
            await this.handleButton(interaction);
        }
    }
};