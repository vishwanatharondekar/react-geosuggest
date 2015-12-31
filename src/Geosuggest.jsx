/* global google */

import React from 'react';
import GeosuggestItem from './GeosuggestItem'; // eslint-disable-line

const Geosuggest = React.createClass({
  /**
   * Get the default props
   * @return {Object} The state
   */
  getDefaultProps: function() {
    return {
      fixtures: [],
      initialValue: '',
      placeholder: 'Search places',
      disabled: false,
      className: '',
      location: null,
      radius: 0,
      bounds: null,
      country: null,
      types: null,
      googleMaps: null,
      onSuggestSelect: () => {},
      onFocus: () => {},
      onBlur: () => {},
      onChange: () => {},
      skipSuggest: () => {},
      getSuggestLabel: suggest => suggest.description,
      autoActivateFirstSuggest: false,
      autoShowSuggest : false
    };
  },

  /**
   * Get the initial state
   * @return {Object} The state
   */
  getInitialState: function() {
    return {
      isSuggestsHidden: true,
      userInput: this.props.initialValue,
      placeholder : this.props.placeholder,
      activeSuggest: null,
      fixtures : this.props.fixtures,
      suggests: [],
      disabled: this.props.disabled,
      className: this.props.className
    };
  },

  componentDidUpdate(){
    if(this.props.blurred){
      this.hideSuggests();
      React.findDOMNode(this.refs['geosuggestInput']).blur();
    }
  },

  /**
   * Change inputValue if prop changes
   * @param {Object} props The new props
   */
  componentWillReceiveProps(props) {
    if (this.props.initialValue !== props.initialValue) {
      this.setState({ userInput: props.initialValue });
    }

    if(props.coordinates) {
      var coords = props.coordinates.split(',');
      var latlng = {
        lat: parseFloat(coords[0]),
        lng: parseFloat(coords[1])
      };

      this.reverseGeocode(latlng, false, false);
    }

    this.setState({
      fixtures: props.fixtures
    });

    // if(props.initialValue===''){
    //   this.refs.geosuggestInput.focus();
    // }
    if (this.props.autoShowSuggest) {
      this.state.fixtures = props.fixtures;
      this.showSuggests();
    }


  },

  /**
   * Called on the client side after component is mounted.
   * Google api sdk object will be obtained and cached as a instance property.
   * Necessary objects of google api will also be determined and saved.
   */
  componentDidMount: function() {
    var googleMaps = this.props.googleMaps || google && google.maps || this.googleMaps;

    if (!googleMaps) {
      console.error('Google map api was not found in the page.');
    } else {
      this.googleMaps = googleMaps;
    }

    this.autocompleteService = new googleMaps.places.AutocompleteService();
    this.geocoder = new googleMaps.Geocoder();
    this.refs['big-locality'].style['display'] = "none";
    this.setInputValue({ value: this.props.initialValue, placeId: this.props.placeId });


    // if(!this.props.initialValue && !this.props.placeId){
    //   this.refs.geosuggestInput.focus();
    // }
    //this.refs.geosuggestInput.focus();
    //this.hideSuggests();
    //this.showSuggests();
  },

  /**
   * Method used for setting initial value.
   * @param {string} value to set in input
   */
  setInputValue: function(obj) {

    var _this = this;
    if(obj.value){
      this.setState({
        userInput: obj.value
      });
    } else if (obj.placeId){
      this.geocoder.geocode({
        placeId: obj.placeId
      }, function(results, status) {
        var gmaps = results[0],
          location = gmaps.geometry.location;

        var value = gmaps.formatted_address;
        _this.setState({
          userInput: value
        });
        _this.hideSuggests();
      });
    }



  },

  /**
   * When the input got changed
   */
  onInputChange: function() {
    var userInput = this.refs.geosuggestInput.value;

    this.setState({userInput: userInput}, function() {
      this.showSuggests();
      this.props.onChange(userInput);
    }.bind(this));
  },

  /**
   * When the input gets focused
   */
  onFocus: function() {
    this.props.onFocus();
    this.showSuggests();
  },

  /**
   * Update the value of the user input
   * @param {String} value the new value of the user input
   */
  update: function(value) {
    this.setState({userInput: value});
    this.props.onChange(value);
  },

  /*
   * Clear the input and close the suggestion pane
   */
  clear: function() {
    this.setState({userInput: ''}, function() {
      this.hideSuggests();
    }.bind(this));
    this.refs['geosuggestInput'].focus();
  },

  /**
   * Search for new suggests
   */
  searchSuggests: function() {
    if (!this.state.userInput) {
      this.updateSuggests();
      return;
    }

    var options = {
      input: this.state.userInput,
      location: this.state.location || new this.googleMaps.LatLng(0, 0),
      radius: this.state.radius || 0
    };

    if (this.props.bounds) {
      options.bounds = this.props.bounds;
    }

    if (this.props.types) {
      options.types = this.props.types;
    }

    if (this.props.country) {
      options.componentRestrictions = {
        country: this.props.country
      };
    }

    this.autocompleteService.getPlacePredictions(
      options,
      function(suggestsGoogle) {
        this.updateSuggests(suggestsGoogle);

        if (this.props.autoActivateFirstSuggest) {
          this.activateSuggest('next');
        }
      }.bind(this)
    );
  },

  isAlreadyPresnt : function(suggests, suggest){
    for (var i = suggests.length - 1; i >= 0; i--) {
      if(suggests[i].placeId === suggest.place_id){
        return true
      }
    };
    return false;
  },

  /**
   * Update the suggests
   * @param  {Object} suggestsGoogle The new google suggests
   */
  updateSuggests: function(suggestsGoogle) {
    var _this = this;
    if (!suggestsGoogle) {
      suggestsGoogle = [];
    }

    var suggests = [],
      regex = new RegExp(this.state.userInput, 'gim'),
      skipSuggest = this.props.skipSuggest;


    this.state.fixtures.forEach(function(suggest) {
      if (!skipSuggest(suggest.gmaps) &&  ( !_this.state.userInput || suggest.label.match(regex)) ) {
        suggest.placeId = suggest.placeId || suggest.label;
        suggests.push(suggest);
      }
    });

    suggestsGoogle.forEach(suggest => {
      if (!skipSuggest(suggest) && !this.isAlreadyPresnt(suggests, suggest)) {
        suggests.push({
          label: this.props.getSuggestLabel(suggest),
          placeId: suggest.place_id
        });
      }
    });

    this.setState({suggests: suggests});
  },

  /**
   * When the input gets focused
   */
  showSuggests: function() {
    this.searchSuggests();
    this.setState({isSuggestsHidden: false});
  },

  /**
   * When the input loses focused
   */
  hideSuggests: function() {
    this.props.onBlur();
    setTimeout(function() {
      this.setState({isSuggestsHidden: true});
    }.bind(this), 100);
  },

  clearLocality : function(){
    this.setState({
      locality : undefined,
      placeholder : this.props.placeholder,
      activeSuggest : undefined
    });
    this.refs['big-locality'].style['display'] = "none";
    this.refs['geosuggestInput'].style['padding-left'] = (12 + 20) + "px";
    //this.refs['geosuggestInput'].focus();
  },

  clearIfLocality : function (argument) {
    if(this.state.userInput===""){
      this.clearLocality();
    }
  },

  /**
   * When a key gets pressed in the input
   * @param  {Event} event The keypress event
   */
  onInputKeyDown: function(event) {
    switch (event.which) {
      case 40: // DOWN
        event.preventDefault();
        this.activateSuggest('next');
        break;
      case 38: // UP
        event.preventDefault();
        this.activateSuggest('prev');
        break;
      case 13: // ENTER
        event.preventDefault();
        this.selectSuggest(this.state.activeSuggest);
        break;
      case 9: // TAB
        this.selectSuggest(this.state.activeSuggest);
        break;
      case 27: // ESC
        this.hideSuggests();
        break;
      case 8://Backspace
        this.clearIfLocality();
      default:
        break;
    }
  },

  /**
   * Activate a new suggest
   * @param {String} direction The direction in which to activate new suggest
   */
  activateSuggest: function(direction) {
    if (this.state.isSuggestsHidden) {
      this.showSuggests();
      return;
    }

    var suggestsCount = this.state.suggests.length - 1,
      next = direction === 'next',
      newActiveSuggest = null,
      newIndex = 0,
      i = 0; // eslint-disable-line id-length

    for (i; i <= suggestsCount; i++) {
      if (this.state.suggests[i] === this.state.activeSuggest) {
        newIndex = next ? i + 1 : i - 1;
      }
    }

    if (!this.state.activeSuggest) {
      newIndex = next ? 0 : suggestsCount;
    }

    if (newIndex >= 0 && newIndex <= suggestsCount) {
      newActiveSuggest = this.state.suggests[newIndex];
    }

    this.setState({activeSuggest: newActiveSuggest});
  },

  /**
   * When an item got selected
   * @param {GeosuggestItem} suggest The selected suggest item
   */
  selectSuggest: function(suggest) {
    if (!suggest) {
      return;
    }

    this.setState({
      isSuggestsHidden: true
    });

    if(suggest.type && suggest.type==="geolocate"){
      // Check if browser supports geolocation
      if (!navigator.geolocation) {
        alert('Sorry! Your browser does not support geolocation. Please enter your locality manually.');
        return;
      }

      this.setState({
        userInput: "Fetching Location...",
        disabled: true,
        className: 'loading-geolocation'
      });

      var _this = this;

      // on Success
      function success(position) {
        var latitude = position.coords.latitude;
        var longitude = position.coords.longitude;
        var accuracy = position.coords.accuracy;
        suggest.position = position;

        var latlng = {
          lat: parseFloat(latitude),
          lng: parseFloat(longitude)
        };

        // this.setState handled in reverseGeocode()

        _this.reverseGeocode(latlng, suggest, accuracy);
      }

      // on Error
      function error(err) {
        alert('We are unable to locate you. Please check if you have GPS turned on.');
        console.error('geoLocateUser() failed! Error message = ' + err.message);

        _this.setState({
          userInput: _this.props.initialValue,
          disabled: false,
          className: _this.props.className
        });

        return false;
      }

      navigator.geolocation.getCurrentPosition(success, error, {
        enableHighAccuracy: true
      });
      
      return;
    }

    if (suggest.skipGeoCoding || suggest.location) {
      this.setState({
        userInput: suggest.label
      });


      this.clearLocality();
      this.props.onSuggestSelect(suggest);
      return;
    }

    this.geocodeSuggest(suggest);
  },

  /**
   * Reverse Geocode from latLng to formattedAddress
   */
  reverseGeocode: function reverseGeocode(latlng, suggest, accuracy) {
    var _this = this;

    this.geocoder.geocode({'location': latlng}, function (results, status) {
      if (status === google.maps.GeocoderStatus.OK) {
        if (results[1]) {
          // Set formatted address
          latlng.formattedAddress = results[1].formatted_address;

          // Handle inaccurate location
          if (accuracy > 100) {
            var userResponse = window.confirm('Are you located at ' + latlng.formattedAddress.toString() + '?\n');

            if (userResponse !== true) {
              alert('Please enter your location manually.');
              _this.setState({
                userInput: _this.props.initialValue,
                disabled: false,
                className: _this.props.className
              })
              return;
            }
          }

          // Pass formatted address to userInput
          _this.setState({
            userInput: latlng.formattedAddress,
            disabled: false,
            className: _this.props.className
          });

          // Trigger select if suggest object is passed
          if (typeof(suggest) === "object") {
            _this.props.onSuggestSelect(suggest);
          }
        }
      }
    })
  },

  /**
   * Geocode a suggest
   * @param  {Object} suggest The suggest
   */
  geocodeSuggest: function(suggest) {

    var geoCodeInput = {};
    if(suggest.placeId){
      geoCodeInput.placeId = suggest.placeId;
    } else if (suggest.label){
      geoCodeInput.address = suggest.label;
    }

    this.geocoder.geocode(geoCodeInput, function (results, status) {

        if (status !== this.googleMaps.GeocoderStatus.OK) {
          return;
        }

        var gmaps = results[0],
          location = gmaps.geometry.location;
        suggest.gmaps = gmaps;

        if(suggest.gmaps.types.indexOf("sublocality_level_1")!=-1){
          this.setState({
            locality : suggest.gmaps.address_components[0].short_name,
            userInput : '',
            placeholder : 'Where in ' + suggest.gmaps.address_components[0].short_name + " ?",
            location : location,
            radius : 5000
          });

          this.refs['big-locality'].style['display'] = "block";
          this.refs['geosuggestInput'].style['padding-left'] = (this.refs['big-locality'].offsetWidth+12 + 20) + "px";
          this.refs['geosuggestInput'].focus();
        } else {
          this.setState({
            userInput : suggest.label
          });
          suggest.location = {
            lat: location.lat(),
            lng: location.lng()
          };
          this.clearLocality();
          this.props.onSuggestSelect(suggest);
        }

      }.bind(this)
    );
  },

  /**
   * Render the view
   * @return {Function} The React element to render
   */
  render: function() {
    let bigLocalityVisible = this.state.locality?'block':'none';
    return (// eslint-disable-line no-extra-parens
      <div className={'geosuggest ' + this.state.className}
          onClick={this.onClick}>
        <input
          className="geosuggest__input"
          ref="geosuggestInput"
          type="text"
          value={this.state.userInput}
          placeholder={this.state.placeholder}
          disabled={this.state.disabled}
          onKeyDown={this.onInputKeyDown}
          onChange={this.onInputChange}
          onFocus={this.onFocus}
          onBlur={this.hideSuggests} />
        <div ref="edit-locality" onClick={this.clear} className={['edit-locality' , this.state.userInput?'':'hidden'].join(' ')}>
          <span>Change</span>
        </div>
        <div ref="big-locality" className="locality" style={{display:bigLocalityVisible}}>
          <span>{this.state.locality}</span>
          <span onClick={this.clearLocality} className="delete-icon">X</span>
        </div>
        <div className="marker-icon">
        </div>
        <ul className={this.getSuggestsClasses()}>
          {this.getSuggestItems()}
        </ul>
      </div>
    );
  },

  /**
   * Get the suggest items for the list
   * @return {Array} The suggestions
   */
  getSuggestItems: function() {



    if(!this.state.suggests.length && this.state.userInput){
      this.state.suggests.push({
        label : 'No results found',
        className : 'no-results'
      })
    }

    if(this.props.showGeoLocate && !this.state.userInput ){
      this.state.suggests.unshift({
        label : 'Use my location',
        className : 'geolocate',
        type : 'geolocate'
      });
    }

    return this.state.suggests.map(function(suggest) {
      var isActive = this.state.activeSuggest &&
        suggest.placeId === this.state.activeSuggest.placeId;

      return (// eslint-disable-line no-extra-parens
        <GeosuggestItem
          key={suggest.placeId}
          suggest={suggest}
          isActive={isActive}
          onSuggestSelect={this.selectSuggest} />
      );
    }.bind(this));
  },

  /**
   * The classes for the suggests list
   * @return {String} The classes
   */
  getSuggestsClasses: function() {
    var classes = 'geosuggest__suggests';

    classes += this.state.isSuggestsHidden ?
      ' geosuggest__suggests--hidden' : '';

    return classes;
  }
});

module.exports = Geosuggest;
