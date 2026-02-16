// Animated SVG wave decoration for the hero section
const AnimatedWaves = () => (
  <svg className="absolute bottom-0 left-0 w-full h-24 opacity-20" viewBox="0 0 1440 120" preserveAspectRatio="none">
    <path
      className="animate-pulse"
      fill="currentColor"
      d="M0,64L48,69.3C96,75,192,85,288,90.7C384,96,480,96,576,85.3C672,75,768,53,864,48C960,43,1056,53,1152,58.7C1248,64,1344,64,1392,64L1440,64L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"
    />
  </svg>
);

export default AnimatedWaves;
