import type { Metadata } from "next";
import Link from "next/link";
import { COMMENT_LIMITS, MODERATION_EMAIL } from "@/lib/comments";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Community guidelines",
  description: `How discussion works on ${site.name}.`,
};

export default function GuidelinesPage() {
  return (
    <article className="article-body mx-auto max-w-2xl py-10">
      <h1 className="font-serif text-4xl font-bold">Community guidelines</h1>
      <p className="mt-3 text-lg leading-snug text-ink-soft">
        Anyone with an account can join the discussion under our stories. These
        rules are about how we talk to each other, never about which opinions
        are allowed.
      </p>

      <h2>What is welcome</h2>
      <p>
        Disagreement, criticism and hard questions. You can challenge a
        story, our reporting, the students&rsquo; association or the
        university. Strong views are fine when they are aimed at ideas and
        actions, not at people.
      </p>

      <h2>What is not allowed</h2>
      <ul>
        <li>Threats, or encouraging violence or self-harm.</li>
        <li>Harassment, or hateful language aimed at a person or group.</li>
        <li>
          Publishing someone&rsquo;s private information, such as phone
          numbers, addresses, or matric numbers.
        </li>
        <li>Pretending to be another person or a member of the newsroom.</li>
        <li>Spam, advertising, or asking people to contact you privately for business.</li>
        <li>Sexual or graphic content.</li>
      </ul>

      <h2>Limits</h2>
      <ul>
        <li>
          Comments run from {COMMENT_LIMITS.minChars} to{" "}
          {COMMENT_LIMITS.commentMax.toLocaleString()} characters (about 200
          words). Replies can be up to {COMMENT_LIMITS.replyMax} characters.
        </li>
        <li>Plain text only. Links are shown as text and are not clickable.</li>
        <li>
          To keep things readable, you can post once every 15 seconds and up
          to 20 times a day.
        </li>
        <li>
          You can edit a comment for {COMMENT_LIMITS.editWindowMinutes}{" "}
          minutes after posting, and delete it at any time.
        </li>
        <li>
          Replies sit one level under a comment. Replying to a reply stays in
          the same thread.
        </li>
      </ul>

      <h2>How reporting works</h2>
      <p>
        Use <strong>Report</strong> in the &ldquo;&hellip;&rdquo; menu on any
        comment. Pick a reason and, if you like, add a short note. Each person
        can report a comment once.
      </p>
      <p>
        Nothing is deleted automatically. If three different people report the
        same comment it is <strong>collapsed</strong>: still there, one click
        to read, while an editor looks at it. The editor then keeps it,
        keeps it collapsed, or removes it and gives a reason.
      </p>

      <h2>The language filter</h2>
      <p>
        A short list of threats, slurs and spam phrases is checked when you
        post. A match does not reject your comment. It is held, visible only
        to you with an &ldquo;Awaiting editor review&rdquo; note, until an
        editor approves or removes it. The filter looks at language only, never
        opinion.
      </p>

      <h2>Who moderates</h2>
      <p>
        Moderation is done by {site.name} editors. Every action, including
        collapses, removals, restores and suspensions, is written to a log that
        can be reviewed by the university administration. Removed comments
        show a notice with the reason. We do not remove comments for being
        critical.
      </p>

      <h2>Suspensions</h2>
      <p>
        For serious or repeated breaches an editor can pause someone&rsquo;s
        ability to comment, either for 7 days or until it is lifted. You can
        still read and sign in. The decision can be reviewed by another editor.
      </p>

      <h2>Appeals</h2>
      <p>
        {MODERATION_EMAIL ? (
          <>
            If you think a comment was removed or you were suspended by
            mistake, email{" "}
            <a href={`mailto:${MODERATION_EMAIL}`}>{MODERATION_EMAIL}</a> and
            a different editor will look again.
          </>
        ) : (
          <>
            If you think a comment was removed or you were suspended by
            mistake, contact the newsroom and a different editor will look
            again.
          </>
        )}
      </p>

      <p className="mt-10 text-sm text-ink-soft">
        Back to the{" "}
        <Link href="/" className="underline underline-offset-2">
          front page
        </Link>
        .
      </p>
    </article>
  );
}
