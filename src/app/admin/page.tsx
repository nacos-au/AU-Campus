import { BrandedSection } from "@/components/layout/branded-section";
import { PageContent } from "@/components/layout/page-content";
import { DEMO_DEPARTMENTS, DEMO_SPORTS, DEMO_TEAMS } from "@/lib/data/demo";

export const metadata = { title: "Admin" };

export default function AdminPage() {
  return (
    <>
      <BrandedSection title="Admin" activeSport="football" />
      <PageContent>
        <div className="mx-auto grid max-w-[1200px] gap-6 px-4 py-8 sm:grid-cols-3 sm:px-6">
          {[
            { title: "Departments", items: DEMO_DEPARTMENTS.map((d) => d.name) },
            { title: "Sports", items: DEMO_SPORTS.map((s) => s.name) },
            { title: "Teams", items: DEMO_TEAMS.map((t) => t.name) },
          ].map((card) => (
            <div key={card.title} className="border border-rule p-5">
              <h2 className="font-display font-extrabold">{card.title}</h2>
              <ul className="mt-3 space-y-1 text-sm opacity-80">
                {card.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </PageContent>
    </>
  );
}
