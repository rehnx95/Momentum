import { MessageCircle } from "lucide-react";
import Tooltip from "./Tooltip";

const feedbackEmail = "rehan95378@gmail.com";
const feedbackSubject = encodeURIComponent("Track Sheet feedback");

export default function FeedbackButton({ placement = "floating" }) {
  const isHeaderButton = placement === "header";
  const href = isHeaderButton
    ? `mailto:${feedbackEmail}?subject=${feedbackSubject}`
    : `https://mail.google.com/mail/?view=cm&fs=1&to=${feedbackEmail}&su=${feedbackSubject}`;

  return (
    <Tooltip
      label="Send feedback"
      portal
      className={`feedback-button-anchor feedback-button-${placement}`}
    >
      <a
        href={href}
        target={isHeaderButton ? undefined : "_blank"}
        rel={isHeaderButton ? undefined : "noopener noreferrer"}
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
