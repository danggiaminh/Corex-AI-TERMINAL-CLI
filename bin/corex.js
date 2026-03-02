#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { glob } from 'glob';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════

const CONFIG_DIR = path.join(os.homedir(), '.corex');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

function loadConfig() {
    try {
        const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!parsed.apiKey || !parsed.provider) return null;
        return parsed;
    } catch (e) {
        return null;
    }
}

function saveConfig(data) {
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    const existing = loadConfig() || {};
    const merged = { ...existing, ...data };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2));
}

// ═══════════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════

const FALLBACK_SYSTEM_PROMPT = `You are COREX, an elite AI assistant.
You are direct, insightful, and technically brilliant.
Format your responses for terminal display using clean spacing.
When showing code, use markdown code blocks.
Keep responses focused and avoid unnecessary filler text.`;

function loadSystemPrompt() {
    const filename = 'COREX_SYSTEM_PROMPT.txt';
    const possiblePaths = [
        path.join(__dirname, '..', 'assets', filename),
        path.join(__dirname, '..', '..', 'assets', filename),
        path.join(process.cwd(), 'assets', filename),
    ];
    for (const p of possiblePaths) {
        try {
            if (fs.existsSync(p)) return fs.readFileSync(p, 'utf-8').trim();
        } catch { /* continue */ }
    }
    return FALLBACK_SYSTEM_PROMPT;
}

const SYSTEM_PROMPT = loadSystemPrompt();

// ═══════════════════════════════════════════════════════════════════
// i18n STRINGS
// ═══════════════════════════════════════════════════════════════════

