import { Coins, Flame, Trophy } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useUserRank } from "@/hooks/useUserRank";
import { streamLabel } from "@/lib/bac";

/**
 * The mockup's profile card, on real numbers only. Where the mockup has a
 * "friends" row there is no such feature, so that row shows what the student
 * has actually completed.
 */
const ProfileCard = ({ streak }: { streak: number }) => {
  const { profile, user } = useAuth();
  const stats = useDashboardStats();
  const rank = useUserRank();

  const name = profile?.name || user?.email?.split("@")[0] || "";
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2);
  const count = (n: number) => (stats.loading ? "…" : n.toLocaleString("ar-DZ"));

  const done = [
    { label: "اختبارات", value: stats.completedQuizzes },
    { label: "دروس", value: stats.videosWatched },
    { label: "مواضيع", value: stats.examsSolved },
  ];

  return (
    <section className="rounded-card bg-card p-5 shadow-soft">
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-tone-lav via-tone-pink to-tone-peach text-2xl font-medium text-foreground/70 ring-4 ring-card-raised">
            {initials}
          </div>
          {streak > 0 && (
            <div
              title="أيام متتالية من الدراسة"
              className="absolute -bottom-1 -end-1 flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-primary-foreground shadow-pop"
            >
              <Flame className="h-3.5 w-3.5 text-tone-peach" fill="currentColor" strokeWidth={0} aria-hidden />
              <span className="tabular text-[13px] font-semibold">{streak}</span>
            </div>
          )}
        </div>

        <h2 className="mt-3 text-[19px] font-medium">{name}</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {profile?.stream ? `${streamLabel(profile.stream)} · ` : ""}الثالثة ثانوي
        </p>

        <div className="mt-4 grid w-full grid-cols-2 gap-2">
          <div className="flex items-center gap-2 rounded-2xl bg-card-raised p-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-tone-peach">
              <Coins className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            </span>
            <div className="text-start">
              <p className="tabular text-[15px] font-semibold leading-none">{count(stats.totalScore)}</p>
              <p className="mt-1 text-[13px] leading-none text-muted-foreground">النقاط</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-card-raised p-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-tone-lav">
              <Trophy className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            </span>
            <div className="text-start">
              <p className="tabular text-[15px] font-semibold leading-none">{rank ? `#${rank}` : "—"}</p>
              <p className="mt-1 text-[13px] leading-none text-muted-foreground">المرتبة</p>
            </div>
          </div>
        </div>

        <div className="mt-2 grid w-full grid-cols-3 divide-x divide-x-reverse divide-border rounded-2xl bg-card-raised py-2.5">
          {done.map((d) => (
            <div key={d.label}>
              <p className="tabular text-[15px] font-semibold leading-none">{count(d.value)}</p>
              <p className="mt-1 text-[13px] leading-none text-muted-foreground">{d.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProfileCard;
