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
        const stateStore = interaction.client.exonerarSelections || (interaction.client.exonerarSelections = new Map());
        stateStore.set(interaction.user.id, interaction.values);
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
        const embedsLog = [];

        for (const userId of selectedUsers) {
            try {
                const membro = await interaction.guild.members.fetch(userId).catch(() => null);
                if (membro && membro.kickable) {
                    // Envia DM de comunicado
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
                        // Ignora se estiver com DM fechada
                    }

                    // Pega a lista de cargos (removendo o @everyone) ordenados por hierarquia
                    const cargos = membro.roles.cache
                        .filter(r => r.id !== interaction.guild.id)
                        .sort((a, b) => b.position - a.position)
                        .map(r => `<@&${r.id}>`)
                        .join(', ') || 'Nenhum cargo';

                    // Formata a data de entrada no servidor
                    const joinedAtTimestamp = membro.joinedAt ? `<t:${Math.floor(membro.joinedAt.getTime() / 1000)}:d> às <t:${Math.floor(membro.joinedAt.getTime() / 1000)}:t>` : 'Desconhecida';
                    const membrosAtuaisCount = interaction.guild.memberCount;

                    // Cria o embed de log individual idêntico ao modelo da imagem solicitada
                    const embedLogIndividual = new EmbedBuilder()
                        .setColor(0xE74C3C)
                        .setAuthor({ 
                            name: `${interaction.user.tag} | ${interaction.user.id}`, 
                            iconURL: interaction.user.displayAvatarURL() 
                        })
                        .setTitle('Polícia Militar • Jaguaré RP')
                        .setDescription(`> **${membro.user.tag}** Saiu do servidor!`)
                        .setThumbnail(membro.user.displayAvatarURL({ dynamic: true, size: 512 }))
                        .addFields(
                            { name: '👤 | Membros atuais:', value: `\`#${membrosAtuaisCount} membros\``, inline: true },
                            { name: '🆔 | Discord ID:', value: `\`${membro.id}\``, inline: true },
                            { name: '📅 | Membro desde:', value: `\`${joinedAtTimestamp}\``, inline: false },
                            { name: '🏢 | Unidade:', value: `\`${unidade}\``, inline: true },
                            { name: '📝 | Motivo:', value: `\`${motivo}\``, inline: true },
                            { name: '👥 | Cargos:', value: cargos }
                        )
                        .setFooter({ text: 'Secretaria da Segurança Pública – Polícia Militar' })
                        .setTimestamp();

                    embedsLog.push(embedLogIndividual);

                    // Expulsa o membro
                    await membro.kick(motivo);
                    sucessos++;
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

        await interaction.editReply({
            content: '✅ Processo de exoneração finalizado com sucesso!',
            embeds: [embedResultado],
            components: []
        });

        // Envia os logs detalhados para o canal configurado (1514958506451538011)
        const canalLogId = '1514958506451538011';
        const canalLog = interaction.client.channels.cache.get(canalLogId);

        if (canalLog) {
            for (const embedIndividual of embedsLog) {
                await canalLog.send({ embeds: [embedIndividual] });
            }
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