const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, UserSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

let contadorAvaliacoes = 1;
const CANAL_LOG_ESTAGIO = '1529563658680799294';
const CARGO_PERMITIDO = '1502362884221571235';
const avaliacoesEmAndamento = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avaliar-estagio')
        .setDescription('Envia o painel de avaliação de estágio')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('CAEP — AVALIAÇÃO DE ESTÁGIO')
            .setColor(0xE74C3C)
            .setDescription(
                'Este painel destina-se ao processo de avaliação de estágio dos policiais.\n\n' +
                'Clique no botão abaixo para iniciar a avaliação selecionando o policial estagiário e preenchendo os critérios de desempenho.'
            )
            .setThumbnail('https://cdn.discordapp.com/attachments/1502291744228769867/1532149715842629722/image.png?ex=6a6c75de&is=6a6b245e&hm=53ff2d2deb39c47ba8b14957d16b140dfecfbbc3669fe167c39b4afd9ee45b5a');

        const botao = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_iniciar_avaliacao')
                .setLabel('Avaliar Policial')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('📋')
        );

        await interaction.reply({ content: '✅ Painel gerado com sucesso!', ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [botao] });
    },

    async handleInteraction(interaction) {
        try {
            if (interaction.isButton() && interaction.customId === 'btn_iniciar_avaliacao') {
                if (!interaction.member.roles.cache.has(CARGO_PERMITIDO)) {
                    return await interaction.reply({
                        content: '❌ Você não possui permissão para utilizar este painel de avaliação.',
                        ephemeral: true
                    });
                }

                const userSelect = new UserSelectMenuBuilder()
                    .setCustomId('select_policial_avaliado')
                    .setPlaceholder('🔍 | Selecione o policial que será avaliado:')
                    .setMinValues(1)
                    .setMaxValues(1);

                const row = new ActionRowBuilder().addComponents(userSelect);

                return await interaction.reply({
                    content: '⚠️ **Selecione abaixo o policial estagiário que deseja avaliar:**',
                    components: [row],
                    ephemeral: true
                });
            }

            if (interaction.isUserSelectMenu() && interaction.customId === 'select_policial_avaliado') {
                if (!interaction.member.roles.cache.has(CARGO_PERMITIDO)) {
                    return await interaction.reply({
                        content: '❌ Você não possui permissão para realizar esta ação.',
                        ephemeral: true
                    });
                }

                const policialAvaliadoId = interaction.values[0];
                avaliacoesEmAndamento.set(interaction.user.id, policialAvaliadoId);

                const modal = new ModalBuilder()
                    .setCustomId('modal_formulario_avaliacao')
                    .setTitle('FORMULÁRIO DE AVALIAÇÃO DE ESTÁGIO');

                const compPolicial = new TextInputBuilder()
                    .setCustomId('nota_comportamento')
                    .setLabel('COMPORTAMENTO POLICIAL (1 a 10)')
                    .setPlaceholder('Ex: 8')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const condutaDisciplina = new TextInputBuilder()
                    .setCustomId('nota_conduta')
                    .setLabel('CONDUTA E DISCIPLINA (1 a 10)')
                    .setPlaceholder('Ex: 9')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const servicoOperacional = new TextInputBuilder()
                    .setCustomId('nota_operacional')
                    .setLabel('SERVIÇO OPERACIONAL (1 a 10)')
                    .setPlaceholder('Ex: 7')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const observacoes = new TextInputBuilder()
                    .setCustomId('observacoes_estagio')
                    .setLabel('OBSERVAÇÕES (Opcional)')
                    .setPlaceholder('Digite observações adicionais se houver...')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(compPolicial),
                    new ActionRowBuilder().addComponents(condutaDisciplina),
                    new ActionRowBuilder().addComponents(servicoOperacional),
                    new ActionRowBuilder().addComponents(observacoes)
                );

                return await interaction.showModal(modal);
            }

            if (interaction.isModalSubmit() && interaction.customId === 'modal_formulario_avaliacao') {
                if (!interaction.member.roles.cache.has(CARGO_PERMITIDO)) {
                    return await interaction.reply({
                        content: '❌ Você não possui permissão para submeter esta avaliação.',
                        ephemeral: true
                    });
                }

                await interaction.deferReply({ ephemeral: true });

                const n1 = parseFloat(interaction.fields.getTextInputValue('nota_comportamento').replace(',', '.')) || 0;
                const n2 = parseFloat(interaction.fields.getTextInputValue('nota_conduta').replace(',', '.')) || 0;
                const n3 = parseFloat(interaction.fields.getTextInputValue('nota_operacional').replace(',', '.')) || 0;
                const obs = interaction.fields.getTextInputValue('observacoes_estagio') || 'Nenhuma observação registrada.';

                const policialAvaliadoId = avaliacoesEmAndamento.get(interaction.user.id);
                avaliacoesEmAndamento.delete(interaction.user.id);

                const policialAvaliado = policialAvaliadoId ? await interaction.guild.members.fetch(policialAvaliadoId).catch(() => null) : null;
                const avaliador = interaction.user;

                const mediaFinal = ((n1 + n2 + n3) / 3).toFixed(1);
                const isAprovado = parseFloat(mediaFinal) >= 7.0;

                const idAvaliacao = `#AE-${String(contadorAvaliacoes++).padStart(4, '0')}`;

                const agora = new Date();
                const dataFormatada = agora.toLocaleDateString('pt-BR');
                const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const dataHoraString = `${dataFormatada} às ${horaFormatada}`;

                const embedLog = new EmbedBuilder()
                    .setTitle('Avaliação de estágio finalizada!')
                    .setColor(isAprovado ? 0x2ECC71 : 0xE74C3C)
                    .setThumbnail('https://cdn.discordapp.com/attachments/1502291744228769867/1532149715842629722/image.png?ex=6a6c75de&is=6a6b245e&hm=53ff2d2deb39c47ba8b14957d16b140dfecfbbc3669fe167c39b4afd9ee45b5a')
                    .addFields(
                        { 
                            name: '👤 Policial avaliado:', 
                            value: policialAvaliado ? `${policialAvaliado}` : (policialAvaliadoId ? `<@!${policialAvaliadoId}>` : 'Não identificado'), 
                            inline: true 
                        },
                        { 
                            name: '👮‍♂️ Policial avaliador:', 
                            value: `${avaliador}`, 
                            inline: true 
                        },
                        { 
                            name: '📌 Comportamento Policial:', 
                            value: `\`${n1}/10\``, 
                            inline: false 
                        },
                        { 
                            name: '📌 Conduta e Disciplina Policial:', 
                            value: `\`${n2}/10\``, 
                            inline: false 
                        },
                        { 
                            name: '📌 Serviço Operacional:', 
                            value: `\`${n3}/10\``, 
                            inline: false 
                        },
                        { 
                            name: '📝 Observações:', 
                            value: `\`\`\`text\n${obs}\n\`\`\``, 
                            inline: false 
                        },
                        { 
                            name: '📊 Média Final:', 
                            value: `\`${mediaFinal} / 10\``, 
                            inline: true 
                        },
                        { 
                            name: '📋 Resultado:', 
                            value: isAprovado ? '🟢 \`APROVADO\`' : '🔴 \`REPROVADO\`', 
                            inline: true 
                        },
                        { 
                            name: '🆔 Registro da Avaliação:', 
                            value: `\`${idAvaliacao}\``, 
                            inline: true 
                        },
                        { 
                            name: '📅 Data e horário:', 
                            value: `\`${dataHoraString}\``, 
                            inline: true 
                        }
                    )
                    .setFooter({ text: 'Secretaria da Segurança Pública – Polícia Militar' });

                const canalLog = interaction.client.channels.cache.get(CANAL_LOG_ESTAGIO);
                if (canalLog) {
                    await canalLog.send({ embeds: [embedLog] });
                }

                return await interaction.editReply({
                    content: `✅ Avaliação registrada com sucesso sob o ID **${idAvaliacao}** e enviada para o canal de logs!`
                });
            }
        } catch (error) {
            console.error('Erro no handler de avaliar estágio:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ Ocorreu um erro ao processar a avaliação.', ephemeral: true }).catch(() => {});
            }
        }
    }
};