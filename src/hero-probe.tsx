import { createRoot } from 'react-dom/client';
import { HeroSection } from './components/HeroSection';
import { CosmicBackground } from './components/CosmicBackground';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <div className="min-h-screen bg-black text-zinc-100 font-['Cairo'] relative overflow-x-hidden">
    <CosmicBackground activeSection="hero" activeBgImage={null} />
    <div className="relative pt-20">
      <HeroSection language="ar" onStart={() => {}} onRequestProject={() => {}} />
    </div>
  </div>
);
