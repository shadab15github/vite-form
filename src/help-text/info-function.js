/**
 * Creates an info icon element for help text tooltip
 * @param {Object} fd The field definition
 * @returns {HTMLElement|null} The info icon element or null
 */
export function createInfoIcon(fd) {
  if (!fd.description) {
    return null;
  }

  const infoIcon = document.createElement("span");
  infoIcon.className = "field-info-icon";
  infoIcon.setAttribute("role", "button");
  infoIcon.setAttribute("tabindex", "0");
  infoIcon.setAttribute("aria-label", "More information");

  // SVG info icon
  infoIcon.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" fill="none"/>
      <path d="M8 7V11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="8" cy="5" r="0.5" fill="currentColor"/>
    </svg>
  `;

  // Create tooltip element
  const tooltip = document.createElement("span");
  tooltip.className = "field-info-tooltip";
  tooltip.innerHTML = fd.description;
  tooltip.setAttribute("role", "tooltip");
  infoIcon.appendChild(tooltip);

  return infoIcon;
}
