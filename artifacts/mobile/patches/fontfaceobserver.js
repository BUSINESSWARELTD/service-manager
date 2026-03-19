// Patched fontfaceobserver — resolves immediately, no timeout errors.
function FontFaceObserver(family) {
  this.family = family;
}
FontFaceObserver.prototype.load = function () {
  return Promise.resolve();
};
module.exports = FontFaceObserver;
module.exports.default = FontFaceObserver;
