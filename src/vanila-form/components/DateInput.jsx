const DateInput = ({ value, name, label, placeholder, onChange, required }) => {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={name} className="text-sm text-gray-600 mb-1 block">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type="text"
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400"
      />
    </div>
  );
};

export default DateInput;
