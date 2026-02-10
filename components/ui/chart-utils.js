
// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = {
  light: '',
  dark: '.dark',
};

/**
 * Escape special characters in a CSS string.
 *
 * The function checks if the input is a string and then replaces specific characters with their escaped counterparts using a regular expression.
 * It handles characters such as <, >, ", ', ;, {, }, \, and /, ensuring that the output is safe for use in CSS contexts.
 *
 * @param str - The input string to be escaped.
 * @returns The escaped string if the input is a string; otherwise, returns the input unchanged.
 */
const escapeCss = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>"';{}\\/]/g, (c) => {
    switch (c) {
      case '<':
        return '\\3c ';
      case '>':
        return '\\3e ';
      case '"':
        return '\\22 ';
      case "'":
        return '\\27 ';
      case ';':
        return '\\3b ';
      case '{':
        return '\\7b ';
      case '}':
        return '\\7d ';
      case '\\':
        return '\\5c ';
      case '/':
        return '\\2f ';
      default:
        return c;
    }
  });
};

/**
 * Generates chart styles based on the provided configuration.
 *
 * This function filters the configuration to find entries with a theme or color, and if none are found, it returns null.
 * It then maps over the available themes, constructing CSS rules for each theme that define custom properties for colors
 * based on the filtered configuration. The resulting styles are returned as a string.
 *
 * @param {string} id - The identifier for the chart element.
 * @param {Object} config - The configuration object containing theme and color settings.
 */
export const generateChartStyles = (id, config) => {
  const colorConfig = Object.entries(config).filter(([, config]) => config.theme || config.color);

  if (!colorConfig.length) {
    return null;
  }

  return Object.entries(THEMES)
    .map(
      ([theme, prefix]) => `
${prefix} [data-chart='${escapeCss(id)}'] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme] || itemConfig.color;
    return color ? `  --color-${escapeCss(key)}: ${escapeCss(color)};` : null;
  })
  .join('\n')}
}
`
    )
    .join('\n');
};
