/**
 * RecruitingScreen – off-season recruiting hub.
 *
 * Ported concept from CFHC's RecruitingActivity / RecruitingView:
 *  - Browse a pool of incoming-class prospects
 *  - Spend scouting points to reveal a prospect's true rating
 *  - Offer scholarships (commit based on program prestige / interest)
 *  - Finish recruiting to lock in the class and start the next season
 *
 * The recruiting pool, scouting budget, and interest levels are all generated
 * by `generateProspects()` in defaults.ts using the CFHC recruiting model.
 */

import { useState } from "react";
import { useGameStore } from "../store/gameStore";
import type { Prospect } from "../game/types";
import { prospectGrade } from "../game/types";

const POSITION_ORDER = ["PG", "SG", "SF", "PF", "C", "All"] as const;
type PositionFilter = (typeof POSITION_ORDER)[number];

const REGION_ORDER = ["All", "West", "Midwest", "East", "South"] as const;
type RegionFilter = (typeof REGION_ORDER)[number];

export default function RecruitingScreen() {
  const season         = useGameStore((s) => s.season);
  const prospects      = useGameStore((s) => s.prospects);
  const scoutingPoints = useGameStore((s) => s.scoutingPoints);
  const scoutProspect  = useGameStore((s) => s.scoutProspect);
  const offerProspect  = useGameStore((s) => s.offerProspect);
  const finishRecruiting = useGameStore((s) => s.finishRecruiting);

  const [posFilter, setPosFilter] = useState<PositionFilter>("All");
  const [regionFilter, setRegionFilter] = useState<RegionFilter>("All");
  const [sortBy, setSortBy] = useState<"rating" | "interest" | "position">("rating");

  if (!season) return null;

  const graduatingSeniors = season.team.roster.filter((p) => p.year === 4);
  const openSpots = Math.max(0, graduatingSeniors.length);
  const committed = prospects.filter((p) => p.committed);
  const offered   = prospects.filter((p) => p.offered && !p.committed);

  const filtered = prospects.filter((p) => {
    if (posFilter !== "All" && p.position !== posFilter) return false;
    if (regionFilter !== "All" && p.region !== regionFilter) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === "rating") return b.rating - a.rating;
    if (sortBy === "interest") return b.interestLevel - a.interestLevel;
    return a.position.localeCompare(b.position);
  });

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-[#07111b] pb-[max(1rem,env(safe-area-inset-bottom,0px))] text-white">
      <RecruitingBg />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1200px] flex-col px-5 py-5 sm:px-8 sm:py-7">
        {/* Header */}
        <header className="flex items-start justify-between gap-4 border-b border-white/8 pb-5">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.45em] text-emerald-200/70">
              Off-Season · Recruiting
            </div>
            <h1 className="mt-2 text-4xl font-black uppercase leading-none tracking-[0.04em] text-white sm:text-5xl">
              Recruiting
            </h1>
            <p className="mt-2 text-sm text-white/50">
              {season.team.name} · {season.year} Recruiting Class
            </p>
          </div>
          <button
            onClick={finishRecruiting}
            className="mt-1 shrink-0 rounded-[22px] bg-emerald-400 px-6 py-3 text-sm font-black uppercase tracking-[0.2em] text-slate-950 transition hover:bg-emerald-300 active:scale-95"
          >
            Sign Class
          </button>
        </header>

        <main className="flex flex-1 flex-col gap-5 py-5">
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard
              label="Scouting Points"
              value={scoutingPoints}
              color="cyan"
              note="Spend to reveal a prospect's true rating"
            />
            <SummaryCard
              label="Open Roster Spots"
              value={openSpots}
              color="amber"
              note={`${graduatingSeniors.length} senior${graduatingSeniors.length !== 1 ? "s" : ""} graduating`}
            />
            <SummaryCard
              label="Committed"
              value={committed.length}
              color="emerald"
              note={offered.length > 0 ? `${offered.length} offer${offered.length !== 1 ? "s" : ""} pending` : "No pending offers"}
            />
          </div>

          {/* Graduating seniors callout */}
          {graduatingSeniors.length > 0 && (
            <div className="rounded-[28px] border border-amber-200/15 bg-amber-300/5 px-6 py-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.38em] text-amber-200/70">
                Graduating Seniors
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {graduatingSeniors.map((p) => (
                  <span
                    key={p.id}
                    className="rounded-full border border-amber-200/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100/80"
                  >
                    {p.firstName[0]}. {p.lastName} · {p.position}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Committed class */}
          {committed.length > 0 && (
            <div className="rounded-[28px] border border-emerald-400/15 bg-emerald-400/5 px-6 py-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.38em] text-emerald-200/70">
                Incoming Class ({committed.length})
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {committed.map((p) => (
                  <span
                    key={p.id}
                    className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-100/80"
                  >
                    {p.firstName[0]}. {p.lastName} · {p.position} ·{" "}
                    {p.scouted ? p.rating : prospectGrade(p.rating)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Filters + sort */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Position filter */}
            <div className="flex gap-1">
              {POSITION_ORDER.map((pos) => (
                <button
                  key={pos}
                  onClick={() => setPosFilter(pos)}
                  className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] transition ${
                    posFilter === pos
                      ? "bg-cyan-400 text-slate-950"
                      : "border border-white/12 bg-white/5 text-white/55 hover:bg-white/10"
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>

            {/* Region filter */}
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value as RegionFilter)}
              className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-[11px] text-white/70 focus:outline-none"
            >
              {REGION_ORDER.map((r) => (
                <option key={r} value={r} className="bg-[#0d1f2d]">{r}</option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-[11px] text-white/70 focus:outline-none"
            >
              <option value="rating" className="bg-[#0d1f2d]">Sort: Rating</option>
              <option value="interest" className="bg-[#0d1f2d]">Sort: Interest</option>
              <option value="position" className="bg-[#0d1f2d]">Sort: Position</option>
            </select>

            <div className="ml-auto text-[11px] text-white/35">
              {filtered.length} prospects
            </div>
          </div>

          {/* Prospect list */}
          <div className="flex flex-col gap-2">
            {filtered.length === 0 ? (
              <div className="rounded-[28px] border border-white/8 px-6 py-10 text-center text-sm text-white/40">
                No prospects match your filters.
              </div>
            ) : (
              filtered.map((p) => (
                <ProspectRow
                  key={p.id}
                  prospect={p}
                  canScout={scoutingPoints > 0 && !p.scouted}
                  onScout={() => scoutProspect(p.id)}
                  onOffer={() => offerProspect(p.id)}
                />
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SummaryCardProps {
  label: string;
  value: number;
  color: "cyan" | "amber" | "emerald";
  note: string;
}

function SummaryCard({ label, value, color, note }: SummaryCardProps) {
  const borderCls = color === "cyan"    ? "border-cyan-300/15"   :
                    color === "amber"   ? "border-amber-300/15"  :
                                          "border-emerald-400/15";
  const bgCls     = color === "cyan"    ? "bg-cyan-400/5"        :
                    color === "amber"   ? "bg-amber-400/5"       :
                                          "bg-emerald-400/5";
  const textCls   = color === "cyan"    ? "text-cyan-300"        :
                    color === "amber"   ? "text-amber-300"       :
                                          "text-emerald-300";

  return (
    <div className={`rounded-[28px] border ${borderCls} ${bgCls} px-6 py-5`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.38em] text-white/45">
        {label}
      </div>
      <div className={`mt-2 text-4xl font-black ${textCls}`}>{value}</div>
      <div className="mt-1 text-[11px] text-white/35">{note}</div>
    </div>
  );
}

interface ProspectRowProps {
  prospect: Prospect;
  canScout: boolean;
  onScout: () => void;
  onOffer: () => void;
}

function ProspectRow({ prospect: p, canScout, onScout, onOffer }: ProspectRowProps) {
  const ratingDisplay = p.scouted ? String(p.rating) : prospectGrade(p.rating);
  const interestPct   = Math.round(p.interestLevel * 100);

  const interestColor =
    p.interestLevel >= 0.70 ? "text-emerald-400" :
    p.interestLevel >= 0.45 ? "text-amber-300" :
    "text-red-400";

  const statusBadge = p.committed
    ? { label: "Committed", cls: "border-emerald-400/30 bg-emerald-400/15 text-emerald-200" }
    : p.offered
    ? { label: "Offered", cls: "border-amber-300/30 bg-amber-300/10 text-amber-200" }
    : null;

  return (
    <div
      className={`flex flex-col gap-3 rounded-[24px] border px-5 py-4 sm:flex-row sm:items-center ${
        p.committed
          ? "border-emerald-400/20 bg-emerald-400/5"
          : p.offered
          ? "border-amber-200/18 bg-amber-300/4"
          : "border-white/8 bg-white/[0.025]"
      }`}
    >
      {/* Position badge */}
      <div className="flex shrink-0 items-center gap-3 sm:w-12">
        <div className="w-10 rounded-lg border border-white/12 bg-white/8 py-1 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
          {p.position}
        </div>
      </div>

      {/* Name + region */}
      <div className="flex-1">
        <div className="text-sm font-bold text-white">
          {p.firstName} {p.lastName}
        </div>
        <div className="mt-0.5 text-[11px] text-white/40">{p.region} Region</div>
      </div>

      {/* Rating display */}
      <div className="flex shrink-0 flex-col items-center">
        <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/35">
          Rating
        </div>
        <div className={`mt-0.5 text-xl font-black ${p.scouted ? "text-white" : "text-white/55"}`}>
          {ratingDisplay}
        </div>
        {!p.scouted && (
          <div className="text-[9px] text-white/25">Unverified</div>
        )}
      </div>

      {/* Interest level */}
      <div className="flex shrink-0 flex-col items-center px-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/35">
          Interest
        </div>
        <div className={`mt-0.5 text-xl font-black ${interestColor}`}>
          {interestPct}%
        </div>
      </div>

      {/* Status / Actions */}
      <div className="flex shrink-0 items-center gap-2">
        {statusBadge ? (
          <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${statusBadge.cls}`}>
            {statusBadge.label}
          </span>
        ) : (
          <>
            {!p.scouted && (
              <button
                onClick={onScout}
                disabled={!canScout}
                className={`rounded-[18px] border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
                  canScout
                    ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-200 hover:bg-cyan-300/20 active:scale-95"
                    : "cursor-not-allowed border-white/8 bg-white/5 text-white/25"
                }`}
              >
                Scout
              </button>
            )}
            <button
              onClick={onOffer}
              className="rounded-[18px] border border-amber-200/25 bg-amber-300/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200 transition hover:bg-amber-300/20 active:scale-95"
            >
              Offer
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function RecruitingBg() {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.10),transparent_32%),linear-gradient(180deg,#07111b_0%,#040a12_100%)]" />
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/4" />
      <div className="absolute bottom-[-10%] left-1/2 h-[30vw] w-[30vw] min-h-[200px] min-w-[200px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.08),transparent_62%)] blur-3xl" />
    </>
  );
}
