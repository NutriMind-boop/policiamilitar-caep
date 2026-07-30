const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('convite')
        .setDescription('Envia o painel do Sistema de Controle de Ingresso e Convites'),

    async execute(interaction) {
        // Se for executado como comando de barra (/convite), envia o painel completo
        if (interaction.isChatInputCommand()) {
            const embedPainel = new EmbedBuilder()
                .setTitle('✉️ | SISTEMA DE CONTROLE DE INGRESSO')
                .setDescription(
                    'Seja bem-vindo ao Sistema Oficial de Convites.\n\n' +
                    'Este painel foi desenvolvido com a finalidade de realizar o gerenciamento e controle de acesso de novos integrantes ao servidor, garantindo maior organização, segurança e confiabilidade durante o processo de entrada.\n\n' +
                    'O ingresso ao servidor é realizado exclusivamente mediante convite autorizado, sendo necessário possuir um código de autenticação válido para concluir o procedimento de admissão.'
                )
                .setColor(0x2f3136)
                .addFields(
                    {
                        name: '🪖 | ORIENTAÇÕES IMPORTANTES',
                        value: 'Antes de iniciar o processo, atente-se às seguintes informações:\n\n' +
                                '• O código de convite é individual e deve ser utilizado somente pelo integrante autorizado;\n' +
                                '• Cada código possui quantidade limitada de utilizações e prazo de validade determinado;\n' +
                                '• Convites expirados ou já utilizados não poderão ser reaproveitados;\n' +
                                '• O compartilhamento indevido de códigos poderá ocasionar o cancelamento da autorização concedida;\n' +
                                '• O acesso ao servidor não garante aprovação ou permanência, estando todos os integrantes sujeitos às normas, regulamentos e procedimentos internos estabelecidos.'
                    },
                    {
                        name: '📋 | PROCESSO DE ENTRADA',
                        value: 'Após inserir um código válido, o sistema realizará a verificação automática da autorização e, estando em conformidade, permitirá a continuidade do processo de ingresso.\n\n' +
                                'Durante a permanência no servidor, o integrante deverá manter uma conduta compatível com as diretrizes estabelecidas, respeitando a hierarquia, os procedimentos internos e as determinações administrativas.'
                    },
                    {
                        name: '⚠️ | ATENÇÃO',
                        value: 'O sistema de convites possui controle automático de registros, sendo armazenadas informações referentes à utilização dos códigos para garantir transparência, organização e segurança no gerenciamento de acessos.\n\n' +
                                'Caso possua uma autorização válida, clique no botão abaixo e preencha as informações solicitadas pelo sistema.\n\n' +
                                '📥 | Utilize o botão abaixo para iniciar o processo.'
                    }
                )
                .setFooter({ text: 'Secretaria da Segurança Pública | Sistema de Convites' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_gerar_convite_modal')
                    .setLabel('Gerar Convite')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🎟️')
            );

            return await interaction.reply({ embeds: [embedPainel], components: [row] });
        }

        // Se for acionado pelo clique no botão, abre o Modal com as opções
        if (interaction.isButton() && interaction.customId === 'btn_gerar_convite_modal') {
            const cargoPermitidoId = '1502369295383138395'; // Cargo autorizado

            if (cargoPermitidoId && !interaction.member.roles.cache.has(cargoPermitidoId)) {
                return await interaction.reply({
                    content: '❌ Você não possui permissão para gerar códigos de convite. Apenas membros autorizados podem utilizar esta função.',
                    ephemeral: true
                });
            }

            const modal = new ModalBuilder()
                .setCustomId('modal_gerar_convite')
                .setTitle('Painel de Geração de Convites');

            const minutosInput = new TextInputBuilder()
                .setCustomId('minutos_convite')
                .setLabel('1º VALIDADE (EM MINUTOS)')
                .setPlaceholder('Ex: 60 (para 1 hora) ou 1440 (para 24 horas)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const quantidadeInput = new TextInputBuilder()
                .setCustomId('quantidade_convite')
                .setLabel('2º QUANTIDADE DE CONVITES')
                .setPlaceholder('Ex: 1, 3, 5...')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const motivoInput = new TextInputBuilder()
                .setCustomId('motivo_convite')
                .setLabel('3º MOTIVO')
                .setPlaceholder('Ex: Recrutamento interno / Atestado de curso')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(minutosInput),
                new ActionRowBuilder().addComponents(quantidadeInput),
                new ActionRowBuilder().addComponents(motivoInput)
            );

            return await interaction.showModal(modal);
        }
    },

    async handleModal(interaction) {
        if (interaction.customId === 'modal_gerar_convite') {
            await interaction.deferReply({ ephemeral: true });

            const minutosStr = interaction.fields.getTextInputValue('minutos_convite');
            const quantidadeStr = interaction.fields.getTextInputValue('quantidade_convite');
            const motivo = interaction.fields.getTextInputValue('motivo_convite');

            const minutos = parseInt(minutosStr);
            const quantidade = parseInt(quantidadeStr);

            if (isNaN(minutos) || minutos <= 0) {
                return await interaction.editReply({ content: '❌ A quantidade de minutos informada é inválida. Digite apenas números inteiros.' });
            }

            if (isNaN(quantidade) || quantidade <= 0 || quantidade > 10) {
                return await interaction.editReply({ content: '❌ A quantidade de convites deve ser um número entre 1 e 10 por segurança.' });
            }

            const maxAgeSegundos = minutos * 60;
            const canalDestino = interaction.channel;

            let mensagensFormatadas = [];

            try {
                for (let i = 0; i < quantidade; i++) {
                    const convite = await canalDestino.createInvite({
                        maxAge: maxAgeSegundos,
                        maxUses: 1, // Cada convite gerado serve para 1 uso exclusivo
                        unique: true,
                        reason: `Gerado por ${interaction.user.tag} | Motivo: ${motivo}`
                    });

                    // Gera um código autenticador aleatório ex: CAEP77645 (CAEP + 5 números aleatórios)
                    const numeroAleatorio = Math.floor(10000 + Math.random() * 90000);
                    const codigoAutenticador = `CAEP${numeroAleatorio}`;

                    mensagensFormatadas.push(
                        `**Informações do convite:**\n` +
                        `**Código autenticador:** \`${codigoAutenticador}\`\n` +
                        `**Link do convite:** ${convite.url}\n` +
                        `**Qtd. de usos:** \`1\``
                    );
                }

                const embedResultado = new EmbedBuilder()
                    .setTitle('🎟️ | CONVITES GERADOS COM SUCESSO')
                    .setColor(0x00FF00)
                    .setDescription(mensagensFormatadas.join('\n\n----------------------------------\n\n'))
                    .addFields(
                        { name: '📋 | Motivo da Geração:', value: `> ${motivo}` },
                        { name: '⏳ | Validade:', value: `> ${minutos} minuto(s)` },
                        { name: '👮 | Solicitante:', value: `${interaction.user}` }
                    )
                    .setFooter({ text: 'Sistema de Controle de Ingressos' })
                    .setTimestamp();

                return await interaction.editReply({ 
                    content: '✅ Seus convites foram gerados com os códigos autenticadores:', 
                    embeds: [embedResultado] 
                });

            } catch (error) {
                console.error('Erro ao gerar convites:', error);
                return await interaction.editReply({ 
                    content: '❌ Ocorreu um erro ao tentar gerar os convites. Verifique se o bot possui permissão de "Criar Convite" neste canal.' 
                });
            }
        }
    }
};