const articles = NHK_ARTICLES.split('\n').map(v => v.split(',')).map(v => ({
    dateTime: new Date(v[0]),
    areaCode: parseInt(v[1]),
    areaString: AREA_CODE_MAP[parseInt(v[1])],
    thumbnail: v[2],
    video: v[3],
    title: v[4],
    body: v[5]
}));

const articlesOfArea = articles.reduce((prev, val) => {
    prev[val.areaString] = prev[val.areaString] || []
    prev[val.areaString].push(val);
    return prev;
}, {});
const maxArticlesOfAreas = Object.values(articlesOfArea).reduce((prev, val) => val.length > prev ? val.length : prev, 0);

function getOpacityByArticleCount(cnt) {
    let val = cnt / maxArticlesOfAreas;
    if (isNaN(val) || !isFinite(val)) val = 0;
    return val;
}

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
        },
        onEachFeature: function (feature, layer) {
            const articlesForArea = articlesOfArea[feature.properties.name] || [];
            if (articlesForArea.length) debugger;
            const opacity = getOpacityByArticleCount(articlesForArea.length);
            layer.setStyle({fillColor: 'red', fillOpacity: opacity, opacity: opacity});
            layer.bindPopup(feature.properties.name + '<BR>' + articlesForArea.length + ' 記事');
        }
    }).addTo(map);
    // TODO
}

document.addEventListener('DOMContentLoaded', main);
