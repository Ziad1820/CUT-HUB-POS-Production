(() => {
  "use strict";

  function filterItems(items, query, negativeOnly) {
    const normalizedQuery = String(query || "").trim().toLowerCase();
    return (Array.isArray(items) ? items : []).filter(item => {
      if (!item || item.active === false) return false;
      if (negativeOnly && Number(item.stock?.totalQuantity || 0) >= 0) return false;
      if (!normalizedQuery) return true;
      return [
        item.name,
        item.category,
        item.barcode
      ].some(value => String(value || "").toLowerCase().includes(normalizedQuery));
    });
  }

  window.RomeoInventoryFilters = Object.freeze({ filterItems });
})();
