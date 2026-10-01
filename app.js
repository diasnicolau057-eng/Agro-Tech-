/**
 * ============================================================================
 * AGROVISION - SISTEMA DE AGRICULTURA INTELIGENTE & DIAGNÓSTICO FOLIAR (ES6+)
 * Slogan: "Inteligência para uma agricultura mais eficiente."
 * ============================================================================
 * Módulos Operacionais:
 * 1. Análise Real da Planta por Câmera / Galeria com Pré-Visualização e IA
 * 2. Análise de Irrigação Através de Fotografia (Indícios Visuais de Stress Hídrico)
 * 3. Sistema Inteligente de Irrigação (Modo Câmera / Modo ESP32 / Modo Híbrido)
 * 4. Minhas Culturas (Acompanhamento e Histórico Individual por Talhão)
 * 5. Dashboard Profissional com Métricas, Gráficos e Clima
 * 6. Suporte Opcional a Sensores IoT ESP32 e Sincronização PHP/MySQL
 * ============================================================================
 */

const API_URL = 'api.php';
const STORAGE_KEYS = {
  USER: 'agrovision_logged_user',
  CROPS: 'agrovision_user_crops',
  DIAGNOSES: 'agrovision_diagnoses_records',
  IRRIGATIONS: 'agrovision_irrigation_logs',
  SYNC_QUEUE: 'agrovision_sync_queue_records',
  ESP32_DATA: 'agrovision_esp32_telemetry',
  PUMP_TIMER: 'agrovision_pump_timer_state',
  ASSISTANT_CHAT: 'agrovision_assistant_chat_history'
};

// Estado Global da Aplicação AgroVision
const AppState = {
  isOnline: navigator.onLine,
  activeTab: 'tab-scanner',
  user: null,
  crops: [],
  diagnoses: [],
  irrigations: [],
  syncQueue: [],
  irrigationMode: 'camera', // 'camera' | 'esp32' | 'hibrido'
  currentCapturedPhoto: null,
  lastAnalysisRecord: null,
  camera: {
    stream: null,
    facingMode: 'environment',
    isActive: false,
    mode: 'crop', // 'crop' | 'qr'
    qrInterval: null
  },
  esp32: {
    dispositivo_id: 'ESP32_AGRO_NODE_01',
    umidade_solo_pct: 44.5,
    temperatura_ar_c: 26.8,
    umidade_ar_pct: 62.0,
    sensor_chuva: 0,
    status_valvula: 'fechada',
    tensao_bateria_v: 3.85
  },
  pumpTimer: {
    interval: null,
    remainingSeconds: 0,
    totalSeconds: 0,
    isRunning: false
  },
  weather: {
    temperatura: 26,
    humidade: 65,
    chuva_probabilidade: 20,
    condicao: 'Parcialmente Nublado',
    previsao: [
      { dia: 'Hoje', temp: '26°C', condicao: 'Parcialmente Nublado', chuva: '20%' },
      { dia: 'Amanhã', temp: '27°C', condicao: 'Ensolarado', chuva: '10%' },
      { dia: 'Sábado', temp: '24°C', condicao: 'Chuva Esparsa', chuva: '60%' }
    ]
  },
  assistant: {
    messages: [],
    isTyping: false
  }
};

// ============================================================================
// INICIALIZAÇÃO
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  initNetworkListeners();
  initDefaultDates();
  initCamera();
  renderCulturesCards();
  syncCropSelects();
  calculateIrrigationRequirements();
  renderDashboard();
  initAssistantModule();
  loadPhpSourceCode();
  fetchInitialBackendData();
});

function initStorage() {
  AppState.user = getLocalStorageJSON(STORAGE_KEYS.USER, {
    id: 1,
    nome: 'Produtor Rural AgroVision',
    email: 'agricultor@agrovision.com',
    propriedade_nome: 'Quinta Esperança Verde'
  });
  AppState.crops = getLocalStorageJSON(STORAGE_KEYS.CROPS, getDefaultCrops());
  AppState.diagnoses = getLocalStorageJSON(STORAGE_KEYS.DIAGNOSES, getDefaultDiagnoses());
  AppState.irrigations = getLocalStorageJSON(STORAGE_KEYS.IRRIGATIONS, getDefaultIrrigations());
  AppState.syncQueue = getLocalStorageJSON(STORAGE_KEYS.SYNC_QUEUE, []);
  AppState.esp32 = getLocalStorageJSON(STORAGE_KEYS.ESP32_DATA, AppState.esp32);
  AppState.assistant.messages = getLocalStorageJSON(STORAGE_KEYS.ASSISTANT_CHAT, getDefaultAssistantMessages());

  updateUserInterfaceHeader();
  updateSyncBadge();
}

function getDefaultCrops() {
  return [
    {
      id: 1,
      nome: 'Milho Grão',
      variedade: 'Híbrido Precoce BR-304',
      localizacao: 'Talhão 01 - Norte',
      data_plantio: '2026-08-15',
      area_m2: 3500,
      tipo_solo: 'franco',
      fase_crescimento: 'floracao',
      observacoes: 'Fase crítica de floração e polinização das espigas. Demanda hídrica alta.',
      status: 'ativo'
    },
    {
      id: 2,
      nome: 'Mandioca',
      variedade: 'Macaxeira Regional Branca',
      localizacao: 'Talhão 02 - Sul',
      data_plantio: '2026-04-10',
      area_m2: 6000,
      tipo_solo: 'arenoso',
      fase_crescimento: 'crescimento',
      observacoes: 'Crescimento vegetativo e tuberização inicial. Solo arenoso com boa drenagem.',
      status: 'ativo'
    },
    {
      id: 3,
      nome: 'Tomateiro',
      variedade: 'Santa Clara / Caqui',
      localizacao: 'Canteiro Irrigado 03',
      data_plantio: '2026-09-01',
      area_m2: 1200,
      tipo_solo: 'franco',
      fase_crescimento: 'crescimento',
      observacoes: 'Primeiras flores abertas. Monitoramento constante de manchas foliares.',
      status: 'ativo'
    }
  ];
}

function getDefaultDiagnoses() {
  return [
    {
      id: 1,
      imagem_url: 'uploads/exemplo_tomate.jpg',
      especie_identificada: 'Tomateiro (Solanum lycopersicum)',
      estado_aparente: 'atencao',
      possiveis_doencas: 'Pinta-preta (Alternaria solani) incipiente',
      possiveis_pragas: 'Sem pragas ativas visíveis',
      sintomas_visiveis: 'Manchas castanhas circulares nas folhas basais com halos concêntricos',
      deficiencia_nutricional: 'Possível deficiência de cálcio/magnésio',
      sinais_stress_hidrico: 'Folhas levemente arqueadas sem murcha severa',
      danos_folhas: 'Necrose periférica nos folíolos inferiores',
      nivel_atencao: 'moderado',
      nivel_confianca: 91.5,
      recomendacoes_cuidado: 'Remover e queimar folhas inferiores afetadas. Desinfetar tesouras de desbrota.',
      recomendacoes_prevencao: 'Pulverização preventiva com calda bordalesa a 1% nas primeiras horas da manhã. Não molhar folhagem na rega.',
      recomendacao_irrigacao_visual: 'Não foram identificados sinais visuais fortes de stress hídrico. Verifique o solo antes de irrigar.',
      aviso_estimativa: 'Resultado preliminar por visão computacional. Recomenda-se validação em campo por agrônomo.',
      metodo_analise: 'visao_computacional_ia',
      qualidade_adequada: true,
      synced: true,
      criado_em: '28/09/2026, 10:15'
    }
  ];
}

function getDefaultIrrigations() {
  return [
    {
      id: 1,
      cultura_id: 1,
      cultura_nome: 'Milho Grão',
      quantidade_litros: 8500,
      horario: '06:30',
      metodo: 'gotejamento',
      condicao_solo: 'seco',
      condicao_clima: 'ensolarado',
      minutos_bomba: 145,
      status: 'executado',
      observacoes: 'Turno matutino de irrigação concluído com sucesso.',
      criado_em: '30/09/2026, 07:00'
    },
    {
      id: 2,
      cultura_id: 2,
      cultura_nome: 'Mandioca',
      quantidade_litros: 0,
      horario: '17:00',
      metodo: 'aspersao',
      condicao_solo: 'umido_adequado',
      condicao_clima: 'chuva_fraca',
      minutos_bomba: 0,
      status: 'suspenso',
      observacoes: 'Rega suspensa automaticamente devido à precipitação.',
      criado_em: '01/10/2026, 06:30'
    }
  ];
}

function initDefaultDates() {
  const today = new Date().toISOString().split('T')[0];
  const dateInputIrrig = document.getElementById('irrigPlantDateInput');
  const dateInputCrop = document.getElementById('newCropPlantDate');

  if (dateInputIrrig) {
    const past = new Date();
    past.setDate(past.getDate() - 40);
    dateInputIrrig.value = past.toISOString().split('T')[0];
  }
  if (dateInputCrop) dateInputCrop.value = today;
}