const STRINGS = {
    en: {
        tips_header: 'Tips for getting started:',
        tips_1: '1. Ask questions, edit files, or run commands.',
        tips_2: '2. Be specific for the best results.',
        tips_3: '3. /help for more information.',
        apikey_instruction: 'Enter your API key below and use what you purchased.',
        apikey_supports: 'Supports: Anthropic · Gemini · OpenAI · OpenRouter · DeepSeek',
        apikey_auto: 'Your key will be auto-detected. No manual setup needed.',
        apikey_prompt: 'API Key ❯ ',
        detected: '✓ Detected: ',
        not_detected: '⚠ Could not detect provider. Select manually:',
        select_provider: 'Select AI Provider:',
        select_theme: 'Select Theme:',
        select_lang: 'Select Language:',
        select_model: 'Select Model:',
        theme_changed: '✓ Theme changed to: ',
        lang_changed: '✓ Language changed to: ',
        model_changed: '✓ Model set to: ',
        copied: '✓ Copied to clipboard.',
        nothing_to_copy: '⚠ No response to copy yet.',
        screen_cleared: '',
        logged_out: "Logged out. Run 'corex' to set up again.",
        invalid_key: '✗ Invalid API key. Run /config to update.',
        network_error: '✗ Network error. Check your connection.',
        file_not_found: '✗ File not found: ',
        file_read_error: '✗ Error reading file: ',
        no_key_provided: '✗ No API key provided.',
        config_updated: '✓ Config updated.',
        provider_changed: '✓ Provider changed to ',
        help_title: 'Commands:',
        help_model: '/model        Switch AI model (arrow keys + Enter)',
        help_theme: '/theme        Change color theme (arrow keys + Enter)',
        help_lang: '/lang         Change interface language',
        help_config: '/config       Change provider or API key',
        help_help: '/help         Show this message',
        help_ctrlc: 'Ctrl+C        Exit',
        help_file_title: 'File upload:',
        help_file_usage: '@filename     Attach a file to your message',
        help_file_example: 'Example:      @notes.txt summarize this',
        help_outside_title: 'Outside chat:',
        help_logout: 'corex logout  Reset all saved data',
        navigate_hint: '↑ ↓ to move   Enter to confirm',
        change_api_key: 'Change API key',
        change_provider: 'Change provider',
        show_current_config: 'Show current config',
        cancel: 'Cancel',
    },
    vi: {
        tips_header: 'Mẹo để bắt đầu:',
        tips_1: '1. Đặt câu hỏi, chỉnh sửa file hoặc chạy lệnh.',
        tips_2: '2. Mô tả càng cụ thể, kết quả càng tốt.',
        tips_3: '3. Gõ /help để xem thêm thông tin.',
        apikey_instruction: 'Nhập API key của bạn bên dưới và sử dụng những gì bạn đã mua.',
        apikey_supports: 'Hỗ trợ: Anthropic · Gemini · OpenAI · OpenRouter · DeepSeek',
        apikey_auto: 'Key sẽ được tự động nhận diện. Không cần cài đặt thủ công.',
        apikey_prompt: 'API Key ❯ ',
        detected: '✓ Đã nhận diện: ',
        not_detected: '⚠ Không nhận diện được. Vui lòng chọn thủ công:',
        select_provider: 'Chọn nhà cung cấp AI:',
        select_theme: 'Chọn giao diện:',
        select_lang: 'Chọn ngôn ngữ:',
        select_model: 'Chọn model:',
        theme_changed: '✓ Đã đổi giao diện: ',
        lang_changed: '✓ Đã đổi ngôn ngữ: ',
        model_changed: '✓ Đã chọn model: ',
        copied: '✓ Đã sao chép vào clipboard.',
        nothing_to_copy: '⚠ Chưa có phản hồi nào để sao chép.',
        screen_cleared: '',
        logged_out: "Đã đăng xuất. Chạy 'corex' để thiết lập lại.",
        invalid_key: '✗ API key không hợp lệ. Chạy /config để cập nhật.',
        network_error: '✗ Lỗi mạng. Kiểm tra kết nối internet.',
        file_not_found: '✗ Không tìm thấy file: ',
        file_read_error: '✗ Lỗi đọc file: ',
        no_key_provided: '✗ Chưa nhập API key.',
        config_updated: '✓ Đã cập nhật cấu hình.',
        provider_changed: '✓ Đã đổi nhà cung cấp: ',
        help_title: 'Các lệnh:',
        help_model: '/model        Đổi model AI (phím mũi tên + Enter)',
        help_theme: '/theme        Đổi giao diện màu sắc',
        help_lang: '/lang         Đổi ngôn ngữ giao diện',
        help_config: '/config       Đổi nhà cung cấp hoặc API key',
        help_help: '/help         Hiển thị danh sách lệnh',
        help_ctrlc: 'Ctrl+C        Thoát',
        help_file_title: 'Tải file lên:',
        help_file_usage: '@tênfile      Đính kèm file vào tin nhắn',
        help_file_example: 'Ví dụ:        @notes.txt tóm tắt file này',
        help_outside_title: 'Ngoài chat:',
        help_logout: 'corex logout  Xóa toàn bộ dữ liệu đã lưu',
        navigate_hint: '↑ ↓ di chuyển   Enter xác nhận',
        change_api_key: 'Đổi API key',
        change_provider: 'Đổi nhà cung cấp',
        show_current_config: 'Xem cấu hình hiện tại',
        cancel: 'Hủy',
    },
    ja: {
        tips_header: '始め方のヒント:',
        tips_1: '1. 質問する、ファイルを編集する、コマンドを実行する。',
        tips_2: '2. 具体的に伝えると良い結果が得られます。',
        tips_3: '3. /help で詳細情報を表示。',
        apikey_instruction: '以下にAPIキーを入力して使い始めましょう。',
        apikey_supports: '対応: Anthropic · Gemini · OpenAI · OpenRouter · DeepSeek',
        apikey_auto: 'キーは自動検出されます。手動設定は不要です。',
        apikey_prompt: 'APIキー ❯ ',
        detected: '✓ 検出: ',
        not_detected: '⚠ 自動検出できません。手動で選択してください:',
        select_provider: 'AIプロバイダーを選択:',
        select_theme: 'テーマを選択:',
        select_lang: '言語を選択:',
        select_model: 'モデルを選択:',
        theme_changed: '✓ テーマ変更: ',
        lang_changed: '✓ 言語変更: ',
        model_changed: '✓ モデル設定: ',
        copied: '✓ クリップボードにコピーしました。',
        nothing_to_copy: '⚠ コピーする応答がありません。',
        screen_cleared: '',
        logged_out: "ログアウトしました。'corex' で再設定できます。",
        invalid_key: '✗ 無効なAPIキーです。/config で更新してください。',
        network_error: '✗ ネットワークエラー。接続を確認してください。',
        file_not_found: '✗ ファイルが見つかりません: ',
        file_read_error: '✗ ファイル読み込みエラー: ',
        no_key_provided: '✗ APIキーが入力されていません。',
        config_updated: '✓ 設定を更新しました。',
        provider_changed: '✓ プロバイダーを変更: ',
        help_title: 'コマンド:',
        help_model: '/model        AIモデルを切り替え (矢印キー + Enter)',
        help_theme: '/theme        カラーテーマを変更',
        help_lang: '/lang         インターフェース言語を変更',
        help_config: '/config       プロバイダーまたはAPIキーを変更',
        help_help: '/help         このメッセージを表示',
        help_ctrlc: 'Ctrl+C        終了',
        help_file_title: 'ファイルアップロード:',
        help_file_usage: '@ファイル名   メッセージにファイルを添付',
        help_file_example: '例:           @notes.txt このファイルを要約して',
        help_outside_title: 'チャット外:',
        help_logout: 'corex logout  保存データをすべてリセット',
        navigate_hint: '↑ ↓ で移動   Enter で確定',
        change_api_key: 'API キーを変更',
        change_provider: 'プロバイダーを変更',
        show_current_config: '現在の設定を表示',
        cancel: 'キャンセル',
    },
    ko: {
        tips_header: '시작 팁:', tips_1: '1. 질문하기, 파일 편집, 명령 실행.', tips_2: '2. 구체적일수록 더 좋은 결과를 얻습니다.', tips_3: '3. /help 로 자세한 정보 확인.',
        apikey_instruction: '아래에 API 키를 입력하여 시작하세요.', apikey_supports: '지원: Anthropic · Gemini · OpenAI · OpenRouter · DeepSeek', apikey_auto: '키는 자동으로 감지됩니다. 수동 설정 불필요.', apikey_prompt: 'API 키 ❯ ',
        detected: '✓ 감지됨: ', not_detected: '⚠ 감지 실패. 수동으로 선택하세요:', select_provider: 'AI 공급자 선택:', select_theme: '테마 선택:', select_lang: '언어 선택:', select_model: '모델 선택:',
        theme_changed: '✓ 테마 변경: ', lang_changed: '✓ 언어 변경: ', model_changed: '✓ 모델 설정: ', copied: '✓ 클립보드에 복사되었습니다.', nothing_to_copy: '⚠ 복사할 응답이 없습니다.', screen_cleared: '',
        logged_out: "로그아웃되었습니다. 'corex' 로 재설정하세요.", invalid_key: '✗ 잘못된 API 키입니다. /config 로 업데이트하세요.', network_error: '✗ 네트워크 오류. 연결을 확인하세요.', file_not_found: '✗ 파일을 찾을 수 없습니다: ', file_read_error: '✗ 파일 읽기 오류: ', no_key_provided: '✗ API 키가 입력되지 않았습니다.',
        config_updated: '✓ 설정이 업데이트되었습니다.', provider_changed: '✓ 공급자 변경: ',
        help_title: '명령어:', help_model: '/model        AI 모델 전환 (화살표 + Enter)', help_theme: '/theme        색상 테마 변경', help_lang: '/lang         인터페이스 언어 변경', help_config: '/config       공급자 또는 API 키 변경', help_help: '/help         이 메시지 표시', help_ctrlc: 'Ctrl+C        종료',
        help_file_title: '파일 업로드:', help_file_usage: '@파일명       메시지에 파일 첨부', help_file_example: '예시:         @notes.txt 이 파일 요약해줘', help_outside_title: '채팅 외부:', help_logout: 'corex logout  저장된 모든 데이터 초기화',
        navigate_hint: '↑ ↓ 이동   Enter 확인', change_api_key: 'API 키 변경', change_provider: '공급자 변경', show_current_config: '현재 설정 보기', cancel: '취소',
    },
    zh: {
        tips_header: '入门提示：', tips_1: '1. 提问、编辑文件或运行命令。', tips_2: '2. 越具体，结果越好。', tips_3: '3. 输入 /help 查看更多信息。',
        apikey_instruction: '在下方输入您的 API 密钥即可开始使用。', apikey_supports: '支持：Anthropic · Gemini · OpenAI · OpenRouter · DeepSeek', apikey_auto: '密钥将自动识别，无需手动配置。', apikey_prompt: 'API 密钥 ❯ ',
        detected: '✓ 已识别：', not_detected: '⚠ 无法自动识别，请手动选择：', select_provider: '选择 AI 提供商：', select_theme: '选择主题：', select_lang: '选择语言：', select_model: '选择模型：',
        theme_changed: '✓ 主题已更改为：', lang_changed: '✓ 语言已更改为：', model_changed: '✓ 模型已设置为：', copied: '✓ 已复制到剪贴板。', nothing_to_copy: '⚠ 暂无可复制的回复。', screen_cleared: '',
        logged_out: "已退出登录。运行 'corex' 重新设置。", invalid_key: '✗ API 密钥无效，请运行 /config 更新。', network_error: '✗ 网络错误，请检查连接。', file_not_found: '✗ 找不到文件：', file_read_error: '✗ 文件读取错误：', no_key_provided: '✗ 未输入 API 密钥。',
        config_updated: '✓ 配置已更新。', provider_changed: '✓ 提供商已更改为 ',
        help_title: '命令：', help_model: '/model        切换 AI 模型（方向键 + Enter）', help_theme: '/theme        更改颜色主题', help_lang: '/lang         更改界面语言', help_config: '/config       更改提供商或 API 密钥', help_help: '/help         显示此帮助信息', help_ctrlc: 'Ctrl+C        退出',
        help_file_title: '文件上传：', help_file_usage: '@文件名       将文件附加到消息', help_file_example: '示例：        @notes.txt 总结这个文件', help_outside_title: '聊天外：', help_logout: 'corex logout  重置所有保存的数据',
        navigate_hint: '↑ ↓ 移动   Enter 确认', change_api_key: '更改 API 密钥', change_provider: '更改提供商', show_current_config: '查看当前配置', cancel: '取消',
    },
    fr: {
        tips_header: 'Conseils pour commencer :', tips_1: '1. Posez des questions, modifiez des fichiers ou exécutez des commandes.', tips_2: '2. Soyez précis pour de meilleurs résultats.', tips_3: "3. /help pour plus d'informations.",
        apikey_instruction: 'Entrez votre clé API ci-dessous pour commencer.', apikey_supports: 'Compatible : Anthropic · Gemini · OpenAI · OpenRouter · DeepSeek', apikey_auto: 'La clé sera détectée automatiquement. Aucune configuration manuelle.', apikey_prompt: 'Clé API ❯ ',
        detected: '✓ Détecté : ', not_detected: '⚠ Détection impossible. Sélectionnez manuellement :', select_provider: 'Choisir le fournisseur IA :', select_theme: 'Choisir le thème :', select_lang: 'Choisir la langue :', select_model: 'Choisir le modèle :',
        theme_changed: '✓ Thème changé : ', lang_changed: '✓ Langue changée : ', model_changed: '✓ Modèle défini : ', copied: '✓ Copié dans le presse-papiers.', nothing_to_copy: '⚠ Aucune réponse à copier.', screen_cleared: '',
        logged_out: "Déconnecté. Lancez 'corex' pour reconfigurer.", invalid_key: '✗ Clé API invalide. Lancez /config pour mettre à jour.', network_error: '✗ Erreur réseau. Vérifiez votre connexion.', file_not_found: '✗ Fichier introuvable : ', file_read_error: '✗ Erreur de lecture : ', no_key_provided: '✗ Aucune clé API fournie.',
        config_updated: '✓ Configuration mise à jour.', provider_changed: '✓ Fournisseur changé : ',
        help_title: 'Commandes :', help_model: '/model        Changer de modèle IA (flèches + Entrée)', help_theme: '/theme        Changer le thème de couleur', help_lang: "/lang         Changer la langue de l'interface", help_config: '/config       Changer fournisseur ou clé API', help_help: '/help         Afficher ce message', help_ctrlc: 'Ctrl+C        Quitter',
        help_file_title: 'Envoi de fichier :', help_file_usage: '@nomfichier   Joindre un fichier au message', help_file_example: 'Exemple :     @notes.txt résume ce fichier', help_outside_title: 'Hors chat :', help_logout: 'corex logout  Réinitialiser toutes les données',
        navigate_hint: '↑ ↓ naviguer   Entrée confirmer', change_api_key: 'Changer la clé API', change_provider: 'Changer le fournisseur', show_current_config: 'Afficher la config actuelle', cancel: 'Annuler',
    },
    es: {
        tips_header: 'Consejos para empezar:', tips_1: '1. Haz preguntas, edita archivos o ejecuta comandos.', tips_2: '2. Sé específico para mejores resultados.', tips_3: '3. /help para más información.',
        apikey_instruction: 'Introduce tu clave API abajo para comenzar.', apikey_supports: 'Compatible: Anthropic · Gemini · OpenAI · OpenRouter · DeepSeek', apikey_auto: 'La clave se detectará automáticamente. Sin configuración manual.', apikey_prompt: 'Clave API ❯ ',
        detected: '✓ Detectado: ', not_detected: '⚠ No se pudo detectar. Selecciona manualmente:', select_provider: 'Seleccionar proveedor IA:', select_theme: 'Seleccionar tema:', select_lang: 'Seleccionar idioma:', select_model: 'Seleccionar modelo:',
        theme_changed: '✓ Tema cambiado a: ', lang_changed: '✓ Idioma cambiado a: ', model_changed: '✓ Modelo establecido: ', copied: '✓ Copiado al portapapeles.', nothing_to_copy: '⚠ No hay respuesta para copiar.', screen_cleared: '',
        logged_out: "Sesión cerrada. Ejecuta 'corex' para configurar de nuevo.", invalid_key: '✗ Clave API inválida. Ejecuta /config para actualizar.', network_error: '✗ Error de red. Comprueba tu conexión.', file_not_found: '✗ Archivo no encontrado: ', file_read_error: '✗ Error al leer archivo: ', no_key_provided: '✗ No se proporcionó clave API.',
        config_updated: '✓ Configuración actualizada.', provider_changed: '✓ Proveedor cambiado a ',
        help_title: 'Comandos:', help_model: '/model        Cambiar modelo IA (flechas + Enter)', help_theme: '/theme        Cambiar tema de color', help_lang: '/lang         Cambiar idioma de la interfaz', help_config: '/config       Cambiar proveedor o clave API', help_help: '/help         Mostrar este mensaje', help_ctrlc: 'Ctrl+C        Salir',
        help_file_title: 'Subir archivo:', help_file_usage: '@archivo      Adjuntar archivo al mensaje', help_file_example: 'Ejemplo:      @notes.txt resume este archivo', help_outside_title: 'Fuera del chat:', help_logout: 'corex logout  Restablecer todos los datos',
        navigate_hint: '↑ ↓ mover   Enter confirmar', change_api_key: 'Cambiar clave API', change_provider: 'Cambiar proveedor', show_current_config: 'Mostrar config actual', cancel: 'Cancelar',
    },
    de: {
        tips_header: 'Tipps zum Einstieg:', tips_1: '1. Fragen stellen, Dateien bearbeiten oder Befehle ausführen.', tips_2: '2. Je spezifischer, desto besser die Ergebnisse.', tips_3: '3. /help für weitere Informationen.',
        apikey_instruction: 'Gib unten deinen API-Schlüssel ein, um zu beginnen.', apikey_supports: 'Unterstützt: Anthropic · Gemini · OpenAI · OpenRouter · DeepSeek', apikey_auto: 'Der Schlüssel wird automatisch erkannt. Keine manuelle Einrichtung.', apikey_prompt: 'API-Schlüssel ❯ ',
        detected: '✓ Erkannt: ', not_detected: '⚠ Erkennung fehlgeschlagen. Bitte manuell auswählen:', select_provider: 'KI-Anbieter auswählen:', select_theme: 'Thema auswählen:', select_lang: 'Sprache auswählen:', select_model: 'Modell auswählen:',
        theme_changed: '✓ Thema geändert zu: ', lang_changed: '✓ Sprache geändert zu: ', model_changed: '✓ Modell gesetzt: ', copied: '✓ In Zwischenablage kopiert.', nothing_to_copy: '⚠ Keine Antwort zum Kopieren.', screen_cleared: '',
        logged_out: "Abgemeldet. Starte 'corex' zur Neueinrichtung.", invalid_key: '✗ Ungültiger API-Schlüssel. Führe /config aus.', network_error: '✗ Netzwerkfehler. Überprüfe deine Verbindung.', file_not_found: '✗ Datei nicht gefunden: ', file_read_error: '✗ Fehler beim Lesen: ', no_key_provided: '✗ Kein API-Schlüssel eingegeben.',
        config_updated: '✓ Konfiguration aktualisiert.', provider_changed: '✓ Anbieter geändert zu ',
        help_title: 'Befehle:', help_model: '/model        KI-Modell wechseln (Pfeiltasten + Enter)', help_theme: '/theme        Farbthema ändern', help_lang: '/lang         Oberflächensprache ändern', help_config: '/config       Anbieter oder API-Schlüssel ändern', help_help: '/help         Diese Nachricht anzeigen', help_ctrlc: 'Ctrl+C        Beenden',
        help_file_title: 'Datei-Upload:', help_file_usage: '@dateiname    Datei an Nachricht anhängen', help_file_example: 'Beispiel:     @notes.txt fasse diese Datei zusammen', help_outside_title: 'Außerhalb des Chats:', help_logout: 'corex logout  Alle Daten zurücksetzen',
        navigate_hint: '↑ ↓ bewegen   Enter bestätigen', change_api_key: 'API-Schlüssel ändern', change_provider: 'Anbieter ändern', show_current_config: 'Aktuelle Konfiguration', cancel: 'Abbrechen',
    },
    pt: {
        tips_header: 'Dicas para começar:', tips_1: '1. Faça perguntas, edite arquivos ou execute comandos.', tips_2: '2. Seja específico para melhores resultados.', tips_3: '3. /help para mais informações.',
        apikey_instruction: 'Insira sua chave API abaixo para começar.', apikey_supports: 'Suporta: Anthropic · Gemini · OpenAI · OpenRouter · DeepSeek', apikey_auto: 'A chave será detectada automaticamente. Sem configuração manual.', apikey_prompt: 'Chave API ❯ ',
        detected: '✓ Detectado: ', not_detected: '⚠ Não foi possível detectar. Selecione manualmente:', select_provider: 'Selecionar provedor de IA:', select_theme: 'Selecionar tema:', select_lang: 'Selecionar idioma:', select_model: 'Selecionar modelo:',
        theme_changed: '✓ Tema alterado para: ', lang_changed: '✓ Idioma alterado para: ', model_changed: '✓ Modelo definido: ', copied: '✓ Copiado para a área de transferência.', nothing_to_copy: '⚠ Nenhuma resposta para copiar.', screen_cleared: '',
        logged_out: "Desconectado. Execute 'corex' para reconfigurar.", invalid_key: '✗ Chave API inválida. Execute /config para atualizar.', network_error: '✗ Erro de rede. Verifique sua conexão.', file_not_found: '✗ Arquivo não encontrado: ', file_read_error: '✗ Erro ao ler arquivo: ', no_key_provided: '✗ Nenhuma chave API fornecida.',
        config_updated: '✓ Configuração atualizada.', provider_changed: '✓ Provedor alterado para ',
        help_title: 'Comandos:', help_model: '/model        Trocar modelo de IA (setas + Enter)', help_theme: '/theme        Mudar tema de cor', help_lang: '/lang         Mudar idioma da interface', help_config: '/config       Mudar provedor ou chave API', help_help: '/help         Mostrar esta mensagem', help_ctrlc: 'Ctrl+C        Sair',
        help_file_title: 'Upload de arquivo:', help_file_usage: '@arquivo      Anexar arquivo à mensagem', help_file_example: 'Exemplo:      @notes.txt resuma este arquivo', help_outside_title: 'Fora do chat:', help_logout: 'corex logout  Redefinir todos os dados',
        navigate_hint: '↑ ↓ mover   Enter confirmar', change_api_key: 'Alterar chave API', change_provider: 'Alterar provedor', show_current_config: 'Mostrar config atual', cancel: 'Cancelar',
    },
    ru: {
        tips_header: 'Советы по началу работы:', tips_1: '1. Задавайте вопросы, редактируйте файлы или выполняйте команды.', tips_2: '2. Чем конкретнее запрос, тем лучше результат.', tips_3: '3. /help — дополнительная информация.',
        apikey_instruction: 'Введите ваш API-ключ ниже, чтобы начать.', apikey_supports: 'Поддерживает: Anthropic · Gemini · OpenAI · OpenRouter · DeepSeek', apikey_auto: 'Ключ будет определён автоматически. Ручная настройка не нужна.', apikey_prompt: 'API-ключ ❯ ',
        detected: '✓ Определено: ', not_detected: '⚠ Не удалось определить. Выберите вручную:', select_provider: 'Выбрать ИИ-провайдера:', select_theme: 'Выбрать тему:', select_lang: 'Выбрать язык:', select_model: 'Выбрать модель:',
        theme_changed: '✓ Тема изменена: ', lang_changed: '✓ Язык изменён: ', model_changed: '✓ Модель установлена: ', copied: '✓ Скопировано в буфер обмена.', nothing_to_copy: '⚠ Нет ответа для копирования.', screen_cleared: '',
        logged_out: "Выход выполнен. Запустите 'corex' для повторной настройки.", invalid_key: '✗ Неверный API-ключ. Запустите /config для обновления.', network_error: '✗ Ошибка сети. Проверьте подключение.', file_not_found: '✗ Файл не найден: ', file_read_error: '✗ Ошибка чтения файла: ', no_key_provided: '✗ API-ключ не введён.',
        config_updated: '✓ Конфигурация обновлена.', provider_changed: '✓ Провайдер изменён: ',
        help_title: 'Команды:', help_model: '/model        Сменить модель ИИ (стрелки + Enter)', help_theme: '/theme        Изменить цветовую тему', help_lang: '/lang         Изменить язык интерфейса', help_config: '/config       Изменить провайдера или API-ключ', help_help: '/help         Показать это сообщение', help_ctrlc: 'Ctrl+C        Выход',
        help_file_title: 'Загрузка файла:', help_file_usage: '@имяфайла     Прикрепить файл к сообщению', help_file_example: 'Пример:       @notes.txt кратко изложи этот файл', help_outside_title: 'Вне чата:', help_logout: 'corex logout  Сбросить все данные',
        navigate_hint: '↑ ↓ перемещение   Enter подтвердить', change_api_key: 'Изменить API-ключ', change_provider: 'Изменить провайдера', show_current_config: 'Показать текущую конфигурацию', cancel: 'Отмена',
    },
};

