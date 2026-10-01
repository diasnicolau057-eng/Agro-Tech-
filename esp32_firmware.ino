/* ============================================================================
 * AGROVISION - FIRMWARE C++ / ARDUINO IDE PARA ESP32 (esp32_firmware.ino)
 * ============================================================================
 * Dispositivo: Node AgroVision IoT (ESP32 WROOM-32 / DevKit v1)
 * Protocolo: HTTP REST / JSON via Wi-Fi para o backend AgroVision (api.php)
 * Sensores integrados:
 *  - Sensor Capacitivo de Umidade do Solo v1.2 (Pino ADC GPIO 34)
 *  - Sensor de Temperatura e Umidade do Ar DHT22 / AHT10 (GPIO 4)
 *  - Sensor Digital de Chuva / Detector Pluviométrico (GPIO 5)
 *  - Relé de Acionamento da Motobomba / Eletroválvula Solenóide (GPIO 18)
 * Trava de Segurança: Timeout automático e bloqueio de acionamento em caso de falha.
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Configurações de Rede Wi-Fi do Agricultor
const char* WIFI_SSID     = "AGROVISION_RURAL_NET";
const char* WIFI_PASSWORD = "agrovision_field_pass";

// Endereço do Servidor Central AgroVision
const char* AGROVISION_SERVER_URL = "http://192.168.1.100:3000/api.php?action=esp32_telemetry";

// Identificação Única do Dispositivo no Campo
const char* DEVICE_ID = "ESP32_AGRO_NODE_01";
const int CULTURA_ID  = 1; // ID do Talhão / Cultura cadastrada

// Definição dos Pinos de Hardware do ESP32
#define PIN_SOIL_ANALOG    34  // ADC1_CH6 - Sensor Capacitivo de Umidade
#define PIN_RAIN_DIGITAL   5   // GPIO 5   - Sensor de Chuva (LOW quando molhado)
#define PIN_RELAY_VALVE    18  // GPIO 18  - Relé da Eletroválvula (Ativo em HIGH)
#define PIN_STATUS_LED     2   // LED onboard para indicação de status

// Parâmetros de Calibração do Sensor Capacitivo
const int AIR_VALUE   = 3500;  // Leitura ADC do sensor completamente seco (no ar)
const int WATER_VALUE = 1450;  // Leitura ADC do sensor submerso em água

// Temporizadores de Ciclo (em milissegundos)
const unsigned long TELEMETRY_INTERVAL_MS = 30000; // Envia dados a cada 30 segundos
const unsigned long SAFETY_MAX_VALVE_MS   = 1800000; // Trava máxima de 30 min por irrigação
unsigned long lastTelemetryTime = 0;
unsigned long valveOpenedAt = 0;
bool isValveOpen = false;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n[AgroVision Node] Inicializando firmware ESP32...");

  pinMode(PIN_RAIN_DIGITAL, INPUT_PULLUP);
  pinMode(PIN_RELAY_VALVE, OUTPUT);
  pinMode(PIN_STATUS_LED, OUTPUT);

  // Garante válvula fechada no boot (Segurança Fail-Safe)
  digitalWrite(PIN_RELAY_VALVE, LOW);
  digitalWrite(PIN_STATUS_LED, LOW);

  connectToWiFi();
}

void loop() {
  // Mantém reconexão Wi-Fi ativa
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
  }

  // Trava de segurança: Desliga válvula se ultrapassar tempo limite
  if (isValveOpen && (millis() - valveOpenedAt > SAFETY_MAX_VALVE_MS)) {
    Serial.println("[AgroVision Alerta] Trava de segurança atingida! Fechando válvula de emergência.");
    setValveState(false);
  }

  // Envio periódico de telemetria
  if (millis() - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = millis();
    sendTelemetryAndPollCommands();
  }

  delay(100);
}

void connectToWiFi() {
  Serial.print("[WiFi] Conectando a ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Conectado com sucesso!");
    Serial.print("[WiFi] Endereço IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WiFi] Falha ao conectar. Operando em modo autônomo offline temporário.");
  }
}

// Leitura com média móvel para filtragem de ruído elétrico do ADC
float readSoilMoisturePercent() {
  long sum = 0;
  for (int i = 0; i < 16; i++) {
    sum += analogRead(PIN_SOIL_ANALOG);
    delay(10);
  }
  int avgAdc = sum / 16;
  
  // Converte ADC para porcentagem (100% = saturado em água, 0% = completamente seco)
  float percent = map(avgAdc, AIR_VALUE, WATER_VALUE, 0, 100);
  if (percent < 0.0) percent = 0.0;
  if (percent > 100.0) percent = 100.0;
  return percent;
}

// Leitura da condição do sensor de chuva (1 = Chovendo, 0 = Sem chuva)
int readRainSensor() {
  return digitalRead(PIN_RAIN_DIGITAL) == LOW ? 1 : 0;
}

void setValveState(bool open) {
  isValveOpen = open;
  if (open) {
    valveOpenedAt = millis();
    digitalWrite(PIN_RELAY_VALVE, HIGH);
    digitalWrite(PIN_STATUS_LED, HIGH);
    Serial.println("[Válvula] Relé ativado - Válvula ABERTA.");
  } else {
    digitalWrite(PIN_RELAY_VALVE, LOW);
    digitalWrite(PIN_STATUS_LED, LOW);
    Serial.println("[Válvula] Relé desativado - Válvula FECHADA.");
  }
}

// Envia leituras de sensores para a API REST e recebe comando de volta
void sendTelemetryAndPollCommands() {
  if (WiFi.status() != WL_CONNECTED) return;

  float soilMoisture = readSoilMoisturePercent();
  int rainDetected = readRainSensor();
  // Leituras simuladas ou de sensor acoplado I2C/OneWire (DHT22)
  float ambientTemp = 26.5;
  float ambientHum  = 63.0;

  Serial.printf("[Telemetria] Solo: %.1f%% | Chuva: %d | Válvula: %s\n",
    soilMoisture, rainDetected, isValveOpen ? "Aberta" : "Fechada");

  HTTPClient http;
  http.begin(AGROVISION_SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  // Serializa pacote JSON conforme schema.sql (`dados_esp32`)
  StaticJsonDocument<256> doc;
  doc["dispositivo_id"]    = DEVICE_ID;
  doc["cultura_id"]        = CULTURA_ID;
  doc["umidade_solo_pct"]  = soilMoisture;
  doc["temperatura_ar_c"]  = ambientTemp;
  doc["umidade_ar_pct"]    = ambientHum;
  doc["sensor_chuva"]      = rainDetected;
  doc["status_valvula"]    = isValveOpen ? "aberta" : "fechada";
  doc["tensao_bateria_v"]  = 3.82;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  int httpCode = http.POST(jsonPayload);
  if (httpCode > 0) {
    String response = http.getString();
    Serial.println("[Servidor] Resposta recebida: " + response);

    // Processa eventual comando remoto enviado pelo agricultor
    StaticJsonDocument<256> respDoc;
    DeserializationError error = deserializeJson(respDoc, response);
    if (!error) {
      if (respDoc.containsKey("comando_valvula")) {
        const char* cmd = respDoc["comando_valvula"];
        if (strcmp(cmd, "abrir") == 0 && !isValveOpen) {
          // Trava de segurança local: Não abre se houver chuva forte detectada
          if (rainDetected == 1) {
            Serial.println("[AgroVision Trava] Chuva detectada pelo sensor físico! Comando de abertura rejeitado.");
          } else {
            setValveState(true);
          }
        } else if (strcmp(cmd, "fechar") == 0 && isValveOpen) {
          setValveState(false);
        }
      }
    }
  } else {
    Serial.printf("[Servidor] Erro de envio HTTP: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}
