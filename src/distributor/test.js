export default async function decorate(block) {
  function formatPhoneNumber(num) {
    const str = String(num);
    return `${str.slice(0, 4)} ${str.slice(4, 7)} ${str.slice(7)}`;
  }

  try {
    const response = await fetch(
      `${window.hlx.codeBasePath}/dealer-details.json`
    );
    const data = await response.json();

    block.innerHTML = "";

    if (data && Array.isArray(data.data)) {
      // Create dropdown container
      const dropdownContainer = document.createElement("div");
      dropdownContainer.classList.add("distributor-dropdown-container");

      // Create label
      const label = document.createElement("label");
      label.textContent = "Select Distributor:";
      label.classList.add("distributor-label");

      // Create dropdown
      const dropdown = document.createElement("select");
      dropdown.classList.add("distributor-dropdown");
      dropdown.id = "distributorSelect";

      // Add default option
      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = "-- Select a Distributor --";
      dropdown.appendChild(defaultOption);

      // Populate dropdown with unique distributor names
      const uniqueDistributors = new Map();
      data.data.forEach((dealer) => {
        if (
          dealer["Distributor Name"] &&
          !uniqueDistributors.has(dealer["Distributor Name"])
        ) {
          uniqueDistributors.set(dealer["Distributor Name"], dealer);
        }
      });

      uniqueDistributors.forEach((dealer, distributorName) => {
        const option = document.createElement("option");
        option.value = distributorName;
        option.textContent = distributorName;
        dropdown.appendChild(option);
      });

      dropdownContainer.appendChild(label);
      dropdownContainer.appendChild(dropdown);
      block.appendChild(dropdownContainer);

      // Create container for dealer details (initially hidden)
      const detailsContainer = document.createElement("div");
      detailsContainer.classList.add("dealer-details-container");
      detailsContainer.style.display = "none";
      block.appendChild(detailsContainer);

      // Add event listener to dropdown
      dropdown.addEventListener("change", (event) => {
        const selectedDistributor = event.target.value;

        if (!selectedDistributor) {
          detailsContainer.style.display = "none";
          detailsContainer.innerHTML = "";
          return;
        }

        // Find all dealers with the selected distributor name
        const matchingDealers = data.data.filter(
          (d) => d["Distributor Name"] === selectedDistributor
        );

        if (matchingDealers.length > 0) {
          // Clear previous details
          detailsContainer.innerHTML = "";

          // Display details for each matching dealer
          matchingDealers.forEach((dealer) => {
            const dealerRepsContactNumber = dealer["BDM Contact Number"];
            const customerContactNumber = dealer["Customer Contact Number"];
            const businessHours = dealer["Business Hours"];
            const businessHoursbr = businessHours.replace(/,\s*/g, "<br>");
            const dealerDiv = document.createElement("div");
            dealerDiv.classList.add("dealer-details");

            dealerDiv.innerHTML = `
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
            `;

            detailsContainer.appendChild(dealerDiv);

            // Toggle call details on icon click
            const callIcon = dealerDiv.querySelector(".call-icon");
            const callDetails = dealerDiv.querySelector(".call-details");

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

              callDetails.addEventListener("click", (event) => {
                event.stopPropagation();
              });
            }
          });

          detailsContainer.style.display = "block";
        } else {
          detailsContainer.innerHTML = `<p>Dealer with distributor name "${selectedDistributor}" not found.</p>`;
          detailsContainer.style.display = "block";
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
  const block = document.querySelector(".distributor-block");
  if (block) {
    decorate(block);
  } else {
    console.warn("Distributor block not found!");
  }
});
