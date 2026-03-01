"use client";
import { useState, useEffect, useCallback, useRef } from "react";

// ============================================================
// CHOREQUEST v3 — Per-kid wheels, mid-week milestones, streaks
// ============================================================

const AVATAR_OPTIONS = ["🦁", "🐉", "🦊", "🐺", "🦄", "🐸", "🦅", "🐙", "🦖", "🐯", "🐻", "🦈", "🐲", "🦇", "🐵", "🦜", "🐼", "🦀", "🐝", "🦋"];

const getDefaultState = () => ({
  profiles: {
    owen: { name: "Owen", avatar: "🦁", color: "#FF6B35", points: 0, lifetimePoints: 0, wheelPrize: null, baselineEarned: false, hasSpun: false, midweekPrize: null, hasMidweekSpun: false, midweekEnabled: false, midweekTarget: 75 },
    liam: { name: "Liam", avatar: "🐉", color: "#4ECDC4", points: 0, lifetimePoints: 0, wheelPrize: null, baselineEarned: false, hasSpun: false, midweekPrize: null, hasMidweekSpun: false, midweekEnabled: true, midweekTarget: 75 },
  },
  standingChores: [
    { id: "dinner", name: "Eat dinner well", points: 5, frequency: "weekday", icon: "🍽️" },
    { id: "lunch-weekend", name: "Eat lunch well", points: 5, frequency: "weekend", icon: "🥪" },
    { id: "dinner-weekend", name: "Eat dinner well", points: 5, frequency: "weekend", icon: "🍽️" },
    { id: "shoes", name: "Shoes & backpacks away", points: 5, frequency: "daily", icon: "👟" },
    { id: "room-tue", name: "Clean room (Tuesday)", points: 15, frequency: "tuesday", icon: "🧹" },
    { id: "room-sat", name: "Clean room (Saturday)", points: 15, frequency: "saturday", icon: "🧹" },
    { id: "doglong", name: "Walk the dog (long)", points: 10, frequency: "as-assigned", icon: "🐕" },
    { id: "dogshort", name: "Walk the dog (short)", points: 5, frequency: "as-assigned", icon: "🐶" },
  ],
  rotatingChores: { owen: [], liam: [] },
  choreLog: { owen: [], liam: [] },
  pointAdjustments: { owen: [], liam: [] },
  // Per-kid wheel items — editable from parent panel
  wheelItems: {
    owen: ["Minecoins", "Extra iPad time", "Skip dog walk next week", "Double piggy back ride day", "Game night decider"],
    liam: ["Minecoins", "Extra iPad time", "Skip dog walk next week", "Double piggy back ride day", "Game night decider"],
  },
  // Mid-week bonus wheel items — smaller prizes
  midweekWheelItems: {
    owen: ["Extra 15 min iPad", "Pick what's for dinner", "Stay up 15 min late", "Pick the family movie", "Small treat from store"],
    liam: ["Extra 15 min iPad", "Pick what's for dinner", "Stay up 15 min late", "Pick the family movie", "Small treat from store"],
  },
  weekStart: null,
  pin: "6768",
});

const BASELINE = 150;
const STRETCH = 180;
const IPAD_MINUTES = 45;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MIDWEEK_DAY = 3; // Wednesday

function getDayOfWeek() { return new Date().getDay(); }
function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function getWeekId() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - d.getDay());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Calculate daily streak: consecutive days (ending today or yesterday) with at least one verified chore
function calcStreak(choreLog) {
  if (!choreLog || choreLog.length === 0) return 0;
  const verifiedDates = [...new Set(choreLog.filter(c => c.verified).map(c => c.date))].sort().reverse();
  if (verifiedDates.length === 0) return 0;
  const today = getTodayStr();
  const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
  // Streak must include today or yesterday
  if (verifiedDates[0] !== today && verifiedDates[0] !== yesterday) return 0;
  let streak = 0;
  let checkDate = new Date();
  if (verifiedDates[0] === yesterday) checkDate.setDate(checkDate.getDate() - 1);
  for (let i = 0; i < 30; i++) {
    const ds = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`;
    if (verifiedDates.includes(ds)) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
    else break;
  }
  return streak;
}

async function loadData() {
  try { const res = await fetch("/api/data"); const json = await res.json(); return json.data || null; } catch { return null; }
}
async function saveData(data) {
  try { await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data }) }); } catch (e) { console.error("Save error:", e); }
}

// ============================================================
// CONFETTI
// ============================================================
const Confetti = ({ active }) => {
  if (!active) return null;
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i, left: Math.random() * 100, delay: Math.random() * 0.6,
    duration: 1.2 + Math.random() * 1.5, size: 6 + Math.random() * 10,
    color: ["#FF6B35", "#4ECDC4", "#FFD700", "#FF69B4", "#7B68EE", "#00CED1"][i % 6],
    rotation: Math.random() * 360,
  }));
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 }}>
      {pieces.map((p) => (
        <div key={p.id} style={{ position: "absolute", left: `${p.left}%`, top: "-10px", width: p.size, height: p.size, backgroundColor: p.color, borderRadius: Math.random() > 0.5 ? "50%" : "2px", animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`, transform: `rotate(${p.rotation}deg)` }} />
      ))}
      <style>{`@keyframes confettiFall { 0% { transform: translateY(0) rotate(0deg); opacity:1; } 100% { transform: translateY(100vh) rotate(720deg); opacity:0; } }`}</style>
    </div>
  );
};

// ============================================================
// AVATAR PICKER
// ============================================================
const AvatarPicker = ({ current, onSelect, color }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ fontSize: 13, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, textAlign: "center" }}>Pick your avatar this week</div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 320, margin: "0 auto" }}>
      {AVATAR_OPTIONS.map((a) => (
        <button key={a} onClick={() => onSelect(a)} style={{ width: 48, height: 48, borderRadius: 14, border: current === a ? `3px solid ${color}` : "2px solid #333", background: current === a ? `${color}22` : "#1a1a2e", fontSize: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", transform: current === a ? "scale(1.1)" : "scale(1)" }}>{a}</button>
      ))}
    </div>
  </div>
);

// ============================================================
// STREAK BADGE
// ============================================================
const StreakBadge = ({ streak, color }) => {
  if (streak < 1) return null;
  const flames = streak >= 7 ? "🔥🔥🔥" : streak >= 4 ? "🔥🔥" : "🔥";
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, rgba(255,107,53,0.15), rgba(255,215,0,0.1))", border: "1px solid rgba(255,107,53,0.3)", borderRadius: 12, padding: "6px 14px" }}>
      <span style={{ fontSize: 16 }}>{flames}</span>
      <span style={{ fontSize: 15, fontWeight: 900, color }}>{streak}</span>
      <span style={{ fontSize: 12, color: "#999", fontWeight: 600 }}>day streak!</span>
    </div>
  );
};

