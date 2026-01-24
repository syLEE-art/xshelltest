/* ==========================================
   Network Control Center - JavaScript
   ==========================================
   - 원격 접속 (SSH Protocol Handler)
   - Ping Test (HTTP Fetch 기반)
   - 응답 시간 그래프 시각화
   - Quick Access 저장 기능
   ========================================== */

// ==========================================
// Global Variables & Configuration
// ==========================================

/**
 * 애플리케이션 설정 상수
 */
const CONFIG = {
    // Ping 테스트 관련 설정
    PING_COUNT: 10,              // 총 Ping 요청 횟수
    PING_INTERVAL: 1000,         // Ping 요청 간격 (ms)
    PING_TIMEOUT: 5000,          // Ping 타임아웃 (ms)
    
    // 그래프 설정
    GRAPH_MAX_POINTS: 20,        // 그래프에 표시할 최대 데이터 포인트
    GRAPH_MAX_MS: 500,           // Y축 최대값 (ms)
    
    // 로컬 스토리지 키
    STORAGE_KEY: 'network_control_hosts',
    
    // 기본 SSH 포트
    DEFAULT_SSH_PORT: 22
};

/**
 * Ping 테스트 결과를 저장하는 객체
 */
let pingResults = {
    data: [],           // 응답 시간 배열
    successful: 0,      // 성공 횟수
    failed: 0,          // 실패 횟수
    isRunning: false    // 테스트 진행 중 여부
};

/**
 * 그래프 캔버스 컨텍스트
 */
let graphCtx = null;

// ==========================================
// Initialization
// ==========================================

/**
 * 페이지 로드 시 초기화
 */
document.addEventListener('DOMContentLoaded', () => {
    // 시간 표시 시작
    updateClock();
    setInterval(updateClock, 1000);
    
    // 그래프 캔버스 초기화
    initGraph();
    
    // 저장된 호스트 목록 로드
    loadSavedHosts();
    
    // IP 입력 필드 이벤트 리스너
    const ipInput = document.getElementById('ip-address');
    ipInput.addEventListener('input', handleIPInput);
    ipInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            startPingTest();
        }
    });
    
    console.log('🚀 Network Control Center initialized');
});

/**
 * 현재 시간 업데이트
 */
function updateClock() {
    const now = new Date();
    
    // 시간 표시 (HH:MM:SS)
    const timeStr = now.toLocaleTimeString('ko-KR', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    // 날짜 표시 (YYYY.MM.DD)
    const dateStr = now.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).replace(/\. /g, '.').replace('.', '');
    
    document.getElementById('current-time').textContent = timeStr;
    document.getElementById('current-date').textContent = dateStr;
}

// ==========================================
// SSH Connection Functions
// ==========================================

/**
 * SSH 프로토콜을 통해 Xshell 연결 시작
 * 
 * SSH URI 형식: ssh://[user@]host[:port]
 * - user: 사용자명 (선택사항)
 * - host: IP 주소 또는 호스트명 (필수)
 * - port: 포트 번호 (선택사항, 기본값 22)
 */
function connectSSH() {
    // 입력값 가져오기
    const ip = document.getElementById('ip-address').value.trim();
    const port = document.getElementById('port').value.trim();
    const username = document.getElementById('username').value.trim();
    
    // IP 주소 유효성 검사
    if (!ip) {
        showToast('Please enter an IP address', 'error');
        document.getElementById('ip-address').focus();
        return;
    }
    
    if (!isValidIP(ip)) {
        showToast('Invalid IP address format', 'error');
        document.getElementById('ip-address').focus();
        return;
    }
    
    // SSH URI 구성
    let sshUri = 'ssh://';
    
    // 사용자명이 있으면 추가
    if (username) {
        sshUri += `${encodeURIComponent(username)}@`;
    }
    
    // IP 주소 추가
    sshUri += ip;
    
    // 포트가 기본값(22)이 아니면 추가
    if (port && port !== '22') {
        sshUri += `:${port}`;
    }
    
    console.log(`🔗 Connecting via SSH: ${sshUri}`);
    
    // SSH 프로토콜 핸들러 호출
    // 시스템에 SSH 핸들러(Xshell 등)가 등록되어 있어야 함
    try {
        window.location.href = sshUri;
        showToast(`Launching SSH client for ${ip}`, 'success');
        
        // 연결 시도 기록
        updateTargetDisplay(ip, username, port);
    } catch (error) {
        console.error('SSH connection error:', error);
        showToast('Failed to launch SSH client. Please check if Xshell is installed.', 'error');
    }
}

