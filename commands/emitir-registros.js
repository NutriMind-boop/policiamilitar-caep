const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('emitir-registros')
        .setDescription('Painel da Secretaria da Segurança Pública para emissão de registros.'),
    
    async execute(interaction) {
        // Se for o comando de barra, envia o painel principal com os botões corretos
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
                        .setCustomId('btn_certificado')
                        .setLabel('Emitir certificado')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📜')
                );

            return await interaction.reply({ embeds: [embed], components: [row] });
        }

        // Se o botão acionado for o de certificado, redireciona para o comando 'certificado' existente
        if (interaction.isButton() && interaction.customId === 'btn_certificado') {
            const certificadoCommand = interaction.client.commands.get('certificado');
            if (certificadoCommand) {
                return await certificadoCommand.execute(interaction);
            } else {
                return await interaction.reply({ 
                    content: '❌ O comando de certificado integrado não foi encontrado.', 
                    ephemeral: true 
                });
            }
        }
    }
};