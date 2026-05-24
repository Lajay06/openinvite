import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

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
      <div className="absolute bottom-16 left-6 right-6 z-10">
        <p className="text-white text-lg font-semibold leading-snug">"Planning a wedding should feel as exciting as the day itself."</p>
        <div className="flex items-center gap-2 mt-3">
          <img src="/logo-white.png" alt="Openinvite" className="h-5" onError={(e) => e.target.style.display='none'} />
          <span className="text-white/70 text-sm">The Openinvite team</span>
        </div>
      </div>
    </div>
  );
});

ImageSlider.displayName = "ImageSlider";
export { ImageSlider };