// ============================================================
// MIDWEEK MILESTONE CARD
// ============================================================
const MidweekCard = ({ profile, points, kidId, onSpinMidweek }) => {
  if (!profile.midweekEnabled) return null;
  const target = profile.midweekTarget || 75;
  const dayNum = getDayOfWeek();
  const isBeforeMidweek = dayNum >= 0 && dayNum <= MIDWEEK_DAY; // Sun-Wed
  const hitTarget = points >= target;
  const pct = Math.min((points / target) * 100, 100);

  if (profile.hasMidweekSpun && profile.midweekPrize) {
    return (
      <div style={{ background: "linear-gradient(135deg, rgba(155,89,255,0.15), rgba(78,205,196,0.1))", border: "2px solid rgba(155,89,255,0.35)", borderRadius: 16, padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 28 }}>🎉</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#9B59FF", textTransform: "uppercase", letterSpacing: 1 }}>Mid-Week Prize Won!</div>
          <div style={{ fontSize: 17, fontWeight: 900, color: "#fff", marginTop: 2 }}>{profile.midweekPrize}</div>
        </div>
      </div>
    );
  }

  if (hitTarget && !profile.hasMidweekSpun) {
    return (
      <div style={{ background: "linear-gradient(135deg, rgba(155,89,255,0.2), rgba(255,215,0,0.15))", border: "2px solid rgba(155,89,255,0.5)", borderRadius: 16, padding: "18px 20px", marginBottom: 16, textAlign: "center", animation: "pulse 2s infinite" }}>
        <div style={{ fontSize: 28, marginBottom: 4 }}>🎰</div>
        <div style={{ fontSize: 15, fontWeight: 900, color: "#9B59FF" }}>Mid-Week Milestone Reached!</div>
        <div style={{ fontSize: 13, color: "#aaa", marginTop: 2, marginBottom: 12 }}>You hit {target} pts — time for a bonus spin!</div>
        <button onClick={() => onSpinMidweek(kidId)} style={{ background: "linear-gradient(135deg, #9B59FF, #6C3CE0)", border: "none", borderRadius: 14, padding: "12px 32px", fontSize: 17, fontWeight: 900, color: "#fff", cursor: "pointer", fontFamily: "'Nunito', sans-serif", boxShadow: "0 4px 16px rgba(155,89,255,0.4)" }}>🎡 Spin Bonus Wheel!</button>
      </div>
    );
  }

  if (isBeforeMidweek) {
    return (
      <div style={{ background: "rgba(155,89,255,0.06)", border: "1px solid rgba(155,89,255,0.2)", borderRadius: 16, padding: "14px 18px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#9B59FF" }}>⭐ Mid-Week Goal: {target} pts by Wednesday</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#888" }}>{target - points > 0 ? `${target - points} to go` : "Done!"}</div>
        </div>
        <div style={{ height: 10, background: "rgba(155,89,255,0.1)", borderRadius: 5, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 5, width: `${pct}%`, background: "linear-gradient(90deg, #9B59FF, #6C3CE0)", transition: "width 0.6s" }} />
        </div>
      </div>
    );
  }

  return null;
};

