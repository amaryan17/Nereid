import React from 'react';
import { Header } from "@/components/ui/header-1";
import { GlowCard } from "@/components/ui/spotlight-card";
import CardSwap, { Card } from "@/components/ui/CardSwap";

export function Default() {
  return (
    <div className="w-screen h-screen flex flex-row items-center justify-center gap-10 custom-cursor bg-black text-white">
      <GlowCard size="md" glowColor="blue">
        <div className="flex flex-col gap-2 z-10">
          <h3 className="font-bold text-lg text-white">Spotlight Card 1</h3>
          <p className="text-sm text-gray-400">Move your mouse cursor around to witness the radial backdrop glow and borders trace the pointer.</p>
        </div>
      </GlowCard>
      
      <GlowCard size="md" glowColor="purple">
        <div className="flex flex-col gap-2 z-10">
          <h3 className="font-bold text-lg text-white">Spotlight Card 2</h3>
          <p className="text-sm text-gray-400">Supports purple, blue, green, red, and orange spotlight glow modes with responsive blur backdrops.</p>
        </div>
      </GlowCard>

      <GlowCard size="md" glowColor="green">
        <div className="flex flex-col gap-2 z-10">
          <h3 className="font-bold text-lg text-white">Spotlight Card 3</h3>
          <p className="text-sm text-gray-400">Integrated inside standard shadcn directory guidelines supporting tailwind-css variables.</p>
        </div>
      </GlowCard>
    </div>
  );
}

export default function Demo() {
  return (
    <div className="w-full bg-[#050505] text-white min-h-screen">
      <Header />

      <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-12">
        <h2 className="text-3xl font-bold tracking-tight text-white mb-8">Integrated React Components Showcase</h2>
        
        {/* Showcase Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <GlowCard customSize className="h-64" glowColor="blue">
            <div className="flex flex-col justify-between h-full z-10">
              <div>
                <span className="text-xs font-semibold text-cyan-400 uppercase tracking-widest">Active Consortia</span>
                <h4 className="text-xl font-bold text-white mt-1">Vessel 01 — Bioremediation</h4>
              </div>
              <p className="text-xs text-gray-400">Native oil-degrading Alcanivorax microbe tank at 78% capacity.</p>
            </div>
          </GlowCard>

          <GlowCard customSize className="h-64" glowColor="purple">
            <div className="flex flex-col justify-between h-full z-10">
              <div>
                <span className="text-xs font-semibold text-purple-400 uppercase tracking-widest">Battery Status</span>
                <h4 className="text-xl font-bold text-white mt-1">Vessel 02 — Emergency Return</h4>
              </div>
              <p className="text-xs text-gray-400">Solar yield declining. Smart Battery protection mode engaged.</p>
            </div>
          </GlowCard>

          <GlowCard customSize className="h-64" glowColor="green">
            <div className="flex flex-col justify-between h-full z-10">
              <div>
                <span className="text-xs font-semibold text-green-400 uppercase tracking-widest">Telemetry Node</span>
                <h4 className="text-xl font-bold text-white mt-1">Vessel 03 — Lawn Sweep</h4>
              </div>
              <p className="text-xs text-gray-400">Assigned patrol coverage zone 67% complete. Nominally sweeping.</p>
            </div>
          </GlowCard>
        </div>

        {/* CardSwap Showcase Section */}
        <div className="mt-16 border border-white/10 p-8 bg-white/5 relative overflow-hidden">
          <h3 className="text-xl font-bold text-white mb-4">GSAP Card Swap Stack</h3>
          <p className="text-sm text-gray-400 mb-8 max-w-xl">
            This showcase integrates the React Bits CardSwap stack, utilizing GSAP animations for swapping cards in a 3D perspective layout.
          </p>

          <div style={{ height: '350px', position: 'relative' }} className="flex justify-center items-center">
            <CardSwap
              cardDistance={40}
              verticalDistance={40}
              delay={4000}
              pauseOnHover={true}
              width={300}
              height={180}
            >
              <Card className="p-6 border border-cyan-500/30 bg-black/90 flex flex-col justify-between text-white">
                <div>
                  <span className="text-xs font-semibold text-cyan-400 uppercase tracking-widest">Consortia Alpha</span>
                  <h4 className="text-lg font-bold text-white mt-1">Solar Systems</h4>
                </div>
                <p className="text-xs text-gray-400">Solar generation metrics fully synced.</p>
              </Card>
              <Card className="p-6 border border-purple-500/30 bg-black/90 flex flex-col justify-between text-white">
                <div>
                  <span className="text-xs font-semibold text-purple-400 uppercase tracking-widest">Consortia Beta</span>
                  <h4 className="text-lg font-bold text-white mt-1">Patrol Coverage</h4>
                </div>
                <p className="text-xs text-gray-400">Assigned patrol coverage zone 67% complete.</p>
              </Card>
              <Card className="p-6 border border-green-500/30 bg-black/90 flex flex-col justify-between text-white">
                <div>
                  <span className="text-xs font-semibold text-green-400 uppercase tracking-widest">Consortia Gamma</span>
                  <h4 className="text-lg font-bold text-white mt-1">Bioremediation</h4>
                </div>
                <p className="text-xs text-gray-400">Microbial agent tank at 78% capacity.</p>
              </Card>
            </CardSwap>
          </div>
        </div>

        <div className="space-y-4 mt-8">
          <div className="h-4 w-4/6 bg-white/5 rounded-md border border-white/10" />
          <div className="h-4 w-1/2 bg-white/5 rounded-md border border-white/10" />
        </div>
      </main>
    </div>
  );
}