function initNetworkListeners() {
  const badge = document.getElementById('networkStatusBadge');
  const text = document.getElementById('networkStatusText');

  const updateStatus = () => {
    AppState.isOnline = navigator.onLine;
    if (AppState.isOnline) {
      if (badge) badge.className = 'network-status-badge online';
      if (text) text.textContent = 'Online';
      showToast('Conexão com o servidor restabelecida.', 'info');
      syncOfflineQueue();
    } else {
      if (badge) badge.className = 'network-status-badge offline';
      if (text) text.textContent = 'Modo Offline';
      showToast('Operando em modo offline (dados seguros localmente).', 'warning');
    }
  };

  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
}

async function fetchInitialBackendData() {
  if (!navigator.onLine) return;
  try {
    const res = await fetch(`${API_URL}?action=get_dashboard`);
    if (res.ok) {
      const json = await res.json();
      if (json.status === 'success' && json.dashboard) {
        if (json.dashboard.esp32) {
          AppState.esp32 = json.dashboard.esp32;
          updateEsp32Displays();
        }
        if (json.dashboard.clima) {
          AppState.weather = json.dashboard.clima;
          renderWeatherWidget();
        }
      }
    }
  } catch (e) {}
}

// ============================================================================
// NAVEGAÇÃO ENTRE ABAS
// ============================================================================
window.switchTab = function(tabId) {
  AppState.activeTab = tabId;

  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  const target = document.getElementById(tabId);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });

  document.querySelectorAll('.mobile-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });

  if (tabId === 'tab-scanner') {
    if (!AppState.camera.isActive) {
      startCamera();
    }
  } else {
    if (AppState.camera.isActive) {
      stopCameraStream();
      const ph = document.getElementById('cameraPlaceholder');
      const vid = document.getElementById('cameraVideo');
      if (ph) ph.style.display = 'block';
      if (vid) vid.style.display = 'none';
      const btnToggle = document.getElementById('btnToggleCamera');
      if (btnToggle) btnToggle.textContent = 'Ativar';
    }
  }

  if (tabId === 'tab-dashboard') {
    renderDashboard();
  }

  if (tabId === 'tab-assistant') {
    updateAssistantContextBar();
    renderAssistantMessages();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.triggerCameraCaptureAction = function() {
  switchTab('tab-scanner');
  if (!AppState.camera.isActive) {
    startCamera();
  }
};

// ============================================================================
// 1. CÂMERA DO TELEFONE & ANALISAR MINHA PLANTA
// ============================================================================
async function initCamera() {
  const video = document.getElementById('cameraVideo');
  const placeholder = document.getElementById('cameraPlaceholder');
  const deviceLabel = document.getElementById('cameraDeviceLabel');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (placeholder) placeholder.style.display = 'block';
    if (deviceLabel) deviceLabel.textContent = 'Hardware óptico não acessível neste navegador.';
    return;
  }

  await startCamera();
}

async function startCamera() {
  const video = document.getElementById('cameraVideo');
  const placeholder = document.getElementById('cameraPlaceholder');
  const deviceLabel = document.getElementById('cameraDeviceLabel');
  const btnToggle = document.getElementById('btnToggleCamera');

  try {
    stopCameraStream();

    const constraints = {
      video: {
        facingMode: { ideal: AppState.camera.facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    AppState.camera.stream = stream;
    AppState.camera.isActive = true;

    if (video) {
      video.srcObject = stream;
      video.style.display = 'block';
    }
    if (placeholder) placeholder.style.display = 'none';

    if (deviceLabel) {
      const mode = AppState.camera.facingMode === 'environment' ? 'Lente Principal (Traseira)' : 'Lente Frontal';
      deviceLabel.textContent = `Sensor óptico ativo: ${mode}`;
    }

    if (btnToggle) btnToggle.textContent = 'Pausar';

    if (AppState.camera.mode === 'qr') {
      startQrScanningLoop();
    }
  } catch (err) {
    if (placeholder) placeholder.style.display = 'block';
    if (video) video.style.display = 'none';
    if (deviceLabel) deviceLabel.textContent = 'Permissão de câmera não concedida.';
    if (btnToggle) btnToggle.textContent = 'Ativar';
    AppState.camera.isActive = false;
  }
}

function stopCameraStream() {
  if (AppState.camera.stream) {
    AppState.camera.stream.getTracks().forEach(t => t.stop());
    AppState.camera.stream = null;
  }
  if (AppState.camera.qrInterval) {
    clearInterval(AppState.camera.qrInterval);
    AppState.camera.qrInterval = null;
  }
  AppState.camera.isActive = false;
}

window.toggleCameraPower = function() {
  if (AppState.camera.isActive) {
    stopCameraStream();
    document.getElementById('cameraVideo').style.display = 'none';
    document.getElementById('cameraPlaceholder').style.display = 'block';
    document.getElementById('btnToggleCamera').textContent = 'Ativar';
  } else {
    startCamera();
  }
};

window.switchCameraFacing = function() {
  AppState.camera.facingMode = AppState.camera.facingMode === 'environment' ? 'user' : 'environment';
  startCamera();
  showToast('Invertendo lente da câmera.', 'info');
};

window.setCameraMode = function(mode) {
  AppState.camera.mode = mode;
  const btnCrop = document.getElementById('modeBtnCrop');
  const btnQr = document.getElementById('modeBtnQr');
  const qrOverlay = document.getElementById('qrScannerOverlay');

  if (mode === 'qr') {
    btnCrop.classList.remove('active');
    btnQr.classList.add('active');
    qrOverlay.classList.remove('hidden');
    startQrScanningLoop();
    showToast('Modo de leitura de lote ativo.', 'info');
  } else {
    btnCrop.classList.add('active');
    btnQr.classList.remove('active');
    qrOverlay.classList.add('hidden');
    if (AppState.camera.qrInterval) {
      clearInterval(AppState.camera.qrInterval);
      AppState.camera.qrInterval = null;
    }
  }
};

window.capturePhotoSnapshot = function() {
  if (AppState.camera.mode === 'qr') {
    scanQrFromCurrentFrame();
    return;
  }

  const video = document.getElementById('cameraVideo');
  const canvas = document.getElementById('cameraCanvas');

  if (!video || !AppState.camera.isActive || video.videoWidth === 0) {
    showToast('Câmera indisponível. Carregue uma fotografia da galeria.', 'warning');
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const base64Img = canvas.toDataURL('image/jpeg', 0.88);
  displayImageInPreviewStage(base64Img);
  showToast('Fotografia capturada. Pré-visualize a amostra antes de enviar.', 'success');
};

window.handleFileUpload = function(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    displayImageInPreviewStage(e.target.result);
    showToast('Imagem carregada da galeria. Pré-visualize antes do envio.', 'success');
  };
  reader.readAsDataURL(file);
};

function displayImageInPreviewStage(base64Img) {
  AppState.currentCapturedPhoto = base64Img;

  const previewBox = document.getElementById('imagePreviewStage');
  const emptyPrompt = document.getElementById('imageEmptyPrompt');
  const resultCard = document.getElementById('diagnosisResultCard');
  const warningCard = document.getElementById('imageQualityWarningCard');
  const previewImg = document.getElementById('previewCapturedImg');

  if (previewImg) previewImg.src = base64Img;
  if (previewBox) previewBox.style.display = 'block';
  if (emptyPrompt) emptyPrompt.style.display = 'none';
  if (resultCard) resultCard.style.display = 'none';
  if (warningCard) warningCard.style.display = 'none';

  previewBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

window.retakePhoto = function() {
  AppState.currentCapturedPhoto = null;
  const previewBox = document.getElementById('imagePreviewStage');
  const emptyPrompt = document.getElementById('imageEmptyPrompt');
  const resultCard = document.getElementById('diagnosisResultCard');
  const warningCard = document.getElementById('imageQualityWarningCard');

  if (previewBox) previewBox.style.display = 'none';
  if (resultCard) resultCard.style.display = 'none';
  if (warningCard) warningCard.style.display = 'none';
  if (emptyPrompt) emptyPrompt.style.display = 'block';

  if (!AppState.camera.isActive) {
    startCamera();
  }
};

window.addSymptomChip = function(symptomText) {
  const input = document.getElementById('previewSymptomsInput');
  if (!input) return;
  if (input.value.trim().length > 0) {
    input.value += `, ${symptomText}`;
  } else {
    input.value = symptomText;
  }
};

// ============================================================================
// 2. ENVIO PARA ANÁLISE REAL DE VISÃO COMPUTACIONAL (IA) & RESPOSTA ESTRUTURADA
// ============================================================================
window.submitPlantAnalysis = async function() {
  if (!AppState.currentCapturedPhoto) {
    showToast('Capture ou selecione uma imagem primeiro.', 'warning');
    return;
  }

  const cropHint = document.getElementById('previewCropSelect')?.value || '';
  const symptomsHint = document.getElementById('previewSymptomsInput')?.value || '';

  const loadingEl = document.getElementById('analysisLoadingState');
  const resultCard = document.getElementById('diagnosisResultCard');
  const warningCard = document.getElementById('imageQualityWarningCard');
  const btnSubmit = document.getElementById('btnSubmitAnalysis');

  if (loadingEl) loadingEl.style.display = 'block';
  if (resultCard) resultCard.style.display = 'none';
  if (warningCard) warningCard.style.display = 'none';
  if (btnSubmit) btnSubmit.disabled = true;

  try {
    let reportData = null;

    if (navigator.onLine) {
      try {
        const response = await fetch(`${API_URL}?action=analyze_plant`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photo_base64: AppState.currentCapturedPhoto,
            crop: cropHint,
            symptoms: symptomsHint
          })
        });

        if (response.ok) {
          const json = await response.json();
          if (json.status === 'success' && json.analise) {
            reportData = json.analise;
          }
        }
      } catch (netErr) {
        console.warn('[AgroVision] Falha de rede online. Usando contingência agronômica local.', netErr);
      }
    }

    if (!reportData) {
      reportData = runLocalAgronomicAnalysis(cropHint, symptomsHint);
      reportData.synced = false;
      AppState.syncQueue.push({ ...reportData, type: 'analysis' });
    } else {
      reportData.synced = true;
    }

    reportData.imagem_url = AppState.currentCapturedPhoto;
    AppState.lastAnalysisRecord = reportData;

    // Tratamento de Imagem Sem Qualidade Suficiente (Item 1 & 6)
    if (reportData.qualidade_adequada === false) {
      if (warningCard) {
        warningCard.style.display = 'block';
        const txt = document.getElementById('imageQualityWarningText');
        if (txt) {
          txt.textContent = reportData.mensagem_qualidade ||
            'A fotografia não possui enquadramento, contraste ou nitidez suficientes para um diagnóstico confiável. O AgroVision não inventa resultados sem evidência visual.';
        }
        warningCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      showToast('Imagem inadequada para identificação. Capture nova fotografia.', 'warning');
      return;
    }

    AppState.diagnoses.unshift(reportData);
    saveLocalState();

    renderDiagnosisReportCard(reportData);
    renderDashboard();
    showToast('Análise de planta concluída com sucesso.', 'success');

  } catch (error) {
    showToast('Erro ao processar análise da folha.', 'danger');
  } finally {
    if (loadingEl) loadingEl.style.display = 'none';
    if (btnSubmit) btnSubmit.disabled = false;
  }
};

// Renderização dos campos estruturados do laudo
function renderDiagnosisReportCard(r) {
  const resultCard = document.getElementById('diagnosisResultCard');
  if (!resultCard) return;

  const plantEl = document.getElementById('resPlantIdentified');
  if (plantEl) plantEl.textContent = r.especie_identificada || r.planta_identificada || 'Planta Cultivada';

  const methodEl = document.getElementById('resAnalysisMethod');
  if (methodEl) {
    const isGemini = (r.metodo_analise || '').includes('gemini');
    methodEl.textContent = isGemini ? 'Processado por Visão Computacional (Modelo Gemini)' : 'Processado pela Camada de Heurística Agronômica';
  }

  const attentionBadge = document.getElementById('resAttentionBadge');
  if (attentionBadge) {
    const lvl = (r.nivel_atencao || 'moderado').toLowerCase();
    attentionBadge.className = `attention-badge ${lvl}`;
    const labels = { baixo: 'Atenção Baixa', moderado: 'Atenção Moderada', alto: 'Atenção Alta', critico: 'Nível Crítico' };
    attentionBadge.textContent = labels[lvl] || 'Atenção Moderada';
  }

  const confEl = document.getElementById('resConfidenceLevel');
  if (confEl) {
    const pct = parseFloat(r.nivel_confianca || 85).toFixed(1);
    confEl.textContent = `Confiança Técnica: ${pct}%`;
  }

  const stateEl = document.getElementById('resApparentState');
  if (stateEl) {
    const states = {
      saudavel: 'Planta Sadia e Vigorosa',
      atencao: 'Alerta / Alteração Fitossanitária',
      critico: 'Infestação Severa / Dano Folhar Crítico',
      indeterminado: 'Análise Preliminar Inconclusiva'
    };
    stateEl.textContent = states[r.estado_aparente] || r.estado_aparente || 'Em Observação';
  }

  const diseaseEl = document.getElementById('resPossibleDisease');
  if (diseaseEl) diseaseEl.textContent = r.possiveis_doencas || r.possivel_doenca || 'Nenhuma patologia fúngica evidente';

  const pestsEl = document.getElementById('resPossiblePests');
  if (pestsEl) pestsEl.textContent = r.possiveis_pragas || 'Sem evidência de insetos mastigadores';

  const symptomsEl = document.getElementById('resSymptomsFound');
  if (symptomsEl) symptomsEl.textContent = r.sintomas_visiveis || r.sintomas || 'Limbo foliar com coloração e turgidez avaliadas.';

  const nutEl = document.getElementById('resNutritionalDeficiency');
  if (nutEl) nutEl.textContent = r.deficiencia_nutricional || 'Nutrição mineral aparentemente equilibrada';

  const leafEl = document.getElementById('resLeafDamage');
  if (leafEl) leafEl.textContent = r.danos_folhas || 'Lâmina foliar íntegra com leves alterações periféricas';

  const stressObsEl = document.getElementById('resWaterStressObservation');
  if (stressObsEl) {
    stressObsEl.textContent = r.sinais_stress_hidrico || 'Turgidez das folhas avaliada visualmente.';
  }

  const visualIrrigEl = document.getElementById('resVisualIrrigationRecommendation');
  if (visualIrrigEl) {
    visualIrrigEl.textContent = r.recomendacao_irrigacao_visual ||
      'Não foram identificados sinais visuais fortes de stress hídrico. Verifique as condições do solo antes de irrigar.';
  }

  const careEl = document.getElementById('resCareRecommendations');
  if (careEl) careEl.textContent = r.recomendacoes_cuidado || 'Manter rega regular e vistoriar plantas vizinhas.';

  const prevEl = document.getElementById('resPreventionRecommendations');
  if (prevEl) prevEl.textContent = r.recomendacoes_prevencao || 'Manejo integrado, adubação equilibrada e rotação de culturas.';

  const disclaimerEl = document.getElementById('resDisclaimerText');
  if (disclaimerEl) {
    disclaimerEl.textContent = r.aviso_estimativa ||
      'O diagnóstico gerado por visão computacional é uma estimativa preliminar baseada em padrões sintomáticos. Não constitui certeza absoluta. Problemas agrícolas importantes devem ser validados em campo por um agrônomo ou técnico de extensão rural.';
  }

  resultCard.style.display = 'block';
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Aplica a recomendação do laudo diretamente no módulo de irrigação
window.consultAssistantAboutAnalysis = function() {
  const r = AppState.lastAnalysisRecord || AppState.diagnoses[0];
  if (!r) {
    switchTab('tab-assistant');
    return;
  }

  const plantName = r.especie_identificada || 'esta planta';
  const issue = r.possiveis_doencas || r.possiveis_pragas || r.sintomas_visiveis || 'o estado foliar';
  const prompt = `Identifiquei em análise recente: ${plantName} com ${issue}. Qual o plano de ação técnico recomendado para tratamento e controle preventivo no campo?`;

  switchTab('tab-assistant');
  const input = document.getElementById('assistantInputText');
  if (input) {
    input.value = prompt;
    const form = document.getElementById('assistantChatForm');
    if (form) form.requestSubmit();
  }
};

window.applyAnalysisToIrrigation = function() {
  if (!AppState.lastAnalysisRecord) return;
  const r = AppState.lastAnalysisRecord;

  switchTab('tab-irrigation');

  const cropSelect = document.getElementById('irrigCropSelect');
  if (cropSelect) {
    for (let opt of cropSelect.options) {
      if (r.especie_identificada.toLowerCase().includes(opt.value.toLowerCase())) {
        cropSelect.value = opt.value;
        break;
      }
    }
  }

  calculateIrrigationRequirements();
  showToast('Indícios visuais da análise aplicados ao balanço hídrico.', 'success');
};

function runLocalAgronomicAnalysis(cropHint, symptomsHint) {
  const crop = cropHint || 'Planta Cultivada';
  const s = (symptomsHint || '').toLowerCase();
  const c = crop.toLowerCase();

  let isWilting = s.includes('murch') || s.includes('enrola') || s.includes('seca');
  let isHealthy = s.includes('sadia') || s.includes('saudavel') || s.includes('verde');

  return {
    id: `ana_${Date.now()}`,
    especie_identificada: c.includes('milho') ? 'Milho (Zea mays)' : (c.includes('mandioca') ? 'Mandioca (Manihot esculenta)' : (c.includes('tomate') ? 'Tomateiro (Solanum lycopersicum)' : crop)),
    estado_aparente: isHealthy ? 'saudavel' : (isWilting ? 'atencao' : 'atencao'),
    possiveis_doencas: s.includes('mancha') ? 'Mancha foliar ou pinta fúngica incipiente' : 'Nenhuma patologia evidente',
    possiveis_pragas: s.includes('furo') || s.includes('lagarta') ? 'Lagarta ou insetos desfolhadores' : 'Sem pragas ativas visíveis',
    sintomas_visiveis: s || 'Lâmina foliar inspecionada visualmente.',
    deficiencia_nutricional: 'Sem sinais evidentes de deficiência mineral',
    sinais_stress_hidrico: isWilting ? 'Folhas murchas e perda de turgidez aparente.' : 'Lâmina foliar expandida sem sinais fortes de desidratação.',
    danos_folhas: s.includes('furo') ? 'Perfurações irregulares' : 'Sem danos mecânicos graves',
    nivel_atencao: isWilting ? 'moderado' : (isHealthy ? 'baixo' : 'moderado'),
    nivel_confianca: 84.5,
    recomendacoes_cuidado: isWilting ? 'Verificar a umidade do solo na zona radicular e considerar irrigar nas horas frescas.' : 'Manter o manejo regular.',
    recomendacoes_prevencao: 'Cobertura morta (mulching) e rotação de culturas.',
    recomendacao_irrigacao_visual: isWilting ? 'Possíveis sinais de stress hídrico observados visualmente nas folhas. Verifique o solo e considere irrigar.' : 'Não foram identificados sinais visuais fortes de stress hídrico. Verifique as condições do solo antes de irrigar.',
    aviso_estimativa: 'Diagnóstico preliminar por regras agronômicas locais. Estimativa técnica, consulte um engenheiro agrônomo para laudo oficial.',
    metodo_analise: 'contingencia_agronomica_local',
    qualidade_adequada: true,
    criado_em: new Date().toLocaleString('pt-BR')
  };
}

// ============================================================================
// 3. MINHAS CULTURAS (GESTÃO DE TALHÕES)
// ============================================================================
function renderCulturesCards() {
  const container = document.getElementById('culturesCardsContainer');
  if (!container) return;

  if (AppState.crops.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px 20px; color: var(--text-muted);">
        <p style="font-size: 14px;">Nenhuma cultura cadastrada no momento.</p>
        <button class="btn btn-primary" style="margin-top: 10px;" onclick="openModal('modalAddCulture')">Cadastrar Primeira Cultura</button>
      </div>
    `;
    return;
  }

  const stageLabels = {
    germinacao: { name: 'Germinação e Emergência', progress: 20 },
    crescimento: { name: 'Crescimento Vegetativo', progress: 50 },
    floracao: { name: 'Floração e Frutificação', progress: 80 },
    maturacao: { name: 'Maturação e Pré-Colheita', progress: 100 }
  };

  container.innerHTML = AppState.crops.map(c => {
    const stageInfo = stageLabels[c.fase_crescimento] || { name: 'Crescimento Vegetativo', progress: 50 };
    const plantDate = new Date(c.data_plantio);
    const dae = Math.max(1, Math.floor((new Date().getTime() - plantDate.getTime()) / 86400000));

    return `
      <div class="culture-card">
        <div>
          <div class="culture-card-header">
            <div>
              <div class="culture-title">${c.nome}</div>
              <div class="culture-variety">${c.variedade || 'Variedade padrão'} • ${c.localizacao || 'Talhão Geral'}</div>
            </div>
            <span class="attention-badge baixo" style="font-size: 10px; padding: 3px 8px;">Ativo</span>
          </div>

          <div class="culture-stat-row">
            <span>DAE (Dias Após Plantio):</span>
            <strong>${dae} dias</strong>
          </div>

          <div class="culture-stat-row">
            <span>Área Cultivada:</span>
            <strong>${Number(c.area_m2).toLocaleString('pt-PT')} m²</strong>
          </div>

          <div class="culture-stat-row">
            <span>Textura do Solo:</span>
            <strong style="text-transform: capitalize;">${c.tipo_solo}</strong>
          </div>

          <div style="margin-top: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted);">
              <span>Fase Fenológica:</span>
              <strong style="color: var(--primary-900);">${stageInfo.name}</strong>
            </div>
            <div class="culture-progress-bar-bg">
              <div class="culture-progress-fill" style="width: ${stageInfo.progress}%;"></div>
            </div>
          </div>
        </div>

        <div class="culture-actions-row">
          <button class="btn btn-secondary" style="flex: 1; font-size: 11px; min-height: 36px; padding: 4px 8px;" onclick="selectCropForAnalysis('${c.nome}')">
            Analisar Folha
          </button>
          <button class="btn btn-primary" style="flex: 1; font-size: 11px; min-height: 36px; padding: 4px 8px;" onclick="selectCropForIrrigation('${c.nome}', '${c.data_plantio}', ${c.area_m2}, '${c.tipo_solo}')">
            Irrigação
          </button>
          <button class="btn btn-secondary" style="font-size: 11px; min-height: 36px; padding: 4px 8px; color: var(--status-danger);" onclick="deleteCulture(${c.id})" title="Excluir cultura">
            Excluir
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.handleSaveCulture = function(e) {
  e.preventDefault();

  const nome = document.getElementById('newCropName').value;
  const variedade = document.getElementById('newCropVariety').value;
  const plot = document.getElementById('newCropPlot').value;
  const plantDate = document.getElementById('newCropPlantDate').value;
  const areaM2 = parseFloat(document.getElementById('newCropArea').value) || 2000;
  const soil = document.getElementById('newCropSoil').value;
  const stage = document.getElementById('newCropStage').value;
  const notes = document.getElementById('newCropNotes')?.value || '';

  const newCrop = {
    id: Date.now(),
    user_id: AppState.user ? AppState.user.id : 1,
    nome,
    variedade,
    localizacao: plot,
    data_plantio: plantDate,
    area_m2: areaM2,
    tipo_solo: soil,
    fase_crescimento: stage,
    observacoes: notes,
    status: 'ativo'
  };

  AppState.crops.unshift(newCrop);
  AppState.syncQueue.push({ ...newCrop, type: 'culture' });
  saveLocalState();

  renderCulturesCards();
  syncCropSelects();
  closeModal('modalAddCulture');
  showToast(`Cultura ${nome} cadastrada no AgroVision.`, 'success');

  if (navigator.onLine) {
    fetch(`${API_URL}?action=save_culture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCrop)
    }).catch(() => {});
  }
};

window.deleteCulture = function(id) {
  AppState.crops = AppState.crops.filter(c => c.id !== id);
  saveLocalState();
  renderCulturesCards();
  syncCropSelects();
  showToast('Cultura removida.', 'info');
};

window.selectCropForAnalysis = function(cropName) {
  switchTab('tab-scanner');
  const cropSelect = document.getElementById('previewCropSelect');
  if (cropSelect) cropSelect.value = cropName;
  showToast(`Talhão de ${cropName} selecionado para inspeção foliar.`, 'info');
};

window.selectCropForIrrigation = function(cropName, plantDate, areaM2, soil) {
  switchTab('tab-irrigation');
  const cropSelect = document.getElementById('irrigCropSelect');
  const dateInput = document.getElementById('irrigPlantDateInput');
  const areaInput = document.getElementById('irrigAreaInput');
  const soilSelect = document.getElementById('irrigSoilSelect');

  if (cropSelect) cropSelect.value = cropName;
  if (dateInput) dateInput.value = plantDate;
  if (areaInput) areaInput.value = areaM2;
  if (soilSelect) soilSelect.value = soil;

  calculateIrrigationRequirements();
  showToast(`Parâmetros de ${cropName} carregados no balanço hídrico.`, 'info');
};

function syncCropSelects() {
  const selectIrrig = document.getElementById('irrigCropSelect');
  const selectPreview = document.getElementById('previewCropSelect');
  if (!selectIrrig) return;

  const currentVal = selectIrrig.value;
  const uniqueCrops = Array.from(new Set(['Milho', 'Mandioca', 'Tomate', 'Feijão', 'Batata-doce', 'Soja', ...AppState.crops.map(c => c.nome)]));

  selectIrrig.innerHTML = uniqueCrops.map(c => `<option value="${c}">${c}</option>`).join('');
  if (uniqueCrops.includes(currentVal)) selectIrrig.value = currentVal;

  if (selectPreview) {
    const curPrev = selectPreview.value;
    selectPreview.innerHTML = `
      <option value="">Detecção Automática pela Imagem</option>
      ${uniqueCrops.map(c => `<option value="${c}">${c}</option>`).join('')}
    `;
    if (curPrev) selectPreview.value = curPrev;
  }
}

// ============================================================================
// 4. SISTEMA INTELIGENTE DE IRRIGAÇÃO (CÂMERA, ESP32 OU HÍBRIDO)
// ============================================================================
window.setIrrigationOperatingMode = function(mode) {
  AppState.irrigationMode = mode;

  document.getElementById('modeCardCamera')?.classList.toggle('active', mode === 'camera');
  document.getElementById('modeCardEsp32')?.classList.toggle('active', mode === 'esp32');
  document.getElementById('modeCardHybrid')?.classList.toggle('active', mode === 'hibrido');

  const espPanel = document.getElementById('esp32TelemetryPanel');
  if (espPanel) {
    espPanel.style.display = (mode === 'esp32' || mode === 'hibrido') ? 'block' : 'none';
  }

  calculateIrrigationRequirements();
  showToast(`Modo de irrigação alterado para: ${mode.toUpperCase()}.`, 'info');
};

window.calculateIrrigationRequirements = function() {
  const crop = document.getElementById('irrigCropSelect')?.value || 'Milho';
  const plantDateStr = document.getElementById('irrigPlantDateInput')?.value || '';
  const areaM2 = parseFloat(document.getElementById('irrigAreaInput')?.value) || 1000;
  const soilType = document.getElementById('irrigSoilSelect')?.value || 'franco';
  const soilCondition = document.getElementById('irrigSoilConditionSelect')?.value || 'seco';
  const pumpFlowLh = parseFloat(document.getElementById('irrigPumpFlowInput')?.value) || 3500;
  const weather = document.querySelector('input[name="weatherCondition"]:checked')?.value || 'ensolarado';

  const volumeEl = document.getElementById('irrigDisplayVolume');
  const reasonEl = document.getElementById('irrigDisplayReason');
  const savingsBox = document.getElementById('irrigSavingsBox');
  const savingsText = document.getElementById('irrigSavingsText');
  const subtitleEl = document.getElementById('pumpTimerSubtitle');
  const bestTimeEl = document.getElementById('irrigBestTime');
  const freqEl = document.getElementById('irrigFrequency');

  const plantDate = plantDateStr ? new Date(plantDateStr) : new Date();
  const diffDays = Math.max(1, Math.floor((new Date().getTime() - plantDate.getTime()) / 86400000));

  let stageName = 'Desenvolvimento Vegetativo';
  let kc = 0.75;

  if (diffDays <= 20) {
    stageName = 'Germinação e Emergência';
    kc = 0.40;
  } else if (diffDays <= 50) {
    stageName = 'Crescimento Vegetativo Ativo';
    kc = 0.75;
  } else if (diffDays <= 85) {
    stageName = 'Floração e Frutificação (Demanda Crítica)';
    kc = 1.15;
  } else {
    stageName = 'Maturação e Pré-Colheita';
    kc = 0.60;
  }

  let soilFactor = 1.0;
  if (soilType === 'arenoso') soilFactor = 1.25;
  else if (soilType === 'argiloso') soilFactor = 0.85;

  const etoBase = 5.0; // mm/dia
  const demandaBaseLitros = areaM2 * etoBase * kc * soilFactor;

  let appliedLiters = demandaBaseLitros;
  let savedLiters = 0;
  let isSuspended = false;
  let reason = '';

  if (AppState.irrigationMode === 'esp32' || AppState.irrigationMode === 'hibrido') {
    const uSolo = AppState.esp32.umidade_solo_pct;
    if (uSolo >= 70) {
      appliedLiters = 0;
      savedLiters = demandaBaseLitros;
      isSuspended = true;
      reason = `Sensor IoT ESP32 registrou umidade do solo em ${uSolo}% (capacidade de campo suprida). Irrigação não necessária no momento.`;
    } else if (uSolo >= 50) {
      appliedLiters = demandaBaseLitros * 0.4;
      savedLiters = demandaBaseLitros * 0.6;
      reason = `Sensor IoT ESP32 registrou umidade de ${uSolo}%. Recomenda-se complementação hídrica moderada de ${Math.round(appliedLiters).toLocaleString('pt-PT')} Litros.`;
    } else {
      reason = `Sensor IoT ESP32 registrou déficit hídrico com umidade do solo em ${uSolo}%. Recomenda-se irrigação completa de ${Math.round(appliedLiters).toLocaleString('pt-PT')} Litros.`;
    }
  } else {
    if (soilCondition === 'encharcado') {
      appliedLiters = 0;
      savedLiters = demandaBaseLitros;
      isSuspended = true;
      reason = 'O solo foi informado como encharcado. Suspensão necessária para evitar anoxia radicular e lixiviação de nutrientes.';
    } else if (soilCondition === 'umido_adequado') {
      appliedLiters = 0;
      savedLiters = demandaBaseLitros;
      isSuspended = true;
      reason = 'Umidade física do solo aparentemente adequada. Aguarde a secagem superficial antes de aplicar nova lâmina.';
    } else if (weather === 'chuva_forte') {
      appliedLiters = 0;
      savedLiters = demandaBaseLitros;
      isSuspended = true;
      reason = 'Precipitação intensa observada hoje. A chuva atendeu à evapotranspiração da lavoura com economia total de água.';
    } else if (weather === 'chuva_fraca') {
      appliedLiters = demandaBaseLitros * 0.40;
      savedLiters = demandaBaseLitros * 0.60;
      reason = `Chuva fraca observada. Recomenda-se apenas irrigação complementar de ${Math.round(appliedLiters).toLocaleString('pt-PT')} Litros.`;
    } else if (weather === 'nublado') {
      appliedLiters = demandaBaseLitros * 0.80;
      savedLiters = demandaBaseLitros * 0.20;
      reason = `Evapotranspiração reduzida por tempo nublado (-20%). Lâmina ajustada em ${Math.round(appliedLiters).toLocaleString('pt-PT')} Litros.`;
    } else {
      reason = `Solo seco e tempo ensolarado na fase de ${stageName} (DAE ${diffDays}). Demanda plena de ${Math.round(appliedLiters).toLocaleString('pt-PT')} Litros.`;
    }
  }

  const costSaved = (savedLiters / 1000) * 85;

  if (volumeEl) {
    if (isSuspended) {
      volumeEl.textContent = '0 Litros (Suspenso)';
      volumeEl.style.color = '#ff8787';
    } else {
      volumeEl.textContent = `${Math.round(appliedLiters).toLocaleString('pt-PT')} Litros`;
      volumeEl.style.color = '#8ce99a';
    }
  }

  if (reasonEl) reasonEl.textContent = reason;

  if (savingsBox && savingsText) {
    if (savedLiters > 0) {
      savingsBox.style.display = 'block';
      savingsText.textContent = `Poupança de ${Math.round(savedLiters).toLocaleString('pt-PT')} Litros de água e economia elétrica estimada de ~${costSaved.toFixed(2)}.`;
    } else {
      savingsBox.style.display = 'none';
    }
  }

  if (bestTimeEl) {
    bestTimeEl.textContent = (kc > 0.9) ? '06:00 - 08:30 ou 16:30 - 18:30 (Dividir em 2 turnos)' : '06:00 - 08:30 (Início da manhã para menor evaporação)';
  }
  if (freqEl) {
    freqEl.textContent = (kc > 0.9 || soilType === 'arenoso') ? '2 vezes ao dia (Turno matutino e vespertino)' : '1 vez ao dia (Manhã cedo)';
  }

  let pumpMinutes = 0;
  if (appliedLiters > 0 && pumpFlowLh > 0) {
    pumpMinutes = Math.round((appliedLiters / pumpFlowLh) * 60);
  }

  AppState.pumpTimer.totalSeconds = pumpMinutes * 60;
  AppState.pumpTimer.remainingSeconds = pumpMinutes * 60;
  updateTimerDisplay(AppState.pumpTimer.remainingSeconds);

  if (subtitleEl) {
    subtitleEl.textContent = isSuspended
      ? 'Motobomba desativada por suspensão hídrica'
      : `Duração calculada: ${pumpMinutes} min para vazão de ${pumpFlowLh.toLocaleString('pt-PT')} L/h`;
  }

  return {
    crop,
    areaM2,
    soilType,
    weather,
    soilCondition,
    stageName,
    appliedLiters,
    savedLiters,
    costSaved,
    pumpMinutes,
    reason
  };
};

window.handleProcessIrrigation = async function(e) {
  e.preventDefault();
  const data = calculateIrrigationRequirements();

  const record = {
    id: Date.now(),
    cultura_id: 1,
    cultura_nome: data.crop,
    quantidade_litros: data.appliedLiters,
    horario: '07:00',
    metodo: 'gotejamento',
    condicao_solo: data.soilCondition,
    condicao_clima: data.weather,
    minutos_bomba: data.pumpMinutes,
    status: data.appliedLiters === 0 ? 'suspenso' : 'executado',
    observacoes: data.reason,
    criado_em: new Date().toLocaleString('pt-BR')
  };

  AppState.irrigations.unshift(record);
  AppState.syncQueue.push({ ...record, type: 'irrigation' });
  saveLocalState();

  renderDashboard();
  showToast('Irrigação registrada no histórico.', 'success');

  if (navigator.onLine) {
    fetch(`${API_URL}?action=save_irrigation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    }).catch(() => {});
  }
};

// Temporizador da Bomba
window.togglePumpTimer = function() {
  const btn = document.getElementById('btnStartPumpTimer');
  const label = document.getElementById('timerStatusLabel');

  if (AppState.pumpTimer.isRunning) {
    clearInterval(AppState.pumpTimer.interval);
    AppState.pumpTimer.isRunning = false;
    if (btn) btn.textContent = 'Retomar Bomba';
    if (label) {
      label.textContent = 'Pausada';
      label.style.background = 'rgba(217, 119, 6, 0.2)';
      label.style.color = '#fcc419';
    }
  } else {
    if (AppState.pumpTimer.remainingSeconds <= 0) {
      showToast('Nenhum tempo de rega pendente para acionamento.', 'warning');
      return;
    }

    AppState.pumpTimer.isRunning = true;
    if (btn) btn.textContent = 'Pausar Bomba';
    if (label) {
      label.textContent = 'Ligada';
      label.style.background = 'rgba(43, 138, 62, 0.25)';
      label.style.color = '#8ce99a';
    }

    AppState.pumpTimer.interval = setInterval(() => {
      AppState.pumpTimer.remainingSeconds--;
      updateTimerDisplay(AppState.pumpTimer.remainingSeconds);

      if (AppState.pumpTimer.remainingSeconds <= 0) {
        clearInterval(AppState.pumpTimer.interval);
        AppState.pumpTimer.isRunning = false;
        if (btn) btn.textContent = 'Acionar Bomba';
        if (label) {
          label.textContent = 'Concluída';
          label.style.background = 'rgba(43, 138, 62, 0.4)';
          label.style.color = '#8ce99a';
        }
        showToast('Tempo de rega finalizado. Desligue a motobomba.', 'info');
        playBeepNotice();
      }
    }, 1000);
  }
};

window.resetPumpTimer = function() {
  if (AppState.pumpTimer.interval) clearInterval(AppState.pumpTimer.interval);
  AppState.pumpTimer.isRunning = false;
  calculateIrrigationRequirements();

  const btn = document.getElementById('btnStartPumpTimer');
  const label = document.getElementById('timerStatusLabel');
  if (btn) btn.textContent = 'Acionar Bomba';
  if (label) {
    label.textContent = 'Em Espera';
    label.style.background = 'rgba(255,255,255,0.1)';
    label.style.color = '#fff';
  }
};

function updateTimerDisplay(totalSeconds) {
  const digitsEl = document.getElementById('pumpTimerDigits');
  const progressBar = document.getElementById('pumpTimerProgressBar');

  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const fmt = [
    hrs.toString().padStart(2, '0'),
    mins.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0')
  ].join(':');

  if (digitsEl) digitsEl.textContent = fmt;

  if (progressBar && AppState.pumpTimer.totalSeconds > 0) {
    const elapsed = AppState.pumpTimer.totalSeconds - totalSeconds;
    const pct = Math.min(100, Math.round((elapsed / AppState.pumpTimer.totalSeconds) * 100));
    progressBar.style.width = `${pct}%`;
  }
}

function playBeepNotice() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
  } catch (e) {}
}

// ============================================================================
// 5. ESP32 TELEMETRIA & SIMULAÇÃO IOT
// ============================================================================
window.simulateEsp32Telemetry = async function() {
  const randomMoisture = Math.floor(28 + Math.random() * 45); // 28% a 73%
  const randomTemp = (24 + Math.random() * 5).toFixed(1);
  const randomHum = Math.floor(55 + Math.random() * 20);

  const payload = {
    dispositivo_id: 'ESP32_AGRO_NODE_01',
    umidade_solo_pct: randomMoisture,
    temperatura_ar_c: parseFloat(randomTemp),
    umidade_ar_pct: randomHum,
    sensor_chuva: 0,
    status_valvula: randomMoisture < 35 ? 'aberta' : 'fechada',
    tensao_bateria_v: 3.82
  };

  AppState.esp32 = payload;
  saveLocalState();
  updateEsp32Displays();
  calculateIrrigationRequirements();

  showToast(`Leitura do ESP32 simulada: Umidade de solo ${randomMoisture}%.`, 'info');

  if (navigator.onLine) {
    fetch(`${API_URL}?action=esp32_telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});
  }
};

function updateEsp32Displays() {
  const soilEl = document.getElementById('esp32SoilMoisture');
  const tempEl = document.getElementById('esp32Temperature');
  const humEl = document.getElementById('esp32AirHumidity');
  const valveEl = document.getElementById('esp32ValveStatus');

  if (soilEl) soilEl.textContent = `${AppState.esp32.umidade_solo_pct}%`;
  if (tempEl) tempEl.textContent = `${AppState.esp32.temperatura_ar_c}°C`;
  if (humEl) humEl.textContent = `${AppState.esp32.umidade_ar_pct}%`;
  if (valveEl) {
    valveEl.textContent = AppState.esp32.status_valvula === 'aberta' ? 'Aberta' : 'Fechada';
    valveEl.style.color = AppState.esp32.status_valvula === 'aberta' ? '#8ce99a' : '#fcc419';
  }
}

// ============================================================================
// 6. DASHBOARD & MÉTRICAS (ITEM 7)
// ============================================================================
function renderDashboard() {
  const kpiCrops = document.getElementById('dashKpiCrops');
  const kpiAnalyses = document.getElementById('dashKpiAnalyses');
  const kpiWaterUsed = document.getElementById('dashKpiWaterUsed');
  const kpiWaterSaved = document.getElementById('dashKpiWaterSaved');

  let totalWaterUsed = 0;
  let totalWaterSaved = 0;

  AppState.irrigations.forEach(i => {
    totalWaterUsed += Number(i.quantidade_litros || 0);
    if (i.status === 'suspenso') totalWaterSaved += 5000;
  });

  if (kpiCrops) kpiCrops.textContent = AppState.crops.length;
  if (kpiAnalyses) kpiAnalyses.textContent = AppState.diagnoses.length;
  if (kpiWaterUsed) kpiWaterUsed.textContent = `${Math.round(totalWaterUsed).toLocaleString('pt-PT')} L`;
  if (kpiWaterSaved) kpiWaterSaved.textContent = `${Math.round(totalWaterSaved).toLocaleString('pt-PT')} L`;

  renderWeeklyWaterChart();
  renderWeatherWidget();
  renderAlertsList();
  renderHistoryGrid();
}

function renderWeeklyWaterChart() {
  const chart = document.getElementById('dashboardWeeklyWaterChart');
  if (!chart) return;

  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const values = [4200, 3800, 0, 5100, 4800, 0, 3500]; // Amostragem semanal realista
  const maxVal = Math.max(...values, 6000);

  chart.innerHTML = days.map((day, idx) => {
    const val = values[idx];
    const pct = Math.max(8, Math.round((val / maxVal) * 100));
    return `
      <div class="bar-col-item">
        <div class="bar-col-fill" style="height: ${pct}%;" data-tooltip="${val.toLocaleString('pt-PT')} L"></div>
        <span class="bar-col-label">${day}</span>
      </div>
    `;
  }).join('');
}

function renderWeatherWidget() {
  const tempEl = document.getElementById('weatherCurrentTemp');
  const sumEl = document.getElementById('weatherSummary');
  const gridEl = document.getElementById('weatherForecastGrid');

  if (tempEl) tempEl.textContent = `${AppState.weather.temperatura}°C`;
  if (sumEl) sumEl.textContent = `${AppState.weather.condicao} • Umidade ${AppState.weather.humidade}%`;

  if (gridEl && AppState.weather.previsao) {
    gridEl.innerHTML = AppState.weather.previsao.map(p => `
      <div class="forecast-col">
        <div class="forecast-day">${p.dia}</div>
        <div class="forecast-temp">${p.temp}</div>
        <div class="forecast-cond">${p.condicao}</div>
      </div>
    `).join('');
  }
}

function renderAlertsList() {
  const container = document.getElementById('dashboardAlertsContainer');
  if (!container) return;

  const alerts = [
    {
      id: 1,
      tipo: 'irrigacao',
      titulo: 'Balanço Hídrico: Milho Grão no Talhão 01',
      mensagem: 'Fase de floração com solo seco. Verifique a umidade e aplique a lâmina recomendada.',
      nivel: 'urgente'
    },
    {
      id: 2,
      tipo: 'doenca',
      titulo: 'Alerta Fitossanitário: Tomateiro',
      mensagem: 'Indícios de Pinta-preta no canteiro 03. Pulverização cúprica preventiva recomendada.',
      nivel: 'alerta'
    },
    {
      id: 3,
      tipo: 'clima',
      titulo: 'Previsão de Chuva para Sábado',
      mensagem: 'Probabilidade de 60% de precipitação. Planeje a suspensão da irrigação para poupança de água.',
      nivel: 'informativo'
    }
  ];

  container.innerHTML = alerts.map(a => `
    <div style="background: var(--surface-card); border: 1px solid var(--border-color); border-left: 4px solid ${a.nivel === 'urgente' ? 'var(--status-danger)' : (a.nivel === 'alerta' ? 'var(--status-warning)' : 'var(--status-info)')}; padding: 12px; border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center;">
      <div>
        <strong style="color: var(--primary-900); font-size: 13px;">${a.titulo}</strong>
        <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">${a.mensagem}</p>
      </div>
      <button class="btn btn-secondary" style="font-size: 10px; min-height: 28px; padding: 2px 8px;" onclick="this.parentElement.remove(); showToast('Alerta arquivado.', 'info');">
        Dispensar
      </button>
    </div>
  `).join('');
}

function renderHistoryGrid() {
  const container = document.getElementById('diagnosesGridContainer');
  if (!container) return;

  if (AppState.diagnoses.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 36px 20px; color: var(--text-muted); font-size: 13px;">
        Nenhum registro fitossanitário no histórico local. Utilize a aba "Analisar Minha Planta" para fotografar vistorias de campo.
      </div>
    `;
    return;
  }

  container.innerHTML = AppState.diagnoses.map(item => `
    <div class="diagnosis-card">
      <div class="diagnosis-photo-header" onclick="openPhotoZoom('${item.imagem_url}', '${item.especie_identificada || 'Planta'}')" style="cursor: pointer;">
        ${item.imagem_url ? `
          <img src="${item.imagem_url}" alt="Amostra vegetal" loading="lazy" onerror="this.style.display='none'">
        ` : `
          <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#a4b39b;font-size:12px;">Sem Imagem</div>
        `}
      </div>

      <div class="diagnosis-body">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong style="color: var(--primary-900); font-size: 14px;">${item.especie_identificada || 'Planta Cultivada'}</strong>
            <span class="attention-badge ${item.nivel_atencao || 'moderado'}" style="font-size: 10px; padding: 2px 6px;">
              ${(item.nivel_atencao || 'moderado').toUpperCase()}
            </span>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 6px;">
            Data: ${item.criado_em || 'Registro Recente'}
          </div>
          <div style="font-size: 12px; color: var(--text-main); margin-bottom: 4px; line-height: 1.4;">
            <strong>Doença provável:</strong> ${item.possiveis_doencas || 'Em monitoramento'}
          </div>
          <div style="font-size: 11px; color: var(--text-muted); line-height: 1.3;">
            ${(item.sintomas_visiveis || item.sintomas || '').slice(0, 95)}...
          </div>
        </div>

        <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
          <span class="sync-badge ${item.synced ? 'synced' : 'offline'}">${item.synced ? 'Sincronizado' : 'Salvo no Celular'}</span>
          <button class="btn btn-secondary" style="font-size: 11px; padding: 3px 8px; min-height: 28px;" onclick="viewPastReport('${item.id}')">
            Ver Laudo
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

window.viewPastReport = function(id) {
  const item = AppState.diagnoses.find(d => String(d.id) === String(id));
  if (!item) return;

  switchTab('tab-scanner');
  displayImageInPreviewStage(item.imagem_url);
  renderDiagnosisReportCard(item);
  showToast(`Laudo de ${item.especie_identificada} carregado na tela.`, 'info');
};

// ============================================================================
// 7. AUTENTICAÇÃO E PERFIL DO PRODUTOR (ITEM 13)
// ============================================================================
function updateUserInterfaceHeader() {
  const nameEl = document.getElementById('headerUserName');
  const profName = document.getElementById('authProfileName');
  const profEmail = document.getElementById('authProfileEmail');
  const profFarm = document.getElementById('authProfileFarm');

  if (AppState.user) {
    if (nameEl) nameEl.textContent = AppState.user.nome.split(' ')[0] || 'Produtor';
    if (profName) profName.textContent = AppState.user.nome;
    if (profEmail) profEmail.textContent = AppState.user.email;
    if (profFarm) profFarm.textContent = `${AppState.user.propriedade_nome || 'Propriedade'} • Huambo`;
  }
}

window.showAuthRegisterForm = function() {
  document.getElementById('authProfileView').style.display = 'none';
  document.getElementById('authLoginForm').style.display = 'block';
  document.getElementById('authModalTitle').textContent = 'Acessar Conta AgroVision';
};

window.handleLoginSubmit = async function(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    let userRecord = null;
    if (navigator.onLine) {
      const res = await fetch(`${API_URL}?action=auth_login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const json = await res.json();
        userRecord = json.user;
      }
    }

    if (!userRecord) {
      userRecord = {
        id: 1,
        nome: email.split('@')[0],
        email: email,
        propriedade_nome: 'Quinta AgroVision'
      };
    }

    AppState.user = userRecord;
    saveLocalState();
    updateUserInterfaceHeader();

    document.getElementById('authProfileView').style.display = 'block';
    document.getElementById('authLoginForm').style.display = 'none';
    closeModal('modalAuth');
    showToast(`Bem-vindo, ${userRecord.nome}!`, 'success');
  } catch (err) {
    showToast('Falha na autenticação.', 'danger');
  }
};

window.handleLogout = function() {
  AppState.user = null;
  localStorage.removeItem(STORAGE_KEYS.USER);
  updateUserInterfaceHeader();
  showAuthRegisterForm();
  showToast('Sessão encerrada.', 'info');
};

// ============================================================================
// 8. SINCRONIZAÇÃO OFFLINE (LOCALSTORAGE -> PHP/MYSQL)
// ============================================================================
window.syncOfflineQueue = async function() {
  if (!navigator.onLine) {
    showToast('Dispositivo sem conexão à internet. Operando em modo offline seguro.', 'warning');
    return;
  }

  showToast('Sincronizando com o servidor PHP...', 'info');

  try {
    const payload = {
      queue: AppState.syncQueue,
      diagnoses: AppState.diagnoses.filter(d => !d.synced),
      irrigations: AppState.irrigations.filter(i => !i.synced),
      crops: AppState.crops
    };

    const res = await fetch(`${API_URL}?action=sync_offline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      AppState.syncQueue = [];
      AppState.diagnoses.forEach(d => d.synced = true);
      AppState.irrigations.forEach(i => i.synced = true);
      saveLocalState();
      updateSyncBadge();
      renderDashboard();
      showToast('Sincronização com o servidor concluída.', 'success');
    }
  } catch (err) {
    showToast('Falha na comunicação com o backend.', 'warning');
  }
};

function updateSyncBadge() {
  const badge = document.getElementById('pendingCountBadge');
  const count = AppState.syncQueue.length;
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

// ============================================================================
// 9. EXPORTAÇÕES E MODAIS
// ============================================================================
window.exportReportsCSV = function() {
  if (AppState.diagnoses.length === 0 && AppState.irrigations.length === 0) {
    showToast('Nenhum dado para exportação.', 'warning');
    return;
  }

  let csv = 'Tipo,Cultura,Data,Severidade/Condicao,Sintomas/Volume,Recomendacao\n';
  AppState.diagnoses.forEach(d => {
    csv += `"Diagnostico","${d.especie_identificada || d.planta_identificada}","${d.criado_em}","${d.nivel_atencao || ''}","${(d.sintomas_visiveis || '').replace(/"/g, '""')}","${(d.recomendacoes_cuidado || '').replace(/"/g, '""')}"\n`;
  });
  AppState.irrigations.forEach(i => {
    csv += `"Irrigacao","${i.cultura_nome || ''}","${i.criado_em}","${i.condicao_clima}","${i.quantidade_litros} L","${(i.observacoes || '').replace(/"/g, '""')}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `agrovision_relatorio_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Relatório CSV descarregado.', 'success');
};

window.exportCurrentReportPDF = function() {
  if (!AppState.lastAnalysisRecord) {
    showToast('Nenhum laudo ativo para exportação.', 'warning');
    return;
  }
  window.print();
};

window.openModal = function(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.add('open');
};

window.closeModal = function(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.remove('open');
};

window.openPhotoZoom = function(src, title) {
  if (!src) return;
  const modal = document.getElementById('modalPhotoZoom');
  const img = document.getElementById('zoomModalImg');
  const titleEl = document.getElementById('zoomModalTitle');

  if (img) img.src = src;
  if (titleEl) titleEl.textContent = `Inspeção: ${title || 'Amostra Vegetal'}`;
  if (modal) modal.classList.add('open');
};

async function loadPhpSourceCode() {
  const viewer = document.getElementById('phpCodeViewer');
  if (!viewer) return;

  try {
    const res = await fetch(`${API_URL}/source`);
    if (res.ok) {
      viewer.textContent = await res.text();
    }
  } catch (e) {}
}

window.copyPhpCode = function() {
  const viewer = document.getElementById('phpCodeViewer');
  if (viewer && viewer.textContent) {
    navigator.clipboard.writeText(viewer.textContent).then(() => {
      showToast('Código api.php copiado para a área de transferência.', 'success');
    });
  }
};

window.downloadPhpFile = function() {
  const viewer = document.getElementById('phpCodeViewer');
  const code = viewer ? viewer.textContent : '';
  const blob = new Blob([code], { type: 'application/x-httpd-php' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'api.php';
  a.click();
  showToast('Descarregando api.php para o servidor.', 'success');
};

window.downloadSqlFile = async function() {
  try {
    const res = await fetch('schema.sql');
    const sqlText = res.ok ? await res.text() : 'CREATE DATABASE agrovision_db;';
    const blob = new Blob([sqlText], { type: 'application/sql' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'schema.sql';
    a.click();
    showToast('Descarregando esquema MySQL schema.sql.', 'success');
  } catch (e) {
    showToast('Erro ao transferir schema.sql.', 'warning');
  }
};

// ============================================================================
// AUXILIARES
// ============================================================================
function getLocalStorageJSON(key, fallback) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch (e) {
    return fallback;
  }
}

function saveLocalState() {
  try {
    localStorage.setItem(STORAGE_KEYS.CROPS, JSON.stringify(AppState.crops));
    localStorage.setItem(STORAGE_KEYS.DIAGNOSES, JSON.stringify(AppState.diagnoses));
    localStorage.setItem(STORAGE_KEYS.IRRIGATIONS, JSON.stringify(AppState.irrigations));
    localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(AppState.syncQueue));
    localStorage.setItem(STORAGE_KEYS.ESP32_DATA, JSON.stringify(AppState.esp32));
    localStorage.setItem(STORAGE_KEYS.ASSISTANT_CHAT, JSON.stringify(AppState.assistant.messages));
    if (AppState.user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(AppState.user));
    }
    updateSyncBadge();
  } catch (e) {}
}

function getDefaultAssistantMessages() {
  return [
    {
      sender: 'bot',
      text: 'Olá, agricultor. Sou o seu Assistente Agrícola AgroVision. Tenho acesso aos dados dos seus talhões cadastrados, últimas vistorias foliares e balanço hídrico. Em que posso auxiliá-lo no manejo da sua lavoura hoje?',
      time: 'Início da sessão'
    }
  ];
}

// ============================================================================
// MÓDULO: ASSISTENTE AGRÍCOLA COM IA (CONVERSACIONAL E TÉCNICO)
// ============================================================================
function initAssistantModule() {
  renderAssistantMessages();
  updateAssistantContextBar();
}

function updateAssistantContextBar() {
  const contextCrops = document.getElementById('assistantContextCrops');
  const contextTelemetry = document.getElementById('assistantContextTelemetry');

  if (contextCrops) {
    const totalC = AppState.crops.length;
    const names = AppState.crops.map(c => c.nome).slice(0, 3).join(', ');
    contextCrops.textContent = `Talhões ativos (${totalC}): ${names || 'Nenhum'}`;
  }

  if (contextTelemetry) {
    if (AppState.esp32) {
      contextTelemetry.textContent = `Solo: ${AppState.esp32.umidade_solo_pct}% | Temp: ${AppState.esp32.temperatura_ar_c}°C`;
    } else {
      contextTelemetry.textContent = 'Modo sem sensores ativos';
    }
  }
}

function formatAssistantMarkdown(rawText) {
  if (!rawText) return '';
  // Escapa caracteres perigosos mantendo segurança contra injeção
  let safe = rawText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Converte cabeçalhos markdown
  safe = safe.replace(/^### (.*$)/gim, '<div class="assistant-title-h3">$1</div>');
  safe = safe.replace(/^## (.*$)/gim, '<div class="assistant-title-h2">$1</div>');
  safe = safe.replace(/^# (.*$)/gim, '<div class="assistant-title-h2">$1</div>');

  // Converte **negrito** e *itálico*
  safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  safe = safe.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Converte listas numeradas
  safe = safe.replace(/^\s*([0-9]+)\.\s+(.*$)/gim, '<div class="assistant-list-item"><span class="assistant-list-num">$1.</span><span>$2</span></div>');

  // Converte listas com marcadores (- ou *)
  safe = safe.replace(/^\s*[-•*]\s+(.*$)/gim, '<div class="assistant-list-item"><span class="assistant-list-bullet">•</span><span>$1</span></div>');

  // Espaçamento de parágrafos duplos
  safe = safe.replace(/\n\n+/g, '<div class="assistant-paragraph-gap"></div>');
  safe = safe.replace(/\n/g, '<br>');

  return safe;
}

function renderAssistantMessages() {
  const container = document.getElementById('assistantMessagesList');
  if (!container) return;

  container.innerHTML = '';
  AppState.assistant.messages.forEach(msg => {
    const msgDiv = document.createElement('div');
    msgDiv.className = `assistant-msg ${msg.sender}`;

    const bubble = document.createElement('div');
    bubble.className = 'assistant-msg-bubble';

    if (msg.sender === 'bot') {
      bubble.innerHTML = formatAssistantMarkdown(msg.text);
    } else {
      bubble.textContent = msg.text;
    }

    const timeDiv = document.createElement('div');
    timeDiv.className = 'assistant-msg-time';

    const timeSpan = document.createElement('span');
    timeSpan.textContent = msg.time || 'Agora';
    timeDiv.appendChild(timeSpan);

    if (msg.sender === 'bot' && msg.metodo && msg.metodo.includes('gemini')) {
      const badge = document.createElement('span');
      badge.className = 'assistant-tag-gemini';
      badge.textContent = 'IA Gemini';
      badge.title = `Gerado via modelo Google Gemini (${msg.metodo})`;
      timeDiv.appendChild(badge);
    }

    msgDiv.appendChild(bubble);
    msgDiv.appendChild(timeDiv);
    container.appendChild(msgDiv);
  });

  if (AppState.assistant.isTyping) {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'assistant-msg bot';
    typingDiv.innerHTML = `
      <div class="assistant-typing-indicator">
        <div class="assistant-typing-dot"></div>
        <div class="assistant-typing-dot"></div>
        <div class="assistant-typing-dot"></div>
      </div>
    `;
    container.appendChild(typingDiv);
  }

  container.scrollTop = container.scrollHeight;
}

window.handleAssistantTextareaKey = function(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    const form = document.getElementById('assistantChatForm');
    if (form) form.requestSubmit();
  }
};

window.sendQuickAssistantPrompt = function(promptText) {
  const input = document.getElementById('assistantInputText');
  if (input) {
    input.value = promptText;
    const form = document.getElementById('assistantChatForm');
    if (form) form.requestSubmit();
  }
};

window.clearAssistantChat = function() {
  AppState.assistant.messages = getDefaultAssistantMessages();
  saveLocalState();
  renderAssistantMessages();
  showToast('Histórico da conversa reiniciado.', 'info');
};

window.handleSendAssistantMessage = async function(event) {
  event.preventDefault();
  const input = document.getElementById('assistantInputText');
  const btn = document.getElementById('btnSendAssistant');
  if (!input) return;

  const question = input.value.trim();
  if (!question || AppState.assistant.isTyping) return;

  const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Adiciona pergunta do usuário
  AppState.assistant.messages.push({
    sender: 'user',
    text: question,
    time: nowTime
  });

  input.value = '';
  AppState.assistant.isTyping = true;
  if (btn) btn.disabled = true;
  renderAssistantMessages();

  try {
    const res = await fetch(`${API_URL}?action=ask_assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pergunta: question })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success' && data.resposta) {
        AppState.assistant.messages.push({
          sender: 'bot',
          text: data.resposta,
          metodo: data.metodo || 'gemini_ai',
          time: data.timestamp || nowTime
        });
      } else {
        throw new Error(data.message || 'Falha ao processar resposta');
      }
    } else {
      throw new Error(`Erro HTTP ${res.status}`);
    }
  } catch (err) {
    // Fallback local caso offline
    const fallbackAnswer = generateClientFallbackAnswer(question);
    AppState.assistant.messages.push({
      sender: 'bot',
      text: fallbackAnswer,
      metodo: 'offline_local',
      time: nowTime
    });
  } finally {
    AppState.assistant.isTyping = false;
    if (btn) btn.disabled = false;
    saveLocalState();
    renderAssistantMessages();
  }
};

