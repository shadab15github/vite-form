import { createOptimizedPicture } from "../../scripts/aem.js";
import { moveInstrumentation } from "../../scripts/scripts.js";

export default function decorate(block) {
  const container = document.createElement("div");
  container.classList.add("cli-carousel-container");

  const slidesWrapper = document.createElement("div");
  slidesWrapper.classList.add("cli-carousel-slides");

  // Create slides
  [...block.children].forEach((row) => {
    const slide = document.createElement("div");
    slide.classList.add("cli-carousel-slide");

    moveInstrumentation(row, slide);

    // Find <a> inside row
    const link = row.querySelector("a");
    if (link && link.href) {
      const optimizedPic = createOptimizedPicture(
        link.href,
        link.textContent || "",
        false,
        [{ width: "1200" }]
      );
      slide.append(optimizedPic);
    }

    slidesWrapper.append(slide);
  });

  // Dots
  const dotsWrapper = document.createElement("div");
  dotsWrapper.classList.add("cli-carousel-dots");

  const slides = slidesWrapper.querySelectorAll(".cli-carousel-slide");
  slides.forEach((_, i) => {
    const dot = document.createElement("span");
    dot.classList.add("dot");
    if (i === 0) dot.classList.add("active");
    dot.addEventListener("click", () => showSlide(i));
    dotsWrapper.append(dot);
  });

  container.append(slidesWrapper, dotsWrapper);
  block.textContent = "";
  block.append(container);

  let currentIndex = 0;
  const dots = dotsWrapper.querySelectorAll(".dot");

  function showSlide(index) {
    currentIndex = index;
    slidesWrapper.style.transform = `translateX(-${index * 100}%)`;

    dots.forEach((dot) => dot.classList.remove("active"));
    dots[index].classList.add("active");
  }

  // Auto slide
  setInterval(() => {
    let nextIndex = (currentIndex + 1) % slides.length;
    showSlide(nextIndex);
  }, 5000);

  // Init position
  showSlide(0);
}
