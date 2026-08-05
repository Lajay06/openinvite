import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Photo carousel used by every auth surface (/register and /login via
// AuthLayout, plus /forgot-password and /reset-password). Photos and dots
// only — the caption overlay this once carried (a quote plus an "Openinvite"
// attribution row) is gone from all four, so there is no showOverlay prop
// left to switch it back on.
const ImageSlider = React.forwardRef(({ images, interval = 5000, className, ...props }, ref) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) =>
        prevIndex === images.length - 1 ? 0 : prevIndex + 1
      );
    }, interval);
    return () => clearInterval(timer);
  }, [images, interval]);

  return (
    <div ref={ref} className={cn("relative w-full h-full overflow-hidden bg-black", className)} {...props}>
      <AnimatePresence initial={false}>
        <motion.img
          key={currentIndex}
          src={images[currentIndex]}
          alt={`Slide ${currentIndex + 1}`}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute top-0 left-0 w-full h-full object-cover"
        />
      </AnimatePresence>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={cn(
              "w-2 h-2 rounded-full transition-colors duration-300",
              currentIndex === index ? "bg-white w-6" : "bg-white/50 hover:bg-white"
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
});

ImageSlider.displayName = "ImageSlider";
export { ImageSlider };
