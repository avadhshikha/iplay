import { Database, LockKeyhole, Rocket } from "lucide-react";

const setupItems = [
  {
    icon: Database,
    title: "Connect Supabase",
    text: "Apply the initial migration and add the three required environment variables.",
  },
  {
    icon: LockKeyhole,
    title: "Enable admin authentication",
    text: "Admin data routes remain intentionally unimplemented until Supabase Auth is connected.",
  },
  {
    icon: Rocket,
    title: "Link Vercel",
    text: "Pull environment variables locally, verify the build, then deploy.",
  },
];

export default function AdminPage() {
  return (
    <main>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-400">
        Setup status
      </p>
      <h1 className="mt-2 text-4xl font-black tracking-tight">Admin foundation</h1>
      <p className="mt-3 max-w-2xl leading-7 text-slate-400">
        The admin shell is in place, but customer and revenue data will not be
        exposed until authentication and Supabase are connected.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {setupItems.map(({ icon: Icon, title, text }) => (
          <section
            key={title}
            className="rounded-2xl border border-white/10 bg-white/5 p-5"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-green-400/10 text-green-400">
              <Icon size={19} />
            </span>
            <h2 className="mt-5 font-bold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
