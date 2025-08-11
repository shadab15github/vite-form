import React from "react";

interface TextInputProps {
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  name: string;
}

const TextInput: React.FC<TextInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
  name,
}) => {
  return (
    <div style={{ marginBottom: "12px" }}>
      <label
        style={{
          display: "block",
          marginBottom: "4px",
          textTransform: "capitalize",
        }}
      >
        {label}
      </label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        name={name}
        style={{
          padding: "8px",
          border: "1px solid #ccc",
          borderRadius: "4px",
          width: "100%",
        }}
      />
    </div>
  );
};

export default TextInput;