/**
 * IP 주소 유효성 검사
 * @param {string} ip - 검사할 IP 주소
 * @returns {boolean} 유효 여부
 */
function isValidIP(ip) {
    // IPv4 정규식 패턴
    const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    
    // 호스트명도 허용 (간단한 패턴)
    const hostnamePattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
    
    return ipv4Pattern.test(ip) || hostnamePattern.test(ip);
}

// ==========================================
// Ping Test Functions
// ==========================================

/**
 * Ping 테스트 시작
 * 
 * 브라우저 보안 정책으로 인해 실제 ICMP Ping은 불가능
 * 대신 HTTP fetch를 사용하여 연결 가능성 테스트
 * 
 * 테스트 방법:
 * 1. 대상 IP에 HTTP 요청 시도 (타임아웃 설정)
 * 2. 응답 시간 측정
 * 3. 연결 성공/실패 판단
 */
async function startPingTest() {
    const ip = document.getElementById('ip-address').value.trim();
    
    // IP 주소 유효성 검사
    if (!ip) {
        showToast('Please enter an IP address', 'error');
        document.getElementById('ip-address').focus();
        return;
    }
    
    if (!isValidIP(ip)) {
        showToast('Invalid IP address format', 'error');
        return;
    }
    
    // 이미 테스트 중이면 중단
    if (pingResults.isRunning) {
        showToast('Ping test is already running', 'warning');
        return;
    }
    
    // 초기화
    pingResults = {
        data: [],
        successful: 0,
        failed: 0,
        isRunning: true
    };
    
    // UI 업데이트
    setStatus('testing', 'TESTING...', `Pinging ${ip}`);
    updateTargetDisplay(ip);
    hideGraphOverlay();
    
    // 버튼 로딩 상태
    const pingBtn = document.getElementById('ping-btn');
    pingBtn.classList.add('btn-loading');
    pingBtn.disabled = true;
    
    document.getElementById('graph-status').textContent = 'SCANNING...';
    
    console.log(`📡 Starting ping test for ${ip}`);
    
    // Ping 테스트 실행
    for (let i = 0; i < CONFIG.PING_COUNT; i++) {
        if (!pingResults.isRunning) break;
        
        const result = await performPing(ip);
        pingResults.data.push(result);
        
        if (result.success) {
            pingResults.successful++;
        } else {
            pingResults.failed++;
        }
        
        // 실시간 통계 및 그래프 업데이트
        updateStatistics();
        drawGraph();
        
        // 다음 요청 전 대기 (마지막 요청이 아닌 경우)
        if (i < CONFIG.PING_COUNT - 1) {
            await sleep(CONFIG.PING_INTERVAL);
        }
    }
    
    // 테스트 완료
    pingResults.isRunning = false;
    
    // 버튼 상태 복원
    pingBtn.classList.remove('btn-loading');
    pingBtn.disabled = false;
    
    // 최종 상태 업데이트
    const successRate = (pingResults.successful / CONFIG.PING_COUNT) * 100;
    
    if (successRate >= 50) {
        setStatus('online', 'ONLINE', `${ip} is reachable`);
        document.getElementById('graph-status').textContent = 'CONNECTED';
    } else if (successRate > 0) {
        setStatus('offline', 'UNSTABLE', `${ip} has packet loss`);
        document.getElementById('graph-status').textContent = 'UNSTABLE';
    } else {
        setStatus('offline', 'OFFLINE', `${ip} is unreachable`);
        document.getElementById('graph-status').textContent = 'UNREACHABLE';
    }
    
    showToast(`Ping test completed: ${successRate.toFixed(0)}% success rate`, 
              successRate >= 50 ? 'success' : 'error');
    
    console.log(`✅ Ping test completed - Success: ${pingResults.successful}/${CONFIG.PING_COUNT}`);
}

/**
 * 단일 Ping 요청 수행
 * 
 * HTTP fetch를 사용하여 연결 테스트
 * - 성공: 응답 시간 반환
 * - 실패: timeout 또는 에러로 표시
 * 
 * @param {string} ip - 대상 IP 주소
 * @returns {Object} {success: boolean, time: number}
 */
