/**
 * Helpers and tools to ease your JavaScript day.
 *
 */
window.Magnus = (function(window, document, undefined ) {
  var Magnus = {};

  /**
   * Generate a random number.
   * @param min the smallest possible number
   * @param max the largest possible number
   * @returns a random number where min >= number <= max
   */
  Magnus.random = function (min, max) {
    return Math.floor(Math.random()*(max+1-min)+min);
  };

  // Expose public methods
  return Magnus;
  
})(window, window.document); 