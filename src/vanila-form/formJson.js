export const formConfig = {
  steps: [
    {
      id: 1,
      title: "Customer details",
      subtitle: "",
      sections: [
        {
          sectionLabel: "Customer",
          rows: [
            {
              fields: [
                {
                  type: "select",
                  name: "title",
                  placeholder: "Title",
                  required: true,
                  width: "30%",
                  options: [
                    { value: "mr", label: "Mr" },
                    { value: "mrs", label: "Mrs" },
                    { value: "ms", label: "Ms" },
                    { value: "dr", label: "Dr" },
                  ],
                },
                {
                  type: "text",
                  name: "firstName",
                  placeholder: "First Name",
                  required: true,
                  width: "70%",
                },
              ],
            },
            {
              fields: [
                {
                  type: "text",
                  name: "lastName",
                  placeholder: "Last Name",
                  required: true,
                  width: "100%",
                },
              ],
            },
          ],
        },
        {
          rows: [
            {
              fields: [
                {
                  type: "text",
                  name: "contactNumber",
                  label: "Contact Number",
                  placeholder: "",
                  required: true,
                  width: "50%",
                },
              ],
            },
          ],
        },
        {
          rows: [
            {
              fields: [
                {
                  type: "text",
                  name: "emailAddress",
                  label: "Email Address",
                  placeholder: "",
                  width: "100%",
                },
              ],
            },
          ],
        },
        {
          sectionLabel: "Postal Address",
          rows: [
            {
              fields: [
                {
                  type: "text",
                  name: "address",
                  placeholder: "Address",
                  width: "48%",
                },
                {
                  type: "text",
                  name: "suburb",
                  placeholder: "Suburb",
                  width: "48%",
                },
              ],
            },
            {
              fields: [
                {
                  type: "select",
                  name: "state",
                  placeholder: "State",
                  width: "48%",
                  options: [
                    { value: "nsw", label: "NSW" },
                    { value: "vic", label: "VIC" },
                    { value: "qld", label: "QLD" },
                    { value: "wa", label: "WA" },
                    { value: "sa", label: "SA" },
                    { value: "tas", label: "TAS" },
                    { value: "act", label: "ACT" },
                    { value: "nt", label: "NT" },
                  ],
                },
                {
                  type: "text",
                  name: "postCode",
                  placeholder: "Post Code",
                  width: "48%",
                },
              ],
            },
          ],
        },
        {
          sectionLabel: "Date of Birth",
          rows: [
            {
              fields: [
                {
                  type: "text",
                  name: "day",
                  placeholder: "Day",
                  width: "20%",
                },
                {
                  type: "text",
                  name: "month",
                  placeholder: "Month",
                  width: "25%",
                },
                {
                  type: "text",
                  name: "year",
                  placeholder: "Year",
                  width: "51%",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 2,
      title: "Solid Wall Caravan Details",
      subtitle: "",
      sections: [
        {
          rows: [
            {
              fields: [
                {
                  type: "text",
                  name: "make",
                  label: "Make",
                  placeholder: "testignore",
                  required: true,
                  width: "100%",
                },
              ],
            },
            {
              fields: [
                {
                  type: "text",
                  name: "model",
                  label: "Model",
                  placeholder: "testignore",
                  required: true,
                  width: "100%",
                },
              ],
            },
            {
              fields: [
                {
                  type: "text",
                  name: "yearOfManufacture",
                  label: "Year of manufacture",
                  placeholder: "2000",
                  required: true,
                  width: "40%",
                },
              ],
            },
            {
              fields: [
                {
                  type: "number",
                  name: "lengthValue",
                  label: "Length",
                  placeholder: "6",
                  required: true,
                  width: "40%",
                },
              ],
            },
            {
              fields: [
                {
                  type: "date",
                  name: "ownershipDate",
                  label: "Estimated date of ownership",
                  placeholder: "31/08/2025",
                  width: "50%",
                },
              ],
            },
            {
              fields: [
                {
                  type: "radio",
                  name: "separateAnnexe",
                  label: "Is there a separate annexe?",
                  required: true,
                  value: "no",
                  width: "100%",
                  options: [
                    { value: "no", label: "No" },
                    { value: "yes", label: "Yes" },
                  ],
                },
              ],
            },
            {
              fields: [
                {
                  type: "priceCalculation",
                  name: "purchasePrice",
                  label: "Purchase price",
                  width: "100%",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
