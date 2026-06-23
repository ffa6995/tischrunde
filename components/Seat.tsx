"use client";

import { motion } from "framer-motion";
import { Check, Plus } from "lucide-react";
import { Meeple } from "./icons";
import { SKILL_CLASS, SKILL_LABEL } from "@/lib/labels";
import type { ParticipantWithProfile, SkillLevel } from "@/lib/types";

const MEEPLE_COLOR: Record<SkillLevel, string> = {
  advanced: "text-terra",
  beginner: "text-green",
  learning: "text-gold",
  teaches: "text-wood",
  any: "text-ink-soft",
};

/**
 * Ein Platz am Tisch. Belegt → Meeple + Name + Skill (rastet animiert ein).
 * Frei → echter Button mit aria-label (CLAUDE.md §5). Reine Präsentation.
 */
export function Seat({
  participant,
  isYou = false,
  onJoin,
  disabled = false,
}: {
  participant?: ParticipantWithProfile;
  isYou?: boolean;
  onJoin?: () => void;
  disabled?: boolean;
}) {
  if (!participant) {
    return (
      <button
        type="button"
        onClick={onJoin}
        disabled={disabled}
        aria-label={disabled ? "Freier Platz" : "Freier Platz — beitreten"}
        className="flex min-h-[118px] flex-col items-center justify-center gap-2 rounded-[16px] border border-dashed border-line bg-surface-2 p-3 text-ink-soft transition-transform active:translate-y-[2px] disabled:opacity-50"
      >
        <span
          aria-hidden
          className="grid size-[42px] place-items-center rounded-full border-[2.5px] border-dashed border-ink-soft/50"
        >
          <Plus className="size-5" />
        </span>
        <small className="text-xs font-extrabold">Platz frei</small>
        {!disabled && (
          <span className="rounded-[10px] bg-ink px-3.5 py-1.5 text-xs font-black text-bg dark:bg-gold dark:text-[#231a10]">
            Beitreten
          </span>
        )}
      </button>
    );
  }

  const skill = participant.skill_level;
  const name = isYou ? "Du" : (participant.profile?.display_name ?? "Gast");
  const isHost = participant.role === "host";
  const checkedIn = participant.status === "confirmed";

  return (
    <motion.div
      layout
      initial={{ scale: 0.82, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 520, damping: 28 }}
      role="group"
      aria-label={`${name}${isHost ? ", Host" : ""}, ${SKILL_LABEL[skill]}, ${checkedIn ? "eingecheckt" : "Platz belegt"}`}
      className={`relative flex min-h-[118px] flex-col items-center justify-center gap-2 rounded-[16px] border bg-surface p-3 shadow-[0_4px_0_var(--line)] ${
        isYou
          ? "border-gold shadow-[0_4px_0_var(--gold)] ring-[3px] ring-gold/35"
          : "border-line"
      }`}
    >
      {isHost && (
        <span className="absolute right-2 top-2 rounded-full bg-gold/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-skill-learning">
          Host
        </span>
      )}
      {checkedIn && (
        <span className="absolute left-2 top-2 flex items-center gap-0.5 rounded-full bg-green/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-green-deep">
          <Check className="size-2.5" /> da
        </span>
      )}
      <Meeple
        className={`size-[42px] ${isYou ? "text-gold" : MEEPLE_COLOR[skill]}`}
      />
      <div className="font-display text-sm font-black leading-none text-ink" aria-hidden>
        {name}
      </div>
      <span
        aria-hidden
        className={`rounded-full px-2.5 py-1 text-[10.5px] font-black uppercase tracking-wide ${SKILL_CLASS[skill]}`}
      >
        {SKILL_LABEL[skill]}
      </span>
    </motion.div>
  );
}
