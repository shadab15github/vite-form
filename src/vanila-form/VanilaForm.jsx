import { useState } from "react";
import { formConfig } from "./formJson";
import TextInput from "./components/TextInput";
import NumberInput from "./components/NumberInput";
import SelectInput from "./components/SelectInput";
import DateInput from "./components/DateInput";
import RadioGroup from "./components/RadioGroup";
import PriceCalculation from "./components/PriceCalculation";
import Button from "./components/Button";

const VanilaForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    separateAnnexe: "no",
    caravanPrice: "10000",
    annexePrice: "",
    purchasePrice: "",
  });
  const totalSteps = formConfig.steps.length;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Only allow numbers for price fields
    if (
      name === "caravanPrice" ||
      name === "annexePrice" ||
      name === "purchasePrice"
    ) {
      const numericValue = value.replace(/[^0-9]/g, "");
      setFormData((prev) => ({
        ...prev,
        [name]: numericValue,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleContinue = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      console.log("Form submitted:", formData);
      alert("Form submitted successfully!");
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderField = (field) => {
    const commonProps = {
      name: field.name,
      value: formData[field.name] || "",
      onChange: handleInputChange,
      placeholder: field.placeholder,
      label: field.label,
      required: field.required,
      disabled: field.disabled,
    };

    switch (field.type) {
      case "text":
        return <TextInput {...commonProps} />;
      case "number":
        return (
          <NumberInput
            {...commonProps}
            min={field.min}
            max={field.max}
            step={field.step}
          />
        );
      case "select":
        return <SelectInput {...commonProps} options={field.options || []} />;
      case "date":
        return <DateInput {...commonProps} />;
      case "radio":
        return (
          <RadioGroup
            name={field.name}
            label={field.label}
            value={formData[field.name] || field.value}
            options={field.options}
            onChange={handleInputChange}
          />
        );
      case "priceCalculation":
        return (
          <PriceCalculation
            label={field.label}
            showAnnexe={formData.separateAnnexe === "yes"}
            formData={formData}
            onChange={handleInputChange}
          />
        );
      default:
        return null;
    }
  };

  const currentStepConfig = formConfig.steps.find(
    (step) => step.id === currentStep
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Progress Indicator */}
        <div className="flex items-center mb-8">
          <div className="flex items-center">
            {[...Array(totalSteps)].map((_, index) => (
              <React.Fragment key={index}>
                <div
                  className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2
                  ${
                    index + 1 === currentStep
                      ? "bg-black text-white border-black"
                      : index + 1 < currentStep
                      ? "bg-green-500 text-white border-green-500"
                      : "bg-white text-gray-400 border-gray-300"
                  }
                `}
                >
                  {index + 1 < currentStep ? (
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                {index < totalSteps - 1 && (
                  <div className="w-32 h-0.5 bg-gray-300 mx-2" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step Labels */}
        <div className="flex justify-between mb-6 px-4">
          <div className="text-center">
            <p
              className={`text-sm ${
                currentStep === 1
                  ? "font-medium text-gray-900"
                  : "text-gray-500"
              }`}
            >
              Customer details
            </p>
          </div>
          <div className="text-center">
            <p
              className={`text-sm ${
                currentStep === 2
                  ? "font-medium text-gray-900"
                  : "text-gray-500"
              }`}
            >
              Solid Wall Caravan Details
            </p>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* Form Fields */}
          <div className="px-8 py-6">
            {currentStepConfig.sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="mb-6 last:mb-0">
                {section.sectionLabel && (
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700">
                      {section.sectionLabel}
                      {section.sectionLabel === "Customer" && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </label>
                  </div>
                )}
                {section.rows.map((row, rowIndex) => (
                  <div key={rowIndex} className="mb-4 last:mb-0">
                    <div className="flex gap-3 items-start">
                      {row.fields.map((field, fieldIndex) => (
                        <div key={fieldIndex} style={{ width: field.width }}>
                          {renderField(field)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="px-8 py-6 border-t border-gray-200">
            <div className="flex justify-between">
              {currentStep > 1 && (
                <Button variant="secondary" onClick={handleBack}>
                  Back
                </Button>
              )}
              <div className={currentStep === 1 ? "ml-auto" : ""}>
                <Button variant="primary" onClick={handleContinue}>
                  {currentStep === totalSteps ? "Submit" : "Continue"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VanilaForm;
