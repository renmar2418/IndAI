import { useState, useRef, useEffect } from 'react';
import { motion, useAnimation, useMotionValue } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export type MascotStatus = 'idle' | 'scanning' | 'safe' | 'danger';

interface RobotMascotProps {
  status: MascotStatus;
}

export default function RobotMascot({ status }: RobotMascotProps) {
  const { user } = useAuth();
  const [showOuch, setShowOuch] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const controls = useAnimation();
  const y = useMotionValue(0);
  const x = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Welcome message and Floating animation when idle/not dragging
  useEffect(() => {
    const welcomeTimer = setTimeout(() => setShowWelcome(false), 3000);

    controls.start({
      y: [0, -10, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    });

    return () => clearTimeout(welcomeTimer);
  }, [controls]);

  const handleDragStart = () => {
    setShowWelcome(false);
  };

  const handleDrag = (_: any, info: any) => {
    if (info.point.y < 50 && !showOuch) {
      setShowOuch(true);
      setShowWelcome(false);

      controls.start({
        y: info.point.y + 20,
        transition: { type: "spring", stiffness: 300, damping: 10 }
      });
      setTimeout(() => setShowOuch(false), 1500);
    }
  };

  const handleDragEnd = () => {
    controls.start({
      y: [y.get(), y.get() - 10, y.get()],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    });
  };

  // Determine robot visuals based on state
  const getRobotVisuals = () => {
    // Dynamic styles based on state
    let eyeColor = "#22d3ee"; // cyan for idle/scanning
    // eyeShape removed because it was unused
    let antennaColor = "#c084fc"; // purple
    let bodyPulse = false;

    if (status === 'safe') {
      eyeColor = "#4ade80"; // green
      // eyeShape removed
      antennaColor = "#4ade80";
    } else if (status === 'danger') {
      eyeColor = "#ef4444"; // red
      // eyeShape removed
      antennaColor = "#ef4444";
    } else if (status === 'scanning') {
      bodyPulse = true;
    }

    return (
      <div className="relative w-32 h-32 flex justify-center items-center">
        {/* Holographic scanning effect overlay for scanning state */}
        {status === 'scanning' && (
          <motion.div
            className="absolute top-0 w-32 h-1 bg-cyan-400 opacity-80 shadow-[0_0_15px_#22d3ee] rounded-full z-50"
            animate={{ y: [0, 120, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
        )}

        <svg viewBox="-20 -20 140 160" className="w-full h-full drop-shadow-2xl z-10 overflow-visible" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Antenna Line */}
          <line x1="50" y1="25" x2="50" y2="10" stroke="#475569" strokeWidth="3" strokeLinecap="round" />

          {/* Antenna Glowing Orb */}
          <motion.circle
            cx="50" cy="10" r="5"
            fill={antennaColor}
            animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ filter: `drop-shadow(0 0 8px ${antennaColor})` }}
          />

          {/* Robot Head */}
          <rect x="20" y="25" width="60" height="45" rx="20" fill="#1e293b" stroke="#334155" strokeWidth="2" />

          {/* Glass Face Plate */}
          <rect x="25" y="30" width="50" height="30" rx="10" fill="#0f172a" />

          {/* Left Eye */}
          <motion.path
            d={status === 'safe' ? "m 30 45 q 7 -10 14 0" : (status === 'danger' ? "m 30 38 l 15 7" : "M 32 40 h 10 v 10 h -10 z")}
            stroke={eyeColor}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            style={{ filter: `drop-shadow(0 0 10px ${eyeColor})` }}
            animate={status === 'scanning' ? { x: [0, 5, -5, 0] } : {}}
            transition={status === 'scanning' ? { duration: 1, repeat: Infinity } : {}}
          />

          {/* Right Eye */}
          <motion.path
            d={status === 'safe' ? "m 56 45 q 7 -10 14 0" : (status === 'danger' ? "m 55 45 l 15 -7" : "M 58 40 h 10 v 10 h -10 z")}
            stroke={eyeColor}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            style={{ filter: `drop-shadow(0 0 10px ${eyeColor})` }}
            animate={status === 'scanning' ? { x: [0, 5, -5, 0] } : {}}
            transition={status === 'scanning' ? { duration: 1, repeat: Infinity } : {}}
          />

          {/* Talking Mouth */}
          <rect
            x="45" y="52" width="10" height="2" rx="1" fill={eyeColor}
            style={{
              filter: `drop-shadow(0 0 10px ${eyeColor})`,
              animation: (showWelcome || showOuch) ? 'robotTalk 0.3s infinite ease-in-out' : 'none',
              transformOrigin: '50% 53px'
            }}
          />

          {/* Neck */}
          <rect x="42" y="70" width="16" height="8" fill="#334155" />

          {/* Robot Body */}
          <motion.path
            d="M 25 80 Q 50 70 75 80 L 80 110 Q 50 120 20 110 Z"
            fill="#1e293b"
            stroke="#334155"
            strokeWidth="2"
            animate={bodyPulse ? { scale: [1, 1.05, 1] } : {}}
            transition={bodyPulse ? { duration: 1, repeat: Infinity } : {}}
          />

          {/* Body Core Light */}
          <motion.circle
            cx="50" cy="95" r="8"
            fill={eyeColor}
            opacity="0.8"
            style={{ filter: `drop-shadow(0 0 15px ${eyeColor})` }}
            animate={bodyPulse ? { opacity: [0.4, 1, 0.4] } : {}}
            transition={bodyPulse ? { duration: 1, repeat: Infinity } : {}}
          />

          {/* Floating Base Thruster */}
          <ellipse cx="50" cy="115" rx="15" ry="4" fill="#0ea5e9" opacity="0.6" style={{ filter: 'drop-shadow(0 0 10px #0ea5e9)' }} />
        </svg>
      </div>
    );
  };

  return (
    <motion.div
      ref={containerRef}
      drag
      dragConstraints={{ left: -window.innerWidth + 150, right: 0, top: -120, bottom: window.innerHeight - 150 }}
      dragElastic={0.2}
      dragMomentum={false}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      animate={controls}
      style={{ x, y, position: 'fixed', zIndex: 9999, right: '40px', top: '120px', cursor: 'grab' }}
      whileDrag={{ cursor: 'grabbing', scale: 1.1 }}
      className="robot-mascot-wrapper block"
    >
      {/* Ouch Speech Bubble */}
      {showOuch && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.8 }}
          animate={{ opacity: 1, y: -50, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="absolute -top-14 left-1/2 transform -translate-x-1/2 whitespace-nowrap z-50"
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            position: 'relative',
            background: 'rgba(30, 10, 15, 0.92)',
            backdropFilter: 'blur(12px)',
            borderRadius: '20px',
            padding: '10px 20px',
            boxShadow: '0 0 30px rgba(239, 68, 68, 0.25), 0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(239, 68, 68, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <span style={{ fontSize: '18px' }}>💥</span>
            <span style={{
              color: '#f87171',
              fontWeight: 800,
              fontSize: '0.85rem',
              letterSpacing: '0.5px',
              textShadow: '0 0 12px rgba(239, 68, 68, 0.5)',
            }}>Ouch!</span>
          </div>
          {/* Speech bubble tail */}
          <svg width="24" height="14" viewBox="0 0 24 14" style={{
            position: 'absolute',
            bottom: '-12px',
            left: '50%',
            transform: 'translateX(-50%)',
          }}>
            <path d="M0 0 C6 0, 8 12, 12 12 C16 12, 18 0, 24 0" fill="rgba(30, 10, 15, 0.92)" />
          </svg>
        </motion.div>
      )}

      {/* Welcome Speech Bubble */}
      {showWelcome && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.8 }}
          animate={{ opacity: 1, y: -50, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="absolute -top-14 left-1/2 transform -translate-x-1/2 whitespace-nowrap z-50"
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            position: 'relative',
            background: 'rgba(8, 20, 30, 0.92)',
            backdropFilter: 'blur(12px)',
            borderRadius: '20px',
            padding: '10px 20px',
            boxShadow: '0 0 30px rgba(34, 211, 238, 0.2), 0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(34, 211, 238, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <span style={{ fontSize: '18px' }}>👋</span>
            <span style={{
              color: '#22d3ee',
              fontWeight: 800,
              fontSize: '0.85rem',
              letterSpacing: '0.5px',
              textShadow: '0 0 12px rgba(34, 211, 238, 0.5)',
            }}>Welcome, {user?.display_name || 'IndAI User'} :)</span>
          </div>
          {/* Speech bubble tail */}
          <svg width="24" height="14" viewBox="0 0 24 14" style={{
            position: 'absolute',
            bottom: '-12px',
            left: '50%',
            transform: 'translateX(-50%)',
          }}>
            <path d="M0 0 C6 0, 8 12, 12 12 C16 12, 18 0, 24 0" fill="rgba(8, 20, 30, 0.92)" />
          </svg>
        </motion.div>
      )}

      {/* Dynamic Animated SVG Robot */}
      {getRobotVisuals()}

    </motion.div>
  );
}
