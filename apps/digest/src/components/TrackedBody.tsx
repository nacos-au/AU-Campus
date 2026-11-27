import type { ReactNode } from "react";
import type { DiffBlock, FlatBlock } from "@/lib/doc-diff";
import type { DiffSeg } from "@/lib/textDiff";

function Segs({ segs }: { segs: DiffSeg[] }) {
  return (
    <>
      {segs.map((s, i) => {
        if (s.type === "equal") return <span key={i}>{s.text}</span>;
        if (s.type === "add") {
          return (
            <ins
              key={i}
              className="rounded-sm bg-emerald-100 text-emerald-950 no-underline ring-1 ring-emerald-200"
            >
              {s.text}
            </ins>
          );
        }
        return (
          <del
            key={i}
            className="rounded-sm bg-rose-100 text-rose-900 ring-1 ring-rose-200"
          >
            {s.text}
          </del>
        );
      })}
    </>
  );
}

function wrapTag(tag: FlatBlock["tag"], key: number, children: ReactNode) {
  switch (tag) {
    case "h2":
      return <h2 key={key}>{children}</h2>;
    case "h3":
      return <h3 key={key}>{children}</h3>;
    case "blockquote":
      return <blockquote key={key}>{children}</blockquote>;
    case "li":
      return (
        <ul key={key}>
          <li>{children}</li>
        </ul>
      );
    default:
      return <p key={key}>{children}</p>;
  }
}

function Figure({
  block,
  tone,
  label,
}: {
  block: FlatBlock;
  tone?: "add" | "del";
  label?: string;
}) {
  return (
    <figure
      className={`article-figure relative ${
        tone === "add"
          ? "outline outline-2 outline-offset-4 outline-emerald-400"
          : tone === "del"
            ? "opacity-60 outline outline-2 outline-offset-4 outline-rose-400"
            : ""
      }`}
      data-align="center"
    >
      {label && (
        <span
          className={`absolute left-2 top-2 z-10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white ${
            tone === "add" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {label}
        </span>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={block.src} alt={block.alt ?? ""} loading="lazy" />
    </figure>
  );
}

/** Inline “track changes” style view: green = added, red strike = removed. */
export function TrackedBody({ blocks }: { blocks: DiffBlock[] }) {
  return (
    <div className="article-body">
      {blocks.map((d, i) => {
        const b = d.block;
        if (b.kind === "image") {
          if (d.op === "insert") return <Figure key={i} block={b} tone="add" label="Added image" />;
          if (d.op === "delete") return <Figure key={i} block={b} tone="del" label="Removed image" />;
          return <Figure key={i} block={b} />;
        }
        switch (d.op) {
          case "equal":
            return wrapTag(b.tag, i, b.text);
          case "insert":
            return wrapTag(
              b.tag,
              i,
              <ins className="rounded-sm bg-emerald-100 text-emerald-950 no-underline ring-1 ring-emerald-200">
                {b.text}
              </ins>
            );
          case "delete":
            return wrapTag(
              b.tag,
              i,
              <del className="rounded-sm bg-rose-100 text-rose-900 ring-1 ring-rose-200">
                {b.text}
              </del>
            );
          case "change":
            return wrapTag(b.tag, i, <Segs segs={d.segs} />);
        }
      })}
    </div>
  );
}
