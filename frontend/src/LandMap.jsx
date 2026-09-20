import { useEffect, useRef, useState } from "react";

const DEFAULT_CENTER = { lat: 18.9892, lng: 73.1175 };

let googleMapsPromise = null;

function loadGoogleMaps() {
  if (window.google?.maps?.importLibrary) {
    return Promise.resolve(window.google.maps);
  }

  if (googleMapsPromise) return googleMapsPromise;

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return Promise.reject(
      new Error("VITE_GOOGLE_MAPS_API_KEY is not configured.")
    );
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(
      'script[data-landchain-google-maps="true"]'
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(window.google.maps));
      existing.addEventListener("error", () =>
        reject(new Error("Google Maps failed to load."))
      );
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://maps.googleapis.com/maps/api/js?key=" +
      encodeURIComponent(apiKey) +
      "&loading=async&v=weekly";
    script.async = true;
    script.defer = true;
    script.dataset.landchainGoogleMaps = "true";

    script.onload = () => resolve(window.google.maps);
    script.onerror = () =>
      reject(new Error("Google Maps failed to load. Check the API key and billing configuration."));

    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

export default function LandMap({
  points = [],
  onChange,
  readOnly = false,
  center,
  height = 380,
}) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const polygonRef = useRef(null);
  const geometryRef = useRef(null);
  const pointsRef = useRef(points);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    pointsRef.current = points;
    onChangeRef.current = onChange;
  }, [points, onChange]);
  const [mapError, setMapError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setMapError("");

        const googleMaps = await loadGoogleMaps();
        if (cancelled || !mapElementRef.current) return;

        const { Map } = await googleMaps.importLibrary("maps");
        const { Polygon } = await googleMaps.importLibrary("maps");
        const { spherical } = await googleMaps.importLibrary("geometry");

        geometryRef.current = spherical;

        const initialCenter =
          points.length > 0
            ? points[0]
            : center || DEFAULT_CENTER;

        const map = new Map(mapElementRef.current, {
          center: initialCenter,
          zoom: points.length ? 17 : 15,
          mapTypeId: "satellite",
          streetViewControl: false,
          fullscreenControl: true,
          mapTypeControl: true,
          clickableIcons: false,
          disableDoubleClickZoom: true,
        });

        mapRef.current = map;

        polygonRef.current = new Polygon({
          paths: points,
          map,
          clickable: false,
          strokeOpacity: 0.95,
          strokeWeight: 3,
          fillOpacity: 0.25,
        });

        if (!readOnly) {
          map.addListener("click", (event) => {
            if (!event.latLng) return;

            const next = [
              ...pointsRef.current,
              {
                lat: Number(event.latLng.lat().toFixed(7)),
                lng: Number(event.latLng.lng().toFixed(7)),
              },
            ];

            onChangeRef.current?.(next);
          });
        }
      } catch (error) {
        console.error(error);
        setMapError(error.message || "Unable to load Google Maps.");
      }
    }

    init();

    return () => {
      cancelled = true;
      if (polygonRef.current) {
        polygonRef.current.setMap(null);
        polygonRef.current = null;
      }
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !polygonRef.current) return;

    polygonRef.current.setPath(points);

    if (points.length > 0) {
      mapRef.current.panTo(points[points.length - 1]);
    }
  }, [points]);

  const areaSqM =
    points.length >= 3 && geometryRef.current
      ? geometryRef.current.computeArea(points)
      : 0;

  const areaAcres = areaSqM / 4046.8564224;

  return (
    <div className="land-map-wrapper">
      {mapError ? (
        <div className="land-map-error">
          <strong>Google Map unavailable</strong>
          <p>{mapError}</p>
          {!import.meta.env.VITE_GOOGLE_MAPS_API_KEY && (
            <small>
              Add VITE_GOOGLE_MAPS_API_KEY to the frontend environment variables.
            </small>
          )}
        </div>
      ) : (
        <div
          ref={mapElementRef}
          className="land-map"
          style={{ height: `${height}px` }}
        />
      )}

      {!readOnly && !mapError && (
        <div className="land-map-controls">
          <span>
            {points.length < 3
              ? `Click the map to add boundary points (${points.length}/3 minimum)`
              : `${points.length} boundary points selected`}
          </span>

          <button
            type="button"
            className="map-clear-button"
            onClick={() => onChange?.([])}
            disabled={points.length === 0}
          >
            Clear Boundary
          </button>
        </div>
      )}

      {points.length >= 3 && (
        <div className="land-area-summary">
          <span>CALCULATED AREA</span>
          <strong>{areaSqM.toFixed(2)} m²</strong>
          <strong>{areaAcres.toFixed(4)} acres</strong>
        </div>
      )}
    </div>
  );
}
