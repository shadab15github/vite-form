import React from "react";

interface ButtonProps {
  title: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}

const Button: React.FC<ButtonProps> = ({ title, onClick, type = "button" }) => {
  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        padding: "8px 16px",
        margin: "4px",
        border: "none",
        borderRadius: "4px",
        backgroundColor: "#007bff",
        color: "#fff",
        cursor: "pointer",
      }}
    >
      {title}
    </button>
  );
};

export default Button;
