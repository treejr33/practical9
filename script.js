// --- Base map ---
const map = new ol.Map({
  target: 'map',
  layers: [
    new ol.layer.Tile({ source: new ol.source.OSM(), visible: true })
  ],
  view: new ol.View({
    center: ol.proj.fromLonLat([-98.5795, 39.8283]), // US center
    zoom: 4
  })
});

// --- Vector layers (keep your original sources/urls) ---
const layer1 = new ol.layer.Vector({
  title: 'Counties',
  source: new ol.source.Vector({
    url: 'gz_2010_us_050_00_500k.json',
    format: new ol.format.GeoJSON({ dataProjection: 'EPSG:4326' })
  }),
  style: new ol.style.Style({
    stroke: new ol.style.Stroke({ color: '#0f172a', width: 0.75 }),
    fill: new ol.style.Fill({ color: 'rgba(37, 99, 235, 0.10)' }) // blue-500 @10%
  }),
  visible: true
});

const layer2 = new ol.layer.Vector({
  title: 'Data',
  source: new ol.source.Vector({
    url: 'data.geojson',
    format: new ol.format.GeoJSON({ dataProjection: 'EPSG:4326' })
  }),
  style: (feature) => {
    // Example choropleth by 'unemployment_rate'
    const rate = Number(feature.get('unemployment_rate')) || 0;
    let fill = 'rgba(16, 185, 129, 0.45)'; // green-500
    if (rate > 5) fill = 'rgba(250, 204, 21, 0.55)'; // yellow-400
    if (rate > 10) fill = 'rgba(239, 68, 68, 0.55)'; // red-500
    return new ol.style.Style({
      stroke: new ol.style.Stroke({ color: '#111827', width: 0.6 }),
      fill: new ol.style.Fill({ color: fill })
    });
  },
  visible: true
});

map.addLayer(layer1);
map.addLayer(layer2);

// --- UI bindings (filters) ---
const layer1Checkbox = document.getElementById('layer1');
const layer2Checkbox = document.getElementById('layer2');

if (layer1Checkbox) {
  layer1Checkbox.addEventListener('change', (e) => layer1.setVisible(e.target.checked));
}
if (layer2Checkbox) {
  layer2Checkbox.addEventListener('change', (e) => layer2.setVisible(e.target.checked));
}

// --- Highlight Layer ---
const highlightSource = new ol.source.Vector();
const highlightLayer = new ol.layer.Vector({
  source: highlightSource,
  style: new ol.style.Style({
    stroke: new ol.style.Stroke({ color: '#7b3af5', width: 2 }),
    fill: new ol.style.Fill({ color: 'rgba(123, 58, 245, 0.15)' })
  })
});
map.addLayer(highlightLayer);

// --- Inspector helpers ---
const elLonLat = document.getElementById('lonlat');
const elInfo = document.getElementById('feature-info');
const btnClear = document.getElementById('clearSelection');

function renderLonLatFromCoordinate(coord3857) {
  if (!coord3857) return;
  const [lon, lat] = ol.proj.toLonLat(coord3857);
  elLonLat.textContent = `${lon.toFixed(5)}, ${lat.toFixed(5)}`;
}

function renderFeatureInfo(feature) {
  if (!feature) {
    elInfo.innerHTML = '<div class="empty-state">Click a map feature to view its attributes.</div>';
    return;
  }
  const props = feature.getProperties();
  const rows = Object.keys(props)
    .filter(k => k !== 'geometry' && props[k] !== null && props[k] !== undefined)
    .map(k => {
      const v = typeof props[k] === 'object' ? JSON.stringify(props[k]) : String(props[k]);
      return `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`;
    })
    .join('');
  elInfo.innerHTML = rows ? `<table>${rows}</table>` : '<div class="empty-state">No attributes to display.</div>';
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;'}[m]));
}

function highlightFeature(feature) {
  highlightSource.clear();
  if (!feature) return;
  // Clone to avoid mutating original
  const clone = feature.clone();
  clone.setId(feature.getId?.() ?? undefined);
  highlightSource.addFeature(clone);
}

// --- Map interactions ---
map.on('pointermove', (evt) => {
  const hit = map.hasFeatureAtPixel(evt.pixel, { layerFilter: l => l === layer1 || l === layer2 });
  document.querySelector('.map-wrap')?.classList.toggle('cursor-pointer', !!hit);
});

map.on('singleclick', (evt) => {
  let picked = null;
  map.forEachFeatureAtPixel(
    evt.pixel,
    (feature, layer) => {
      if (layer === layer1 || layer === layer2) {
        picked = feature;
        return true; // stop after first hit
      }
    },
    { hitTolerance: 3 }
  );

  renderLonLatFromCoordinate(evt.coordinate);
  renderFeatureInfo(picked);
  highlightFeature(picked);
});

if (btnClear) {
  btnClear.addEventListener('click', () => {
    elLonLat.textContent = '—';
    renderFeatureInfo(null);
    highlightSource.clear();
  });
}