let currentLang = loadConfig()?.lang || 'en';

function t(key) {
    return (STRINGS[currentLang] && STRINGS[currentLang][key]) || STRINGS.en[key] || key;
}

const LANG_LIST = [
    { id: 'en', label: '🇺🇸 English' },
    { id: 'vi', label: '🇻🇳 Tiếng Việt' },
    { id: 'ja', label: '🇯🇵 日本語' },
    { id: 'ko', label: '🇰🇷 한국어' },
    { id: 'zh', label: '🇨🇳 中文' },
    { id: 'fr', label: '🇫🇷 Français' },
    { id: 'es', label: '🇪🇸 Español' },
    { id: 'de', label: '🇩🇪 Deutsch' },
    { id: 'pt', label: '🇧🇷 Português' },
    { id: 'ru', label: '🇷🇺 Русский' },
];
// ═══════════════════════════════════════════════════════════════════
// THEMES (7 themes including Spectrum)
// ═══════════════════════════════════════════════════════════════════

const RESET = '\x1b[0m';
const DIM = '\x1b[90m';

const SPECTRUM = [
    '\x1b[96m', '\x1b[94m', '\x1b[95m', '\x1b[35m',
    '\x1b[91m', '\x1b[93m', '\x1b[92m',
];

const THEMES = {
    default: { ansi: '\x1b[37m', name: 'Default', desc: 'ANSI 37', descDetail: 'white/gray', swatch: '\x1b[37m■\x1b[0m' },
    green: { ansi: '\x1b[92m', name: 'Green', desc: 'ANSI 92', descDetail: 'bright green', swatch: '\x1b[92m■\x1b[0m' },
    red: { ansi: '\x1b[91m', name: 'Red', desc: 'ANSI 91', descDetail: 'bright red', swatch: '\x1b[91m■\x1b[0m' },
    purple: { ansi: '\x1b[95m', name: 'Purple', desc: 'ANSI 95', descDetail: 'bright purple', swatch: '\x1b[95m■\x1b[0m' },
    yellow: { ansi: '\x1b[93m', name: 'Yellow', desc: 'ANSI 93', descDetail: 'bright yellow', swatch: '\x1b[93m■\x1b[0m' },
    blue: { ansi: '\x1b[94m', name: 'Blue', desc: 'ANSI 94', descDetail: 'bright blue', swatch: '\x1b[94m■\x1b[0m' },
    spectrum: { ansi: '\x1b[96m', name: 'Spectrum', desc: '', descDetail: 'rainbow gradient', swatch: '\x1b[96m■\x1b[95m■\x1b[91m■\x1b[93m■\x1b[92m■\x1b[0m' },
};
const THEME_KEYS = Object.keys(THEMES);

