
// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = {
  light: '',
  dark: '.dark',
};

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
