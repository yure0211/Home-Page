// ===================================================================================
// 설정
// ===================================================================================
let config = {
    autohide: true,
    blur: true,
    showsearch: true,
    hideDelay: 2000,
    backgroundColor: 'rgba(0, 0, 0)',
};
// backgroundImage는 이제 IndexedDB에서 관리하므로 여기서 제외합니다.

// ===================================================================================
// IndexedDB 관련 설정 및 함수
// ===================================================================================
const DB_NAME = 'clockBackgroundDB';
const STORE_NAME = 'backgroundImages';
let db;

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);

        request.onupgradeneeded = event => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = event => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = event => {
            console.error('IndexedDB error:', event.target.errorCode);
            reject(event.target.errorCode);
        };
    });
}

function saveImageToDB(images) {
    if (!db) return Promise.reject("DB is not initialized.");
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.clear(); // 기존 이미지 모두 삭제

        // 이미지를 하나씩 저장
        images.forEach((imageBlob, index) => {
            store.put({ id: `image_${index}`, data: imageBlob });
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = event => reject(event.target.error);
    });
}

function loadImagesFromDB() {
    if (!db) return Promise.reject("DB is not initialized.");
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            const imageRecords = request.result.map(record => record.data);
            resolve(imageRecords);
        };
        request.onerror = event => reject(event.target.error);
    });
}

function clearImagesFromDB() {
    if (!db) return Promise.reject("DB is not initialized.");
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear(); // 저장소의 모든 데이터를 삭제

        transaction.oncomplete = () => {
            console.log("모든 배경 이미지가 삭제되었습니다.");
            resolve();
        };
        transaction.onerror = event => {
            console.error("이미지 삭제 중 오류 발생:", event.target.error);
            reject(event.target.error);
        };
    });
}

// ===================================================================================
// 로컬 스토리지 (간단한 설정용)
// ===================================================================================
function loadSettings() {
    const savedConfig = localStorage.getItem('clockConfig');
    if (savedConfig) {
        // 저장된 설정과 기본 설정을 합침 (새로운 설정 추가에 대응)
        config = { ...config, ...JSON.parse(savedConfig) };
    }
}

function saveSettings() {
    localStorage.setItem('clockConfig', JSON.stringify(config));
}

// ===================================================================================
// UI 및 기능 초기화
// ===================================================================================
document.addEventListener('DOMContentLoaded', async () => {
    loadSettings();
    await initDB(); // DB 초기화가 완료될 때까지 기다림
    await applyBackground(); // DB에서 이미지 로드 후 배경 적용
    
    initializeAutohide();
    initializeClock();

    const changeBgBtn = document.getElementById('changeBackgroundBtn');
    if (changeBgBtn) {
        changeBgBtn.addEventListener('click', openBackgroundDialog);
    }
});

// ===================================================================================
// 자동 숨김 기능
// ===================================================================================
function initializeAutohide() {
    if (config.autohide) {
        let hideTimeout;
        const itemBox = document.getElementById('item-box');
        document.addEventListener('mousemove', () => {
            clearTimeout(hideTimeout);
            itemBox.style.opacity = '1';
            hideTimeout = setTimeout(() => {
                itemBox.style.opacity = '0';
            }, config.hideDelay);
        });
    }
}

// ===================================================================================
// 배경 설정 적용
// ===================================================================================
async function applyBackground() {
    const backgroundElement = document.getElementById('background');
    backgroundElement.style.backgroundColor = config.backgroundColor;

    try {
        const images = await loadImagesFromDB();
        if (images.length > 0) {
            const randomIndex = Math.floor(Math.random() * images.length);
            const imageUrl = URL.createObjectURL(images[randomIndex]);
            backgroundElement.style.backgroundImage = `url(${imageUrl})`;

            // createObjectURL로 생성된 URL은 메모리 누수 방지를 위해 해제해주는 것이 좋으나,
            // 이 앱의 경우 페이지를 떠날 때 자동으로 해제되므로 추가 코드는 생략합니다.
        } else {
            backgroundElement.style.backgroundImage = 'none';
        }
    } catch (error) {
        console.error("배경 이미지 로딩 실패:", error);
        backgroundElement.style.backgroundImage = 'none';
    }
}

// ===================================================================================
// 배경 변경 다이얼로그
// ===================================================================================
function openBackgroundDialog() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;

    input.onchange = async e => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        try {
            await saveImageToDB(files); // 파일을 Blob 형태로 DB에 저장
            await applyBackground(); // DB에서 다시 불러와 배경 즉시 적용
        } catch (error) {
            console.error("이미지 저장 실패:", error);
            alert("이미지 저장에 실패했습니다. 파일이 너무 크거나 브라우저에 문제가 있을 수 있습니다.");
        }
    };

    input.click();
}

// ===================================================================================
// 시계 기능
// ===================================================================================
function initializeClock() {
    function updateClock() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

        document.getElementById('hm').textContent = `${hours}:${minutes}`;
        document.getElementById('s').textContent = `${seconds}`;
        document.getElementById('date').textContent = `${now.getFullYear()}년 ${(now.getMonth() + 1).toString().padStart(2, '0')}월 ${now.getDate().toString().padStart(2, '0')}일 ${days[now.getDay()]}`;
    }

    setInterval(updateClock, 1000);
    updateClock();
}