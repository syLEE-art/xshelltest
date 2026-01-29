/* ==========================================
   네트워크 관제 센터 v4.1 - Nord Theme
   ==========================================
   - 눈이 편한 Nord 색상 팔레트
   - 폴더 그룹화 + 서버 메모 기능
   - Xshell 통합 등록
   ========================================== */

// ==========================================
// Nord Color Constants (for Canvas)
// ==========================================
const NORD_COLORS = {
    frost2: '#88C0D0',      // 메인 강조 (시안)
    frost3: '#81A1C1',      // 블루
    auroraGreen: '#A3BE8C', // 온라인/성공
    auroraRed: '#BF616A',   // 오프라인/에러
    auroraYellow: '#EBCB8B',// 테스트/경고
    nord3: '#4C566A',       // 테두리/보조
    nord4: '#D8DEE9',       // 텍스트
    nord6: '#ECEFF4'        // 밝은 텍스트
};

// ==========================================
// Configuration
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
        SERVER_UPDATED: '서버 정보가 수정되었습니다',
        SERVER_EXISTS: '이미 등록된 서버입니다',
        SELECT_FOLDER: '폴더를 선택해주세요',
        ENTER_SERVER_NAME: '서버 이름을 입력해주세요',
        GROUP_PING_START: '폴더 내 전체 서버 상태 확인 시작',
        GROUP_PING_COMPLETE: '전체 상태 확인 완료',
        XSHELL_BATCH_DOWNLOADED: 'Xshell 통합 설정 파일이 다운로드되었습니다'
    }
};

// 초기 샘플 데이터
const INITIAL_DATA = {
    "개발 서버": [
        { name: "웹서버 #1", ip: "192.168.1.10", port: "22", username: "admin", status: "unknown", description: "개발용 웹 서버" },
        { name: "DB서버", ip: "192.168.1.20", port: "3306", username: "root", status: "unknown", description: "MySQL 데이터베이스" }
    ],
    "운영 서버": [
        { name: "메인 서버", ip: "10.0.0.1", port: "22", username: "operator", status: "unknown", description: "프로덕션 메인 서버" },
        { name: "백업 서버", ip: "10.0.0.2", port: "22", username: "backup", status: "unknown", description: "DR 백업 서버" }
    ]
};

let pingResults = { data: [], successful: 0, failed: 0, isRunning: false };
let graphCtx = null;
let expandedFolders = new Set();

// ==========================================
// Data Management
// ==========================================

function getServerGroups() {
    try {
        const data = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (!data) {
            saveServerGroups(INITIAL_DATA);
            return INITIAL_DATA;
        }
        return JSON.parse(data);
    } catch (error) {
        console.error('데이터 불러오기 오류:', error);
        return {};
    }
}

function saveServerGroups(groups) {
    try {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(groups));
    } catch (error) {
        console.error('데이터 저장 오류:', error);
        showToast('데이터 저장 중 오류가 발생했습니다', 'error');
    }
}

// ==========================================
// Xshell 통합 설정 등록 (배치 파일)
// ==========================================

