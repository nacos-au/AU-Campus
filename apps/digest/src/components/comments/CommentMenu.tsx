"use client";

import { useMemo, useRef, useState } from "react";
import { IconMoreHorizontal } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { commentAnchor, type CommentData, type CommentMeta } from "@/lib/comments";
import {
  DeleteDialog,
  RemoveDialog,
  ReportDialog,
  SuspendDialog,
} from "./CommentDialogs";
import { useDismiss } from "./useDismiss";

type Dialog = "report" | "remove" | "suspend" | "delete" | null;

const itemCls =
  "block w-full px-4 py-2.5 text-left text-sm text-ink hover:bg-accent-soft";

export function CommentMenu({
  comment,
  meta,
  onUpdate,
  onDeleted,
  onEdit,
  notify,
}: {
  comment: CommentData;
  meta: CommentMeta;
  onUpdate: (c: CommentData) => void;
  onDeleted: () => void;
  onEdit: () => void;
  notify: (msg: string) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  useDismiss(ref, open, () => setOpen(false));

  const live = !comment.deleted && comment.status !== "removed";
  const canReport =
    !comment.is_mine &&
    !comment.deleted &&
    (comment.status === "visible" || comment.status === "collapsed");
  const canDelete = comment.is_mine && live;
  const staff = meta.staff;

  async function copyLink() {
    setOpen(false);
    const url = `${window.location.origin}${window.location.pathname}#${commentAnchor(comment.id)}`;
    try {
      await navigator.clipboard.writeText(url);
      notify("Link copied.");
    } catch {
      notify(url);
    }
  }

  async function moderate(action: "keep" | "collapse" | "restore" | "approve") {
    setOpen(false);
    const { data, error } = await supabase.rpc("moderate_comment", {
      p_comment_id: comment.id,
      p_action: action,
    });
    if (error) {
      notify(error.message);
      return;
    }
    onUpdate(data as CommentData);
  }

  function requireSignIn(next: () => void) {
    setOpen(false);
    if (!meta.signed_in) {
      notify("Sign in to do that.");
      return;
    }
    next();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-black/5 hover:text-ink"
      >
        <IconMoreHorizontal className="h-5 w-5" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-56 border border-rule-dark bg-paper py-1 shadow-lg"
        >
          <button type="button" role="menuitem" onClick={copyLink} className={itemCls}>
            Copy link
          </button>

          {canReport && (
            <button
              type="button"
              role="menuitem"
              onClick={() => requireSignIn(() => setDialog("report"))}
              className={itemCls}
            >
              Report
            </button>
          )}

          {comment.can_edit && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              className={itemCls}
            >
              Edit
            </button>
          )}

          {canDelete && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setDialog("delete");
              }}
              className={`${itemCls} text-red-700`}
            >
              Delete
            </button>
          )}

          {staff && (
            <>
              <div className="my-1 border-t border-rule" />
              <p className="px-4 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                Editors
              </p>
              {comment.status === "visible" && !comment.deleted && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => moderate("collapse")}
                  className={itemCls}
                >
                  Collapse
                </button>
              )}
              {comment.status === "collapsed" && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => moderate("keep")}
                  className={itemCls}
                >
                  Keep visible
                </button>
              )}
              {comment.status === "held" && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => moderate("approve")}
                  className={itemCls}
                >
                  Approve
                </button>
              )}
              {comment.status === "removed" && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => moderate("restore")}
                  className={itemCls}
                >
                  Restore
                </button>
              )}
              {comment.status !== "removed" && !comment.deleted && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    setDialog("remove");
                  }}
                  className={`${itemCls} text-red-700`}
                >
                  Remove…
                </button>
              )}
              {comment.author_id && !comment.is_mine && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    setDialog("suspend");
                  }}
                  className={`${itemCls} text-red-700`}
                >
                  Suspend commenter…
                </button>
              )}
            </>
          )}
        </div>
      )}

      {dialog === "report" && (
        <ReportDialog
          commentId={comment.id}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            notify("Thanks. The editors will take a look.");
          }}
        />
      )}
      {dialog === "remove" && (
        <RemoveDialog
          commentId={comment.id}
          onClose={() => setDialog(null)}
          onDone={(item) => {
            setDialog(null);
            onUpdate(item);
          }}
        />
      )}
      {dialog === "suspend" && comment.author_id && (
        <SuspendDialog
          userId={comment.author_id}
          userName={comment.author_name}
          commentId={comment.id}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            notify(`${comment.author_name} is suspended from commenting.`);
          }}
        />
      )}
      {dialog === "delete" && (
        <DeleteDialog
          commentId={comment.id}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            onDeleted();
          }}
        />
      )}
    </div>
  );
}
