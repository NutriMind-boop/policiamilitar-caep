const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('painelponto')
        .setDescription('Envia o painel oficial de controle de ponto da equipe'),

    async execute(interaction) {
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: '❌ Você precisa ser administrador para enviar este painel.', ephemeral: true });
        }

        const dataAtualStr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

        const embedPainel = new EmbedBuilder()
            .setTitle('CONTROLE DE PONTO — CAEP')
            .setColor(0x2B2D31)
            .setDescription(
                `Prezado policial, este painel tem como finalidade realizar o registro e gerenciamento do ponto operacional da equipe.\n\n` +
                `O registro deverá ser preenchido com responsabilidade e atenção, considerando os dados corretos da viatura e dos integrantes da equipe.\n\n` +
                `As informações registradas serão encaminhadas para o canal correspondente, auxiliando no controle de tempo de patrulhamento.\n\n` +
                `📌 **Orientações:**\n` +
                `• Preencha os dados da viatura e da equipe corretamente;\n` +
                `• Utilize o padrão correto de Graduação, Nome e R:E;\n` +
                `• Utilize o botão de observação na mensagem do ponto caso ocorra alguma alteração durante o turno.\n\n` +
                `⚠️ **Atenção:**\n` +
                `Após o preenchimento, revise as informações antes de enviar. Utilize o botão abaixo para iniciar o seu ponto.`
            )
            .setFooter({ text: `CAEP — Sistema de Controle Operacional • ${dataAtualStr}` });

        // Botão de Iniciar Ponto sempre fixo e disponível para todos a qualquer momento
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('abrir_modal_ponto_painel')
                .setLabel('Iniciar Ponto')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📋')
        );

        await interaction.channel.send({ embeds: [embedPainel], components: [row] });
        await interaction.reply({ content: '✅ Painel de ponto enviado com sucesso neste canal!', ephemeral: true });
    },
};