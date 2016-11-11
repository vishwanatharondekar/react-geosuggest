import React from 'react';

const GeosuggestItem = React.createClass({
  /**
   * Get the default props
   * @return {Object} The props
   */
  getDefaultProps: function() {
    return {
      isActive: false,
      suggest: {
        label: ''
      },
      onSuggestSelect: function() {}
    };
  },

  /**
   * When the element gets clicked
   * @param  {Event} event The click event
   */
  onClick: function(event) {
    event.preventDefault();
    this.props.onSuggestSelect(this.props.suggest);
  },

  /**
   * Render the view
   * @return {Function} The React element to render
   */
  render: function() {
    let split = this.props.suggest.label.split(',');
    let city = split.splice(split.length-3).join(',');
    let locality = split.join(',');

    return (// eslint-disable-line no-extra-parens
      <li className={this.getSuggestClasses()}
        onClick={this.onClick}>
        <div>
          <span className="locality-item">{locality}</span>
          <span className="city-item">{city}</span>
        </div>
      </li>
    );
  },

  /**
   * The classes for the suggest item
   * @return {String} The classes
   */
  getSuggestClasses: function() {
    const className = this.props.suggest.className;
    let classes = 'geosuggest-item';

    classes += this.props.isActive ? ' geosuggest-item--active' : '';
    classes += className ? ' ' + className : '';

    return classes;
  }
});

module.exports = GeosuggestItem;
