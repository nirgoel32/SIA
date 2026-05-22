import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTheme } from "@/lib/theme";

type Props = {
  /** Single point to focus on. */
  point?: { lat: number; lng: number; label?: string };
  /** Two-point route: shows both endpoints and a line between them. */
  route?: {
    from: { lat: number; lng: number; label?: string };
    to: { lat: number; lng: number; label?: string };
  };
  height?: number;
};

/** A real-tile inset map using Leaflet + CARTO dark-matter tiles.
 *  Free public CDN, no API key required. */
const TILE_DARK =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_LIGHT =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

export default function InsetMap({ point, route, height = 220 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const { resolved } = useTheme();

  // Initialize the map once.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;
    const map = L.map(container, {
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false,
      doubleClickZoom: true,
      preferCanvas: false,
      // Leaflet defaults to (0,0) zoom 0 — central Africa — and that flashes
      // through if fitBounds runs before the container has size. Seed a view
      // that's roughly continental so the user never sees the wrong place.
      center: point
        ? [point.lat, point.lng]
        : route
          ? [(route.from.lat + route.to.lat) / 2, (route.from.lng + route.to.lng) / 2]
          : [20, 0],
      zoom: point ? 11 : route ? 3 : 2,
    });
    const url = resolved === "light" ? TILE_LIGHT : TILE_DARK;
    tileLayerRef.current = L.tileLayer(url, {
      subdomains: "abcd",
      maxZoom: 19,
      attribution: "© OpenStreetMap, © CARTO",
    }).addTo(map);

    L.control.attribution({ prefix: false, position: "bottomright" }).addTo(map);

    mapRef.current = map;

    // Force a layout recompute whenever the container actually changes size —
    // catches the case where the map was created inside a panel that hadn't
    // laid out yet (which otherwise leaves Leaflet stuck on the (0,0) world).
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap tile layer on theme change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const url = resolved === "light" ? TILE_LIGHT : TILE_DARK;
    tileLayerRef.current = L.tileLayer(url, {
      subdomains: "abcd",
      maxZoom: 19,
      attribution: "© OpenStreetMap, © CARTO",
    }).addTo(map);
  }, [resolved]);

  // React to point/route changes — pan, fit, and place markers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Force a layout refresh BEFORE fitting bounds — without this, if the
    // container measured 0×0 (e.g. inside a just-mounted AnimatePresence
    // panel) Leaflet falls back to the (0,0) world view = central Africa.
    map.invalidateSize();

    // Clear previous overlays.
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline || layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });

    // Theme-aware accent palette — pulled from the CSS variables we already
    // expose, so changing theme changes these too.
    const styles = getComputedStyle(document.documentElement);
    const rgb = (name: string) =>
      `rgb(${styles.getPropertyValue(name).trim()})`;
    const cyan = rgb("--museum-glow");
    const violet = rgb("--museum-violet");
    const amber = rgb("--museum-amber");
    const bg = rgb("--museum-bg");

    if (route) {
      const from: [number, number] = [route.from.lat, route.from.lng];
      const to: [number, number] = [route.to.lat, route.to.lng];

      L.polyline([from, to], {
        color: cyan,
        weight: 2.5,
        opacity: 0.85,
        dashArray: "6 8",
      }).addTo(map);

      L.circleMarker(from, {
        radius: 6,
        color: cyan,
        weight: 2,
        fillColor: bg,
        fillOpacity: 1,
      })
        .bindTooltip(route.from.label ?? "Origin", {
          permanent: true,
          direction: "top",
          className: "inset-tooltip",
        })
        .addTo(map);
      L.circleMarker(to, {
        radius: 7,
        color: violet,
        weight: 2,
        fillColor: bg,
        fillOpacity: 1,
      })
        .bindTooltip(route.to.label ?? "Destination", {
          permanent: true,
          direction: "top",
          className: "inset-tooltip",
        })
        .addTo(map);

      const bounds = L.latLngBounds([from, to]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 6 });
    } else if (point) {
      const center: [number, number] = [point.lat, point.lng];
      L.circleMarker(center, {
        radius: 9,
        color: amber,
        weight: 2,
        fillColor: amber,
        fillOpacity: 0.4,
      }).addTo(map);
      L.circleMarker(center, {
        radius: 3.5,
        color: bg,
        weight: 1.5,
        fillColor: amber,
        fillOpacity: 1,
      })
        .bindTooltip(point.label ?? "", {
          permanent: true,
          direction: "top",
          className: "inset-tooltip",
        })
        .addTo(map);

      map.setView(center, 11, { animate: true });
    }

    setTimeout(() => map.invalidateSize(), 50);
  }, [point, route, resolved]);

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-lg border border-museum-border/10"
      style={{ height }}
      aria-label="Detailed map of the chapter location"
    />
  );
}