function getThemeAnsi(themeName) {
    return (THEMES[themeName] || THEMES.default).ansi;
}

function getPromptColor(themeName) {
    if (themeName === 'spectrum') return '\x1b[96m';
    return getThemeAnsi(themeName);
}

function getResponseColor(themeName) {
    if (themeName === 'spectrum') return '\x1b[0m';
    return getThemeAnsi(themeName);
}

function getSystemColor(themeName) {
    if (themeName === 'spectrum') return '\x1b[94m';
    return getThemeAnsi(themeName);
}

function renderSpectrum(text) {
    let colorIndex = 0;
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '\n') {
            result += '\n';
        } else if (ch === ' ') {
            result += ' ';
        } else {
            result += SPECTRUM[colorIndex % SPECTRUM.length] + ch + RESET;
            colorIndex++;
        }
    }
    return result;
}

function renderSpectrumSeparator(sep) {
    let colorIndex = 0;
    let result = '';
    for (let i = 0; i < sep.length; i++) {
        const ch = sep[i];
        if (ch === ' ' || ch === '\n') {
            result += ch;
        } else {
            result += SPECTRUM[colorIndex % SPECTRUM.length] + ch + RESET;
            colorIndex++;
        }
    }
    return result;
}

// ═══════════════════════════════════════════════════════════════════
// LOGO
// ═══════════════════════════════════════════════════════════════════

