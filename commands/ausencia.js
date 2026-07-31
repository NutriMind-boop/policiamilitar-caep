const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('painel-ausencia')
        .setDescription('Envia o painel para registrar ausência'),

    async execute(interaction) {
        if (!interaction.member.permissions.has('ManageMessages')) {
            return interaction.reply({ content: '❌ Você não tem permissão para usar este comando!', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('SSP | Registrar Ausência')
            .setDescription('• Para registrar uma ausência basta preencher as informações clicando no botão abaixo:')
            .setImage('https://cdn.discordapp.com/attachments/1502291744228769867/1532149715842629722/image.png');

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_abrir_ausencia')
                    .setLabel('Registrar Ausência')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('📄')
            );

        await interaction.reply({ content: '✅ Painel de ausência enviado com sucesso!', ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [row] });
    },

    async handleInteraction(interaction) {
        // 1. Abre o Modal ao clicar no botão
        if (interaction.isButton() && interaction.customId === 'btn_abrir_ausencia') {
            const modal = new ModalBuilder()
                .setCustomId('modal_registrar_ausencia')
                .setTitle('SSP | Registrar Ausência');

            const duracaoInput = new TextInputBuilder()
                .setCustomId('duracao_ausencia')
                .setLabel('Duração da ausência (Apenas números/dias):')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Ex: 2 (ou 2 dias)')
                .setRequired(true);

            const motivoInput = new TextInputBuilder()
                .setCustomId('motivo_ausencia')
                .setLabel('Motivo:')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Descreva o motivo da ausência...')
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(duracaoInput),
                new ActionRowBuilder().addComponents(motivoInput)
            );

            return await interaction.showModal(modal);
        }

        // 2. Processa o envio do Modal
        if (interaction.isModalSubmit() && interaction.customId === 'modal_registrar_ausencia') {
            const duracaoTexto = interaction.fields.getTextInputValue('duracao_ausencia');
            const motivo = interaction.fields.getTextInputValue('motivo_ausencia');
            const cargoId = '1532717852388229180';
            const canalLogsId = '1502356441640734853';

            // Extrai apenas os números da duração informada (ex: "2 dias" vira o número 2)
            const matchDias = duracaoTexto.match(/\d+/);
            const qtdDias = matchDias ? parseInt(matchDias[0]) : 1;

            // Calcula a data de retorno somando os dias à data atual
            const dataRetorno = new Date();
            dataRetorno.setDate(dataRetorno.getDate() + qtdDias);
            const dataFormatada = dataRetorno.toLocaleDateString('pt-BR');

            // Atribui o cargo automaticamente
            try {
                await interaction.member.roles.add(cargoId);
            } catch (error) {
                console.error('❌ Erro ao adicionar o cargo de ausência:', error);
            }

            // Monta o Embed com todos os campos destacados e nome clicável
            const registroEmbed = new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle('Registro de Ausência')
                .setDescription(
                    `👮 | **Registrado por:** \`${interaction.member.displayName}\` (${interaction.user})\n` +
                    `⏱️ | **Duração da ausência:** \`${qtdDias} Dia(s)\`\n` +
                    `📅 | **Data de retorno:** \`${dataFormatada}\`\n` +
                    `📝 | **Motivo:** \`${motivo}\``
                )
                .setFooter({ text: 'Secretaria da Segurança Pública - Polícia Militar' })
                .setTimestamp();

            // Busca o canal de destino específico pelo ID
            const canalDestino = await interaction.guild.channels.fetch(canalLogsId).catch(() => null);
            if (canalDestino) {
                await canalDestino.send({ embeds: [registroEmbed] });
            } else {
                console.error('❌ Não foi possível encontrar o canal de destino da ausência!');
            }

            // Responde de forma privada para o usuário avisando que deu certo
            await interaction.reply({ content: '✅ Ausência registrada, cargo aplicado e encaminhada para o canal de registros com sucesso!', ephemeral: true });
            return true;
        }

        return false;
    }
};