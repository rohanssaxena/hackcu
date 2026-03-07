import { useLocation } from "react-router-dom";

const PAGE_NAMES = {
  "/progress": "Progress",
  "/academics": "Academics",
  "/review": "Review",
};

export default function ComingSoon() {
  const { pathname } = useLocation();
  const name = PAGE_NAMES[pathname] || "This page";

  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="font-sans text-[15px] text-text-secondary">
        {name} is coming soon. Check back later!
      </p>
    </div>
  );
}
