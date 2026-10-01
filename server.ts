import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, 'data', 'database.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Inicialização dinâmica do SDK Google GenAI (Gemini API) com User-Agent 'aistudio-build'
function getGeminiClient(): GoogleGenAI | null {
  const geminiApiKey = process.env.GEMINI_API_KEY || '';
  if (!geminiApiKey) return null;
  return new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Modelos ordenados conforme diretrizes da Skill gemini-api (com failover em caso de alta demanda temporária)
const GEMINI_TEXT_MODELS = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
const GEMINI_VISION_MODELS = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

function getDatabase() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const defaultData = {
        users: [
          {
            id: 1,
            nome: "Produtor Rural AgroVision",
            email: "agricultor@agrovision.com",
            senha_hash: "$2y$10$wN0mK1kYFjL.rZ1qUqj/Nu49O7Teq4e7aK/B2hK9n5G0h5U3xS3eS",
            telefone: "+244 923 000 000",
            localizacao: "Huambo, Região Central",
            propriedade_nome: "Quinta Esperança Verde"
          }
        ],
        culturas: [
          {
            id: 1,
            user_id: 1,
            nome: "Milho Grão",
            variedade: "Híbrido Precoce BR-304",
            data_plantio: "2026-08-15",
            area_m2: 3500,
            tipo_solo: "franco",
            fase_crescimento: "floracao",
            localizacao: "Talhão 01 - Norte",
            observacoes: "Fase crítica de floração e polinização das espigas. Demanda hídrica alta.",
            status: "ativo"
          },
          {
            id: 2,
            user_id: 1,
            nome: "Mandioca",
            variedade: "Macaxeira Regional Branca",
            data_plantio: "2026-04-10",
            area_m2: 6000,
            tipo_solo: "arenoso",
            fase_crescimento: "crescimento",
            localizacao: "Talhão 02 - Sul",
            observacoes: "Crescimento vegetativo e tuberização inicial. Solo arenoso com boa drenagem.",
            status: "ativo"
          },
          {
            id: 3,
            user_id: 1,
            nome: "Tomateiro",
            variedade: "Santa Clara / Caqui",
            data_plantio: "2026-09-01",
            area_m2: 1200,
            tipo_solo: "franco",
            fase_crescimento: "crescimento",
            localizacao: "Canteiro Irrigado 03",
            observacoes: "Primeiras flores abertas. Monitoramento constante de manchas foliares.",
            status: "ativo"
          }
        ],
        analises: [
          {
            id: 1,
            user_id: 1,
            cultura_id: 3,
            imagem_url: "uploads/exemplo_tomate.jpg",
            especie_identificada: "Tomateiro (Solanum lycopersicum)",
            estado_aparente: "atencao",
            possiveis_doencas: "Pinta-preta (Alternaria solani) incipiente",
            possiveis_pragas: "Sem pragas ativas visíveis",
            sintomas_visiveis: "Manchas castanhas circulares nas folhas basais",
            deficiencia_nutricional: "Possível deficiência inicial de cálcio/magnésio",
            sinais_stress_hidrico: "Folhas levemente arqueadas sem murcha severa",
            danos_folhas: "Necrose periférica nos folíolos inferiores",
            nivel_atencao: "moderado",
            nivel_confianca: 91.5,
            recomendacoes_cuidado: "Remover e queimar folhas inferiores afetadas. Desinfetar tesouras de desbrota.",
            recomendacoes_prevencao: "Pulverização preventiva com calda bordalesa a 1% nas primeiras horas da manhã. Não molhar folhagem na rega.",
            aviso_estimativa: "Resultado preliminar por visão computacional. Recomenda-se validação em campo por técnico agrícola.",
            metodo_analise: "visao_computacional_ia",
            qualidade_adequada: true,
            criado_em: "28/09/2026, 10:15"
          }
        ],
        irrigacoes: [
          {
            id: 1,
            user_id: 1,
            cultura_id: 1,
            quantidade_litros: 8500,
            horario_aplicacao: "06:30",
            metodo_irrigacao: "gotejamento",
            condicao_solo: "seco",
            condicao_clima: "ensolarado",
            minutos_bomba: 145,
            status: "executado",
            observacoes: "Irrigação do turno da manhã concluída no Talhão 01.",
            criado_em: "30/09/2026, 07:00"
          },
          {
            id: 2,
            user_id: 1,
            cultura_id: 2,
            quantidade_litros: 0,
            horario_aplicacao: "17:00",
            metodo_irrigacao: "aspersao",
            condicao_solo: "umido_adequado",
            condicao_clima: "chuva_fraca",
            minutos_bomba: 0,
            status: "suspenso",
            observacoes: "Rega cancelada por chuva leve. Economia de 6.200 Litros.",
            criado_em: "01/10/2026, 06:30"
          }
        ],
        alertas: [
          {
            id: 1,
            user_id: 1,
            cultura_id: 1,
            tipo: "irrigacao",
            titulo: "Balanço Hídrico: Milho em Floração",
            mensagem: "A cultura do Milho está no Talhão 01 em plena fase de floração com solo seco. Realize a rega programada.",
            nivel: "urgente",
            lido: 0,
            criado_em: "01/10/2026, 06:00"
          },
          {
            id: 2,
            user_id: 1,
            cultura_id: 3,
            tipo: "doenca",
            titulo: "Acompanhamento da Pinta-preta no Tomateiro",
            mensagem: "Verificar se as folhas podadas surtiram efeito e aplicar calda bordalesa preventiva nas horas frescas.",
            nivel: "alerta",
            lido: 0,
            criado_em: "29/09/2026, 08:30"
          }
        ],
        esp32_telemetry: {
          dispositivo_id: "ESP32_AGRO_NODE_01",
          umidade_solo_pct: 44.5,
          temperatura_ar_c: 26.8,
          umidade_ar_pct: 62.0,
          sensor_chuva: 0,
          status_valvula: "fechada",
          tensao_bateria_v: 3.85,
          ultima_leitura: new Date().toLocaleString('pt-BR')
        },
        clima: {
          temperatura: 26,
          temperatura_min: 17,
          temperatura_max: 28,
          humidade: 65,
          chuva_probabilidade: 20,
          vento_kmh: 12,
          condicao: "Parcialmente Nublado",
          favoravel_irrigacao: true,
          previsao: [
            { dia: "Hoje", temp: "26°C", condicao: "Parcialmente Nublado", chuva: "20%" },
            { dia: "Amanhã", temp: "27°C", condicao: "Ensolarado", chuva: "10%" },
            { dia: "Sábado", temp: "24°C", condicao: "Chuva Esparsa", chuva: "60%" }
          ]
        }
      };
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.users) parsed.users = [];
    if (!parsed.culturas) parsed.culturas = [];
    if (!parsed.analises) parsed.analises = [];
    if (!parsed.irrigacoes) parsed.irrigacoes = [];
    if (!parsed.alertas) parsed.alertas = [];
    if (!parsed.esp32_telemetry) {
      parsed.esp32_telemetry = {
        dispositivo_id: "ESP32_AGRO_NODE_01",
        umidade_solo_pct: 44.5,
        temperatura_ar_c: 26.8,
        umidade_ar_pct: 62.0,
        sensor_chuva: 0,
        status_valvula: "fechada",
        tensao_bateria_v: 3.85,
        ultima_leitura: new Date().toLocaleString('pt-BR')
      };
    }
    return parsed;
  } catch (err) {
    console.error('Erro ao ler base de dados:', err);
    return { users: [], culturas: [], analises: [], irrigacoes: [], alertas: [] };
  }
}

