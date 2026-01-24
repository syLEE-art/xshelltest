/* ==========================================
   네트워크 관제 센터 v3.0 - 보안 적용 버전
   ==========================================
   - SHA-256 비밀번호 해시 검증
   - AES-256 서버 데이터 암호화
   - sessionStorage 세션 관리
   ========================================== */

// ==========================================
// 보안 설정 (Security Configuration)
// ==========================================

/**
 * 보안 상수
 * - PASSWORD_HASH: "이소영"의 SHA-256 해시값
 * - ENCRYPTED_DATA: AES-256으로 암호화된 초기 서버 데이터
 * 
 * ⚠️ 중요: 비밀번호를 모르면 소스 코드를 봐도 서버 정보를 알 수 없습니다.
 */
const SECURITY = {
    // "이소영"의 SHA-256 해시값
    PASSWORD_HASH: 'db97cb66bad0d531ab03b5e39d9626fc8d85015615a082a00bb526486a3e49cf',
    
    // AES-256으로 암호화된 초기 서버 데이터 (비밀번호: "이소영")
    // 이 데이터는 올바른 비밀번호 없이는 복호화할 수 없습니다.
    ENCRYPTED_INITIAL_DATA: 'U2FsdGVkX1+cXnPPQOVBCbWqANXwmPnRS9kp/9SGfp90OyMw/1/F3/+LiEQ0A9A8tAVXQ/v4N+Kl8Rl2QZMbT/FPo1rLF9p8T+tMdfMSMY1uONGhz3iUC4lTw0z+/XbzUraC+Xxz6S4dNhyWdrJ2fYynbaXUbgrEzJi0Y3gEwfAYpVzBKASCNdbMCOcWlYZRXHxsPmKznLcgj2rE97joHriASgywHfaJk3G0ETrz4/Tc1EGL3zl8f52trtSKNEOuqVvnjlO8HvDSD/1cX5OShgbVkeOBcDTm3ZZFrAgfIwUneObfYLgt0CaCBH1S/y5GKuSsz8IZjKxg54Lo3IXv3SzWFvtxDILbdsj5CeoMr5C3iwwhAmI1/ZJV6QInn4aRj9/KvIkNPOfhHnxrWIoWcE5d0NowPJNjUO5AOI9Ifmg5/1itS/tb/GZmAsffEGI76RxwG53akTLCXkItL8BlPk3C2CeYuOg+hfwZ0TQ+Te7bxa6vmLh0fvnX4KEG1VoE8lVepWH+KyfFnb48pOZaAVZZPooxEI2tcwHPL+1Zlvv/lWtWjlb7PvkbujspxhdO',
    
    // 세션 스토리지 키
    SESSION_KEY: 'ncc_authenticated',
    SESSION_PASSWORD_KEY: 'ncc_session_key'
};

// ==========================================
// Global Variables & Configuration
// ==========================================

const CONFIG = {
    PING_COUNT: 10,
    PING_INTERVAL: 1000,
    PING_TIMEOUT: 5000,
    GRAPH_MAX_POINTS: 20,
    GRAPH_MAX_MS: 500,
    STORAGE_KEY: 'network_control_server_groups_encrypted',
    DEFAULT_SSH_PORT: 22
};

const MESSAGES = {
    STATUS: {
        STANDBY: '대기중',
        TESTING: '확인중...',
        ONLINE: '정상',
        OFFLINE: '응답없음',
        UNSTABLE: '불안정'
    },
    STATUS_DETAIL: {
        ENTER_IP: 'IP 주소를 입력해주세요',
        PINGING: '서버 상태를 확인하는 중입니다',
        REACHABLE: '서버가 정상적으로 응답합니다',
        UNREACHABLE: '서버에서 응답이 없습니다',
        PACKET_LOSS: '일부 패킷이 손실되었습니다'
    },
    GRAPH: {
        WAITING: '대기 중...',
        SCANNING: '스캔 중...',
        CONNECTED: '연결됨',
        UNSTABLE: '불안정',
        UNREACHABLE: '연결 불가'
    },
    TOAST: {
        ENTER_IP: 'IP 주소를 입력해주세요',
        INVALID_IP: '올바른 IP 주소 형식이 아닙니다',
        TEST_RUNNING: '이미 상태 확인이 진행 중입니다',
        SSH_LAUNCHING: 'SSH 클라이언트를 실행합니다',
        SSH_ERROR: 'SSH 클라이언트 실행 실패',
        FOLDER_CREATED: '폴더가 생성되었습니다',
        FOLDER_EXISTS: '이미 존재하는 폴더 이름입니다',
        FOLDER_DELETED: '폴더가 삭제되었습니다',
        FOLDER_UPDATED: '폴더 이름이 변경되었습니다',
        FOLDER_EMPTY_NAME: '폴더 이름을 입력해주세요',
        SERVER_ADDED: '서버가 추가되었습니다',
        SERVER_DELETED: '서버가 삭제되었습니다',
        SERVER_EXISTS: '이미 등록된 서버입니다',
        SELECT_FOLDER: '폴더를 선택해주세요',
        ENTER_SERVER_NAME: '서버 이름을 입력해주세요',
        GROUP_PING_START: '폴더 내 전체 서버 상태 확인 시작',
        GROUP_PING_COMPLETE: '전체 상태 확인 완료',
        LOGIN_SUCCESS: '인증에 성공했습니다',
        LOGIN_FAILED: '비밀번호가 올바르지 않습니다',
        LOGOUT_SUCCESS: '로그아웃 되었습니다'
    }
};

