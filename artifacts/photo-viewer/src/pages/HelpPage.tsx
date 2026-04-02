import { Keyboard, Images, MonitorPlay, Eye, Star } from "lucide-react";

export default function HelpPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold text-zinc-100">Help</h1>
        <p className="text-sm text-zinc-400">
          Quick guide for using Band Pics plus keyboard shortcuts for fast gallery workflow.
        </p>
      </section>

      <section className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-zinc-400" />
          <h2 className="text-base font-semibold text-zinc-200">Gallery shortcuts</h2>
        </div>
        <p className="text-xs text-zinc-500">
          Shortcuts apply when your mouse is hovering a photo tile in Gallery view.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-300">
            <span className="font-semibold text-zinc-100">1-7</span>: set photo rating directly
          </div>
          <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-300">
            <span className="font-semibold text-zinc-100">S</span>: toggle slideshow on/off
          </div>
          <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-300 sm:col-span-2">
            <span className="font-semibold text-zinc-100">A</span>: toggle active/inactive
          </div>
        </div>
      </section>

      <section className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 sm:p-5 space-y-3 text-sm text-zinc-300">
        <h2 className="text-base font-semibold text-zinc-200">How to use this site</h2>
        <div className="flex items-start gap-2">
          <Images className="w-4 h-4 mt-0.5 text-zinc-400" />
          <p>
            <span className="font-medium text-zinc-100">Gallery:</span> upload photos, rate them, add tags,
            and filter by status, slideshow flag, tags, and rating.
          </p>
        </div>
        <div className="flex items-start gap-2">
          <Star className="w-4 h-4 mt-0.5 text-zinc-400" />
          <p>
            <span className="font-medium text-zinc-100">Ratings:</span> use the dots on a tile or keyboard
            shortcuts while hovering to rank quality quickly.
          </p>
        </div>
        <div className="flex items-start gap-2">
          <MonitorPlay className="w-4 h-4 mt-0.5 text-zinc-400" />
          <p>
            <span className="font-medium text-zinc-100">Slideshow:</span> mark photos for slideshow and view
            playback from the Slideshow page. Admins can build, reorder, and save show instances.
          </p>
        </div>
        <div className="flex items-start gap-2">
          <Eye className="w-4 h-4 mt-0.5 text-zinc-400" />
          <p>
            <span className="font-medium text-zinc-100">Active state:</span> inactive photos stay in the system
            but are visually de-emphasized and can be filtered.
          </p>
        </div>
      </section>
    </main>
  );
}
