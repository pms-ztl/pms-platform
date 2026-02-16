// Floating orb decorations and particles for the hero section
const FloatingOrbs = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 rounded-full blur-3xl animate-pulse" />
    <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-violet-400/30 to-purple-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
    <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-to-br from-emerald-400/20 to-teal-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
    {/* 3D floating particles */}
    <div className="absolute top-20 left-[10%] w-2 h-2 bg-white/50 rounded-full animate-levitate" style={{ animationDuration: '3s' }} />
    <div className="absolute top-40 left-[20%] w-3 h-3 bg-cyan-300/50 rounded-full animate-levitate" style={{ animationDuration: '4s', animationDelay: '0.5s' }} />
    <div className="absolute top-32 right-[15%] w-2 h-2 bg-violet-300/50 rounded-full animate-levitate" style={{ animationDuration: '3.5s', animationDelay: '1s' }} />
    <div className="absolute bottom-20 right-[25%] w-4 h-4 bg-emerald-300/40 rounded-full animate-levitate" style={{ animationDuration: '4.5s', animationDelay: '0.3s' }} />
    <div className="absolute top-1/2 left-[40%] w-1.5 h-1.5 bg-white/30 rounded-full animate-levitate" style={{ animationDuration: '5s', animationDelay: '1.5s' }} />
    <div className="absolute top-[20%] right-[35%] w-2.5 h-2.5 bg-primary-300/40 rounded-full animate-levitate" style={{ animationDuration: '3.8s', animationDelay: '2s' }} />
  </div>
);

export default FloatingOrbs;