let pingResults = { data: [], successful: 0, failed: 0, isRunning: false };
let graphCtx = null;
let expandedFolders = new Set();
let currentPassword = null; // 복호화에 사용할 비밀번호 (메모리에만 저장)

// ==========================================
// Security Functions (보안 함수)
// ==========================================

/**
 * SHA-256 해시 생성
 * @param {string} input - 해시할 문자열
 * @returns {string} SHA-256 해시값 (hex)
 */
function generateHash(input) {
    return CryptoJS.SHA256(input).toString();
}

/**
 * 비밀번호 검증 (SHA-256 해시 비교)
 * @param {string} password - 사용자 입력 비밀번호
 * @returns {boolean} 검증 결과
 */
function verifyPassword(password) {
    const inputHash = generateHash(password);
    return inputHash === SECURITY.PASSWORD_HASH;
}

/**
 * AES-256 복호화
 * @param {string} encryptedData - 암호화된 데이터
 * @param {string} password - 복호화 키 (비밀번호)
 * @returns {Object|null} 복호화된 객체 또는 null (실패 시)
 */
function decryptData(encryptedData, password) {
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedData, password);
        const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
        if (!decryptedString) return null;
        return JSON.parse(decryptedString);
    } catch (error) {
        console.error('복호화 실패:', error);
        return null;
    }
}

/**
 * AES-256 암호화
 * @param {Object} data - 암호화할 객체
 * @param {string} password - 암호화 키 (비밀번호)
 * @returns {string} 암호화된 문자열
 */
function encryptData(data, password) {
    return CryptoJS.AES.encrypt(JSON.stringify(data), password).toString();
}

/**
 * 로그인 시도
 */
function attemptLogin() {
    const passwordInput = document.getElementById('login-password');
    const errorDiv = document.getElementById('login-error');
    const password = passwordInput.value;
    
    if (!password) {
        errorDiv.classList.remove('hidden');
        errorDiv.textContent = '비밀번호를 입력해주세요.';
        passwordInput.focus();
        return;
    }
    
    // SHA-256 해시 검증
    if (!verifyPassword(password)) {
        errorDiv.classList.remove('hidden');
        errorDiv.textContent = '비밀번호가 올바르지 않습니다.';
        passwordInput.value = '';
        passwordInput.focus();
        return;
    }
    
    // AES-256 복호화 테스트
    const testDecrypt = decryptData(SECURITY.ENCRYPTED_INITIAL_DATA, password);
    if (!testDecrypt) {
        errorDiv.classList.remove('hidden');
        errorDiv.textContent = '데이터 복호화에 실패했습니다.';
        return;
    }
    
    // 로그인 성공
    currentPassword = password;
    
    // sessionStorage에 인증 상태 저장 (비밀번호는 저장하지 않음 - 보안)
    // 대신 암호화된 세션 토큰 생성
    const sessionToken = CryptoJS.AES.encrypt(
        JSON.stringify({ timestamp: Date.now(), hash: SECURITY.PASSWORD_HASH }),
        password
    ).toString();
    sessionStorage.setItem(SECURITY.SESSION_KEY, 'true');
    sessionStorage.setItem(SECURITY.SESSION_PASSWORD_KEY, sessionToken);
    
    // UI 전환
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-dashboard').classList.remove('hidden');
    
    // 대시보드 초기화
    initializeDashboard();
    
    showToast(MESSAGES.TOAST.LOGIN_SUCCESS, 'success');
}

/**
 * 로그아웃
 */
function logout() {
    // 세션 정보 삭제
    sessionStorage.removeItem(SECURITY.SESSION_KEY);
    sessionStorage.removeItem(SECURITY.SESSION_PASSWORD_KEY);
    currentPassword = null;
    
    // UI 전환
    document.getElementById('main-dashboard').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('login-password').value = '';
    document.getElementById('login-error').classList.add('hidden');
    
    showToast(MESSAGES.TOAST.LOGOUT_SUCCESS, 'info');
}

/**
 * 세션 확인 및 자동 로그인
 */
