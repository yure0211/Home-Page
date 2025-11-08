function updateClock() {
    var now = new Date();
    var hours = now.getHours().toString().padStart(2, '0');
    var minutes = now.getMinutes().toString().padStart(2, '0');
    var seconds = now.getSeconds().toString().padStart(2, '0');

    document.getElementById('hm').textContent = `${hours}:${minutes}`;
    document.getElementById('s').textContent = `${seconds}`;

    var days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    document.getElementById('date').textContent = `${now.getFullYear()}년 ${(now.getMonth() + 1).toString().padStart(2, '0')}월 ${now.getDate().toString().padStart(2, '0')}일 ${days[now.getDay()]}`;
}

setInterval(updateClock, 1000);

updateClock();