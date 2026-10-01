-- ============================================================================
-- AGROVISION - SISTEMA DE AGRICULTURA INTELIGENTE
-- ESQUEMA COMPLETO DO BANCO DE DADOS MYSQL (schema.sql)
-- Compatível com: MySQL 5.7+, MySQL 8.0, MariaDB 10.3+, phpMyAdmin, cPanel, LAMP, XAMPP
-- Slogan: "Inteligência para uma agricultura mais eficiente."
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `agrovision_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `agrovision_db`;

-- 1. TABELA DE USUÁRIOS (AGRICULTORES E TÉCNICOS)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nome` VARCHAR(120) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `senha_hash` VARCHAR(255) NOT NULL,
  `telefone` VARCHAR(30) NULL,
  `localizacao` VARCHAR(120) NULL,
  `propriedade_nome` VARCHAR(120) DEFAULT 'Fazenda AgroVision',
  `foto_perfil` VARCHAR(255) NULL,
  `criado_em` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. TABELA DE CULTURAS (TALHÕES E PLANTAÇÕES DO AGRICULTOR)
CREATE TABLE IF NOT EXISTS `culturas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `nome` VARCHAR(100) NOT NULL,
  `variedade` VARCHAR(100) NULL,
  `data_plantio` DATE NOT NULL,
  `area_m2` DECIMAL(12,2) NOT NULL DEFAULT 1000.00,
  `tipo_solo` ENUM('arenoso', 'franco', 'argiloso') NOT NULL DEFAULT 'franco',
  `fase_crescimento` ENUM('germinacao', 'crescimento', 'floracao', 'maturacao') NOT NULL DEFAULT 'crescimento',
  `localizacao` VARCHAR(120) NULL,
  `observacoes` TEXT NULL,
  `status` ENUM('ativo', 'colhido', 'interrompido') DEFAULT 'ativo',
  `criado_em` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. TABELA DE IMAGENS (METADADOS DE FOTOGRAFIAS CAPTURADAS)
CREATE TABLE IF NOT EXISTS `imagens` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `cultura_id` INT NULL,
  `caminho_arquivo` VARCHAR(255) NOT NULL,
  `tipo_origem` ENUM('camera_smartphone', 'galeria_upload', 'camera_campo') NOT NULL DEFAULT 'camera_smartphone',
  `largura_px` INT NULL,
  `altura_px` INT NULL,
  `tamanho_bytes` INT NULL,
  `qualidade_adequada` TINYINT(1) DEFAULT 1,
  `observacoes_campo` TEXT NULL,
  `criado_em` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`cultura_id`) REFERENCES `culturas`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. TABELA DE ANÁLISES FITOSSANITÁRIAS COM IA
CREATE TABLE IF NOT EXISTS `analises` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `cultura_id` INT NULL,
  `imagem_id` INT NULL,
  `imagem_url` VARCHAR(255) NOT NULL,
  `especie_identificada` VARCHAR(100) NOT NULL,
  `estado_aparente` ENUM('saudavel', 'atencao', 'critico', 'indeterminado') NOT NULL DEFAULT 'atencao',
  `possiveis_doencas` VARCHAR(255) NULL,
  `possiveis_pragas` VARCHAR(255) NULL,
  `sintomas_visiveis` TEXT NULL,
  `deficiencia_nutricional` VARCHAR(255) NULL,
  `sinais_stress_hidrico` VARCHAR(255) NULL,
  `danos_folhas` VARCHAR(255) NULL,
  `nivel_atencao` ENUM('baixo', 'moderado', 'alto', 'critico') NOT NULL DEFAULT 'moderado',
  `nivel_confianca` DECIMAL(5,2) DEFAULT 85.00,
  `recomendacoes_cuidado` TEXT NULL,
  `recomendacoes_prevencao` TEXT NULL,
  `aviso_estimativa` TEXT NULL,
  `metodo_analise` VARCHAR(60) DEFAULT 'visao_computacional_ia',
  `criado_em` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`cultura_id`) REFERENCES `culturas`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`imagem_id`) REFERENCES `imagens`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. TABELA DE RECOMENDAÇÕES INTELIGENTES DE IRRIGAÇÃO
CREATE TABLE IF NOT EXISTS `recomendacoes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `cultura_id` INT NOT NULL,
  `analise_id` INT NULL,
  `modo_operacao` ENUM('camera', 'esp32', 'hibrido') NOT NULL DEFAULT 'camera',
  `decisao_rega` ENUM('irrigar', 'suspender_clima', 'aguardar_solo', 'monitorar') NOT NULL DEFAULT 'irrigar',
  `volume_litros_recomendado` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `litros_economizados` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `melhor_horario` VARCHAR(100) DEFAULT '06:00 - 08:30 ou 16:30 - 18:30',
  `frequencia_sugerida` VARCHAR(80) DEFAULT '1 vez ao dia',
  `motivo_recomendacao` TEXT NOT NULL,
  `sinais_visuais_stress` TEXT NULL,
  `criado_em` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`cultura_id`) REFERENCES `culturas`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`analise_id`) REFERENCES `analises`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. TABELA DE REGISTROS DE IRRIGAÇÃO REALIZADA / PROGRAMADA
