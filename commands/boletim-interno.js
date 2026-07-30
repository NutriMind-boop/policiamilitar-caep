const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('boletim-interno')
        .setDescription('Envia o painel de emissão de Boletim Interno e Certificados'),

    async execute(interaction) {
        // Se for acionado pelo comando /boletim-interno, envia o painel fixo com os dois botões
        if (interaction.isChatInputCommand()) {
            const embedPainel = new EmbedBuilder()
                .setColor(0xE74C3C)
                .setTitle('Secretaria da Segurança Pública | Registro de boletins')
                .setDescription('• Utilize o botão abaixo para emitir um boletim interno ou certificado de curso. Eles são enviados de maneira automática, e os caracteres informados nos campos ficam salvos até que o boletim seja enviado!')
                .setThumbnail('https://cdn.discordapp.com/attachments/1502291744228769867/1532388887920644147/ChatGPT_Image_11_de_jul._de_2026__09_07_19-removebg-preview.png')
                .setFooter({ text: 'Secretaria da Segurança Pública - Polícia Militar' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
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

            return await interaction.reply({ embeds: [embedPainel], components: [row] });
        }

        // Se for acionado pelo clique do botão "Boletim Interno" no painel
        if (interaction.isButton() && interaction.customId === 'btn_boletim_interno') {
            const modal = new ModalBuilder()
                .setCustomId('modal_boletim_interno')
                .setTitle('Emissão de Boletim Interno');

            const parte1Input = new TextInputBuilder()
                .setCustomId('parte_1')
                .setLabel('1º PARTE: Serviços Diários')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Ex: Boletim Interno Nº01/26')
                .setRequired(true);

            const parte2Input = new TextInputBuilder()
                .setCustomId('parte_2')
                .setLabel('2º PARTE: Instrução e Operações')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Ex: Boletim Informativo – Integração')
                .setRequired(true);

            const parte3Input = new TextInputBuilder()
                .setCustomId('parte_3')
                .setLabel('3º PARTE: Assuntos Gerais e Admin.')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Prezados, Eu, 2º Tenente...')
                .setRequired(true);

            const parte4Input = new TextInputBuilder()
                .setCustomId('parte_4')
                .setLabel('4º PARTE: Justiça e Disciplina')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Ex: Oficia-se, Cumpra-se, Publique-se.')
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(parte1Input),
                new ActionRowBuilder().addComponents(parte2Input),
                new ActionRowBuilder().addComponents(parte3Input),
                new ActionRowBuilder().addComponents(parte4Input)
            );

            return await interaction.showModal(modal);
        }
    },

    async handleModal(interaction) {
        if (interaction.customId !== 'modal_boletim_interno') return;

        const p1 = interaction.fields.getTextInputValue('parte_1');
        const p2 = interaction.fields.getTextInputValue('parte_2');
        const p3 = interaction.fields.getTextInputValue('parte_3');
        const p4 = interaction.fields.getTextInputValue('parte_4');
        const autor = interaction.user;

        const embed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle('Boletim Interno | Cia AEP')
            .setDescription(
                `📁 | **1º PARTE SERVIÇOS DIÁRIOS:**\n${p1}\n\n` +
                `📁 | **2º PARTE INSTRUÇÃO E OPERAÇÕES POLICIAIS MILITARES:**\n${p2}\n\n` +
                `📁 | **3º PARTE ASSUNTOS GERAIS E ADMINISTRATIVOS:**\n${p3}\n\n` +
                `📁 | **4º PARTE JUSTIÇA E DISCIPLINA:**\n${p4}\n\n` +
                `👮 | **Emitido por:**\n<@${autor.id}>`
            )
            .setThumbnail('https://cdn.discordapp.com/attachments/1502291744228769867/1532388887920644147/ChatGPT_Image_11_de_jul._de_2026__09_07_19-removebg-preview.png?ex=6a6cabdd&is=6a6b5a5d&hm=e0f27e7b4d414eae522f52faa6acd430631fc9cbd8630872f80e3c584eb75553')
            .setFooter({ text: 'Secretaria da Segurança Pública - Polícia Militar' })
            .setTimestamp();

        const canalId = '1502358463630807231';
        const canalDestino = interaction.guild.channels.cache.get(canalId);

        if (!canalDestino) {
            return await interaction.reply({ 
                content: '❌ Erro: O canal de destino do boletim não foi encontrado pelo bot.', 
                ephemeral: true 
            });
        }

        // Envia a menção do cargo junto com o embed do boletim interno
        await canalDestino.send({ 
            content: `<@&1525502536990064880>`, 
            embeds: [embed] 
        });

        return await interaction.reply({ 
            content: '✅ Boletim interno emitido e enviado com sucesso para o canal oficial!', 
            ephemeral: true 
        });
    }
};