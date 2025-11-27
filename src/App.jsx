import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  collection,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Trophy,
  Check,
  Lock,
  Coffee,
  Crown,
  AlertTriangle,
  XCircle,
  RefreshCw,
  AlertCircle,
  Shield,
  Loader2,
  Users,
  Share2,
  Copy,
  LogIn,
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
} from 'lucide-react';

// --- PRODUCTION FIREBASE CONFIG ---
const firebaseConfig = {
  apiKey: 'AIzaSyAxUshsPlkEKG8gY55DkCrWZY33JMQs2hg',
  authDomain: 'push-ups-tracker-e24f3.firebaseapp.com',
  projectId: 'push-ups-tracker-e24f3',
  storageBucket: 'push-ups-tracker-e24f3.firebasestorage.app',
  messagingSenderId: '647347695874',
  appId: '1:647347695874:web:749b2a3d6acf96f42c121b',
  measurementId: 'G-0R500KB308',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- CONFIG ---
const FULL_TURN_VALUE = 10;

// --- TROPHY DEFINITIONS ---
const TROPHIES = [
  {
    id: 'early_bird',
    title: 'Early Bird',
    desc: 'Complete target before 8:00 AM',
    color: 'from-yellow-300 to-orange-400',
  },
  {
    id: 'noon_raider',
    title: 'Noon Raider',
    desc: 'Complete target between 11 AM - 1 PM',
    color: 'from-sky-400 to-blue-500',
  },
  {
    id: 'night_owl',
    title: 'Night Owl',
    desc: 'Complete target after 10:00 PM',
    color: 'from-indigo-900 to-purple-800',
  },
  {
    id: 'one_shot',
    title: 'One Shot',
    desc: 'Bank 100% of daily target in one go',
    color: 'from-red-500 to-orange-600',
  },
  {
    id: 'comeback_kid',
    title: 'The Comeback Kid',
    desc: 'Recover from 3+ missed days',
    color: 'from-emerald-400 to-teal-600',
  },
  {
    id: 'perfect_week',
    title: 'Perfect Week',
    desc: '7 consecutive days complete',
    color: 'from-sky-400 to-blue-600',
  },
  {
    id: 'triple_threat',
    title: 'Triple Threat',
    desc: '3 days in a row with 100+ reps',
    color: 'from-yellow-400 to-red-500',
  },
  {
    id: 'clutch_finisher',
    title: 'Clutch Finisher',
    desc: 'Finish between 11:30 PM - Midnight',
    color: 'from-purple-600 to-pink-600',
  },
  {
    id: 'titan_trial',
    title: 'Titan Trial',
    desc: 'Complete a day with 200+ target',
    color: 'from-slate-700 to-slate-900',
  },
  {
    id: 'century_club',
    title: 'Century Club',
    desc: 'Reach Day 100',
    color: 'from-slate-900 to-black',
  },
];

// --- HELPERS ---
const getCurrentDayNumber = (startDateISO) => {
  if (!startDateISO) return 1;
  const start = new Date(startDateISO);
  const now = new Date();

  // Normalize to midnight
  start.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  const diffTime = now - start;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Day 1 is the start day (diff 0)
  return Math.max(1, diffDays + 1);
};

const getDateLabel = (dayIndex, startDateISO) => {
  if (!startDateISO) return dayIndex;
  const date = new Date(startDateISO);
  date.setDate(date.getDate() + (dayIndex - 1));
  return date.getDate();
};

const getFullDateString = (dayIndex, startDateISO) => {
  if (!startDateISO) return `Day ${dayIndex}`;
  const date = new Date(startDateISO);
  date.setDate(date.getDate() + (dayIndex - 1));
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
};

const getRankInfo = (total) => {
  if (total >= 5000)
    return {
      title: 'God of Gains',
      color: 'text-red-500',
      fill: 'fill-red-900',
      border: 'border-red-500/50',
      bg: 'bg-red-900/30',
    };
  if (total >= 3000)
    return {
      title: 'Chestforge Leviathan',
      color: 'text-cyan-300',
      fill: 'fill-cyan-900',
      border: 'border-cyan-500/50',
      bg: 'bg-cyan-900/30',
    };
  if (total >= 1500)
    return {
      title: 'Rising Juggernaut',
      color: 'text-purple-400',
      fill: 'fill-purple-900',
      border: 'border-purple-500/50',
      bg: 'bg-purple-900/30',
    };
  if (total >= 750)
    return {
      title: 'Power Pusher',
      color: 'text-yellow-400',
      fill: 'fill-yellow-900',
      border: 'border-yellow-500/50',
      bg: 'bg-yellow-900/30',
    };
  if (total >= 250)
    return {
      title: 'Iron-Will Beginner',
      color: 'text-slate-300',
      fill: 'fill-slate-700',
      border: 'border-slate-400/50',
      bg: 'bg-slate-800/50',
    };
  return {
    title: 'Warm-Up Rookie',
    color: 'text-emerald-400',
    fill: 'fill-emerald-900',
    border: 'border-emerald-700/50',
    bg: 'bg-emerald-900/20',
  };
};

// --- CORE LOGIC: TARGET GENERATION ---
const regenerateTargets = (
  currentDays,
  currentDayNum,
  difficultyFactor = 1.0
) => {
  let days = JSON.parse(JSON.stringify(currentDays));

  for (let i = 0; i < days.length; i++) {
    const day = days[i];

    if (day.day <= currentDayNum) continue;
    if (day.isRestDay) continue;

    if (i === 0) {
      if (day.target === 0) day.target = 30;
      continue;
    }

    let k = i - 1;
    while (k >= 0 && days[k].isRestDay) k--;

    if (k >= 0) {
      const prevDay = days[k];
      let base = prevDay.day < currentDayNum ? prevDay.banked : prevDay.target;
      base = Math.max(base, 20); // Min floor

      // Phase Logic (Aggressive)
      let growthRate = 1.05;
      if (day.day <= 7) growthRate = 1.18; // 18% Daily Growth W1
      else if (day.day <= 14) growthRate = 1.07;
      else if (day.day <= 21) growthRate = 1.06;
      else if (day.day <= 28) growthRate = 1.05;
      else growthRate = 0.98;

      // Apply Difficulty Factor
      let rawTarget = base * growthRate;
      if (difficultyFactor > 1.0) rawTarget = rawTarget * 1.05;
      if (difficultyFactor < 1.0) rawTarget = rawTarget * 0.95;

      // Noise (+/-)
      const pseudoRandom = ((i * 49297 + 9301) % 233280) / 233280;
      const randomFactor = 0.98 + pseudoRandom * 0.04;

      let newTarget = Math.round(rawTarget * randomFactor);
      newTarget = Math.max(20, newTarget);

      day.target = newTarget;
    }
  }

  // Validation
  days.forEach((d) => {
    if (!d.isRestDay) {
      const isMet = d.banked >= d.target;
      if (d.completed !== isMet) d.completed = isMet;
    }
  });

  return days;
};

// --- LOGIC: RANDOM REST DAY GENERATOR ---
const generateRandomRestDays = (startDayNum, count, lastRestDayNum = null) => {
  const days = [];
  let lastRest = lastRestDayNum !== null ? lastRestDayNum : startDayNum - 4;
  let dummyTarget = 30;

  for (let i = 0; i < count; i++) {
    const dayNum = startDayNum + i;
    const daysSinceRest = dayNum - lastRest;

    let isRest = false;

    if (daysSinceRest > 2) {
      let chance = 0.1; // Low base
      if (daysSinceRest > 5) chance = 0.3;
      if (daysSinceRest > 7) chance = 0.6;
      if (daysSinceRest > 10) chance = 1.0; // Force rest after 10 days straight

      if (Math.random() < chance) {
        isRest = true;
        lastRest = dayNum;
      }
    }

    days.push({
      day: dayNum,
      target: isRest ? 0 : dummyTarget,
      banked: 0,
      completed: isRest,
      isRestDay: isRest,
    });
  }
  return days;
};

const calculateStreak = (days, currentDayNum) => {
  let streak = 0;
  let checkIndex = currentDayNum - 1;
  if (checkIndex < 0) return 0;
  if (checkIndex >= days.length) checkIndex = days.length - 1;

  if (
    days[checkIndex] &&
    (days[checkIndex].completed || days[checkIndex].isRestDay)
  ) {
    // counted, continue back
  } else {
    checkIndex--;
  }

  while (checkIndex >= 0) {
    if (!days[checkIndex]) break;
    const d = days[checkIndex];
    const isSuccess = d.isRestDay || d.banked >= d.target;
    if (isSuccess) {
      streak++;
      checkIndex--;
    } else {
      break;
    }
  }
  return streak;
};

const checkTrophies = (
  updatedDays,
  selectedDayId,
  addedAmount,
  currentAchievements
) => {
  const now = new Date();
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const newUnlocks = [];
  const currentDay = updatedDays.find((d) => d.day === selectedDayId);
  if (!currentDay) return currentAchievements;

  if (
    addedAmount >= currentDay.target &&
    !currentAchievements.includes('one_shot')
  )
    newUnlocks.push('one_shot');

  if (currentDay.completed) {
    if (hour < 8 && !currentAchievements.includes('early_bird'))
      newUnlocks.push('early_bird');
    if (hour >= 11 && hour < 13 && !currentAchievements.includes('noon_raider'))
      newUnlocks.push('noon_raider');
    if (hour >= 22 && !currentAchievements.includes('night_owl'))
      newUnlocks.push('night_owl');
    if (
      hour === 23 &&
      minutes >= 30 &&
      !currentAchievements.includes('clutch_finisher')
    )
      newUnlocks.push('clutch_finisher');
    if (
      currentDay.target >= 200 &&
      !currentAchievements.includes('titan_trial')
    )
      newUnlocks.push('titan_trial');
    if (currentDay.day >= 100 && !currentAchievements.includes('century_club'))
      newUnlocks.push('century_club');
  }

  if (!currentAchievements.includes('perfect_week')) {
    let consecutive = 0;
    let dayIdx = currentDay.day;
    for (let i = 0; i < 7; i++) {
      const d = updatedDays.find((day) => day.day === dayIdx - i);
      if (d && (d.completed || d.isRestDay)) consecutive++;
      else break;
    }
    if (consecutive >= 7) newUnlocks.push('perfect_week');
  }

  if (!currentAchievements.includes('triple_threat')) {
    let highReps = 0;
    let dayIdx = currentDay.day;
    for (let i = 0; i < 3; i++) {
      const d = updatedDays.find((day) => day.day === dayIdx - i);
      if (d && d.banked >= 100) highReps++;
      else break;
    }
    if (highReps >= 3) newUnlocks.push('triple_threat');
  }

  return [...currentAchievements, ...newUnlocks];
};

// --- COMPONENTS ---

const TrophyBadge = ({ id, locked }) => {
  return (
    <div
      className={`w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-br shadow-lg ${
        locked
          ? 'from-slate-200 to-slate-300 opacity-50'
          : TROPHIES.find((t) => t.id === id).color
      } text-white`}
    >
      <Trophy size={24} />
    </div>
  );
};

const TrophyCase = ({ achievements, onClose }) => {
  return (
    <div className="absolute inset-0 bg-slate-50 z-50 flex flex-col animate-in slide-in-from-bottom-10 duration-300">
      <div className="bg-slate-900 p-6 pb-8 rounded-b-3xl shadow-lg flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Trophy className="text-yellow-400" /> Trophy Case
        </h2>
        <button
          onClick={onClose}
          className="p-2 bg-slate-800 rounded-full text-white hover:bg-slate-700"
        >
          <XCircle size={24} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-4">
          {TROPHIES.map((t) => {
            const isUnlocked = achievements.includes(t.id);
            return (
              <div
                key={t.id}
                className={`bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center ${
                  !isUnlocked ? 'opacity-60' : ''
                }`}
              >
                <TrophyBadge id={t.id} locked={!isUnlocked} />
                <h3
                  className={`mt-3 font-bold text-sm ${
                    isUnlocked ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {t.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-tight">
                  {t.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const CalendarGrid = ({
  days,
  currentDayNum,
  startDate,
  onSelectDay,
  onClose,
}) => {
  return (
    <div className="bg-slate-100 border-b border-slate-200 p-4 animate-in slide-in-from-top-5 duration-300">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
          Full Overview
        </h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600"
        >
          <ChevronUp size={20} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 max-h-96 overflow-y-auto p-1">
        {days.map((day) => {
          const isLocked = day.day > currentDayNum;
          const isPast = day.day < currentDayNum;
          const isToday = day.day === currentDayNum;
          const isIncomplete = isPast && !day.isRestDay && !day.completed;
          const dateLabel = getDateLabel(day.day, startDate);

          let bgClass = 'bg-slate-200';
          let textClass = 'text-slate-400';
          let borderClass = 'border-transparent';

          if (day.isRestDay) {
            bgClass = 'bg-slate-300/50';
          } else if (day.completed) {
            bgClass = 'bg-green-500';
            textClass = 'text-white';
          } else if (isIncomplete) {
            bgClass = 'bg-orange-400';
            textClass = 'text-white';
          } else if (isToday) {
            bgClass = 'bg-blue-500';
            textClass = 'text-white';
            borderClass = 'border-blue-300 ring-2 ring-blue-200';
          }

          if (isLocked) {
            bgClass = 'bg-slate-100';
            textClass = 'text-slate-300';
          }

          return (
            <button
              key={day.day}
              disabled={isLocked}
              onClick={() => {
                onSelectDay(day.day);
                onClose();
              }}
              className={`
                                aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-bold border-2 transition-all
                                ${bgClass} ${borderClass} ${textClass}
                                ${
                                  !isLocked
                                    ? 'hover:scale-110 hover:shadow-md active:scale-95'
                                    : 'cursor-not-allowed'
                                }
                            `}
            >
              {dateLabel}
              {day.isRestDay && (
                <Coffee size={10} className="mt-0.5 opacity-70" />
              )}
              {day.completed && !day.isRestDay && (
                <Check size={10} className="mt-0.5" />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex justify-center gap-4 mt-4 text-[10px] text-slate-500 font-medium">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500"></div> Done
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-orange-400"></div> Missed
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-slate-300/50"></div> Rest
        </div>
      </div>
    </div>
  );
};

const WeeklyPlannerModal = ({ weekNum, currentDiff, onConfirm }) => {
  const [selected, setSelected] = useState(null);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-6">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
        <div className="text-center mb-6">
          <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
          <h2 className="text-2xl font-black text-slate-800">
            Week {weekNum} Started!
          </h2>
          <p className="text-slate-500 text-sm">
            How should we set the pace for this week?
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <button
            onClick={() => setSelected('harder')}
            className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
              selected === 'harder'
                ? 'border-red-500 bg-red-50 ring-1 ring-red-500'
                : 'border-slate-100 hover:border-red-200'
            }`}
          >
            <div className="bg-red-100 p-2 rounded-lg text-red-600">
              <TrendingUp size={20} />
            </div>
            <div className="text-left">
              <div className="font-bold text-slate-900">Amp It Up</div>
              <div className="text-xs text-slate-500">+25% Intensity</div>
            </div>
          </button>

          <button
            onClick={() => setSelected('same')}
            className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
              selected === 'same'
                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                : 'border-slate-100 hover:border-blue-200'
            }`}
          >
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
              <Minus size={20} />
            </div>
            <div className="text-left">
              <div className="font-bold text-slate-900">Maintain Pace</div>
              <div className="text-xs text-slate-500">Keep current flow</div>
            </div>
          </button>

          <button
            onClick={() => setSelected('easier')}
            className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
              selected === 'easier'
                ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                : 'border-slate-100 hover:border-emerald-200'
            }`}
          >
            <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
              <TrendingDown size={20} />
            </div>
            <div className="text-left">
              <div className="font-bold text-slate-900">Cool Down</div>
              <div className="text-xs text-slate-500">-25% Intensity</div>
            </div>
          </button>
        </div>

        <button
          onClick={() => onConfirm(selected)}
          disabled={!selected}
          className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold disabled:opacity-50 transition-all hover:bg-slate-800 active:scale-95"
        >
          Confirm Plan
        </button>
      </div>
    </div>
  );
};

// --- MAIN COMPONENTS ---
const AlertPopup = ({ status, onClose, onReset }) => {
  if (status === 'none') return null;
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center">
        <AlertCircle className="text-orange-500 w-12 h-12 mb-2" />
        <h3 className="text-xl font-bold text-slate-800 mb-2">Missed a day?</h3>
        <p className="text-slate-600 mb-6">
          You have incomplete days. Catch up to keep the streak alive!
        </p>
        <button
          onClick={onClose}
          className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold"
        >
          I'll do it!
        </button>
      </div>
    </div>
  );
};

// --- PUSHUP WHEEL (FIXED TOUCH & KNOB) ---
const PushUpWheel = ({ maxAddable, onValueChange }) => {
  const [angle, setAngle] = useState(0);
  const [turns, setTurns] = useState(0);
  const turnsRef = useRef(0);
  const wheelRef = useRef(null);
  const lastAngleRef = useRef(0);

  // Clamp the current value for display/output
  const currentValue = Math.min(
    maxAddable,
    Math.max(
      0,
      Math.round(turns * FULL_TURN_VALUE + (angle / 360) * FULL_TURN_VALUE)
    )
  );

  useEffect(() => {
    onValueChange(currentValue);
  }, [currentValue]);

  const handleMove = (clientX, clientY) => {
    if (!wheelRef.current) return;
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    let deg = Math.atan2(deltaY, deltaX) * (180 / Math.PI) + 90;
    if (deg < 0) deg += 360;

    const prev = lastAngleRef.current;

    let newTurns = turnsRef.current;
    if (prev > 300 && deg < 60) newTurns++;
    else if (prev < 60 && deg > 300) newTurns--;

    const rawValue = newTurns * FULL_TURN_VALUE + (deg / 360) * FULL_TURN_VALUE;

    if (rawValue < 0) {
      newTurns = 0;
      deg = 0;
    } else if (rawValue > maxAddable) {
      const maxFullTurns = Math.floor(maxAddable / FULL_TURN_VALUE);
      const remainder = maxAddable - maxFullTurns * FULL_TURN_VALUE;
      const maxDeg = (remainder / FULL_TURN_VALUE) * 360;

      newTurns = maxFullTurns;
      deg = maxDeg;
    }

    turnsRef.current = newTurns;
    lastAngleRef.current = deg;

    setTurns(newTurns);
    setAngle(deg);
  };

  const onMouseDown = (e) => {
    e.preventDefault();
    handleMove(e.clientX, e.clientY);
    const onMouseMove = (ev) => handleMove(ev.clientX, ev.clientY);
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // TOUCH HANDLERS FOR MOBILE
  const onTouchStart = (e) => {
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  };

  const onTouchMove = (e) => {
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  };

  // Knob Math
  const radius = 80;
  const knobRad = (angle - 90) * (Math.PI / 180);
  const left = 50 + (radius / 128) * 50 * Math.cos(knobRad);
  const top = 50 + (radius / 128) * 50 * Math.sin(knobRad);

  return (
    <div
      className="flex flex-col items-center justify-center py-6 select-none touch-none"
      style={{ touchAction: 'none' }}
    >
      <div
        ref={wheelRef}
        className="relative w-64 h-64 cursor-grab active:cursor-grabbing"
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
      >
        <svg className="w-full h-full transform" viewBox="0 0 256 256">
          <circle
            cx="128"
            cy="128"
            r="80"
            stroke="#e5e7eb"
            strokeWidth="24"
            fill="none"
          />
          <circle
            cx="128"
            cy="128"
            r="80"
            stroke="#f97316"
            strokeWidth="24"
            fill="none"
            strokeLinecap="round"
            style={{
              strokeDasharray: 2 * Math.PI * 80,
              strokeDashoffset:
                2 * Math.PI * 80 - (angle / 360) * (2 * Math.PI * 80),
              transform: 'rotate(-90deg)',
              transformOrigin: '50% 50%',
            }}
          />
          <text
            x="50%"
            y="50%"
            dominantBaseline="middle"
            textAnchor="middle"
            className="text-5xl font-bold fill-slate-700"
          >
            {currentValue}
          </text>
        </svg>
        <div
          className="absolute w-8 h-8 bg-white border-4 border-orange-500 rounded-full shadow-md z-10"
          style={{
            left: `${left}%`,
            top: `${top}%`,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
};

const WelcomeScreen = ({ onStart }) => {
  const [name, setName] = useState('');

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
      <Trophy className="w-20 h-20 text-yellow-400 mb-6" />
      <h1 className="text-3xl font-bold mb-2">Push-up Tracker V3</h1>
      <p className="text-slate-400 mb-8 max-w-xs">Infinite Challenge Mode</p>

      <div className="w-full max-w-sm space-y-4 animate-in fade-in slide-in-from-bottom-5">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-yellow-400 focus:outline-none"
        />
        <button
          onClick={() => name.trim() && onStart(name)}
          disabled={!name.trim()}
          className="w-full bg-yellow-400 text-slate-900 font-bold py-4 rounded-xl disabled:opacity-50 active:scale-95 transition-transform"
        >
          Start Challenge
        </button>
      </div>
    </div>
  );
};

const Leaderboard = ({ currentPlayerId, onClose }) => {
  const [players, setPlayers] = useState([]);
  useEffect(() => {
    // USE ROOT COLLECTION for production deployment
    const q = query(collection(db, 'players'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.totalBanked || 0) - (a.totalBanked || 0));
      setPlayers(data);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="absolute inset-0 bg-slate-900 z-50 flex flex-col animate-in slide-in-from-bottom-5">
      <div className="p-6 flex items-center justify-between border-b border-slate-800">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Users className="text-sky-400" /> Leaderboard
        </h2>
        <button
          onClick={onClose}
          className="p-2 bg-slate-800 rounded-full text-white hover:bg-slate-700"
        >
          <XCircle size={24} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {players.map((p, idx) => (
          <div
            key={p.id}
            className={`flex items-center gap-3 p-3 rounded-xl border ${
              p.id === currentPlayerId
                ? 'bg-slate-800 border-sky-500/50'
                : 'bg-slate-800/50 border-slate-800'
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              <span className="text-slate-500 font-mono w-6 text-center">
                {idx + 1}
              </span>
              <div className="font-bold text-white truncate">{p.username}</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-orange-500">
                <Flame size={16} className="fill-orange-500" />
                <span className="font-bold">{p.streak || 0}</span>
              </div>
              <div className="w-16 text-right">
                <div className="text-lg font-black text-white">
                  {p.totalBanked || 0}
                </div>
                <div className="text-[10px] text-slate-500 uppercase leading-none">
                  Reps
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- APP ---
export default function App() {
  const [view, setView] = useState('LOADING');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showTrophies, setShowTrophies] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const [playerId, setPlayerId] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [selectedDayId, setSelectedDayId] = useState(1);
  const [currentDayNum, setCurrentDayNum] = useState(1);
  const [tempBankValue, setTempBankValue] = useState(0);

  // Weekly Planner
  const [showWeeklyPlanner, setShowWeeklyPlanner] = useState(false);

  const scrollRef = useRef(null);

  // --- INIT ---
  useEffect(() => {
    const init = async () => {
      // PRODUCTION: Simplified auth
      await signInAnonymously(auth);

      try {
        const params = new URLSearchParams(window.location.search);
        // Check for 'id' OR 'player' params
        const urlId = params.get('id') || params.get('player');
        if (urlId) setPlayerId(urlId);
        else setView('WELCOME');
      } catch (e) {
        setView('WELCOME');
      }
    };
    init();
  }, []);

  // --- DATA SYNC & INFINITE GENERATION ---
  useEffect(() => {
    if (!playerId || !auth.currentUser) return;
    // PRODUCTION: USE ROOT PATH
    const docRef = doc(db, 'players', playerId);

    const unsubscribe = onSnapshot(docRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const todayNum = getCurrentDayNumber(data.startDate);
        let updatedDays = [...data.days];
        let needsUpdate = false;

        // 1. INFINITE LOGIC: Ensure we always have +7 days buffer
        if (updatedDays.length < todayNum + 7) {
          // Generate next batch
          const lastDay = updatedDays[updatedDays.length - 1];
          let lastRestDayNum = -999;
          // Find actual last rest day in history
          for (let i = updatedDays.length - 1; i >= 0; i--) {
            if (updatedDays[i].isRestDay) {
              lastRestDayNum = updatedDays[i].day;
              break;
            }
          }

          const nextDays = generateRandomRestDays(
            lastDay.day + 1,
            7,
            lastRestDayNum
          );
          updatedDays = [...updatedDays, ...nextDays];
          needsUpdate = true;
        }

        // 2. REGENERATE TARGETS (Runs on every load to update curve)
        const processedDays = regenerateTargets(
          updatedDays,
          todayNum,
          data.difficultyFactor || 1.0
        );
        const currentStreak = calculateStreak(processedDays, todayNum);

        // 3. WEEKLY PLANNER TRIGGER
        const weekNum = Math.ceil(todayNum / 7);
        const lastCheckedWeek = data.lastPlannedWeek || 1;

        if (weekNum > lastCheckedWeek && !showWeeklyPlanner) {
          setShowWeeklyPlanner(true);
        }

        // 4. Save
        if (needsUpdate) {
          await setDoc(
            docRef,
            { ...data, days: processedDays },
            { merge: true }
          );
          return; // Snap will fire again
        }

        setPlayerData({
          ...data,
          days: processedDays,
          streak: currentStreak,
          todayNum,
        });
        setCurrentDayNum(todayNum);
        // Only scroll if not manually viewing
        if (view === 'LOADING' || view === 'WELCOME') {
          setSelectedDayId(Math.min(todayNum, processedDays.length));
          setView('DASHBOARD');
        }
      } else {
        if (view === 'LOADING') setView('WELCOME');
      }
    });
    return () => unsubscribe();
  }, [playerId, showWeeklyPlanner]);

  // --- ACTIONS ---

  const handleStartNew = async (name) => {
    const newId = `player-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .substr(2, 5)}`;
    const startDate = new Date().toISOString();

    // Standard initialization: 30 days with random rest logic
    const initialDays = generateRandomRestDays(1, 30, -4);

    // PRODUCTION: USE ROOT PATH
    await setDoc(doc(db, 'players', newId), {
      username: name,
      startDate,
      days: initialDays,
      achievements: [],
      totalBanked: 0,
      streak: 0,
      difficultyFactor: 1.0,
      lastPlannedWeek: 1,
      createdAt: serverTimestamp(),
    });

    // Updates URL to ?id=...
    try {
      const newUrl = `${window.location.pathname}?id=${newId}`;
      window.history.replaceState({ path: newUrl }, '', newUrl);
    } catch (e) {}
    setPlayerId(newId);
  };

  const handleBankConfirm = async () => {
    if (!playerData) return;
    const updatedDays = playerData.days.map((d) =>
      d.day === selectedDayId
        ? {
            ...d,
            banked: d.banked + tempBankValue,
            completed: d.banked + tempBankValue >= d.target,
          }
        : d
    );
    const total = updatedDays.reduce((a, c) => a + c.banked, 0);

    // Calculate achievements!
    const updatedAchievements = checkTrophies(
      updatedDays,
      selectedDayId,
      tempBankValue,
      playerData.achievements || []
    );

    // PRODUCTION: USE ROOT PATH
    await setDoc(doc(db, 'players', playerId), {
      ...playerData,
      days: updatedDays,
      totalBanked: total,
      achievements: updatedAchievements,
      lastUpdated: serverTimestamp(),
    });
    setView('DASHBOARD');
  };

  const handleWeeklyPlan = async (choice) => {
    let newFactor = playerData.difficultyFactor || 1.0;
    if (choice === 'harder') newFactor += 0.25;
    if (choice === 'easier') newFactor = Math.max(0.5, newFactor - 0.25);

    const currentWeek = Math.ceil(playerData.todayNum / 7);

    // PRODUCTION: USE ROOT PATH
    await setDoc(doc(db, 'players', playerId), {
      ...playerData,
      difficultyFactor: newFactor,
      lastPlannedWeek: currentWeek,
    });

    setShowWeeklyPlanner(false);
  };

  const handleCopyLink = () => {
    // Generate the cleaner ?id= URL
    let textToCopy = playerId;
    try {
      if (window.location.protocol !== 'blob:') {
        // Remove any query params first then add ?id=
        const cleanPath = window.location.href.split('?')[0];
        textToCopy = `${cleanPath}?id=${playerId}`;
      }
    } catch (e) {}

    const fallbackCopy = (text) => {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed'; // Avoid scrolling to bottom
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) alert('Profile Link Copied!');
        else prompt('Unable to auto-copy. Please copy manually:', text);
      } catch (err) {
        document.body.removeChild(textArea);
        prompt('Unable to auto-copy. Please copy manually:', text);
      }
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(textToCopy)
        .then(() => alert('Profile Link Copied!'))
        .catch(() => fallbackCopy(textToCopy));
    } else {
      fallbackCopy(textToCopy);
    }
  };

  // --- RENDER ---
  if (view === 'LOADING')
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-yellow-400 w-10 h-10" />
      </div>
    );

  // NOTE: onJoin removed from WelcomeScreen props since we removed the manual join UI
  if (view === 'WELCOME') return <WelcomeScreen onStart={handleStartNew} />;

  if (view === 'BANK') {
    const day = playerData.days.find((d) => d.day === selectedDayId);
    const max = day ? Math.max(0, day.target - day.banked) : 0;
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans max-w-md mx-auto shadow-2xl">
        <div className="bg-white p-4 flex items-center shadow-sm z-10">
          <button onClick={() => setView('DASHBOARD')} className="p-2">
            <ChevronLeft />
          </button>
          <h2 className="flex-1 text-center font-bold text-slate-800">
            Bank for Day {selectedDayId}
          </h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="mb-8 text-center">
            <h3 className="text-slate-500 text-sm uppercase">Remaining</h3>
            <p className="text-3xl font-black text-slate-800">
              {max - tempBankValue}
            </p>
          </div>
          <PushUpWheel maxAddable={max} onValueChange={setTempBankValue} />
        </div>
        <div className="p-6 bg-white border-t border-slate-100">
          <button
            onClick={handleBankConfirm}
            disabled={tempBankValue === 0}
            className="w-full py-4 bg-yellow-400 text-slate-900 rounded-2xl font-bold shadow-lg"
          >
            Confirm +{tempBankValue}
          </button>
        </div>
      </div>
    );
  }

  // Dashboard View
  const currentDayData =
    playerData.days.find((d) => d.day === selectedDayId) || playerData.days[0];
  const rank = getRankInfo(playerData.totalBanked);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 max-w-md mx-auto shadow-2xl overflow-hidden relative flex flex-col">
      {showWeeklyPlanner && (
        <WeeklyPlannerModal
          weekNum={Math.ceil(playerData.todayNum / 7)}
          currentDiff={playerData.difficultyFactor}
          onConfirm={handleWeeklyPlan}
        />
      )}
      {showLeaderboard && (
        <Leaderboard
          currentPlayerId={playerId}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
      {showTrophies && (
        <TrophyCase
          achievements={playerData.achievements}
          onClose={() => setShowTrophies(false)}
        />
      )}

      {/* Header */}
      <div className="bg-slate-900 text-white p-6 pb-8 shadow-lg z-10 relative">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Trophy className="text-orange-400 w-5 h-5" /> Push-up Tracker
            </h1>
            <div className="text-xs font-mono text-slate-400 mt-1 flex gap-2 items-center">
              <span>{playerData.username}</span>
              <button
                onClick={handleCopyLink}
                className="bg-slate-800 p-1 rounded hover:text-white"
                title="Copy Link"
              >
                <Share2 size={12} />
              </button>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700">
              <Crown size={14} className="text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-bold text-yellow-100">
                {playerData.streak} Day Streak
              </span>
            </div>

            {/* RANK BADGE */}
            <div
              className={`flex items-center gap-1 px-3 py-1 rounded-full border ${rank.bg} ${rank.border}`}
            >
              <Shield size={14} className={`${rank.color} ${rank.fill}`} />
              <span className={`text-xs font-bold ${rank.color}`}>
                {rank.title}
              </span>
            </div>

            <button
              onClick={() => setShowTrophies(true)}
              className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-slate-400 hover:text-white transition-colors mt-1"
            >
              View Trophies <ChevronLeft size={10} className="rotate-180" />
            </button>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black">{playerData.totalBanked}</span>
          <span className="text-sm text-slate-400 uppercase tracking-widest">
            Total Reps
          </span>
        </div>
      </div>

      {/* Calendar Strip / Grid */}
      <div className="bg-white border-b border-slate-100 shadow-sm z-20 relative">
        {isCalendarOpen ? (
          <CalendarGrid
            days={playerData.days}
            currentDayNum={currentDayNum}
            startDate={playerData.startDate}
            onSelectDay={(d) => {
              setSelectedDayId(d);
              setIsCalendarOpen(false);
            }}
            onClose={() => setIsCalendarOpen(false)}
          />
        ) : (
          <>
            <div
              ref={scrollRef}
              className="flex overflow-x-auto px-4 py-6 gap-3 no-scrollbar snap-x items-center pr-12"
            >
              {playerData.days.map((day) => {
                const isSelected = day.day === selectedDayId;
                const isLocked = day.day > currentDayNum;
                let bg = 'bg-slate-100 text-slate-500';

                // LOGIC FIX: Check isRestDay FIRST to prioritize Tea Cup style over Green Checkmark
                if (day.isRestDay) bg = 'bg-slate-200 text-slate-400';
                else if (day.completed)
                  bg = 'bg-green-500 text-white shadow-lg shadow-green-200';
                else if (day.day === currentDayNum)
                  bg = 'bg-blue-100 text-blue-900 ring-2 ring-blue-200';

                if (isSelected) bg += ' scale-110 z-10 ring-2 ring-slate-900';

                return (
                  <button
                    key={day.day}
                    onClick={() => !isLocked && setSelectedDayId(day.day)}
                    className={`flex-shrink-0 w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all snap-center ${bg} ${
                      isLocked ? 'opacity-40' : ''
                    }`}
                  >
                    {/* LOGIC FIX: Check isRestDay FIRST here too */}
                    {day.isRestDay ? (
                      <Coffee size={16} />
                    ) : day.completed ? (
                      <Check size={20} />
                    ) : (
                      <span className="text-lg font-bold">
                        {getDateLabel(day.day, playerData.startDate)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setIsCalendarOpen(true)}
              className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white via-white to-transparent flex items-center justify-center text-slate-400 hover:text-slate-600 z-30"
            >
              <ChevronDown size={20} />
            </button>
          </>
        )}
      </div>

      {/* Active Day Card */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center bg-slate-50">
        <div className="w-full bg-white rounded-3xl p-6 shadow-xl border border-slate-100 text-center relative overflow-hidden flex flex-col">
          <h2 className="text-sm uppercase tracking-widest text-slate-500 mb-2">
            {getFullDateString(selectedDayId, playerData.startDate)}
          </h2>
          {currentDayData.isRestDay ? (
            <div className="py-10 text-slate-400 flex flex-col items-center">
              <Coffee className="mb-4 w-12 h-12 opacity-50" />
              <h3 className="text-xl font-bold">Rest Day</h3>
              <p>Take it easy.</p>
            </div>
          ) : (
            <>
              <div className="text-5xl font-black text-slate-900 mb-6">
                {currentDayData.banked}{' '}
                <span className="text-2xl text-slate-300">
                  / {currentDayData.target}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-8 mb-8 relative overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${
                    currentDayData.completed ? 'bg-green-500' : 'bg-orange-500'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      (currentDayData.banked / currentDayData.target) * 100
                    )}%`,
                  }}
                ></div>
              </div>
              <div className="mt-auto">
                {!currentDayData.completed ? (
                  <button
                    onClick={() => {
                      setTempBankValue(0);
                      setView('BANK');
                    }}
                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg shadow-lg"
                  >
                    Bank Push-ups
                  </button>
                ) : (
                  <div className="py-4 bg-green-50 text-green-700 rounded-xl font-bold border border-green-200 flex items-center justify-center gap-2">
                    <Check /> Target Met!
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => setShowLeaderboard(true)}
          className="mt-6 flex items-center gap-2 text-slate-400 hover:text-slate-600 font-bold uppercase text-xs tracking-widest"
        >
          <Users size={16} /> Leaderboard
        </button>
      </div>
    </div>
  );
}
