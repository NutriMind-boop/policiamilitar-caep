const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('certificado')
        .setDescription('Painel ou comando para emitir certificado de curso da Polícia Militar'),

    async execute(interaction) {
        // Se for executado como comando de barra (/certificado), envia o painel com o botão
        if (interaction.isChatInputCommand()) {
            const embedPainel = new EmbedBuilder()
                .setTitle('⚖️ POLÍCIA MILITAR | EMISSÃO DE CERTIFICADOS')
                .setDescription('Clique no botão abaixo para preencher os dados e emitir um novo certificado para os policiais.')
                .setColor(0x990000);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_certificado')
                    .setLabel('Emitir Certificado')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📁')
            );

            return await interaction.reply({ embeds: [embedPainel], components: [row], ephemeral: true });
        }

        // Se for acionado pelo botão, abre o Modal (Painel de preenchimento)
        if (interaction.isButton() && interaction.customId === 'btn_certificado') {
            const modal = new ModalBuilder()
                .setCustomId('modal_certificado')
                .setTitle('Emitir Certificado de Curso');

            const instrutorInput = new TextInputBuilder()
                .setCustomId('instrutor_curso')
                .setLabel('1º INSTRUTOR DO CURSO')
                .setPlaceholder('Ex: Sub Tenente QPPM Kiyoshi Yamazaki, R.E: 316')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const cursoInput = new TextInputBuilder()
                .setCustomId('curso_realizado')
                .setLabel('2º CURSO REALIZADO')
                .setPlaceholder('Ex: SAT A')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const policiaisInput = new TextInputBuilder()
                .setCustomId('policiais_participantes')
                .setLabel('3º POLICIAIS PARTICIPANTES')
                .setPlaceholder('Ex: Cabo PM Jon Carrera, R.E: 237\nCabo PM Kilian Silva, R.E: 818')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            const observacaoInput = new TextInputBuilder()
                .setCustomId('observacao')
                .setLabel('4º OBSERVAÇÃO')
                .setPlaceholder('Ex: Todos citados estão aptos a receberem o certificado')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(instrutorInput),
                new ActionRowBuilder().addComponents(cursoInput),
                new ActionRowBuilder().addComponents(policiaisInput),
                new ActionRowBuilder().addComponents(observacaoInput)
            );

            return await interaction.showModal(modal);
        }
    },

    async handleModal(interaction) {
        if (interaction.customId === 'modal_certificado') {
            await interaction.deferReply({ ephemeral: true });

            const instrutorCurso = interaction.fields.getTextInputValue('instrutor_curso');
            const cursoRealizado = interaction.fields.getTextInputValue('curso_realizado');
            const policiaisParticipantes = interaction.fields.getTextInputValue('policiais_participantes');
            const observacao = interaction.fields.getTextInputValue('observacao');

            // Canal de destino configurado
            const canalId = '1532396187322290256';
            const canal = interaction.client.channels.cache.get(canalId);

            if (!canal) {
                return await interaction.editReply({ content: '❌ Canal de destino dos certificados não foi encontrado!' });
            }

            // Montando o Embed idêntico ao modelo da sua imagem
            const embedCertificado = new EmbedBuilder()
                .setTitle('Polícia Militar | Certificado - SSP/1032')
                .setColor(0x990000) // Tarja vermelha lateral
                .setThumbnail('https://cdn.discordapp.com/attachments/1502291744228769867/1532397317800333362/image.png') // Brasão no canto superior direito
                .addFields(
                    { name: '📁 | 1º INSTRUTOR DO CURSO:', value: `> ${instrutorCurso}` },
                    { name: '📁 | 2º CURSO REALIZADO:', value: `> ${cursoRealizado}` },
                    { name: '📁 | 3º POLICIAIS PARTICIPANTES:', value: `${policiaisParticipantes.split('\n').map(p => `> ${p}`).join('\n')}` },
                    { name: '📁 | 4º OBSERVAÇÃO:', value: `> ${observacao}` },
                    { name: '👮 | Instrutor:', value: `${interaction.user}` } // Marca automaticamente quem emitiu
                )
                .setFooter({ text: 'Secretaria da Segurança Pública | Polícia Militar' })
                .setTimestamp();

            // Envia para o canal correto
            await canal.send({ embeds: [embedCertificado] });

            return await interaction.editReply({ content: '✅ Certificado emitido e enviado com sucesso para o canal!' });
        }
    }
};