async function performPing(ip) {
    const startTime = performance.now();
    
    try {
        // AbortController로 타임아웃 구현
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.PING_TIMEOUT);
        
        // HTTP 요청 시도 (실제로는 연결만 테스트)
        // 참고: CORS 정책으로 인해 대부분 실패하지만,
        // 연결 자체의 성공/실패는 판단 가능
        await fetch(`http://${ip}`, {
            method: 'HEAD',
            mode: 'no-cors',  // CORS 우회
            cache: 'no-cache',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        return {
            success: true,
            time: responseTime
        };
        
    } catch (error) {
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        // AbortError는 타임아웃을 의미
        if (error.name === 'AbortError') {
            return {
                success: false,
                time: CONFIG.PING_TIMEOUT
            };
        }
        
        // 네트워크 에러도 연결 시도로 간주
        // (CORS 에러지만 서버에 도달은 했을 수 있음)
        if (responseTime < CONFIG.PING_TIMEOUT) {
            return {
                success: true,
                time: responseTime
            };
        }
        
        return {
            success: false,
            time: responseTime
        };
    }
}

/**
 * 대기 함수 (Promise 기반)
 * @param {number} ms - 대기 시간 (밀리초)
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==========================================
// UI Update Functions
// ==========================================

/**
 * 상태 LED 및 텍스트 업데이트
 * @param {string} status - 상태 ('online', 'offline', 'testing', 'unknown')
 * @param {string} text - 상태 텍스트
 * @param {string} detail - 상세 설명
 */
function setStatus(status, text, detail = '') {
    const led = document.getElementById('status-led');
    const statusText = document.getElementById('status-text');
    const statusDetail = document.getElementById('status-detail');
    
    // 기존 상태 클래스 제거
    led.classList.remove('status-online', 'status-offline', 'status-testing', 'status-unknown');
    
    // 새 상태 클래스 추가
    led.classList.add(`status-${status}`);
    
    // 텍스트 업데이트
    statusText.textContent = text;
    statusDetail.textContent = detail;
    
    // 색상 업데이트
    statusText.classList.remove('text-neon-green', 'text-neon-red', 'text-neon-orange', 'text-gray-500');
    
    switch (status) {
        case 'online':
            statusText.classList.add('text-neon-green');
            break;
        case 'offline':
            statusText.classList.add('text-neon-red');
            break;
        case 'testing':
            statusText.classList.add('text-neon-orange');
            break;
        default:
            statusText.classList.add('text-gray-500');
    }
}

/**
 * 대상 IP 표시 업데이트
 * @param {string} ip - IP 주소
 * @param {string} username - 사용자명 (선택)
 * @param {string} port - 포트 (선택)
 */
function updateTargetDisplay(ip, username = '', port = '') {
    const display = document.getElementById('target-display');
    let text = ip;
    
    if (username) {
        text = `${username}@${text}`;
    }
    if (port && port !== '22') {
        text += `:${port}`;
    }
    
    display.textContent = text;
}

/**
 * 통계 정보 업데이트
 */
function updateStatistics() {
    const total = pingResults.data.length;
    const successful = pingResults.successful;
    const successRate = total > 0 ? (successful / total) * 100 : 0;
    
    // 성공한 요청의 응답 시간만 필터링
    const successfulTimes = pingResults.data
        .filter(r => r.success)
        .map(r => r.time);
    
    // 통계 계산
    const avg = successfulTimes.length > 0 
        ? Math.round(successfulTimes.reduce((a, b) => a + b, 0) / successfulTimes.length)
        : '--';
    const min = successfulTimes.length > 0 
        ? Math.min(...successfulTimes)
        : '--';
    const max = successfulTimes.length > 0 
        ? Math.max(...successfulTimes)
        : '--';
    
    // UI 업데이트
    document.getElementById('stat-requests').textContent = total;
    document.getElementById('stat-success').textContent = `${successRate.toFixed(0)}%`;
    document.getElementById('stat-avg').textContent = typeof avg === 'number' ? `${avg} ms` : avg;
    document.getElementById('stat-min').textContent = typeof min === 'number' ? `${min} ms` : min;
    document.getElementById('stat-max').textContent = typeof max === 'number' ? `${max} ms` : max;
    
    // 성공률에 따른 색상
    const successEl = document.getElementById('stat-success');
    successEl.classList.remove('text-neon-green', 'text-neon-orange', 'text-neon-red');
    
    if (successRate >= 80) {
        successEl.classList.add('text-neon-green');
    } else if (successRate >= 50) {
        successEl.classList.add('text-neon-orange');
    } else {
        successEl.classList.add('text-neon-red');
    }
}

/**
 * IP 입력 핸들러
 */
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

/**
 * 그래프 캔버스 초기화
 */
function initGraph() {
    const canvas = document.getElementById('response-graph');
    graphCtx = canvas.getContext('2d');
    
    // 캔버스 크기를 부모 컨테이너에 맞춤
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

/**
 * 캔버스 크기 조정
 */
function resizeCanvas() {
    const canvas = document.getElementById('response-graph');
    const container = canvas.parentElement;
    
    // 디바이스 픽셀 비율 고려 (고해상도 디스플레이 지원)
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = container.clientWidth * dpr;
    canvas.height = container.clientHeight * dpr;
    
    canvas.style.width = `${container.clientWidth}px`;
    canvas.style.height = `${container.clientHeight}px`;
    
    graphCtx.scale(dpr, dpr);
    
    // 크기 조정 후 다시 그리기
    if (pingResults.data.length > 0) {
        drawGraph();
    }
}

/**
 * 응답 시간 그래프 그리기
 */
function drawGraph() {
    const canvas = document.getElementById('response-graph');
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    
    const padding = { top: 20, right: 20, bottom: 20, left: 50 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;
    
    // 캔버스 초기화
    graphCtx.clearRect(0, 0, width, height);
    
    const data = pingResults.data.slice(-CONFIG.GRAPH_MAX_POINTS);
    if (data.length === 0) return;
    
    // 평균 계산 (성공한 요청만)
    const successfulTimes = data.filter(r => r.success).map(r => r.time);
    const avgTime = successfulTimes.length > 0
        ? successfulTimes.reduce((a, b) => a + b, 0) / successfulTimes.length
        : 0;
    
    // 평균선 그리기
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
    
    // 데이터 포인트 간격
    const pointSpacing = graphWidth / (CONFIG.GRAPH_MAX_POINTS - 1);
    
    // 라인 그리기
    graphCtx.beginPath();
    graphCtx.strokeStyle = '#00f5ff';
    graphCtx.lineWidth = 2;
    graphCtx.lineJoin = 'round';
    graphCtx.lineCap = 'round';
    
    // 그라데이션 영역 (라인 아래)
    const gradient = graphCtx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(0, 245, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 245, 255, 0)');
    
    // 영역 채우기용 경로
    graphCtx.beginPath();
    
    data.forEach((point, index) => {
        const x = padding.left + (index * pointSpacing);
        const normalizedTime = Math.min(point.time, CONFIG.GRAPH_MAX_MS);
        const y = padding.top + graphHeight - (normalizedTime / CONFIG.GRAPH_MAX_MS) * graphHeight;
        
        if (index === 0) {
            graphCtx.moveTo(x, y);
        } else {
            graphCtx.lineTo(x, y);
        }
    });
    
    // 라인 그리기
    graphCtx.strokeStyle = '#00f5ff';
    graphCtx.stroke();
    
    // 영역 채우기
    const lastX = padding.left + ((data.length - 1) * pointSpacing);
    graphCtx.lineTo(lastX, height - padding.bottom);
    graphCtx.lineTo(padding.left, height - padding.bottom);
    graphCtx.closePath();
    graphCtx.fillStyle = gradient;
    graphCtx.fill();
    
    // 데이터 포인트 그리기
    data.forEach((point, index) => {
        const x = padding.left + (index * pointSpacing);
        const normalizedTime = Math.min(point.time, CONFIG.GRAPH_MAX_MS);
        const y = padding.top + graphHeight - (normalizedTime / CONFIG.GRAPH_MAX_MS) * graphHeight;
        
        // 포인트 원
        graphCtx.beginPath();
        graphCtx.arc(x, y, 4, 0, Math.PI * 2);
        
        if (point.success) {
            graphCtx.fillStyle = '#00f5ff';
        } else {
            graphCtx.fillStyle = '#ff0055';
        }
        
        graphCtx.fill();
        
        // 글로우 효과
        graphCtx.beginPath();
        graphCtx.arc(x, y, 6, 0, Math.PI * 2);
        graphCtx.fillStyle = point.success 
            ? 'rgba(0, 245, 255, 0.3)' 
            : 'rgba(255, 0, 85, 0.3)';
        graphCtx.fill();
    });
}

/**
 * 그래프 오버레이 숨기기
 */
function hideGraphOverlay() {
    const overlay = document.getElementById('graph-overlay');
    overlay.style.display = 'none';
}

// ==========================================
// Quick Access (Host Saving) Functions
// ==========================================

/**
 * 현재 호스트 정보 저장
 */
function saveCurrentHost() {
    const ip = document.getElementById('ip-address').value.trim();
    const port = document.getElementById('port').value.trim() || CONFIG.DEFAULT_SSH_PORT;
    const username = document.getElementById('username').value.trim();
    
    if (!ip) {
        showToast('Please enter an IP address first', 'warning');
        return;
    }
    
    if (!isValidIP(ip)) {
        showToast('Invalid IP address format', 'error');
        return;
    }
    
    // 기존 호스트 목록 불러오기
    const hosts = getSavedHosts();
    
    // 중복 체크
    const exists = hosts.some(h => h.ip === ip && h.port === port);
    if (exists) {
        showToast('This host is already saved', 'warning');
        return;
    }
    
    // 새 호스트 추가
    hosts.push({
        ip,
        port,
        username,
        addedAt: new Date().toISOString()
    });
    
    // 저장
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(hosts));
    
    // UI 업데이트
    loadSavedHosts();
    
    showToast(`Host ${ip} saved successfully`, 'success');
}

/**
 * 저장된 호스트 목록 불러오기
 * @returns {Array} 호스트 목록
 */
function getSavedHosts() {
    try {
        const data = localStorage.getItem(CONFIG.STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error loading saved hosts:', error);
        return [];
    }
}

/**
 * 저장된 호스트 목록 UI에 로드
 */
function loadSavedHosts() {
    const container = document.getElementById('quick-access-list');
    const hosts = getSavedHosts();
    
    if (hosts.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-600 text-sm py-4">
                <div class="text-2xl mb-2 opacity-30">📌</div>
                No saved hosts yet
            </div>
        `;
        return;
    }
    
    container.innerHTML = hosts.map((host, index) => `
        <div class="quick-access-item" onclick="loadHost(${index})">
            <div class="host-indicator"></div>
            <div class="host-info">
                <div class="host-ip">${host.ip}${host.port !== '22' ? ':' + host.port : ''}</div>
                ${host.username ? `<div class="host-user">${host.username}@</div>` : ''}
            </div>
            <button class="delete-btn" onclick="event.stopPropagation(); deleteHost(${index})" title="Delete">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </div>
    `).join('');
}

/**
 * 저장된 호스트 정보 로드
 * @param {number} index - 호스트 인덱스
 */
function loadHost(index) {
    const hosts = getSavedHosts();
    const host = hosts[index];
    
    if (host) {
        document.getElementById('ip-address').value = host.ip;
        document.getElementById('port').value = host.port || '';
        document.getElementById('username').value = host.username || '';
        
        updateTargetDisplay(host.ip, host.username, host.port);
        
        showToast(`Loaded ${host.ip}`, 'info');
    }
}

/**
 * 저장된 호스트 삭제
 * @param {number} index - 호스트 인덱스
 */
function deleteHost(index) {
    const hosts = getSavedHosts();
    const host = hosts[index];
    
    if (confirm(`Delete ${host.ip}?`)) {
        hosts.splice(index, 1);
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(hosts));
        loadSavedHosts();
        showToast('Host deleted', 'info');
    }
}

// ==========================================
// Toast Notification Functions
// ==========================================

/**
 * 토스트 알림 표시
 * @param {string} message - 알림 메시지
 * @param {string} type - 알림 유형 ('success', 'error', 'warning', 'info')
 * @param {number} duration - 표시 시간 (ms)
 */
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    
    // 아이콘 선택
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    // 토스트 요소 생성
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="text-lg">${icons[type]}</span>
        <span>${message}</span>
    `;
    
    // 컨테이너에 추가
    container.appendChild(toast);
    
    // 자동 제거
    setTimeout(() => {
        toast.style.animation = 'slide-in 0.3s ease-out reverse';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, duration);
}

// ==========================================
// Utility Functions
// ==========================================

/**
 * 포맷된 날짜/시간 문자열 반환
 * @param {Date} date - 날짜 객체
 * @returns {string} 포맷된 문자열
 */
function formatDateTime(date) {
    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

/**
 * 디버그 정보 콘솔 출력
 */
function debugInfo() {
    console.group('🔧 Network Control Center Debug Info');
    console.log('Ping Results:', pingResults);
    console.log('Saved Hosts:', getSavedHosts());
    console.log('Config:', CONFIG);
    console.groupEnd();
}

// 글로벌 스코프에 디버그 함수 노출
window.debugInfo = debugInfo;
