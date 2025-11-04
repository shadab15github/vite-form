export default async function decorate(block) {
  function formatPhoneNumber(num) {
    const str = String(num);
    return `${str.slice(0, 4)} ${str.slice(4, 7)}`;
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
      dropdownContainer.classList.add("distributor-selector");

      // Create select dropdown
      const select = document.createElement("select");
      select.id = "distributor-select";
      select.classList.add("distributor-dropdown");

      // Add default option
      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = "-- Select Distributor --";
      select.appendChild(defaultOption);

      // Populate dropdown with distributor names
      data.data.forEach((distributor, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = distributor["Distributor Name"];
        select.appendChild(option);
      });

      dropdownContainer.appendChild(select);
      block.appendChild(dropdownContainer);

      // Create dealer details container (initially hidden)
      const dealerContainer = document.createElement("div");
      dealerContainer.classList.add("dealer-info-container");
      dealerContainer.style.display = "none";
      block.appendChild(dealerContainer);

      // Function to display dealer information
      function displayDealer(dealer) {
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
            <p>Call your BDM: <strong>${dealer["BDM Name"]}</strong></p>
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
                )}</strong> </p>
                <p>Customers: ${formatPhoneNumber(customerContactNumber)}</p>
                <p class="opening-time">${businessHoursbr}</p>
              </div>
            </div>
          </div>
        `;

        dealerContainer.innerHTML = "";
        dealerContainer.appendChild(dealerDiv);
        dealerContainer.style.display = "block";

        // Toggle call details on icon click
        const callIcon = dealerDiv.querySelector(".call-icon");
        const callDetails = dealerDiv.querySelector(".call-details");

        if (callIcon && callDetails) {
          callIcon.addEventListener("click", (event) => {
            event.stopPropagation();
            callIcon.classList.toggle("icon-border");
            callDetails.classList.toggle("expanded");
          });
        }

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

      // Add event listener for dropdown selection
      select.addEventListener("change", (event) => {
        const selectedIndex = event.target.value;

        if (selectedIndex === "") {
          dealerContainer.style.display = "none";
          dealerContainer.innerHTML = "";
          return;
        }

        const selectedDealer = data.data[selectedIndex];
        displayDealer(selectedDealer);
      });
    } else {
      block.textContent = "Dealer data array missing or invalid.";
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
