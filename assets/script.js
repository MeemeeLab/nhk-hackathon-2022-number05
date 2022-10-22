async function main() {
    const map = L.map('map').setView([36.2048, 138.2529], 6);
    L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://gsi.go.jp/">地理院タイル</a>'
    }).addTo(map);
    L.geoJson(PREFECTURES, {
        style: {
            fillColor: '#616161',
            fillOpacity: 1,
            stroke: true,
            color: '#2e2d2d',
            opacity: 1,
            weight: 2
        }
    }).addTo(map);
    // TODO
}

document.addEventListener('DOMContentLoaded', main);