// ============================================================
// PRIZE WHEEL (reusable for both main and midweek)
// ============================================================
const PrizeWheel = ({ items, onComplete, kidColor, size = 320, label }) => {
  const canvasRef = useRef(null);
  const [rotation, setRotation] = useState(0);
  const [phase, setPhase] = useState("ready");
  const [result, setResult] = useState(null);
  const targetIdxRef = useRef(0);
  const colors = ["#FF6B35", "#4ECDC4", "#FFD700", "#FF69B4", "#7B68EE"];
  const arcDeg = 360 / items.length;
  const arcRad = (2 * Math.PI) / items.length;

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); const center = size / 2; const radius = center - 10;
    ctx.clearRect(0, 0, size, size);
    ctx.beginPath(); ctx.arc(center, center, radius + 6, 0, 2 * Math.PI); ctx.strokeStyle = "rgba(255,215,0,0.3)"; ctx.lineWidth = 4; ctx.stroke();
    ctx.beginPath(); ctx.arc(center + 3, center + 3, radius, 0, 2 * Math.PI); ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.fill();
    const rotRad = (rotation * Math.PI) / 180;
    items.forEach((item, i) => {
      const angle = i * arcRad + rotRad;
      ctx.beginPath(); ctx.moveTo(center, center); ctx.arc(center, center, radius, angle, angle + arcRad); ctx.closePath();
      ctx.fillStyle = colors[i % colors.length]; ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 3; ctx.stroke();
      ctx.save(); ctx.translate(center, center); ctx.rotate(angle + arcRad / 2);
      ctx.fillStyle = "#fff"; ctx.font = `bold ${size > 280 ? 13 : 11}px 'Nunito', sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(item.length > 16 ? item.substring(0, 14) + "…" : item, radius * 0.58, 0); ctx.restore();
    });
    ctx.beginPath(); ctx.arc(center, center, 26, 0, 2 * Math.PI); ctx.fillStyle = "#1a1a2e"; ctx.fill();
    ctx.strokeStyle = "#FFD700"; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = "#FFD700"; ctx.font = "18px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("⭐", center, center);
  }, [items, rotation, size]);

  const spin = () => {
    setPhase("spinning"); setResult(null);
    const targetIdx = Math.floor(Math.random() * items.length); targetIdxRef.current = targetIdx;
    const segCenter = targetIdx * arcDeg + arcDeg / 2;
    const neededRot = ((270 - segCenter) % 360 + 360) % 360;
    const totalRotation = 2160 + neededRot;
    let start = null; const duration = 5000;
    const animate = (ts) => {
      if (!start) start = ts; const progress = Math.min((ts - start) / duration, 1);
      setRotation((1 - Math.pow(1 - progress, 5)) * totalRotation);
      if (progress < 1) requestAnimationFrame(animate);
      else { setResult(items[targetIdxRef.current]); setPhase("landed"); }
    };
    requestAnimationFrame(animate);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, animation: "fadeInUp 0.6s ease-out" }}>
      <style>{`
        @keyframes fadeInUp { 0% { opacity:0; transform: translateY(30px); } 100% { opacity:1; transform: translateY(0); } }
        @keyframes popBounce { 0% { transform: scale(0); } 60% { transform: scale(1.15); } 100% { transform: scale(1); } }
        @keyframes shimmer { 0%,100% { opacity: 0.7; } 50% { opacity: 1; } }
        @keyframes glow { 0%,100% { box-shadow: 0 0 20px rgba(255,215,0,0.3); } 50% { box-shadow: 0 0 40px rgba(255,215,0,0.6); } }
      `}</style>
      {label && <div style={{ fontSize: 14, fontWeight: 700, color: "#9B59FF", textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>}
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "16px solid transparent", borderRight: "16px solid transparent", borderTop: "28px solid #FFD700", zIndex: 10, filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.4))" }} />
        <canvas ref={canvasRef} width={size} height={size} style={{ borderRadius: "50%", boxShadow: "0 8px 40px rgba(255,215,0,0.3)", animation: phase === "ready" ? "glow 2s infinite" : "none" }} />
      </div>
      {phase === "ready" && <button onClick={spin} style={{ background: "linear-gradient(135deg, #FFD700, #FF6B35)", border: "none", borderRadius: 20, padding: "20px 56px", fontSize: 26, fontWeight: 900, color: "#fff", cursor: "pointer", fontFamily: "'Nunito', sans-serif", boxShadow: "0 6px 24px rgba(255,107,53,0.5)", animation: "glow 2s infinite" }}>🎰 SPIN!</button>}
      {phase === "spinning" && <div style={{ fontSize: 22, fontWeight: 800, color: "#FFD700", animation: "shimmer 0.5s infinite" }}>Spinning...</div>}
      {phase === "landed" && result && (
        <div style={{ textAlign: "center", animation: "popBounce 0.5s cubic-bezier(0.34,1.56,0.64,1)" }}>
          <div style={{ background: `linear-gradient(135deg, ${kidColor}, #FFD700)`, borderRadius: 20, padding: "24px 40px", boxShadow: "0 8px 32px rgba(255,215,0,0.3)" }}>
            <div style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", fontWeight: 700, marginBottom: 4 }}>{label ? "Bonus prize:" : "This week you're working for:"}</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: "#fff" }}>🏆 {result}</div>
          </div>
          <button onClick={() => onComplete(result)} style={{ marginTop: 20, background: "rgba(255,255,255,0.12)", border: "2px solid rgba(255,255,255,0.25)", borderRadius: 16, padding: "14px 36px", color: "#fff", fontSize: 18, fontWeight: 800, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
            {label ? "Awesome!" : "Let's go! →"}
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================
// PRIZE BANNER
// ============================================================
const PrizeBanner = ({ prize, points, color, earned }) => {
  const pct = Math.min((points / STRETCH) * 100, 100);
  return (
    <div style={{ background: earned ? `linear-gradient(135deg, ${color}, #FFD700)` : `linear-gradient(135deg, ${color}22, rgba(255,215,0,0.08))`, border: earned ? "none" : `2px solid ${color}44`, borderRadius: 20, padding: earned ? "20px 24px" : "16px 20px", marginBottom: 20, position: "relative", overflow: "hidden" }}>
      {earned && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)", animation: "bannerShimmer 2s infinite" }} />}
      <style>{`@keyframes bannerShimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: earned ? "rgba(255,255,255,0.85)" : "#999", marginBottom: 2 }}>{earned ? "🎉 Prize Unlocked!" : "🎯 Working toward"}</div>
            <div style={{ fontSize: earned ? 26 : 22, fontWeight: 900, color: earned ? "#fff" : "#FFD700" }}>🏆 {prize}</div>
          </div>
          <div style={{ textAlign: "right", fontSize: 13, fontWeight: 700, color: earned ? "rgba(255,255,255,0.9)" : "#888" }}>{earned ? "EARNED!" : `${STRETCH - points} pts to go`}</div>
        </div>
        {!earned && <div style={{ marginTop: 10, height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 4, width: `${pct}%`, background: `linear-gradient(90deg, ${color}, #FFD700)`, transition: "width 0.6s" }} /></div>}
      </div>
    </div>
  );
};

// ============================================================
// PROGRESS BAR
// ============================================================
const ProgressBar = ({ points, profileColor }) => {
  const stretchPct = Math.min((points / STRETCH) * 100, 100);
  const baselineMarkerPct = (BASELINE / STRETCH) * 100;
  return (
    <div style={{ width: "100%" }}>
      <div style={{ position: "relative", height: 24, background: "#1a1a2e", borderRadius: 12, overflow: "hidden", border: "1px solid #2a2a4a" }}>
        <div style={{ position: "absolute", height: "100%", borderRadius: 12, top: 0, left: 0, width: `${stretchPct}%`, background: points >= STRETCH ? "linear-gradient(90deg, #FFD700, #FF6B35)" : points >= BASELINE ? `linear-gradient(90deg, ${profileColor}, #4ECDC4)` : `linear-gradient(90deg, ${profileColor}99, ${profileColor})`, transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)" }} />
        <div style={{ position: "absolute", left: `${baselineMarkerPct}%`, top: 0, bottom: 0, width: 2, background: "rgba(255,255,255,0.4)", zIndex: 2 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 8 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: profileColor }}>{points}<span style={{ fontSize: 13, color: "#888", fontWeight: 600 }}> pts</span></div>
        <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
          <div style={{ textAlign: "center", padding: "4px 10px", borderRadius: 8, background: points >= BASELINE ? "rgba(78,205,196,0.15)" : "rgba(255,255,255,0.04)" }}>
            <div style={{ fontWeight: 800, color: points >= BASELINE ? "#4ECDC4" : "#666" }}>{points >= BASELINE ? "✅" : "🔒"} {BASELINE}</div>
            <div style={{ color: "#777", fontSize: 11 }}>iPad time</div>
          </div>
          <div style={{ textAlign: "center", padding: "4px 10px", borderRadius: 8, background: points >= STRETCH ? "rgba(255,215,0,0.15)" : "rgba(255,255,255,0.04)" }}>
            <div style={{ fontWeight: 800, color: points >= STRETCH ? "#FFD700" : "#666" }}>{points >= STRETCH ? "🏆" : "🔒"} {STRETCH}</div>
            <div style={{ color: "#777", fontSize: 11 }}>Prize!</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LifetimeBadge = ({ lifetimePoints, color }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "5px 12px" }}>
    <span style={{ fontSize: 14 }}>🏅</span>
    <span style={{ fontSize: 13, fontWeight: 700, color }}>{lifetimePoints}</span>
    <span style={{ fontSize: 11, color: "#777" }}>all-time</span>
  </div>
);

// ============================================================
// CHORE CARD
// ============================================================
const ChoreCard = ({ chore, completions, onCheckOff, isParent, onVerify }) => {
  const today = getTodayStr();
  const dayNum = getDayOfWeek();
  const isWeekend = dayNum === 0 || dayNum === 6;
  const isWeekday = !isWeekend;

  let isDueToday = false;
  if (chore.frequency === "daily") isDueToday = true;
  else if (chore.frequency === "weekday") isDueToday = isWeekday;
  else if (chore.frequency === "weekend") isDueToday = isWeekend;
  else if (chore.frequency === "as-assigned" || chore.frequency === "weekly" || chore.frequency === "one-off") isDueToday = true;
  else if (chore.frequency === "tuesday") isDueToday = dayNum === 2;
  else if (chore.frequency === "saturday") isDueToday = dayNum === 6;
  if (!isDueToday) return null;

  const resetsDaily = chore.frequency === "daily" || chore.frequency === "weekday" || chore.frequency === "weekend";
  const completion = resetsDaily
    ? completions.find((c) => c.date === today && c.choreId === chore.id)
    : completions.find((c) => c.choreId === chore.id);

  const status = completion?.verified ? "verified" : completion?.done ? "pending" : "todo";
  const bg = { todo: "#1e1e32", pending: "#2d2600", verified: "#0d2e1f" };
  const bd = { todo: "#2e2e4a", pending: "#FFD700", verified: "#4ECDC4" };
  const freqLabel = { daily: "Every day", weekday: "Mon–Fri", weekend: "Sat & Sun", tuesday: "Tuesday", saturday: "Saturday", "as-assigned": "As assigned", weekly: "This week", "one-off": "One-time" };

  return (
    <div style={{ background: bg[status], border: `2px solid ${bd[status]}`, borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, transition: "all 0.3s", opacity: status === "verified" ? 0.7 : 1 }}>
      <div style={{ fontSize: 30, flexShrink: 0 }}>{chore.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 15, textDecoration: status === "verified" ? "line-through" : "none", color: status === "verified" ? "#4ECDC4" : "#fff" }}>{chore.name}</div>
        <div style={{ display: "flex", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
          <span style={{ background: "rgba(255,215,0,0.15)", borderRadius: 8, padding: "1px 8px", fontSize: 12, fontWeight: 700, color: "#FFD700" }}>+{chore.points}</span>
          <span style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "1px 8px", fontSize: 12, color: "#888" }}>{freqLabel[chore.frequency] || chore.frequency}</span>
        </div>
      </div>
      {status === "todo" && !isParent && <button onClick={() => onCheckOff(chore.id)} style={{ background: "linear-gradient(135deg, #4ECDC4, #44A08D)", border: "none", borderRadius: 12, padding: "10px 16px", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "'Nunito', sans-serif", boxShadow: "0 2px 8px rgba(78,205,196,0.3)" }}>Done! ✓</button>}
      {status === "pending" && !isParent && <div style={{ background: "rgba(255,215,0,0.15)", borderRadius: 12, padding: "10px 12px", fontSize: 13, fontWeight: 700, color: "#FFD700" }}>⏳ Waiting</div>}
      {status === "pending" && isParent && (
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => onVerify(chore.id, completion.date, true)} style={{ background: "#4ECDC4", border: "none", borderRadius: 10, padding: "8px 14px", color: "#fff", fontWeight: 800, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>✓</button>
          <button onClick={() => onVerify(chore.id, completion.date, false)} style={{ background: "#FF6B6B", border: "none", borderRadius: 10, padding: "8px 14px", color: "#fff", fontWeight: 800, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>✗</button>
        </div>
      )}
      {status === "verified" && <div style={{ fontSize: 26 }}>✅</div>}
    </div>
  );
};

// ============================================================
// PIN ENTRY
// ============================================================
const PinEntry = ({ onSuccess, onCancel }) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#1e1e32", borderRadius: 24, padding: 40, textAlign: "center", minWidth: 300, fontFamily: "'Nunito', sans-serif" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
        <h3 style={{ color: "#fff", margin: "0 0 20px" }}>Parent / Babysitter PIN</h3>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 16 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ width: 48, height: 48, borderRadius: 12, border: `2px solid ${error ? "#FF6B6B" : pin.length > i ? "#4ECDC4" : "#555"}`, background: pin.length > i ? "#4ECDC422" : "#2a2a3e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#fff" }}>{pin.length > i ? "●" : ""}</div>
          ))}
        </div>
        {error && <div style={{ color: "#FF6B6B", fontSize: 14, marginBottom: 12 }}>Wrong PIN</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, maxWidth: 220, margin: "0 auto" }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "⌫"].map((n, i) =>
            n !== null ? (
              <button key={i} onClick={() => {
                if (n === "⌫") { setPin((p) => p.slice(0, -1)); setError(false); }
                else if (pin.length < 4) { const np = pin + n; setPin(np); if (np.length === 4) { if (np === "1234") onSuccess(); else { setError(true); setTimeout(() => setPin(""), 500); } } }
              }} style={{ background: "#2a2a3e", border: "1px solid #444", borderRadius: 12, padding: "14px 0", color: "#fff", fontSize: 22, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>{n}</button>
            ) : <div key={i} />
          )}
        </div>
        <button onClick={onCancel} style={{ marginTop: 16, background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 14, fontFamily: "'Nunito', sans-serif" }}>Cancel</button>
      </div>
    </div>
  );
};

// ============================================================
// MODALS
// ============================================================
function AddChoreModal({ kidName, onAdd, onClose }) {
  const [name, setName] = useState("");
  const [points, setPoints] = useState("10");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#1e1e32", borderRadius: 24, padding: 32, width: 340, fontFamily: "'Nunito', sans-serif" }}>
        <h3 style={{ color: "#fff", margin: "0 0 20px" }}>Add Chore for {kidName}</h3>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Chore name..." style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid #444", background: "#2a2a3e", color: "#fff", fontSize: 16, marginBottom: 12, fontFamily: "'Nunito', sans-serif", boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[5, 10, 15].map((p) => (<button key={p} onClick={() => setPoints(String(p))} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: points === String(p) ? "#4ECDC4" : "#2a2a3e", color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: 16, fontFamily: "'Nunito', sans-serif" }}>{p} pts</button>))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1px solid #444", background: "none", color: "#888", cursor: "pointer", fontWeight: 700, fontFamily: "'Nunito', sans-serif" }}>Cancel</button>
          <button onClick={() => name && onAdd(name, points)} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "none", background: "#4ECDC4", color: "#fff", cursor: "pointer", fontWeight: 800, fontFamily: "'Nunito', sans-serif" }}>Add</button>
        </div>
      </div>
    </div>
  );
}