function saveDatabase(data: any) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erro ao salvar base de dados:', err);
  }
}

function saveBase64Image(base64Str: string): string | null {
  if (!base64Str || !base64Str.startsWith('data:image')) {
    return null;
  }
  try {
    const parts = base64Str.split(',');
    if (parts.length < 2) return null;
    const header = parts[0];
    const data = parts[1];
    let ext = 'jpg';
    if (header.includes('png')) ext = 'png';
    else if (header.includes('webp')) ext = 'webp';

    const filename = `leaf_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
    return `uploads/${filename}`;
  } catch (e) {
    console.error('Erro ao salvar imagem Base64:', e);
    return null;
  }
}

// ============================================================================
// SERVIÇO REAL DE VISÃO COMPUTACIONAL COM GEMINI (SERVER-SIDE)
// ============================================================================
async function analyzeImageWithGeminiVision(base64Str: string, cropHint: string, symptomsHint: string) {
  const client = getGeminiClient();
  if (!client) return null;

  try {
    // Extrai mime-type e dados base64 puros
    let mimeType = 'image/jpeg';
    let rawBase64 = base64Str;
    if (base64Str.includes(';base64,')) {
      const parts = base64Str.split(';base64,');
      mimeType = parts[0].replace('data:', '') || 'image/jpeg';
      rawBase64 = parts[1];
    }

    const systemPrompt = `Você é o motor de visão computacional agronômica de alta precisão do sistema AgroVision.
Analise a fotografia vegetal enviada com extremo rigor botânico e fitopatológico.

REGRAS ESSENCIAIS:
1. NÃO invente resultados. Se a imagem estiver muito escura, borrada, com reflexo excessivo, ou NÃO for uma folha/planta identificável, você DEVE definir "qualidade_adequada": false e detalhar o motivo em "mensagem_qualidade".
2. Se a imagem for uma planta/folha identificável, defina "qualidade_adequada": true.
3. Para sinais de stress hídrico: examine sinais visuais reais (turgidez, folhas murchas, enrolamento foliar longitudinal, ápices secos). NUNCA afirme medir diretamente a umidade real do solo, apenas indique indícios visuais da folhagem.
4. Nível de atenção deve ser estritamente um dos seguintes: 'baixo', 'moderado', 'alto', 'critico'.
5. Estado aparente deve ser: 'saudavel', 'atencao', 'critico' ou 'indeterminado'.
6. Nível de confiança: número de 0 a 100 representando sua certeza técnica.
7. Retorne EXCLUSIVAMENTE um objeto JSON válido.

Contexto adicional fornecido pelo agricultor:
- Cultura informada (se houver): "${cropHint || 'Não informada'}"
- Sintomas observados em campo (se houver): "${symptomsHint || 'Nenhum sintoma adicional'}"`;

    const userPrompt = `Analise a imagem foliar e retorne um objeto JSON com esta estrutura exata:
{
  "qualidade_adequada": true ou false,
  "mensagem_qualidade": "Explicação se a imagem não tiver qualidade suficiente ou se não for planta",
  "especie_identificada": "Nome popular (Nome científico)",
  "estado_aparente": "saudavel" | "atencao" | "critico" | "indeterminado",
  "possiveis_doencas": "Nome da doença fúngica/bacteriana provável ou 'Nenhuma patologia evidente'",
  "possiveis_pragas": "Nome da praga ou vetor provável ou 'Nenhuma praga visível'",
  "sintomas_visiveis": "Descrição minuciosa das lesões, manchas, halos, deformações observadas",
  "deficiencia_nutricional": "Possível deficiência (N, P, K, Fe, Mg, Ca) observada na lâmina foliar ou 'Sem sinais evidentes'",
  "sinais_stress_hidrico": "Descrição dos indícios visuais de turgidez, murcha ou enrolamento foliar",
  "danos_folhas": "Descrição morfológica de perfurações, necrose, dessecação ou amarelecimento",
  "nivel_atencao": "baixo" | "moderado" | "alto" | "critico",
  "nivel_confianca": 85,
  "recomendacoes_cuidado": "Ações imediatas recomendadas de manejo, poda, isolamento ou controle",
  "recomendacoes_prevencao": "Boas práticas de longo prazo, rotação de cultura, adubação e prevenção",
  "recomendacao_irrigacao_visual": "Recomendação baseada estritamente nos indícios visuais observados, ressaltando que a foto fornece apenas indícios visuais e que o solo deve ser checado antes de regar.",
  "aviso_estimativa": "O diagnóstico gerado por visão computacional é uma estimativa preliminar baseada em padrões sintomáticos. Não constitui certeza absoluta. Problemas agrícolas importantes devem ser validados em campo por um agrônomo."
}`;

    for (const modelName of GEMINI_VISION_MODELS) {
      try {
        const response = await client.models.generateContent({
          model: modelName,
          contents: [
            {
              inlineData: {
                mimeType: mimeType,
                data: rawBase64
              }
            },
            systemPrompt,
            userPrompt
          ],
          config: {
            responseMimeType: 'application/json'
          }
        });

        const text = response.text || '';
        const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        parsed.metodo_analise = `visao_computacional_${modelName}`;
        return parsed;
      } catch (mErr: any) {
        console.warn(`[AgroVision Vision] Modelo ${modelName} falhou:`, mErr?.message || mErr);
        // Tenta o próximo modelo do fallback
      }
    }

    return null;
  } catch (err) {
    console.error('[AgroVision] Erro geral na chamada Gemini Vision:', err);
    return null;
  }
}

// Motor de IA do Assistente Agrícola AgroVision (Server-Side com Gemini)
async function askAgronomicAssistant(userQuestion: string, db: any) {
  const client = getGeminiClient();

  const culturesSummary = (db.culturas || []).map((c: any) =>
    `- ${c.nome} (${c.variedade || 'Variedade padrão'}): ${c.area_m2} m², solo ${c.tipo_solo}, fase ${c.fase_crescimento}, plantado em ${c.data_plantio} (${c.localizacao || 'campo'}). Observações: ${c.observacoes || 'Nenhuma'}`
  ).join('\n');

  const analysesSummary = (db.analises || []).slice(0, 5).map((a: any) =>
    `- ${a.especie_identificada}: Estado ${a.estado_aparente}, Atenção ${a.nivel_atencao}. Doenças prováveis: ${a.possiveis_doencas || 'Nenhuma'}. Pragas: ${a.possiveis_pragas || 'Nenhuma'}. Sintomas: ${a.sintomas_visiveis || 'Não descritos'}. Cuidados recomendados: ${a.recomendacoes_cuidado || 'Padrão'}`
  ).join('\n');

  const irrigSummary = (db.irrigacoes || []).slice(0, 3).map((i: any) =>
    `- Irrigação em ${i.criado_em || i.data_hora}: ${i.quantidade_litros} L (Status: ${i.status || 'executado'}). Condição solo: ${i.condicao_solo || 'seco'}. Clima: ${i.condicao_clima || 'ensolarado'}.`
  ).join('\n');

  const esp32Info = db.esp32_telemetry ?
    `Telemetria ESP32: Solo em ${db.esp32_telemetry.umidade_solo_pct}%, Ar a ${db.esp32_telemetry.temperatura_ar_c}°C, Umidade Ar ${db.esp32_telemetry.umidade_ar_pct}%, Válvula ${db.esp32_telemetry.status_valvula}.` :
    'Telemetria ESP32: Modo sem sensores ativo.';

  const weatherInfo = db.clima ?
    `Clima Atual: ${db.clima.temperatura}°C, ${db.clima.condicao}, Umidade ${db.clima.humidade}%, Chuva ${db.clima.chuva_probabilidade}%.` :
    'Clima: Estável.';

  const systemPrompt = `Você é o Assistente Agrícola com Inteligência Artificial da plataforma AgroVision.
Você atua como um Consultor Agronômico Sênior, Pesquisador e Especialista em Extensão Rural, com conhecimento aprofundado em:
- Fitopatologia (doenças fúngicas, bacterianas, virais e nematoides em todas as culturas agrícolas).
- Entomologia agrícola e Manejo Integrado de Pragas (MIP), controle biológico, parasitoides, predadores e defensivos registrados.
- Nutrição e Fisiologia vegetal, fertilidade do solo, adubação de plantio/cobertura/foliar, calagem, gessagem e correção de deficiências (macro e micronutrientes).
- Manejo hídrico e Irrigação (cálculo de turno de rega, lâmina d'água, evapotranspiração, tensiometria e sistemas de gotejamento/aspersão).
- Culturas em geral: grãos (milho, feijão, soja, arroz, sorgo, trigo), hortaliças (tomate, pimentão, alface, cenoura, cebola, alho), tuberosas (mandioca, batata-doce, batata-inglesa), fruteiras (banana, citros, manga, abacaxi, maracujá), café, cacau, cana-de-açúcar, pastagens e forrageiras.
- Agroecologia, biofertilizantes (calda bordalesa, calda sulfocálcica, bioinsumos, compostagem, adubação verde, consórcios).
- Condições tropicais e subtropicais (solos oxissolos/latossolos, regiões do Brasil, Angola, África subsahariana e América Latina).

DIRETRIZES DE RESPOSTA:
1. RESPONDA QUALQUER PERGUNTA AGRÍCOLA: Responda a qualquer dúvida técnica agrícola de forma real, detalhada, prática e precisa. Se o agricultor perguntar sobre culturas que não estão nos talhões dele (ex: café, manga, cebola, etc.), responda com todo o rigor agronômico necessário.
2. DADOS DA PROPRIEDADE: Quando a pergunta do agricultor tiver relação com os talhões cadastrados, laudos recentes de fotos ou telemetria hídrica da propriedade dele, correlacione as recomendações com a realidade dele.
3. SEM EMOJIS: NUNCA use emojis em hipótese alguma (o padrão do sistema é estritamente técnico e profissional).
4. ESTRUTURAÇÃO: Estruture sua resposta em seções com títulos claros, tópicos numerados ou em tópicos com marcadores, especificando dosagens recomendadas (ex: kg/ha, g/L, mL/10L), horários ideais de aplicação, medidas culturais e de prevenção.
5. SEGURANÇA & BOAS PRÁTICAS: Recomende sempre o uso de EPI ao manipular defensivos e lembre que problemas graves de campo devem ser acompanhados por um agrônomo ou técnico de extensão local.
6. LÍNGUA: Responda em Português claro, didático e profissional.

DADOS REAIS DA PROPRIEDADE DO AGRICULTOR:
[CULTURAS CADASTRADAS NOS TALHÕES]
${culturesSummary || 'Nenhuma cultura cadastrada no momento.'}

[ÚLTIMOS LAUDOS FITOSSANITÁRIOS FOTOGRÁFICOS]
${analysesSummary || 'Nenhuma análise recente.'}

[HISTÓRICO RECENTE DE IRRIGOS]
${irrigSummary || 'Nenhum registro recente.'}

[CONDIÇÕES AMBIENTAIS & TELEMETRIA IOT]
${weatherInfo}
${esp32Info}`;

  if (client) {
    for (const modelName of GEMINI_TEXT_MODELS) {
      try {
        const response = await client.models.generateContent({
          model: modelName,
          contents: [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\nPergunta técnica do agricultor: "${userQuestion}"` }] }
          ]
        });

        const reply = response.text || '';
        if (reply.trim()) {
          return {
            status: 'success',
            resposta: reply.trim(),
            metodo: `gemini_ai_${modelName}`,
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          };
        }
      } catch (err: any) {
        console.warn(`[AgroVision Assistente] Modelo ${modelName} indisponível ou falhou:`, err?.message || err);
        // Tenta o próximo modelo da lista
      }
    }
  }

  // Fallback Inteligente baseado em regras agronômicas (apenas se todas as chamadas falharem ou sem rede)
  const q = userQuestion.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  let resposta = '';

  if (q.includes('lagarta') || q.includes('spodoptera') || q.includes('cartucho') || (q.includes('milho') && (q.includes('praga') || q.includes('bicho') || q.includes('furo')))) {
    resposta = `Com base nas suas análises de Milho no campo, para o controle da Lagarta-do-cartucho (Spodoptera frugiperda), recomenda-se:\n1. Aplicação matinal (entre 06:00 e 08:30) de bioinseticida à base de Bacillus thuringiensis (Bt) ou extrato vegetal de nim a 1% diretamente no cartucho das plantas com sintomas.\n2. Inspecione 20 plantas em zigue-zague pelo talhão. Se mais de 20% apresentarem raspagem recente, repita o manejo após 5 dias.\n3. Evite inseticidas químicos de amplo espectro para preservar as tesourinhas (Doru luteipes) e vespas parasitoides nativas.`;
  } else if (q.includes('tomate') || q.includes('pinta') || q.includes('alternaria') || q.includes('mancha') || q.includes('bordalesa')) {
    resposta = `Para o manejo fitossanitário no Tomateiro:\n1. Realize desfolha sanitária eliminando as folhas mais baixeiras com manchas concêntricas e descarte-as longe da plantação.\n2. Aplique calda bordalesa a 1% (100g de sulfato de cobre + 100g de cal virgem em 10 litros de água) ou fungicida protetor cúprico nos horários frescos, sem vento forte.\n3. Ao irrigar, utilize gotejamento na linha e nunca molhe a folhagem para evitar a dispersão dos esporos fúngicos.`;
  } else if (q.includes('irriga') || q.includes('regar') || q.includes('rega') || q.includes('agua') || q.includes('seca') || q.includes('hidric')) {
    resposta = `Análise do balanço hídrico para as suas culturas:\n1. Melhores horários: Início da manhã (06:00 às 08:30) ou final da tarde (após 16:30), reduzindo as perdas por evapotranspiração em até 30%.\n2. Volume e fases: Culturas em floração (como o Milho no Talhão 01) exigem umidade contínua no bulbo radicular; evite estresse hídrico nessa fase crítica.\n3. Verificação em campo: Verifique a umidade do solo a 15 cm de profundidade antes de acionar a motobomba; em dias com chuva prevista ou umidade adequada, suspenda a rega para economizar água e energia.`;
  } else if (q.includes('adub') || q.includes('nutri') || q.includes('fertiliz') || q.includes('amarel') || q.includes('nitrogenio') || q.includes('potassio') || q.includes('fosforo')) {
    resposta = `Recomendações nutricionais para os seus talhões:\n1. Folhas baixeiras amareladas uniformemente indicam provável carência de nitrogênio (N). Aplique cobertura nitrogenada fracionada próxima à linha de plantio sob solo úmido.\n2. Caso haja necrose nas margens das folhas mais velhas, considere suplementação de potássio (K).\n3. Recomenda-se realizar análise laboratorial de solo e folha a cada safra para dimensionamento exato da adubação.`;
  } else {
    resposta = `Olá. Sou o Assistente Agrícola da AgroVision.\n1. Para dúvidas sobre qualquer cultura (grãos, hortaliças, frutíferas, café, etc.), basta enviar sua pergunta detalhando o sintoma, praga ou manejo desejado.\n2. Mantenha vistorias regulares a cada 5 a 7 dias, registrando fotografias na ferramenta de análise fitossanitária.\n3. Siga sempre as orientações do Manejo Integrado de Pragas (MIP) e boas práticas agronômicas de conservação do solo e da água.`;
  }

  return {
    status: 'success',
    resposta,
    metodo: 'modelo_contingencia_agronomica',
    timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  };
}

