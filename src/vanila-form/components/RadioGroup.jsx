const RadioGroup = ({
  name,
  label,
  value,
  options,
  onChange,
  orientation = "horizontal",
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="text-sm text-gray-600 mb-2 block">{label}</label>
      )}
      <div
        className={`flex ${
          orientation === "horizontal" ? "flex-row gap-6" : "flex-col gap-2"
        }`}
      >
        {options.map((option) => (
          <label
            key={option.value}
            className="flex items-center cursor-pointer"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={onChange}
              className="w-4 h-4 text-black border-gray-300 focus:ring-1 focus:ring-black"
            />
            <span
              className={`ml-2 text-sm ${
                value === option.value
                  ? "text-black font-medium"
                  : "text-gray-600"
              }`}
            >
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default RadioGroup;