const LOGO_TEXT = `
 ██████╗ ██████╗ ██████╗ ███████╗██╗  ██╗     ██████╗██╗     ██╗
██╔════╝██╔═══██╗██╔══██╗██╔════╝╚██╗██╔╝    ██╔════╝██║     ██║
██║     ██║   ██║██████╔╝█████╗   ╚███╔╝     ██║     ██║     ██║
██║     ██║   ██║██╔══██╗██╔══╝   ██╔██╗     ██║     ██║     ██║
╚██████╗╚██████╔╝██║  ██║███████╗██╔╝ ██╗    ╚██████╗███████╗██║
 ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝    ╚═════╝╚══════╝╚═╝`;

const SEPARATOR = '──────────────────────────────────────────────────────────────────';

function printLogo(themeName) {
    const tn = themeName || 'default';
    if (tn === 'spectrum') {
        process.stdout.write(renderSpectrum(LOGO_TEXT) + '\n');
        process.stdout.write(renderSpectrumSeparator(SEPARATOR) + '\n');
    } else {
        const color = getThemeAnsi(tn);
        process.stdout.write(color + LOGO_TEXT + RESET + '\n');
        process.stdout.write(color + SEPARATOR + RESET + '\n');
    }
}

// ═══════════════════════════════════════════════════════════════════
// PROVIDER DETECTION
// ═══════════════════════════════════════════════════════════════════

function detectProvider(key) {
    const k = key.trim();
    if (k.startsWith('sk-ant-')) return 'anthropic';
    if (k.startsWith('AIza')) return 'gemini';
    if (k.startsWith('sk-or-v1-') || k.startsWith('sk-or-')) return 'openrouter';
    if (k.startsWith('sk-proj-')) return 'openai';
    if (k.startsWith('sk-') && !k.startsWith('sk-or-')) return 'openai';
    if (k.startsWith('ds-') || k.toLowerCase().includes('deepseek')) return 'deepseek';
    return null;
}

const PROVIDER_NAMES = {
    anthropic: 'Anthropic (Claude)', gemini: 'Google Gemini',
    openrouter: 'OpenRouter', openai: 'OpenAI', deepseek: 'DeepSeek',
};

const PROVIDERS_LIST = [
    { id: 'anthropic', label: 'Anthropic (Claude)' },
    { id: 'gemini', label: 'Google Gemini' },
    { id: 'openai', label: 'OpenAI (GPT)' },
    { id: 'openrouter', label: 'OpenRouter' },
    { id: 'deepseek', label: 'DeepSeek' },
];

// ═══════════════════════════════════════════════════════════════════
// STDIN CLEANUP
// ═══════════════════════════════════════════════════════════════════

