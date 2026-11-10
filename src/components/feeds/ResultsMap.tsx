import { useEffect, useState } from 'react';
import { countryByCode } from '../../data/countries/iso3166';
import { formatMoneyLocal } from '../../lib/money';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import type { Company } from '../../data/types';
import { formatInt, formatMoney } from '../../lib/format';
import { useResults } from '../../store/resultsStore';

const pin = L.divIcon({
  className: '',
  html: '<span style="display:block;width:14px;height:14px;border-radius:50%;background:#4B4291;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.3)"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);

/** UK and Ireland: the default view (spec 3.1). */
const UK_IE_BOUNDS = L.latLngBounds([49.8, -10.8], [59.4, 2.1]);

function Clusters({ results, view }: { results: Company[]; view: 'ukie' | 'all' }) {
  const map = useMap();
  const openProfile = useResults((s) => s.openProfile);
  useEffect(() => {
    // one cluster layer per country, so clusters never merge across borders
    const byCountry = new Map<string, L.MarkerClusterGroup>();
    const groupFor = (code: string) => {
      let g = byCountry.get(code);
      if (!g) { g = L.markerClusterGroup({ chunkedLoading: true, showCoverageOnHover: false, maxClusterRadius: 50 }); byCountry.set(code, g); }
      return g;
    };
    results.forEach((c) => {
      const m = L.marker([c.lat, c.lng], { icon: pin, title: c.name });
      const popup = document.createElement('div');
      popup.innerHTML = `<div style="font-family:'Public Sans',sans-serif;min-width:160px"><div style="font-weight:600;color:#282828;font-size:14px">${esc(c.name)}</div><div style="color:#595959;font-size:13px">${countryByCode(c.country).flag} ${esc(c.headOffice)}, ${esc(countryByCode(c.country).name)}</div><div style="margin-top:4px;font-size:13px">Fundraising total: <strong>${esc(formatMoneyLocal(c, c.fundraisingTotal) || '—')}</strong></div><button style="margin-top:6px;color:#4B4291;text-decoration:underline;font-size:13px">View profile</button></div>`;
      popup.querySelector('button')!.addEventListener('click', () => openProfile(c.id));
      m.bindPopup(popup);
      groupFor(c.country ?? 'GB').addLayer(m);
    });
    byCountry.forEach((g) => map.addLayer(g));
    return () => { byCountry.forEach((g) => map.removeLayer(g)); };
  }, [map, results, openProfile]);
  useEffect(() => {
    if (view === 'ukie') { map.fitBounds(UK_IE_BOUNDS); return; }
    if (!results.length) return;
    const b = L.latLngBounds(results.map((c) => [c.lat, c.lng] as [number, number]));
    if (b.isValid()) map.fitBounds(b, { padding: [30, 30], maxZoom: 9 });
  }, [map, view, results]);
  return null;
}

export function ResultsMap({ results, plural = 'companies' }: { results: Company[]; plural?: string }) {
  const outside = results.filter((c) => c.country !== 'GB' && c.country !== 'IE').length;
  const [view, setView] = useState<'ukie' | 'all'>('ukie');
  const views: ['ukie' | 'all', string][] = [['ukie', 'UK & Ireland'], ['all', 'All results (world)']];
  return (
    <div className="max-w-content mx-auto">
      <div className="flex items-center gap-[12px] mb-[12px]">
        <p className="text-[14px] text-muted">Head offices of the {formatInt(results.length)} {plural} in your search results{outside ? `, ${formatInt(outside)} outside the UK and Ireland` : ''}. Clusters group companies within each country; click one to zoom in.</p>
        <div role="group" aria-label="Map view" className="ml-auto inline-flex border border-primary rounded-btn overflow-hidden divide-x divide-primary shrink-0">
          {views.map(([k, l]) => (
            <button key={k} aria-pressed={view === k} data-map-view={k} onClick={() => setView(k)} className={`h-[28px] px-[12px] text-[13px] font-semibold whitespace-nowrap ${view === k ? 'bg-primary text-white' : 'bg-white text-primary hover:bg-primary-light'}`}>{l}</button>
          ))}
        </div>
      </div>
      <div className="bg-surface border border-border rounded-card overflow-hidden" style={{ height: 620 }}>
        <MapContainer center={[54.3, -4.5]} zoom={5} minZoom={2} worldCopyJump style={{ height: '100%', width: '100%' }} scrollWheelZoom>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Clusters results={results} view={view} />
        </MapContainer>
      </div>
    </div>
  );
}
