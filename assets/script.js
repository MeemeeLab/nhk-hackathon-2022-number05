const articles = NHK_ARTICLES.split('\n').map(v => v.split(',')).map(v => ({
    dateTime: new Date(v[0]),
    areaCode: parseInt(v[1]),
    areaString: AREA_CODE_MAP[parseInt(v[1])],
    thumbnail: v[2],
    video: v[3],
    title: v[4],
    body: v[5]
}));

const all_VPTW60 = Object.values(JMA_VPTW60).map(v => new DOMParser().parseFromString(v, 'text/xml'));

function renderVPTW60(map, vptw60Array) {
    for (const vptw60 of vptw60Array) {
        const centerElm = Array.from(vptw60.querySelector('Report Body MeteorologicalInfos MeteorologicalInfo DateTime[type="実況"]').parentElement.querySelectorAll('Item Kind Property Type')).find(v => v.innerHTML === '中心').parentElement;
        const nameElm = Array.from(vptw60.querySelector('Report Body MeteorologicalInfos MeteorologicalInfo DateTime[type="実況"]').parentElement.querySelectorAll('Item Kind Property Type')).find(v => v.innerHTML === '呼称').parentElement;
        let typhoonName = '';
        if (nameElm.querySelector('TyphoonNamePart NameKana').innerHTML !== '') {
            typhoonName += `${nameElm.querySelector('TyphoonNamePart NameKana').innerHTML} (${nameElm.querySelector('TyphoonNamePart Name').innerHTML})`;
        } else {
            typhoonName += `無名`;
        }
        if (nameElm.querySelector('TyphoonNamePart Remark').innerHTML !== '') {
            typhoonName += `<BR>${nameElm.querySelector('TyphoonNamePart Remark').innerHTML}`;
        }
        const latLngStr = centerElm.querySelector('CenterPart Coordinate[type="中心位置（度）"]').innerHTML;
        const [_, lat, __, lng] = latLngStr.match(/\+([+-]?([0-9]*[.])?[0-9]+)\+([+-]?([0-9]*[.])?[0-9]+)\//);
        L.circle([parseInt(lat), parseInt(lng)], {
            radius: 100000
        }).bindPopup(typhoonName).addTo(map);
    }
}

function getVPTW60OlderThan(dateTime) {
    return all_VPTW60.filter(v => new Date(v.querySelector('Report Head ReportDateTime').innerHTML) <= dateTime);
}

// { '都道府県': Article }
const articlesOfArea = articles.reduce((prev, val) => {
    prev[val.areaString] = prev[val.areaString] || [];
    prev[val.areaString].push(val);
    return prev;
}, {});

// 1都道府県で見つかった最大の記事数。 number
const maxArticlesOfAreas = Object.values(articlesOfArea).reduce((prev, val) => val.length > prev ? val.length : prev, 0);

function getOpacityByArticleCount(cnt) {
    let val = cnt / maxArticlesOfAreas;
    if (isNaN(val) || !isFinite(val)) val = 0;
    return val;
}

async function main() {
    const map = L.map('map', { zoomControl: false }).setView([36.2048, 138.2529], 6);
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
            // if (articlesForArea.length) debugger;
            const opacity = getOpacityByArticleCount(articlesForArea.length);
            layer.setStyle({fillColor: 'red', fillOpacity: opacity, opacity: opacity});
            layer.bindPopup(feature.properties.name + '<BR>' + articlesForArea.length + ' 記事');
        }
    }).addTo(map);
    renderVPTW60(map, all_VPTW60);
    // TODO
    L.control.scale({ maxWidth: 200, position: 'topleft', imperial: false }).addTo(map);

    var legend = L.control({ position: 'bottomright' });
    legend.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'info legend');
        div.innerHTML =
            `<div id="legend"><span class="title">NHK記事数</span><br/>`
            + `<span class="note">NHKが公開した災害に関する記事の数です。</span>`
            + `<div style="opacity: 50%">~ 50</div>`
            + `<div style="opacity: 30%">~ 30</div>`
            + `<div style="opacity: 20%">~ 20</div>`
            + `<div style="opacity: 10%">~ 10</div>`
            + `<div style="opacity:  5%">~ 5</div>`
            + `</div>`
        return div;
    };
    legend.addTo(map);

    var timeslider = L.control({ position: 'bottomleft' });
    timeslider.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'info timeslider');
        div.innerHTML = `<input id="timeslider" type="range" style="width: 500px"><label for="timeslider">time</label>`;
        L.DomEvent.on(div, 'click', L.DomEvent.stopPropagation);
        L.DomEvent.on(div, 'dblclick', L.DomEvent.stopPropagation);
        L.DomEvent.on(div, 'mousemove', L.DomEvent.stopPropagation);
        L.DomEvent.on(div, 'mousewheel', L.DomEvent.stopPropagation);
        return div;
    };
    timeslider.addTo(map);

    // L.divOverlay({}).addTo(map);
}

document.addEventListener('DOMContentLoaded', main);
