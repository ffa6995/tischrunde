"use client";

import { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import {
  useAllEvents,
  useAllLocations,
  useCreateEvent,
  useIsAdmin,
  useSetEventStatus,
  useSetLocationStatus,
} from "@/lib/hooks/useAdmin";

export default function AdminPage() {
  const isAdmin = useIsAdmin();
  const events = useAllEvents(isAdmin);
  const locations = useAllLocations(isAdmin);
  const createEvent = useCreateEvent();
  const setEventStatus = useSetEventStatus();
  const setLocationStatus = useSetLocationStatus();

  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [description, setDescription] = useState("");
  const [eventUrl, setEventUrl] = useState("");
  const [locationId, setLocationId] = useState("");

  if (!isAdmin) {
    return (
      <main className="mx-auto w-full max-w-[520px] px-5 py-6 pb-24">
        <AppHeader back={{ href: "/", label: "Zurück" }} />
        <p className="mt-8 text-center text-sm font-semibold text-ink-soft">
          Kein Zugriff — nur für Admin/Moderator.
        </p>
      </main>
    );
  }

  function submitEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !startsAt) return;
    createEvent.mutate(
      {
        title: title.trim(),
        startsAt: new Date(startsAt).toISOString(),
        description: description.trim() || null,
        eventUrl: eventUrl.trim() || null,
        locationId: locationId || null,
      },
      {
        onSuccess: () => {
          setTitle("");
          setStartsAt("");
          setDescription("");
          setEventUrl("");
          setLocationId("");
        },
      },
    );
  }

  const field =
    "w-full rounded-[12px] border border-line bg-surface px-3.5 py-2.5 text-sm font-semibold text-ink outline-none placeholder:text-ink-soft focus-visible:outline-[3px] focus-visible:outline-gold";

  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-5 px-5 py-6 pb-24 lg:py-10">
      <AppHeader back={{ href: "/", label: "Zurück" }} />
      <h2 className="font-display text-2xl font-extrabold text-ink">Admin</h2>

      {/* Neues Event */}
      <section className="rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-[0_5px_0_var(--line)]">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-terra">
          Neues Event
        </p>
        <form onSubmit={submitEvent} className="flex flex-col gap-2.5">
          <input
            className={field}
            placeholder="Titel"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className={field}
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            aria-label="Start"
          />
          <textarea
            className={field}
            placeholder="Beschreibung"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <input
            className={field}
            placeholder="Event-URL (optional)"
            value={eventUrl}
            onChange={(e) => setEventUrl(e.target.value)}
          />
          <select
            className={field}
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            aria-label="Location"
          >
            <option value="">— Location (optional) —</option>
            {(locations.data ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!title.trim() || !startsAt || createEvent.isPending}
            className="rounded-[12px] bg-gradient-to-br from-green to-green-deep px-4 py-2.5 text-sm font-black text-white shadow-[0_4px_0_var(--green-deep)] active:translate-y-[3px] active:shadow-none disabled:opacity-50"
          >
            {createEvent.isPending ? "Erstelle…" : "Event veröffentlichen"}
          </button>
          {createEvent.isError && (
            <p className="text-sm font-semibold text-terra">
              {(createEvent.error as Error).message}
            </p>
          )}
        </form>
      </section>

      {/* Events */}
      <section>
        <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-ink-soft">
          Events
        </p>
        <div className="flex flex-col gap-2">
          {(events.data ?? []).map((ev) => (
            <div
              key={ev.id}
              className="flex items-center justify-between gap-3 rounded-[12px] border border-line bg-surface p-3"
            >
              <div className="min-w-0">
                <Link
                  href={`/e/${ev.id}`}
                  className="block truncate font-display text-sm font-bold text-ink"
                >
                  {ev.title}
                </Link>
                <span className="text-xs font-bold text-ink-soft">
                  {ev.status}
                </span>
              </div>
              <div className="flex shrink-0 gap-1.5">
                {ev.status !== "published" && (
                  <button
                    type="button"
                    onClick={() =>
                      setEventStatus.mutate({ id: ev.id, status: "published" })
                    }
                    className="rounded-[10px] bg-green/15 px-2.5 py-1.5 text-xs font-extrabold text-green-deep"
                  >
                    Veröffentlichen
                  </button>
                )}
                {ev.status !== "cancelled" && (
                  <button
                    type="button"
                    onClick={() =>
                      setEventStatus.mutate({ id: ev.id, status: "cancelled" })
                    }
                    className="rounded-[10px] border border-line px-2.5 py-1.5 text-xs font-extrabold text-terra"
                  >
                    Absagen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Locations */}
      <section>
        <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-ink-soft">
          Locations freigeben
        </p>
        <div className="flex flex-col gap-2">
          {(locations.data ?? []).map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between gap-3 rounded-[12px] border border-line bg-surface p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-bold text-ink">
                  {l.name}
                </p>
                <span className="text-xs font-bold text-ink-soft">
                  {l.region_label ?? l.type} · {l.status}
                </span>
              </div>
              {l.status !== "public" ? (
                <button
                  type="button"
                  onClick={() =>
                    setLocationStatus.mutate({ id: l.id, status: "public" })
                  }
                  className="shrink-0 rounded-[10px] bg-green/15 px-2.5 py-1.5 text-xs font-extrabold text-green-deep"
                >
                  Öffentlich schalten
                </button>
              ) : (
                <span className="shrink-0 text-xs font-extrabold text-green-deep">
                  öffentlich
                </span>
              )}
            </div>
          ))}
          {(locations.data ?? []).length === 0 && (
            <p className="text-sm font-semibold text-ink-soft">
              Keine Locations.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
