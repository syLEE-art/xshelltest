/* ==========================================
   네트워크 관제 센터 - JavaScript (v2.0)
   ==========================================
   - 원격 접속 (SSH Protocol Handler)
   - 상태 확인 (HTTP Fetch 기반)
   - 응답 시간 그래프 시각화
   - 폴더(그룹) 기반 서버 관리 기능
   ========================================== */

// ==========================================
// Global Variables & Configuration
// ==========================================

const CONFIG = {
    PING_COUNT: 10,
    PING_INTERVAL: 1000,
    PING_TIMEOUT: 5000,
    GRAPH_MAX_POINTS: 20,
    GRAPH_MAX_MS: 500,
    STORAGE_KEY: 'network_control_server_groups',
    DEFAULT_SSH_PORT: 22
};

/**
 * 한국어 메시지 상수
 */
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
        SSH_ERROR: 'SSH 클라이언트 실행 실패. Xshell 설치 여부를 확인해주세요.',
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
        GROUP_PING_COMPLETE: '전체 상태 확인 완료'
    }
};

/**
 * 상태 확인 결과 저장
 */
let pingResults = {
    data: [],
    successful: 0,
    failed: 0,
    isRunning: false
};

/**
 * 그래프 캔버스 컨텍스트
 */
let graphCtx = null;

/**
 * 현재 펼쳐진 폴더 상태 저장
 */
let expandedFolders = new Set();

// ==========================================
// Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    updateClock();
    setInterval(updateClock, 1000);
    initGraph();
    loadServerGroups();
    
    const ipInput = document.getElementById('ip-address');
    ipInput.addEventListener('input', handleIPInput);
    ipInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') startPingTest();
    });
    
    // 모달 외부 클릭 시 닫기
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });
    
    console.log('🚀 네트워크 관제 센터 v2.0 초기화 완료');
});

function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ko-KR', { 
        hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const dateStr = now.toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    document.getElementById('current-time').textContent = timeStr;
    document.getElementById('current-date').textContent = dateStr;
}

// ==========================================
// Server Groups Data Management
// ==========================================

/**
 * 서버 그룹 데이터 구조
 * {
 *   "폴더명1": [
 *     { name: "서버1", ip: "1.1.1.1", port: "22", username: "root", status: "unknown" },
 *     ...
 *   ],
 *   "폴더명2": [...],
 *   ...
 * }
 */

/**
 * 로컬 스토리지에서 서버 그룹 불러오기
 */
function getServerGroups() {
    try {
        const data = localStorage.getItem(CONFIG.STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    } catch (error) {
        console.error('서버 그룹 불러오기 오류:', error);
        return {};
    }
}

/**
 * 로컬 스토리지에 서버 그룹 저장
 */
function saveServerGroups(groups) {
    try {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(groups));
    } catch (error) {
        console.error('서버 그룹 저장 오류:', error);
        showToast('데이터 저장 중 오류가 발생했습니다', 'error');
    }
}

/**
 * 서버 그룹 UI 렌더링
 */