function AdjustPointsModal({ kidName, onAdjust, onClose }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [isBonus, setIsBonus] = useState(true);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#1e1e32", borderRadius: 24, padding: 32, width: 340, fontFamily: "'Nunito', sans-serif" }}>
        <h3 style={{ color: "#fff", margin: "0 0 20px" }}>Adjust Points — {kidName}</h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button onClick={() => setIsBonus(true)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: isBonus ? "#4ECDC4" : "#2a2a3e", color: "#fff", fontWeight: 800, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>+ Bonus</button>
          <button onClick={() => setIsBonus(false)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: !isBonus ? "#FF6B6B" : "#2a2a3e", color: "#fff", fontWeight: 800, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>− Deduct</button>
        </div>
        <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="Points" type="number" style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid #444", background: "#2a2a3e", color: "#fff", fontSize: 20, marginBottom: 12, fontFamily: "'Nunito', sans-serif", textAlign: "center", boxSizing: "border-box" }} />
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid #444", background: "#2a2a3e", color: "#fff", fontSize: 14, marginBottom: 20, fontFamily: "'Nunito', sans-serif", boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1px solid #444", background: "none", color: "#888", cursor: "pointer", fontWeight: 700, fontFamily: "'Nunito', sans-serif" }}>Cancel</button>
          <button onClick={() => amount && onAdjust(isBonus ? parseInt(amount) : -parseInt(amount), reason)} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "none", background: isBonus ? "#4ECDC4" : "#FF6B6B", color: "#fff", cursor: "pointer", fontWeight: 800, fontFamily: "'Nunito', sans-serif" }}>{isBonus ? "Award" : "Deduct"}</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// WHEEL EDITOR (for parent panel)
// ============================================================
function WheelEditor({ title, items, onSave, onClose, color }) {
  const [list, setList] = useState([...items]);
  const [newItem, setNewItem] = useState("");
  const addItem = () => { if (newItem.trim() && list.length < 8) { setList([...list, newItem.trim()]); setNewItem(""); } };
  const removeItem = (i) => setList(list.filter((_, idx) => idx !== i));
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#1e1e32", borderRadius: 24, padding: 32, width: 360, maxHeight: "80vh", overflow: "auto", fontFamily: "'Nunito', sans-serif" }}>
        <h3 style={{ color: "#fff", margin: "0 0 20px" }}>{title}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
          {list.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "#2a2a3e", borderRadius: 10, padding: "8px 12px" }}>
              <span style={{ flex: 1, fontSize: 14, color: "#fff" }}>{item}</span>
              <button onClick={() => removeItem(i)} style={{ background: "rgba(255,107,107,0.2)", border: "none", borderRadius: 8, padding: "4px 10px", color: "#FF6B6B", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>✕</button>
            </div>
          ))}
          {list.length === 0 && <div style={{ color: "#666", fontSize: 14, textAlign: "center", padding: 12 }}>No items yet — add some below</div>}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addItem()} placeholder="Add prize..." style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "2px solid #444", background: "#2a2a3e", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
          <button onClick={addItem} style={{ background: color || "#4ECDC4", border: "none", borderRadius: 10, padding: "10px 16px", color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: 16 }}>+</button>
        </div>
        <div style={{ fontSize: 12, color: "#666", marginBottom: 16, textAlign: "center" }}>Min 2, max 8 items. Wheel needs at least 2 to spin.</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1px solid #444", background: "none", color: "#888", cursor: "pointer", fontWeight: 700 }}>Cancel</button>
          <button onClick={() => list.length >= 2 && onSave(list)} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "none", background: list.length >= 2 ? (color || "#4ECDC4") : "#444", color: "#fff", cursor: list.length >= 2 ? "pointer" : "default", fontWeight: 800, opacity: list.length >= 2 ? 1 : 0.5 }}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function ChoreQuest() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState("home");
  const [activeKid, setActiveKid] = useState(null);
  const [isParent, setIsParent] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pinAction, setPinAction] = useState(null);
  const [confetti, setConfetti] = useState(false);
  const [showAddChore, setShowAddChore] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustKid, setAdjustKid] = useState(null);
  const [pendingAvatar, setPendingAvatar] = useState(null);
  const [editingWheel, setEditingWheel] = useState(null); // { kidId, type: "main" | "midweek" }

  useEffect(() => {
    (async () => {
      try {
        const stored = await loadData();
        if (stored) {
          const fresh = getDefaultState();
          stored.standingChores = fresh.standingChores;
          // Migration: add new fields if missing
          Object.keys(stored.profiles).forEach((k) => {
            if (stored.profiles[k].lifetimePoints === undefined) stored.profiles[k].lifetimePoints = 0;
            if (stored.profiles[k].midweekPrize === undefined) stored.profiles[k].midweekPrize = null;
            if (stored.profiles[k].hasMidweekSpun === undefined) stored.profiles[k].hasMidweekSpun = false;
            if (stored.profiles[k].midweekEnabled === undefined) stored.profiles[k].midweekEnabled = k === "liam";
            if (stored.profiles[k].midweekTarget === undefined) stored.profiles[k].midweekTarget = 75;
          });
          if (!stored.wheelItems) stored.wheelItems = fresh.wheelItems;
          if (!stored.midweekWheelItems) stored.midweekWheelItems = fresh.midweekWheelItems;
          // Per-kid wheel migration: if old single prizeWheelItems exists, copy to both kids
          if (stored.prizeWheelItems && !stored._wheelMigrated) {
            if (!stored.wheelItems.owen?.length) stored.wheelItems.owen = [...stored.prizeWheelItems];
            if (!stored.wheelItems.liam?.length) stored.wheelItems.liam = [...stored.prizeWheelItems];
            stored._wheelMigrated = true;
          }
          // Weekly reset
          const currentWeek = getWeekId();
          if (stored.weekStart !== currentWeek) {
            Object.keys(stored.profiles).forEach((k) => {
              const weekPts = (stored.choreLog[k] || []).filter((c) => c.verified).reduce((s, c) => s + c.points, 0)
                + (stored.pointAdjustments[k] || []).reduce((s, a) => s + a.amount, 0);
              stored.profiles[k].lifetimePoints = (stored.profiles[k].lifetimePoints || 0) + Math.max(0, weekPts);
              stored.profiles[k].points = 0;
              stored.profiles[k].wheelPrize = null;
              stored.profiles[k].baselineEarned = false;
              stored.profiles[k].hasSpun = false;
              stored.profiles[k].midweekPrize = null;
              stored.profiles[k].hasMidweekSpun = false;
            });
            stored.choreLog = { owen: [], liam: [] };
            stored.pointAdjustments = { owen: [], liam: [] };
            stored.rotatingChores = { owen: [], liam: [] };
            stored.weekStart = currentWeek;
          }
          setData(stored);
        } else {
          const def = getDefaultState();
          def.weekStart = getWeekId();
          setData(def);
        }
      } catch {
        const def = getDefaultState();
        def.weekStart = getWeekId();
        setData(def);
      }
      setLoading(false);
    })();
  }, []);

  const save = useCallback(async (newData) => { setData(newData); await saveData(newData); }, []);

  const calcPoints = useCallback((kidId) => {
    if (!data) return 0;
    return (data.choreLog[kidId] || []).filter((c) => c.verified).reduce((s, c) => s + c.points, 0)
      + (data.pointAdjustments[kidId] || []).reduce((s, a) => s + a.amount, 0);
  }, [data]);

  const checkOffChore = (kidId, choreId) => {
    const allChores = [...data.standingChores, ...(data.rotatingChores[kidId] || [])];
    const chore = allChores.find((c) => c.id === choreId);
    if (!chore) return;
    save({ ...data, choreLog: { ...data.choreLog, [kidId]: [...data.choreLog[kidId], { choreId, date: getTodayStr(), done: true, verified: false, points: chore.points }] } });
  };

  const verifyChore = (kidId, choreId, date, approved) => {
    const nd = { ...data, choreLog: { ...data.choreLog } };
    nd.choreLog[kidId] = data.choreLog[kidId].map((c) => c.choreId === choreId && c.date === date ? (approved ? { ...c, verified: true } : null) : c).filter(Boolean);
    const pts = nd.choreLog[kidId].filter((c) => c.verified).reduce((s, c) => s + c.points, 0) + (nd.pointAdjustments[kidId] || []).reduce((s, a) => s + a.amount, 0);
    nd.profiles = { ...data.profiles, [kidId]: { ...data.profiles[kidId], points: pts } };
    if (pts >= BASELINE && !data.profiles[kidId].baselineEarned) { nd.profiles[kidId].baselineEarned = true; setConfetti(true); setTimeout(() => setConfetti(false), 3000); }
    save(nd);
  };

  const adjustPoints = (kidId, amount, reason) => {
    const nd = { ...data, pointAdjustments: { ...data.pointAdjustments, [kidId]: [...data.pointAdjustments[kidId], { amount, reason, date: getTodayStr() }] } };
    const pts = Math.max(0, nd.choreLog[kidId].filter((c) => c.verified).reduce((s, c) => s + c.points, 0) + nd.pointAdjustments[kidId].reduce((s, a) => s + a.amount, 0));
    nd.profiles = { ...data.profiles, [kidId]: { ...data.profiles[kidId], points: pts, baselineEarned: pts >= BASELINE } };
    save(nd);
  };

  const addRotatingChore = (kidId, name, points) => {
    save({ ...data, rotatingChores: { ...data.rotatingChores, [kidId]: [...data.rotatingChores[kidId], { id: `rot-${Date.now()}`, name, points: parseInt(points), frequency: "weekly", icon: "⭐" }] } });
  };

  const onWheelComplete = (kidId, prize) => {
    const avatar = pendingAvatar || data.profiles[kidId].avatar;
    save({ ...data, profiles: { ...data.profiles, [kidId]: { ...data.profiles[kidId], wheelPrize: prize, hasSpun: true, avatar } } });
    setPendingAvatar(null); setConfetti(true);
    setTimeout(() => { setConfetti(false); setScreen("kid-dashboard"); }, 2500);
  };

  const onMidweekWheelComplete = (kidId, prize) => {
    save({ ...data, profiles: { ...data.profiles, [kidId]: { ...data.profiles[kidId], midweekPrize: prize, hasMidweekSpun: true } } });
    setConfetti(true);
    setTimeout(() => { setConfetti(false); setScreen("kid-dashboard"); }, 2500);
  };

  const requestPin = (action) => { setPinAction(() => action); setShowPin(true); };

  if (loading || !data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)", fontFamily: "'Nunito', sans-serif", color: "#fff" }}>
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 16, animation: "pulse 1.5s infinite" }}>🎮</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>Loading ChoreQuest...</div>
        </div>
        <style>{`@keyframes pulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.15); } }`}</style>
      </div>
    );
  }

  const appShell = (children) => (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)", fontFamily: "'Nunito', sans-serif", color: "#fff", padding: "20px 20px 100px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      <Confetti active={confetti} />
      {showPin && <PinEntry onSuccess={() => { setShowPin(false); if (pinAction) pinAction(); }} onCancel={() => setShowPin(false)} />}
      <style>{`@keyframes pulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.05); } }`}</style>
      {children}
    </div>
  );

  // ============================================================
  // HOME
  // ============================================================
  if (screen === "home") {
    return appShell(
      <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", paddingTop: 20 }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🏠</div>
          <h1 style={{ margin: 0, fontSize: 48, fontWeight: 900, background: "linear-gradient(135deg, #FFD700, #FF6B35)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -1 }}>ChoreQuest</h1>
          <p style={{ color: "#8888aa", marginTop: 4, fontSize: 16 }}>Week of {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {DAYS[getDayOfWeek()]}</p>
        </div>
        <div style={{ display: "flex", gap: 20, justifyContent: "center", marginBottom: 40 }}>
          {Object.entries(data.profiles).map(([id, profile]) => {
            const pts = calcPoints(id);
            const needsSpin = !profile.hasSpun;
            const streak = calcStreak(data.choreLog[id] || []);
            return (
              <button key={id} onClick={() => { setActiveKid(id); setIsParent(false); setPendingAvatar(profile.avatar); setScreen(needsSpin ? "wheel" : "kid-dashboard"); }}
                style={{ background: `linear-gradient(135deg, ${profile.color}22, ${profile.color}11)`, border: `3px solid ${profile.color}66`, borderRadius: 24, padding: "24px 28px", cursor: "pointer", transition: "all 0.2s", flex: 1, maxWidth: 260, fontFamily: "'Nunito', sans-serif" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.04)"; e.currentTarget.style.borderColor = profile.color; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = profile.color + "66"; }}>
                <div style={{ fontSize: 56, marginBottom: 6 }}>{profile.avatar}</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#fff" }}>{profile.name}</div>
                <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                  <LifetimeBadge lifetimePoints={(profile.lifetimePoints || 0) + Math.max(0, pts)} color={profile.color} />
                  {streak > 0 && <StreakBadge streak={streak} color={profile.color} />}
                </div>
                {needsSpin ? (
                  <div style={{ marginTop: 12, background: "linear-gradient(135deg, #FFD700, #FF6B35)", borderRadius: 14, padding: "10px 16px", fontSize: 16, fontWeight: 800, color: "#fff", animation: "pulse 1.5s infinite" }}>🎡 Spin Your Wheel!</div>
                ) : (
                  <>
                    {profile.wheelPrize && <div style={{ marginTop: 10, background: pts >= STRETCH ? "linear-gradient(135deg, #FFD700, #FF6B35)" : "rgba(255,215,0,0.12)", border: pts >= STRETCH ? "none" : "1px solid rgba(255,215,0,0.25)", borderRadius: 12, padding: "6px 12px", fontSize: 13, fontWeight: 700, color: pts >= STRETCH ? "#fff" : "#FFD700" }}>{pts >= STRETCH ? "🎉 " : "🎯 "}{profile.wheelPrize}</div>}
                    <div style={{ marginTop: 12 }}><ProgressBar points={pts} profileColor={profile.color} /></div>
                  </>
                )}
              </button>
            );
          })}
        </div>
        <button onClick={() => requestPin(() => { setIsParent(true); setScreen("parent-panel"); })}
          style={{ background: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.15)", borderRadius: 16, padding: "16px 32px", color: "#aaa", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
          🔒 Parent / Babysitter
        </button>
      </div>
    );
  }

  // ============================================================
  // WHEEL (with avatar picker) — uses per-kid items
  // ============================================================
  if (screen === "wheel" && activeKid) {
    const profile = data.profiles[activeKid];
    const wheelItems = (data.wheelItems && data.wheelItems[activeKid]) || data.prizeWheelItems || ["No prizes set"];
    return appShell(
      <div style={{ maxWidth: 500, margin: "0 auto", textAlign: "center", paddingTop: 20 }}>
        <button onClick={() => { setScreen("home"); setActiveKid(null); setPendingAvatar(null); }} style={{ position: "absolute", top: 24, left: 24, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 12, padding: "8px 14px", color: "#fff", cursor: "pointer", fontSize: 18 }}>←</button>
        <div style={{ fontSize: 60, marginBottom: 8 }}>{pendingAvatar || profile.avatar}</div>
        <h2 style={{ margin: "0 0 4px", fontSize: 30, fontWeight: 900, color: profile.color }}>{profile.name}</h2>
        <p style={{ color: "#888", marginBottom: 16, fontSize: 17 }}>{profile.hasSpun ? "You already spun this week!" : "Pick your avatar & spin!"}</p>
        {!profile.hasSpun && wheelItems.length >= 2 && (
          <>
            <AvatarPicker current={pendingAvatar || profile.avatar} onSelect={setPendingAvatar} color={profile.color} />
            <PrizeWheel items={wheelItems} onComplete={(prize) => onWheelComplete(activeKid, prize)} kidColor={profile.color} />
          </>
        )}
        {!profile.hasSpun && wheelItems.length < 2 && (
          <div style={{ background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.3)", borderRadius: 16, padding: 20, color: "#FF6B6B", fontSize: 15 }}>Parents need to add at least 2 prizes to the wheel first!</div>
        )}
        {profile.hasSpun && (
          <div>
            <PrizeBanner prize={profile.wheelPrize} points={calcPoints(activeKid)} color={profile.color} earned={calcPoints(activeKid) >= STRETCH} />
            <button onClick={() => setScreen("kid-dashboard")} style={{ background: `linear-gradient(135deg, ${profile.color}, ${profile.color}cc)`, border: "none", borderRadius: 16, padding: "16px 40px", fontSize: 18, fontWeight: 800, color: "#fff", cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>Go to Chores →</button>
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // MIDWEEK WHEEL SCREEN
  // ============================================================
  if (screen === "midweek-wheel" && activeKid) {
    const profile = data.profiles[activeKid];
    const midweekItems = (data.midweekWheelItems && data.midweekWheelItems[activeKid]) || ["Extra 15 min iPad", "Pick what's for dinner", "Stay up 15 min late"];
    return appShell(
      <div style={{ maxWidth: 500, margin: "0 auto", textAlign: "center", paddingTop: 20 }}>
        <button onClick={() => { setScreen("kid-dashboard"); }} style={{ position: "absolute", top: 24, left: 24, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 12, padding: "8px 14px", color: "#fff", cursor: "pointer", fontSize: 18 }}>←</button>
        <div style={{ fontSize: 60, marginBottom: 8 }}>{profile.avatar}</div>
        <h2 style={{ margin: "0 0 4px", fontSize: 30, fontWeight: 900, color: "#9B59FF" }}>Mid-Week Bonus!</h2>
        <p style={{ color: "#888", marginBottom: 20, fontSize: 17 }}>You hit your mid-week goal — bonus spin time!</p>
        {midweekItems.length >= 2 ? (
          <PrizeWheel items={midweekItems} onComplete={(prize) => onMidweekWheelComplete(activeKid, prize)} kidColor="#9B59FF" label="⭐ Bonus Wheel" />
        ) : (
          <div style={{ background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.3)", borderRadius: 16, padding: 20, color: "#FF6B6B", fontSize: 15 }}>Parents need to add at least 2 prizes to the bonus wheel!</div>
        )}
      </div>
    );
  }

  // ============================================================
  // KID DASHBOARD
  // ============================================================
  if (screen === "kid-dashboard" && activeKid) {
    const profile = data.profiles[activeKid];
    const pts = calcPoints(activeKid);
    const allChores = [...data.standingChores, ...(data.rotatingChores[activeKid] || [])];
    const log = data.choreLog[activeKid] || [];
    const totalLifetime = (profile.lifetimePoints || 0) + Math.max(0, pts);
    const streak = calcStreak(log);

    return appShell(
      <div style={{ maxWidth: 500, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button onClick={() => { setScreen("home"); setActiveKid(null); }} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 12, padding: "8px 14px", color: "#fff", cursor: "pointer", fontSize: 18 }}>←</button>
          <div style={{ fontSize: 38 }}>{profile.avatar}</div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: profile.color }}>{profile.name}</h2>
            <p style={{ margin: 0, color: "#888", fontSize: 13 }}>{DAYS[getDayOfWeek()]}'s Quests</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
            <LifetimeBadge lifetimePoints={totalLifetime} color={profile.color} />
            {streak > 0 && <StreakBadge streak={streak} color={profile.color} />}
          </div>
        </div>

        {profile.wheelPrize && <PrizeBanner prize={profile.wheelPrize} points={pts} color={profile.color} earned={pts >= STRETCH} />}

        <MidweekCard profile={profile} points={pts} kidId={activeKid} onSpinMidweek={(kidId) => setScreen("midweek-wheel")} />

        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 20, padding: 20, marginBottom: 20 }}>
          <ProgressBar points={pts} profileColor={profile.color} />
        </div>

        {pts >= STRETCH && profile.wheelPrize && (
          <div style={{ background: "linear-gradient(135deg, #FFD700, #FF6B35)", borderRadius: 16, padding: 20, marginBottom: 20, textAlign: "center", animation: "pulse 2s infinite" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#fff" }}>🎉 You earned your prize!</div>
            <div style={{ fontSize: 20, color: "rgba(255,255,255,0.9)", marginTop: 4 }}>{profile.wheelPrize}</div>
          </div>
        )}

        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10, color: "#aaa", textTransform: "uppercase", letterSpacing: 1 }}>Today's Chores</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {allChores.map((chore) => (<ChoreCard key={chore.id} chore={chore} completions={log} onCheckOff={(cid) => checkOffChore(activeKid, cid)} isParent={false} onVerify={() => {}} />))}
        </div>

        {(data.pointAdjustments[activeKid] || []).length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10, color: "#aaa", textTransform: "uppercase", letterSpacing: 1 }}>Bonus & Deductions</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[...(data.pointAdjustments[activeKid] || [])].reverse().map((adj, i) => {
                const isPositive = adj.amount > 0;
                return (
                  <div key={i} style={{ background: isPositive ? "rgba(78,205,196,0.08)" : "rgba(255,107,107,0.08)", border: `1px solid ${isPositive ? "rgba(78,205,196,0.25)" : "rgba(255,107,107,0.25)"}`, borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 22, width: 36, height: 36, borderRadius: 10, background: isPositive ? "rgba(78,205,196,0.15)" : "rgba(255,107,107,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{isPositive ? "⭐" : "⚠️"}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: isPositive ? "#4ECDC4" : "#FF6B6B" }}>{isPositive ? `+${adj.amount} Bonus` : `${adj.amount} Deduction`}</div>
                      {adj.reason && <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{adj.reason}</div>}
                    </div>
                    <div style={{ fontSize: 12, color: "#666", flexShrink: 0 }}>{adj.date === getTodayStr() ? "Today" : new Date(adj.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" })}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // PARENT PANEL
  // ============================================================
  if (screen === "parent-panel") {
    return appShell(
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <button onClick={() => { setScreen("home"); setIsParent(false); }} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 12, padding: "8px 14px", color: "#fff", cursor: "pointer", fontSize: 18 }}>←</button>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>🔧 Parent / Babysitter Panel</h2>
        </div>
        {Object.entries(data.profiles).map(([kidId, profile]) => {
          const pts = calcPoints(kidId);
          const log = data.choreLog[kidId] || [];
          const allChores = [...data.standingChores, ...(data.rotatingChores[kidId] || [])];
          const today = getTodayStr();
          const trulyPending = allChores.filter((chore) => {
            const resetsDaily = chore.frequency === "daily" || chore.frequency === "weekday" || chore.frequency === "weekend";
            const completion = resetsDaily ? log.find((c) => c.date === today && c.choreId === chore.id) : log.find((c) => c.choreId === chore.id);
            return completion && completion.done && !completion.verified;
          });
          const totalLifetime = (profile.lifetimePoints || 0) + Math.max(0, pts);
          const streak = calcStreak(log);
          const kidWheelItems = (data.wheelItems && data.wheelItems[kidId]) || [];
          const kidMidweekItems = (data.midweekWheelItems && data.midweekWheelItems[kidId]) || [];

          return (
            <div key={kidId} style={{ background: "rgba(255,255,255,0.04)", border: `2px solid ${profile.color}33`, borderRadius: 20, padding: 24, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 36 }}>{profile.avatar}</span>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, color: profile.color, fontWeight: 900, fontSize: 20 }}>{profile.name}</h3>
                  <div style={{ display: "flex", gap: 10, fontSize: 13, color: "#888", marginTop: 2, flexWrap: "wrap" }}>
                    <span>{pts} pts this week</span>
                    <span>🏅 {totalLifetime} all-time</span>
                    {streak > 0 && <span>🔥 {streak}-day streak</span>}
                    {profile.wheelPrize && <span>🏆 {profile.wheelPrize}</span>}
                    {profile.midweekPrize && <span>⭐ {profile.midweekPrize}</span>}
                    {!profile.hasSpun && <span style={{ color: "#FFD700" }}>🎡 Hasn't spun yet</span>}
                  </div>
                </div>
                <button onClick={() => { setAdjustKid(kidId); setShowAdjust(true); }} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, padding: "8px 14px", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'Nunito', sans-serif" }}>± Pts</button>
              </div>
              <ProgressBar points={pts} profileColor={profile.color} />

              {/* Pending chores */}
              {trulyPending.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h4 style={{ margin: "0 0 8px", fontSize: 14, color: "#FFD700", fontWeight: 800 }}>⏳ Pending ({trulyPending.length})</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {trulyPending.map((chore) => <ChoreCard key={chore.id} chore={chore} completions={log} isParent={true} onCheckOff={() => {}} onVerify={(cid, date, ok) => verifyChore(kidId, cid, date, ok)} />)}
                  </div>
                </div>
              )}
              {trulyPending.length === 0 && <p style={{ color: "#555", fontSize: 14, marginTop: 12, textAlign: "center" }}>No chores pending ✓</p>}

              {/* Add rotating chore */}
              <button onClick={() => { setActiveKid(kidId); setShowAddChore(true); }} style={{ marginTop: 12, width: "100%", background: "rgba(255,255,255,0.05)", border: "1px dashed rgba(255,255,255,0.2)", borderRadius: 12, padding: "10px", color: "#888", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "'Nunito', sans-serif" }}>+ Add Rotating Chore</button>
              {(data.rotatingChores[kidId] || []).length > 0 && (
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {data.rotatingChores[kidId].map((rc) => (<span key={rc.id} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 8, padding: "3px 10px", fontSize: 12, color: "#aaa" }}>{rc.name} (+{rc.points})</span>))}
                </div>
              )}

              {/* Wheel management */}
              <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                <button onClick={() => setEditingWheel({ kidId, type: "main" })} style={{ flex: 1, background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.25)", borderRadius: 12, padding: "10px", color: "#FFD700", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'Nunito', sans-serif" }}>
                  🎡 Edit Wheel ({kidWheelItems.length})
                </button>
                <button onClick={() => setEditingWheel({ kidId, type: "midweek" })} style={{ flex: 1, background: "rgba(155,89,255,0.08)", border: "1px solid rgba(155,89,255,0.25)", borderRadius: 12, padding: "10px", color: "#9B59FF", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'Nunito', sans-serif" }}>
                  ⭐ Edit Bonus Wheel ({kidMidweekItems.length})
                </button>
              </div>

              {/* Mid-week toggle */}
              <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(155,89,255,0.06)", border: "1px solid rgba(155,89,255,0.15)", borderRadius: 12, padding: "10px 14px" }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#9B59FF" }}>Mid-Week Milestone</span>
                  <span style={{ fontSize: 12, color: "#777", marginLeft: 8 }}>{profile.midweekTarget || 75} pts by Wed</span>
                </div>
                <button onClick={() => {
                  const nd = { ...data, profiles: { ...data.profiles, [kidId]: { ...profile, midweekEnabled: !profile.midweekEnabled } } };
                  save(nd);
                }} style={{ background: profile.midweekEnabled ? "#9B59FF" : "#333", border: "none", borderRadius: 20, padding: "6px 16px", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 800, fontFamily: "'Nunito', sans-serif", transition: "all 0.2s" }}>
                  {profile.midweekEnabled ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          );
        })}

        {showAddChore && activeKid && <AddChoreModal kidName={data.profiles[activeKid]?.name} onAdd={(name, pts) => { addRotatingChore(activeKid, name, pts); setShowAddChore(false); }} onClose={() => setShowAddChore(false)} />}
        {showAdjust && adjustKid && <AdjustPointsModal kidName={data.profiles[adjustKid]?.name} onAdjust={(amt, reason) => { adjustPoints(adjustKid, amt, reason); setShowAdjust(false); }} onClose={() => setShowAdjust(false)} />}
        {editingWheel && (
          <WheelEditor
            title={`${data.profiles[editingWheel.kidId]?.name}'s ${editingWheel.type === "main" ? "Prize Wheel" : "Bonus Wheel"}`}
            items={(editingWheel.type === "main" ? data.wheelItems : data.midweekWheelItems)[editingWheel.kidId] || []}
            color={editingWheel.type === "main" ? "#FFD700" : "#9B59FF"}
            onSave={(items) => {
              const key = editingWheel.type === "main" ? "wheelItems" : "midweekWheelItems";
              save({ ...data, [key]: { ...data[key], [editingWheel.kidId]: items } });
              setEditingWheel(null);
            }}
            onClose={() => setEditingWheel(null)}
          />
        )}
      </div>
    );
  }

  return null;
}
