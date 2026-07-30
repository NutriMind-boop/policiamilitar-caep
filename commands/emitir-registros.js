const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('emitir-registros')
        .setDescription('Painel da Secretaria da Segurança Pública para emissão de registros.'),
    
    async execute(interaction) {
        // Criação do Embed com a imagem em miniatura (Thumbnail) à direita
        const embed = new EmbedBuilder()
            .setColor(0xE74C3C) // Vermelho estilo Polícia Militar
            .setTitle('Secretaria da Segurança Pública | Registro de boletins')
            .setDescription('• Utilize o botão abaixo para emitir um boletim interno ou certificado de curso. Eles são enviados de maneira automática, e os caracteres informados nos campos ficam salvos até que o boletim seja enviado!')
            .setThumbnail('https://cdn.discordapp.com/attachments/1502291744228769867/1532149715842629722/image.png?ex=6a6c75de&is=6a6b245e&hm=53ff2d2deb39c47ba8b14957d16b140dfecfbbc3669fe167c39b4afd9ee45b5a')
            .setFooter({ text: 'Secretaria da Segurança Pública - Polícia Militar' })
            .setTimestamp();

        // Criação dos Botões (Boletim Interno e Emitir Certificado)
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_boletim_interno')
                    .setLabel('Boletim Interno')
                    .setStyle(ButtonStyle.Success) // Botão Verde
                    .setEmoji('📝'),

                new ButtonBuilder()
                    .setCustomId('btn_emitir_certificado')
                    .setLabel('Emitir certificado')
                    .setStyle(ButtonStyle.Secondary) // Botão Cinza/Neutro
                    .setEmoji('📜')
            );

        // Envia o painel no canal
        await interaction.reply({ embeds: [embed], components: [row] });
    },
};