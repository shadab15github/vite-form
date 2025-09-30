const NumberInput = ({
  value,
  name,
  placeholder,
  label,
  onChange,
  min,
  max,
  step,
  required,
  disabled,
}) => {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={name} className="text-sm text-gray-600 mb-1 block">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type="number"
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        required={required}
        disabled={disabled}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:bg-gray-50"
      />
    </div>
  );
};

export default NumberInput;
