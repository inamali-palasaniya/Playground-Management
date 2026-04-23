const React = require('react');

// A dummy React component that acts as a placeholder for native views on web
const DummyView = React.forwardRef((props, ref) => {
  return React.createElement('div', { ...props, ref }, props.children);
});

// A dummy function for native commands
const dummyCommands = () => ({});

// Export both as default and named to cover different import patterns
module.exports = () => DummyView;
module.exports.default = () => DummyView;
module.exports.codegenNativeComponent = () => DummyView;
module.exports.codegenNativeCommands = () => dummyCommands;
