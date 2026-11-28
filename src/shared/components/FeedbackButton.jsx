import { MessageCircle } from "lucide-react";
import Tooltip from "./Tooltip";

const feedbackEmail = "rehan95378@gmail.com";
const feedbackSubject = encodeURIComponent("Momentum feedback");
const feedbackUrl = `https://mail.google.com/mail/u/0/?view=cm&fs=1&to=${feedbackEmail}&su=${feedbackSubject}`;

export default function FeedbackButton({ placement = "floating" }) {
  const isHeaderButton = placement === "header";

  return (
    <Tooltip
      label="Send feedback"
      portal
      className={`feedback-button-anchor feedback-button-${placement}`}
    >
      <a
        href={feedbackUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Send feedback by email"
        className={
          isHeaderButton
            ? "icon-btn"
            : "flex h-12 w-12 items-center justify-center rounded-full bg-accent text-onAccent shadow-lg transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        }
      >
        <MessageCircle size={isHeaderButton ? 18 : 20} aria-hidden="true" />
      </a>
    </Tooltip>
  );
}