CREATE TABLE IF NOT EXISTS `irrigacoes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `cultura_id` INT NOT NULL,
  `recomendacao_id` INT NULL,
  `data_hora` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `quantidade_litros` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `horario_aplicacao` TIME NULL,
  `metodo_irrigacao` ENUM('gotejamento', 'aspersao', 'sulco', 'manual') NOT NULL DEFAULT 'gotejamento',
  `condicao_solo` ENUM('seco', 'umido_adequado', 'encharcado') NOT NULL DEFAULT 'seco',
  `condicao_clima` ENUM('ensolarado', 'nublado', 'chuva_fraca', 'chuva_forte') NOT NULL DEFAULT 'ensolarado',
  `minutos_bomba` INT DEFAULT 0,
  `status` ENUM('executado', 'agendado', 'cancelado', 'suspenso') NOT NULL DEFAULT 'executado',
  `observacoes` TEXT NULL,
  `criado_em` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`cultura_id`) REFERENCES `culturas`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`recomendacao_id`) REFERENCES `recomendacoes`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. TABELA DE DADOS DE TELEMETRIA DO ESP32 (MODO OPCIONAL IOT)
CREATE TABLE IF NOT EXISTS `dados_esp32` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `cultura_id` INT NULL,
  `dispositivo_id` VARCHAR(60) NOT NULL,
  `umidade_solo_pct` DECIMAL(5,2) NOT NULL,
  `temperatura_ar_c` DECIMAL(5,2) NOT NULL,
  `umidade_ar_pct` DECIMAL(5,2) NOT NULL,
  `sensor_chuva` TINYINT(1) DEFAULT 0,
  `status_valvula` ENUM('fechada', 'aberta', 'bloqueada_seguranca') DEFAULT 'fechada',
  `tensao_bateria_v` DECIMAL(4,2) DEFAULT 3.70,
  `recebido_em` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`cultura_id`) REFERENCES `culturas`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. TABELA DE ALERTAS INTELIGENTES DO SISTEMA
CREATE TABLE IF NOT EXISTS `alertas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `cultura_id` INT NULL,
  `tipo` ENUM('irrigacao', 'stress_hidrico', 'doenca', 'praga', 'clima', 'vistoria') NOT NULL,
  `titulo` VARCHAR(150) NOT NULL,
  `mensagem` TEXT NOT NULL,
  `nivel` ENUM('informativo', 'alerta', 'urgente') NOT NULL DEFAULT 'alerta',
  `lido` TINYINT(1) DEFAULT 0,
  `criado_em` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`cultura_id`) REFERENCES `culturas`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. TABELA DE HISTÓRICO GERAL DE ATIVIDADES E EVENTOS AGRÍCOLAS
CREATE TABLE IF NOT EXISTS `historico` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `cultura_id` INT NULL,
  `tipo_evento` VARCHAR(50) NOT NULL,
  `descricao` TEXT NOT NULL,
  `dados_json` JSON NULL,
  `criado_em` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. TABELA DE MENSAGENS DO ASSISTENTE AGRÍCOLA COM IA
CREATE TABLE IF NOT EXISTS `conversas_assistente` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `cultura_id` INT NULL,
  `origem` ENUM('usuario', 'assistente') NOT NULL,
  `mensagem` TEXT NOT NULL,
  `metodo_ia` VARCHAR(60) DEFAULT 'gemini-3.8-flash',
  `criado_em` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`cultura_id`) REFERENCES `culturas`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- DADOS INICIAIS DE DEMONSTRAÇÃO
