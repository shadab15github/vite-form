const PriceCalculation = ({ label, showAnnexe, formData, onChange }) => {
  const caravanPrice = parseInt(formData.caravanPrice || 10000);
  const annexePrice = parseInt(formData.annexePrice || 0);
  const total = caravanPrice + annexePrice;

  return (
    <div className="w-full">
      <label className="text-sm text-gray-600 mb-2 block">{label}</label>

      {showAnnexe ? (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">
            Enter a number between $1 and $2,000,000
          </p>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center border border-blue-400 bg-blue-50 rounded-md px-3 py-2.5">
                <span className="text-sm text-gray-700">
                  Solid Wall Caravan
                </span>
                <input
                  type="text"
                  name="caravanPrice"
                  value={formData.caravanPrice || 10000}
                  onChange={onChange}
                  className="ml-auto text-right bg-transparent border-none outline-none w-24 text-gray-900 focus:outline-none"
                />
              </div>
            </div>

            <span className="text-gray-400">+</span>
            <div className="flex-1">
              <input
                type="text"
                name="annexePrice"
                value={formData.annexePrice || ""}
                placeholder="Annexe"
                onChange={onChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <span className="text-gray-400">=</span>
            <div className="w-28 text-right text-gray-700 font-medium">
              ${total.toLocaleString()}
            </div>
          </div>
        </div>
      ) : (
        <input
          type="text"
          name="purchasePrice"
          value={formData.purchasePrice || ""}
          onChange={onChange}
          placeholder="Enter purchase price"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      )}
    </div>
  );
};

export default PriceCalculation;
