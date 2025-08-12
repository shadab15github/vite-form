import React, { useState } from "react";
import TextInput from "./TextInput";
import NumberInput from "./NumberInput";
import Button from "./Button";

export interface DynamicFormProps {
  fields: {
    id: string;
    type: "text-input" | "number-input";
    props: {
      label: string;
      placeholder: string;
      name: string;
      value: string | number;
    };
  }[];
  apiUrl: string;
}

const DynamicForm: React.FC<DynamicFormProps> = ({ fields, apiUrl }) => {
  const [formFields, setFormFields] = useState(fields);

  const handleChange = (name: string, value: string) => {
    setFormFields((prev) =>
      prev.map((field) =>
        field.props.name === name
          ? { ...field, props: { ...field.props, value } }
          : field
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = formFields.reduce((acc, field) => {
      acc[field.props.name] = field.props.value;
      return acc;
    }, {} as Record<string, unknown>);

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("Form submitted successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to submit form");
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "400px", margin: "auto" }}>
      <h2 style={{ textAlign: "center" }}>Dynamic Form</h2>
      <form onSubmit={handleSubmit}>
        {formFields.map((field) => {
          if (field.type === "text-input") {
            return (
              <TextInput
                key={field.id}
                {...field.props}
                value={String(field.props.value)}
                onChange={(e) => handleChange(field.props.name, e.target.value)}
              />
            );
          }
          if (field.type === "number-input") {
            return (
              <NumberInput
                key={field.id}
                {...field.props}
                value={field.props.value}
                onChange={(e) => handleChange(field.props.name, e.target.value)}
              />
            );
          }
          return null;
        })}
        <Button title="Submit" type="submit" />
      </form>
    </div>
  );
};

export default DynamicForm;
