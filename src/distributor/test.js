export default async function decorate(block) {
  function formatPhoneNumber(num) {
    const str = String(num);
    return `${str.slice(0, 4)}-${str.slice(4, 7)}-${str.slice(7)}`;
  }

  try {
    const response = await fetch(
      `${window.hlx.codeBasePath}/dealer-details.json`
    );
    const data = await response.json();
    const UUID = "16a18ee7-372c-456a-baff-81183198518e";

    block.innerHTML = "";

    if (data && Array.isArray(data.data)) {
      // Create dropdown container
      const dropdownContainer = document.createElement("div");
      dropdownContainer.classList.add("distributor-dropdown-container");

      // Create label
      const label = document.createElement("label");
      label.textContent = "Select Distributor:";
      label.setAttribute("for", "distributor-select");
      dropdownContainer.appendChild(label);

      // Create select element
      const select = document.createElement("select");
      select.id = "distributor-select";
      select.classList.add("distributor-select");

      // Add default option
      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = "-- Select a Distributor --";
      defaultOption.disabled = true;
      defaultOption.selected = true;
      select.appendChild(defaultOption);

      // Populate dropdown with unique distributor names
      const uniqueDistributors = {};
      data.data.forEach((item) => {
        const distributorName = item["Distributor Name"];
        if (distributorName && !uniqueDistributors[distributorName]) {
          uniqueDistributors[distributorName] = true;
          const option = document.createElement("option");
          option.value = distributorName;
          option.textContent = distributorName;
          select.appendChild(option);
        }
      });

      dropdownContainer.appendChild(select);
      block.appendChild(dropdownContainer);

      // Create details container (initially hidden)
      const detailsContainer = document.createElement("div");
      detailsContainer.classList.add("dealer-details-container");
      block.appendChild(detailsContainer);

      // Event listener for dropdown change
      select.addEventListener("change", (event) => {
        const selectedDistributor = event.target.value;

        console.log("Selected distributor:", selectedDistributor);

        if (selectedDistributor) {
          // Find the dealer with this distributor name
          const dealer = data.data.find(
            (d) => d["Distributor Name"] === selectedDistributor
          );

          console.log("Found dealer:", dealer);

          if (dealer) {
            const dealerRepsContactNumber = dealer["BDM Contact Number"];
            const customerContactNumber = dealer["Customer Contact Number"];
            const businessHours = dealer["Business Hours"];
            const businessHoursbr = businessHours.replace(/,\s*/g, "<br>");

            detailsContainer.innerHTML = `
              <div class="dealer-details">
                <p><strong>CIL Distributortest: </strong>${
                  dealer["Distributor Name"]
                }</p>
                <p><strong>Agent number: </strong>${dealer["Agent Number"]}</p>
                <div class="call-wrapper">
                  <p><strong>Your BDM: </strong>${dealer["BDM Name"]}</p>
                  <div class="call-icon-details-wrapper">
                    <img
                      class="call-icon"
                      src="${window.hlx.codeBasePath}/icons/call.svg"
                      alt="Call Icon"
                      style="cursor: pointer;"
                    />
                    <div class="call-details">
                      <p><strong>Dealer Reps only: ${formatPhoneNumber(
                        dealerRepsContactNumber
                      )}</strong></p>
                      <p>Customers: ${formatPhoneNumber(
                        customerContactNumber
                      )}</p>
                      <p class="opening-time">${businessHoursbr}</p>
                    </div>
                  </div>
                </div>
              </div>
            `;

            // Toggle call details on icon click
            const callIcon = detailsContainer.querySelector(".call-icon");
            const callDetails = detailsContainer.querySelector(".call-details");

            if (callIcon && callDetails) {
              callIcon.addEventListener("click", (event) => {
                event.stopPropagation();
                callIcon.classList.toggle("icon-border");
                callDetails.classList.toggle("expanded");
              });

              // Close call details when clicking outside
              document.addEventListener("click", (event) => {
                if (
                  !callIcon.contains(event.target) &&
                  !callDetails.contains(event.target)
                ) {
                  callIcon.classList.remove("icon-border");
                  callDetails.classList.remove("expanded");
                }
              });
            }
          } else {
            detailsContainer.innerHTML = `<p>Dealer with name "${selectedDistributor}" not found.</p>`;
          }
        } else {
          detailsContainer.innerHTML = "";
        }
      });
    } else {
      console.error("Dealer data array missing or invalid.");
    }
  } catch (error) {
    console.error("Error loading dealer details:", error);
  }
}

// Initialize on DOMContentLoaded
window.addEventListener("DOMContentLoaded", () => {
  const block = document.querySelector(".distributor.block");
  if (block) {
    decorate(block);
  } else {
    console.warn("Distributor block not found!");
  }
});
