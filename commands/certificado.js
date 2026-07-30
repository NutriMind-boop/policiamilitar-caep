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
                    .setLabel('Emitir certificado')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📜')
            );

            return await interaction.reply({ embeds: [embedPainel], components: [row] });
        }

        // Se for acionado pelo botão, abre o Modal (Painel de preenchimento)
        if (interaction.isButton() && interaction.customId === 'btn_certificado') {
            const cargoPermitidoId = '1502369295383138395';

            // Verifica se o usuário possui o cargo obrigatório para abrir o modal
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

            // Canal de destino configurado
            const canalId = '1532396187322290256';
            const canal = interaction.client.channels.cache.get(canalId);

            if (!canal) {
                return await interaction.editReply({ content: '❌ Canal de destino dos certificados não foi encontrado!' });
            }

            // Conta os certificados existentes no canal para gerar o próximo número sequencial crescente
            let numeroSequencial = 1;
            try {
                const mensagens = await canal.messages.fetch({ limit: 100 });
                const certificadosExistentes = mensagens.filter(m => m.embeds.length > 0 && m.embeds[0].title && m.embeds[0].title.includes('Certificado'));
                numeroSequencial = certificadosExistentes.size + 1;
            } catch (error) {
                console.error('Erro ao buscar mensagens para o contador:', error);
            }

            // Se você quiser que comece a partir de 1032 e vá subindo (1033, 1034...), basta somar o valor base. 
            // Se quiser do 001 puro, remova o "+ 1031" e deixe apenas `numeroSequencial`.
            const numeroFinal = 1031 + numeroSequencial; 
            const numeroFormatado = String(numeroFinal).padStart(4, '0'); // Formata com 4 dígitos (ex: 1032, 1033) ou use padStart(3, '0')

            // Montando o Embed com o número sequencial dinâmico
            const embedCertificado = new EmbedBuilder()
                .setTitle(`Polícia Militar | Certificado - SSP/${numeroFormatado}`)
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

            // Envia para o canal correto mencionando o cargo correto junto com o embed
            await canal.send({ 
                content: `<@&1532442931577753621>`, 
                embeds: [embedCertificado] 
            });

            return await interaction.editReply({ content: `✅ Certificado nº ${numeroFormatado} emitido e enviado com sucesso para o canal!` });
        }
    }
};