function cleanupStdin() {
    try { if (process.stdin.isTTY && process.stdin.isRaw) process.stdin.setRawMode(false); } catch (e) { }
    process.stdin.removeAllListeners('data');
    process.stdin.removeAllListeners('keypress');
    process.stdin.pause();
}

// ═══════════════════════════════════════════════════════════════════
// MASKED API KEY INPUT
// ═══════════════════════════════════════════════════════════════════

function askApiKey() {
    return new Promise((resolve) => {
        const prompt = '  ' + t('apikey_prompt');
        process.stdout.write('\n' + prompt);
        if (process.stdin.isTTY) process.stdin.setRawMode(true);
        process.stdin.resume();
        let key = '';
        const onData = (chunk) => {
            const chars = chunk.toString();
            for (let i = 0; i < chars.length; i++) {
                const ch = chars[i];
                if (ch === '\r' || ch === '\n') {
                    process.stdout.write('\n');
                    if (process.stdin.isTTY) process.stdin.setRawMode(false);
                    process.stdin.removeListener('data', onData);
                    process.stdin.pause();
                    resolve(key.trim());
                    return;
                } else if (ch === '\x03') {
                    process.stdout.write('\n');
                    if (process.stdin.isTTY) process.stdin.setRawMode(false);
                    process.exit(0);
                } else if (ch === '\x7f' || ch === '\b') {
                    if (key.length > 0) {
                        key = key.slice(0, -1);
                        process.stdout.clearLine(0);
                        process.stdout.cursorTo(0);
                        process.stdout.write(prompt + '•'.repeat(key.length));
                    }
                } else {
                    key += ch;
                    process.stdout.write('•');
                }
            }
        };
        process.stdin.on('data', onData);
    });
}

// ═══════════════════════════════════════════════════════════════════
// ARROW KEY MENU
// ═══════════════════════════════════════════════════════════════════

function showArrowMenu(title, items) {
    return new Promise((resolve) => {
        let selectedIdx = 0;
        const hintText = '  ' + t('navigate_hint');
        const printMenu = () => {
            process.stdout.write('\x1b[?25l');
            for (let i = 0; i < items.length; i++) {
                const prefix = i === selectedIdx ? '  ❯ ' : '    ';
                process.stdout.write(prefix + items[i].label + '\n');
            }
            process.stdout.write('\n' + hintText + '\n');
        };
        const lineCount = items.length + 2;
        const clearMenu = () => {
            for (let i = 0; i < lineCount; i++) {
                process.stdout.write('\x1b[A');
                process.stdout.clearLine(0);
            }
        };
        if (title) process.stdout.write(title + '\n\n');
        printMenu();
        if (process.stdin.isTTY) process.stdin.setRawMode(true);
        process.stdin.resume();
        const onData = (chunk) => {
            const key = chunk.toString();
            if (key === '\x1b[A' || key === '\x1b[D') {
                if (selectedIdx > 0) { selectedIdx--; clearMenu(); printMenu(); }
            } else if (key === '\x1b[B' || key === '\x1b[C') {
                if (selectedIdx < items.length - 1) { selectedIdx++; clearMenu(); printMenu(); }
            } else if (key === '\r' || key === '\n') {
                process.stdin.removeListener('data', onData);
                process.stdout.write('\x1b[?25h');
                cleanupStdin();
                resolve(items[selectedIdx]);
            } else if (key === '\x03') {
                process.stdout.write('\x1b[?25h\n');
                cleanupStdin();
                process.exit(0);
            }
        };
        process.stdin.on('data', onData);
    });
}

// ═══════════════════════════════════════════════════════════════════
// FIRST LAUNCH & TIPS
// ═══════════════════════════════════════════════════════════════════

function printApiKeyPrompt() {
    process.stdout.write('\n');
    process.stdout.write('  ' + t('apikey_instruction') + '\n');
    process.stdout.write('  ' + t('apikey_supports') + '\n');
    process.stdout.write('  ' + t('apikey_auto') + '\n');
}

function printTips(themeName) {
    const color = getSystemColor(themeName || 'default');
    process.stdout.write('\n');
    process.stdout.write(color + '  ' + t('tips_header') + '\n');
    process.stdout.write('  ' + t('tips_1') + '\n');
    process.stdout.write('  ' + t('tips_2') + '\n');
    process.stdout.write('  ' + t('tips_3') + RESET + '\n');
    process.stdout.write('\n');
}

function buildHelpText(themeName) {
    const c = getSystemColor(themeName || 'default');
    return c + '\n' +
        '  ' + t('help_title') + '\n' +
        '  ' + t('help_model') + '\n' +
        '  ' + t('help_theme') + '\n' +
        '  ' + t('help_lang') + '\n' +
        '  ' + t('help_config') + '\n' +
        '  ' + t('help_help') + '\n' +
        '  ' + t('help_ctrlc') + '\n\n' +
        '  ' + t('help_file_title') + '\n' +
        '  ' + t('help_file_usage') + '\n' +
        '  ' + t('help_file_example') + '\n\n' +
        '  ' + t('help_outside_title') + '\n' +
        '  ' + t('help_logout') + '\n' + RESET;
}
// ═══════════════════════════════════════════════════════════════════
// FILE HANDLING
// ═══════════════════════════════════════════════════════════════════

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

async function resolveFilePath(filename) {
    if (path.isAbsolute(filename)) return fs.existsSync(filename) ? filename : null;
    if (filename.startsWith('~/')) {
        const hp = path.join(os.homedir(), filename.slice(2));
        return fs.existsSync(hp) ? hp : null;
    }
    const cwdPath = path.join(process.cwd(), filename);
    if (fs.existsSync(cwdPath)) return cwdPath;
    try {
        const matches = await glob('**/' + filename, { cwd: os.homedir(), maxDepth: 8, absolute: true, ignore: ['**/node_modules/**', '**/.git/**'] });
        if (matches && matches.length > 0) return matches[0];
    } catch (e) { }
    return null;
}

async function readFileForMessage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (IMAGE_EXTENSIONS.includes(ext)) {
        return { type: 'image', data: fs.readFileSync(filePath).toString('base64'), ext };
    }
    if (ext === '.pdf') {
        const pdf = require('pdf-parse');
        const result = await pdf(fs.readFileSync(filePath));
        return { type: 'text', data: result.text };
    }
    return { type: 'text', data: fs.readFileSync(filePath, 'utf-8') };
}

function getMimeType(ext) {
    const m = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };
    return m[ext] || 'image/png';
}

// ═══════════════════════════════════════════════════════════════════
// AI PROVIDERS
// ═══════════════════════════════════════════════════════════════════

const PROVIDER_DEFAULTS = {
    anthropic: { model: 'claude-sonnet-4-20250514' }, gemini: { model: 'gemini-1.5-pro' },
    openai: { model: 'gpt-4o' }, openrouter: { model: 'openai/gpt-4o' }, deepseek: { model: 'deepseek-chat' },
};

