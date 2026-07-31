const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');

const selecoesUnidade = new Map();
const CARGO_AUTORIZADO = '1502362863149518898';

// Lista de patentes para o menu de configuração
const PATENTES_OPCOES = [
    { label: 'Soldado 2ª Classe', value: 'patente_sd2', emoji: '⬛' },
    { label: 'Soldado 1ª Classe', value: 'patente_sd1', emoji: '🔹' },
    { label: 'Cabo', value: 'patente_cb', emoji: '🔹' },
    { label: '3º Sargento', value: 'patente_3sgt', emoji: '🔸' },
    { label: '2º Sargento', value: 'patente_2sgt', emoji: '🔸' },
    { label: '1º Sargento', value: 'patente_1sgt', emoji: '🔸' },
    { label: 'Subtenente', value: 'patente_subtenente', emoji: '⭐' },
    { label: 'Aspirante a Oficial', value: 'patente_aspirante', emoji: '⭐' },
    { label: '2º Tenente', value: 'patente_2ten', emoji: '⬛' },
    { label: '1º Tenente', value: 'patente_1ten', emoji: '⬛' },
    { label: 'Capitão', value: 'patente_cap', emoji: '⬛' },
    { label: 'Major', value: 'patente_maj', emoji: '👑' },
    { label: 'Tenente Coronel', value: 'patente_ten_cel', emoji: '👑' },
    { label: 'Coronel', value: 'patente_cel', emoji: '👑' }
];

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
            .setThumbnail('https://cdn.discordapp.com/attachments/1502291744228769867/1532149715842629722/image.png?ex=6a6c75de&is=6a6b245e&hm=53ff2d2deb39c47ba8b14957d16b140dfecfbbc3669fe167c39b4afd9ee45b5a')
            .setImage('https://cdn.discordapp.com/attachments/1502291744228769867/1532150015399690400/ChatGPT_Image_29_de_jul._de_2026_19_17_35.png?ex=6a6c7625&is=6a6b24a5&hm=6e9a87d78e9fc7c877bf46263ed73b12cc6626b01719a9a354cab446e2bdbeb7');

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
        try {
            // 1. Botão do painel que abre o menu de seleção de unidade
            if (interaction.isButton() && interaction.customId === 'btn_abrir_funcional') {
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_unidade_funcional')
                    .setPlaceholder('Selecione a sua unidade')
                    .addOptions([
                        {
                            label: 'CAEP',
                            description: 'CAEP - Companhia de Ações Especiais de Polícia',
                            value: 'CAEP - Companhia de Ações Especiais de Polícia|1525502536990064880',
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

            // 2. Menu de seleção da unidade que abre o modal
            if (interaction.isStringSelectMenu() && interaction.customId === 'select_unidade_funcional') {
                const valorSelecionado = interaction.values[0];
                selecoesUnidade.set(interaction.user.id, valorSelecionado);

                const modal = new ModalBuilder()
                    .setCustomId('modal_solicitar_funcional')
                    .setTitle('SOLICITAÇÃO DE IDENTIFICAÇÃO FUNCIONAL');

                const graduacaoInput = new TextInputBuilder()
                    .setCustomId('funcional_graduacao')
                    .setLabel('GRADUAÇÃO')
                    .setPlaceholder('Ex: Soldado 2ª Classe')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const nomeReInput = new TextInputBuilder()
                    .setCustomId('funcional_nome_re')
                    .setLabel('NOME E R.E')
                    .setPlaceholder('Ex: Gabriel Lima | 1776')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const codigoInput = new TextInputBuilder()
                    .setCustomId('funcional_codigo')
                    .setLabel('CÓDIGO DE AUTENTICAÇÃO DO CONVITE')
                    .setPlaceholder('Cole o código do convite aqui')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(graduacaoInput),
                    new ActionRowBuilder().addComponents(nomeReInput),
                    new ActionRowBuilder().addComponents(codigoInput)
                );

                return await interaction.showModal(modal);
            }

            // 3. Envio do formulário preenchido gerando o embed pendente e os 3 botões (Aprovar, Recusar, Configurar)
            if (interaction.isModalSubmit() && interaction.customId === 'modal_solicitar_funcional') {
                const graduacao = interaction.fields.getTextInputValue('funcional_graduacao');
                const nomeRe = interaction.fields.getTextInputValue('funcional_nome_re');
                const codigo = interaction.fields.getTextInputValue('funcional_codigo');
                
                const dadosUnidadeStr = selecoesUnidade.get(interaction.user.id) || 'CAEP - Companhia de Ações Especiais de Polícia|1525502536990064880';
                selecoesUnidade.delete(interaction.user.id);

                const [batalhaoNome] = dadosUnidadeStr.split('|');

                const embedLog = new EmbedBuilder()
                    .setTitle('Solicitação de funcional – (Pendente)')
                    .setColor(0xF1C40F) // Amarelo (Pendente)
                    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 512 }))
                    .setDescription(
                        `• **Nome e R.E:** \`${nomeRe}\`\n` +
                        `• **Batalhão:** \`${batalhaoNome}\`\n` +
                        `• **Graduação:** \`${graduacao}\`\n` +
                        `• **Código utilizado:** \`${codigo}\``
                    )
                    .addFields(
                        { name: '👤 | Solicitado por:', value: `${interaction.user}`, inline: true },
                        { name: '🛡️ | Analisado por:', value: `Aguardando análise...`, inline: true }
                    )
                    .setFooter({ text: 'Secretaria da Segurança Pública – Polícia Militar' })
                    .setTimestamp();

                const botoesAcao = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('btn_aprovar_funcional')
                        .setLabel('Aprovar')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✅'),
                    new ButtonBuilder()
                        .setCustomId('btn_recusar_funcional')
                        .setLabel('Recusar')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('❌'),
                    new ButtonBuilder()
                        .setCustomId('btn_configurar_patente')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('⚙️')
                );

                const canalLogId = '1512440035805499392'; 
                const canalLog = interaction.client.channels.cache.get(canalLogId);

                if (canalLog) {
                    await canalLog.send({ embeds: [embedLog], components: [botoesAcao] });
                }

                return await interaction.reply({
                    content: '✅ Sua solicitação funcional foi enviada e processada com sucesso!',
                    ephemeral: true
                });
            }

            // 4. Clique no botão de Configurar Patente (Engrenagem)
            if (interaction.isButton() && interaction.customId === 'btn_configurar_patente') {
                if (!interaction.member.roles.cache.has(CARGO_AUTORIZADO)) {
                    return await interaction.reply({ content: '❌ Você não tem permissão para configurar esta funcional!', ephemeral: true });
                }

                const selectPatente = new StringSelectMenuBuilder()
                    .setCustomId('select_patente_cargo')
                    .setPlaceholder('⭐ | Selecione a patente:')
                    .addOptions(PATENTES_OPCOES);

                const rowSelect = new ActionRowBuilder().addComponents(selectPatente);
                const rowVoltar = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('btn_voltar_painel')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔄')
                );

                return await interaction.update({
                    components: [rowSelect, rowVoltar]
                });
            }

            // 5. Botão de Voltar (setinha) para retornar aos botões originais do log
            if (interaction.isButton() && interaction.customId === 'btn_voltar_painel') {
                if (!interaction.member.roles.cache.has(CARGO_AUTORIZADO)) {
                    return await interaction.reply({ content: '❌ Sem permissão!', ephemeral: true });
                }

                const botoesAcao = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('btn_aprovar_funcional')
                        .setLabel('Aprovar')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✅'),
                    new ButtonBuilder()
                        .setCustomId('btn_recusar_funcional')
                        .setLabel('Recusar')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('❌'),
                    new ButtonBuilder()
                        .setCustomId('btn_configurar_patente')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('⚙️')
                );

                return await interaction.update({
                    components: [botoesAcao]
                });
            }

            // 6. Seleção da Patente no menu suspenso
            if (interaction.isStringSelectMenu() && interaction.customId === 'select_patente_cargo') {
                if (!interaction.member.roles.cache.has(CARGO_AUTORIZADO)) {
                    return await interaction.reply({ content: '❌ Sem permissão!', ephemeral: true });
                }

                const patenteEscolhida = interaction.values[0];
                
                return await interaction.reply({
                    content: `✅ Patente selecionada com sucesso!`,
                    ephemeral: true
                });
            }

            // 7. Tratamento dos botões Aprovar / Recusar restritos ao cargo específico
            if (interaction.isButton() && (interaction.customId === 'btn_aprovar_funcional' || interaction.customId === 'btn_recusar_funcional')) {
                if (!interaction.member.roles.cache.has(CARGO_AUTORIZADO)) {
                    return await interaction.reply({
                        content: '❌ Você não tem permissão para aprovar ou recusar esta funcional!',
                        ephemeral: true
                    });
                }

                await interaction.deferUpdate();

                const embedAtual = interaction.message.embeds[0];
                const originalEmbed = EmbedBuilder.from(embedAtual);
                const fields = originalEmbed.data.fields;

                const solicitadoPorField = fields.find(f => f.name.includes('Solicitado por'));
                const solicitanteIdMatch = solicitadoPorField ? solicitadoPorField.value.match(/<@!?(\d+)>/) : null;
                const solicitanteId = solicitanteIdMatch ? solicitanteIdMatch[1] : null;

                const cargoId = '1525502536990064880';

                if (interaction.customId === 'btn_aprovar_funcional') {
                    originalEmbed.setTitle('Solicitação de funcional – (Aprovada)');
                    originalEmbed.setColor(0x2ECC71); // Verde

                    if (solicitanteId) {
                        try {
                            const membroSolicitante = await interaction.guild.members.fetch(solicitanteId);
                            if (membroSolicitante && cargoId) {
                                await membroSolicitante.roles.add(cargoId).catch(() => {});
                            }
                        } catch (err) {}
                    }
                } else {
                    originalEmbed.setTitle('Solicitação de funcional – (Recusada)');
                    originalEmbed.setColor(0xE74C3C); // Vermelho
                }

                if (fields && fields[1]) {
                    fields[1].value = `${interaction.user}`;
                }

                await interaction.message.edit({
                    embeds: [originalEmbed],
                    components: []
                });

                return await interaction.followUp({
                    content: `✅ Ação registrada com sucesso por ${interaction.user}!`,
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Erro no handler do painel funcional:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ Ocorreu um erro ao processar esta ação.', ephemeral: true }).catch(() => {});
            }
        }
    }
};