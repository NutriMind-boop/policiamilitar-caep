const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Caminho para salvar o contador de ponto de forma persistente
const caminhoDadosPonto = path.join(__dirname, '..', 'dados_ponto.json');

function obterProximoIdPonto() {
    let contador = 0;
    try {
        if (fs.existsSync(caminhoDadosPonto)) {
            const dados = JSON.parse(fs.readFileSync(caminhoDadosPonto, 'utf8'));
            if (dados.ultimoId) {
                contador = dados.ultimoId;
            }
        }
        contador++;
        fs.writeFileSync(caminhoDadosPonto, JSON.stringify({ ultimoId: contador }, null, 2));
    } catch (err) {
        console.error('Erro ao gerenciar o arquivo de contador de pontos:', err);
        contador = 1;
    }
    return String(contador).padStart(3, '0');
}

// Torna a lista global para que o /painelponto e outros comandos possam checar se há pontos abertos
if (!global.pontosAtivos) {
    global.pontosAtivos = new Map();
}
const ID_CANAL_PONTO = '1532026308471816203';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ponto')
        .setDescription('Abre um novo painel de ponto da equipe'),

    async execute(interaction) {
        const userId = interaction.user.id;

        // Validação imediata: Verifica se o usuário já possui algum ponto aberto antes de abrir o modal
        for (const [_, dados] of global.pontosAtivos.entries()) {
            if (dados.userId === userId) {
                return interaction.reply({ 
                    content: '❌ Você já possui um ponto aberto, não será possível abrir outro.', 
                    ephemeral: true 
                });
            }
        }

        const modal = new ModalBuilder()
            .setCustomId('modal_ponto')
            .setTitle('Registro de Ponto da Equipe');

        const viaturaInput = new TextInputBuilder()
            .setCustomId('viatura')
            .setLabel('Modelo e Prefixo da Viatura')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: Trailblazer - E-M05011')
            .setRequired(true);

        const motoristaInput = new TextInputBuilder()
            .setCustomId('motorista')
            .setLabel('Motorista (Graduação, Nome e R:E)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: Cb PM Silva - 12345')
            .setRequired(true);

        const chefeInput = new TextInputBuilder()
            .setCustomId('chefe')
            .setLabel('Chefe de barca (Graduação, Nome e R:E)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: Sgt PM Oliveira - 54321')
            .setRequired(true);

        const auxiliar1Input = new TextInputBuilder()
            .setCustomId('auxiliar1')
            .setLabel('1º Auxiliar (Grad, Nome e R:E)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: Sd PM Santos - 11111')
            .setRequired(false);

        const auxiliar2Input = new TextInputBuilder()
            .setCustomId('auxiliar2')
            .setLabel('2º Auxiliar (Grad, Nome e R:E)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: Sd PM Costa - 22222')
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(viaturaInput),
            new ActionRowBuilder().addComponents(motoristaInput),
            new ActionRowBuilder().addComponents(chefeInput),
            new ActionRowBuilder().addComponents(auxiliar1Input),
            new ActionRowBuilder().addComponents(auxiliar2Input),
        );

        await interaction.showModal(modal);

        try {
            const submitted = await interaction.awaitModalSubmit({
                time: 300 * 1000, 
                filter: i => i.user.id === interaction.user.id && i.customId === 'modal_ponto',
            });

            // Validação dupla pós-modal para prevenir concorrência
            for (const [_, dados] of global.pontosAtivos.entries()) {
                if (dados.userId === userId) {
                    return submitted.reply({ 
                        content: '❌ Você já possui um ponto aberto, não será possível abrir outro.', 
                        ephemeral: true 
                    });
                }
            }

            const numeroFormatado = obterProximoIdPonto();
            
            const viatura = submitted.fields.getTextInputValue('viatura');
            const motorista = submitted.fields.getTextInputValue('motorista');
            const chefe = submitted.fields.getTextInputValue('chefe');
            const auxiliar1 = submitted.fields.getTextInputValue('auxiliar1') || 'Nenhum';
            const auxiliar2 = submitted.fields.getTextInputValue('auxiliar2') || 'Nenhum';
            const listaObservacoes = [];

            const nomeCriador = submitted.member ? submitted.member.displayName : submitted.user.username;
            const userIdCriador = submitted.user.id;

            const dataAtual = new Date().toLocaleDateString('pt-BR');
            const timestampInicio = Date.now(); 
            const tempoRelogio = `<t:${Math.floor(timestampInicio / 1000)}:R>`;
            const horaAberturaStr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

            const montarCampos = (obsArray) => {
                const campos = [
                    { name: '📋 Unidade', value: 'CAEP', inline: false },
                    { name: '🚔 Viatura', value: viatura, inline: false },
                    { name: '👥 Equipe', value: `**Motorista:** ${motorista}\n**Chefe de barca:** ${chefe}\n**1º Auxiliar:** ${auxiliar1}\n**2º Auxiliar:** ${auxiliar2}`, inline: false },
                    { name: '⏳ Tempo Aberto', value: tempoRelogio, inline: false }
                ];

                if (obsArray.length > 0) {
                    campos.push({ name: '📝 Observações', value: obsArray.join('\n\n'), inline: false });
                }

                campos.push({ name: '📅 Data', value: dataAtual, inline: false });
                return campos;
            };

            const embed = new EmbedBuilder()
                .setTitle(`⏱️ Ponto #${numeroFormatado} - Aberto`)
                .setColor(0x00FF00)
                .addFields(montarCampos(listaObservacoes))
                .setFooter({ text: `Ponto aberto por ${nomeCriador} • ${horaAberturaStr}` });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('adicionar_obs')
                    .setLabel('Colocar Observação')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('encerrar_ponto_individual')
                    .setLabel('Encerrar Ponto')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🛑')
            );

            const canalDestino = await submitted.client.channels.fetch(ID_CANAL_PONTO).catch(() => null);

            await submitted.reply({ content: '✅ Ponto aberto com sucesso!', ephemeral: true });

            if (!canalDestino) {
                return submitted.followUp({ content: '❌ Erro: Não foi possível encontrar o canal de destino do ponto configurado.', ephemeral: true });
            }

            const mensagemPonto = await canalDestino.send({ embeds: [embed], components: [row] });

            global.pontosAtivos.set(mensagemPonto.id, {
                numero: numeroFormatado,
                viatura,
                motorista,
                chefe,
                auxiliar1,
                auxiliar2,
                listaObservacoes,
                dataAtual,
                timestampInicio,
                nomeCriador,
                userId: userIdCriador,
                horaAberturaStr,
                mensagem: mensagemPonto
            });

            const collector = mensagemPonto.createMessageComponentCollector({ time: 3 * 60 * 60 * 1000 });

            collector.on('collect', async i => {
                const dados = global.pontosAtivos.get(mensagemPonto.id);
                if (!dados) return;

                if (i.customId === 'adicionar_obs') {
                    const modalObs = new ModalBuilder()
                        .setCustomId('modal_obs')
                        .setTitle('Adicionar Observação');

                    const obsInput = new TextInputBuilder()
                        .setCustomId('observacao_texto')
                        .setLabel('Digite a nova observação')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('Ex: Apoio prestado na ocorrência X...')
                        .setRequired(true);

                    modalObs.addComponents(new ActionRowBuilder().addComponents(obsInput));
                    await i.showModal(modalObs);

                    try {
                        const submittedObs = await i.awaitModalSubmit({
                            time: 120 * 1000,
                            filter: sub => sub.user.id === i.user.id && sub.customId === 'modal_obs',
                        });

                        const novaObs = submittedObs.fields.getTextInputValue('observacao_texto');
                        const horaObs = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        
                        const nomeServidor = submittedObs.member ? submittedObs.member.displayName : submittedObs.user.username;
                        dados.listaObservacoes.push(`• **[${horaObs}] ${nomeServidor}:** ${novaObs}`);
                        
                        global.pontosAtivos.set(mensagemPonto.id, dados);

                        const embedAtualizado = new EmbedBuilder()
                            .setTitle(`⏱️ Ponto #${dados.numero} - Aberto`)
                            .setColor(0x00FF00)
                            .addFields(montarCampos(dados.listaObservacoes))
                            .setFooter({ text: `Ponto aberto por ${dados.nomeCriador} • ${dados.horaAberturaStr}` });

                        await submittedObs.update({ embeds: [embedAtualizado], components: [row] });

                    } catch (err) {
                        console.log('Modal de observação expirado.');
                    }
                }

                if (i.customId === 'encerrar_ponto_individual') {
                    if (i.user.id !== dados.userId) {
                        return i.reply({ content: '❌ Apenas o militar que abriu este ponto pode encerra-lo!', ephemeral: true });
                    }

                    const horaFechamento = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

                    const camposFechado = [
                        { name: '📋 Unidade', value: 'CAEP', inline: false },
                        { name: '🚔 Viatura', value: dados.viatura, inline: false },
                        { name: '👥 Equipe', value: `**Motorista:** ${dados.motorista}\n**Chefe de barca:** ${dados.chefe}\n**1º Auxiliar:** ${dados.auxiliar1}\n**2º Auxiliar:** ${dados.auxiliar2}`, inline: false }
                    ];

                    if (dados.listaObservacoes.length > 0) {
                        camposFechado.push({ name: '📝 Observações', value: dados.listaObservacoes.join('\n\n'), inline: false });
                    }

                    camposFechado.push({ name: '📅 Data', value: dados.dataAtual, inline: false });

                    const embedFechado = new EmbedBuilder()
                        .setTitle(`⏱️ Ponto #${dados.numero} - Encerrado`)
                        .setColor(0xFF0000)
                        .addFields(camposFechado)
                        .setFooter({ text: `Ponto encerrado por ${i.member ? i.member.displayName : i.user.username} • ${horaFechamento}` });

                    await i.update({ embeds: [embedFechado], components: [] });
                    global.pontosAtivos.delete(mensagemPonto.id);
                    collector.stop();
                }
            });

            collector.on('end', async (collected, reason) => {
                const dados = global.pontosAtivos.get(mensagemPonto.id);
                if (dados && reason === 'time') {
                    const horaCancelamento = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

                    const camposCancelado = [
                        { name: '📋 Unidade', value: 'CAEP', inline: false },
                        { name: '🚔 Viatura', value: dados.viatura, inline: false },
                        { name: '👥 Equipe', value: `**Motorista:** ${dados.motorista}\n**Chefe de barca:** ${dados.chefe}\n**1º Auxiliar:** ${dados.auxiliar1}\n**2º Auxiliar:** ${dados.auxiliar2}`, inline: false }
                    ];

                    if (dados.listaObservacoes.length > 0) {
                        camposCancelado.push({ name: '📝 Observações', value: dados.listaObservacoes.join('\n\n'), inline: false });
                    }

                    camposCancelado.push({ name: '📅 Data', value: dados.dataAtual, inline: false });

                    const embedCancelado = new EmbedBuilder()
                        .setTitle(`⏱️ Ponto #${dados.numero} - Ponto Cancelado`)
                        .setColor(0x7F7F7F)
                        .addFields(camposCancelado)
                        .setFooter({ text: `Ponto cancelado automaticamente após 3 horas de inatividade • ${horaCancelamento}` });

                    await mensagemPonto.edit({ embeds: [embedCancelado], components: [] }).catch(() => {});
                    global.pontosAtivos.delete(mensagemPonto.id);
                }
            });

        } catch (err) {
            console.log('Modal expirado ou fechado pelo usuário.');
        }
    },
};