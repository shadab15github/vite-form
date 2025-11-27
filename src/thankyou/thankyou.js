export default async function decorate(block) {
  const [cliTitleDiv, cliContactMsgDiv, cliEmailMsgDiv, cliButtonDiv] =
    block.querySelectorAll(":scope > div");

  // Extract fields like your privacyLinks style
  const cliTitleText = cliTitleDiv?.textContent?.trim() || "";
  const cliContactMsgText = cliContactMsgDiv?.textContent?.trim() || "";
  const cliEmailMsgText = cliEmailMsgDiv?.textContent?.trim() || "";

  const cliButtonLink = cliButtonDiv?.querySelector("a");
  const cliButtonText = cliButtonLink?.textContent?.trim() || "";
  const cliButtonUrl = cliButtonLink?.href || "#";

  // Session storage values
  const leadId = sessionStorage.getItem("leadId") || "N/A";
  const fromType = sessionStorage.getItem("fromType") || "";

  let finalMessage = "";

  if (fromType === "contact") {
    finalMessage = cliContactMsgText;
  } else if (fromType === "email") {
    finalMessage = cliEmailMsgText;
  }

  // Build container
  const container = document.createElement("div");
  container.classList.add("cli-thankyou-container");

  // Title
  const title = document.createElement("h2");
  title.textContent = cliTitleText;
  title.classList.add("cli-thankyou-title");

  // Message
  const message = document.createElement("p");
  message.classList.add("cli-thankyou-message");
  message.textContent = `Your Lead Id: ${leadId}, ${finalMessage}`;

  // Button
  const btn = document.createElement("a");
  btn.textContent = cliButtonText;
  btn.href = cliButtonUrl;
  btn.classList.add("cli-thankyou-btn");

  container.appendChild(title);
  container.appendChild(message);
  container.appendChild(btn);

  block.innerHTML = "";
  block.append(container);
}
