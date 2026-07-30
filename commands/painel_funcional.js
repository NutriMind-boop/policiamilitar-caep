const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');

const selecoesUnidade = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('painel-funcional')
        .setDescription('Envia o painel de solicitação de identificação funcional')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('CAEP — PAINEL DE SOLICITAÇÃO FUNCIONAL')
            .setColor(0xE74C3C)
            .setDescription(
                'Este painel destina-se exclusivamente ao processamento de solicitações de identificação funcional.\n\n' +
                'O solicitante deverá preencher corretamente todos os campos exigidos, sob responsabilidade das informações fornecidas, para análise e validação do pedido pelo setor competente.\n\n' +
                'O link de convite encaminhado contém um código de autenticação na parte inferior.\n' +
                'É obrigatório copiar este código e inseri-lo no campo correspondente durante o preenchimento da solicitação funcional.\n\n' +
                'Solicitações com dados incompletos, inconsistentes ou divergentes estarão sujeitas à recusa imediata.'
            )
            .setThumbnail('https://cdn.discordapp.com/attachments/1502291744228769867/1532149715842629722/image.png?ex=6a6c75de&is=6a6b245e&hm=53ff2d2deb39c47ba8b14957d16b140dfecfbbc3669fe167c39b4afd9ee45b5a') // Imagem no canto direito
            .setImage('https://cdn.discordapp.com/attachments/1502291744228769867/1532150015399690400/ChatGPT_Image_29_de_jul._de_2026_19_17_35.png?ex=6a6c7625&is=6a6b24a5&hm=6e9a87d78e9fc7c877bf46263ed73b12cc6626b01719a9a354cab446e2bdbeb7'); // Imagem no rodapé

        const botao = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_abrir_funcional')
                .setLabel('Solicitar Funcional')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('📄')
        );

        await interaction.reply({ content: '✅ Painel gerado com sucesso!', ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [botao] });
    },

    async handleInteraction(interaction) {
        if (interaction.isButton() && interaction.customId === 'btn_abrir_funcional') {
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_unidade_funcional')
                .setPlaceholder('Selecione a sua unidade')
                .addOptions([
                    {
                        label: 'CAEP',
                        description: 'Companhia de Ações Especiais de Polícia',
                        value: 'caep_1525502536990064880',
                        emoji: '🛡️'
                    }
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            return await interaction.reply({
                content: '⚠️ **Selecione a unidade correspondente abaixo para prosseguir com a solicitação:**',
                components: [row],
                ephemeral: true
            });
        }

        if (interaction.isStringSelectMenu() && interaction.customId === 'select_unidade_funcional') {
            const valorSelecionado = interaction.values[0];
            selecoesUnidade.set(interaction.user.id, valorSelecionado);

            const modal = new ModalBuilder()
                .setCustomId('modal_solicitar_funcional')
                .setTitle('SOLICITAÇÃO DE IDENTIFICAÇÃO FUNCIONAL');

            const graduacaoInput = new TextInputBuilder()
                .setCustomId('funcional_graduacao')
                .setLabel('GRADUAÇÃO')
                .setPlaceholder('Ex: Soldado / Tenente')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const nomeReInput = new TextInputBuilder()
                .setCustomId('funcional_nome_re')
                .setLabel('NOME E R.E')
                .setPlaceholder('Ex: Gabriel - 123456')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(graduacaoInput),
                new ActionRowBuilder().addComponents(nomeReInput)
            );

            return await interaction.showModal(modal);
        }

        if (interaction.isModalSubmit() && interaction.customId === 'modal_solicitar_funcional') {
            const graduacao = interaction.fields.getTextInputValue('funcional_graduacao');
            const nomeRe = interaction.fields.getTextInputValue('funcional_nome_re');
            
            selecoesUnidade.delete(interaction.user.id);

            const unidadeNome = 'CAEP';
            const cargoId = '1525502536990064880';

            const embedLog = new EmbedBuilder()
                .setTitle('📥 | NOVA SOLICITAÇÃO FUNCIONAL')
                .setColor(0xE74C3C)
                .setAuthor({ name: `${interaction.user.tag} (${interaction.user.id})`, iconURL: interaction.user.displayAvatarURL() })
                .addFields(
                    { name: '🎖️ | Graduação:', value: `\`${graduacao}\``, inline: true },
                    { name: '👤 | Nome e R.E:', value: `\`${nomeRe}\``, inline: true },
                    { name: '🏢 | Unidade Selecionada:', value: `\`${unidadeNome}\``, inline: false },
                    { name: '🔑 | Cargo Vinculado:', value: `<@&${cargoId}> (\`${cargoId}\`)`, inline: false }
                )
                .setTimestamp()
                .setFooter({ text: 'Secretaria da Segurança Pública – Polícia Militar' });

            const canalAnaliseId = '1514958506451538011'; 
            const canalAnalise = interaction.client.channels.cache.get(canalAnaliseId);

            if (canalAnalise) {
                await canalAnalise.send({ embeds: [embedLog] });
            }

            return await interaction.reply({
                content: '✅ Sua solicitação funcional foi enviada com sucesso para análise do setor competente!',
                ephemeral: true
            });
        }
    }
};