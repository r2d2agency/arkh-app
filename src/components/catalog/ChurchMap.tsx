import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Church {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
  city?: string;
  state?: string;
}

interface ChurchMapProps {
  churches: Church[];
  userLat?: number | null;
  userLng?: number | null;
  onChurchClick?: (id: string) => void;
}

export default function ChurchMap({ churches, userLat, userLng, onChurchClick }: ChurchMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    const geoChurches = churches.filter((c) => c.lat && c.lng);
    const centerLat = userLat ?? (geoChurches.length > 0 ? geoChurches[0].lat! : -14.235);
    const centerLng = userLng ?? (geoChurches.length > 0 ? geoChurches[0].lng! : -51.9253);
    const zoom = userLat ? 12 : geoChurches.length > 0 ? 10 : 4;

    const map = L.map(mapRef.current, {
      center: [centerLat, centerLng],
      zoom,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© OpenStreetMap',
    }).addTo(map);

    // User marker
    if (userLat && userLng) {
      const userIcon = L.divIcon({
        className: "",
        html: `<div style="width:14px;height:14px;background:#3B82F6;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      L.marker([userLat, userLng], { icon: userIcon })
        .addTo(map)
        .bindPopup("Você está aqui");
    }

    // Church markers
    const churchIcon = L.divIcon({
      className: "",
      html: `<div style="width:30px;height:30px;background:hsl(225,65%,52%);border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 21V7.5l-6-4.5-6 4.5V21"/><path d="M12 3v4"/><path d="M9 21v-4h6v4"/></svg>
      </div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    const bounds: L.LatLngExpression[] = [];
    if (userLat && userLng) bounds.push([userLat, userLng]);

    geoChurches.forEach((c) => {
      const marker = L.marker([c.lat!, c.lng!], { icon: churchIcon }).addTo(map);
      marker.bindPopup(`<strong>${c.name}</strong><br/>${c.city || ""}${c.state ? ` - ${c.state}` : ""}`);
      if (onChurchClick) {
        marker.on("click", () => onChurchClick(c.id));
      }
      bounds.push([c.lat!, c.lng!]);
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40], maxZoom: 14 });
    }

    mapInstance.current = map;

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [churches, userLat, userLng, onChurchClick]);

  return <div ref={mapRef} className="w-full h-full rounded-xl" />;
}
