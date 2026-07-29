const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const builder = new SlashCommandBuilder()
    .setName('add_cargos')
    .setDescription('Adiciona até 10 cargos selecionados a um usuário')
    .addUserOption(option =>
        option.setName('usuario')
            .setDescription('Selecione o usuário')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('motivo')
            .setDescription('Motivo da adição dos cargos')
            .setRequired(true));

for (let i = 1; i <= 10; i++) {
    builder.addRoleOption(option =>
        option.setName(`cargo${i}`)
            .setDescription(`Selecione o ${i}º cargo`)
            .setRequired(i === 1)
    );
}

builder.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

const ID_CANAL_LOGS = '1532054730442801274';
const ID_CARGO_PERMITIDO = '1525502603176186017';

module.exports = {
    data: builder,

    async execute(interaction) {
        const executor = interaction.member;

        // Verificação: Apenas quem possui o cargo específico (ou administradores/dono) pode executar
        if (!executor.roles.cache.has(ID_CARGO_PERMITIDO) && !executor.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: '❌ Você não possui permissão para utilizar este comando.', 
                ephemeral: true 
            });
        }

        const membro = interaction.options.getMember('usuario');
        const motivo = interaction.options.getString('motivo');

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.reply({ 
                content: '❌ Eu não tenho permissão de **Gerenciar Cargos** para executar esta ação.', 
                ephemeral: true 
            });
        }

        const cargosParaAdicionar = [];
        for (let i = 1; i <= 10; i++) {
            const cargo = interaction.options.getRole(`cargo${i}`);
            if (cargo) {
                cargosParaAdicionar.push(cargo);
            }
        }

        if (cargosParaAdicionar.length === 0) {
            return interaction.reply({ content: '❌ Você precisa selecionar pelo menos um cargo.', ephemeral: true });
        }

        const cargosValidos = [];
        const cargosIgnorados = [];

        for (const cargo of cargosParaAdicionar) {
            if (membro.roles.cache.has(cargo.id)) {
                cargosIgnorados.push(`${cargo.name} (já possui)`);
                continue;
            }

            if (cargo.position >= interaction.guild.members.me.roles.highest.position) {
                return interaction.reply({ 
                    content: `❌ Não posso atribuir o cargo **${cargo.name}** porque ele é igual ou superior ao meu cargo mais alto.`, 
                    ephemeral: true 
                });
            }

            if (interaction.guild.ownerId !== executor.id && cargo.position >= executor.roles.highest.position) {
                return interaction.reply({ 
                    content: `❌ Você não pode atribuir o cargo **${cargo.name}** pois ele é superior ou igual ao seu cargo mais alto.`, 
                    ephemeral: true 
                });
            }

            cargosValidos.push(cargo);
        }

        if (cargosValidos.length === 0) {
            return interaction.reply({ 
                content: '❌ Nenhum cargo novo foi adicionado (o usuário já possui todos os cargos selecionados ou há conflito de hierarquia).', 
                ephemeral: true 
            });
        }

        try {
            await membro.roles.add(cargosValidos, motivo);

            const embed = new EmbedBuilder()
                .setTitle('✅ Cargos Adicionados com Sucesso')
                .setColor(0x00FF00)
                .addFields(
                    { name: '👤 Usuário', value: `${membro} (${membro.user.tag})`, inline: false },
                    { name: '🛡️ Cargos Adicionados', value: cargosValidos.map(c => `• ${c}`).join('\n'), inline: false },
                    { name: '📝 Motivo', value: motivo, inline: false },
                    { name: '👮‍♂️ Aplicado por', value: `${executor}`, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Envia a log para o canal especificado
            const canalLogs = await interaction.client.channels.fetch(ID_CANAL_LOGS).catch(() => null);
            if (canalLogs) {
                const embedLog = new EmbedBuilder()
                    .setTitle('📋 Log de Atribuição de Cargos')
                    .setColor(0x3498DB)
                    .addFields(
                        { name: '👤 Usuário Afetado', value: `${membro} (${membro.user.tag})`, inline: false },
                        { name: '🛡️ Cargos Adicionados', value: cargosValidos.map(c => `• ${c}`).join('\n'), inline: false },
                        { name: '📝 Motivo', value: motivo, inline: false },
                        { name: '👮‍♂️ Executado por', value: `${executor} (${executor.user.tag})`, inline: false }
                    )
                    .setTimestamp();

                await canalLogs.send({ embeds: [embedLog] });
            }

        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: '❌ Ocorreu um erro ao tentar adicionar os cargos ao membro.', 
                ephemeral: true 
            });
        }
    },
};