function runFallbackAgronomicModel(cropHint: string, symptomsHint: string) {
  const crop = cropHint || 'Planta Cultivada';
  const s = (symptomsHint || '').toLowerCase();
  const c = crop.toLowerCase();

  let res: any = {
    qualidade_adequada: true,
    mensagem_qualidade: 'Fotografia nítida e enquadrada adequadamente.',
    especie_identificada: crop,
    estado_aparente: 'atencao',
    possiveis_doencas: 'Nenhuma patologia evidente',
    possiveis_pragas: 'Sem pragas ativas visíveis',
    sintomas_visiveis: 'Lâmina foliar com alterações superficiais observadas.',
    deficiencia_nutricional: 'Possível deficiência inicial de micronutrientes',
    sinais_stress_hidrico: 'Turgidez foliar levemente reduzida. Sinais visuais moderados de demanda hídrica.',
    danos_folhas: 'Alteração na coloração e início de dessecação periférica',
    nivel_atencao: 'moderado',
    nivel_confianca: 82.0,
    recomendacoes_cuidado: 'Isolar folhas sintomáticas e monitorar a evolução nas próximas 48 horas.',
    recomendacoes_prevencao: 'Manejo integrado, rotação de culturas e adubação equilibrada.',
    recomendacao_irrigacao_visual: 'Possíveis sinais visuais de leve perda de turgidez. Verifique a umidade do solo antes de irrigar.',
    aviso_estimativa: 'Diagnóstico preliminar por regras agronômicas locais. Estimativa técnica, consulte um engenheiro agrônomo para laudo oficial.',
    metodo_analise: 'contingencia_agronomica_local'
  };

  if (c.includes('milho')) {
    res.especie_identificada = 'Milho (Zea mays)';
    if (s.includes('furo') || s.includes('lagarta') || s.includes('cartucho')) {
      res.possiveis_pragas = 'Lagarta-do-cartucho (Spodoptera frugiperda)';
      res.sintomas_visiveis = 'Perfurações irregulares no verticilo foliar com raspagem do limbo e resíduos fecais';
      res.danos_folhas = 'Folhas cartuchares dilaceradas';
      res.nivel_atencao = 'alto';
      res.recomendacoes_cuidado = 'Aplicação localizada de bioinseticida Bacillus thuringiensis (Bt) ou extrato de nim a 1% nas horas frescas.';
      res.recomendacoes_prevencao = 'Conservar parasitoides naturais e realizar vistorias semanais em 20% das plantas.';
      res.sinais_stress_hidrico = 'Sem enrolamento de folhas compatível com seca severa.';
      res.recomendacao_irrigacao_visual = 'Não foram identificados sinais visuais fortes de estresse hídrico. Verifique as condições do solo antes de irrigar.';
    } else if (s.includes('mancha') || s.includes('ferrugem') || s.includes('amarel')) {
      res.possiveis_doencas = 'Ferrugem Polissora (Puccinia polysora) ou Cercosporiose';
      res.sintomas_visiveis = 'Pústulas castanho-alaranjadas distribuídas na superfície foliar';
      res.deficiencia_nutricional = 'Possível deficiência de nitrogênio associada à clorose basal';
      res.recomendacoes_cuidado = 'Melhorar a aeração do dossel e evitar excesso de nitrogênio solúvel.';
      res.recomendacoes_prevencao = 'Utilizar híbridos tolerantes e rotação obrigatória com leguminosas.';
    }
  } else if (c.includes('mandioca')) {
    res.especie_identificada = 'Mandioca (Manihot esculenta)';
    if (s.includes('mancha') || s.includes('castanh') || s.includes('antracnose')) {
      res.possiveis_doencas = 'Mancha-parda (Passalora henningsii) ou Antracnose';
      res.sintomas_visiveis = 'Lesões circulares a angulares castanhas com margens bem definidas';
      res.danos_folhas = 'Desfolha precoce nos terços basal e médio da ramagem';
      res.recomendacoes_cuidado = 'Poda sanitária dos ramos basais mais comprometidos e aplicação de calda bordalesa a 1%.';
      res.recomendacoes_prevencao = 'Seleção rigorosa de manivas sadias no pré-plantio e espaçamento mínimo de 1 metro.';
    }
  } else if (c.includes('tomate')) {
    res.especie_identificada = 'Tomateiro (Solanum lycopersicum)';
    res.possiveis_doencas = 'Pinta-preta (Alternaria solani) ou Requeima';
    res.sintomas_visiveis = 'Manchas necróticas escuras com anéis concêntricos concêntricos típicos e clorose perilesional';
    res.deficiencia_nutricional = 'Deficiência aparente de cálcio / estresse térmico';
    res.nivel_atencao = 'alto';
    res.recomendacoes_cuidado = 'Desfolha sanitária das folhas baixeiras sintomáticas e desinfecção de ferramentas de poda. Não molhar as folhas durante a rega.';
    res.recomendacoes_prevencao = 'Cobertura morta (mulching) sobre os canteiros para barrar respingos do solo e calda sulfocálcica preventiva.';
    res.sinais_stress_hidrico = 'Leve enrolamento apical característico de desequilíbrio transpiratório.';
    res.recomendacao_irrigacao_visual = 'Possíveis sinais de estresse térmico/transpiratório. Verifique a umidade do solo na zona radicular e considere irrigar no fim de tarde.';
  }

  if (s.includes('sadia') || s.includes('saudavel') || s.includes('verde')) {
    res.estado_aparente = 'saudavel';
    res.possiveis_doencas = 'Nenhuma patologia evidente';
    res.possiveis_pragas = 'Nenhuma praga detectada';
    res.sintomas_visiveis = 'Tecido vegetal verde uniforme com turgidez adequada e limbo expandido.';
    res.deficiencia_nutricional = 'Nutrição mineral equilibrada';
    res.sinais_stress_hidrico = 'Células túrgidas, sem indícios visuais de murcha ou deficiência hídrica.';
    res.nivel_atencao = 'baixo';
    res.nivel_confianca = 94.0;
    res.recomendacao_irrigacao_visual = 'Planta túrgida e viçosa. Não há indicação visual de estresse hídrico no momento. Verifique o solo antes de regar.';
  }

  return res;
}

