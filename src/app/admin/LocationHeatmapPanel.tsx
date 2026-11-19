'use client';

import { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import type { AdminMemberLocations } from '@/lib/admin/member-locations';
import { pluralize } from '@/lib/format';

type Audience = keyof Pick<AdminMemberLocations, 'all' | 'sellers' | 'buyers'>;

const AUDIENCES: Audience[] = ['all', 'sellers', 'buyers'];
const PHILIPPINES_CENTER: L.LatLngExpression = [12.8797, 121.774];
const AUDIENCE_LABELS: Record<Audience, string> = {
  all: 'All users',
  sellers: 'Sellers',
  buyers: 'Buyers',
};

type DensityPalette = readonly [string, string, string, string];

const DENSITY_PALETTES: Record<Audience, DensityPalette> = {
  all: ['#fda4af', '#fb7185', '#e11d48', '#9f1239'],
  sellers: ['#fed7aa', '#fdba74', '#f97316', '#9a3412'],
  buyers: ['#bfdbfe', '#60a5fa', '#2563eb', '#1e3a8a'],
};

const AUDIENCE_ACCENTS: Record<Audience, string> = {
  all: '#9f1239',
  sellers: '#9a3412',
  buyers: '#1e3a8a',
};

function getDensityColor(count: number, maxCount: number, audience: Audience): string {
  const density = count / maxCount;
  const palette = DENSITY_PALETTES[audience];
  if (density >= 0.75) return palette[3];
  if (density >= 0.5) return palette[2];
  if (density >= 0.25) return palette[1];
  return palette[0];
}

function formatMemberCount(count: number): string {
  return `${count.toLocaleString()} ${pluralize(count, 'member')}`;
}

function getAreaLabel(name: string, province: string | null): string {
  return province ? `${name}, ${province}` : name;
}

function getAreaKey(name: string, province: string | null): string {
  return `${name}|${province || ''}`;
}

export default function LocationHeatmapPanel({ data }: { data: AdminMemberLocations }) {
  const [audience, setAudience] = useState<Audience>('all');
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const current = data[audience];

  useEffect(() => {
    if (!mapElement.current) return;

    const map = L.map(mapElement.current, {
      center: PHILIPPINES_CENTER,
      zoom: 5,
      minZoom: 4,
      maxZoom: 12,
      zoomControl: false,
      scrollWheelZoom: false,
      keyboard: true,
    });
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    }).addTo(map);
    const markerLayer = L.layerGroup().addTo(map);
    const markers = markersRef.current;
    mapRef.current = map;
    markerLayerRef.current = markerLayer;
    map.whenReady(() => map.invalidateSize());

    return () => {
      markers.clear();
      markerLayerRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !markerLayer) return;

    markerLayer.clearLayers();
    markersRef.current.clear();
    const maxCount = current.areas[0]?.count ?? 1;
    for (const area of current.areas) {
      const label = getAreaLabel(area.name, area.province);
      const marker = L.circleMarker([area.lat, area.lng], {
        radius: Math.min(20, 6 + Math.sqrt(area.count) * 2),
        color: AUDIENCE_ACCENTS[audience],
        weight: 1.5,
        fillColor: getDensityColor(area.count, maxCount, audience),
        fillOpacity: 0.86,
      });
      const tooltip = document.createElement('span');
      tooltip.textContent = `${label}: ${formatMemberCount(area.count)}`;
      marker.bindTooltip(tooltip, { direction: 'top', offset: [0, -8] });
      marker.on('click', () => {
        map.setView(marker.getLatLng(), Math.max(map.getZoom(), 8));
        marker.openTooltip();
      });
      marker.addTo(markerLayer);
      markersRef.current.set(getAreaKey(area.name, area.province), marker);
    }

    if (current.areas.length > 0) {
      const bounds = L.latLngBounds(current.areas.map((area) => L.latLng(area.lat, area.lng)));
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 7 });
    } else {
      map.setView(PHILIPPINES_CENTER, 5);
    }
  }, [current, audience]);

  function focusArea(name: string, province: string | null) {
    const marker = markersRef.current.get(getAreaKey(name, province));
    if (!marker || !mapRef.current) return;
    mapRef.current.setView(marker.getLatLng(), Math.max(mapRef.current.getZoom(), 8));
    marker.openTooltip();
  }

  const topAreas = current.areas.slice(0, 6);

  return (
    <div className='admin-heatmap-panel'>
      <div className='admin-heatmap-header'>
        {data.migrationWarning && (
          <p className='admin-heatmap-migration-warning' role='status'>
            Location coordinates are not set up in the database yet. This map is using legacy location data; apply
            {' '}<code>supabase/14_location_coordinates.sql</code> to enable saved coordinates and cached geocoding.
          </p>
        )}
        <div className='admin-heatmap-toolbar'>
          <div className='admin-heatmap-switch' role='group' aria-label='Choose user group to display'>
            {AUDIENCES.map((option) => (
              <button
                type='button'
                key={option}
                aria-pressed={audience === option}
                className={audience === option ? 'is-active' : ''}
                data-audience={option}
                onClick={() => setAudience(option)}
                aria-label={`Show ${AUDIENCE_LABELS[option]}: ${formatMemberCount(data[option].totalPeople)}`}
                title={`${AUDIENCE_LABELS[option]}: ${formatMemberCount(data[option].totalPeople)}`}
              >
                <span>{AUDIENCE_LABELS[option]}</span>
                <span className='admin-heatmap-switch-count' aria-hidden='true'>
                  {data[option].totalPeople.toLocaleString()}
                </span>
              </button>
            ))}
          </div>
          <div className='admin-heatmap-summary' aria-live='polite'>
            <strong>{current.totalPeople.toLocaleString()}</strong>
            <span>
              {audience === 'all'
                ? 'active members'
                : audience === 'sellers'
                  ? 'members with listings'
                  : 'members with completed purchases'}
            </span>
          </div>
        </div>
      </div>

      <div className='admin-heatmap-content'>
        <div className='admin-heatmap-map-shell'>
          <div
            ref={mapElement}
            className='admin-heatmap-map'
            role='region'
            aria-label={`Interactive map of approximate ${audience} locations`}
          />
          {current.areas.length === 0 && (
            <p className='admin-heatmap-map-empty' role='status'>
              No mapped locations are available yet.
            </p>
          )}
        </div>

        <aside className='admin-heatmap-breakdown' aria-label={`Top ${audience} locations`}>
          <div className='admin-heatmap-breakdown-heading'>
            <strong>Top locations</strong>
            <span>{current.areas.length} shown</span>
          </div>
          {topAreas.length > 0 ? (
            <ol className='admin-heatmap-location-list'>
              {topAreas.map((area) => (
                <li key={getAreaKey(area.name, area.province)}>
                  <button
                    type='button'
                    className='admin-heatmap-location-button'
                    onClick={() => focusArea(area.name, area.province)}
                    aria-label={`Zoom to ${getAreaLabel(area.name, area.province)}, ${formatMemberCount(area.count)}`}
                  >
                    <span className='admin-heatmap-location-copy'>
                      <strong>{getAreaLabel(area.name, area.province)}</strong>
                      <span>{formatMemberCount(area.count)}</span>
                    </span>
                    <span className='admin-heatmap-location-track' aria-hidden='true'>
                      <span
                        style={{
                          width: `${(area.count / topAreas[0].count) * 100}%`,
                          backgroundColor: AUDIENCE_ACCENTS[audience],
                        }}
                      />
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className='admin-heatmap-empty'>
              Mapped locations will appear here when city coordinates are available.
            </p>
          )}
        </aside>
      </div>

      <div className='admin-heatmap-footer'>
        <div className='admin-heatmap-legend' aria-label={`Map marker density for ${AUDIENCE_LABELS[audience]}`}>
          <span>Fewer members</span>
          <span
            className='admin-heatmap-legend-scale'
            aria-hidden='true'
            style={{
              background: `linear-gradient(90deg, ${DENSITY_PALETTES[audience][0]}, ${DENSITY_PALETTES[audience][1]}, ${DENSITY_PALETTES[audience][2]}, ${DENSITY_PALETTES[audience][3]})`,
            }}
          />
          <span>More members</span>
        </div>
        <details className='admin-heatmap-unmapped'>
          <summary>
            Unmapped locations · {formatMemberCount(current.unmappedPeople)}
          </summary>
          {current.unmapped.length > 0 ? (
            <ul>
              {current.unmapped.map((area) => (
                <li key={area.name}>
                  <span>{area.name}</span>
                  <span>{formatMemberCount(area.count)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>All saved location labels are mapped.</p>
          )}
        </details>

        <p className='admin-heatmap-privacy'>
          One account may be both a buyer and seller. Buyers have completed purchases; sellers have created listings.
          {' '}The All view counts each active account once. Approximate city-level markers are shown when coordinates are available.
        </p>
      </div>
    </div>
  );
}
