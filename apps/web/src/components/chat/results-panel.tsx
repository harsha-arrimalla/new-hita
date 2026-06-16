"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Star,
  Clock,
  Phone,
  Globe,
  MapPin,
  Navigation,
  ChevronLeft,
  Sparkles,
  Lightbulb,
} from "lucide-react";
import type { PlaceData } from "./place-card";

/* ── Types ── */
interface PlaceDetailsResponse {
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  totalRatings?: number;
  priceLevel?: number;
  isOpen?: boolean;
  phone?: string;
  website?: string;
  photoUrls: string[];
  weekdayHours?: string[];
  reviews?: { author: string; rating: number; text: string; time: number }[];
  editorialSummary?: string;
  insights: { history: string; thingsToDo: string[]; timeSuggestion: string; vibe: string };
  nearby: { name: string; placeId: string; rating?: number; types: string[]; photoUrl?: string; address: string }[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

/* ── Google Maps embed helpers ── */
function gmapView(lat: number, lng: number, zoom = 15): string {
  return `https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`;
}
function gmapPlace(name: string, lat: number, lng: number): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(name)}&ll=${lat},${lng}&z=16&output=embed`;
}

/* ══════════════════════════════════════════════════════════════
   GMap — full iframe
   ══════════════════════════════════════════════════════════════ */
function GMap({ src }: { src: string }) {
  return (
    <iframe
      key={src}
      title="Map"
      className="absolute inset-0 h-full w-full"
      style={{ border: 0 }}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen
      src={src}
    />
  );
}

/* ══════════════════════════════════════════════════════════════
   ActivityPanel — Column 2
   Only rendered when a place is selected. Shows place details.
   ══════════════════════════════════════════════════════════════ */
export function ActivityPanel({
  selectedPlace,
  onClose,
  onMapSrcChange,
}: {
  selectedPlace: PlaceData | null;
  onClose: () => void;
  onMapSrcChange?: (src: string) => void;
}) {
  if (!selectedPlace) return null;

  return (
    <PlaceDetailView
      place={selectedPlace}
      onBack={onClose}
      onMapUpdate={onMapSrcChange}
    />
  );
}

/* ══════════════════════════════════════════════════════════════
   PlaceDetailView — full detail for a selected place
   ══════════════════════════════════════════════════════════════ */
function PlaceDetailView({
  place,
  onBack,
  onMapUpdate,
}: {
  place: PlaceData;
  onBack: () => void;
  onMapUpdate?: (src: string) => void;
}) {
  const [details, setDetails] = useState<PlaceDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!place.placeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`${API_URL}/places/${encodeURIComponent(place.placeId)}`)
      .then((r) => r.json())
      .then((data) => setDetails(data as PlaceDetailsResponse))
      .catch(() => setDetails(null))
      .finally(() => setLoading(false));
  }, [place.placeId]);

  // Update map when detail loads
  const stableOnMapUpdate = useCallback(
    (src: string) => onMapUpdate?.(src),
    [onMapUpdate]
  );

  useEffect(() => {
    const lat = details?.lat ?? place.lat;
    const lng = details?.lng ?? place.lng;
    if (lat && lng) {
      stableOnMapUpdate(gmapPlace(place.name, lat, lng));
    }
  }, [details?.lat, details?.lng, place.lat, place.lng, place.name, stableOnMapUpdate]);

  const photos = details?.photoUrls || (place.image ? [place.image] : []);
  const priceLabel = details?.priceLevel ? "₹".repeat(details.priceLevel) : place.priceLevel;
  const todayHours = details?.weekdayHours
    ? details.weekdayHours[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]
    : null;

  return (
    <div className="flex h-full flex-col bg-canvas">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border-hairline px-5 py-3">
        <button
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-hover transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-ink" />
        </button>
        <h2 className="font-[family-name:var(--font-display)] text-[18px] text-ink truncate">
          {place.name}
        </h2>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Hero image */}
        {photos.length > 0 && (
          <div className="relative overflow-hidden">
            <img src={photos[0]} alt={place.name} className="h-[200px] w-full object-cover transition-transform duration-700 hover:scale-105" />
            {details?.insights.vibe && (
              <div className="absolute top-3 left-3 rounded-full bg-black/50 backdrop-blur-sm px-3 py-1">
                <span className="font-[family-name:var(--font-body)] text-[12px] font-medium text-on-dark">
                  {details.insights.vibe}
                </span>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="px-5 py-4 space-y-4 animate-fade-in">
            {/* Skeleton: rating row */}
            <div className="flex items-center gap-3">
              <div className="skeleton h-5 w-12 rounded-full" />
              <div className="skeleton h-4 w-16 rounded-full" />
              <div className="skeleton h-5 w-16 rounded-full" />
            </div>
            {/* Skeleton: address lines */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="skeleton h-4 w-4 rounded" />
                <div className="skeleton h-3.5 w-48" />
              </div>
              <div className="flex items-center gap-2">
                <div className="skeleton h-4 w-4 rounded" />
                <div className="skeleton h-3.5 w-36" />
              </div>
              <div className="flex items-center gap-2">
                <div className="skeleton h-4 w-4 rounded" />
                <div className="skeleton h-3.5 w-28" />
              </div>
            </div>
            {/* Skeleton: button */}
            <div className="skeleton h-12 w-full rounded-xl" />
            {/* Skeleton: insight card */}
            <div className="skeleton h-24 w-full rounded-xl" />
            {/* Skeleton: about section */}
            <div className="space-y-2">
              <div className="skeleton h-5 w-32" />
              <div className="skeleton h-3.5 w-full" />
              <div className="skeleton h-3.5 w-4/5" />
              <div className="skeleton h-3.5 w-3/5" />
            </div>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-5 animate-fade-up-sm">
            {/* Rating / price / status */}
            <div className="flex flex-wrap items-center gap-3">
              {(details?.rating || place.rating) && (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-ink text-ink" />
                  <span className="font-[family-name:var(--font-body)] text-[15px] font-bold text-ink">
                    {details?.rating || place.rating}
                  </span>
                  {(details?.totalRatings || place.reviewCount) && (
                    <span className="font-[family-name:var(--font-body)] text-[13px] text-text-secondary">
                      ({details?.totalRatings?.toLocaleString() || place.reviewCount})
                    </span>
                  )}
                </div>
              )}
              {priceLabel && (
                <span className="font-[family-name:var(--font-body)] text-[13px] font-medium text-ink">
                  {priceLabel}
                </span>
              )}
              {details?.isOpen != null && (
                <span
                  className={`rounded-full px-2 py-0.5 font-[family-name:var(--font-body)] text-[11px] font-semibold ${details.isOpen ? "bg-tint text-ink" : "bg-tint text-tertiary"}`}
                >
                  {details.isOpen ? "Open now" : "Closed"}
                </span>
              )}
            </div>

            {/* Contact info */}
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-text-secondary" />
                <span className="font-[family-name:var(--font-body)] text-[13px] text-text-secondary">
                  {details?.address || place.location}
                </span>
              </div>
              {todayHours && (
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 mt-0.5 shrink-0 text-text-secondary" />
                  <span className="font-[family-name:var(--font-body)] text-[13px] text-text-secondary">
                    {todayHours}
                  </span>
                </div>
              )}
              {details?.phone && (
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 mt-0.5 shrink-0 text-text-secondary" />
                  <a
                    href={`tel:${details.phone}`}
                    className="font-[family-name:var(--font-body)] text-[13px] text-ink hover:underline"
                  >
                    {details.phone}
                  </a>
                </div>
              )}
              {details?.website && (
                <div className="flex items-start gap-2">
                  <Globe className="h-4 w-4 mt-0.5 shrink-0 text-text-secondary" />
                  <a
                    href={details.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-[family-name:var(--font-body)] text-[13px] text-ink hover:underline truncate"
                  >
                    {new URL(details.website).hostname}
                  </a>
                </div>
              )}
            </div>

            {/* Directions button */}
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${details?.lat},${details?.lng}&destination_place_id=${place.placeId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3 font-[family-name:var(--font-body)] text-[14px] font-semibold text-on-dark transition-all duration-200 hover:bg-black hover:shadow-lg active:scale-[0.98]"
            >
              <Navigation className="h-4 w-4" /> Get directions
            </a>

            {/* Right now insight */}
            {details?.insights.timeSuggestion && (
              <div className="rounded-xl bg-tint border border-border-soft p-4 animate-scale-in">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-ink" />
                  <span className="font-[family-name:var(--font-body)] text-[13px] font-semibold text-ink">
                    Right now
                  </span>
                </div>
                <p className="font-[family-name:var(--font-body)] text-[13px] leading-relaxed text-text-secondary">
                  {details.insights.timeSuggestion}
                </p>
              </div>
            )}

            {/* About */}
            {details?.insights.history && (
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-[17px] text-ink mb-2">
                  About this place
                </h3>
                <p className="font-[family-name:var(--font-body)] text-[13px] leading-relaxed text-text-secondary">
                  {details.insights.history}
                </p>
              </div>
            )}

            {/* Things to do */}
            {details?.insights?.thingsToDo && details.insights.thingsToDo.length > 0 && (
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-[17px] text-ink mb-2">
                  Things to do
                </h3>
                <div className="space-y-2">
                  {details.insights.thingsToDo.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 rounded-lg bg-hover px-3 py-2.5 animate-fade-up-sm transition-colors duration-150 hover:bg-pressed"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0 text-ink" />
                      <span className="font-[family-name:var(--font-body)] text-[13px] text-ink">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {details?.reviews && details.reviews.length > 0 && (
              <div className="pb-4">
                <h3 className="font-[family-name:var(--font-display)] text-[17px] text-ink mb-2">
                  Reviews
                </h3>
                <div className="space-y-3">
                  {details.reviews.map((review, i) => (
                    <div key={i} className="rounded-xl border border-border-hairline p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-hover font-[family-name:var(--font-body)] text-[12px] font-bold text-text-secondary">
                          {review.author.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-[family-name:var(--font-body)] text-[13px] font-medium text-ink">
                          {review.author}
                        </span>
                        <div className="flex items-center gap-0.5 ml-auto">
                          <Star className="h-3 w-3 fill-ink text-ink" />
                          <span className="font-[family-name:var(--font-body)] text-[12px] font-medium text-ink">
                            {review.rating}
                          </span>
                        </div>
                      </div>
                      <p className="font-[family-name:var(--font-body)] text-[12px] leading-relaxed text-text-secondary line-clamp-3">
                        {review.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MapPanel — Column 3 (Google Maps)
   ══════════════════════════════════════════════════════════════ */
export function MapPanel({
  mapSrc,
  userLocation,
}: {
  mapSrc: string | null;
  userLocation?: { lat: number; lng: number } | null;
}) {
  const src = useMemo(
    () =>
      mapSrc ||
      (userLocation
        ? gmapView(userLocation.lat, userLocation.lng, 15)
        : gmapView(17.385, 78.487, 13)),
    [mapSrc, userLocation]
  );

  return (
    <div className="relative h-full bg-surface">
      <GMap src={src} />
    </div>
  );
}