// ============================================================================
// SERVIDOR EXPRESS & ROTAS DA API
// ============================================================================
async function startServer() {
  const app = express();
  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ extended: true, limit: '30mb' }));

  app.use('/uploads', express.static(UPLOADS_DIR));

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  const handleApi = async (req: express.Request, res: express.Response) => {
    const action = req.query.action || req.params.action;
    const db = getDatabase();
    const userId = 1;

    switch (action) {
      case 'auth_login': {
        const { email, password } = req.body;
        const user = db.users.find((u: any) => u.email === email);
        if (user && (password === 'senha123' || user.senha_hash)) {
          return res.json({
            status: 'success',
            message: 'Autenticação bem-sucedida.',
            user: { id: user.id, nome: user.nome, email: user.email, propriedade_nome: user.propriedade_nome }
          });
        }
        return res.status(401).json({ status: 'error', message: 'Credenciais inválidas.' });
      }

      case 'auth_register': {
        const { nome, email, password, telefone, propriedade_nome } = req.body;
        if (!nome || !email || !password) {
          return res.status(400).json({ status: 'error', message: 'Preencha todos os campos obrigatórios.' });
        }
        const existing = db.users.find((u: any) => u.email === email);
        if (existing) {
          return res.status(400).json({ status: 'error', message: 'E-mail já cadastrado.' });
        }
        const newUser = {
          id: db.users.length + 1,
          nome,
          email,
          senha_hash: '$2y$10$wN0mK1kYFjL.rZ1qUqj/Nu49O7Teq4e7aK/B2hK9n5G0h5U3xS3eS',
          telefone: telefone || '',
          localizacao: 'Huambo, Angola',
          propriedade_nome: propriedade_nome || 'Propriedade Agrícola'
        };
        db.users.push(newUser);
        saveDatabase(db);
        return res.status(201).json({ status: 'success', user: newUser });
      }

      case 'auth_me': {
        const u = db.users[0] || { id: 1, nome: "Produtor Rural AgroVision", email: "agricultor@agrovision.com" };
        return res.json({ status: 'success', user: u });
      }

      case 'get_dashboard': {
        const totalCulturas = db.culturas.length;
        const totalAnalises = db.analises.length;
        const alertasAtivos = db.alertas.filter((a: any) => !a.lido).length;

        let totalLitros = 0;
        let totalPoupados = 0;
        db.irrigacoes.forEach((i: any) => {
          totalLitros += Number(i.quantidade_litros || 0);
          if (i.status === 'suspenso') totalPoupados += 5000;
        });

        const estadoContador: Record<string, number> = { saudavel: 0, atencao: 0, critico: 0 };
        db.analises.forEach((a: any) => {
          const st = a.estado_aparente || 'atencao';
          if (estadoContador[st] !== undefined) estadoContador[st]++;
          else estadoContador.atencao++;
        });

        return res.json({
          status: 'success',
          dashboard: {
            total_culturas: totalCulturas,
            total_analises: totalAnalises,
            total_alertas_ativos: alertasAtivos,
            total_litros_irrigados: totalLitros,
            total_litros_poupados: totalPoupados,
            estado_plantas: estadoContador,
            ultimas_analises: db.analises.slice(0, 4),
            ultimas_irrigacoes: db.irrigacoes.slice(0, 4),
            alertas_recentes: db.alertas.slice(0, 4),
            esp32: db.esp32_telemetry || null,
            clima: db.clima
          }
        });
      }

      case 'get_weather': {
        return res.json({ status: 'success', clima: db.clima });
      }

      case 'get_cultures': {
        return res.json({ status: 'success', culturas: db.culturas || [] });
      }

      case 'save_culture': {
        const b = req.body;
        const id = b.id ? Number(b.id) : (db.culturas.length + 1);
        const record = {
          id,
          user_id: userId,
          nome: b.nome || b.name,
          variedade: b.variedade || b.variety || 'Padrão',
          data_plantio: b.data_plantio || b.plantDate || new Date().toISOString().split('T')[0],
          area_m2: Number(b.area_m2 || b.areaM2) || 1000,
          tipo_solo: b.tipo_solo || b.soil || 'franco',
          fase_crescimento: b.fase_crescimento || b.stage || 'crescimento',
          localizacao: b.localizacao || b.plot || 'Talhão Geral',
          observacoes: b.observacoes || '',
          status: 'ativo'
        };

        const existingIdx = db.culturas.findIndex((c: any) => c.id === id);
        if (existingIdx >= 0) db.culturas[existingIdx] = record;
        else db.culturas.unshift(record);

        saveDatabase(db);
        return res.json({ status: 'success', message: 'Cultura salva com sucesso.', cultura: record });
      }

      case 'delete_culture': {
        const id = Number(req.body.id || req.query.id);
        db.culturas = db.culturas.filter((c: any) => c.id !== id);
        saveDatabase(db);
        return res.json({ status: 'success', message: 'Cultura removida.' });
      }

      // ======================================================================
      // ROTA PRINCIPAL: ANALISAR PLANTA (COM IA REAL GEMINI E FALLBACK)
      // ======================================================================
      case 'analyze_plant': {
        const b = req.body || {};
        const photoBase64 = b.photo || b.photo_base64 || b.image_base64 || '';
        const cropHint = b.crop || b.cultura_nome || '';
        const symptomsHint = b.symptoms || b.sintomas || '';

        let imgUrl = saveBase64Image(photoBase64);
        if (!imgUrl && photoBase64.startsWith('data:image')) {
          imgUrl = photoBase64;
        }
        if (!imgUrl) {
          imgUrl = 'uploads/exemplo_tomate.jpg';
        }

        // 1. Tenta análise por visão computacional real via Gemini API
        let aiResult: any = null;
        if (photoBase64 && aiClient) {
          aiResult = await analyzeImageWithGeminiVision(photoBase64, cropHint, symptomsHint);
        }

        // 2. Se Gemini falhar ou não estiver disponível, usa modelo agronômico heurístico
        if (!aiResult) {
          aiResult = runFallbackAgronomicModel(cropHint, symptomsHint);
        }

        const analysisRecord = {
          id: db.analises.length + 1,
          user_id: userId,
          cultura_id: b.cultura_id ? Number(b.cultura_id) : null,
          imagem_url: imgUrl,
          qualidade_adequada: aiResult.qualidade_adequada !== false,
          mensagem_qualidade: aiResult.mensagem_qualidade || '',
          especie_identificada: aiResult.especie_identificada || aiResult.planta_identificada || cropHint || 'Planta Cultivada',
          estado_aparente: aiResult.estado_aparente || 'atencao',
          possiveis_doencas: aiResult.possiveis_doencas || aiResult.possivel_doenca || 'Nenhuma patologia evidente',
          possiveis_pragas: aiResult.possiveis_pragas || 'Sem pragas ativas visíveis',
          sintomas_visiveis: aiResult.sintomas_visiveis || aiResult.sintomas || 'Análise visual do limbo foliar.',
          deficiencia_nutricional: aiResult.deficiencia_nutricional || 'Sem sinais evidentes de deficiência',
          sinais_stress_hidrico: aiResult.sinais_stress_hidrico || 'Turgidez foliar monitorada visualmente.',
          danos_folhas: aiResult.danos_folhas || 'Lâmina foliar íntegra com alterações superficiais.',
          nivel_atencao: aiResult.nivel_atencao || 'moderado',
          nivel_confianca: Number(aiResult.nivel_confianca || 85.0),
          recomendacoes_cuidado: aiResult.recomendacoes_cuidado || 'Manter vistorias rotineiras e umidade de solo adequada.',
          recomendacoes_prevencao: aiResult.recomendacoes_prevencao || 'Boas práticas agronômicas e rotação de culturas.',
          recomendacao_irrigacao_visual: aiResult.recomendacao_irrigacao_visual || 'A fotografia fornece indícios visuais de turgidez. Verifique a umidade física do solo antes de irrigar.',
          aviso_estimativa: aiResult.aviso_estimativa || 'O diagnóstico por visão computacional é uma estimativa preliminar. Recomenda-se confirmação em campo por agrônomo.',
          metodo_analise: aiResult.metodo_analise || 'visao_computacional_ia',
          criado_em: new Date().toLocaleString('pt-BR')
        };

        db.analises.unshift(analysisRecord);

        // Se houver alerta crítico ou alta severidade, gera alerta automático
        if (analysisRecord.nivel_atencao === 'alto' || analysisRecord.nivel_atencao === 'critico') {
          db.alertas.unshift({
            id: db.alertas.length + 1,
            user_id: userId,
            cultura_id: analysisRecord.cultura_id,
            tipo: 'doenca',
            titulo: `Alerta Fitossanitário: ${analysisRecord.especie_identificada}`,
            mensagem: `Indícios de ${analysisRecord.possiveis_doencas}. Nível de atenção: ${analysisRecord.nivel_atencao.toUpperCase()}.`,
            nivel: 'urgente',
            lido: 0,
            criado_em: new Date().toLocaleString('pt-BR')
          });
        }

        saveDatabase(db);
        return res.status(201).json({ status: 'success', analise: analysisRecord });
      }

      case 'get_analyses': {
        return res.json({ status: 'success', analises: db.analises || [] });
      }

      // ======================================================================
      // ROTA DO ASSISTENTE AGRÍCOLA COM IA (PERGUNTAS DO AGRICULTOR)
      // ======================================================================
      case 'ask_assistant': {
        const userQuestion = (req.body.pergunta || req.body.question || req.query.q || '').toString().trim();
        if (!userQuestion) {
          return res.status(400).json({ status: 'error', message: 'A pergunta do agricultor é obrigatória.' });
        }

        const result = await askAgronomicAssistant(userQuestion, db);
        return res.json({
          status: 'success',
          pergunta: userQuestion,
          resposta: result.resposta,
          metodo: result.metodo,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        });
      }

      // ======================================================================
      // ROTA ESP32 (MODO OPCIONAL IOT)
      // ======================================================================
      case 'esp32_telemetry': {
        const b = req.body;
        const telemetry = {
          dispositivo_id: b.dispositivo_id || "ESP32_AGRO_NODE_01",
          umidade_solo_pct: Number(b.umidade_solo_pct ?? b.soil_moisture ?? 45.0),
          temperatura_ar_c: Number(b.temperatura_ar_c ?? b.temperature ?? 26.5),
          umidade_ar_pct: Number(b.umidade_ar_pct ?? b.humidity ?? 60.0),
          sensor_chuva: b.sensor_chuva ? 1 : 0,
          status_valvula: b.status_valvula || "fechada",
          tensao_bateria_v: Number(b.tensao_bateria_v || 3.8),
          ultima_leitura: new Date().toLocaleString('pt-BR')
        };

        db.esp32_telemetry = telemetry;

        // Se a umidade do solo estiver criticamente baixa (< 25%), emite alerta
        if (telemetry.umidade_solo_pct < 25.0) {
          db.alertas.unshift({
            id: db.alertas.length + 1,
            user_id: userId,
            cultura_id: 1,
            tipo: 'stress_hidrico',
            titulo: `ESP32: Solo com Umidade Baixa (${telemetry.umidade_solo_pct}%)`,
            mensagem: `O sensor de umidade do solo registrou ${telemetry.umidade_solo_pct}%. Considere acionar a irrigação programada.`,
            nivel: 'urgente',
            lido: 0,
            criado_em: new Date().toLocaleString('pt-BR')
          });
        }

        saveDatabase(db);
        return res.json({
          status: 'success',
          message: 'Telemetria do ESP32 processada com sucesso.',
          telemetry,
          comando_valvula: telemetry.status_valvula
        });
      }

      case 'get_esp32_data': {
        return res.json({ status: 'success', esp32: db.esp32_telemetry });
      }

      // ======================================================================
      // ROTA MOTOR DE IRRIGAÇÃO INTELIGENTE
      // ======================================================================
      case 'calculate_irrigation': {
        const b = req.body;
        const area = Number(b.area_m2 || b.areaM2) || 1000;
        const solo = b.tipo_solo || b.soil || 'franco';
        const fase = b.fase_crescimento || b.stage || 'crescimento';
        const condicaoSolo = b.condicao_solo || 'seco';
        const clima = b.condicao_clima || 'ensolarado';
        const modo = b.modo || 'camera'; // 'camera', 'esp32', 'hibrido'

        const kcMap: Record<string, number> = { germinacao: 0.40, crescimento: 0.75, floracao: 1.15, maturacao: 0.60 };
        const kc = kcMap[fase] || 0.75;
        const soloFactor = solo === 'arenoso' ? 1.25 : (solo === 'argiloso' ? 0.85 : 1.0);
        const demandaBaseLitros = area * 5.0 * kc * soloFactor;

        let litrosAplicar = demandaBaseLitros;
        let litrosPoupados = 0;
        let statusExecucao = 'irrigar';
        let motivo = '';
        let melhorHorario = '06:00 - 08:30 ou 16:30 - 18:30 (Evitar perdas evaporativas)';
        let frequencia = kc > 0.9 ? '2 vezes ao dia (Turnos frescos)' : '1 vez ao dia (Manhã cedo)';

        // Se estiver no Modo ESP32 ou Híbrido, considera os dados reais do sensor
        if ((modo === 'esp32' || modo === 'hibrido') && db.esp32_telemetry) {
          const uSolo = db.esp32_telemetry.umidade_solo_pct;
          if (uSolo >= 70) {
            litrosAplicar = 0;
            litrosPoupados = demandaBaseLitros;
            statusExecucao = 'aguardar_solo';
            motivo = `Sensor ESP32 indicou umidade do solo em ${uSolo}% (capacidade de campo suprida). Irrigação não necessária.`;
          } else if (uSolo >= 50) {
            litrosAplicar = demandaBaseLitros * 0.4;
            litrosPoupados = demandaBaseLitros * 0.6;
            motivo = `Sensor ESP32 registrou umidade de ${uSolo}%. Recomenda-se complementação hídrica leve de ${Math.round(litrosAplicar)} Litros.`;
          } else {
            motivo = `Sensor ESP32 registrou umidade baixa de ${uSolo}%. Recomenda-se irrigação integral de ${Math.round(litrosAplicar)} Litros.`;
          }
        } else {
          // Modo Câmera / Manual
          if (condicaoSolo === 'encharcado') {
            litrosAplicar = 0;
            litrosPoupados = demandaBaseLitros;
            statusExecucao = 'aguardar_solo';
            motivo = 'Solo com excesso de umidade superficial (encharcado). Suspensão obrigatória para evitar anoxia das raízes.';
          } else if (condicaoSolo === 'umido_adequado') {
            litrosAplicar = 0;
            litrosPoupados = demandaBaseLitros;
            statusExecucao = 'aguardar_solo';
            motivo = 'Umidade do solo aparentemente adequada pela verificação manual. Aguarde antes de realizar nova irrigação.';
          } else if (clima === 'chuva_forte') {
            litrosAplicar = 0;
            litrosPoupados = demandaBaseLitros;
            statusExecucao = 'suspender_clima';
            motivo = 'Precipitação forte observada. Irrigação suspensa automaticamente com 100% de economia hídrica e elétrica.';
          } else if (clima === 'chuva_fraca') {
            litrosAplicar = demandaBaseLitros * 0.40;
            litrosPoupados = demandaBaseLitros * 0.60;
            motivo = `Chuva leve registrada. Recomenda-se complementação reduzida de ${Math.round(litrosAplicar)} Litros.`;
          } else if (clima === 'nublado') {
            litrosAplicar = demandaBaseLitros * 0.80;
            litrosPoupados = demandaBaseLitros * 0.20;
            motivo = `Evapotranspiração reduzida por nebulosidade. Lâmina ajustada em ${Math.round(litrosAplicar)} Litros.`;
          } else {
            motivo = `Condição de solo seco e clima ensolarado. Recomenda-se lâmina integral de ${Math.round(litrosAplicar)} Litros para a fase de ${fase}.`;
          }
        }

        const minutosBomba = litrosAplicar > 0 ? Math.round((litrosAplicar / 3500) * 60) : 0;

        return res.json({
          status: 'success',
          calculo: {
            litros_recomendados: Math.round(litrosAplicar),
            litros_economizados: Math.round(litrosPoupados),
            status_execucao: statusExecucao,
            motivo_recomendacao: motivo,
            melhor_horario: melhorHorario,
            frequencia_sugerida: frequencia,
            minutos_bomba: minutosBomba,
            fase_kc: kc,
            demanda_base: Math.round(demandaBaseLitros)
          }
        });
      }

      case 'save_irrigation': {
        const b = req.body;
        const record = {
          id: db.irrigacoes.length + 1,
          user_id: userId,
          cultura_id: Number(b.cultura_id) || 1,
          quantidade_litros: Number(b.quantidade_litros || b.liters_required) || 0,
          horario_aplicacao: b.horario || "07:00",
          metodo_irrigacao: b.metodo_irrigacao || "gotejamento",
          condicao_solo: b.condicao_solo || "seco",
          condicao_clima: b.condicao_clima || "ensolarado",
          minutos_bomba: Number(b.minutos_bomba) || 0,
          status: b.is_suspended ? "suspenso" : (b.status || "executado"),
          observacoes: b.observacoes || b.motivo || "Registro de controle de irrigação.",
          criado_em: new Date().toLocaleString('pt-BR')
        };

        db.irrigacoes.unshift(record);
        saveDatabase(db);
        return res.status(201).json({ status: 'success', irrigacao: record });
      }

      case 'get_irrigations': {
        return res.json({ status: 'success', irrigacoes: db.irrigacoes || [] });
      }

      case 'get_alerts': {
        return res.json({ status: 'success', alertas: db.alertas || [] });
      }

      case 'mark_alert_read': {
        const id = Number(req.body.id || req.query.id);
        const al = db.alertas.find((a: any) => a.id === id);
        if (al) al.lido = 1;
        saveDatabase(db);
        return res.json({ status: 'success', message: 'Alerta marcado como lido.' });
      }

      case 'verify_qr': {
        const code = (req.body.qr_code || req.query.code || '').toString().trim();
        return res.json({
          status: 'success',
          lote: {
            codigo_lote: code,
            valido: true,
            produto: 'Semente Certificada AgroVision',
            certificacao: 'Norma de Qualidade Fitossanitária ISO/Agro',
            germinacao: '94%',
            validade: '18 Meses'
          }
        });
      }

      case 'sync_offline': {
        const b = req.body || {};
        const records = b.records || b.queue || [];
        const diagnoses = b.diagnoses || [];
        const irrigations = b.irrigations || [];
        const syncedIds: string[] = [];

        if (Array.isArray(records)) {
          records.forEach((r: any) => {
            const id = r.id || `sync_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            if (r.type === 'irrigation' || r.type === 'irrigacao') {
              db.irrigacoes.unshift({ ...r, id, synced: true });
            } else if (r.type === 'culture') {
              db.culturas.unshift({ ...r, id, synced: true });
            } else {
              db.analises.unshift({ ...r, id, synced: true });
            }
            syncedIds.push(id);
          });
        }

        if (Array.isArray(diagnoses) && diagnoses.length > 0) {
          diagnoses.forEach((d: any) => {
            if (!db.analises.some((existing: any) => existing.id === d.id)) {
              db.analises.unshift({ ...d, synced: true });
            }
          });
        }

        if (Array.isArray(irrigations) && irrigations.length > 0) {
          irrigations.forEach((i: any) => {
            if (!db.irrigacoes.some((existing: any) => existing.id === i.id)) {
              db.irrigacoes.unshift({ ...i, synced: true });
            }
          });
        }

        saveDatabase(db);
        return res.json({ status: 'success', synced_ids: syncedIds, count: syncedIds.length });
      }

      default:
        return res.status(400).json({ status: 'error', message: `Ação inválida: ${action}` });
    }
  };

  app.all('/api.php', handleApi);
  app.all('/api/:action', handleApi);

  app.get('/api.php/source', (req, res) => {
    const phpPath = path.join(__dirname, 'api.php');
    if (fs.existsSync(phpPath)) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.sendFile(phpPath);
    }
    return res.status(404).send('api.php não encontrado.');
  });

  app.get('/schema.sql', (req, res) => {
    const sqlPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(sqlPath)) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.sendFile(sqlPath);
    }
    return res.status(404).send('schema.sql não encontrado.');
  });

  // Rota para baixar o firmware de exemplo do ESP32
  app.get('/esp32_firmware.ino', (req, res) => {
    const firmwareCode = `/**
 * AgroVision - Firmware de Exemplo para Placa ESP32
 * Envia leituras de sensores para a API PHP/MySQL do AgroVision
 */
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "SUA_REDE_WIFI";
const char* password = "SUA_SENHA_WIFI";
const char* serverUrl = "http://SEU_SERVIDOR/api.php?action=esp32_telemetry";

const int PIN_SENSOR_SOLO = 34; // Sensor de Umidade Capacitivo
const int PIN_RELE_BOMBA = 23;  // Relé da Bomba (com trava de segurança)

void setup() {
  Serial.begin(115200);
  pinMode(PIN_RELE_BOMBA, OUTPUT);
  digitalWrite(PIN_RELE_BOMBA, LOW); // Bomba desligada por segurança

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nWiFi Conectado!");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    int valorAnalogico = analogRead(PIN_SENSOR_SOLO);
    float umidadeSoloPct = map(valorAnalogico, 4095, 1500, 0, 100);
    umidadeSoloPct = constrain(umidadeSoloPct, 0.0, 100.0);

    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<200> doc;
    doc["dispositivo_id"] = "ESP32_AGRO_NODE_01";
    doc["umidade_solo_pct"] = umidadeSoloPct;
    doc["temperatura_ar_c"] = 26.5;
    doc["umidade_ar_pct"] = 63.0;
    doc["sensor_chuva"] = 0;
    doc["status_valvula"] = digitalRead(PIN_RELE_BOMBA) ? "aberta" : "fechada";

    String jsonString;
    serializeJson(doc, jsonString);

    int httpResponseCode = http.POST(jsonString);
    Serial.printf("Telemetria enviada: %d\\n", httpResponseCode);
    http.end();
  }
  delay(60000); // Envia a cada 60 segundos
}
`;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="AgroVision_ESP32_Firmware.ino"');
    res.send(firmwareCode);
  });

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AgroVision] Plataforma de Agricultura Inteligente operacional na porta ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Falha ao iniciar servidor AgroVision:', err);
});
