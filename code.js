// ===================================================================================
// 설정
// ===================================================================================
let config = {
    autohide: true,
    hideDelay: 3000,
    backgroundColor: 'rgba(0, 0, 0)',
    blur: true,
};

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
        store.clear();

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
    await initDB();
    
    applyAllSettings();
    
    initializeAutohide();
    initializeClock();
    initializeEventListeners();
});

// ===================================================================================
// 모든 설정 UI 적용 함수
// ===================================================================================
async function applyAllSettings() {
    await applyBackground();
    applyBlurEffect();

    const blurToggle = document.getElementById('blurToggle');
    if(blurToggle) {
        blurToggle.checked = config.blur;
    }
}

function initializeEventListeners() {
    const changeBgBtn = document.getElementById('changeBackgroundBtn');
    if (changeBgBtn) {
        changeBgBtn.addEventListener('click', openBackgroundDialog);
    }
    
    const resetBgBtn = document.getElementById('resetBackgroundBtn');
    if (resetBgBtn) {
        resetBgBtn.addEventListener('click', resetBackground);
    }

    const blurToggle = document.getElementById('blurToggle');
    if (blurToggle) {
        blurToggle.addEventListener('change', () => {
            config.blur = blurToggle.checked;
            saveSettings();
            applyBlurEffect();
        });
    }
}

// ===================================================================================
// 개별 설정 적용 함수들
// ===================================================================================
function applyBlurEffect() {
    const itemBox = document.getElementById('item-box');
    if (config.blur) {
        itemBox.classList.add('blur-effect');
    } else {
        itemBox.classList.remove('blur-effect');
    }
}

async function applyBackground() {
    const backgroundElement = document.getElementById('background');
    backgroundElement.style.backgroundColor = config.backgroundColor;

    try {
        const images = await loadImagesFromDB();
        if (images.length > 0) {
            const randomIndex = Math.floor(Math.random() * images.length);
            const imageUrl = URL.createObjectURL(images[randomIndex]);
            backgroundElement.style.backgroundImage = `url(${imageUrl})`;
        } else {
            backgroundElement.style.backgroundImage = 'none';
        }
    } catch (error) {
        console.error("배경 이미지 로딩 실패:", error);
        backgroundElement.style.backgroundImage = 'none';
    }
}

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

function openBackgroundDialog() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;

    input.onchange = async e => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        try {
            await saveImageToDB(files);
            await applyBackground();
        } catch (error) {
            console.error("이미지 저장 실패:", error);
            alert("이미지 저장에 실패했습니다. 파일이 너무 크거나 브라우저에 문제가 있을 수 있습니다.");
        }
    };
    input.click();
}

async function resetBackground() {
    if (confirm("정말로 모든 배경 이미지를 삭제하고 초기화하시겠습니까?")) {
        try {
            await clearImagesFromDB();
            await applyBackground();
            alert("배경이 초기화되었습니다.");
        } catch (error) {
            console.error("배경 초기화 실패:", error);
            alert("배경 초기화에 실패했습니다.");
        }
    }
}

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