import { AdminFeedbackList } from "@/components/admin/admin-feedback-list";

export const metadata = { title: "Feedback · Admin" };

export default function AdminFeedbackPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
      <AdminFeedbackList />
    </div>
  );
}
