const articles = NHK_ARTICLES.split('\n').map(v => v.split(',')).map(v => ({
    nhkId: v[1],
    dateTime: new Date(v[2]),
    areaCodes: v[3].split('.').map(code => parseInt(code)),
    areaStrings: v[3].split('.').map(code => AREA_CODE_MAP[parseInt(code)]),
    title: v[4],
    category: v[5],
    imgUrl: v[6],
    vidUrl: v[7],
    VidDuration: parseInt(v[8])
}));

const all_VPTW60 = Object.values(JMA_VPTW60).map(v => new DOMParser().parseFromString(v, 'text/xml'));

const geoJsonLayers = [];

const ifIsNaN = (value, def) => isNaN(value) ? def : value;

function renderVPTW60(map, vptw60Array) {
    // { [EventID]: { array, latest } }
    let typhoons = {};

    for (const vptw60 of vptw60Array) {
        const eventId = vptw60.querySelector('Report Head EventID').innerHTML;
        typhoons[eventId] = typhoons[eventId] || { array: [], latest: null };

        typhoons[eventId].array.push(vptw60);
        if (!typhoons[eventId].latest || parseInt(typhoons[eventId].latest.querySelector('Report Head Serial').innerHTML) < parseInt(vptw60.querySelector('Report Head Serial').innerHTML)) {
            typhoons[eventId].latest = vptw60;
        }
    }

    // Sort
    for (const i of Object.keys(typhoons)) {
        const typhoon = typhoons[i];
        typhoon.array.sort((a, b) => {
            return parseInt(a.querySelector('Report Head Serial').innerHTML) - parseInt(b.querySelector('Report Head Serial').innerHTML);
        })
    }

    // Draw lines
    for (const i of Object.keys(typhoons)) {
        const typhoon = typhoons[i];
        const latLngArray = typhoon.array.map((v) => {
            const areaElm = v.querySelector('Report Body MeteorologicalInfos MeteorologicalInfo Item Area');
            const latLngStr = areaElm.querySelector('Circle BasePoint[type="中心位置（度）"]').innerHTML;
            const [_, lat, __, lng] = latLngStr.match(/\+([+-]?([0-9]*[.])?[0-9]+)\+([+-]?([0-9]*[.])?[0-9]+)\//);
            return [parseFloat(lat), parseFloat(lng)];
        });
        L.polyline(latLngArray, {
            color: 'white',
            weight: 3,
            opacity: 1,
            smoothFactor: 1
        }).addTo(map);
    }

    // Draw current circle
    for (const i of Object.keys(typhoons)) {
        const typhoon = typhoons[i];
        const areaElm = typhoon.latest.querySelector('Report Body MeteorologicalInfos MeteorologicalInfo Item Area');
        const nameElm = Array.from(typhoon.latest.querySelector('Report Body MeteorologicalInfos MeteorologicalInfo DateTime[type="実況"]').parentElement.querySelectorAll('Item Kind Property Type')).find(v => v.innerHTML === '呼称').parentElement;
        let typhoonName = '';
        if (nameElm.querySelector('TyphoonNamePart NameKana').innerHTML !== '') {
            typhoonName += `${nameElm.querySelector('TyphoonNamePart NameKana').innerHTML} (${nameElm.querySelector('TyphoonNamePart Name').innerHTML})`;
        } else {
            typhoonName += `無名`;
        }
        if (nameElm.querySelector('TyphoonNamePart Remark').innerHTML !== '') {
            typhoonName += `<BR>${nameElm.querySelector('TyphoonNamePart Remark').innerHTML}`;
        }
        const latLngStr = areaElm.querySelector('Circle BasePoint[type="中心位置（度）"]').innerHTML;
        const [_, lat, __, lng] = latLngStr.match(/\+([+-]?([0-9]*[.])?[0-9]+)\+([+-]?([0-9]*[.])?[0-9]+)\//);
        const axes = Array.from(areaElm.querySelectorAll('Circle Axes Axis'));
        const axes0Radius = ifIsNaN(parseInt(axes[0].querySelector('Radius[unit="km"]').innerHTML), null);
        if (axes0Radius) L.circle([parseFloat(lat), parseFloat(lng)], {
            radius: axes0Radius * 1000,
            fillColor: 'yellow',
            fillOpacity: 0.5,
            stroke: true,
            color: 'yellow',
        }).bindPopup(typhoonName).addTo(map);
    }

    geoJsonLayers.forEach(v => v.bringToFront());
}

function getVPTW60OlderThan(dateTime) {
    return all_VPTW60.filter(v => new Date(v.querySelector('Report Head ReportDateTime').innerHTML) <= dateTime);
}
function getNHKArticlesOlderThan(dateTime, areaString) {
    const articles = articlesOfArea[areaString];
    return articles.filter(v => v.dateTime <= dateTime);
}

// { '都道府県': Article }
const articlesOfArea = articles.reduce((prev, val) => {
    val.areaStrings.forEach((areaString) => {
        prev[areaString] = prev[areaString] || [];
        prev[areaString].push(val);
    });
    return prev;
}, {});

// // 1都道府県で見つかった最大の記事数。 number
// const maxArticlesOfAreas = Object.values(articlesOfArea).reduce((prev, val) => val.length > prev ? val.length : prev, 0);

function getOpacityByArticleCount(cnt) {
    let val = cnt / 50; // maxArticlesOfAreas;
    if (isNaN(val) || !isFinite(val)) val = 0;
    if (val > 1) val = 1;
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
            geoJsonLayers.push(layer);
            const articlesForArea = articlesOfArea[feature.properties.name] || [];
            // if (articlesForArea.length) debugger;
            const opacity = getOpacityByArticleCount(articlesForArea.length);
            layer.setStyle({fillColor: 'red', fillOpacity: opacity, opacity: opacity});
            layer.bindPopup(feature.properties.name + '<BR>' + articlesForArea.length + ' 記事');
        }
    }).addTo(map);
    renderVPTW60(map, getVPTW60OlderThan(new Date('2022-09-19 23:07')));
    // TODO
    L.control.scale({ maxWidth: 200, position: 'topleft', imperial: false }).addTo(map);

    var legend = L.control({ position: 'bottomright' });
    legend.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'info legend');
        div.innerHTML =
            `<div id="legend"><span class="title">NHK記事数</span><br/>`
            + `<span class="note">NHKが公開した災害に関する記事の数です。</span>`
            + `<div style="opacity: 100%">~ 50</div>`
            + `<div style="opacity: 60%">~ 30</div>`
            + `<div style="opacity: 40%">~ 20</div>`
            + `<div style="opacity: 20%">~ 10</div>`
            + `<div style="opacity: 10%">~ 5</div>`
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