function createAIClient(config) {
    const { apiKey, provider } = config;
    if (provider === 'anthropic') return { type: 'anthropic', client: new Anthropic({ apiKey }) };
    if (provider === 'gemini') return { type: 'gemini', client: new GoogleGenerativeAI(apiKey) };
    if (provider === 'openrouter') return { type: 'openai-compat', client: new OpenAI({ apiKey, baseURL: 'https://openrouter.ai/api/v1', defaultHeaders: { 'HTTP-Referer': 'https://github.com/corex-ai', 'X-Title': 'COREX CLI' } }) };
    if (provider === 'deepseek') return { type: 'openai-compat', client: new OpenAI({ apiKey, baseURL: 'https://api.deepseek.com' }) };
    return { type: 'openai-compat', client: new OpenAI({ apiKey }) };
}

async function streamAIResponse(aiClient, config, history, userMessage, imageContent, onToken) {
    const model = config.model || PROVIDER_DEFAULTS[config.provider]?.model || 'gpt-4o';
    const maxTokens = config.maxTokens || 4096;
    const temperature = config.temperature ?? 0.7;

    if (aiClient.type === 'anthropic') {
        const msgContent = [{ type: 'text', text: userMessage }];
        if (imageContent) msgContent.push({ type: 'image', source: { type: 'base64', media_type: getMimeType(imageContent.ext), data: imageContent.data } });
        const stream = aiClient.client.messages.stream({ model, max_tokens: maxTokens, temperature, system: SYSTEM_PROMPT, messages: [...history.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: msgContent }] });
        let fullText = '';
        stream.on('text', (text) => { fullText += text; onToken(text); });
        await stream.finalMessage();
        return fullText;
    } else if (aiClient.type === 'gemini') {
        const genModel = aiClient.client.getGenerativeModel({ model });
        const chat = genModel.startChat({ history: history.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })), generationConfig: { maxOutputTokens: maxTokens, temperature } });
        const parts = [{ text: userMessage }];
        if (imageContent) parts.push({ inlineData: { mimeType: getMimeType(imageContent.ext), data: imageContent.data } });
        const result = await chat.sendMessageStream(parts);
        let fullText = '';
        for await (const chunk of result.stream) { const ct = chunk.text(); fullText += ct; onToken(ct); }
        return fullText;
    } else {
        const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...history.map(m => ({ role: m.role, content: m.content }))];
        if (imageContent) { messages.push({ role: 'user', content: [{ type: 'text', text: userMessage }, { type: 'image_url', image_url: { url: `data:${getMimeType(imageContent.ext)};base64,${imageContent.data}` } }] }); }
        else { messages.push({ role: 'user', content: userMessage }); }
        const stream = await aiClient.client.chat.completions.create({ model, messages, stream: true, temperature, max_tokens: maxTokens });
        let fullText = '';
        for await (const chunk of stream) { const c = chunk.choices[0]?.delta?.content || ''; if (c) { fullText += c; onToken(c); } }
        return fullText;
    }
}

// ═══════════════════════════════════════════════════════════════════
// SPINNER
// ═══════════════════════════════════════════════════════════════════

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

function startSpinner(themeName) {
    let frameIdx = 0;
    const color = getPromptColor(themeName || 'default');
    const interval = setInterval(() => {
        process.stdout.clearLine(0); process.stdout.cursorTo(0);
        process.stdout.write(color + '  ' + SPINNER_FRAMES[frameIdx] + ' ...' + RESET);
        frameIdx = (frameIdx + 1) % SPINNER_FRAMES.length;
    }, 80);
    return { stop() { clearInterval(interval); process.stdout.clearLine(0); process.stdout.cursorTo(0); } };
}

// ═══════════════════════════════════════════════════════════════════
// CHAT LOOP
// ═══════════════════════════════════════════════════════════════════

let chatHistory = [];
let lastResponse = '';
let currentRl = null;

function startChat(config) {
    const aiClient = createAIClient(config);
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    currentRl = rl;

    const prompt = () => {
        const pColor = getPromptColor(config.theme || 'default');
        rl.question(pColor + '> ' + RESET, async (input) => {
            const trimmed = (input || '').trim();
            if (!trimmed) { prompt(); return; }
            const cmd = trimmed.toLowerCase();

            if (cmd === '/help') { process.stdout.write(buildHelpText(config.theme) + '\n'); prompt(); return; }
            if (cmd === '/clear') { printLogo(config.theme); prompt(); return; }
            if (cmd === '/theme') { rl.close(); currentRl = null; await handleThemeCommand(config); return; }
            if (cmd === '/lang') { rl.close(); currentRl = null; await handleLangCommand(config); return; }
            if (cmd === '/config') { rl.close(); currentRl = null; await handleConfigCommand(config); return; }

            // File attachment
            let finalMessage = trimmed;
            let imageContent = null;
            if (trimmed.startsWith('@')) {
                const spaceIdx = trimmed.indexOf(' ');
                let filename, question;
                if (spaceIdx === -1) { filename = trimmed.slice(1); question = 'Describe this file.'; }
                else { filename = trimmed.slice(1, spaceIdx); question = trimmed.slice(spaceIdx + 1).trim(); }
                const filePath = await resolveFilePath(filename);
                if (!filePath) { process.stdout.write('\x1b[31m  ' + t('file_not_found') + filename + RESET + '\n'); prompt(); return; }
                try {
                    const fileResult = await readFileForMessage(filePath);
                    if (fileResult.type === 'image') { imageContent = { data: fileResult.data, ext: fileResult.ext }; finalMessage = question || 'What does this image show?'; }
                    else { finalMessage = 'File: ' + filename + '\n\n' + fileResult.data + '\n\n' + question; }
                } catch (err) { process.stdout.write('\x1b[31m  ' + t('file_read_error') + err.message + RESET + '\n'); prompt(); return; }
            }

            // Send to AI
            chatHistory.push({ role: 'user', content: finalMessage });
            const spinner = startSpinner(config.theme);
            try {
                let firstToken = true;
                const rColor = getResponseColor(config.theme);
                const fullText = await streamAIResponse(aiClient, config, chatHistory.slice(0, -1), finalMessage, imageContent, (token) => {
                    if (firstToken) { spinner.stop(); process.stdout.write('\n'); firstToken = false; }
                    process.stdout.write(rColor + token + RESET);
                });
                if (firstToken) { spinner.stop(); process.stdout.write('\n'); }
                process.stdout.write('\n\n');
                chatHistory.push({ role: 'assistant', content: fullText });
                lastResponse = fullText;
            } catch (err) {
                spinner.stop();
                const msg = err.message || '';
                if (err.status === 401 || msg.toLowerCase().includes('api key') || msg.toLowerCase().includes('unauthorized')) { process.stdout.write('\x1b[31m  ' + t('invalid_key') + RESET + '\n'); }
                else if (msg.toLowerCase().includes('enotfound') || msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) { process.stdout.write('\x1b[31m  ' + t('network_error') + RESET + '\n'); }
                else { process.stdout.write('\x1b[31m  ✗ ' + msg + RESET + '\n'); }
            }
            prompt();
        });
    };
    prompt();
}

