// Jest can't load icon fonts, so icons render as their name instead.
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const { Text } = require('react-native');
  const Icon = ({ name }) => <Text>{name}</Text>;
  return { __esModule: true, default: Icon };
});
