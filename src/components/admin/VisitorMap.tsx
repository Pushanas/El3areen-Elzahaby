import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Globe,
  Radio,
  ExternalLink,
  Copy,
  Check,
  Smartphone,
  Battery,
  Zap,
  ShieldAlert,
  Search,
  Filter,
  Layers,
  Compass,
  Navigation,
} from 'lucide-react';

export interface MapVisitorMarker {
  id: string;
  ip: string;
  country: string;
  countryCode: string;
  flag: string;
  city: string;
  region?: string;
  isp?: string;
  latitude: number;
  longitude: number;
  isGps: boolean;
  gpsAccuracy?: number;
  deviceModel: string;
  deviceOs: string;
  browser: string;
  screen?: string;
  battery?: number;
  isCharging?: boolean;
  lastSeenAt: string;
  lastHeartbeatAt: string;
  lastPage: string;
  isActive: boolean;
  blocked: boolean;
  note?: string;
}

interface VisitorMapProps {
  markers: MapVisitorMarker[];
  onToggleBlock?: (visitorId: string) => void;
  selectedVisitorId?: string | null;
  onSelectVisitor?: (visitor: MapVisitorMarker | null) => void;
}

export const VisitorMap: React.FC<VisitorMapProps> = ({
  markers,
  onToggleBlock,
  selectedVisitorId,
  onSelectVisitor,
}) => {
  const [filterActiveOnly, setFilterActiveOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mapLayer, setMapLayer] = useState<'osm' | 'satellite'>('osm');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Active or selected marker
  const [activeMarker, setActiveMarker] = useState<MapVisitorMarker | null>(null);

  useEffect(() => {
    if (selectedVisitorId) {
      const found = markers.find((m) => m.id === selectedVisitorId);
      if (found) setActiveMarker(found);
    } else if (markers.length > 0 && !activeMarker) {
      setActiveMarker(markers[0]);
    }
  }, [selectedVisitorId, markers]);

  // Filter markers
  const filteredMarkers = useMemo(() => {
    return markers.filter((m) => {
      if (filterActiveOnly && !m.isActive) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          m.ip.toLowerCase().includes(q) ||
          m.city.toLowerCase().includes(q) ||
          m.country.toLowerCase().includes(q) ||
          m.deviceModel.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [markers, filterActiveOnly, searchQuery]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 1800);
  };

  // Center coordinates
  const currentCenter = useMemo(() => {
    if (activeMarker) {
      return { lat: activeMarker.latitude, lng: activeMarker.longitude };
    }
    if (filteredMarkers.length > 0) {
      return { lat: filteredMarkers[0].latitude, lng: filteredMarkers[0].longitude };
    }
    return { lat: 30.0444, lng: 31.2357 }; // Cairo default
  }, [activeMarker, filteredMarkers]);

  // OpenStreetMap embed URL with marker
  const mapIframeUrl = useMemo(() => {
    const lat = currentCenter.lat;
    const lng = currentCenter.lng;
    const delta = activeMarker?.isGps ? 0.015 : 0.08;
    const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;

    if (mapLayer === 'satellite') {
      // ESRI / Google Satellite view via standard embed
      return `https://maps.google.com/maps?q=${lat},${lng}&t=k&z=14&ie=UTF8&iwloc=&output=embed`;
    }

    // OpenStreetMap view with custom marker
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  }, [currentCenter, mapLayer, activeMarker]);

  return (
    <div className="space-y-4">
      {/* Map Control Bar */}
      <div className="bg-[#100c07] border border-[#d4af37]/25 rounded-2xl p-3 md:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#1c150a] border border-[#d4af37]/35 flex items-center justify-center text-[#ffd700]">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#ffd700] flex items-center gap-2">
              <span>رادار الخريطة الجغرافية والأجهزة المرصودة</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#d4af37]/15 text-[#ffd700] border border-[#d4af37]/30">
                {filteredMarkers.length} موقع
              </span>
            </h3>
            <p className="text-[11px] text-[#8e7e60]">
              رصد حي مباشر لمواقع عناوين IP وإحداثيات GPS ونماذج الهواتف الذكية المتصلة
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2">
          {/* Active Only Filter */}
          <button
            type="button"
            onClick={() => setFilterActiveOnly(!filterActiveOnly)}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              filterActiveOnly
                ? 'bg-[#183318] text-[#4ade80] border-[#22c55e]/50 shadow-[0_0_12px_rgba(34,197,94,0.2)]'
                : 'bg-[#140e08] text-[#8e7e60] border-[#291e0d] hover:text-[#ffd700]'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${filterActiveOnly ? 'animate-pulse text-[#4ade80]' : ''}`} />
            <span>النشطون الآن فقط</span>
          </button>

          {/* Map Layer Switch */}
          <button
            type="button"
            onClick={() => setMapLayer(mapLayer === 'osm' ? 'satellite' : 'osm')}
            className="py-1.5 px-3 rounded-xl text-xs font-bold bg-[#140e08] text-[#ffd700] border border-[#d4af37]/30 hover:bg-[#1f170c] flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{mapLayer === 'osm' ? 'خريطة الشوارع' : 'قمر صناعي'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Map + Right Visitor Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Map View Area (7 cols on Desktop) */}
        <div className="lg:col-span-7 bg-[#0a0704] border border-[#d4af37]/25 rounded-2xl overflow-hidden flex flex-col min-h-[420px] md:min-h-[500px] relative shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
          {/* Top Floating Badge on Map */}
          <div className="absolute top-3 left-3 z-10 bg-[#080705]/85 backdrop-blur-md border border-[#d4af37]/35 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs text-[#ffd700] shadow-lg">
            <Navigation className="w-3.5 h-3.5 text-[#ffd700] animate-pulse" />
            <span className="font-mono text-[11px]">
              {activeMarker ? `${activeMarker.city} · ${activeMarker.country}` : 'خريطة الرصد'}
            </span>
            {activeMarker?.isGps && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#22c55e]/25 text-[#4ade80] border border-[#22c55e]/40">
                GPS دقيق
              </span>
            )}
          </div>

          {/* Interactive Map Frame */}
          <div className="w-full h-full flex-1 relative bg-[#040302]">
            <iframe
              title="Visitor Geolocation Radar"
              src={mapIframeUrl}
              className="w-full h-full min-h-[420px] md:min-h-[500px] border-0 filter contrast-105"
              loading="lazy"
            />
          </div>

          {/* Quick Footer Toolbar below map */}
          <div className="bg-[#100c07] border-t border-[#d4af37]/20 p-2.5 px-4 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-[#8e7e60]">
              <span>إحداثيات المركز:</span>
              <span className="font-mono text-[#ffd700]">
                {currentCenter.lat.toFixed(4)}, {currentCenter.lng.toFixed(4)}
              </span>
            </div>

            {activeMarker && (
              <div className="flex items-center gap-2">
                <a
                  href={`https://www.google.com/maps?q=${activeMarker.latitude},${activeMarker.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-1 px-2.5 rounded-lg bg-[#1a140a] hover:bg-[#281e0f] text-[#ffd700] border border-[#d4af37]/30 flex items-center gap-1.5 transition-colors cursor-pointer text-[11px] font-bold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>فتح في Google Maps</span>
                </a>

                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `${activeMarker.latitude}, ${activeMarker.longitude}`,
                      'coords'
                    )
                  }
                  className="py-1 px-2.5 rounded-lg bg-[#140e08] hover:bg-[#20170a] text-[#cfb780] border border-[#d4af37]/20 flex items-center gap-1 transition-colors cursor-pointer text-[11px]"
                >
                  {copiedText === 'coords' ? (
                    <Check className="w-3.5 h-3.5 text-[#22c55e]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>نسخ الإحداثيات</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Visitor Cards & Telemetry Dossier (5 cols on Desktop) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#8e7e60] absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالـ IP، المدينة، أو موديل الهاتف..."
              className="w-full py-2 pr-9 pl-3 rounded-xl bg-[#0f0b07] border border-[#d4af37]/25 text-white text-xs placeholder:text-[#6a5b41] focus:outline-none focus:border-[#ffd700]"
            />
          </div>

          {/* Active Marker Full Telemetry Card */}
          {activeMarker ? (
            <div className="bg-[#120d08] border border-[#d4af37]/40 rounded-2xl p-4 space-y-3.5 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4af37]/5 rounded-full blur-2xl pointer-events-none" />

              {/* Header: Flag, City, Status */}
              <div className="flex items-start justify-between gap-2 border-b border-[#d4af37]/15 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{activeMarker.flag}</span>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>{activeMarker.city}</span>
                      <span className="text-xs text-[#ffd700]">· {activeMarker.country}</span>
                    </h4>
                    <span className="text-[11px] font-mono text-[#8e7e60] block">
                      {activeMarker.ip}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                      activeMarker.isActive
                        ? 'bg-[#183318] text-[#4ade80] border-[#22c55e]/40'
                        : 'bg-[#1a140a] text-[#8e7e60] border-[#312513]'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        activeMarker.isActive ? 'bg-[#22c55e] animate-ping' : 'bg-[#6b5a3e]'
                      }`}
                    />
                    <span>{activeMarker.isActive ? 'متصل الآن' : 'غير متصل'}</span>
                  </span>

                  {activeMarker.blocked && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#3b1212] text-[#f87171] border border-[#ef4444]/40">
                      محظور
                    </span>
                  )}
                </div>
              </div>

              {/* Phone & Hardware Specs */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#18110a] border border-[#d4af37]/15 rounded-xl p-2.5">
                  <div className="flex items-center gap-1.5 text-[#8e7e60] text-[10px] mb-1">
                    <Smartphone className="w-3.5 h-3.5 text-[#ffd700]" />
                    <span>الهاتف المرصود</span>
                  </div>
                  <span className="font-bold text-white block text-[11px] truncate" title={activeMarker.deviceModel}>
                    {activeMarker.deviceModel}
                  </span>
                  <span className="text-[10px] text-[#cfb780] font-mono block">
                    {activeMarker.deviceOs}
                  </span>
                </div>

                <div className="bg-[#18110a] border border-[#d4af37]/15 rounded-xl p-2.5">
                  <div className="flex items-center gap-1.5 text-[#8e7e60] text-[10px] mb-1">
                    <Globe className="w-3.5 h-3.5 text-[#38bdf8]" />
                    <span>مزود الإنترنت (ISP)</span>
                  </div>
                  <span className="font-bold text-white block text-[11px] truncate" title={activeMarker.isp}>
                    {activeMarker.isp || 'مزود محلي'}
                  </span>
                  <span className="text-[10px] text-[#cfb780] block truncate">
                    {activeMarker.browser}
                  </span>
                </div>

                {/* Battery & Screen */}
                <div className="bg-[#18110a] border border-[#d4af37]/15 rounded-xl p-2.5">
                  <div className="flex items-center gap-1.5 text-[#8e7e60] text-[10px] mb-1">
                    <Battery className="w-3.5 h-3.5 text-[#22c55e]" />
                    <span>شحن البطارية</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-white text-[12px]">
                      {typeof activeMarker.battery === 'number' ? `${activeMarker.battery}%` : 'غير متاح'}
                    </span>
                    {activeMarker.isCharging && (
                      <span title="قيد الشحن الآن" className="inline-flex items-center">
                        <Zap className="w-3.5 h-3.5 text-[#ffd700] animate-bounce" />
                      </span>
                    )}
                  </div>
                </div>

                {/* GPS Coordinates & Accuracy */}
                <div className="bg-[#18110a] border border-[#d4af37]/15 rounded-xl p-2.5">
                  <div className="flex items-center gap-1.5 text-[#8e7e60] text-[10px] mb-1">
                    <MapPin className="w-3.5 h-3.5 text-[#ef4444]" />
                    <span>{activeMarker.isGps ? 'موقع GPS حي' : 'تقريب IP'}</span>
                  </div>
                  <span className="font-mono text-[11px] text-[#ffd700] block truncate">
                    {activeMarker.latitude.toFixed(4)}, {activeMarker.longitude.toFixed(4)}
                  </span>
                  {activeMarker.gpsAccuracy && (
                    <span className="text-[9px] text-[#8e7e60] block font-mono">
                      دقة: ±{activeMarker.gpsAccuracy} متر
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons on Visitor */}
              <div className="flex items-center gap-2 pt-1">
                {onToggleBlock && (
                  <button
                    type="button"
                    onClick={() => onToggleBlock(activeMarker.id)}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      activeMarker.blocked
                        ? 'bg-[#183318] text-[#4ade80] border-[#22c55e]/40 hover:bg-[#204420]'
                        : 'bg-[#2b1212] text-[#f87171] border-[#ef4444]/40 hover:bg-[#3d1a1a]'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>{activeMarker.blocked ? 'فك حظر الهاتف' : 'حظر هذا الهاتف/IP'}</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-[#100c07] border border-[#d4af37]/20 rounded-2xl p-6 text-center text-xs text-[#8e7e60]">
              حدد موقعاً أو زائراً من القائمة لعرض ملف الهاتف والرصد
            </div>
          )}

          {/* List of Other Markers to Click */}
          <div className="bg-[#100c07] border border-[#d4af37]/25 rounded-2xl p-3 space-y-2 max-h-[220px] overflow-y-auto">
            <span className="text-[11px] font-bold text-[#8e7e60] block mb-1">
              المواقع المرصودة ({filteredMarkers.length})
            </span>

            {filteredMarkers.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setActiveMarker(m);
                  if (onSelectVisitor) onSelectVisitor(m);
                }}
                className={`w-full text-right p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all cursor-pointer ${
                  activeMarker?.id === m.id
                    ? 'bg-[#22180a] border-[#ffd700] text-white'
                    : 'bg-[#140e08] border-[#291e0d] text-[#cfb780] hover:border-[#d4af37]/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{m.flag}</span>
                  <div>
                    <span className="font-bold text-white block text-[11px]">
                      {m.city} · {m.country}
                    </span>
                    <span className="text-[10px] text-[#8e7e60] font-mono block">
                      {m.deviceModel}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-[#d4af37]">{m.ip}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      m.isActive ? 'bg-[#22c55e]' : 'bg-[#55462e]'
                    }`}
                  />
                </div>
              </button>
            ))}

            {filteredMarkers.length === 0 && (
              <div className="text-center py-4 text-xs text-[#8e7e60]">
                لا توجد مواقع تطابق البحث حالياً
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