function generateClientFallbackAnswer(question) {
  const q = question.toLowerCase();
  if (q.includes('lagarta') || q.includes('cartucho') || q.includes('milho')) {
    return 'Recomendação agronômica local: Para lagarta-do-cartucho no milho, realize aplicação de Bacillus thuringiensis (Bt) ou extrato de nim a 1% no cartucho das plantas nas horas frescas. Evite inseticidas de amplo espectro.';
  }
  if (q.includes('tomate') || q.includes('pinta') || q.includes('mancha') || q.includes('requeima')) {
    return 'Recomendação para o tomateiro: Efetue poda sanitária das folhas basais com manchas concêntricas e aplique calda bordalesa a 1% de forma protetora. Ao irrigar, nunca molhe a folhagem para evitar dispersão de esporos fúngicos.';
  }
  if (q.includes('cafe') || q.includes('café') || q.includes('ferrugem') || q.includes('broca')) {
    return 'Recomendação para cafeicultura: Para a ferrugem do cafeeiro (Hemileia vastatrix), utilize fungicidas cúpricos no início do período chuvoso. Para a broca-do-café, faça o repasse da colheita colhendo todos os frutos remanescentes no chão e na planta.';
  }
  if (q.includes('mandioca') || q.includes('bacteriose') || q.includes('mandio')) {
    return 'Recomendação para mandioca: Selecione manivas-semente vigorosas e livres de estrias escuras. Ao notar sintomas de bacteriose ou podridão radicular, elimine as plantas afetadas e adote rotação com gramíneas.';
  }
  if (q.includes('adub') || q.includes('verde') || q.includes('feijao-de-porco') || q.includes('crotalaria') || q.includes('compost')) {
    return 'Adubação Verde e Nutrição: Leguminosas como feijão-de-porco e crotalária fixam até 150 kg de N/ha da atmosfera e descompactam o solo. Triture a biomassa no início do florescimento e incorpore levemente à camada superficial.';
  }
  if (q.includes('regar') || q.includes('irrigar') || q.includes('agua') || q.includes('solo')) {
    return 'Balanço hídrico: Priorize irrigação entre 06:00 e 08:30 ou após as 16:30 para minimizar perdas evaporativas. Verifique a umidade do solo a 15 cm de profundidade antes de ligar a motobomba.';
  }
  return 'Orientação do Assistente AgroVision: Prática agrícola recomendada com base nas boas práticas do Manejo Integrado (MIP). Mantenha monitoramento regular a cada 5 a 7 dias e registre fotografias para diagnóstico fitossanitário detalhado.';
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}
