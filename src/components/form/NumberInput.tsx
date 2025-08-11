import React from "react";

interface NumberInputProps {
  label: string;
  value: string | number;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  name: string;
}

const NumberInput: React.FC<NumberInputProps> = ({
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
        type="number"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
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

export default NumberInput;
