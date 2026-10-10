module.exports = ({ config = {} } = {}) => {
  const baseConfig = config || {};
  const baseUrl = process.env.EXPO_BASE_URL || '';
  return {
    ...baseConfig,
    experiments: {
      ...(baseConfig.experiments || {}),
      ...(baseUrl ? { baseUrl } : {}),
    },
  };
};