function downloadXshellBatch() {
    const batchContent = `@echo off
chcp 65001 >nul
title Xshell SSH 프로토콜 핸들러 통합 등록

echo ============================================
echo   Xshell SSH 프로토콜 핸들러 통합 등록
echo   (모든 버전 자동 탐색)
echo ============================================
echo.

set "target="

:: Program Files 및 (x86) 폴더에서 Xshell* 패턴으로 모든 버전을 검색
for /d %%D in ("C:\\Program Files\\NetSarang\\Xshell*") do (
    if exist "%%D\\Xshell.exe" (
        set "target=%%D\\Xshell.exe"
        echo [발견] %%D\\Xshell.exe
    )
)

for /d %%D in ("C:\\Program Files (x86)\\NetSarang\\Xshell*") do (
    if exist "%%D\\Xshell.exe" (
        set "target=%%D\\Xshell.exe"
        echo [발견] %%D\\Xshell.exe
    )
)

if not defined target (
    echo.
    echo [오류] Xshell 설치 경로를 찾을 수 없습니다.
    echo        Xshell이 설치되어 있는지 확인해주세요.
    echo.
    pause
    exit /b 1
)

echo.
echo [선택된 경로] %target%
echo.
echo 레지스트리에 SSH 프로토콜 핸들러를 등록합니다...
echo.

:: SSH 프로토콜 핸들러 등록
reg add "HKEY_CLASSES_ROOT\\ssh" /ve /t REG_SZ /d "URL:SSH Protocol" /f >nul 2>&1
reg add "HKEY_CLASSES_ROOT\\ssh" /v "URL Protocol" /t REG_SZ /d "" /f >nul 2>&1
reg add "HKEY_CLASSES_ROOT\\ssh\\DefaultIcon" /ve /t REG_SZ /d "\\"%target%\\",0" /f >nul 2>&1
reg add "HKEY_CLASSES_ROOT\\ssh\\shell" /ve /t REG_SZ /d "" /f >nul 2>&1
reg add "HKEY_CLASSES_ROOT\\ssh\\shell\\open" /ve /t REG_SZ /d "" /f >nul 2>&1
reg add "HKEY_CLASSES_ROOT\\ssh\\shell\\open\\command" /ve /t REG_SZ /d "\\"%target%\\" -url \\"%%1\\"" /f >nul 2>&1

if %errorlevel% equ 0 (
    echo ============================================
    echo   등록이 완료되었습니다!
    echo ============================================
    echo.
    echo   이제 ssh:// 링크를 클릭하면
    echo   Xshell이 자동으로 실행됩니다.
    echo.
) else (
    echo.
    echo [오류] 레지스트리 등록에 실패했습니다.
    echo        관리자 권한으로 다시 실행해주세요.
    echo.
)

pause
`;

    const blob = new Blob([batchContent], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'xshell_ssh_register.bat';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast(MESSAGES.TOAST.XSHELL_BATCH_DOWNLOADED, 'success');
}

// ==========================================
// Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
});

