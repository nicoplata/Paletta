import React from 'react';
import '../../styles/FilterBar.css';

const FilterBar = ({ filters, activeFilters, onFilterChange }) => {
  const handleFilterClick = (filterId, value) => {
    onFilterChange(filterId, value);
  };

  return (
    <div className="filter-bar">
      {filters.map(filter => (
        <div key={filter.id} className="filter-group">
          <h3 className="filter-title">{filter.label}</h3>
          <div className="filter-options">
            {filter.options.map(option => (
              <button
                key={option.value}
                className={`filter-button ${activeFilters[filter.id] === option.value ? 'active' : ''}`}
                onClick={() => handleFilterClick(filter.id, option.value)}
              >
                {option.label}
                {option.count !== undefined && (
                  <span className="filter-count">({option.count})</span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FilterBar;
