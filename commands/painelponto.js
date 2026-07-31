const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

// Caminho para o contador compartilhado (caso use o arquivo JSON)
const fs = require('fs');
const path = require('path');
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
        contador = 1;
    }
    return String(contador).padStart(3, '0');
}

if (!global.pontosAtivos) {
    global.pontosAtivos = new Map();
}
const ID_CANAL_PONTO = '1532026308471816203';

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

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('abrir_modal_ponto_painel')
                .setLabel('Iniciar Ponto')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📋')
        );

        const mensagemPainel = await interaction.channel.send({ embeds: [embedPainel], components: [row] });
        await interaction.reply({ content: '✅ Painel de ponto enviado com sucesso neste canal!', ephemeral: true });

        // Coletor para escutar os cliques no botão do painel enviado
        const collectorPainel = mensagemPainel.createMessageComponentCollector();

        collectorPainel.on('collect', async i => {
            if (i.customId === 'abrir_modal_ponto_painel') {
                const userId = i.user.id;

                // Validação de ponto já aberto
                for (const [_, dados] of global.pontosAtivos.entries()) {
                    if (dados.userId === userId) {
                        return i.reply({ 
                            content: '❌ Você já possui um ponto aberto, não será possível abrir outro.', 
                            ephemeral: true 
                        });
                    }
                }

                const modal = new ModalBuilder()
                    .setCustomId('modal_ponto_painel_unico')
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

                await i.showModal(modal);

                try {
                    const submitted = await i.awaitModalSubmit({
                        time: 300 * 1000, 
                        filter: sub => sub.user.id === i.user.id && sub.customId === 'modal_ponto_painel_unico',
                    });

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

                    const rowPonto = new ActionRowBuilder().addComponents(
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

                    const mensagemPonto = await canalDestino.send({ embeds: [embed], components: [rowPonto] });

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
                        userId,
                        horaAberturaStr,
                        mensagem: mensagemPonto
                    });

                    const collectorPonto = mensagemPonto.createMessageComponentCollector({ time: 3 * 60 * 60 * 1000 });

                    collectorPonto.on('collect', async interPonto => {
                        const dados = global.pontosAtivos.get(mensagemPonto.id);
                        if (!dados) return;

                        if (interPonto.customId === 'adicionar_obs') {
                            const modalObs = new ModalBuilder()
                                .setCustomId('modal_obs')
                                .setTitle('Adicionar Observação');

                            const obsInput = new TextInputBuilder()
                                .setCustomId('observacao_texto')
                                .setLabel('Digite a nova observação')
                                .setStyle(TextInputStyle.Paragraph)
                                .setPlaceholder('Ex: Apoio prestado...')
                                .setRequired(true);

                            modalObs.addComponents(new ActionRowBuilder().addComponents(obsInput));
                            await interPonto.showModal(modalObs);

                            try {
                                const submittedObs = await interPonto.awaitModalSubmit({
                                    time: 120 * 1000,
                                    filter: sub => sub.user.id === interPonto.user.id && sub.customId === 'modal_obs',
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

                                await submittedObs.update({ embeds: [embedAtualizado], components: [rowPonto] });
                            } catch (e) {}
                        }

                        if (interPonto.customId === 'encerrar_ponto_individual') {
                            if (interPonto.user.id !== dados.userId) {
                                return interPonto.reply({ content: '❌ Apenas o militar que abriu este ponto pode encerra-lo!', ephemeral: true });
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
                                .setFooter({ text: `Ponto encerrado por ${interPonto.member ? interPonto.member.displayName : interPonto.user.username} • ${horaFechamento}` });

                            await interPonto.update({ embeds: [embedFechado], components: [] });
                            global.pontosAtivos.delete(mensagemPonto.id);
                            collectorPonto.stop();
                        }
                    });

                    collectorPonto.on('end', async (_, reason) => {
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
                                .setFooter({ text: `Ponto cancelado automaticamente após 3 horas • ${horaCancelamento}` });

                            await mensagemPonto.edit({ embeds: [embedCancelado], components: [] }).catch(() => {});
                            global.pontosAtivos.delete(mensagemPonto.id);
                        }
                    });

                } catch (err) {}
            }
        });
    },
};