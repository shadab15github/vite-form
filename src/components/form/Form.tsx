import React, { useState } from "react";
import TextInput from "./TextInput";
import NumberInput from "./NumberInput";
import Button from "./Button";

export type FieldType = "text" | "number";

export interface Field {
  name: string;
  type: FieldType;
  value: string | number;
}

interface DynamicFormProps {
  fields: Field[];
  apiUrl: string;
}

const Form: React.FC<DynamicFormProps> = ({ fields, apiUrl }) => {
  const [formFields, setFormFields] = useState<Field[]>(fields);

  const handleChange = (name: string, value: string) => {
    setFormFields((prev) =>
      prev.map((field) => (field.name === name ? { ...field, value } : field))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Convert array of fields to object
    const payload = formFields.reduce((acc, field) => {
      acc[field.name] = field.value;
      return acc;
    }, {} as Record<string, unknown>);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      console.log("API Response:", result);
      alert("Form submitted successfully!");
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Failed to submit form.");
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "400px", margin: "auto" }}>
      <h2 style={{ textAlign: "center" }}>Dynamic Form</h2>
      <form onSubmit={handleSubmit}>
        {formFields.map((field) =>
          field.type === "text" ? (
            <TextInput
              key={field.name}
              name={field.name}
              label={field.name}
              placeholder={field.name}
              value={String(field.value)}
              onChange={(e) => handleChange(field.name, e.target.value)}
            />
          ) : (
            <NumberInput
              key={field.name}
              name={field.name}
              label={field.name}
              placeholder={field.name}
              value={field.value}
              onChange={(e) => handleChange(field.name, e.target.value)}
            />
          )
        )}

        <Button title="Submit" type="submit" />
      </form>
    </div>
  );
};

export default Form;
