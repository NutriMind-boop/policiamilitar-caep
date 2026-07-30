const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('emitir-registros')
        .setDescription('Painel da Secretaria da Segurança Pública para emissão de registros.'),
    
    async execute(interaction) {
        // Se for o comando de barra, envia o painel
        if (interaction.isChatInputCommand()) {
            const embed = new EmbedBuilder()
                .setColor(0xE74C3C) // Vermelho estilo Polícia Militar
                .setTitle('Secretaria da Segurança Pública | Registro de boletins')
                .setDescription('• Utilize o botão abaixo para emitir um boletim interno ou certificado de curso. Eles são enviados de maneira automática, e os caracteres informados nos campos ficam salvos até que o boletim seja enviado!')
                .setThumbnail('https://cdn.discordapp.com/attachments/1502291744228769867/1532149715842629722/image.png?ex=6a6c75de&is=6a6b245e&hm=53ff2d2deb39c47ba8b14957d16b140dfecfbbc3669fe167c39b4afd9ee45b5a')
                .setFooter({ text: 'Secretaria da Segurança Pública - Polícia Militar' })
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('btn_boletim_interno')
                        .setLabel('Boletim Interno')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('📝'),

                    new ButtonBuilder()
                        .setCustomId('btn_emitir_certificado')
                        .setLabel('Emitir certificado')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📜')
                );

            return await interaction.reply({ embeds: [embed], components: [row] });
        }

        // Se for acionado pelo botão de certificado do painel
        if (interaction.isButton() && interaction.customId === 'btn_emitir_certificado') {
            const cargoPermitidoId = '1502369295383138395';

            // Verifica se o usuário possui o cargo obrigatório
            if (!interaction.member.roles.cache.has(cargoPermitidoId)) {
                return await interaction.reply({
                    content: '❌ Você não possui permissão para emitir certificados. Apenas membros autorizados podem utilizar esta função.',
                    ephemeral: true
                });
            }

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
                .setPlaceholder('Ex: Cabo PM Jon Carrera, R.E: 237 | Cabo PM Kilian Silva, R.E: 818')
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

            const canalId = '1532396187322290256';
            const canal = interaction.client.channels.cache.get(canalId);

            if (!canal) {
                return await interaction.editReply({ content: '❌ Canal de destino dos certificados não foi encontrado!' });
            }

            const embedCertificado = new EmbedBuilder()
                .setTitle('Polícia Militar | Certificado - SSP/1032')
                .setColor(0x990000)
                .setThumbnail('https://cdn.discordapp.com/attachments/1502291744228769867/1532397317800333362/image.png')
                .addFields(
                    { name: '📁 | 1º INSTRUTOR DO CURSO:', value: `> ${instrutorCard => instrutorCurso}` }, // Ajustado abaixo para garantir a variável correta
                    { name: '📁 | 1º INSTRUTOR DO CURSO:', value: `> ${instrutorCurso}` },
                    { name: '📁 | 2º CURSO REALIZADO:', value: `> ${cursoRealizado}` },
                    { name: '📁 | 3º POLICIAIS PARTICIPANTES:', value: `${policiaisParticipantes.split('\n').map(p => `> ${p}`).join('\n')}` },
                    { name: '📁 | 4º OBSERVAÇÃO:', value: `> ${observacao}` },
                    { name: '👮 | Instrutor:', value: `${interaction.user}` }
                )
                .setFooter({ text: 'Secretaria da Segurança Pública | Polícia Militar' })
                .setTimestamp();

            await canal.send({ embeds: [embedCertificado] });

            return await interaction.editReply({ content: '✅ Certificado emitido e enviado com sucesso para o canal!' });
        }
    }
};