// ═══════════════════════════════════════════════════════════════════
// THEME COMMAND
// ═══════════════════════════════════════════════════════════════════

async function handleThemeCommand(config) {
    process.stdout.write('\n');
    const activeTheme = config.theme || 'default';
    const items = THEME_KEYS.map(key => {
        const th = THEMES[key];
        const active = key === activeTheme ? ' \x1b[90m(active)\x1b[0m' : '';
        let descPart = '';
        if (key === 'spectrum') {
            descPart = ' \x1b[90m(rainbow gradient)\x1b[0m';
        } else {
            descPart = ' \x1b[90m(' + th.ansi + th.desc + '\x1b[90m — ' + th.descDetail + ')\x1b[0m';
        }
        return { id: key, label: th.swatch + ' ' + th.name.padEnd(10) + descPart + active };
    });
    const selected = await showArrowMenu('  ' + t('select_theme'), items);
    process.stdout.write('\n');
    config.theme = selected.id;
    saveConfig({ theme: selected.id });
    printLogo(selected.id);
    process.stdout.write('\x1b[32m  ' + t('theme_changed') + THEMES[selected.id].name + RESET + '\n\n');
    startChat(config);
}

// ═══════════════════════════════════════════════════════════════════
// LANG COMMAND
// ═══════════════════════════════════════════════════════════════════

async function handleLangCommand(config) {
    process.stdout.write('\n');
    const selected = await showArrowMenu('  ' + t('select_lang'), LANG_LIST);
    currentLang = selected.id;
    config.lang = selected.id;
    saveConfig({ lang: selected.id });
    process.stdout.write('\n\x1b[32m  ' + t('lang_changed') + selected.label + RESET + '\n\n');
    startChat(config);
}

// ═══════════════════════════════════════════════════════════════════
// CONFIG COMMAND
// ═══════════════════════════════════════════════════════════════════

async function handleConfigCommand(config) {
    process.stdout.write('\n');
    const items = [
        { id: 'change_key', label: t('change_api_key') },
        { id: 'change_provider', label: t('change_provider') },
        { id: 'show_config', label: t('show_current_config') },
        { id: 'cancel', label: t('cancel') },
    ];
    const selected = await showArrowMenu('', items);

    if (selected.id === 'change_key') {
        process.stdout.write('\n');
        const newKey = await askApiKey();
        if (newKey) {
            let provider = detectProvider(newKey);
            if (provider) { process.stdout.write('\x1b[32m  ' + t('detected') + PROVIDER_NAMES[provider] + RESET + '\n'); }
            else { process.stdout.write('\x1b[33m  ' + t('not_detected') + RESET + '\n\n'); const ps = await showArrowMenu('', PROVIDERS_LIST); provider = ps.id; }
            config.apiKey = newKey; config.provider = provider;
            config.model = PROVIDER_DEFAULTS[provider]?.model || 'gpt-4o';
            saveConfig({ apiKey: newKey, provider, model: config.model });
            process.stdout.write('\x1b[32m  ' + t('config_updated') + RESET + '\n\n');
        }
        cleanupStdin();
        startChat(config);
    } else if (selected.id === 'change_provider') {
        process.stdout.write('\n');
        const ps = await showArrowMenu('  ' + t('select_provider'), PROVIDERS_LIST);
        config.provider = ps.id; config.model = PROVIDER_DEFAULTS[ps.id]?.model || 'gpt-4o';
        saveConfig({ provider: ps.id, model: config.model });
        process.stdout.write('\x1b[32m  ' + t('provider_changed') + PROVIDER_NAMES[ps.id] + RESET + '\n\n');
        startChat(config);
    } else if (selected.id === 'show_config') {
        process.stdout.write('\n');
        const cur = loadConfig() || config;
        process.stdout.write('  Provider:  ' + (PROVIDER_NAMES[cur.provider] || cur.provider) + '\n');
        process.stdout.write('  Model:     ' + (cur.model || 'default') + '\n');
        process.stdout.write('  Theme:     ' + (cur.theme || 'default') + '\n');
        process.stdout.write('  Language:  ' + (cur.lang || 'en') + '\n');
        process.stdout.write('  API Key:   ' + (cur.apiKey ? cur.apiKey.slice(0, 8) + '...' : 'not set') + '\n\n');
        startChat(config);
    } else {
        process.stdout.write('\n');
        startChat(config);
    }
}

// ═══════════════════════════════════════════════════════════════════
// LOGOUT & SIGINT
// ═══════════════════════════════════════════════════════════════════

function handleLogout() {
    try { if (fs.existsSync(CONFIG_PATH)) fs.unlinkSync(CONFIG_PATH); } catch (e) { }
    process.stdout.write(t('logged_out') + '\n');
    process.exit(0);
}

process.on('SIGINT', () => {
    try { if (process.stdin.isTTY && process.stdin.isRaw) process.stdin.setRawMode(false); } catch (e) { }
    process.stdout.write('\x1b[?25h\n');
    process.exit(0);
});

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════

async function main() {
    const args = process.argv.slice(2);
    if (args[0] === 'logout') { handleLogout(); return; }

    const existingConfig = loadConfig();
    const currentTheme = existingConfig?.theme || 'default';
    currentLang = existingConfig?.lang || 'en';

    printLogo(currentTheme);

    if (!existingConfig || !existingConfig.apiKey || !existingConfig.provider) {
        printApiKeyPrompt();
        const key = await askApiKey();
        if (!key) { process.stdout.write('\x1b[31m  ' + t('no_key_provided') + RESET + '\n'); process.exit(1); }
        let provider = detectProvider(key);
        if (!provider) {
            process.stdout.write('\x1b[33m  ' + t('not_detected') + RESET + '\n\n');
            const selected = await showArrowMenu('', PROVIDERS_LIST);
            provider = selected.id;
        } else {
            process.stdout.write('\x1b[32m  ' + t('detected') + PROVIDER_NAMES[provider] + RESET + '\n\n');
        }
        const model = PROVIDER_DEFAULTS[provider]?.model || 'gpt-4o';
        saveConfig({ apiKey: key, provider, theme: 'default', model, lang: currentLang });
        cleanupStdin();
        startChat(loadConfig());
    } else {
        printTips(currentTheme);
        cleanupStdin();
        startChat(existingConfig);
    }
}

main().catch(err => {
    process.stderr.write('\x1b[31mFatal error: ' + (err.message || err) + RESET + '\n');
    process.exit(1);
});