function initializeDashboard() {
    updateClock();
    setInterval(updateClock, 1000);
    
    initGraph();
    loadServerGroups();
    
    const ipInput = document.getElementById('ip-address');
    if (ipInput) {
        ipInput.addEventListener('input', handleIPInput);
        ipInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') startPingTest();
        });
    }
    
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });
    
    console.log('🌐 네트워크 관제 센터 v4.1 (Nord Theme) 초기화 완료');
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
            <div style="text-align: center; padding: 3rem 1rem;">
                <div style="width: 64px; height: 64px; margin: 0 auto 1rem; background-color: var(--nord2); border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center;">
                    <svg style="width: 32px; height: 32px; color: var(--nord3);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"/>
                    </svg>
                </div>
                <p style="color: var(--nord4); font-weight: 500;">저장된 서버가 없습니다</p>
                <p style="color: var(--nord3); font-size: 0.875rem; margin-top: 0.25rem;">새 폴더를 만들고 서버를 추가해보세요</p>
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
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <span class="folder-icon">${isExpanded ? '📂' : '📁'}</span>
                        <span class="folder-name">${escapeHtml(folderName)}</span>
                        <span class="folder-count">(${serverCount}대)</span>
                        ${serverCount > 0 ? `
                            <span class="folder-status" style="color: ${onlineCount === serverCount ? 'var(--aurora-green)' : onlineCount > 0 ? 'var(--aurora-yellow)' : 'var(--nord3)'};">
                                ${onlineCount}/${serverCount} 정상
                            </span>
                        ` : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.25rem;">
                        <button onclick="event.stopPropagation(); pingFolderServers('${escapeHtml(folderName)}')" class="folder-action-btn text-amber-400" title="전체 상태 확인">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                            </svg>
                        </button>
                        <button onclick="event.stopPropagation(); openEditFolderModal('${escapeHtml(folderName)}')" class="folder-action-btn text-cyan-400" title="폴더 이름 수정">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                        </button>
                        <button onclick="event.stopPropagation(); deleteFolder('${escapeHtml(folderName)}')" class="folder-action-btn text-rose-400" title="폴더 삭제">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                        </button>
                        <svg style="width: 20px; height: 20px; color: var(--nord3); transform: ${isExpanded ? 'rotate(180deg)' : 'rotate(0)'}; transition: transform 0.2s;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                    </div>
                </div>
                <div class="folder-content ${isExpanded ? 'expanded' : ''}">
                    ${servers.length === 0 ? `
                        <div style="text-align: center; color: var(--nord3); font-size: 0.875rem; padding: 1rem;">이 폴더에 서버가 없습니다</div>
                    ` : `
                        <div class="server-list">
                            ${servers.map((server, index) => `
                                <div class="server-item" data-server-index="${index}">
                                    <div class="server-status-indicator ${server.status || 'unknown'}"></div>
                                    <div class="server-info">
                                        <div class="server-name">${escapeHtml(server.name)}</div>
                                        <div class="server-ip">
                                            ${server.username ? escapeHtml(server.username) + '@' : ''}${escapeHtml(server.ip)}${server.port && server.port !== '22' ? ':' + escapeHtml(server.port) : ''}
                                        </div>
                                        ${server.description ? `
                                            <div class="server-description" title="${escapeHtml(server.description)}">
                                                📝 ${escapeHtml(server.description)}
                                            </div>
                                        ` : ''}
                                    </div>
                                    <div class="server-actions">
                                        <button onclick="loadServerToInput('${escapeHtml(folderName)}', ${index})" class="server-action-btn text-cyan-400" title="선택">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                            </svg>
                                        </button>
                                        <button onclick="quickConnect('${escapeHtml(folderName)}', ${index})" class="server-action-btn text-emerald-400" title="빠른 접속">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                                            </svg>
                                        </button>
                                        <button onclick="openEditServerModal('${escapeHtml(folderName)}', ${index})" class="server-action-btn text-amber-400" title="수정">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                            </svg>
                                        </button>
                                        <button onclick="deleteServer('${escapeHtml(folderName)}', ${index})" class="server-action-btn text-rose-400" title="삭제">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    if (!text) return '';
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
    document.getElementById('new-server-description').value = '';
    
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
    const serverDesc = document.getElementById('new-server-description').value.trim();
    
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
        description: serverDesc,
        status: 'unknown',
        addedAt: new Date().toISOString()
    });
    
    saveServerGroups(groups);
    expandedFolders.add(folderName);
    loadServerGroups();
    closeServerModal();
    
    showToast(`"${serverName}" ${MESSAGES.TOAST.SERVER_ADDED}`, 'success');
}

function openEditServerModal(folderName, serverIndex) {
    const groups = getServerGroups();
    const server = groups[folderName][serverIndex];
    
    document.getElementById('edit-server-folder').value = folderName;
    document.getElementById('edit-server-index').value = serverIndex;
    document.getElementById('edit-server-name').value = server.name;
    document.getElementById('edit-server-description').value = server.description || '';
    
    document.getElementById('edit-server-modal').classList.remove('hidden');
    document.getElementById('edit-server-name').focus();
}

function closeEditServerModal() {
    document.getElementById('edit-server-modal').classList.add('hidden');
}

