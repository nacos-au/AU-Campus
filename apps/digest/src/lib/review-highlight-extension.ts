import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { matchAnchors } from "@/lib/anchor-match";
import type { HighlightSpec } from "@/lib/review-highlights";

const key = new PluginKey("reviewHighlights");

export type ReviewHighlightOptions = {
  /** Read on every update so the extension never needs re-creating. */
  getSpecs: () => HighlightSpec[];
  onClick: (id: string) => void;
};

/**
 * Editor comment highlights as ProseMirror decorations. Unlike DOM-painted
 * marks these survive typing, because ProseMirror owns the rendering.
 */
export const ReviewHighlights = Extension.create<ReviewHighlightOptions>({
  name: "reviewHighlights",

  addOptions() {
    return { getSpecs: () => [], onClick: () => {} };
  },

  addProseMirrorPlugins() {
    const opts = this.options;
    return [
      new Plugin({
        key,
        props: {
          decorations(state) {
            const specs = opts.getSpecs();
            if (specs.length === 0) return DecorationSet.empty;
            const { ranges } = matchAnchors(state.doc, specs);
            return DecorationSet.create(
              state.doc,
              ranges.map((r) =>
                Decoration.inline(r.from, r.to, {
                  nodeName: "mark",
                  class:
                    r.id === "pending"
                      ? "review-mark review-mark--pending"
                      : "review-mark",
                  "data-review-id": r.id,
                })
              )
            );
          },
          handleClick(_view, _pos, event) {
            const el = (event.target as HTMLElement | null)?.closest?.(
              "mark[data-review-id]"
            ) as HTMLElement | null;
            const id = el?.dataset.reviewId;
            if (id && id !== "pending") opts.onClick(id);
            return false;
          },
        },
      }),
    ];
  },
});