-- ============================================================================

-- Usuário Padrão (agricultor@agrovision.com / senha: senha123)
INSERT INTO `users` (`id`, `nome`, `email`, `senha_hash`, `telefone`, `localizacao`, `propriedade_nome`) 
VALUES (1, 'Produtor Rural AgroVision', 'agricultor@agrovision.com', '$2y$10$wN0mK1kYFjL.rZ1qUqj/Nu49O7Teq4e7aK/B2hK9n5G0h5U3xS3eS', '+244 923 000 000', 'Huambo, Região Central', 'Quinta Esperança Verde')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- Culturas Demonstrativas
INSERT INTO `culturas` (`id`, `user_id`, `nome`, `variedade`, `data_plantio`, `area_m2`, `tipo_solo`, `fase_crescimento`, `localizacao`, `observacoes`)
VALUES 
(1, 1, 'Milho Grão', 'Híbrido Precoce BR-304', DATE_SUB(CURRENT_DATE, INTERVAL 45 DAY), 3500.00, 'franco', 'floracao', 'Talhão 01 - Norte', 'Fase crítica de floração e polinização das espigas. Demanda hídrica alta.'),
(2, 1, 'Mandioca', 'Macaxeira Regional Branca', DATE_SUB(CURRENT_DATE, INTERVAL 110 DAY), 6000.00, 'arenoso', 'crescimento', 'Talhão 02 - Sul', 'Crescimento vegetativo e tuberização inicial. Solo arenoso com boa drenagem.'),
(3, 1, 'Tomateiro', 'Santa Clara / Caqui', DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY), 1200.00, 'franco', 'crescimento', 'Canteiro Irrigado 03', 'Primeiras inflorescências abertas. Monitoramento constante de manchas foliares.')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- Análise Demonstrativa de Entrada
INSERT INTO `analises` (`id`, `user_id`, `cultura_id`, `imagem_url`, `especie_identificada`, `estado_aparente`, `possiveis_doencas`, `possiveis_pragas`, `sintomas_visiveis`, `deficiencia_nutricional`, `sinais_stress_hidrico`, `danos_folhas`, `nivel_atencao`, `nivel_confianca`, `recomendacoes_cuidado`, `recomendacoes_prevencao`, `aviso_estimativa`, `metodo_analise`)
VALUES
(1, 1, 3, 'uploads/exemplo_tomate.jpg', 'Tomateiro (Solanum lycopersicum)', 'atencao', 'Pinta-preta (Alternaria solani) incipiente', 'Sem pragas ativas visíveis', 'Manchas castanhas circulares nas folhas basais', 'Possível deficiência inicial de cálcio/magnésio', 'Folhas levemente arqueadas sem murcha severa', 'Necrose periférica nos folíolos inferiores', 'moderado', 91.50, 'Remover e queimar folhas inferiores afetadas. Desinfetar ferramentas de poda.', 'Pulverização preventiva com calda bordalesa a 1% nas primeiras horas da manhã. Não molhar folhagem na rega.', 'Resultado preliminar por visão computacional. Recomenda-se validação em campo por técnico agrícola.', 'visao_computacional_ia')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- Registro de Telemetria Inicial do ESP32
INSERT INTO `dados_esp32` (`id`, `user_id`, `cultura_id`, `dispositivo_id`, `umidade_solo_pct`, `temperatura_ar_c`, `umidade_ar_pct`, `sensor_chuva`, `status_valvula`)
VALUES 
(1, 1, 1, 'ESP32_AGRO_NODE_01', 42.50, 26.80, 62.00, 0, 'fechada')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- Alertas Iniciais
INSERT INTO `alertas` (`id`, `user_id`, `cultura_id`, `tipo`, `titulo`, `mensagem`, `nivel`, `lido`)
VALUES 
(1, 1, 1, 'irrigacao', 'Balanço Hídrico: Milho em Floração', 'A cultura do Milho está no Talhão 01 em plena fase de floração. Verifique a umidade do solo antes das 09h.', 'alerta', 0),
(2, 1, 3, 'doenca', 'Atenção Fitossanitária: Tomateiro', 'Pinta-preta identificada na última vistoria. Recomenda-se calda bordalesa preventiva.', 'alerta', 0)
ON DUPLICATE KEY UPDATE `id` = `id`;