function updateServerInfo() {
    const folderName = document.getElementById('edit-server-folder').value;
    const serverIndex = parseInt(document.getElementById('edit-server-index').value);
    const newName = document.getElementById('edit-server-name').value.trim();
    const newDesc = document.getElementById('edit-server-description').value.trim();
    
    if (!newName) {
        showToast(MESSAGES.TOAST.ENTER_SERVER_NAME, 'warning');
        return;
    }
    
    const groups = getServerGroups();
    groups[folderName][serverIndex].name = newName;
    groups[folderName][serverIndex].description = newDesc;
    
    saveServerGroups(groups);
    loadServerGroups();
    closeEditServerModal();
    
    showToast(MESSAGES.TOAST.SERVER_UPDATED, 'success');
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
    
    // Nord 색상 적용
    statusText.style.color = '';
    switch (status) {
        case 'online': statusText.style.color = NORD_COLORS.auroraGreen; break;
        case 'offline': statusText.style.color = NORD_COLORS.auroraRed; break;
        case 'testing': statusText.style.color = NORD_COLORS.auroraYellow; break;
        default: statusText.style.color = NORD_COLORS.nord3;
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
    
    // 성공률에 따른 색상 변경
    if (successEl) {
        if (successRate >= 80) successEl.style.color = NORD_COLORS.auroraGreen;
        else if (successRate >= 50) successEl.style.color = NORD_COLORS.auroraYellow;
        else successEl.style.color = NORD_COLORS.auroraRed;
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
    
    // 평균선 (Nord Yellow)
    if (avgTime > 0) {
        const avgY = padding.top + graphHeight - (avgTime / CONFIG.GRAPH_MAX_MS) * graphHeight;
        graphCtx.beginPath();
        graphCtx.strokeStyle = 'rgba(235, 203, 139, 0.4)';
        graphCtx.lineWidth = 1;
        graphCtx.setLineDash([5, 5]);
        graphCtx.moveTo(padding.left, avgY);
        graphCtx.lineTo(width - padding.right, avgY);
        graphCtx.stroke();
        graphCtx.setLineDash([]);
    }
    
    const pointSpacing = graphWidth / (CONFIG.GRAPH_MAX_POINTS - 1);
    
    // 그라데이션 (Nord Frost)
    const gradient = graphCtx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(136, 192, 208, 0.3)');
    gradient.addColorStop(1, 'rgba(136, 192, 208, 0)');
    
    graphCtx.beginPath();
    
    data.forEach((point, index) => {
        const x = padding.left + (index * pointSpacing);
        const normalizedTime = Math.min(point.time, CONFIG.GRAPH_MAX_MS);
        const y = padding.top + graphHeight - (normalizedTime / CONFIG.GRAPH_MAX_MS) * graphHeight;
        
        if (index === 0) graphCtx.moveTo(x, y);
        else graphCtx.lineTo(x, y);
    });
    
    graphCtx.strokeStyle = NORD_COLORS.frost2;
    graphCtx.lineWidth = 2;
    graphCtx.stroke();
    
    const lastX = padding.left + ((data.length - 1) * pointSpacing);
    graphCtx.lineTo(lastX, height - padding.bottom);
    graphCtx.lineTo(padding.left, height - padding.bottom);
    graphCtx.closePath();
    graphCtx.fillStyle = gradient;
    graphCtx.fill();
    
    // 데이터 포인트
    data.forEach((point, index) => {
        const x = padding.left + (index * pointSpacing);
        const normalizedTime = Math.min(point.time, CONFIG.GRAPH_MAX_MS);
        const y = padding.top + graphHeight - (normalizedTime / CONFIG.GRAPH_MAX_MS) * graphHeight;
        
        graphCtx.beginPath();
        graphCtx.arc(x, y, 4, 0, Math.PI * 2);
        graphCtx.fillStyle = point.success ? NORD_COLORS.frost2 : NORD_COLORS.auroraRed;
        graphCtx.fill();
        
        graphCtx.beginPath();
        graphCtx.arc(x, y, 6, 0, Math.PI * 2);
        graphCtx.fillStyle = point.success ? 'rgba(136, 192, 208, 0.3)' : 'rgba(191, 97, 106, 0.3)';
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
        <span style="font-size: 1.125rem;">${icons[type]}</span>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toast-in 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ==========================================
// Debug Function
// ==========================================

function debugInfo() {
    console.group('🌐 네트워크 관제 센터 v4.1 (Nord Theme) 디버그');
    console.log('서버 그룹:', getServerGroups());
    console.log('펼쳐진 폴더:', [...expandedFolders]);
    console.log('핑 결과:', pingResults);
    console.groupEnd();
}

window.debugInfo = debugInfo;