function checkSession() {
    const isAuthenticated = sessionStorage.getItem(SECURITY.SESSION_KEY);
    
    if (isAuthenticated === 'true') {
        // 이미 인증된 세션 - 비밀번호 재입력 요청
        // 보안상 비밀번호를 sessionStorage에 저장하지 않으므로, 
        // 페이지 새로고침 시에도 비밀번호 재입력 필요
        // (탭을 닫지 않고 새로고침하는 경우)
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('main-dashboard').classList.add('hidden');
        
        // 힌트 표시
        const hintDiv = document.getElementById('login-error');
        hintDiv.classList.remove('hidden');
        hintDiv.classList.remove('text-rose-400', 'bg-rose-500/10', 'border-rose-500/20');
        hintDiv.classList.add('text-cyan-400', 'bg-cyan-500/10', 'border-cyan-500/20');
        hintDiv.textContent = '세션이 유지되어 있습니다. 비밀번호를 다시 입력해주세요.';
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('main-dashboard').classList.add('hidden');
    }
}

/**
 * 비밀번호 표시/숨기기 토글
 */
function togglePasswordVisibility() {
    const input = document.getElementById('login-password');
    const eyeIcon = document.getElementById('eye-icon');
    
    if (input.type === 'password') {
        input.type = 'text';
        eyeIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
        `;
    } else {
        input.type = 'password';
        eyeIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
        `;
    }
}

// ==========================================
// Encrypted Data Management (암호화된 데이터 관리)
// ==========================================

/**
 * 암호화된 서버 그룹 데이터 불러오기
 * @returns {Object} 복호화된 서버 그룹 데이터
 */
function getServerGroups() {
    if (!currentPassword) return {};
    
    try {
        const encryptedData = localStorage.getItem(CONFIG.STORAGE_KEY);
        
        if (!encryptedData) {
            // 저장된 데이터가 없으면 초기 데이터 복호화하여 반환
            const initialData = decryptData(SECURITY.ENCRYPTED_INITIAL_DATA, currentPassword);
            return initialData || {};
        }
        
        // 저장된 암호화 데이터 복호화
        const decryptedData = decryptData(encryptedData, currentPassword);
        return decryptedData || {};
    } catch (error) {
        console.error('데이터 불러오기 오류:', error);
        return {};
    }
}

/**
 * 서버 그룹 데이터 암호화하여 저장
 * @param {Object} groups - 저장할 서버 그룹 데이터
 */
function saveServerGroups(groups) {
    if (!currentPassword) return;
    
    try {
        const encryptedData = encryptData(groups, currentPassword);
        localStorage.setItem(CONFIG.STORAGE_KEY, encryptedData);
    } catch (error) {
        console.error('데이터 저장 오류:', error);
        showToast('데이터 저장 중 오류가 발생했습니다', 'error');
    }
}

// ==========================================
// Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // 세션 확인
    checkSession();
    
    // 로그인 입력 필드 이벤트
    const loginInput = document.getElementById('login-password');
    if (loginInput) {
        loginInput.focus();
    }
});

/**
 * 대시보드 초기화 (로그인 성공 후)
 */
function initializeDashboard() {
    // 시간 표시 시작
    updateClock();
    setInterval(updateClock, 1000);
    
    // 그래프 캔버스 초기화
    initGraph();
    
    // 서버 그룹 로드
    loadServerGroups();
    
    // IP 입력 필드 이벤트 리스너
    const ipInput = document.getElementById('ip-address');
    if (ipInput) {
        ipInput.addEventListener('input', handleIPInput);
        ipInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') startPingTest();
        });
    }
    
    // 모달 외부 클릭 시 닫기
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });
    
    console.log('🔒 네트워크 관제 센터 v3.0 (보안 모드) 초기화 완료');
}

function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ko-KR', { 
        hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const dateStr = now.toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    
    const timeEl = document.getElementById('current-time');
    const dateEl = document.getElementById('current-date');
    if (timeEl) timeEl.textContent = timeStr;
    if (dateEl) dateEl.textContent = dateStr;
}

// ==========================================
// Server Groups UI
// ==========================================

