import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 240);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      className="back-to-top"
      onClick={() => window.scrollTo({ top: 0, left: 0, behavior: "smooth" })}
      aria-label="Volver arriba"
    >
      <ArrowUp size={18} />
    </button>
  );
}

export default BackToTopButton;