function loadServerGroups() {
    const container = document.getElementById('server-groups-container');
    const groups = getServerGroups();
    const folderNames = Object.keys(groups);
    
    if (folderNames.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-600 text-sm py-8">
                <div class="text-4xl mb-2 opacity-30">📁</div>
                <p>저장된 서버가 없습니다</p>
                <p class="text-xs mt-1">새 폴더를 만들고 서버를 추가해보세요</p>
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
                <!-- 폴더 헤더 -->
                <div class="folder-header ${isExpanded ? 'expanded' : ''}" onclick="toggleFolder('${escapeHtml(folderName)}')">
                    <div class="flex items-center gap-3">
                        <span class="folder-icon">${isExpanded ? '📂' : '📁'}</span>
                        <span class="folder-name font-medium">${escapeHtml(folderName)}</span>
                        <span class="folder-count text-xs text-gray-500">(${serverCount}대)</span>
                        ${serverCount > 0 ? `
                            <span class="folder-status text-xs ${onlineCount === serverCount ? 'text-neon-green' : onlineCount > 0 ? 'text-neon-orange' : 'text-gray-500'}">
                                ${onlineCount}/${serverCount} 정상
                            </span>
                        ` : ''}
                    </div>
                    <div class="flex items-center gap-2">
                        <!-- 폴더 전체 상태 확인 버튼 -->
                        <button 
                            onclick="event.stopPropagation(); pingFolderServers('${escapeHtml(folderName)}')"
                            class="folder-action-btn text-neon-orange hover:bg-neon-orange/10"
                            title="전체 상태 확인"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                            </svg>
                        </button>
                        <!-- 폴더 이름 수정 버튼 -->
                        <button 
                            onclick="event.stopPropagation(); openEditFolderModal('${escapeHtml(folderName)}')"
                            class="folder-action-btn text-neon-cyan hover:bg-neon-cyan/10"
                            title="폴더 이름 수정"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                        </button>
                        <!-- 폴더 삭제 버튼 -->
                        <button 
                            onclick="event.stopPropagation(); deleteFolder('${escapeHtml(folderName)}')"
                            class="folder-action-btn text-neon-red hover:bg-neon-red/10"
                            title="폴더 삭제"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                        </button>
                        <!-- 펼침/접힘 아이콘 -->
                        <svg class="w-5 h-5 text-gray-500 transform transition-transform ${isExpanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                    </div>
                </div>
                
                <!-- 서버 목록 (아코디언 내용) -->
                <div class="folder-content ${isExpanded ? 'expanded' : ''}">
                    ${servers.length === 0 ? `
                        <div class="text-center text-gray-600 text-sm py-4">
                            이 폴더에 서버가 없습니다
                        </div>
                    ` : `
                        <div class="server-list">
                            ${servers.map((server, index) => `
                                <div class="server-item" data-server-index="${index}">
                                    <div class="server-status-indicator ${server.status || 'unknown'}"></div>
                                    <div class="server-info">
                                        <div class="server-name">${escapeHtml(server.name)}</div>
                                        <div class="server-ip font-mono text-xs text-gray-500">
                                            ${server.username ? escapeHtml(server.username) + '@' : ''}${escapeHtml(server.ip)}${server.port && server.port !== '22' ? ':' + escapeHtml(server.port) : ''}
                                        </div>
                                    </div>
                                    <div class="server-actions">
                                        <!-- 서버 선택 (입력창에 불러오기) -->
                                        <button 
                                            onclick="loadServerToInput('${escapeHtml(folderName)}', ${index})"
                                            class="server-action-btn text-neon-cyan"
                                            title="선택"
                                        >
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                            </svg>
                                        </button>
                                        <!-- 빠른 접속 -->
                                        <button 
                                            onclick="quickConnect('${escapeHtml(folderName)}', ${index})"
                                            class="server-action-btn text-neon-green"
                                            title="빠른 접속"
                                        >
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                                            </svg>
                                        </button>
                                        <!-- 서버 삭제 -->
                                        <button 
                                            onclick="deleteServer('${escapeHtml(folderName)}', ${index})"
                                            class="server-action-btn text-neon-red"
                                            title="삭제"
                                        >
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
    
    // 서버 추가 모달의 폴더 선택 옵션 업데이트
    updateFolderSelect();
}

/**
 * HTML 이스케이프 처리
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 폴더 선택 드롭다운 업데이트
 */
function updateFolderSelect() {
    const select = document.getElementById('server-folder-select');
    if (!select) return;
    
    const groups = getServerGroups();
    const folderNames = Object.keys(groups);
    
    select.innerHTML = `
        <option value="">폴더를 선택하세요</option>
        ${folderNames.map(name => `
            <option value="${escapeHtml(name)}">${escapeHtml(name)}</option>
        `).join('')}
    `;
}

// ==========================================
// Folder Management Functions
// ==========================================

/**
 * 폴더 토글 (아코디언)
 */
function toggleFolder(folderName) {
    if (expandedFolders.has(folderName)) {
        expandedFolders.delete(folderName);
    } else {
        expandedFolders.add(folderName);
    }
    loadServerGroups();
}

/**
 * 새 폴더 생성 모달 열기
 */
function openFolderModal() {
    document.getElementById('new-folder-name').value = '';
    document.getElementById('folder-modal').classList.remove('hidden');
    document.getElementById('new-folder-name').focus();
}

/**
 * 새 폴더 생성 모달 닫기
 */
function closeFolderModal() {
    document.getElementById('folder-modal').classList.add('hidden');
}

/**
 * 새 폴더 생성
 */
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

/**
 * 폴더 이름 수정 모달 열기
 */
function openEditFolderModal(folderName) {
    document.getElementById('edit-folder-old-name').value = folderName;
    document.getElementById('edit-folder-new-name').value = folderName;
    document.getElementById('edit-folder-modal').classList.remove('hidden');
    document.getElementById('edit-folder-new-name').focus();
    document.getElementById('edit-folder-new-name').select();
}

/**
 * 폴더 이름 수정 모달 닫기
 */
function closeEditFolderModal() {
    document.getElementById('edit-folder-modal').classList.add('hidden');
}

/**
 * 폴더 이름 업데이트
 */
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
    
    // 폴더 이름 변경
    groups[newName] = groups[oldName];
    delete groups[oldName];
    
    // 펼침 상태도 업데이트
    if (expandedFolders.has(oldName)) {
        expandedFolders.delete(oldName);
        expandedFolders.add(newName);
    }
    
    saveServerGroups(groups);
    loadServerGroups();
    closeEditFolderModal();
    
    showToast(MESSAGES.TOAST.FOLDER_UPDATED, 'success');
}

/**
 * 폴더 삭제
 */
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

/**
 * 서버 추가 모달 열기
 */
function openServerModal() {
    const groups = getServerGroups();
    if (Object.keys(groups).length === 0) {
        showToast('먼저 폴더를 생성해주세요', 'warning');
        openFolderModal();
        return;
    }
    
    // 입력 필드 초기화
    document.getElementById('server-folder-select').value = '';
    document.getElementById('new-server-name').value = '';
    document.getElementById('new-server-ip').value = '';
    document.getElementById('new-server-port').value = '';
    document.getElementById('new-server-user').value = '';
    
    // 현재 입력창의 값 가져오기
    const currentIP = document.getElementById('ip-address').value.trim();
    const currentPort = document.getElementById('port').value.trim();
    const currentUser = document.getElementById('username').value.trim();
    
    if (currentIP) {
        document.getElementById('new-server-ip').value = currentIP;
    }
    if (currentPort) {
        document.getElementById('new-server-port').value = currentPort;
    }
    if (currentUser) {
        document.getElementById('new-server-user').value = currentUser;
    }
    
    document.getElementById('server-modal').classList.remove('hidden');
    document.getElementById('server-folder-select').focus();
}

/**
 * 서버 추가 모달 닫기
 */
function closeServerModal() {
    document.getElementById('server-modal').classList.add('hidden');
}

/**
 * 폴더에 서버 추가
 */
function addServerToFolder() {
    const folderName = document.getElementById('server-folder-select').value;
    const serverName = document.getElementById('new-server-name').value.trim();
    const serverIP = document.getElementById('new-server-ip').value.trim();
    const serverPort = document.getElementById('new-server-port').value.trim() || '22';
    const serverUser = document.getElementById('new-server-user').value.trim();
    
    // 유효성 검사
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
    
    // 중복 체크
    const exists = groups[folderName].some(s => s.ip === serverIP && s.port === serverPort);
    if (exists) {
        showToast(MESSAGES.TOAST.SERVER_EXISTS, 'warning');
        return;
    }
    
    // 서버 추가
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

/**
 * 서버 삭제
 */
function deleteServer(folderName, serverIndex) {
    const groups = getServerGroups();
    const server = groups[folderName][serverIndex];
    
    if (!confirm(`"${server.name}" 서버를 삭제하시겠습니까?`)) return;
    
    groups[folderName].splice(serverIndex, 1);
    saveServerGroups(groups);
    loadServerGroups();
    
    showToast(MESSAGES.TOAST.SERVER_DELETED, 'info');
}

/**
 * 서버 정보를 입력창에 불러오기
 */
function loadServerToInput(folderName, serverIndex) {
    const groups = getServerGroups();
    const server = groups[folderName][serverIndex];
    
    document.getElementById('ip-address').value = server.ip;
    document.getElementById('port').value = server.port || '';
    document.getElementById('username').value = server.username || '';
    
    updateTargetDisplay(server.ip, server.username, server.port);
    
    showToast(`${server.name} 정보를 불러왔습니다`, 'info');
    
    // 스크롤을 상단으로
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * 빠른 SSH 접속
 */
function quickConnect(folderName, serverIndex) {
    const groups = getServerGroups();
    const server = groups[folderName][serverIndex];
    
    // SSH URI 구성
    let sshUri = 'ssh://';
    if (server.username) {
        sshUri += `${encodeURIComponent(server.username)}@`;
    }
    sshUri += server.ip;
    if (server.port && server.port !== '22') {
        sshUri += `:${server.port}`;
    }
    
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

/**
 * 폴더 내 전체 서버 상태 확인
 */
async function pingFolderServers(folderName) {
    const groups = getServerGroups();
    const servers = groups[folderName];
    
    if (!servers || servers.length === 0) {
        showToast('확인할 서버가 없습니다', 'warning');
        return;
    }
    
    showToast(`${MESSAGES.TOAST.GROUP_PING_START} (${servers.length}대)`, 'info');
    
    // 모든 서버 상태를 'testing'으로 변경
    servers.forEach(server => server.status = 'testing');
    saveServerGroups(groups);
    loadServerGroups();
    
    // 각 서버에 대해 Ping 테스트
    for (let i = 0; i < servers.length; i++) {
        const server = servers[i];
        const result = await performQuickPing(server.ip);
        
        server.status = result.success ? 'online' : 'offline';
        server.lastChecked = new Date().toISOString();
        server.responseTime = result.time;
        
        // 실시간 업데이트
        saveServerGroups(groups);
        loadServerGroups();
    }
    
    // 결과 요약
    const onlineCount = servers.filter(s => s.status === 'online').length;
    showToast(`${MESSAGES.TOAST.GROUP_PING_COMPLETE}: ${onlineCount}/${servers.length} 정상`, 
              onlineCount === servers.length ? 'success' : 'warning');
}

/**
 * 빠른 Ping 테스트 (단일 요청)
 */
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
        
        // CORS 에러지만 빠르게 응답했다면 서버가 있다고 판단
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
    if (username) {
        sshUri += `${encodeURIComponent(username)}@`;
    }
    sshUri += ip;
    if (port && port !== '22') {
        sshUri += `:${port}`;
    }
    
    console.log(`🔗 SSH 연결 시도: ${sshUri}`);
    
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
    
    showToast(`상태 확인 완료: 성공률 ${successRate.toFixed(0)}%`, 
              successRate >= 50 ? 'success' : 'error');
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
    
    led.classList.remove('status-online', 'status-offline', 'status-testing', 'status-unknown');
    led.classList.add(`status-${status}`);
    
    statusText.textContent = text;
    statusDetail.textContent = detail;
    
    statusText.classList.remove('text-neon-green', 'text-neon-red', 'text-neon-orange', 'text-gray-500');
    
    switch (status) {
        case 'online': statusText.classList.add('text-neon-green'); break;
        case 'offline': statusText.classList.add('text-neon-red'); break;
        case 'testing': statusText.classList.add('text-neon-orange'); break;
        default: statusText.classList.add('text-gray-500');
    }
}

function updateTargetDisplay(ip, username = '', port = '') {
    const display = document.getElementById('target-display');
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
    
    document.getElementById('stat-requests').textContent = total;
    document.getElementById('stat-success').textContent = `${successRate.toFixed(0)}%`;
    document.getElementById('stat-avg').textContent = typeof avg === 'number' ? `${avg} ms` : avg;
    document.getElementById('stat-min').textContent = typeof min === 'number' ? `${min} ms` : min;
    document.getElementById('stat-max').textContent = typeof max === 'number' ? `${max} ms` : max;
    
    const successEl = document.getElementById('stat-success');
    successEl.classList.remove('text-neon-green', 'text-neon-orange', 'text-neon-red');
    
    if (successRate >= 80) successEl.classList.add('text-neon-green');
    else if (successRate >= 50) successEl.classList.add('text-neon-orange');
    else successEl.classList.add('text-neon-red');
}

function handleIPInput(e) {
    const ip = e.target.value.trim();
    if (ip && isValidIP(ip)) {
        updateTargetDisplay(ip);
    } else {
        document.getElementById('target-display').textContent = '---.---.---.---';
    }
}

// ==========================================
// Graph Functions
// ==========================================

function initGraph() {
    const canvas = document.getElementById('response-graph');
    graphCtx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    const canvas = document.getElementById('response-graph');
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
        graphCtx.strokeStyle = 'rgba(255, 136, 0, 0.3)';
        graphCtx.lineWidth = 1;
        graphCtx.setLineDash([5, 5]);
        graphCtx.moveTo(padding.left, avgY);
        graphCtx.lineTo(width - padding.right, avgY);
        graphCtx.stroke();
        graphCtx.setLineDash([]);
    }
    
    const pointSpacing = graphWidth / (CONFIG.GRAPH_MAX_POINTS - 1);
    
    const gradient = graphCtx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(0, 245, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 245, 255, 0)');
    
    graphCtx.beginPath();
    
    data.forEach((point, index) => {
        const x = padding.left + (index * pointSpacing);
        const normalizedTime = Math.min(point.time, CONFIG.GRAPH_MAX_MS);
        const y = padding.top + graphHeight - (normalizedTime / CONFIG.GRAPH_MAX_MS) * graphHeight;
        
        if (index === 0) graphCtx.moveTo(x, y);
        else graphCtx.lineTo(x, y);
    });
    
    graphCtx.strokeStyle = '#00f5ff';
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
        graphCtx.fillStyle = point.success ? '#00f5ff' : '#ff0055';
        graphCtx.fill();
        
        graphCtx.beginPath();
        graphCtx.arc(x, y, 6, 0, Math.PI * 2);
        graphCtx.fillStyle = point.success ? 'rgba(0, 245, 255, 0.3)' : 'rgba(255, 0, 85, 0.3)';
        graphCtx.fill();
    });
}

function hideGraphOverlay() {
    document.getElementById('graph-overlay').style.display = 'none';
}

// ==========================================
// Toast Notification Functions
// ==========================================

function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
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
    console.group('🔧 네트워크 관제 센터 v2.0 디버그 정보');
    console.log('상태 확인 결과:', pingResults);
    console.log('서버 그룹:', getServerGroups());
    console.log('펼쳐진 폴더:', [...expandedFolders]);
    console.log('설정값:', CONFIG);
    console.groupEnd();
}

window.debugInfo = debugInfo;