function loadServerGroups() {
    const container = document.getElementById('server-groups-container');
    if (!container) return;
    
    const groups = getServerGroups();
    const folderNames = Object.keys(groups);
    
    if (folderNames.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12">
                <div class="w-20 h-20 mx-auto mb-4 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <svg class="w-10 h-10 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"/>
                    </svg>
                </div>
                <p class="text-white/50 font-medium">저장된 서버가 없습니다</p>
                <p class="text-white/30 text-sm mt-1">새 폴더를 만들고 서버를 추가해보세요</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = folderNames.map(folderName => {
        const servers = groups[folderName];
        const isExpanded = expandedFolders.has(folderName);
        const serverCount = servers.length;
        const onlineCount = servers.filter(s => s.status === 'online').length;
        
        return `
            <div class="folder-accordion" data-folder="${escapeHtml(folderName)}">
                <div class="folder-header ${isExpanded ? 'expanded' : ''}" onclick="toggleFolder('${escapeHtml(folderName)}')">
                    <div class="flex items-center gap-3">
                        <span class="folder-icon">${isExpanded ? '📂' : '📁'}</span>
                        <span class="folder-name font-medium">${escapeHtml(folderName)}</span>
                        <span class="folder-count text-xs text-white/50">(${serverCount}대)</span>
                        ${serverCount > 0 ? `
                            <span class="folder-status text-xs ${onlineCount === serverCount ? 'text-emerald-400' : onlineCount > 0 ? 'text-amber-400' : 'text-white/50'}">
                                ${onlineCount}/${serverCount} 정상
                            </span>
                        ` : ''}
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="event.stopPropagation(); pingFolderServers('${escapeHtml(folderName)}')" class="folder-action-btn text-amber-400 hover:bg-amber-500/10" title="전체 상태 확인">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                            </svg>
                        </button>
                        <button onclick="event.stopPropagation(); openEditFolderModal('${escapeHtml(folderName)}')" class="folder-action-btn text-cyan-400 hover:bg-cyan-500/10" title="폴더 이름 수정">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                        </button>
                        <button onclick="event.stopPropagation(); deleteFolder('${escapeHtml(folderName)}')" class="folder-action-btn text-rose-400 hover:bg-rose-500/10" title="폴더 삭제">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                        </button>
                        <svg class="w-5 h-5 text-white/50 transform transition-transform ${isExpanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                    </div>
                </div>
                <div class="folder-content ${isExpanded ? 'expanded' : ''}">
                    ${servers.length === 0 ? `
                        <div class="text-center text-white/50 text-sm py-4">이 폴더에 서버가 없습니다</div>
                    ` : `
                        <div class="server-list">
                            ${servers.map((server, index) => `
                                <div class="server-item" data-server-index="${index}">
                                    <div class="server-status-indicator ${server.status || 'unknown'}"></div>
                                    <div class="server-info">
                                        <div class="server-name">${escapeHtml(server.name)}</div>
                                        <div class="server-ip font-mono text-xs text-white/40">
                                            ${server.username ? escapeHtml(server.username) + '@' : ''}${escapeHtml(server.ip)}${server.port && server.port !== '22' ? ':' + escapeHtml(server.port) : ''}
                                        </div>
                                    </div>
                                    <div class="server-actions">
                                        <button onclick="loadServerToInput('${escapeHtml(folderName)}', ${index})" class="server-action-btn text-neon-cyan" title="선택">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                            </svg>
                                        </button>
                                        <button onclick="quickConnect('${escapeHtml(folderName)}', ${index})" class="server-action-btn text-neon-green" title="빠른 접속">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                                            </svg>
                                        </button>
                                        <button onclick="deleteServer('${escapeHtml(folderName)}', ${index})" class="server-action-btn text-neon-red" title="삭제">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;
    }).join('');
    
    updateFolderSelect();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateFolderSelect() {
    const select = document.getElementById('server-folder-select');
    if (!select) return;
    
    const groups = getServerGroups();
    const folderNames = Object.keys(groups);
    
    select.innerHTML = `
        <option value="">폴더를 선택하세요</option>
        ${folderNames.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('')}
    `;
}

// ==========================================
// Folder Management Functions
// ==========================================

function toggleFolder(folderName) {
    if (expandedFolders.has(folderName)) {
        expandedFolders.delete(folderName);
    } else {
        expandedFolders.add(folderName);
    }
    loadServerGroups();
}

function openFolderModal() {
    document.getElementById('new-folder-name').value = '';
    document.getElementById('folder-modal').classList.remove('hidden');
    document.getElementById('new-folder-name').focus();
}

function closeFolderModal() {
    document.getElementById('folder-modal').classList.add('hidden');
}

function createFolder() {
    const nameInput = document.getElementById('new-folder-name');
    const folderName = nameInput.value.trim();
    
    if (!folderName) {
        showToast(MESSAGES.TOAST.FOLDER_EMPTY_NAME, 'warning');
        nameInput.focus();
        return;
    }
    
    const groups = getServerGroups();
    
    if (groups[folderName]) {
        showToast(MESSAGES.TOAST.FOLDER_EXISTS, 'warning');
        return;
    }
    
    groups[folderName] = [];
    saveServerGroups(groups);
    
    expandedFolders.add(folderName);
    loadServerGroups();
    closeFolderModal();
    
    showToast(`"${folderName}" ${MESSAGES.TOAST.FOLDER_CREATED}`, 'success');
}

function openEditFolderModal(folderName) {
    document.getElementById('edit-folder-old-name').value = folderName;
    document.getElementById('edit-folder-new-name').value = folderName;
    document.getElementById('edit-folder-modal').classList.remove('hidden');
    document.getElementById('edit-folder-new-name').focus();
    document.getElementById('edit-folder-new-name').select();
}

function closeEditFolderModal() {
    document.getElementById('edit-folder-modal').classList.add('hidden');
}

function updateFolderName() {
    const oldName = document.getElementById('edit-folder-old-name').value;
    const newName = document.getElementById('edit-folder-new-name').value.trim();
    
    if (!newName) {
        showToast(MESSAGES.TOAST.FOLDER_EMPTY_NAME, 'warning');
        return;
    }
    
    if (oldName === newName) {
        closeEditFolderModal();
        return;
    }
    
    const groups = getServerGroups();
    
    if (groups[newName]) {
        showToast(MESSAGES.TOAST.FOLDER_EXISTS, 'warning');
        return;
    }
    
    groups[newName] = groups[oldName];
    delete groups[oldName];
    
    if (expandedFolders.has(oldName)) {
        expandedFolders.delete(oldName);
        expandedFolders.add(newName);
    }
    
    saveServerGroups(groups);
    loadServerGroups();
    closeEditFolderModal();
    
    showToast(MESSAGES.TOAST.FOLDER_UPDATED, 'success');
}

function deleteFolder(folderName) {
    const groups = getServerGroups();
    const serverCount = groups[folderName]?.length || 0;
    
    const message = serverCount > 0 
        ? `"${folderName}" 폴더와 포함된 ${serverCount}개의 서버를 모두 삭제하시겠습니까?`
        : `"${folderName}" 폴더를 삭제하시겠습니까?`;
    
    if (!confirm(message)) return;
    
    delete groups[folderName];
    expandedFolders.delete(folderName);
    
    saveServerGroups(groups);
    loadServerGroups();
    
    showToast(MESSAGES.TOAST.FOLDER_DELETED, 'info');
}

// ==========================================
// Server Management Functions
// ==========================================

function openServerModal() {
    const groups = getServerGroups();
    if (Object.keys(groups).length === 0) {
        showToast('먼저 폴더를 생성해주세요', 'warning');
        openFolderModal();
        return;
    }
    
    document.getElementById('server-folder-select').value = '';
    document.getElementById('new-server-name').value = '';
    document.getElementById('new-server-ip').value = '';
    document.getElementById('new-server-port').value = '';
    document.getElementById('new-server-user').value = '';
    
    const currentIP = document.getElementById('ip-address')?.value.trim();
    const currentPort = document.getElementById('port')?.value.trim();
    const currentUser = document.getElementById('username')?.value.trim();
    
    if (currentIP) document.getElementById('new-server-ip').value = currentIP;
    if (currentPort) document.getElementById('new-server-port').value = currentPort;
    if (currentUser) document.getElementById('new-server-user').value = currentUser;
    
    document.getElementById('server-modal').classList.remove('hidden');
    document.getElementById('server-folder-select').focus();
}

function closeServerModal() {
    document.getElementById('server-modal').classList.add('hidden');
}

function addServerToFolder() {
    const folderName = document.getElementById('server-folder-select').value;
    const serverName = document.getElementById('new-server-name').value.trim();
    const serverIP = document.getElementById('new-server-ip').value.trim();
    const serverPort = document.getElementById('new-server-port').value.trim() || '22';
    const serverUser = document.getElementById('new-server-user').value.trim();
    
    if (!folderName) {
        showToast(MESSAGES.TOAST.SELECT_FOLDER, 'warning');
        return;
    }
    if (!serverName) {
        showToast(MESSAGES.TOAST.ENTER_SERVER_NAME, 'warning');
        document.getElementById('new-server-name').focus();
        return;
    }
    if (!serverIP) {
        showToast(MESSAGES.TOAST.ENTER_IP, 'warning');
        document.getElementById('new-server-ip').focus();
        return;
    }
    if (!isValidIP(serverIP)) {
        showToast(MESSAGES.TOAST.INVALID_IP, 'warning');
        document.getElementById('new-server-ip').focus();
        return;
    }
    
    const groups = getServerGroups();
    
    const exists = groups[folderName].some(s => s.ip === serverIP && s.port === serverPort);
    if (exists) {
        showToast(MESSAGES.TOAST.SERVER_EXISTS, 'warning');
        return;
    }
    
    groups[folderName].push({
        name: serverName,
        ip: serverIP,
        port: serverPort,
        username: serverUser,
        status: 'unknown',
        addedAt: new Date().toISOString()
    });
    
    saveServerGroups(groups);
    expandedFolders.add(folderName);
    loadServerGroups();
    closeServerModal();
    
    showToast(`"${serverName}" ${MESSAGES.TOAST.SERVER_ADDED}`, 'success');
}

function deleteServer(folderName, serverIndex) {
    const groups = getServerGroups();
    const server = groups[folderName][serverIndex];
    
    if (!confirm(`"${server.name}" 서버를 삭제하시겠습니까?`)) return;
    
    groups[folderName].splice(serverIndex, 1);
    saveServerGroups(groups);
    loadServerGroups();
    
    showToast(MESSAGES.TOAST.SERVER_DELETED, 'info');
}

function loadServerToInput(folderName, serverIndex) {
    const groups = getServerGroups();
    const server = groups[folderName][serverIndex];
    
    document.getElementById('ip-address').value = server.ip;
    document.getElementById('port').value = server.port || '';
    document.getElementById('username').value = server.username || '';
    
    updateTargetDisplay(server.ip, server.username, server.port);
    
    showToast(`${server.name} 정보를 불러왔습니다`, 'info');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function quickConnect(folderName, serverIndex) {
    const groups = getServerGroups();
    const server = groups[folderName][serverIndex];
    
    let sshUri = 'ssh://';
    if (server.username) sshUri += `${encodeURIComponent(server.username)}@`;
    sshUri += server.ip;
    if (server.port && server.port !== '22') sshUri += `:${server.port}`;
    
    try {
        window.location.href = sshUri;
        showToast(`${server.name}에 ${MESSAGES.TOAST.SSH_LAUNCHING}`, 'success');
    } catch (error) {
        console.error('SSH 연결 오류:', error);
        showToast(MESSAGES.TOAST.SSH_ERROR, 'error');
    }
}

// ==========================================
// Folder Ping Functions
// ==========================================

async function pingFolderServers(folderName) {
    const groups = getServerGroups();
    const servers = groups[folderName];
    
    if (!servers || servers.length === 0) {
        showToast('확인할 서버가 없습니다', 'warning');
        return;
    }
    
    showToast(`${MESSAGES.TOAST.GROUP_PING_START} (${servers.length}대)`, 'info');
    
    servers.forEach(server => server.status = 'testing');
    saveServerGroups(groups);
    loadServerGroups();
    
    for (let i = 0; i < servers.length; i++) {
        const server = servers[i];
        const result = await performQuickPing(server.ip);
        
        server.status = result.success ? 'online' : 'offline';
        server.lastChecked = new Date().toISOString();
        server.responseTime = result.time;
        
        saveServerGroups(groups);
        loadServerGroups();
    }
    
    const onlineCount = servers.filter(s => s.status === 'online').length;
    showToast(`${MESSAGES.TOAST.GROUP_PING_COMPLETE}: ${onlineCount}/${servers.length} 정상`, 
              onlineCount === servers.length ? 'success' : 'warning');
}

async function performQuickPing(ip) {
    const startTime = performance.now();
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        await fetch(`http://${ip}`, {
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-cache',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const endTime = performance.now();
        
        return { success: true, time: Math.round(endTime - startTime) };
    } catch (error) {
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        if (error.name === 'AbortError') {
            return { success: false, time: 3000 };
        }
        
        if (responseTime < 2000) {
            return { success: true, time: responseTime };
        }
        
        return { success: false, time: responseTime };
    }
}

// ==========================================
// SSH Connection Functions
// ==========================================

function connectSSH() {
    const ip = document.getElementById('ip-address').value.trim();
    const port = document.getElementById('port').value.trim();
    const username = document.getElementById('username').value.trim();
    
    if (!ip) {
        showToast(MESSAGES.TOAST.ENTER_IP, 'error');
        document.getElementById('ip-address').focus();
        return;
    }
    
    if (!isValidIP(ip)) {
        showToast(MESSAGES.TOAST.INVALID_IP, 'error');
        document.getElementById('ip-address').focus();
        return;
    }
    
    let sshUri = 'ssh://';
    if (username) sshUri += `${encodeURIComponent(username)}@`;
    sshUri += ip;
    if (port && port !== '22') sshUri += `:${port}`;
    
    try {
        window.location.href = sshUri;
        showToast(`${ip}에 ${MESSAGES.TOAST.SSH_LAUNCHING}`, 'success');
        updateTargetDisplay(ip, username, port);
    } catch (error) {
        console.error('SSH 연결 오류:', error);
        showToast(MESSAGES.TOAST.SSH_ERROR, 'error');
    }
}

function isValidIP(ip) {
    const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const hostnamePattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
    return ipv4Pattern.test(ip) || hostnamePattern.test(ip);
}

// ==========================================
// Ping Test Functions
// ==========================================

async function startPingTest() {
    const ip = document.getElementById('ip-address').value.trim();
    
    if (!ip) {
        showToast(MESSAGES.TOAST.ENTER_IP, 'error');
        document.getElementById('ip-address').focus();
        return;
    }
    
    if (!isValidIP(ip)) {
        showToast(MESSAGES.TOAST.INVALID_IP, 'error');
        return;
    }
    
    if (pingResults.isRunning) {
        showToast(MESSAGES.TOAST.TEST_RUNNING, 'warning');
        return;
    }
    
    pingResults = { data: [], successful: 0, failed: 0, isRunning: true };
    
    setStatus('testing', MESSAGES.STATUS.TESTING, MESSAGES.STATUS_DETAIL.PINGING);
    updateTargetDisplay(ip);
    hideGraphOverlay();
    
    const pingBtn = document.getElementById('ping-btn');
    pingBtn.classList.add('btn-loading');
    pingBtn.disabled = true;
    
    document.getElementById('graph-status').textContent = MESSAGES.GRAPH.SCANNING;
    
    for (let i = 0; i < CONFIG.PING_COUNT; i++) {
        if (!pingResults.isRunning) break;
        
        const result = await performPing(ip);
        pingResults.data.push(result);
        
        if (result.success) pingResults.successful++;
        else pingResults.failed++;
        
        updateStatistics();
        drawGraph();
        
        if (i < CONFIG.PING_COUNT - 1) {
            await sleep(CONFIG.PING_INTERVAL);
        }
    }
    
    pingResults.isRunning = false;
    pingBtn.classList.remove('btn-loading');
    pingBtn.disabled = false;
    
    const successRate = (pingResults.successful / CONFIG.PING_COUNT) * 100;
    
    if (successRate >= 50) {
        setStatus('online', MESSAGES.STATUS.ONLINE, MESSAGES.STATUS_DETAIL.REACHABLE);
        document.getElementById('graph-status').textContent = MESSAGES.GRAPH.CONNECTED;
    } else if (successRate > 0) {
        setStatus('offline', MESSAGES.STATUS.UNSTABLE, MESSAGES.STATUS_DETAIL.PACKET_LOSS);
        document.getElementById('graph-status').textContent = MESSAGES.GRAPH.UNSTABLE;
    } else {
        setStatus('offline', MESSAGES.STATUS.OFFLINE, MESSAGES.STATUS_DETAIL.UNREACHABLE);
        document.getElementById('graph-status').textContent = MESSAGES.GRAPH.UNREACHABLE;
    }
    
    showToast(`상태 확인 완료: 성공률 ${successRate.toFixed(0)}%`, successRate >= 50 ? 'success' : 'error');
}

async function performPing(ip) {
    const startTime = performance.now();
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.PING_TIMEOUT);
        
        await fetch(`http://${ip}`, {
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-cache',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const endTime = performance.now();
        
        return { success: true, time: Math.round(endTime - startTime) };
    } catch (error) {
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        if (error.name === 'AbortError') {
            return { success: false, time: CONFIG.PING_TIMEOUT };
        }
        
        if (responseTime < CONFIG.PING_TIMEOUT) {
            return { success: true, time: responseTime };
        }
        
        return { success: false, time: responseTime };
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==========================================
// UI Update Functions
// ==========================================

function setStatus(status, text, detail = '') {
    const led = document.getElementById('status-led');
    const statusText = document.getElementById('status-text');
    const statusDetail = document.getElementById('status-detail');
    
    if (!led || !statusText || !statusDetail) return;
    
    led.classList.remove('status-online', 'status-offline', 'status-testing', 'status-unknown');
    led.classList.add(`status-${status}`);
    
    statusText.textContent = text;
    statusDetail.textContent = detail;
    
    statusText.classList.remove('text-emerald-400', 'text-rose-400', 'text-amber-400', 'text-white/50');
    
    switch (status) {
        case 'online': statusText.classList.add('text-emerald-400'); break;
        case 'offline': statusText.classList.add('text-rose-400'); break;
        case 'testing': statusText.classList.add('text-amber-400'); break;
        default: statusText.classList.add('text-white/50');
    }
}

function updateTargetDisplay(ip, username = '', port = '') {
    const display = document.getElementById('target-display');
    if (!display) return;
    
    let text = ip;
    if (username) text = `${username}@${text}`;
    if (port && port !== '22') text += `:${port}`;
    display.textContent = text;
}

function updateStatistics() {
    const total = pingResults.data.length;
    const successful = pingResults.successful;
    const successRate = total > 0 ? (successful / total) * 100 : 0;
    
    const successfulTimes = pingResults.data.filter(r => r.success).map(r => r.time);
    
    const avg = successfulTimes.length > 0 
        ? Math.round(successfulTimes.reduce((a, b) => a + b, 0) / successfulTimes.length) : '--';
    const min = successfulTimes.length > 0 ? Math.min(...successfulTimes) : '--';
    const max = successfulTimes.length > 0 ? Math.max(...successfulTimes) : '--';
    
    const reqEl = document.getElementById('stat-requests');
    const successEl = document.getElementById('stat-success');
    const avgEl = document.getElementById('stat-avg');
    const minEl = document.getElementById('stat-min');
    const maxEl = document.getElementById('stat-max');
    
    if (reqEl) reqEl.textContent = total;
    if (successEl) successEl.textContent = `${successRate.toFixed(0)}%`;
    if (avgEl) avgEl.textContent = typeof avg === 'number' ? `${avg} ms` : avg;
    if (minEl) minEl.textContent = typeof min === 'number' ? `${min} ms` : min;
    if (maxEl) maxEl.textContent = typeof max === 'number' ? `${max} ms` : max;
    
    if (successEl) {
        successEl.classList.remove('text-emerald-400', 'text-amber-400', 'text-rose-400');
        if (successRate >= 80) successEl.classList.add('text-emerald-400');
        else if (successRate >= 50) successEl.classList.add('text-amber-400');
        else successEl.classList.add('text-rose-400');
    }
}

function handleIPInput(e) {
    const ip = e.target.value.trim();
    if (ip && isValidIP(ip)) {
        updateTargetDisplay(ip);
    } else {
        const display = document.getElementById('target-display');
        if (display) display.textContent = '---.---.---.---';
    }
}

// ==========================================
// Graph Functions
// ==========================================

function initGraph() {
    const canvas = document.getElementById('response-graph');
    if (!canvas) return;
    
    graphCtx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    const canvas = document.getElementById('response-graph');
    if (!canvas || !graphCtx) return;
    
    const container = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = container.clientWidth * dpr;
    canvas.height = container.clientHeight * dpr;
    canvas.style.width = `${container.clientWidth}px`;
    canvas.style.height = `${container.clientHeight}px`;
    graphCtx.scale(dpr, dpr);
    
    if (pingResults.data.length > 0) drawGraph();
}

function drawGraph() {
    const canvas = document.getElementById('response-graph');
    if (!canvas || !graphCtx) return;
    
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    
    const padding = { top: 20, right: 20, bottom: 20, left: 50 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;
    
    graphCtx.clearRect(0, 0, width, height);
    
    const data = pingResults.data.slice(-CONFIG.GRAPH_MAX_POINTS);
    if (data.length === 0) return;
    
    const successfulTimes = data.filter(r => r.success).map(r => r.time);
    const avgTime = successfulTimes.length > 0
        ? successfulTimes.reduce((a, b) => a + b, 0) / successfulTimes.length : 0;
    
    if (avgTime > 0) {
        const avgY = padding.top + graphHeight - (avgTime / CONFIG.GRAPH_MAX_MS) * graphHeight;
        graphCtx.beginPath();
        graphCtx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
        graphCtx.lineWidth = 1;
        graphCtx.setLineDash([5, 5]);
        graphCtx.moveTo(padding.left, avgY);
        graphCtx.lineTo(width - padding.right, avgY);
        graphCtx.stroke();
        graphCtx.setLineDash([]);
    }
    
    const pointSpacing = graphWidth / (CONFIG.GRAPH_MAX_POINTS - 1);
    
    const gradient = graphCtx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(34, 211, 238, 0.3)');
    gradient.addColorStop(1, 'rgba(34, 211, 238, 0)');
    
    graphCtx.beginPath();
    
    data.forEach((point, index) => {
        const x = padding.left + (index * pointSpacing);
        const normalizedTime = Math.min(point.time, CONFIG.GRAPH_MAX_MS);
        const y = padding.top + graphHeight - (normalizedTime / CONFIG.GRAPH_MAX_MS) * graphHeight;
        
        if (index === 0) graphCtx.moveTo(x, y);
        else graphCtx.lineTo(x, y);
    });
    
    graphCtx.strokeStyle = '#22d3ee';
    graphCtx.lineWidth = 2;
    graphCtx.stroke();
    
    const lastX = padding.left + ((data.length - 1) * pointSpacing);
    graphCtx.lineTo(lastX, height - padding.bottom);
    graphCtx.lineTo(padding.left, height - padding.bottom);
    graphCtx.closePath();
    graphCtx.fillStyle = gradient;
    graphCtx.fill();
    
    data.forEach((point, index) => {
        const x = padding.left + (index * pointSpacing);
        const normalizedTime = Math.min(point.time, CONFIG.GRAPH_MAX_MS);
        const y = padding.top + graphHeight - (normalizedTime / CONFIG.GRAPH_MAX_MS) * graphHeight;
        
        graphCtx.beginPath();
        graphCtx.arc(x, y, 4, 0, Math.PI * 2);
        graphCtx.fillStyle = point.success ? '#22d3ee' : '#fb7185';
        graphCtx.fill();
        
        graphCtx.beginPath();
        graphCtx.arc(x, y, 6, 0, Math.PI * 2);
        graphCtx.fillStyle = point.success ? 'rgba(34, 211, 238, 0.3)' : 'rgba(251, 113, 133, 0.3)';
        graphCtx.fill();
    });
}

function hideGraphOverlay() {
    const overlay = document.getElementById('graph-overlay');
    if (overlay) overlay.style.display = 'none';
}

// ==========================================
// Toast Notification Functions
// ==========================================

function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="text-lg">${icons[type]}</span>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slide-in 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ==========================================
// Debug Function
// ==========================================

function debugInfo() {
    console.group('🔒 네트워크 관제 센터 v3.0 디버그 정보');
    console.log('인증 상태:', sessionStorage.getItem(SECURITY.SESSION_KEY));
    console.log('비밀번호 설정됨:', !!currentPassword);
    console.log('상태 확인 결과:', pingResults);
    console.log('서버 그룹 (복호화됨):', getServerGroups());
    console.log('펼쳐진 폴더:', [...expandedFolders]);
    console.groupEnd();
}

window.debugInfo = debugInfo;
